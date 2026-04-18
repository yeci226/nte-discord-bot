<div align="center">

# NTE Discord Bot

**專為 新旅人 打造的 Discord 機器人**

[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

<br />

[English](README.md) | **繁體中文**

</div>

---

## 功能特色

| 功能           | 說明                                             |
| -------------- | ------------------------------------------------ |
| **最新消息**   | 自動將 NTE 官方公告推送至指定頻道               |
| **多語言支援** | 支援繁體中文、簡體中文、英文、日文               |
| **內容篩選**   | 依類別篩選：全部、新聞、活動、系統、推文         |
| **角色 Ping**  | 有新內容時自動 Ping 指定身分組                   |

---

## 快速開始

### 環境需求

- [Node.js](https://nodejs.org) v18+
- [Yarn](https://yarnpkg.com)
- Discord Bot Token

### 安裝

```bash
# 複製儲存庫
git clone https://github.com/your-username/nte-discord-bot.git
cd nte-discord-bot

# 安裝依賴
yarn install

# 複製並設定環境變數
cp .env.example .env
```

### 設定

將 `.env.example` 複製為 `.env` 並填入對應的值：

```env
# Discord
DISCORD_TOKEN=
TEST_DISCORD_TOKEN=

# Webhooks (optional)
ERRWEBHOOK=
CMDWEBHOOK=
JLWEBHOOK=
```

### 啟動

```bash
# 開發模式（熱重載）
yarn dev

# 正式環境
yarn start
```

---

## 指令列表

### 新聞

| 指令           | 說明                           |
| -------------- | ------------------------------ |
| `/news bind`   | 訂閱頻道接收 NTE 最新消息      |
| `/news unbind` | 取消頻道的新聞訂閱             |
| `/news force`  | 手動強制重新發送最新消息       |

---

## 技術棧

- **[Discord.js v14](https://discord.js.org)** — Discord API 框架
- **[TypeScript](https://www.typescriptlang.org)** — 型別安全的 JavaScript
- **[Better SQLite3](https://github.com/WiseLibs/better-sqlite3)** — 本地資料庫
- **[rss-parser](https://github.com/rbren/rss-parser)** — RSS 訂閱解析
- **[node-html-parser](https://github.com/taoqf/node-html-parser)** — HTML 爬蟲
- **[discord-hybrid-sharding](https://github.com/meister03/discord-hybrid-sharding)** — 分片支援

---

## 貢獻

歡迎提交 Issue 或 Pull Request！

---

<div align="center">

為 新旅人 社群用心打造

</div>
