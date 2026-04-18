import { Events, WebhookClient, EmbedBuilder } from "discord.js";
import { Event } from "../interfaces/Event";
import { Logger } from "../utils/Logger";

const webhook = process.env.ERRWEBHOOK
  ? new WebhookClient({ url: process.env.ERRWEBHOOK })
  : null;
const logger = new Logger("Client");

const event: Event = {
  name: Events.Error,
  execute: async (_client, error: Error) => {
    logger.error(`Discord Client Error: ${error.message}`);
    console.error(error);

    if (webhook) {
      await webhook.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("Discord Client Error")
            .setDescription(`\`\`\`${error.stack || error.message}\`\`\``)
            .setColor("Red")
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  },
};

export default event;
