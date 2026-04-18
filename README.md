<div align="center">

<img src="src/assets/images/pfp.jpg" alt="Banner" width="25%" />

<br />
<br />

# NTE Discord Bot

**A Neverness to Everness news companion bot for Discord**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

<br />

**English** | [繁體中文](README_ZH.md)


</div>

---

## Features

| Feature           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| **News Feed**     | Auto-post the latest NTE announcements to your channels   |
| **Multi-language**| Supports Traditional Chinese, Simplified Chinese, English, and Japanese |
| **Content Filter**| Filter news by category: all, news, events, system, tweets |
| **Role Mention**  | Ping a role whenever new content is posted                |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Yarn](https://yarnpkg.com)
- A Discord bot token

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/nte-discord-bot.git
cd nte-discord-bot

# Install dependencies
yarn install

# Copy and configure environment variables
cp .env.example .env
```

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```env
# Discord
DISCORD_TOKEN=
TEST_DISCORD_TOKEN=

# Webhooks (optional)
ERRWEBHOOK=
CMDWEBHOOK=
JLWEBHOOK=
```

### Running

```bash
# Development (with hot reload)
yarn dev

# Production
yarn start
```

---

## Commands

### News

| Command        | Description                                          |
| -------------- | ---------------------------------------------------- |
| `/news bind`   | Subscribe a channel to Neverness to Everness news updates              |
| `/news unbind` | Remove a channel's news subscription                 |
| `/news force`  | Manually trigger a re-send of the latest news        |

---

## Tech Stack

- **[Discord.js v14](https://discord.js.org)** — Discord API framework
- **[TypeScript](https://www.typescriptlang.org)** — Type-safe JavaScript
- **[Better SQLite3](https://github.com/WiseLibs/better-sqlite3)** — Local database
- **[rss-parser](https://github.com/rbren/rss-parser)** — RSS feed parsing
- **[node-html-parser](https://github.com/taoqf/node-html-parser)** — HTML scraping
- **[discord-hybrid-sharding](https://github.com/meister03/discord-hybrid-sharding)** — Sharding support

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

<div align="center">

Made with dedication for the Neverness to Everness community

</div>
