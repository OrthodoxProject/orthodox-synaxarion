/**
 * The Coptic Synaxarium: the list of all commemorations on copticchurch.net
 * (/synaxarium/all/en, one line per commemoration with its Coptic day and
 * position), and the day pages of the English synaxarium on
 * st-takla.org (one link per commemoration). Only the titles and the links are
 * used, not the texts.
 */
import { cleanText, decodeEntities } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const COPTIC_MONTHS = ["Tout", "Baba", "Hator", "Kiahk", "Toba", "Amshir", "Baramhat", "Baramouda", "Bashons", "Paona", "Abib", "Mesra", "Nasie"];

export interface CopticEntry {
  month: number;
  day: number;
  /** Position on the day (1-based), as in copticchurch.net anchors ("1_7#1"). */
  n: number;
  title: string;
  titleAr?: string;
  /** Link to the day page of st-takla.org for this commemoration, when found. */
  taklaUrl?: string;
  taklaTitle?: string;
}

export const COPTIC_ALL_EN = "https://copticchurch.net/synaxarium/all/en";
export const TAKLA_INDEX = "https://st-takla.org/books/en/church/synaxarium/index.html";

export function copticUrl(e: { month: number; day: number; n: number }): string {
  return `https://www.copticchurch.net/synaxarium/${e.month}_${e.day}.html?lang=en#${e.n}`;
}

export function parseAll(html: string): Array<{ month: number; day: number; n: number; title: string }> {
  const out: Array<{ month: number; day: number; n: number; title: string }> = [];
  const re = /<a href="\/synaxarium\/(\d+)_(\d+)#(\d+)">[^<]*<\/a><\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push({ month: Number(m[1]), day: Number(m[2]), n: Number(m[3]), title: cleanText(decodeEntities((m[4] ?? "").replace(/<[^>]+>/g, ""))) });
  }
  return out;
}

export function parseTaklaIndex(html: string): string[] {
  const links = new Set<string>();
  const re = /href="((?:\d\d-[a-z]+)\/\d\d-[a-z]+\.html)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) links.add(m[1] ?? "");
  return [...links].sort();
}

export function parseTaklaDay(html: string): Array<{ n: number; href: string; title: string }> {
  const out: Array<{ n: number; href: string; title: string }> = [];
  const re = /(\d+)\.\s*<a href="([^"#]+\.html)">([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[2] ?? "";
    if (/^(?:\.\.|\/|https?:)/.test(href)) continue;
    out.push({ n: Number(m[1]), href, title: cleanText(decodeEntities((m[3] ?? "").replace(/<[^>]+>/g, ""))) });
  }
  return out;
}

/** "01-toot/07-tout.html" → [1, 7] */
function taklaDate(path: string): [number, number] | null {
  const m = /^(\d\d)-[a-z]+\/(\d\d)-[a-z]+\.html$/.exec(path);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export async function crawl(fetcher: PoliteFetcher, log: (m: string) => void): Promise<CopticEntry[]> {
  // The Arabic list (/all/ar) numbers the commemorations of a day differently, so it is not used.
  const entries: CopticEntry[] = parseAll(await fetcher.get(COPTIC_ALL_EN)).map((e) => ({ ...e }));
  const byKey = new Map(entries.map((e) => [`${e.month}_${e.day}#${e.n}`, e]));
  const days = parseTaklaIndex(await fetcher.get(TAKLA_INDEX));
  let n = 0;
  for (const path of days) {
    const date = taklaDate(path);
    if (!date) continue;
    const url = new URL(path, TAKLA_INDEX).toString();
    let html: string;
    try {
      html = await fetcher.get(url);
    } catch (e) {
      log(`st-takla: ${(e as Error).message}`);
      continue;
    }
    for (const item of parseTaklaDay(html)) {
      const entry = byKey.get(`${date[0]}_${date[1]}#${item.n}`);
      if (!entry) continue;
      entry.taklaUrl = new URL(item.href, url).toString();
      entry.taklaTitle = item.title;
    }
    if (++n % 60 === 0) log(`st-takla: ${n} days`);
  }
  // A few lines of copticchurch.net have no title; st-takla.org has it.
  for (const e of entries) if (!e.title && e.taklaTitle) e.title = e.taklaTitle;
  return entries.filter((e) => e.title);
}
