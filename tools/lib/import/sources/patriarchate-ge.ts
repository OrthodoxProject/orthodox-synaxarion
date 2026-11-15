/**
 * The church calendar of the Patriarchate of Georgia (patriarchate.ge): one page per civil day
 * (/calendar/day/YYYY-MM-DD), whose data the page carries as JSON (<script data-page="app" …>). A day gives its
 * Menaion date on the old style ("old_month_day") and its commemorations (the "saints" category), each with an id that
 * stays the same from year to year, its title, its colour, whether it is printed in bold and whether it is fixed or
 * movable. Only the index is used: the title, the day, the marks and the link; the lives the titles open are not read.
 */
import type { PoliteFetcher } from "../fetch.ts";

export const PATRIARCHATE_GE = "https://patriarchate.ge";
/** The old-style Menaion of this year: 1 January to 31 December fall from 14 January to 13 January of the next year. */
export const GEORGIAN_YEAR = 2026;
/** A civil day whose Menaion date is 29 February (2024 is a leap year on the old style). */
const LEAP_DAY = "2024-03-13";

export interface GeorgianEntry {
  /** The commemoration's id on patriarchate.ge. */
  id: number;
  title: string;
  /** Menaion date (old style). */
  month: number;
  day: number;
  /** Position on the day, as the calendar sorts it. */
  order: number;
  bold: boolean;
  color: string;
  mode: "fixed" | "movable";
  needsReview: boolean;
  /** Civil date of the page that lists it. */
  date: string;
  /** A starred line on a day whose notes do not say what its star means. */
  unexplained?: true;
}

export function dayUrl(date: string): string {
  return `${PATRIARCHATE_GE}/calendar/day/${date}`;
}

/** The page of a commemoration: its day, opened at its entry. */
export function entryUrl(e: Pick<GeorgianEntry, "id" | "date">): string {
  return `${dayUrl(e.date)}?text=${e.id}`;
}

type Rec = Record<string, any>;

/**
 * A day's commemorations. Some movable ones are typed in as fixed, on their day of one year, with a star that the
 * day's notes explain: "* გარდამავალია" (it is movable), "** გარდამავალია, აღინიშნება ბზობის წინა შაბათს" (movable,
 * kept on the Saturday before Palm Sunday). Those are given as movable. A starred line on a day without notes is
 * `unexplained`: its day is checked against another year (see crawl).
 */
export function parseDay(html: string): GeorgianEntry[] {
  const m = /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m?.[1]) return [];
  const day = (JSON.parse(m[1]) as Rec).props?.day as Rec | undefined;
  if (!day) return [];
  const categories = (day.categories ?? []) as Rec[];
  const saints = categories.find((c) => c.code === "saints");
  const notes = categories
    .filter((c) => c.code === "notes" || c.code === "day_notes")
    .flatMap((c) => ((c.texts ?? []) as Rec[]).map((t) => `${String(t.title ?? "")} ${String(t.summary ?? "")}`.replace(/<[^>]+>/g, " ")))
    .join(" ");
  // The stars ("*", "**") whose note says the line is movable.
  const movableStars = new Set<string>();
  for (const n of notes.matchAll(/(\*{1,3})\s*(?:შენიშვნა:\s*)?გარდამავალია/g)) if (n[1]) movableStars.add(n[1]);
  const out: GeorgianEntry[] = [];
  for (const t of (saints?.texts ?? []) as Rec[]) {
    const [month, d] = String(t.old_month_day ?? day.old_month_day ?? "").split("-").map(Number);
    if (!month || !d || typeof t.title !== "string") continue;
    const stars = /(\*{1,3})[\s;.,]*$/.exec(t.title)?.[1] ?? /(\*{1,3})/.exec(t.title)?.[1];
    const entry: GeorgianEntry = {
      id: Number(t.id),
      title: t.title.trim(),
      month,
      day: d,
      order: Number(t.position ?? out.length),
      bold: t.is_bold === true,
      color: String(t.color ?? "black"),
      mode: t.mode === "movable" || (stars !== undefined && movableStars.has(stars)) ? "movable" : "fixed",
      needsReview: t.needs_review === true,
      date: String(day.date),
    };
    if (stars && notes.trim() === "") entry.unexplained = true;
    out.push(entry);
  }
  return out.sort((a, b) => a.order - b.order);
}

/** The 29 February first (the lines of its saints stand on 28 February in a common year), then one old-style year. */
export function yearDays(year = GEORGIAN_YEAR): string[] {
  const out: string[] = [LEAP_DAY];
  const start = Date.UTC(year, 0, 14);
  const end = Date.UTC(year + 1, 0, 13);
  for (let t = start; t <= end; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** The civil day of the same Menaion day one year earlier. */
function yearBefore(date: string): string {
  const t = Date.UTC(Number(date.slice(0, 4)) - 1, Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * The fixed commemorations of every Menaion day; the movable ones belong to one year and are left out. A starred line
 * that no note explains is kept only if the year before has it on the same Menaion day.
 */
export async function crawl(fetcher: PoliteFetcher, log: (m: string) => void = () => {}): Promise<GeorgianEntry[]> {
  const out: GeorgianEntry[] = [];
  const seen = new Set<number>();
  const days = yearDays();
  for (const [i, date] of days.entries()) {
    if (i % 60 === 0) log(`  patriarchate.ge: ${date} (${i + 1}/${days.length})`);
    for (const e of parseDay(await fetcher.get(dayUrl(date)))) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (e.mode !== "fixed") continue;
      if (e.unexplained) {
        const before = parseDay(await fetcher.get(dayUrl(yearBefore(date))));
        if (!before.some((x) => x.id === e.id && x.month === e.month && x.day === e.day)) continue;
      }
      out.push(e);
    }
  }
  return out;
}
