/**
 * Lives of the Saints, Orthodox Church in America (oca.org/saints/lives).
 * Each civil day has a page listing its commemorations, with a stable numeric
 * id. The OCA follows the new calendar, so the civil day is the Menaion date.
 * Two years are read: a commemoration on the same month and day in both is
 * fixed; the others belong to the movable cycle (their place in each year is
 * kept, relative to Pascha). Only the index is used (title, id, URL); the short
 * life that the day's page prints under a title is read only to tell apart two
 * saints of one name (see Builder.evidence), and is never copied.
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
  /** The short life printed under the title on the day's page, as text. */
  description?: string;
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
  const re = /<h2 class="name">([\s\S]*?)<!--\s*(\d+)\s*-->\s*<\/h2>([\s\S]*?)href="(\/saints\/lives\/\d+\/\d+\/\d+\/(\d+)-[^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section))) {
    const id = m[2] ?? "";
    if (m[5] !== id) continue;
    const listing: OcaListing = {
      id,
      title: cleanText(decodeEntities((m[1] ?? "").replace(/<[^>]+>/g, ""))),
      path: m[4] ?? "",
      year,
      month,
      day,
      order: out.length,
    };
    const description = /<p class="description">([\s\S]*?)<\/p>/.exec(m[3] ?? "")?.[1];
    if (description) listing.description = cleanText(decodeEntities(description.replace(/<[^>]+>/g, " ")));
    out.push(listing);
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
