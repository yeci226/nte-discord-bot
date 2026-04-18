import {
  Events,
  MessageFlags,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  WebhookClient,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";
import { createTranslator, toI18nLang } from "../utils/i18n";
import { NewsFilter, NewsLang, Subscription } from "../services/NteNewsService";

const webhook = process.env.CMDWEBHOOK
  ? new WebhookClient({ url: process.env.CMDWEBHOOK })
  : null;
const logger = new Logger("Interaction");

const event: Event = {
  name: Events.InteractionCreate,
  execute: async (client, interaction) => {
    const userLocale = (interaction as any).locale ?? "en-US";
    const userLang = toI18nLang(userLocale);
    const tr = createTranslator(userLang);

    // ── Slash commands ──────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(client, interaction, tr, client.db);

        const sub = (interaction as ChatInputCommandInteraction).options.getSubcommand(false);
        const group = (interaction as ChatInputCommandInteraction).options.getSubcommandGroup(false);
        const cmdStr = `${command.data.name}${group ? ` ${group}` : ""}${sub ? ` ${sub}` : ""}`;
        logger.command(
          `${cmdStr} by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild?.name ?? "DM"}`,
        );

        if (webhook) {
          webhook
            .send({
              embeds: [
                new EmbedBuilder()
                  .setTimestamp()
                  .setAuthor({
                    iconURL: interaction.user.displayAvatarURL({ size: 256 }),
                    name: `${interaction.user.username} — ${interaction.user.id}`,
                  })
                  .setDescription(
                    `\`\`\`${interaction.guild?.name ?? "DM"} — ${interaction.guild?.id ?? interaction.user.id}\`\`\``,
                  )
                  .addFields({ name: "Command", value: cmdStr, inline: true }),
              ],
            })
            .catch(() => {});
        }
      } catch (error: any) {
        if (error.code === 10062 || error.code === 40060) return;
        logger.error(`Command error: ${error.message}\n${error.stack ?? ""}`);
        const content = tr("Error");
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
        } else {
          await interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }

    // ── Channel select menu ─────────────────────────────────────────────
    // customId: nte_notification_channel:{lang}:{roleId}:{filter}
    } else if (interaction.isChannelSelectMenu()) {
      if (interaction.customId.startsWith("nte_notification_channel:")) {
        if (!interaction.guildId || !interaction.guild) return;

        const parts   = interaction.customId.split(":");
        const language = parts[1] as NewsLang;
        const roleId   = parts[2] !== "none" ? parts[2] : undefined;
        const filter   = (parts[3] ?? "all") as NewsFilter;

        await interaction.deferUpdate();

        const selectedChannels = interaction.values;
        const validChannels: string[] = [];
        const invalidChannels: string[] = [];

        for (const channelId of selectedChannels) {
          try {
            const channel = await interaction.guild.channels.fetch(channelId);
            if (!channel) continue;
            const perms = channel.permissionsFor(client.user!.id);
            if (!perms) {
              invalidChannels.push(`<#${channelId}> (${tr("news_PermissionUnknown")})`);
              continue;
            }
            const hasView = perms.has(PermissionFlagsBits.ViewChannel);
            const hasSend = perms.has(PermissionFlagsBits.SendMessages);
            if (hasView && hasSend) {
              validChannels.push(channelId);
            } else {
              const missing: string[] = [];
              if (!hasView) missing.push(tr("news_ViewChannel"));
              if (!hasSend) missing.push(tr("news_SendMessages"));
              invalidChannels.push(
                `<#${channelId}> (${tr("news_PermissionMissing")}${missing.join(", ")})`,
              );
            }
          } catch {
            invalidChannels.push(`<#${channelId}> (${tr("news_PermissionError")})`);
          }
        }

        const subscriptions: Subscription[] =
          (await client.db.get("news_subscriptions")) ?? [];

        const keepSubs = subscriptions.filter(
          (s) => s.guildId !== interaction.guildId || s.language !== language,
        );
        const newSubs: Subscription[] = [
          ...keepSubs,
          ...validChannels.map((channelId) => ({
            guildId: interaction.guildId!,
            channelId,
            boundAt: Date.now(),
            language,
            filter,
            roleId,
          })),
        ];
        await client.db.set("news_subscriptions", newSubs);

        const container = new ContainerBuilder();
        if (validChannels.length > 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${tr("news_SetupSuccess")}\n${tr("news_BindSuccessDetail")}\n${validChannels.map((id) => `<#${id}>`).join("\n")}`,
            ),
          );
        } else if (selectedChannels.length > 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${tr("news_BindFail")}\n${tr("news_BindFailDetail")}`),
          );
        } else {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(tr("news_UnbindAll")),
          );
        }

        if (invalidChannels.length > 0) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${tr("news_InvalidChannels")}\n${invalidChannels.join("\n")}\n${tr("news_PermissionTip")}`,
            ),
          );
        }

        await interaction.editReply({
          content: "",
          flags: (1 << 15) | MessageFlags.Ephemeral,
          components: [container],
        });
      }

    // ── Button ──────────────────────────────────────────────────────────
    // customId: news:bind_current:{lang}:{roleId}:{filter}
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("news:bind_current:")) {
        if (!interaction.guildId || !interaction.guild) return;

        const parts    = interaction.customId.split(":");
        const language = parts[2] as NewsLang;
        const roleId   = parts[3] !== "none" ? parts[3] : undefined;
        const filter   = (parts[4] ?? "all") as NewsFilter;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.channel;
        if (
          !channel ||
          channel.isDMBased() ||
          !channel.permissionsFor(client.user!.id)?.has(PermissionFlagsBits.ViewChannel) ||
          !channel.permissionsFor(client.user!.id)?.has(PermissionFlagsBits.SendMessages)
        ) {
          await interaction.editReply({
            content: "",
            flags: (1 << 15) | MessageFlags.Ephemeral,
            components: [
              new ContainerBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${tr("news_BindFail")}\n${tr("news_PermissionTip")}`),
              ),
            ],
          });
          return;
        }

        const subscriptions: Subscription[] =
          (await client.db.get("news_subscriptions")) ?? [];

        const keepSubs = subscriptions.filter(
          (s) => s.guildId !== interaction.guildId || s.language !== language,
        );
        await client.db.set("news_subscriptions", [
          ...keepSubs,
          {
            guildId: interaction.guildId,
            channelId: channel.id,
            boundAt: Date.now(),
            language,
            filter,
            roleId,
          } satisfies Subscription,
        ]);

        await interaction.editReply({
          content: "",
          flags: (1 << 15) | MessageFlags.Ephemeral,
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                tr("news_BindCurrentSuccess", { channelId: channel.id }),
              ),
            ),
          ],
        });
      }

    // ── Autocomplete ────────────────────────────────────────────────────
    } else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(client, interaction, client.db);
        } catch {
          await interaction.respond([]).catch(() => {});
        }
      }
    }
  },
};

export default event;
