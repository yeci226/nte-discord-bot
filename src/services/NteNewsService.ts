import { ExtendedClient } from "../structures/Client";
import axios from "axios";
import crypto from "crypto";
import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} from "discord.js";
import { Logger } from "../utils/Logger";
import { parse } from "node-html-parser";
import Parser from "rss-parser";

export type NewsLang = "tw" | "cn" | "en" | "jp";

/**
 * Filter values for subscriptions:
 *   "all"            – 官網最新 + 官方推文 (default)
 *   "news_all"       – 官網最新（全分類，不含推文）
 *   "news_gamenews"  – 官網新聞
 *   "news_gameevent" – 官網活動
 *   "news_gamebroad" – 官網系統
 *   "tweet"          – 官方推文
 */
export type NewsFilter =
  | "all"
  | "news_all"
  | "news_gamenews"
  | "news_gameevent"
  | "news_gamebroad"
  | "tweet";

export interface Subscription {
  guildId: string;
  channelId: string;
  boundAt: number;
  language: NewsLang;
  filter: NewsFilter;
  roleId?: string;
}

// ─── Website news sources ──────────────────────────────────────────────────

interface ListSource {
  url: string;
  category: string;
}

interface ArticleSource {
  lang: NewsLang;
  lists: ListSource[];
  articlePattern: RegExp;
  buildArticleUrl: (href: string) => string;
}

const NEWS_SOURCES: ArticleSource[] = [
  {
    lang: "tw",
    lists: [{ url: "https://nte.iwplay.com.tw/news/list_1.html", category: "all" }],
    articlePattern: /\/news\/view\/(\d{8})\/([a-z0-9]+)\.html/,
    buildArticleUrl: (href) =>
      href.startsWith("http") ? href : `https://nte.iwplay.com.tw${href}`,
  },
  {
    lang: "cn",
    lists: [
      { url: "https://nte.perfectworld.com/cn/article/news/gamenews/index.html", category: "gamenews" },
      { url: "https://nte.perfectworld.com/cn/article/news/gamebroad/index.html", category: "gamebroad" },
      { url: "https://nte.perfectworld.com/cn/article/news/gameevent/index.html", category: "gameevent" },
    ],
    articlePattern: /\/cn\/article\/news\/\w+\/(\d{8})\/(\d+)\.html/,
    buildArticleUrl: (href) =>
      href.startsWith("http") ? href : `https://nte.perfectworld.com${href}`,
  },
  {
    lang: "en",
    lists: [
      { url: "https://nte.perfectworld.com/en/article/news/gamenews/index.html", category: "gamenews" },
      { url: "https://nte.perfectworld.com/en/article/news/gamebroad/index.html", category: "gamebroad" },
      { url: "https://nte.perfectworld.com/en/article/news/gameevent/index.html", category: "gameevent" },
    ],
    articlePattern: /\/en\/article\/news\/\w+\/(\d{8})\/(\d+)\.html/,
    buildArticleUrl: (href) =>
      href.startsWith("http") ? href : `https://nte.perfectworld.com${href}`,
  },
  {
    lang: "jp",
    lists: [
      { url: "https://nte.perfectworld.com/jp/article/news/gamenews/index.html", category: "gamenews" },
      { url: "https://nte.perfectworld.com/jp/article/news/gamebroad/index.html", category: "gamebroad" },
      { url: "https://nte.perfectworld.com/jp/article/news/gameevent/index.html", category: "gameevent" },
    ],
    articlePattern: /\/jp\/article\/news\/\w+\/(\d{8})\/(\d+)\.html/,
    buildArticleUrl: (href) =>
      href.startsWith("http") ? href : `https://nte.perfectworld.com${href}`,
  },
];

// ─── Twitter/X RSS sources ─────────────────────────────────────────────────

interface TweetSource {
  envKey: string;
  langs: NewsLang[];
  handle: string;
}

const TWEET_SOURCES: TweetSource[] = [
  { envKey: "NTE_TWEET_RSS_ZH", langs: ["tw", "cn"], handle: "@NTE_ZH" },
  { envKey: "NTE_TWEET_RSS_EN", langs: ["en"],        handle: "@NTE_GL" },
  { envKey: "NTE_TWEET_RSS_JP", langs: ["jp"],        handle: "@NTE_JP" },
];

// ─── Article ───────────────────────────────────────────────────────────────

interface NteArticle {
  kind: "news" | "tweet";
  lang: NewsLang;
  category: string;
  id: string;
  title: string;
  url: string;
  date: string;
  coverUrl?: string;
  handle?: string;
  authorName?: string;
  avatarUrl?: string;
}

/** Returns true when an article should be dispatched to a subscriber with the given filter. */
function matchesFilter(article: NteArticle, filter: NewsFilter): boolean {
  if (filter === "all") return true;
  if (filter === "tweet") return article.kind === "tweet";
  if (filter === "news_all") return article.kind === "news";
  if (filter.startsWith("news_")) {
    if (article.kind !== "news") return false;
    const cat = filter.slice(5); // "gamenews" | "gameevent" | "gamebroad"
    // TW articles have category "all" — they match every news filter
    return article.category === "all" || article.category === cat;
  }
  return true;
}

// ─── Article block ─────────────────────────────────────────────────────────

type ArticleBlock = { type: "text"; content: string } | { type: "image"; url: string };

function resolveNitterImage(src: string): string {
  try {
    const url = new URL(src);
    if (url.pathname.startsWith("/pic/enc/")) {
      const encoded = url.pathname.slice("/pic/enc/".length);
      return Buffer.from(encoded, "base64url").toString("utf8");
    }
    if (url.pathname.startsWith("/pic/")) {
      const picPath = decodeURIComponent(url.pathname.slice("/pic/".length));
      // Profile images already include the domain (e.g. "pbs.twimg.com/profile_images/...")
      if (/^[a-z0-9.-]+\.[a-z]{2,}\//.test(picPath)) return `https://${picPath}`;
      return `https://pbs.twimg.com/${picPath}`;
    }
  } catch {}
  return src;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const POLL_INTERVAL = 5 * 60 * 1000;

const LANG_LABEL: Record<NewsLang, string> = {
  tw: "異環 TW",
  cn: "异环 CN",
  en: "NTE",
  jp: "NTE JP",
};

const rssParser = new Parser({ timeout: 15_000 });

// ─── Service ───────────────────────────────────────────────────────────────

export class NteNewsService {
  private client: ExtendedClient;
  private interval: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(client: ExtendedClient) {
    this.client = client;
    this.logger = new Logger("NteNews");
  }

  public start() {
    this.logger.info("NTE News Service started.");
    this.checkNews();
    this.interval = setInterval(() => this.checkNews(), POLL_INTERVAL);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public async checkNews(force = false) {
    for (const source of NEWS_SOURCES) {
      for (const list of source.lists) {
        try {
          await this.checkPage(source, list.url, list.category, force);
        } catch (err: any) {
          this.logger.error(`[${source.lang}/news] ${list.url}: ${err.message}`);
        }
      }
    }

    for (const tweetSrc of TWEET_SOURCES) {
      const rssUrl = process.env[tweetSrc.envKey];
      if (!rssUrl) continue;
      try {
        await this.checkTweets(tweetSrc, rssUrl, force);
      } catch (err: any) {
        this.logger.error(`[${tweetSrc.handle}] ${err.message}`);
      }
    }
  }

  /**
   * @param filter  "tweet" = tweets only; "gamenews"|"gameevent"|"gamebroad" = that news category only;
   *                undefined = news (all categories) + tweets
   */
  public async forceLatest(lang?: NewsLang, filter?: string) {
    const tweetsOnly = filter === "tweet";
    const newsCategory = !tweetsOnly ? filter : undefined; // "gamenews" | "gameevent" | "gamebroad" | undefined

    // ── Website news ──
    if (!tweetsOnly) {
      const newsSources = lang ? NEWS_SOURCES.filter((s) => s.lang === lang) : NEWS_SOURCES;
      const newsGroups = new Map<NewsLang, NteArticle[]>();

      for (const source of newsSources) {
        const listsToCheck =
          newsCategory
            ? source.lists.filter((l) => l.category === newsCategory || l.category === "all")
            : source.lists;

        for (const list of listsToCheck) {
          try {
            const articles = await this.fetchPage(source, list.url, list.category, 1);
            const existing = newsGroups.get(source.lang) ?? [];
            newsGroups.set(source.lang, [...existing, ...articles]);
          } catch (err: any) {
            this.logger.error(`[${source.lang}/news] force: ${err.message}`);
          }
        }
      }

      for (const [, articles] of newsGroups) {
        articles.sort((a, b) => b.date.localeCompare(a.date));
        if (articles[0]) await this.processArticle(articles[0], true);
      }
    }

    // ── Tweets ──
    if (tweetsOnly || !filter) {
      const tweetSrcs = lang
        ? TWEET_SOURCES.filter((s) => s.langs.includes(lang))
        : TWEET_SOURCES;

      for (const tweetSrc of tweetSrcs) {
        const rssUrl = process.env[tweetSrc.envKey];
        if (!rssUrl) continue;
        try {
          await this.checkTweets(tweetSrc, rssUrl, true, 1);
        } catch (err: any) {
          this.logger.error(`[${tweetSrc.handle}] force: ${err.message}`);
        }
      }
    }
  }

  // ─── Twitter polling ─────────────────────────────────────────────────────

  private async checkTweets(
    tweetSrc: TweetSource,
    rssUrl: string,
    force: boolean,
    limit = 5,
  ) {
    const feed = await rssParser.parseURL(rssUrl);
    const items = feed.items.slice(0, limit);

    const rawFeedAvatar = (feed as any).image?.url ?? "";
    const avatarUrl = rawFeedAvatar ? resolveNitterImage(rawFeedAvatar) : undefined;
    const authorName = feed.title?.replace(/\s*\(@[^)]+\)$/, "").trim() ?? tweetSrc.handle;

    for (const lang of tweetSrc.langs) {
      for (const item of [...items].reverse()) {
        const url = item.link ?? (item as any).guid ?? "";
        if (!url) continue;

        const rawId = url.split("/").pop()?.replace(/[^0-9a-zA-Z_-]/g, "") ?? "";
        if (!rawId) continue;

        const id = `${lang}_tweet_${rawId}`;
        const title = (item.contentSnippet ?? item.title ?? "").trim();

        let coverUrl: string | undefined;
        const htmlContent = (item as any).content ?? (item as any)["content:encoded"] ?? "";
        if (htmlContent) {
          const parsed = parse(htmlContent);
          const img = parsed.querySelector("img");
          if (img) {
            const src = img.getAttribute("src") ?? "";
            coverUrl = src ? resolveNitterImage(src) : undefined;
          }
        }

        if (!title && !coverUrl) continue;

        const pubDate = item.isoDate ?? item.pubDate ?? "";
        const date = pubDate
          ? new Date(pubDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);

        await this.processArticle({
          kind: "tweet",
          lang,
          category: "tweet",
          id,
          title,
          url,
          date,
          coverUrl,
          handle: tweetSrc.handle,
          authorName,
          avatarUrl,
        }, force);
      }
    }
  }

  // ─── Website news polling ─────────────────────────────────────────────────

  private async fetchPage(
    source: ArticleSource,
    listUrl: string,
    category: string,
    limit: number,
  ): Promise<NteArticle[]> {
    const res = await axios.get<string>(listUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        Referer: new URL(listUrl).origin + "/",
      },
      timeout: 15_000,
    });

    const root = parse(res.data);
    const anchors = root.querySelectorAll("a[href]");
    const seen = new Set<string>();
    const articles: NteArticle[] = [];

    for (const a of anchors) {
      const href = a.getAttribute("href") ?? "";
      if (!source.articlePattern.test(href) || seen.has(href)) continue;
      seen.add(href);

      const match = href.match(source.articlePattern);
      if (!match) continue;
      const [, dateStr, rawId] = match;
      const id = `${source.lang}_${rawId}`;

      const rawText = a.getAttribute("title")?.trim()
        || a.text.split("\n").map((l) => l.trim()).find((l) => l.length > 0)
        || "";
      const title = rawText.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
      const articleUrl = source.buildArticleUrl(href);

      let coverUrl: string | undefined;
      const img = (a.parentNode as any)?.querySelector?.("img");
      if (img) {
        const src = img.getAttribute("src") ?? "";
        if (src) coverUrl = src.startsWith("http") ? src : `${new URL(listUrl).origin}${src}`;
      }

      const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      articles.push({ kind: "news", lang: source.lang, category, id, title, url: articleUrl, date, coverUrl });
      if (articles.length >= limit) break;
    }

    return articles;
  }

  private async checkPage(
    source: ArticleSource,
    listUrl: string,
    category: string,
    force: boolean,
    limit = 5,
  ) {
    const articles = await this.fetchPage(source, listUrl, category, limit);
    if (articles.length === 0) {
      this.logger.warn(`[${source.lang}/news] No articles at ${listUrl}`);
      return;
    }
    for (const article of articles.reverse()) {
      await this.processArticle(article, force);
    }
  }

  // ─── Core processing ──────────────────────────────────────────────────────

  private async processArticle(article: NteArticle, force: boolean) {
    const historyKey = `nte_news_history.${article.id}`;
    const contentHash = crypto
      .createHash("md5")
      .update(article.title + article.url)
      .digest("hex");

    const stored = await this.client.db.get<{ hash: string }>(historyKey);
    const isNew = !stored;
    const isUpdated = stored && stored.hash !== contentHash;

    if (!isNew && !isUpdated && !force) return;

    this.logger.info(
      `[${article.lang}/${article.kind}] ${force ? "Force" : isNew ? "New" : "Updated"}: ${article.title.slice(0, 60)}`,
    );

    await this.client.db.set(historyKey, { id: article.id, hash: contentHash, timestamp: Date.now() });
    await this.dispatch(article, contentHash, !!isUpdated, force);
  }

  private async dispatch(
    article: NteArticle,
    currentHash: string,
    isUpdate: boolean,
    force: boolean,
  ) {
    const subscriptions: Subscription[] =
      (await this.client.db.get("news_subscriptions")) ?? [];

    const eligible = await Promise.all(
      subscriptions
        .filter((s) => force || (s.language === article.lang && matchesFilter(article, s.filter)))
        .map(async (sub) => {
          const dispatchKey = `nte_news_dispatch.${article.id}.${sub.channelId}`;
          const dispatchRecord = await this.client.db.get(dispatchKey);
          return { ...sub, dispatchRecord };
        }),
    );

    if (eligible.length === 0) return;

    const basePayload = await this.buildPayload(article);

    const broadcastResults = await this.client.cluster.broadcastEval(
      async (c: any, ctx: any) => {
        const results: Array<{ channelId: string; messageId: string; isNew: boolean }> = [];
        for (const sub of ctx.subs) {
          try {
            const channel = c.channels.cache.get(sub.channelId);
            if (!channel) continue;

            const msgPayload: any = { ...ctx.basePayload };
            if (sub.roleId) {
              msgPayload.content = `<@&${sub.roleId}>`;
              msgPayload.allowedMentions = { roles: [sub.roleId] };
            }

            if (sub.dispatchRecord && !ctx.force) {
              if (ctx.isUpdate && sub.dispatchRecord.hash !== ctx.currentHash) {
                const msg = await channel.messages.fetch(sub.dispatchRecord.messageId);
                if (msg) {
                  await msg.edit(msgPayload);
                  results.push({ channelId: sub.channelId, messageId: sub.dispatchRecord.messageId, isNew: false });
                }
              }
            } else {
              const msg = await channel.send(msgPayload);
              results.push({ channelId: sub.channelId, messageId: msg.id, isNew: true });
            }
          } catch {}
        }
        return results;
      },
      { context: { subs: eligible, basePayload, isUpdate, currentHash, force } },
    );

    for (const res of (broadcastResults as any[]).flat()) {
      const dispatchKey = `nte_news_dispatch.${article.id}.${res.channelId}`;
      await this.client.db.set(dispatchKey, {
        newsId: article.id,
        channelId: res.channelId,
        messageId: res.messageId,
        hash: currentHash,
      });
      this.logger.success(
        `[${article.lang}/${article.kind}] ${res.isNew ? "Sent" : "Updated"} → #${res.channelId}`,
      );
    }
  }

  // ─── Payload builder ──────────────────────────────────────────────────────

  private async fetchArticleData(url: string): Promise<ArticleBlock[]> {
    try {
      const res = await axios.get<string>(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          Referer: new URL(url).origin + "/",
        },
        timeout: 15_000,
      });
      const origin = new URL(url).origin;
      const root = parse(res.data);
      root.querySelectorAll("script, style, nav, header, footer, .articleBottomTxt, .articleBottom").forEach((el) => el.remove());

      const selectors = [
        ".articleContent",
        ".article-content", ".news-content", ".content-main", ".article-body",
        ".news-detail", ".detail-content", "article", ".main-content",
      ];
      for (const sel of selectors) {
        const el = root.querySelector(sel);
        if (!el) continue;

        const blocks: ArticleBlock[] = [];
        let pendingText = "";

        const flush = () => {
          const t = pendingText.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
          if (t.length > 50) blocks.push({ type: "text", content: t.length > 1500 ? t.slice(0, 1500) + "…" : t });
          pendingText = "";
        };

        const BLOCK_TAGS = new Set(["p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr"]);

        const walk = (node: any) => {
          if (node.nodeType === 3) {
            pendingText += node.rawText ?? "";
          } else if (node.tagName?.toLowerCase() === "img") {
            flush();
            const src = node.getAttribute("src") ?? "";
            const resolved = src.startsWith("http") ? src : src ? `${origin}${src}` : "";
            if (resolved) blocks.push({ type: "image", url: resolved });
          } else {
            for (const child of (node.childNodes ?? [])) walk(child);
            if (BLOCK_TAGS.has(node.tagName?.toLowerCase())) pendingText += "\n";
          }
        };

        walk(el);
        flush();
        return blocks;
      }
    } catch {}
    return [];
  }

  private async buildPayload(article: NteArticle): Promise<any> {
    const container = new ContainerBuilder();
    const dateTs = Math.floor(new Date(article.date).getTime() / 1000);

    if (article.kind === "tweet") {
      const handle = article.handle ?? "@NTE";
      const authorName = article.authorName ?? handle;
      const cleanText = article.title
        .split("\n")
        .filter((line) => line.trim() !== "-")
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Author header with avatar thumbnail
      const authorHeader = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${authorName}**\n-# ${handle} • <t:${dateTs}:R>`),
        );
      if (article.avatarUrl) {
        authorHeader.setThumbnailAccessory(
          new ThumbnailBuilder({ media: { url: article.avatarUrl } }),
        );
      }
      container.addSectionComponents(authorHeader);

      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(cleanText));

      if (article.coverUrl) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder({ media: { url: article.coverUrl } }),
          ),
        );
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# [𝕏 推文連結](${article.url})`),
      );

    } else {
      const label = LANG_LABEL[article.lang];
      const rawTitle =
        article.title.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, " ").trim() ||
        article.title;
      const linkTitle = rawTitle.replace(/\]/g, "\\]");
      const header = `### [${linkTitle}](${article.url})\n-# ${label} • <t:${dateTs}:D>`;

      if (article.coverUrl) {
        container.addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
            .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: article.coverUrl } })),
        );
      } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(header));
      }

      const blocks = await this.fetchArticleData(article.url);
      if (blocks.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(2));
      }
      let i = 0;
      while (i < blocks.length) {
        const block = blocks[i];
        if (block.type === "text") {
          container.addTextDisplayComponents(new TextDisplayBuilder().setContent(block.content));
          i++;
        } else {
          const gallery = new MediaGalleryBuilder();
          while (i < blocks.length && blocks[i].type === "image") {
            gallery.addItems(new MediaGalleryItemBuilder({ media: { url: (blocks[i] as { type: "image"; url: string }).url } }));
            i++;
          }
          container.addMediaGalleryComponents(gallery);
        }
      }
    }

    return { content: "", flags: MessageFlags.IsComponentsV2, components: [container] };
  }
}
