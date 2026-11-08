/**
 * A polite HTTP client for the importers: it follows robots.txt, waits between
 * requests to the same host (the site's Crawl-delay, or a default), retries
 * transient errors and keeps every response in a cache under build/cache/, so
 * that a second run works offline and does not load the sources again.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { isAllowed, parseRobots, type RobotsRules } from "./robots.ts";

export const USER_AGENT = "orthodox-synaxarion-importer/0.1 (+https://github.com/OrthodoxProject/orthodox-synaxarion)";
const PRODUCT = "orthodox-synaxarion-importer";

export interface FetchOptions {
  cacheDir: string;
  /** Use only the cache; fail on pages that were never downloaded. */
  offline?: boolean;
  /** Seconds between two requests to the same host when robots.txt sets no Crawl-delay. */
  defaultDelay?: number;
  log?: (message: string) => void;
}

export class PoliteFetcher {
  private readonly robots = new Map<string, RobotsRules>();
  private readonly lastRequest = new Map<string, number>();
  private readonly options: Required<FetchOptions>;
  requests = 0;
  cacheHits = 0;

  constructor(options: FetchOptions) {
    this.options = { offline: false, defaultDelay: 2, log: () => {}, ...options };
  }

  private cachePath(url: string): string {
    const u = new URL(url);
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
    const readable = `${u.pathname}${u.search}`.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
    return join(this.options.cacheDir, u.hostname, `${readable}.${hash}.html`);
  }

  /** Whether the page is already in the cache. */
  cached(url: string): boolean {
    return existsSync(this.cachePath(url));
  }

  private async rulesFor(origin: string): Promise<RobotsRules> {
    const known = this.robots.get(origin);
    if (known) return known;
    let text = "";
    try {
      text = await this.download(`${origin}/robots.txt`, true);
    } catch {
      text = "";
    }
    const rules = parseRobots(text, PRODUCT);
    this.robots.set(origin, rules);
    return rules;
  }

  private async wait(host: string, delaySeconds: number): Promise<void> {
    const last = this.lastRequest.get(host) ?? 0;
    const due = last + delaySeconds * 1000;
    const now = Date.now();
    if (due > now) await sleep(due - now);
    this.lastRequest.set(host, Date.now());
  }

  private async download(url: string, isRobots = false): Promise<string> {
    const path = this.cachePath(url);
    if (existsSync(path)) {
      this.cacheHits++;
      return readFileSync(path, "utf8");
    }
    if (this.options.offline) throw new Error(`not in cache (offline): ${url}`);
    const u = new URL(url);
    const delay = isRobots ? this.options.defaultDelay : ((await this.rulesFor(u.origin)).crawlDelay ?? this.options.defaultDelay);
    let attempt = 0;
    for (;;) {
      attempt++;
      await this.wait(u.host, delay);
      this.requests++;
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json;q=0.9,*/*;q=0.5" },
          redirect: "follow",
          signal: AbortSignal.timeout(60_000),
        });
      } catch (e) {
        if (attempt < 4) {
          this.options.log(`retry ${attempt} after network error: ${url} (${(e as Error).message})`);
          await sleep(5000 * attempt);
          continue;
        }
        throw e;
      }
      if (response.status === 404 || response.status === 410) {
        if (isRobots) return "";
        throw new Error(`HTTP ${response.status}: ${url}`);
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt < 4) {
          const retryAfter = Number(response.headers.get("retry-after")) || 0;
          this.options.log(`retry ${attempt} after HTTP ${response.status}: ${url}`);
          await sleep(Math.max(retryAfter * 1000, 10_000 * attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${url}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const text = await response.text();
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text, "utf8");
      return text;
    }
  }

  /** Downloads a page (or reads it from the cache) after checking robots.txt. */
  async get(url: string): Promise<string> {
    if (!this.cached(url) && !this.options.offline) {
      const u = new URL(url);
      const rules = await this.rulesFor(u.origin);
      if (!isAllowed(rules, `${u.pathname}${u.search}`)) throw new Error(`robots.txt does not allow ${url}`);
    }
    return this.download(url);
  }
}
