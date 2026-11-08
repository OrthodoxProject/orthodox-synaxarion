/**
 * Lives of the Saints, Orthodox Church in America (oca.org/saints/lives).
 * Each civil day has a page listing its commemorations, with a stable numeric
 * id. The OCA follows the new calendar, so the civil day is the Menaion date.
 * Two years are read: a commemoration on the same month and day in both is
 * fixed; the others belong to the movable cycle (their place in each year is
 * kept, relative to Pascha). Only the index is used (title, id, URL), never the
 * text of the lives.
 */
import { cleanText, decodeEntities } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const OCA_YEARS = [2026, 2028];

export interface OcaListing {
  id: string;
  title: string;
  /** URL path of the life, e.g. /saints/lives/2026/11/20/103340-venerable-gregory-the-decapolite */
  path: string;
  year: number;
  month: number;
  day: number;
  /** Position on the day's page (0-based). */
  order: number;
}

export function dayUrl(year: number, month: number, day: number): string {
  return `https://www.oca.org/saints/lives/${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

export function* daysOf(year: number): Generator<{ month: number; day: number }> {
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCFullYear() === year) {
    yield { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

export function parseDay(html: string, year: number, month: number, day: number): OcaListing[] {
  const out: OcaListing[] = [];
  const section = html.slice(html.indexOf('<section class="saints">'), html.indexOf("</section>", html.indexOf('<section class="saints">')));
  const re = /<h2 class="name">([\s\S]*?)<!--\s*(\d+)\s*-->\s*<\/h2>[\s\S]*?href="(\/saints\/lives\/\d+\/\d+\/\d+\/(\d+)-[^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section))) {
    const id = m[2] ?? "";
    if (m[4] !== id) continue;
    out.push({
      id,
      title: cleanText(decodeEntities((m[1] ?? "").replace(/<[^>]+>/g, ""))),
      path: m[3] ?? "",
      year,
      month,
      day,
      order: out.length,
    });
  }
  return out;
}

export async function crawl(fetcher: PoliteFetcher, log: (m: string) => void, years = OCA_YEARS): Promise<OcaListing[]> {
  const all: OcaListing[] = [];
  let missing = 0;
  for (const year of years) {
    let n = 0;
    for (const { month, day } of daysOf(year)) {
      const url = dayUrl(year, month, day);
      let html: string;
      try {
        html = await fetcher.get(url);
      } catch (e) {
        // Offline runs work with the days already downloaded.
        if (/not in cache/.test((e as Error).message)) {
          missing++;
          continue;
        }
        throw e;
      }
      all.push(...parseDay(html, year, month, day));
      if (++n % 30 === 0) log(`oca ${year}: ${n} days`);
    }
  }
  if (missing > 0) log(`oca: ${missing} day(s) not downloaded yet`);
  return all;
}
