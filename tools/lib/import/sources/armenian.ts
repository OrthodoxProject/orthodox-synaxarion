/**
 * Calendar of Feasts of the Armenian Apostolic Church (armenianchurch.ge,
 * Diocese of Georgia). The page lists the feasts and commemorations grouped by
 * month, each with a link to its description. Most Armenian commemorations are
 * movable (they fall on a weekday set from Pascha or from the great feasts), so
 * the month is kept only as a note. Only titles and links are used.
 */
import { cleanText, decodeEntities } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const ARMENIAN_URL = "https://armenianchurch.ge/en/kalendar-prazdnikov";

export interface ArmenianEntry {
  slug: string;
  url: string;
  month: string;
  title: string;
  order: number;
}

export function parseCalendar(html: string): ArmenianEntry[] {
  const out: ArmenianEntry[] = [];
  const seen = new Set<string>();
  const re = /<a data-text="([^"]*)" href="(\/en\/kalendar-prazdnikov\/description-2\/([a-z]+)\/([^"]+))">/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const path = m[2] ?? "";
    if (seen.has(path)) continue;
    seen.add(path);
    out.push({
      slug: m[4] ?? "",
      url: `https://armenianchurch.ge${path}`,
      month: m[3] ?? "",
      title: cleanText(decodeEntities(m[1] ?? "")),
      order: out.length,
    });
  }
  return out;
}

export async function crawl(fetcher: PoliteFetcher): Promise<ArmenianEntry[]> {
  return parseCalendar(await fetcher.get(ARMENIAN_URL));
}
