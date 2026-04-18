import {
  ClusterManager,
  ReClusterManager,
  HeartbeatManager,
  AutoResharderManager,
} from "discord-hybrid-sharding";
import dotenv from "dotenv";
import { join } from "path";
import { Logger } from "./utils/Logger";

dotenv.config();

const isDev = process.env.NODE_ENV === "development";
const token = isDev ? process.env.TEST_DISCORD_TOKEN : process.env.DISCORD_TOKEN;

if (!token) {
  console.error(`❌ ${isDev ? "TEST_DISCORD_TOKEN" : "DISCORD_TOKEN"} is not set in .env`);
  process.exit(1);
}

const manager = new ClusterManager(
  join(__dirname, isDev ? "index.ts" : "index.js"),
  {
    totalClusters: "auto",
    totalShards: "auto",
    mode: "process",
    token,
    execArgv: isDev
      ? ["-r", "ts-node/register", "--max-old-space-size=2048"]
      : ["--max-old-space-size=2048"],
  },
);

manager.extend(
  new ReClusterManager({ restartMode: "gracefulSwitch" }),
  new HeartbeatManager({ interval: 2000, maxMissedHeartbeats: 5 }),
  new AutoResharderManager({ ShardsPerCluster: 2, MaxGuildsPerShard: 2000 }),
);

const logger = new Logger("ClusterManager");

manager.on("clusterCreate", (cluster) => {
  cluster.on("ready", () => logger.info(`Launched Cluster ${cluster.id}`));
  cluster.on("reconnecting", () => logger.warn(`Reconnecting Cluster #${cluster.id}`));
  cluster.on("death", () => {
    logger.warn(`Restarting Cluster ${cluster.id}`);
    manager.recluster?.start();
  });
});

process.on("uncaughtException", (err) => {
  try { logger.error(`Uncaught Exception: ${err}`); } catch {}
});
process.on("unhandledRejection", (reason) => {
  try { logger.error(`Unhandled Rejection: ${reason}`); } catch {}
});

(async () => {
  try {
    await manager.spawn({ timeout: -1 });
  } catch (err) {
    logger.error(`Failed to spawn clusters: ${err}`);
    process.exit(1);
  }
})();
