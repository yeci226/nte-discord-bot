import { ExtendedClient } from "../structures/Client";
import fs from "fs";
import path from "path";
import { Command } from "../interfaces/Command";
import { Logger } from "../utils/Logger";

const logger = new Logger("CommandHandler");

function findCommandFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(findCommandFiles(filePath));
    } else if (file.endsWith(".ts") || file.endsWith(".js")) {
      results.push(filePath);
    }
  }
  return results;
}

export async function loadCommands(client: ExtendedClient) {
  const commandsPath = path.join(__dirname, "../commands");
  const commandFiles = findCommandFiles(commandsPath);

  for (const file of commandFiles) {
    const command = (await import(file)).default as Command;
    client.commands.set(command.data.name, command);
    logger.success(`Loaded command: ${command.data.name}`);
  }
}
