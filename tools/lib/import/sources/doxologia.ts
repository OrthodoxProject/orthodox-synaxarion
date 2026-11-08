/**
 * Doxologia (doxologia.ro): the monthly pages of the Orthodox calendar
 * (/calendar-ortodox/YYYYMM) list, for every day, one link per saint or feast,
 * with the cross of the Romanian calendar. Only the index is used: the name as
 * the site writes it, the day, the cross and the URL (its path is a stable id).
 */
import { cleanText, decodeEntities } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const DOXOLOGIA_YEAR = 2026;

export interface DoxologiaListing {
  slug: string;
  title: string;
  /** Civil date of the listing in DOXOLOGIA_YEAR (new calendar, i.e. the Menaion date). */
  month: number;
  day: number;
  order: number;
  /** "red", "blue" or null, from the link's class. */
  color: "red" | "blue" | null;
  /** The cross printed before the name: "(✝)", "✝)", "✝" or null. */
  cross: string | null;
  /** Whether the link is in the day's second row (Sundays and other movable days). */
  secondRow: boolean;
}

export function monthUrl(year: number, month: number): string {
  return `https://doxologia.ro/calendar-ortodox/${year}${String(month).padStart(2, "0")}`;
}

export function parseMonth(html: string, month: number): DoxologiaListing[] {
  const out: DoxologiaListing[] = [];
  const start = html.indexOf('<div class="calendar-calendar">');
  if (start < 0) return out;
  const body = html.slice(start);
  const dayRe = /<a href="\/(\d{1,2})-[a-z]+" class="a-initday">[\s\S]*?<div class="calendar-zi[^"]*">([\s\S]*?)<\/div><\/div><\/div>/g;
  let d: RegExpExecArray | null;
  while ((d = dayRe.exec(body))) {
    const day = Number(d[1]);
    const cell = d[2] ?? "";
    const brAt = cell.search(/<br\s*\/?>/i);
    const linkRe = /<a href="\/([^"]+)"(?: target="_blank")? class="([^"]*)">([\s\S]*?)<\/a>/g;
    let a: RegExpExecArray | null;
    let order = 0;
    while ((a = linkRe.exec(cell))) {
      const cls = a[2] ?? "";
      if (cls.includes("ev-zi")) continue; // readings
      const raw = cleanText(decodeEntities((a[3] ?? "").replace(/<[^>]+>/g, "")));
      const crossMatch = /^(\(✝\)|✝\)|✝)\s*/.exec(raw);
      out.push({
        slug: a[1] ?? "",
        title: crossMatch ? raw.slice(crossMatch[0].length).trim() : raw,
        month,
        day,
        order: order++,
        color: /rosu/.test(cls) ? "red" : /albastru/.test(cls) ? "blue" : null,
        cross: crossMatch ? (crossMatch[1] ?? null) : null,
        secondRow: brAt >= 0 && a.index > brAt,
      });
    }
  }
  return out;
}

export async function crawl(fetcher: PoliteFetcher, year = DOXOLOGIA_YEAR): Promise<DoxologiaListing[]> {
  const all: DoxologiaListing[] = [];
  for (let month = 1; month <= 12; month++) {
    const html = await fetcher.get(monthUrl(year, month));
    all.push(...parseMonth(html, month));
  }
  return all;
}
