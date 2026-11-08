/**
 * Builds the days of a civil year for one tradition: which calendar lines
 * fall on each day (fixed, movable, transferred), plus tone, Resurrection
 * Gospel, fasting, readings, observances and the official facts from the
 * yearly overrides.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  WEEKDAYS,
  churchDateToJdn,
  copticToJdn,
  eothinonOf,
  ethiopianToJdn,
  fastingOf,
  formatYmd,
  gregorianToJdn,
  isLeapChurchYear,
  jdnToChurchDate,
  jdnToCoptic,
  jdnToEthiopian,
  jdnToGregorian,
  jdnToJulian,
  paschaJdn,
  toneOf,
  weekday,
  type DateStyle,
  type Ymd,
} from "./calendar.ts";

type Rec = Record<string, any>;
type Style = DateStyle | "coptic" | "ethiopian";

export interface DayLine {
  commemorations: string[];
  symbol?: string;
  rank?: string;
  /** Civil date the line was moved from by a transfer rule. */
  transferred_from?: string;
}

export interface OngoingPeriod {
  commemoration: string;
  day: number;
  of: number;
}

export interface Day {
  date: string;
  weekday: string;
  tradition: string;
  church_calendar: Style;
  church_date: string;
  julian_date: string;
  pascha_offset: number;
  lines: DayLine[];
  ongoing?: OngoingPeriod[];
  tone?: number;
  eothinon?: number;
  fasting?: string;
  readings?: Rec[];
  sunday_after_pentecost?: number;
  flags?: Rec;
  observances?: string[];
  notes?: string[];
  /** True when facts from the official calendar (overrides) were applied. */
  official?: true;
}

export interface TraditionData {
  tradition: Rec;
  menaion: Map<string, Rec[]>; // "MM-DD" → lines
  movable: Rec;
  observances: Rec[];
  overrides: Map<number, Rec>;
  commemorations: Map<string, Rec>;
}

export interface Mismatch {
  date: string;
  field: "tone" | "eothinon" | "fasting";
  computed: unknown;
  official: unknown;
}

/** Days before Pascha (negative) or after it, for each period used by transfer rules. */
export const PERIODS: Record<string, [number, number]> = {
  cheesefare_week: [-55, -49],
  great_lent: [-48, -9],
  holy_week: [-6, -1],
  pascha: [0, 0],
  bright_week: [1, 6],
  triodion: [-70, -1],
  pentecostarion: [0, 56],
};

const MAJOR_RANKS = new Set(["feast_of_feasts", "great_feast"]);
/** Days computed around the civil year, so that transfers across New Year are seen. */
const MARGIN = 40;

function readJson(path: string): Rec {
  return JSON.parse(readFileSync(path, "utf8")) as Rec;
}

const pad = (n: number): string => String(n).padStart(2, "0");
const isoOf = (jdn: number): string => formatYmd(jdnToGregorian(jdn));

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function loadTradition(dataDir: string, id: string): TraditionData {
  const dir = join(dataDir, "traditions", id);
  const menaion = new Map<string, Rec[]>();
  const menaionDir = join(dir, "menaion");
  if (existsSync(menaionDir)) {
    for (const mm of readdirSync(menaionDir)) {
      for (const file of readdirSync(join(menaionDir, mm))) {
        const doc = readJson(join(menaionDir, mm, file));
        menaion.set(doc.date, doc.entries);
      }
    }
  }
  const overrides = new Map<number, Rec>();
  const overridesDir = join(dir, "overrides");
  if (existsSync(overridesDir)) {
    for (const file of readdirSync(overridesDir)) {
      const doc = readJson(join(overridesDir, file));
      overrides.set(doc.year, doc);
    }
  }
  const commemorations = new Map<string, Rec>();
  const commDir = join(dataDir, "commemorations");
  for (const file of readdirSync(commDir)) {
    const doc = readJson(join(commDir, file));
    commemorations.set(`comm:${doc.id}`, doc);
  }
  return {
    tradition: readJson(join(dir, "tradition.json")),
    menaion,
    movable: existsSync(join(dir, "movable.json")) ? readJson(join(dir, "movable.json")) : { entries: [] },
    observances: existsSync(join(dir, "observances.json")) ? readJson(join(dir, "observances.json")).observances : [],
    overrides,
    commemorations,
  };
}

/** Calendar style used for church dates on a civil day (reform history included). */
export function styleFor(tradition: Rec, jdn: number): Style {
  const date = isoOf(jdn);
  for (const h of (tradition.calendar_history ?? []) as Rec[]) {
    if (date <= h.until) return h.style;
  }
  return tradition.calendar_style;
}

function isAlexandrian(style: string): style is "coptic" | "ethiopian" {
  return style === "coptic" || style === "ethiopian";
}

function alexandrian(style: "coptic" | "ethiopian"): { toJdn: (d: Ymd) => number; fromJdn: (j: number) => Ymd } {
  return style === "coptic" ? { toJdn: copticToJdn, fromJdn: jdnToCoptic } : { toJdn: ethiopianToJdn, fromJdn: jdnToEthiopian };
}

/** Church date of a civil day in a given style. */
function churchDateOf(jdn: number, style: Style): Ymd {
  return isAlexandrian(style) ? alexandrian(style).fromJdn(jdn) : jdnToChurchDate(jdn, style);
}

/** Civil day of a church date in a civil year; 29 February goes to non_leap (default 28 February) in common years. */
function fixedDay(tradition: Rec, year: number, month: number, day: number, nonLeap?: Rec): number | null {
  const style = styleFor(tradition, gregorianToJdn({ year, month: 6, day: 1 }));
  if (isAlexandrian(style)) return null;
  if (month === 2 && day === 29 && !isLeapChurchYear(year, style)) {
    return churchDateToJdn(year, nonLeap?.month ?? 2, nonLeap?.day ?? 28, style);
  }
  return churchDateToJdn(year, month, day, style);
}

/** The n-th given weekday before (dir −1) or after (dir 1) a day. */
function nthWeekday(anchor: number, name: string, dir: 1 | -1, nth: number, inclusive: boolean): number {
  const target = WEEKDAYS.indexOf(name as (typeof WEEKDAYS)[number]);
  let found = 0;
  for (let j = inclusive ? anchor : anchor + dir; ; j += dir) {
    if (weekday(j) === target && ++found === nth) return j;
  }
}

function anchorDay(anchor: unknown, year: number, tradition: Rec, data?: TraditionData): number | null {
  if (typeof anchor === "string") {
    const [m, d] = anchor.split("-").map(Number);
    return fixedDay(tradition, year, m ?? 1, d ?? 1);
  }
  const a = anchor as Rec;
  if (typeof a.pascha === "number") return paschaJdn(year, tradition.paschalion) + a.pascha;
  if (a.commemoration && data) {
    const comm = data.commemorations.get(a.commemoration);
    if (!comm) return null;
    const start = gregorianToJdn({ year, month: 1, day: 1 });
    return ruleDays(comm.date_rule, start, start + 365, tradition, data)[0] ?? null;
  }
  return null;
}

/** All civil days in [start, end] on which a date rule falls. */
export function ruleDays(rule: Rec, start: number, end: number, tradition: Rec, data?: TraditionData): number[] {
  const out = new Set<number>();
  const add = (j: number | null): void => {
    if (j !== null && j >= start && j <= end) out.add(j);
  };

  // Rules expressed in the Coptic or Ethiopian calendar.
  const fixedStyle = rule.type === "fixed" ? (rule.calendar ?? styleFor(tradition, start)) : undefined;
  if (rule.type === "monthly" || (fixedStyle && isAlexandrian(fixedStyle))) {
    const style = (rule.calendar ?? fixedStyle) as "coptic" | "ethiopian";
    const cal = alexandrian(style);
    const months = rule.type === "monthly" ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] : [rule.month as number];
    for (let y = cal.fromJdn(start).year; y <= cal.fromJdn(end).year; y++) {
      for (const month of months) {
        const length = month <= 12 ? 30 : y % 4 === 3 ? 6 : 5;
        if (rule.day <= length) add(cal.toJdn({ year: y, month, day: rule.day }));
      }
    }
    return [...out].sort((a, b) => a - b);
  }

  for (let year = jdnToGregorian(start).year - 1; year <= jdnToGregorian(end).year + 1; year++) {
    switch (rule.type) {
      case "fixed":
        add(fixedDay(tradition, year, rule.month, rule.day, rule.non_leap));
        break;
      case "pascha":
        add(paschaJdn(year, tradition.paschalion) + rule.offset);
        break;
      case "pentecost_sunday":
        add(paschaJdn(year, tradition.paschalion) + 49 + 7 * rule.n);
        break;
      case "weekday_before":
      case "weekday_after": {
        const a = anchorDay(rule.anchor, year, tradition, data);
        if (a !== null) add(nthWeekday(a, rule.weekday, rule.type === "weekday_before" ? -1 : 1, rule.nth ?? 1, rule.inclusive ?? false));
        break;
      }
      case "weekday_in_range": {
        const from = anchorDay(rule.from, year, tradition, data);
        let to = anchorDay(rule.to, year, tradition, data);
        if (from === null || to === null) break;
        if (to < from) to = anchorDay(rule.to, year + 1, tradition, data) ?? from;
        for (let j = from; j <= to; j++) if (WEEKDAYS[weekday(j)] === rule.weekday) add(j);
        break;
      }
      default:
        break; // "unspecified": the rule is not known yet
    }
  }
  return [...out].sort((a, b) => a - b);
}

interface Placement {
  jdn: number;
  line: DayLine;
  readings: Rec[];
  order: number;
  fixed: boolean;
  movedFrom?: number;
}

/** Where a transfer rule sends a fixed line: a new day, "omit", or null to leave it. */
function transferOutcome(transfer: Rec, original: number, tradition: Rec, placements: Placement[]): number | "omit" | null {
  const pascha = paschaJdn(jdnToGregorian(original).year, tradition.paschalion);
  const o = original - pascha;
  const when = transfer.when as Rec;
  if (when.periods && !(when.periods as string[]).some((p) => PERIODS[p] !== undefined && o >= PERIODS[p][0] && o <= PERIODS[p][1])) return null;
  if (when.before_pascha !== undefined && (o >= -70 && o < 0) !== when.before_pascha) return null;
  if (when.weekdays && !(when.weekdays as string[]).includes(WEEKDAYS[weekday(original)] ?? "")) return null;
  if (when.coincides_with) {
    const others = when.coincides_with as string[];
    if (!placements.some((p) => p.jdn === original && p.line.commemorations.some((c) => others.includes(c)))) return null;
  }
  const to = transfer.to as Rec;
  if (typeof to.pascha === "number") return pascha + to.pascha;
  if (typeof to.shift_days === "number") return original + to.shift_days;
  if (typeof to.next_weekday === "string") return nthWeekday(original, to.next_weekday, 1, 1, false);
  if (to.omitted) return "omit";
  return null; // "combined": celebrated together, on its own day
}

/** Whether an observance applies in a civil year (its since/until years, when given). */
function inEffect(observance: Rec, year: number): boolean {
  const yearOf = (edtf: unknown): number | null => {
    const m = typeof edtf === "string" ? /^(-?\d{4})/.exec(edtf) : null;
    return m?.[1] ? Number(m[1]) : null;
  };
  const since = yearOf(observance.since);
  const until = yearOf(observance.until);
  return (since === null || year >= since) && (until === null || year <= until);
}

export function buildYear(data: TraditionData, year: number, applyOverrides = true): Day[] {
  const t = data.tradition;
  const start = gregorianToJdn({ year, month: 1, day: 1 });
  const end = gregorianToJdn({ year, month: 12, day: 31 });
  const comm = (ref: string | undefined): Rec | undefined => (ref ? data.commemorations.get(ref) : undefined);
  const placements: Placement[] = [];
  const place = (jdn: number, entry: Rec, fixed: boolean): void => {
    const commemorations = entry.commemorations as string[];
    const rank = entry.rank ?? comm(commemorations[0])?.default_rank;
    const readings = (entry.readings ?? commemorations.flatMap((c) => comm(c)?.readings ?? [])) as Rec[];
    placements.push({
      jdn,
      line: { commemorations, ...(entry.symbol ? { symbol: entry.symbol } : {}), ...(rank ? { rank } : {}) },
      readings: readings.map((r) => ({ ...r, of: r.of ?? "commemoration" })),
      order: placements.length,
      fixed,
    });
  };

  // Fixed lines (Menaion). In common years, 29 February lines go to their non_leap day.
  const leapEntries = (data.menaion.get("02-29") ?? []).map((entry) => {
    const nonLeap = comm((entry.commemorations as string[])[0])?.date_rule?.non_leap as Rec | undefined;
    return { entry, key: `${pad(nonLeap?.month ?? 2)}-${pad(nonLeap?.day ?? 28)}` };
  });
  for (let j = start - MARGIN; j <= end + MARGIN; j++) {
    const style = styleFor(t, j);
    const c = churchDateOf(j, style);
    const key = `${pad(c.month)}-${pad(c.day)}`;
    // The lines of 29 February come first, as the official calendar prints them on 28 February.
    if (!isAlexandrian(style) && !isLeapChurchYear(c.year, style)) {
      for (const leap of leapEntries) if (leap.key === key) place(j, leap.entry, true);
    }
    for (const entry of data.menaion.get(key) ?? []) place(j, entry, true);
  }

  // Movable lines.
  for (const entry of (data.movable.entries ?? []) as Rec[]) {
    const rule = entry.rule ?? comm((entry.commemorations as string[])[0])?.date_rule;
    if (!rule) continue;
    for (const j of ruleDays(rule, start - MARGIN, end + MARGIN, t, data)) place(j, entry, false);
  }

  // Transfers of fixed lines.
  const transfers = (data.movable.transfers ?? []) as Rec[];
  const kept: Placement[] = [];
  for (const p of placements) {
    const transfer = p.fixed ? transfers.find((tr) => p.line.commemorations.includes(tr.commemoration)) : undefined;
    const outcome = transfer ? transferOutcome(transfer, p.jdn, t, placements) : null;
    if (outcome === "omit") continue;
    kept.push(typeof outcome === "number" ? { ...p, jdn: outcome, movedFrom: p.jdn } : p);
  }

  const byDay = new Map<number, Placement[]>();
  const ongoing = new Map<number, OngoingPeriod[]>();
  for (const p of kept) {
    if (p.jdn >= start && p.jdn <= end) push(byDay, p.jdn, p);
    const first = p.line.commemorations[0];
    const length = Number(comm(first)?.duration_days ?? 1);
    for (let k = 1; first && k < length; k++) {
      if (p.jdn + k >= start && p.jdn + k <= end) push(ongoing, p.jdn + k, { commemoration: first, day: k + 1, of: length });
    }
  }

  const observances = new Map<number, string[]>();
  const holidays = new Set<number>();
  for (const o of data.observances) {
    if (!inEffect(o, year)) continue;
    for (const j of ruleDays(o.rule, start, end, t, data)) {
      push(observances, j, o.id as string);
      if (o.public_holiday) holidays.add(j);
    }
  }

  const overrides = new Map<string, Rec>(
    applyOverrides ? ((data.overrides.get(year)?.days ?? []) as Rec[]).map((d) => [d.date as string, d]) : [],
  );
  const pascha = paschaJdn(year, t.paschalion);
  const major = (p: Placement): number => (p.line.rank && MAJOR_RANKS.has(p.line.rank) ? 0 : 1);

  const days: Day[] = [];
  for (let j = start; j <= end; j++) {
    const style = styleFor(t, j);
    const church = churchDateOf(j, style);
    const placed = (byDay.get(j) ?? []).sort((a, b) => major(a) - major(b) || a.order - b.order);
    const day: Day = {
      date: isoOf(j),
      weekday: WEEKDAYS[weekday(j)] ?? "",
      tradition: t.id,
      church_calendar: style,
      church_date: `${pad(church.month)}-${pad(church.day)}`,
      julian_date: formatYmd(jdnToJulian(j)),
      pascha_offset: j - pascha,
      lines: placed.map((p) => (p.movedFrom === undefined ? p.line : { ...p.line, transferred_from: isoOf(p.movedFrom) })),
    };
    const periods = ongoing.get(j);
    if (periods) day.ongoing = periods;
    if (t.family === "eastern_orthodox") {
      const tone = toneOf(j, t.paschalion);
      if (tone) day.tone = tone;
      const eothinon = eothinonOf(j, t.paschalion);
      if (eothinon) day.eothinon = eothinon;
    }
    if (t.fasting_model === "romanian" && !isAlexandrian(style)) day.fasting = fastingOf(j, style, t.paschalion);
    const readings = placed.flatMap((p) => p.readings);
    if (readings.length > 0) day.readings = readings;
    const obs = observances.get(j);
    if (obs) day.observances = obs;
    if (holidays.has(j)) day.flags = { public_holiday: true };

    const over = overrides.get(day.date);
    if (over) {
      const removed = new Set((over.remove ?? []) as string[]);
      day.lines = day.lines
        .map((l) => ({ ...l, commemorations: l.commemorations.filter((c) => !removed.has(c)) }))
        .filter((l) => l.commemorations.length > 0);
      for (const l of (over.add ?? []) as Rec[]) {
        day.lines.push({ commemorations: l.commemorations, ...(l.symbol ? { symbol: l.symbol } : {}), ...(l.rank ? { rank: l.rank } : {}) });
      }
      for (const key of ["tone", "eothinon", "fasting", "readings", "sunday_after_pentecost", "notes"] as const) {
        if (over[key] !== undefined) (day as unknown as Rec)[key] = over[key];
      }
      if (over.flags) day.flags = { ...day.flags, ...over.flags };
      day.official = true;
    }
    days.push(day);
  }
  return days;
}

/** Days where the computed tone, eothinon or fasting differs from the official calendar of that year. */
export function compareWithOverrides(data: TraditionData, year: number): Mismatch[] {
  const official = (data.overrides.get(year)?.days ?? []) as Rec[];
  if (official.length === 0) return [];
  const computed = new Map(buildYear(data, year, false).map((d) => [d.date, d]));
  const out: Mismatch[] = [];
  for (const o of official) {
    const day = computed.get(o.date);
    for (const field of ["tone", "eothinon", "fasting"] as const) {
      if (o[field] === undefined || !day) continue;
      if (field === "fasting" && data.tradition.fasting_model === undefined) continue;
      if (day[field] !== o[field]) out.push({ date: o.date, field, computed: day[field] ?? null, official: o[field] });
    }
  }
  return out;
}

/** Commemorations in the tradition's calendar whose date rule is not known yet. */
export function unresolved(data: TraditionData): string[] {
  const out = new Set<string>();
  for (const entry of (data.movable.entries ?? []) as Rec[]) {
    const rule = entry.rule ?? data.commemorations.get((entry.commemorations as string[])[0] ?? "")?.date_rule;
    if (!rule || rule.type === "unspecified") for (const c of entry.commemorations as string[]) out.add(c);
  }
  return [...out].sort();
}
