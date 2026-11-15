/**
 * calendar.ortodox.md ("Calendox"), the Orthodox calendar of the Republic of
 * Moldova, on the old style (the Julian calendar of the Metropolis of Chișinău
 * and All Moldova). One page per civil day (/calendar/detailed/RO/DD/MM/YYYY)
 * gives the day on the old and on the new style and links every commemoration
 * of the day to its own page (/calendar/entry/RO/<id>), which has the life, the
 * hymns and the icons. Only the day's list is read: the title as the site
 * writes it, the old-style day (the Menaion date) and the link; lives and
 * hymns are not copied.
 *
 * The list also holds the Sunday or the week, the readings and fasting notes,
 * and the page of Pascha lists thousands of entries that have no day of their
 * own. Two old-style years are read: an entry is fixed when it is on the same
 * old-style day in both (see ortodoxMdUnits).
 */
import { jdnToGregorian, jdnToJulian, julianToJdn, type Ymd } from "../../calendar.ts";
import { cleanText, textOf } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const ORTODOX_MD_URL = "https://calendar.ortodox.md/";

/** Old-style years read: 2028 is a leap year of the Julian calendar, so it has 29 February. */
export const ORTODOX_MD_YEARS = [2026, 2028];

const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

export interface OrtodoxMdEntry {
  /** Id of the entry's page (/calendar/entry/RO/<id>): a number or a UUID. */
  id: string;
  title: string;
  /** Old-style year of the day's page. */
  year: number;
  /** Old-style day: the Menaion date. */
  month: number;
  day: number;
  /** Position on the day's page (0-based). */
  order: number;
  /** The site's rank of the line, from the link's class (r0 … r4). */
  rank: number;
}

export interface OrtodoxMdDay {
  /** The old-style day the page prints, or null when it prints none. */
  oldStyle: { month: number; day: number } | null;
  entries: Array<{ id: string; title: string; rank: number }>;
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** The page of a civil day. */
export function dayUrl({ year, month, day }: Ymd): string {
  return `https://calendar.ortodox.md/calendar/detailed/RO/${pad(day)}/${pad(month)}/${year}`;
}

/** The page of an entry: the link the dataset cites. */
export function entryUrl(id: string): string {
  return `https://calendar.ortodox.md/calendar/entry/RO/${id}`;
}

/** "2 Noiembrie" → { month: 11, day: 2 }. */
function parseDate(text: string): { month: number; day: number } | null {
  const m = /^(\d{1,2})\s+(\p{L}+)$/u.exec(text.trim());
  const month = m ? MONTHS.indexOf((m[2] ?? "").toLowerCase()) + 1 : 0;
  return m && month > 0 ? { month, day: Number(m[1]) } : null;
}

export function parseDay(html: string): OrtodoxMdDay {
  const label = /Stil vechi<\/div>\s*<div class="day day-date">([^<]*)</.exec(html);
  const oldStyle = label ? parseDate(label[1] ?? "") : null;
  const entries: OrtodoxMdDay["entries"] = [];
  const re = /<a class="r r(\d+) entry-link" href="\/calendar\/entry\/RO\/([^"/]+)">\s*<span>([\s\S]*?)<\/span>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const title = cleanText(textOf(m[3] ?? "")).replace(/\.$/, "").trim();
    if (title) entries.push({ id: m[2] ?? "", title, rank: Number(m[1]) });
  }
  return { oldStyle, entries };
}

/** The civil days of an old-style year, each with its old-style date. */
export function* oldStyleDays(year: number): Generator<{ civil: Ymd; month: number; day: number }> {
  const last = julianToJdn({ year, month: 12, day: 31 });
  for (let jdn = julianToJdn({ year, month: 1, day: 1 }); jdn <= last; jdn++) {
    const { month, day } = jdnToJulian(jdn);
    yield { civil: jdnToGregorian(jdn), month, day };
  }
}

export async function crawl(fetcher: PoliteFetcher, log: (message: string) => void = () => {}, years = ORTODOX_MD_YEARS): Promise<OrtodoxMdEntry[]> {
  const out: OrtodoxMdEntry[] = [];
  for (const year of years) {
    let n = 0;
    for (const { civil, month, day } of oldStyleDays(year)) {
      const url = dayUrl(civil);
      const page = parseDay(await fetcher.get(url));
      if (page.oldStyle && (page.oldStyle.month !== month || page.oldStyle.day !== day)) {
        log(`calendar.ortodox.md: ${url} prints ${page.oldStyle.day}.${page.oldStyle.month} on the old style, not ${day}.${month}`);
      }
      page.entries.forEach((e, order) => out.push({ ...e, year, month, day, order }));
      if (++n % 30 === 0) log(`  calendar.ortodox.md ${year}: ${n} days`);
    }
  }
  return out;
}
