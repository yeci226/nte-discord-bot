import { Events, REST, Routes, ActivityType } from "discord.js";
import { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";

const logger = new Logger("Ready");

const event: Event = {
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    logger.success(`Ready! Logged in as ${client.user?.tag}`);

    const commandsData = client.commands.map((c) => c.data.toJSON());
    const isDev = process.env.NODE_ENV === "development";
    const token = isDev
      ? process.env.TEST_DISCORD_TOKEN
      : process.env.DISCORD_TOKEN;
    const rest = new REST({ version: "10" }).setToken(token!);

    try {
      logger.info("Refreshing application (/) commands...");
      await rest.put(Routes.applicationCommands(client.user!.id), {
        body: commandsData,
      });
      logger.success("Successfully reloaded application (/) commands.");
    } catch (error: any) {
      logger.error(error.message || String(error));
    }

    const updatePresence = async () => {
      try {
        const results = await client.cluster.broadcastEval(
          (c: any) => c.guilds.cache.size,
        );
        const totalGuilds = (results as number[]).reduce((a, b) => a + b, 0);
        client.user?.setPresence({
          activities: [{ name: `${totalGuilds} 個伺服器`, type: ActivityType.Watching }],
          status: "online",
        });
      } catch {}
    };

    await updatePresence();
    setInterval(updatePresence, 10 * 60 * 1000);
  },
};

export default event;
