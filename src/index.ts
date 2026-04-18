import { ExtendedClient } from "./structures/Client";
import { loadCommands } from "./handlers/commandHandler";
import { loadEvents } from "./handlers/eventHandler";
import { NteNewsService } from "./services/NteNewsService";
import { Logger } from "./utils/Logger";
import { WebhookClient } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  const client = new ExtendedClient();
  client.newsService = new NteNewsService(client);

  await loadCommands(client);
  await loadEvents(client);
  client.start();

  // Only cluster 0 runs global services
  if ((client.cluster as any).id === 0) {
    const logger = new Logger("Process");
    const webhook = process.env.ERRWEBHOOK
      ? new WebhookClient({ url: process.env.ERRWEBHOOK })
      : null;

    (global as any).processLogger = logger;
    (global as any).processWebhook = webhook;

    client.newsService.start();
  }

  process.on("unhandledRejection", async (reason: any) => {
    const logger: Logger = (global as any).processLogger ?? new Logger("Process");
    const webhook: WebhookClient | null = (global as any).processWebhook ?? null;
    logger.error(`Unhandled Rejection: ${reason}`);
    if (webhook) {
      await webhook.send({
        embeds: [{
          title: "🚨 Unhandled Rejection",
          description: `\`\`\`${reason?.stack ?? reason}\`\`\``,
          color: 0xff0000,
        }],
      }).catch(() => {});
    }
  });

  process.on("uncaughtException", async (error: Error) => {
    const logger: Logger = (global as any).processLogger ?? new Logger("Process");
    const webhook: WebhookClient | null = (global as any).processWebhook ?? null;
    logger.error(`Uncaught Exception: ${error.message}`);
    if (webhook) {
      await webhook.send({
        embeds: [{
          title: "🚨 Uncaught Exception",
          description: `\`\`\`${error.stack ?? error.message}\`\`\``,
          color: 0xff0000,
        }],
      }).catch(() => {});
    }
  });
})();
