/**
 * A civil day in other calendar systems, for the website's "date in other
 * calendars". Every conversion takes the Julian Day Number of the day (see
 * calendar.ts) and returns numbers; names and layout belong to the site. The
 * calendars and their methods are described in docs/calendars/.
 *
 * Most calendars are arithmetic and are computed here. The Islamic calendar
 * (Umm al-Qura) comes from the ICU library of Node.js, through Intl. The
 * Chinese calendar comes from the months published by the Hong Kong
 * Observatory: ICU computes it with an approximation that misses new moons
 * close to midnight (it puts the Chinese New Year of 2027 on 7 February
 * instead of the 6th).
 */
import { gregorianToJdn, jdnToGregorian, jdnToJulian, type Ymd } from "./calendar.ts";

/** The calendars of the website, in their groups and order; each one is described in docs/calendars/<lang>/<id>.md. */
export const CALENDAR_GROUPS = [
  { id: "christian", calendars: ["gregorian", "julian", "byzantine", "coptic", "ethiopian", "armenian", "syriac"] },
  { id: "religions", calendars: ["hebrew", "islamic", "bahai", "buddhist", "nanakshahi"] },
  { id: "other", calendars: ["persian", "indian", "chinese", "japanese", "roman", "julian-day"] },
] as const;

export type CalendarGroup = (typeof CALENDAR_GROUPS)[number]["id"];
export type CalendarId = (typeof CALENDAR_GROUPS)[number]["calendars"][number];
export const CALENDAR_IDS: CalendarId[] = CALENDAR_GROUPS.flatMap((g) => [...g.calendars]);

/** Remainder with the sign of the divisor, as calendar formulas expect. */
const mod = (a: number, n: number): number => ((a % n) + n) % n;

// ---------------------------------------------------------------------------
// Numerals of old dates

export function romanNumeral(n: number): string {
  const values: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = n;
  let out = "";
  for (const [value, letters] of values) {
    while (rest >= value) {
      out += letters;
      rest -= value;
    }
  }
  return out;
}

/** Greek alphabetic numeral, as in Byzantine dates: 7535 → ͵ζφλεʹ (1–9999). */
export function greekNumeral(n: number): string {
  const units = ["", "α", "β", "γ", "δ", "ε", "ϛ", "ζ", "η", "θ"];
  const tens = ["", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ϟ"];
  const hundreds = ["", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϡ"];
  const thousands = Math.floor(n / 1000) % 10;
  return `${thousands > 0 ? `͵${units[thousands]}` : ""}${hundreds[Math.floor(n / 100) % 10]}${tens[Math.floor(n / 10) % 10]}${units[n % 10]}ʹ`;
}

/** Armenian alphabetic numeral: 1476 → ՌՆՀԶ (1–9999). */
export function armenianNumeral(n: number): string {
  const letters = ["ԱԲԳԴԵԶԷԸԹ", "ԺԻԼԽԾԿՀՁՂ", "ՃՄՅՆՇՈՉՊՋ", "ՌՍՎՏՐՑՒՓՔ"];
  return [3, 2, 1, 0]
    .map((place) => {
      const digit = Math.floor(n / 10 ** place) % 10;
      return digit > 0 ? (letters[place]?.[digit - 1] ?? "") : "";
    })
    .join("");
}

const isGregorianLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const gregorian = (year: number, month: number, day: number): number => gregorianToJdn({ year, month, day });

// ---------------------------------------------------------------------------
// Calendars built on the Julian calendar

/** Byzantine era of the world (from 5509 BC): Julian months, a year that begins on 1 September, and the indiction (a cycle of 15 years). */
export function jdnToByzantine(jdn: number): Ymd & { indiction: number } {
  const { year, month, day } = jdnToJulian(jdn);
  const am = year + (month >= 9 ? 5509 : 5508);
  return { year: am, month, day, indiction: mod(am - 1, 15) + 1 };
}

/** Seleucid era as the Syriac churches reckon it: Julian months, a year that begins on 1 October, counted from 312 BC. */
export function jdnToSeleucid(jdn: number): Ymd {
  const { year, month, day } = jdnToJulian(jdn);
  return { year: year + (month >= 10 ? 312 : 311), month, day };
}

/** Years from the founding of Rome (753 BC, after Varro) on the Julian calendar, the calendar of Rome since 45 BC. */
export function jdnToRoman(jdn: number): Ymd {
  const { year, month, day } = jdnToJulian(jdn);
  return { year: year + 753, month, day };
}

export interface RomanDay {
  /** Days counted inclusively up to the Kalends, Nones or Ides: 1 on the day itself, 2 the day before (pridie). */
  count: number;
  mark: "kalends" | "nones" | "ides";
  /** Month of the Kalends, Nones or Ides (1–12). */
  month: number;
  /** The leap day of the Julian calendar, 24 February: the sixth day before the Kalends of March, counted twice. */
  bis?: true;
}

/** Roman form of a Julian date: the days before the Kalends (1st), Nones (5th or 7th) or Ides (13th or 15th). */
export function romanDay({ year, month, day }: Ymd): RomanDay {
  const nones = month === 3 || month === 5 || month === 7 || month === 10 ? 7 : 5;
  const ides = nones + 8;
  if (day === 1) return { count: 1, mark: "kalends", month };
  if (day <= nones) return { count: nones - day + 1, mark: "nones", month };
  if (day <= ides) return { count: ides - day + 1, mark: "ides", month };
  if (month === 2) {
    // A leap year adds a day by counting 24 February twice; the days before it keep the names of a common year.
    if (mod(year, 4) === 0 && day === 24) return { count: 6, mark: "kalends", month: 3, bis: true };
    if (mod(year, 4) === 0 && day > 24) return { count: 31 - day, mark: "kalends", month: 3 };
    return { count: 30 - day, mark: "kalends", month: 3 };
  }
  const length = month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
  return { count: length - day + 2, mark: "kalends", month: month === 12 ? 1 : month + 1 };
}

// ---------------------------------------------------------------------------
// Armenian calendar

/** 1 Navasard of the year 1 of the Armenian era: 11 July 552 (Julian). */
export const ARMENIAN_EPOCH = 1922868;

/** Armenian era: 12 months of 30 days and 5 added days (month 13), 365 days every year, so the year drifts through the seasons. */
export function jdnToArmenian(jdn: number): Ymd {
  const days = jdn - ARMENIAN_EPOCH;
  const year = Math.floor(days / 365) + 1;
  const dayOfYear = days - 365 * (year - 1);
  return { year, month: Math.floor(dayOfYear / 30) + 1, day: (dayOfYear % 30) + 1 };
}

// ---------------------------------------------------------------------------
// Hebrew calendar (the fixed calendar of Hillel II, after Reingold and Dershowitz, Calendrical Calculations)

/** 1 Tishri of the year 1 from the creation of the world: 7 October 3761 BC (Julian). */
export const HEBREW_EPOCH = 347998;

export type HebrewMonth = "tishri" | "heshvan" | "kislev" | "tevet" | "shevat" | "adar" | "adar1" | "adar2" | "nisan" | "iyar" | "sivan" | "tammuz" | "av" | "elul";

/** Leap years have a second month of Adar: 7 in every 19 years. */
export const isHebrewLeap = (year: number): boolean => mod(7 * year + 1, 19) < 7;

/** Days from the epoch to the molad of Tishri of a year, moved to the next day when that day would be Sunday, Wednesday or Friday. */
function hebrewElapsedDays(year: number): number {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  const days = 29 * months + Math.floor(parts / 25920);
  return mod(3 * (days + 1), 7) < 3 ? days + 1 : days;
}

/** The other two postponements, which keep every year to 353–355 or 383–385 days. */
function hebrewYearDelay(year: number): number {
  const last = hebrewElapsedDays(year - 1);
  const present = hebrewElapsedDays(year);
  const next = hebrewElapsedDays(year + 1);
  if (next - present === 356) return 2;
  if (present - last === 382) return 1;
  return 0;
}

/** Day of Rosh Hashanah, 1 Tishri. */
export function hebrewNewYear(year: number): number {
  return HEBREW_EPOCH + hebrewElapsedDays(year) + hebrewYearDelay(year);
}

export function jdnToHebrew(jdn: number): { year: number; month: HebrewMonth; day: number } {
  let year = Math.floor((jdn - HEBREW_EPOCH) / 365.2468) + 1;
  while (hebrewNewYear(year) > jdn) year--;
  while (hebrewNewYear(year + 1) <= jdn) year++;
  const length = hebrewNewYear(year + 1) - hebrewNewYear(year);
  const months: Array<[HebrewMonth, number]> = [
    ["tishri", 30],
    // Years of 355 or 385 days have a long Heshvan, years of 353 or 383 days a short Kislev.
    ["heshvan", length % 10 === 5 ? 30 : 29],
    ["kislev", length % 10 === 3 ? 29 : 30],
    ["tevet", 29],
    ["shevat", 30],
    ...(isHebrewLeap(year) ? ([["adar1", 30], ["adar2", 29]] as Array<[HebrewMonth, number]>) : ([["adar", 29]] as Array<[HebrewMonth, number]>)),
    ["nisan", 30],
    ["iyar", 29],
    ["sivan", 30],
    ["tammuz", 29],
    ["av", 30],
    ["elul", 29],
  ];
  let day = jdn - hebrewNewYear(year);
  for (const [month, days] of months) {
    if (day < days) return { year, month, day: day + 1 };
    day -= days;
  }
  throw new Error(`Hebrew date out of range: ${jdn}`);
}

// ---------------------------------------------------------------------------
// Solar calendars with fixed months

/** Day before 1 Farvardin of the year 1 of the Solar Hijri era, as in ICU. */
const PERSIAN_EPOCH = 1948320;
const PERSIAN_MONTH_STARTS = [0, 31, 62, 93, 124, 155, 186, 216, 246, 276, 306, 336];

/** A year of the Solar Hijri calendar is a leap year when (25 × year + 11) mod 33 < 8: 8 leap years in every 33. */
export const isPersianLeap = (year: number): boolean => mod(25 * year + 11, 33) < 8;

/** Solar Hijri (Persian) calendar, with the 33-year arithmetic rule that ICU also uses: 6 months of 31 days, 5 of 30 and Esfand of 29 or 30. */
export function jdnToPersian(jdn: number): Ymd {
  const days = jdn - PERSIAN_EPOCH;
  const year = 1 + Math.floor((33 * days + 3) / 12053);
  const dayOfYear = days - (365 * (year - 1) + Math.floor((8 * year + 21) / 33));
  const month = dayOfYear < 186 ? Math.floor(dayOfYear / 31) : Math.floor((dayOfYear - 6) / 30);
  return { year, month: month + 1, day: dayOfYear - (PERSIAN_MONTH_STARTS[month] ?? 0) + 1 };
}

/** Indian national calendar (Saka era): the year begins on 22 March (21 March in leap years); Chaitra has 30 days (31 in leap years), the next five months 31, the others 30. */
export function jdnToIndian(jdn: number): Ymd {
  let { year } = jdnToGregorian(jdn);
  let start = gregorian(year, 3, isGregorianLeap(year) ? 21 : 22);
  if (jdn < start) {
    year--;
    start = gregorian(year, 3, isGregorianLeap(year) ? 21 : 22);
  }
  let day = jdn - start;
  const chaitra = isGregorianLeap(year) ? 31 : 30;
  if (day < chaitra) return { year: year - 78, month: 1, day: day + 1 };
  day -= chaitra;
  if (day < 5 * 31) return { year: year - 78, month: 2 + Math.floor(day / 31), day: (day % 31) + 1 };
  day -= 5 * 31;
  return { year: year - 78, month: 7 + Math.floor(day / 30), day: (day % 30) + 1 };
}

const NANAKSHAHI_MONTHS = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];

/** Nanakshahi calendar of 2003: the year begins on 14 March and is counted from 1469, the birth of Guru Nanak; the last month, Phagun, has 30 or 31 days. */
export function jdnToNanakshahi(jdn: number): Ymd {
  const civil = jdnToGregorian(jdn).year;
  const year = jdn >= gregorian(civil, 3, 14) ? civil : civil - 1;
  let day = jdn - gregorian(year, 3, 14);
  for (const [i, length] of NANAKSHAHI_MONTHS.entries()) {
    if (day < length) return { year: year - 1468, month: i + 1, day: day + 1 };
    day -= length;
  }
  return { year: year - 1468, month: 12, day: day + 1 };
}

/** Thai Buddhist era: the Gregorian calendar with the years counted from 543 BC. */
export function jdnToBuddhist(jdn: number): Ymd {
  const { year, month, day } = jdnToGregorian(jdn);
  return { year: year + 543, month, day };
}

export type JapaneseEra = "meiji" | "taisho" | "showa" | "heisei" | "reiwa";

/** First day of each era since Japan took the Gregorian calendar (1 January 1873, the sixth year of Meiji), and the Gregorian year of its first year. */
const JAPANESE_ERAS: Array<[JapaneseEra, number, number]> = [
  ["reiwa", gregorian(2019, 5, 1), 2019],
  ["heisei", gregorian(1989, 1, 8), 1989],
  ["showa", gregorian(1926, 12, 25), 1926],
  ["taisho", gregorian(1912, 7, 30), 1912],
  ["meiji", gregorian(1873, 1, 1), 1868],
];

/** Japanese calendar: Gregorian months and days, the years counted by the eras of the emperors. Undefined before 1873. */
export function jdnToJapanese(jdn: number): (Ymd & { era: JapaneseEra }) | undefined {
  const era = JAPANESE_ERAS.find(([, start]) => jdn >= start);
  if (!era) return undefined;
  const { year, month, day } = jdnToGregorian(jdn);
  return { era: era[0], year: year - era[2] + 1, month, day };
}

// ---------------------------------------------------------------------------
// Bahá'í calendar

/**
 * Naw-Rúz from 2015 to 2064 (172–221 BE), the day in Tehran that contains
 * the vernal equinox, from the table of the Bahá'í World Centre ("Bahá'í
 * Dates 172 to 221 B.E."): "1" for 21 March, "0" for 20 March. Before 2015
 * the calendar used in the West fixed Naw-Rúz on 21 March.
 */
const NAW_RUZ_2015 = "10011001100110001000100010001000100010001000000000";

function nawRuz(gregorianYear: number): number | undefined {
  if (gregorianYear < 1844 || gregorianYear > 2064) return undefined;
  const late = gregorianYear < 2015 || NAW_RUZ_2015[gregorianYear - 2015] === "1";
  return gregorian(gregorianYear, 3, late ? 21 : 20);
}

/**
 * Badíʿ calendar: 19 months of 19 days from Naw-Rúz, with the 4 or 5 days of
 * Ayyám-i-Há (month 0) before the last month, ʿAláʾ. Years are counted from
 * 1844. Undefined outside the known dates of Naw-Rúz (1844–2064).
 */
export function jdnToBahai(jdn: number): Ymd | undefined {
  const civil = jdnToGregorian(jdn).year;
  const thisYear = nawRuz(civil);
  if (thisYear === undefined) return undefined;
  const year = jdn >= thisYear ? civil : civil - 1;
  const start = nawRuz(year);
  const end = nawRuz(year + 1);
  if (start === undefined || end === undefined) return undefined;
  const day = jdn - start;
  const ayyamIHa = end - start - 361;
  const bahai = year - 1843;
  if (day < 18 * 19) return { year: bahai, month: Math.floor(day / 19) + 1, day: (day % 19) + 1 };
  if (day < 18 * 19 + ayyamIHa) return { year: bahai, month: 0, day: day - 18 * 19 + 1 };
  return { year: bahai, month: 19, day: day - 18 * 19 - ayyamIHa + 1 };
}

// ---------------------------------------------------------------------------
// Islamic calendar (Umm al-Qura), through ICU

let islamicFormat: Intl.DateTimeFormat | undefined;

/** Noon (UTC) of a day, as a JavaScript date. */
export function jdnToDate(jdn: number): Date {
  return new Date((jdn - 2440588) * 86_400_000 + 43_200_000);
}

/**
 * Islamic calendar of Saudi Arabia (Umm al-Qura), as ICU computes it from the
 * official tables for 1300–1600 AH. In most countries the months begin with
 * the sighting of the crescent, a day or two later or earlier.
 */
export function jdnToIslamic(jdn: number): Ymd {
  if (!islamicFormat) {
    islamicFormat = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
    // Without full ICU data, Intl falls back to the Gregorian calendar without saying so.
    if (islamicFormat.resolvedOptions().calendar !== "islamic-umalqura") throw new Error("This Node.js has no Islamic calendar (Umm al-Qura) in its ICU data.");
  }
  const parts = Object.fromEntries(islamicFormat.formatToParts(jdnToDate(jdn)).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

// ---------------------------------------------------------------------------
// Chinese calendar, from the tables of the Hong Kong Observatory

/**
 * The Chinese years whose New Year falls from 1901 to 2099, from the
 * Gregorian-Lunar Calendar Conversion Tables of the Hong Kong Observatory
 * (https://www.hko.gov.hk/en/gts/time/conversion.htm). One entry per year,
 * 1901 first: the Gregorian month and day of the New Year (4 digits), the
 * leap month (one hexadecimal digit, 0 when there is none) and the lengths
 * of the months in their order, the leap month after the month it repeats,
 * as bits from the first month (1 for 30 days, 0 for 29), in 4 hexadecimal
 * digits.
 */
const CHINESE_YEARS = `
  021904ae0 02080a570 012955268 02160d260 02040d950 012546aa8 0213056a0 020209ad0 012224ae8 021004ae0
  01306a4d8 02180a4d0 02060d250 01265d528 02140b540 02030d6a0 0123296d0 0211095b0 0201749b8 022004970
  02080a4b0 01285b258 021606a50 020506d40 01244ada8 021302b60 020209570 012324978 021004970 0130664b0
  02170d4a0 02060ea50 012656d48 021405ad0 020402b60 012439370 0211092e0 01317c968 02190c950 02080d4a0
  01276da50 02150b550 0205056a0 01254aad8 0213025d0 0202092d0 01222c958 02100a950 01297b4a8 021706ca0
  02060b550 0127555a8 021404da0 02030a5b0 0124352b8 0212052b0 01318a950 02180e950 020806aa0 01286ad50
  02150ab50 020504b60 01254a570 02130a570 020205260 01213e930 02090d950 013075aa8 0217056a0 0206096d0
  012754ae8 021504ad0 02030a4d0 01234d268 02110d250 01318d528 02180b540 02070b6a0 0128696d0 0216095b0
  0205049b0 01254a4b8 02130a4b0 0202ab258 022006a50 020906d40 01296ada0 02170ab60 020609570 012754978
  021504970 0204064b0 012336a50 02100ea50 013186b28 021905ac0 02070ab60 012859368 0216092e0 02050c960
  01244d4a8 02120d4a0 02010da50 012225aa8 0209056a0 01297aad8 0218025d0 0207092d0 01265c958 02140a950
  02030b4a0 01234b550 02100ad50 0131955a8 021904ba0 02080a5b0 0128652b8 0216052b0 02050a930 0125474a8
  021206aa0 02010ad50 012224da8 021004b60 01296a570 02170a4e0 02060d260 01265e930 02130d530 020305aa0
  012336b50 0211096d0 0131b4ae8 021904ad0 02080a4d0 01286d258 02150d250 02040d520 01245daa0 02120b5a0
  0201056d0 012224ad8 0210049b0 01307a4b8 02170a4b0 02060aa50 01265b528 021406d20 02020ada0 0123355b0
  021109370 020184978 021904970 0208064b0 012866a50 02150ea50 020406aa0 01244ab60 02120aae0 0202092e0
  01213c970 02090c960 01297d4a8 02170d4a0 02050da50 012655aa8 0214056a0 02030a6d0 0123452e8 0211052d0
  01318a958 02190a950 02070b4a0 01276b550 02150ad50 0205055a0 01244a5d0 02120a5b0 0202052b0 01223a938
  020906930 012977298 021706aa0 02060ad50 012654da8 021404b60 02030a570 012445270 02100d160 01308e930
  02180d520 02070daa0 012766b50 0215056d0 020504ae0 01254a4e8 02120a2d0 02010d150 01212d928
`;

interface ChineseMonth {
  start: number;
  /** Gregorian year in which the Chinese year began. */
  year: number;
  month: number;
  leap: boolean;
}

let chineseMonths: ChineseMonth[] | undefined;

/** The months of the table, and after them the New Year that ends it. */
function loadChineseMonths(): ChineseMonth[] {
  const months: ChineseMonth[] = [];
  const entries = CHINESE_YEARS.split(/\s+/).filter(Boolean);
  let end: number | undefined;
  for (const [i, entry] of entries.entries()) {
    const year = 1901 + i;
    let start = gregorian(year, Number(entry.slice(0, 2)), Number(entry.slice(2, 4)));
    if (end !== undefined && end !== start) throw new Error(`Chinese calendar table: the months of ${year - 1} do not end on the New Year of ${year}.`);
    const leapMonth = parseInt(entry.slice(4, 5), 16);
    const bits = parseInt(entry.slice(5), 16);
    for (let k = 0; k < (leapMonth > 0 ? 13 : 12); k++) {
      // The leap month comes right after the month whose number it repeats.
      const month = leapMonth > 0 && k >= leapMonth ? k : k + 1;
      months.push({ start, year, month, leap: leapMonth > 0 && k === leapMonth });
      start += (bits >> (15 - k)) & 1 ? 30 : 29;
    }
    end = start;
  }
  if (end !== undefined) months.push({ start: end, year: 1901 + entries.length, month: 1, leap: false });
  return months;
}

/** First day of the Chinese New Year of a Gregorian year (1901–2100), or undefined outside the table. */
export function chineseNewYear(gregorianYear: number): number | undefined {
  chineseMonths ??= loadChineseMonths();
  return chineseMonths.find((m) => m.year === gregorianYear && m.month === 1 && !m.leap)?.start;
}

/**
 * Chinese calendar: lunar months that begin on the day of the new moon in
 * China (UTC+8), numbered by the solar terms, with a leap month in 7 years
 * out of 19. The year is named by the Gregorian year in which it began.
 * Undefined outside the table (from the New Year of 1901 to that of 2100).
 */
export function jdnToChinese(jdn: number): (Ymd & { leap: boolean }) | undefined {
  chineseMonths ??= loadChineseMonths();
  const months = chineseMonths;
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last || jdn < first.start || jdn >= last.start) return undefined;
  let lo = 0;
  let hi = months.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((months[mid]?.start ?? 0) <= jdn) lo = mid;
    else hi = mid;
  }
  const m = months[lo] as ChineseMonth;
  return { year: m.year, month: m.month, leap: m.leap, day: jdn - m.start + 1 };
}
