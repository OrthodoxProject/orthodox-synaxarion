/**
 * robots.txt rules (RFC 9309): the group for our user agent, or the "*" group,
 * longest match wins and Allow wins a tie. Crawl-delay is read as well, although
 * the RFC does not define it, because some sources ask for it.
 */

export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

/** Parses robots.txt and returns the rules that apply to the given product token. */
export function parseRobots(text: string, product: string): RobotsRules {
  const groups: Array<{ agents: string[]; rules: RobotsRules }> = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = (m[1] ?? "").toLowerCase();
    const value = (m[2] ?? "").trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" && value) current.rules.allow.push(value);
    else if (field === "disallow" && value) current.rules.disallow.push(value);
    else if (field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.rules.crawlDelay = n;
    }
  }
  const token = product.toLowerCase();
  const own = groups.filter((g) => g.agents.some((a) => a !== "*" && token.startsWith(a)));
  const chosen = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  const merged: RobotsRules = { allow: [], disallow: [] };
  for (const g of chosen) {
    merged.allow.push(...g.rules.allow);
    merged.disallow.push(...g.rules.disallow);
    if (g.rules.crawlDelay !== undefined) merged.crawlDelay = Math.max(merged.crawlDelay ?? 0, g.rules.crawlDelay);
  }
  return merged;
}

function patternLength(pattern: string): number {
  return pattern.replace(/\*/g, "").length;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(`^${body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}${anchored ? "$" : ""}`);
  return re.test(path);
}

/** Whether a path (with its query string) may be fetched. */
export function isAllowed(rules: RobotsRules, path: string): boolean {
  let best: { length: number; allow: boolean } | null = null;
  const consider = (pattern: string, allow: boolean): void => {
    if (!matches(pattern, path)) return;
    const length = patternLength(pattern);
    if (!best || length > best.length || (length === best.length && allow && !best.allow)) best = { length, allow };
  };
  for (const p of rules.disallow) consider(p, false);
  for (const p of rules.allow) consider(p, true);
  return best === null ? true : (best as { allow: boolean }).allow;
}
