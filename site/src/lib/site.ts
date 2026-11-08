/**
 * Data access for the site: the dataset, the traditions' calendars and the
 * generated days, loaded once per build.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { formatYmd, gregorianToJdn, jdnToGregorian } from "../../../tools/lib/calendar.ts";
import { loadDataset, type Dataset } from "../../../tools/lib/dataset.ts";
import { buildYear, loadTradition, type Day, type TraditionData } from "../../../tools/lib/days.ts";
import type { Lang } from "./ui.ts";

type Rec = Record<string, any>;

function findDataDir(): string {
  if (process.env.SYNAXARION_DATA) return resolve(process.env.SYNAXARION_DATA);
  for (const candidate of ["data", "../data"]) {
    if (existsSync(resolve(candidate, "traditions"))) return resolve(candidate);
  }
  throw new Error("Cannot find the data folder; set SYNAXARION_DATA.");
}

export const DATA_DIR = findDataDir();
export const DEFAULT_TRADITION = "romanian";

let dataset: Dataset | undefined;
export function ds(): Dataset {
  dataset ??= loadDataset(DATA_DIR);
  return dataset;
}

const traditionCache = new Map<string, TraditionData>();
export function traditionData(id: string): TraditionData {
  let data = traditionCache.get(id);
  if (!data) traditionCache.set(id, (data = loadTradition(DATA_DIR, id)));
  return data;
}

const yearCache = new Map<string, Day[]>();
export function daysOf(tradition: string, year: number): Day[] {
  const key = `${tradition}/${year}`;
  let days = yearCache.get(key);
  if (!days) yearCache.set(key, (days = buildYear(traditionData(tradition), year)));
  return days;
}

/** Today in Romania, as YYYY-MM-DD (the site is rebuilt every night). */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Years with day pages: SITE_YEARS="2026,2027", or this year and the next. */
export function siteYears(): number[] {
  const fromEnv = process.env.SITE_YEARS?.split(",").map((y) => Number(y.trim())).filter(Number.isInteger);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const year = Number(todayIso().slice(0, 4));
  return [year, year + 1];
}

/** Traditions that have commemorations in the site's years, the default one first. */
export function calendarTraditions(): string[] {
  const ids = [...ds().traditions.keys()].filter((id) => siteYears().some((y) => daysOf(id, y).some((d) => d.lines.length > 0)));
  return ids.sort((a, b) => (a === DEFAULT_TRADITION ? -1 : b === DEFAULT_TRADITION ? 1 : a.localeCompare(b)));
}

/** ISO date moved by a number of days. */
export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return formatYmd(jdnToGregorian(gregorianToJdn({ year: y ?? 1, month: m ?? 1, day: d ?? 1 }) + days));
}

export function dayOf(tradition: string, iso: string): Day | undefined {
  const year = Number(iso.slice(0, 4));
  if (!siteYears().includes(year)) return undefined;
  return daysOf(tradition, year).find((d) => d.date === iso);
}

/** Site-relative link: href("ro", "romanian", "2026") → "/base/ro/romanian/2026/". */
export function href(...segments: Array<string | number>): string {
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return segments.length === 0 ? base : `${base}${segments.join("/")}/`;
}

export function asset(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${path}`;
}

export function dayHref(lang: Lang, tradition: string, iso: string): string {
  return href(lang, tradition, iso.slice(0, 4), iso.slice(5, 7), iso.slice(8, 10));
}

export function monthHref(lang: Lang, tradition: string, year: number | string, month: number | string): string {
  return href(lang, tradition, year, String(month).padStart(2, "0"));
}

export const idOf = (ref: string): string => ref.slice(ref.indexOf(":") + 1);

export function record(collection: string, id: string): Rec | undefined {
  return ds().records.get(collection as never)?.get(id);
}

/** Ids of the records of a collection. */
export function idsOf(collection: string): string[] {
  return [...(ds().records.get(collection as never)?.keys() ?? [])];
}

/** Former ids of a collection's records (their aliases), each with the id of the record that has it now. */
export function aliasesOf(collection: string): Array<{ alias: string; id: string }> {
  return [...(ds().records.get(collection as never) ?? [])].flatMap(([id, rec]) => ((rec.aliases ?? []) as string[]).map((alias) => ({ alias, id })));
}

/** Groups that a person belongs to. */
export function groupsOf(personRef: string): string[] {
  const out: string[] = [];
  for (const [id, g] of ds().records.get("groups") ?? []) {
    if (((g.members ?? []) as Rec[]).some((m) => m.person === personRef)) out.push(`group:${id}`);
  }
  return out;
}

/** Commemorations whose subjects include a record (directly, or through a group for persons). */
export function commemorationsOf(ref: string): string[] {
  const groups = new Set(ref.startsWith("person:") ? groupsOf(ref) : []);
  const out: string[] = [];
  for (const [id, c] of ds().records.get("commemorations") ?? []) {
    const subjects = (c.subjects ?? []) as string[];
    if (subjects.includes(ref) || subjects.some((s) => groups.has(s))) out.push(`comm:${id}`);
  }
  return out;
}

/** A saint's day is shown on the page of its saint (or group) rather than on a page of its own. */
export function pageSubject(commId: string): string | undefined {
  const comm = record("commemorations", commId);
  const subjects = (comm?.subjects ?? []) as string[];
  const only = subjects.length === 1 ? subjects[0] : undefined;
  return comm?.kind === "repose" && only && /^(?:person|group):/.test(only) ? only : undefined;
}

/** Commemorations with a page of their own. */
export function feastIds(): string[] {
  return idsOf("commemorations").filter((id) => pageSubject(id) === undefined);
}

/** First day, from a date on, when a tradition keeps a commemoration (within the site's years). */
export function nextDateOf(tradition: string, commRef: string, from: string = todayIso()): string | undefined {
  for (const year of siteYears()) {
    if (year < Number(from.slice(0, 4))) continue;
    const day = daysOf(tradition, year).find((d) => d.date >= from && d.lines.some((l) => l.commemorations.includes(commRef)));
    if (day) return day.date;
  }
  return undefined;
}

/** Hymns sung for some commemorations or written by some persons. */
export function hymnsOf(refs: string[]): Array<[string, Rec]> {
  return [...(ds().records.get("hymns") ?? [])].filter(([, h]) => refs.includes(h.for) || refs.includes(h.author));
}

export interface Placement {
  tradition: string;
  /** Menaion dates (MM-DD) where the tradition lists the commemoration. */
  dates: string[];
  /** Rule of a movable entry. */
  rule?: Rec;
}

/** Where each tradition places a commemoration in its calendar. */
export function placementsOf(commRef: string): Placement[] {
  const out: Placement[] = [];
  for (const id of ds().traditions.keys()) {
    const data = traditionData(id);
    const dates = [...data.menaion.entries()]
      .filter(([, entries]) => entries.some((e) => (e.commemorations as string[]).includes(commRef)))
      .map(([date]) => date)
      .sort();
    const movable = ((data.movable.entries ?? []) as Rec[]).find((e) => (e.commemorations as string[]).includes(commRef));
    if (dates.length > 0) out.push({ tradition: id, dates });
    if (movable) out.push({ tradition: id, dates: [], rule: movable.rule ?? record("commemorations", idOf(commRef))?.date_rule });
  }
  return out.sort((a, b) => (a.tradition === DEFAULT_TRADITION ? -1 : b.tradition === DEFAULT_TRADITION ? 1 : a.tradition.localeCompare(b.tradition)));
}
