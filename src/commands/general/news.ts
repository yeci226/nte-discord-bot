import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Command } from "../../interfaces/Command";
import { NewsFilter, NewsLang, Subscription } from "../../services/NteNewsService";
import { toNewsLang } from "../../utils/i18n";

// customId format:
//   channel-select : nte_notification_channel:{lang}:{roleId}:{filter}
//   bind button    : news:bind_current:{lang}:{roleId}:{filter}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("news")
    .setNameLocalizations({ "zh-TW": "新聞", "zh-CN": "新闻" })
    .setDescription("Manage NTE news subscriptions")
    .setDescriptionLocalizations({
      "zh-TW": "管理異環新聞訂閱",
      "zh-CN": "管理异环新闻订阅",
    })

    // ── bind ──────────────────────────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName("bind")
        .setNameLocalizations({ "zh-TW": "綁定", "zh-CN": "绑定" })
        .setDescription("Bind channels to receive NTE news")
        .setDescriptionLocalizations({
          "zh-TW": "綁定頻道以接收異環新聞",
          "zh-CN": "绑定频道以接收异环新闻",
        })
        .addStringOption((opt) =>
          opt
            .setName("language")
            .setNameLocalizations({ "zh-TW": "語言", "zh-CN": "语言" })
            .setDescription("Language (default: auto-detect from Discord locale)")
            .setDescriptionLocalizations({
              "zh-TW": "語言（預設依照 Discord 語言自動選擇）",
              "zh-CN": "语言（默认根据 Discord 语言自动选择）",
            })
            .addChoices(
              { name: "繁體中文 (nte.iwplay.com.tw / @NTE_ZH)", value: "tw" },
              { name: "简体中文 (nte.perfectworld.com/cn / @NTE_ZH)", value: "cn" },
              { name: "English (nte.perfectworld.com/en / @NTE_GL)", value: "en" },
              { name: "日本語 (@NTE_JP)", value: "jp" },
            )
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("filter")
            .setNameLocalizations({ "zh-TW": "篩選", "zh-CN": "筛选" })
            .setDescription("Content filter (default: all)")
            .setDescriptionLocalizations({
              "zh-TW": "接收內容篩選（預設：全部）",
              "zh-CN": "接收内容筛选（默认：全部）",
            })
            .addChoices(
              { name: "全部 / All  (官網最新 + 官方推文)", value: "all" },
              { name: "官網最新 / Website Latest", value: "news_all" },
              { name: "官網新聞 / Game News", value: "news_gamenews" },
              { name: "官網活動 / Events", value: "news_gameevent" },
              { name: "官網系統 / System", value: "news_gamebroad" },
              { name: "官方推文 / Official Tweets", value: "tweet" },
            )
            .setRequired(false),
        )
        .addRoleOption((opt) =>
          opt
            .setName("role")
            .setNameLocalizations({ "zh-TW": "身分組", "zh-CN": "身份组" })
            .setDescription("Role to mention when a new item is posted")
            .setDescriptionLocalizations({
              "zh-TW": "發布新內容時提及的身分組",
              "zh-CN": "发布新内容时提及的身份组",
            })
            .setRequired(false),
        ),
    )

    // ── unbind ────────────────────────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName("unbind")
        .setNameLocalizations({ "zh-TW": "解綁", "zh-CN": "解绑" })
        .setDescription("Unbind channels from NTE news")
        .setDescriptionLocalizations({
          "zh-TW": "取消頻道的新聞綁定",
          "zh-CN": "取消频道的新闻绑定",
        })
        .addStringOption((opt) =>
          opt
            .setName("language")
            .setNameLocalizations({ "zh-TW": "語言", "zh-CN": "语言" })
            .setDescription("Only unbind this language (default: all languages)")
            .setDescriptionLocalizations({
              "zh-TW": "只解除此語言的綁定（預設：解除所有語言）",
              "zh-CN": "只解除此语言的绑定（默认：解除所有语言）",
            })
            .addChoices(
              { name: "繁體中文 (tw)", value: "tw" },
              { name: "简体中文 (cn)", value: "cn" },
              { name: "English (en)", value: "en" },
              { name: "日本語 (jp)", value: "jp" },
            )
            .setRequired(false),
        ),
    )

    // ── force ─────────────────────────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName("force")
        .setNameLocalizations({ "zh-TW": "強制推送", "zh-CN": "强制推送" })
        .setDescription("Force re-send the most recent item to all bound channels")
        .setDescriptionLocalizations({
          "zh-TW": "強制將最新一則內容重新推送至所有綁定頻道",
          "zh-CN": "强制将最新一条内容重新推送至所有绑定频道",
        })
        .addStringOption((opt) =>
          opt
            .setName("language")
            .setNameLocalizations({ "zh-TW": "語言", "zh-CN": "语言" })
            .setDescription("Language to force (default: all)")
            .setDescriptionLocalizations({
              "zh-TW": "指定語言（預設：全部）",
              "zh-CN": "指定语言（默认：全部）",
            })
            .addChoices(
              { name: "繁體中文 (tw)", value: "tw" },
              { name: "简体中文 (cn)", value: "cn" },
              { name: "English (en)", value: "en" },
              { name: "日本語 (jp)", value: "jp" },
            )
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("filter")
            .setNameLocalizations({ "zh-TW": "篩選", "zh-CN": "筛选" })
            .setDescription("Force a specific content type/category (default: all)")
            .setDescriptionLocalizations({
              "zh-TW": "指定要強推的內容類別（預設：全部）",
              "zh-CN": "指定要强推的内容类别（默认：全部）",
            })
            .addChoices(
              { name: "官網新聞 / Game News", value: "gamenews" },
              { name: "官網活動 / Events", value: "gameevent" },
              { name: "官網系統 / System", value: "gamebroad" },
              { name: "官方推文 / Official Tweets", value: "tweet" },
            )
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  execute: async (client, interaction, tr, db) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.guildId) {
      const member = interaction.member;
      if (
        !member ||
        typeof member.permissions === "string" ||
        !member.permissions.has(PermissionFlagsBits.ManageGuild)
      ) {
        await interaction.reply({
          content: "",
          flags: (1 << 15) | MessageFlags.Ephemeral,
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(tr("news_NoPerm")),
            ),
          ],
        });
        return;
      }
    }

    const subscriptions: Subscription[] = (await db.get("news_subscriptions")) ?? [];
    const isGuild = !!interaction.guildId;
    const currentGuildId = interaction.guildId ?? "DM";
    const subCommand = interaction.options.getSubcommand();

    // ── bind ──────────────────────────────────────────────────────────────
    if (subCommand === "bind") {
      const chosenLang =
        (interaction.options.getString("language") as NewsLang | null) ??
        toNewsLang(interaction.locale);
      const chosenFilter = (interaction.options.getString("filter") as NewsFilter | null) ?? "all";
      const chosenRole = interaction.options.getRole("role");
      const roleId = chosenRole?.id ?? "none";

      if (isGuild) {
        const guildSubs = subscriptions.filter((s) => s.guildId === currentGuildId);

        const selectMenu = new ChannelSelectMenuBuilder()
          .setCustomId(`nte_notification_channel:${chosenLang}:${roleId}:${chosenFilter}`)
          .setChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
          .setPlaceholder(
            guildSubs.length > 0
              ? tr("news_BindPlaceholder").replace("<count>", guildSubs.length.toString())
              : tr("news_BindDefault"),
          )
          .setMinValues(0)
          .setMaxValues(25);

        const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(selectMenu);
        const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`news:bind_current:${chosenLang}:${roleId}:${chosenFilter}`)
            .setLabel(tr("news_BindCurrent"))
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📌"),
        );

        const langLabel = tr(`news_lang_${chosenLang}`);
        const filterLabel = tr(`news_filter_${chosenFilter}`);
        let tip = tr("news_BindTip")
          .replace("<lang>", langLabel)
          .replace("<filter>", filterLabel);
        if (chosenRole) {
          tip += `\n-# ${tr("news_BindTipRole").replace("<role>", `<@&${chosenRole.id}>`)}`;
        }

        await interaction.reply({
          content: tip,
          flags: MessageFlags.Ephemeral,
          components: [buttonRow, row],
        });
      } else {
        const existing = subscriptions.find((s) => s.channelId === interaction.channelId);
        const container = new ContainerBuilder();

        if (existing) {
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(tr("news_DmBound")),
          );
        } else {
          subscriptions.push({
            guildId: "DM",
            channelId: interaction.channelId,
            boundAt: Date.now(),
            language: chosenLang,
            filter: chosenFilter,
            roleId: roleId !== "none" ? roleId : undefined,
          });
          await db.set("news_subscriptions", subscriptions);
          container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(tr("news_DmSuccess")),
          );
        }

        await interaction.reply({
          content: "",
          flags: (1 << 15) | MessageFlags.Ephemeral,
          components: [container],
        });
      }

    // ── unbind ────────────────────────────────────────────────────────────
    } else if (subCommand === "unbind") {
      const langOption = interaction.options.getString("language") as NewsLang | null;
      let newSubs: typeof subscriptions;
      let removedCount: number;

      if (isGuild) {
        newSubs = langOption
          ? subscriptions.filter((s) => !(s.guildId === currentGuildId && s.language === langOption))
          : subscriptions.filter((s) => s.guildId !== currentGuildId);
        removedCount = subscriptions.length - newSubs.length;
      } else {
        newSubs = subscriptions.filter((s) => s.channelId !== interaction.channelId);
        removedCount = subscriptions.length - newSubs.length;
      }

      await db.set("news_subscriptions", newSubs);

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(tr("news_UnbindSuccess")),
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          removedCount > 0
            ? langOption
              ? tr("news_UnbindLangDetail")
                  .replace("<lang>", tr(`news_lang_${langOption}`))
                  .replace("<count>", removedCount.toString())
              : tr("news_UnbindDetail")
                  .replace("<scope>", isGuild ? tr("news_UnbindScopeAll") : tr("news_UnbindScopeSingle"))
                  .replace("<count>", removedCount.toString())
            : tr("news_NoSub"),
        ),
      );

      await interaction.reply({
        content: "",
        flags: (1 << 15) | MessageFlags.Ephemeral,
        components: [container],
      });

    // ── force ─────────────────────────────────────────────────────────────
    } else if (subCommand === "force") {
      const langOption = interaction.options.getString("language") as NewsLang | null;
      const filterOption = interaction.options.getString("filter") ?? undefined;

      await interaction.reply({
        content: "",
        flags: (1 << 15) | MessageFlags.Ephemeral,
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(tr("news_ForceTriggered")),
          ),
        ],
      });

      client.newsService.forceLatest(langOption ?? undefined, filterOption).catch(() => {});
    }
  },
};

export default command;
