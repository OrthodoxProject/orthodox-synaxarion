/**
 * Fasting as printed by calendar.patriarhia.ro: the notes in a day's title,
 * "(Dezlegare la pește)", "(Harți)", "(Post)", "(Dezlegare la brânză, lapte,
 * ouă și pește)". They go to the yearly overrides of the Romanian calendar,
 * which the calendar engine applies over its fasting model. The official
 * calendar prints every fish dispensation, so a day on which the model would
 * allow fish and the calendar prints none gets the model's level without it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fastingOf, gregorianToJdn, type DateStyle, type DayMarks, type FastingLevel } from "../calendar.ts";
import { styleFor } from "../days.ts";
import { fold } from "./names.ts";
import type { PatriarhiaDay } from "./sources/patriarhia.ts";

type Rec = Record<string, any>;

/** The fasting level printed in the notes of a day's title, if any. */
export function fastingNote(title: string): FastingLevel | undefined {
  const parts = [...title.matchAll(/\(([^()]*)\)/g)].flatMap((m) => (m[1] ?? "").split(".").map((p) => fold(p).trim()));
  if (parts.includes("harti")) return "fast_free";
  if (parts.some((p) => p.startsWith("dezlegare la branza"))) return "no_meat";
  if (parts.includes("dezlegare la peste")) return "fish";
  if (parts.some((p) => p.startsWith("dezlegare la ulei"))) return "oil_wine";
  if (parts.includes("post")) return "strict";
  return undefined;
}

/** The crosses of an official day, as the fasting model reads them. */
export function marksOf(day: PatriarhiaDay): DayMarks {
  return {
    cross: day.items.some((i) => i.cross !== null),
    great: day.items.some((i) => i.cross === "(†)" && i.color === "red"),
  };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * The fasting of the official days, by year and date: the level printed in
 * the title or, where the model would allow fish and the title has no note,
 * the model's level without the dispensation.
 */
export function officialFasting(days: PatriarhiaDay[], tradition: Rec): Map<number, Map<string, FastingLevel>> {
  const out = new Map<number, Map<string, FastingLevel>>();
  for (const day of days) {
    let level = fastingNote(day.title);
    if (level === undefined) {
      const jdn = gregorianToJdn({ year: day.year, month: day.month, day: day.day });
      const style = styleFor(tradition, jdn) as DateStyle;
      if (fastingOf(jdn, style, tradition.paschalion, marksOf(day)) === "fish") {
        const plain = fastingOf(jdn, style, tradition.paschalion);
        level = plain === "fish" ? "oil_wine" : plain;
      }
    }
    if (level === undefined) continue;
    let byDate = out.get(day.year);
    if (!byDate) out.set(day.year, (byDate = new Map()));
    byDate.set(`${day.year}-${pad(day.month)}-${pad(day.day)}`, level);
  }
  return out;
}

/** Order of the properties of an overrides day, as the schema lists them. */
const DAY_KEYS = ["date", "add", "remove", "readings", "fasting", "tone", "eothinon", "sunday_after_pentecost", "flags", "notes"];

function ordered(day: Rec): Rec {
  const keys = Object.keys(day).sort((a, b) => (DAY_KEYS.indexOf(a) + 1 || 99) - (DAY_KEYS.indexOf(b) + 1 || 99));
  return Object.fromEntries(keys.map((k) => [k, day[k]]));
}

/**
 * Adds the official fasting of one year to its overrides file, or starts the
 * file. A day that already has a fasting value keeps it (`kept` counts those
 * that differ from the official calendar); `added` counts the new values.
 */
export function mergeFasting(
  doc: Rec | undefined,
  tradition: string,
  year: number,
  levels: Map<string, FastingLevel>,
  source: Rec,
): { doc: Rec; added: number; kept: number } {
  const days = new Map(((doc?.days ?? []) as Rec[]).map((d) => [d.date as string, d]));
  let added = 0;
  let kept = 0;
  for (const [date, fasting] of levels) {
    const day = days.get(date);
    if (day?.fasting === undefined) {
      days.set(date, ordered({ ...day, date, fasting }));
      added++;
    } else if (day.fasting !== fasting) {
      kept++;
    }
  }
  if (added === 0 && doc) return { doc, added, kept };
  // The new values were read now: the file's citation of the same source gets the new access date.
  const cited = doc?.source?.source === undefined || doc.source.source === source.source;
  return {
    doc: {
      ...(doc ?? { tradition, year }),
      source: cited ? { ...doc?.source, ...source } : doc?.source,
      days: [...days.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
    },
    added,
    kept,
  };
}

/**
 * The overrides files of the Romanian calendar with the fasting of the
 * official calendar added, by path under data/, and the counts for the report.
 */
export function fastingOverrides(
  dataDir: string,
  days: PatriarhiaDay[],
  tradition: Rec,
  source: Rec,
): { files: Map<string, Rec>; stats: Map<string, number> } {
  const files = new Map<string, Rec>();
  let added = 0;
  let kept = 0;
  for (const [year, levels] of officialFasting(days, tradition)) {
    const rel = `traditions/${tradition.id}/overrides/${year}.json`;
    const path = join(dataDir, rel);
    const current = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Rec) : undefined;
    const merged = mergeFasting(current, tradition.id, year, levels, source);
    added += merged.added;
    kept += merged.kept;
    if (merged.added > 0) files.set(rel, merged.doc);
  }
  return {
    files,
    stats: new Map([
      ["patriarhia.fasting", added],
      ["patriarhia.fasting-kept", kept],
    ]),
  };
}
