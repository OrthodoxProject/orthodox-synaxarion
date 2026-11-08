/**
 * Calendar arithmetic: Julian Day Numbers, the Julian, Gregorian, Coptic and
 * Ethiopian calendars, the Paschalion, tones, Resurrection Gospels and a
 * simple fasting model. All civil dates are Gregorian.
 */

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

const COPTIC_EPOCH = 1825030; // JDN of 1 Thout, year 1 of the Martyrs
const ETHIOPIAN_EPOCH = 1724221; // JDN of 1 Meskerem, year 1 (Amete Mihret)

export function gregorianToJdn({ year, month, day }: Ymd): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function jdnToGregorian(jdn: number): Ymd {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function julianToJdn({ year, month, day }: Ymd): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

export function jdnToJulian(jdn: number): Ymd {
  const c = jdn + 32082;
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: d - 4800 + Math.floor(m / 10),
  };
}

function alexandrianToJdn(epoch: number, { year, month, day }: Ymd): number {
  return epoch + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

function jdnToAlexandrian(epoch: number, jdn: number): Ymd {
  const year = Math.floor((4 * (jdn - epoch) + 1463) / 1461);
  const start = alexandrianToJdn(epoch, { year, month: 1, day: 1 });
  const month = Math.floor((jdn - start) / 30) + 1;
  return { year, month, day: jdn - start - 30 * (month - 1) + 1 };
}

export const copticToJdn = (d: Ymd): number => alexandrianToJdn(COPTIC_EPOCH, d);
export const jdnToCoptic = (jdn: number): Ymd => jdnToAlexandrian(COPTIC_EPOCH, jdn);
export const ethiopianToJdn = (d: Ymd): number => alexandrianToJdn(ETHIOPIAN_EPOCH, d);
export const jdnToEthiopian = (jdn: number): Ymd => jdnToAlexandrian(ETHIOPIAN_EPOCH, jdn);

/** 0 = Monday … 6 = Sunday. */
export function weekday(jdn: number): number {
  return ((jdn % 7) + 7) % 7;
}

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

/** Pascha (Gregorian civil date as JDN) for a Paschalion. */
export function paschaJdn(year: number, paschalion: "julian" | "gregorian"): number {
  if (paschalion === "julian") {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    return julianToJdn({ year, month, day });
  }
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return gregorianToJdn({ year, month, day });
}

export type DateStyle = "julian" | "revised_julian" | "gregorian";

/**
 * Civil JDN of a church (Menaion) date in the given civil-year context. The
 * Revised Julian calendar is computed as Gregorian, which is exact from 1600
 * to 2799.
 */
export function churchDateToJdn(year: number, month: number, day: number, style: DateStyle): number {
  return style === "julian" ? julianToJdn({ year, month, day }) : gregorianToJdn({ year, month, day });
}

/** Church (Menaion) date of a civil day. */
export function jdnToChurchDate(jdn: number, style: DateStyle): Ymd {
  return style === "julian" ? jdnToJulian(jdn) : jdnToGregorian(jdn);
}

export function isLeapChurchYear(year: number, style: DateStyle): boolean {
  if (style === "julian") return year % 4 === 0;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Tone (glas) of the week containing the day: Thomas Sunday starts tone 1;
 * before Palm Sunday the previous year's cycle continues. Holy Week and
 * Bright Week (Palm Sunday to Bright Saturday) have no tone of the week.
 */
export function toneOf(jdn: number, paschalion: "julian" | "gregorian"): number | null {
  const sunday = jdn - ((weekday(jdn) + 1) % 7); // the Sunday that opens this week
  const year = jdnToGregorian(sunday).year;
  const pascha = paschaJdn(year, paschalion);
  if (sunday >= pascha - 7 && sunday < pascha + 7) return null;
  const thomas = sunday >= pascha + 7 ? pascha + 7 : paschaJdn(year - 1, paschalion) + 7;
  return (Math.floor((sunday - thomas) / 7) % 8) + 1;
}

/** Resurrection Gospel (eothinon) of a Sunday Matins, or null when it does not apply. */
export function eothinonOf(jdn: number, paschalion: "julian" | "gregorian"): number | null {
  if (weekday(jdn) !== 6) return null;
  const year = jdnToGregorian(jdn).year;
  const pascha = paschaJdn(year, paschalion);
  const pentecostarion: Record<number, number> = { 7: 1, 14: 3, 21: 4, 28: 7, 35: 8, 42: 10 };
  const offset = jdn - pascha;
  if (offset === -7) return null; // Palm Sunday has a festal Gospel at Matins
  if (offset in pentecostarion) return pentecostarion[offset] ?? null;
  let allSaints = pascha + 56;
  if (jdn < allSaints) {
    if (offset >= 0) return null;
    allSaints = paschaJdn(year - 1, paschalion) + 56;
  }
  return (Math.floor((jdn - allSaints) / 7) % 11) + 1;
}

export type FastingLevel = "fast_free" | "no_fast" | "no_meat" | "fish" | "oil_wine" | "strict";

/** What the calendar lines of a day show, for the feast-day dispensations of the fasting model. */
export interface DayMarks {
  /** A commemoration of the day is printed with a cross. */
  cross?: boolean;
  /** A great feast of the day is printed with the red cross in parentheses, (†). */
  great?: boolean;
}

/**
 * Fasting model "romanian": the rules of the Romanian Orthodox calendar, as
 * printed in the official calendars of 2025 and 2026 (fasting periods,
 * Wednesdays and Fridays, fast-free weeks, fish on weekends and feasts).
 * Feast-day dispensations follow the crosses of the day, which only
 * approximates the official calendar: the yearly overrides give the exact
 * days. Used only by traditions that declare `fasting_model: "romanian"`.
 */
export function fastingOf(jdn: number, style: DateStyle, paschalion: "julian" | "gregorian", marks: DayMarks = {}): FastingLevel {
  const civilYear = jdnToGregorian(jdn).year;
  const pascha = paschaJdn(civilYear, paschalion);
  const o = jdn - pascha;
  const wd = weekday(jdn);
  const church = jdnToChurchDate(jdn, style);
  const md = church.month * 100 + church.day;
  const weekend = wd === 5 || wd === 6;
  const wedFri = wd === 2 || wd === 4;
  // Feast-day fish in the Nativity and Apostles' fasts: a cross on Monday, Tuesday or Thursday, a great feast on Wednesday or Friday.
  const feast = wedFri ? marks.great === true : marks.cross === true;

  // Fast-free weeks
  if (o >= 0 && o <= 6) return "fast_free";
  if (o >= 49 && o <= 55) return "fast_free";
  if (o >= -70 && o <= -64) return "fast_free";
  if (md >= 1225 || md <= 104) return md === 105 ? "strict" : "fast_free";
  // Cheesefare week
  if (o >= -55 && o <= -49) return "no_meat";
  // Great Lent and Holy Week
  if (o >= -48 && o <= -1) {
    if (o === -7 || md === 325) return "fish";
    if (o === -2) return "strict";
    return weekend ? "oil_wine" : "strict";
  }
  // From Thomas Sunday to Pentecost, fish on Wednesdays and Fridays
  if (o >= 7 && o <= 48) return wedFri ? "fish" : "no_fast";
  // Fixed strict days
  if (md === 829 || md === 914 || md === 105) return "strict";
  // Nativity fast (15 Nov – 24 Dec): fish on weekends and feasts only from the Entry of the Theotokos to 19 December
  if (md >= 1115 && md <= 1224) {
    if (md === 1121 || md === 1206) return "fish";
    if (md >= 1220) return weekend ? "oil_wine" : "strict";
    if (md >= 1121 && (weekend || feast)) return "fish";
    if (weekend) return "oil_wine";
    return wd === 1 || wd === 3 ? "oil_wine" : "strict";
  }
  // Dormition fast (1–14 Aug)
  if (md >= 801 && md <= 814) {
    if (md === 806) return "fish";
    return weekend ? "oil_wine" : "strict";
  }
  // Apostles' fast (Monday after All Saints – 28 June): fish on weekends and feasts
  const allSaints = pascha + 56;
  if (jdn > allSaints && jdn < churchDateToJdn(civilYear, 6, 29, style)) {
    return weekend || feast ? "fish" : "oil_wine";
  }
  // Wednesdays and Fridays
  if (wedFri) return "strict";
  return "no_fast";
}

export function formatYmd({ year, month, day }: Ymd): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
