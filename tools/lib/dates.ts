/** Date helpers: EDTF subset, church month/day validity. */

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Calendars in which a church date (month/day) can be expressed. */
export type DateCalendar = "church" | "coptic" | "ethiopian";

/**
 * Whether a month/day exists in the given calendar. "church" is the Menaion
 * (Julian-style months, 29 February allowed); Coptic and Ethiopian months have
 * 30 days, plus a 13th month of up to 6 days.
 */
export function isValidMonthDay(month: number, day: number, calendar: DateCalendar = "church"): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day) || day < 1) return false;
  if (calendar === "church") {
    const max = MONTH_DAYS[month - 1];
    return max !== undefined && day <= max;
  }
  if (month >= 1 && month <= 12) return day <= 30;
  return month === 13 && day <= 6;
}

export function parseMonthDay(value: string): { month: number; day: number } | null {
  const m = /^([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m) return null;
  return { month: Number(m[1]), day: Number(m[2]) };
}

const EDTF_DATE =
  "(-?)([0-9]{2}[0-9X]{2})(?:-(0[1-9]|1[0-2]|XX)(?:-(0[1-9]|[12][0-9]|3[01]|XX))?)?([?~%])?";
const DATE_RE = new RegExp(`^${EDTF_DATE}$`);

interface EdtfDate {
  negative: boolean;
  year: string;
  month?: string;
  day?: string;
}

function parseEdtfDate(value: string): EdtfDate | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const [, sign, year, month, day] = m;
  if (year === undefined) return null;
  const parsed: EdtfDate = { negative: sign === "-", year };
  if (month !== undefined) parsed.month = month;
  if (day !== undefined) parsed.day = day;
  if (parsed.month && parsed.day && !parsed.month.includes("X") && !parsed.day.includes("X")) {
    const max = MONTH_DAYS[Number(parsed.month) - 1] ?? 0;
    let limit = max;
    if (parsed.month === "02" && !year.includes("X")) {
      // Julian leap rule, permissive for Gregorian dates as well.
      limit = Number(year) % 4 === 0 ? 29 : 28;
    }
    if (Number(parsed.day) > limit) return null;
  }
  return parsed;
}

/** Comparable number for fully specified dates (no X); null otherwise. */
function ordinal(d: EdtfDate): number | null {
  if (d.year.includes("X") || d.month?.includes("X") || d.day?.includes("X")) return null;
  const y = Number(d.year) * (d.negative ? -1 : 1);
  return y * 10000 + Number(d.month ?? "01") * 100 + Number(d.day ?? "01");
}

/** Validates the EDTF subset documented in schema/common/defs.schema.json (#/$defs/edtf). */
export function isValidEdtf(value: string): boolean {
  if (DATE_RE.test(value)) return parseEdtfDate(value) !== null;

  const set = /^([[{])(.*)([\]}])$/.exec(value);
  if (set) {
    const [, open, inner, close] = set;
    if ((open === "[" && close !== "]") || (open === "{" && close !== "}") || !inner) return false;
    const members = inner.split(/,|\.\./);
    return members.length > 0 && members.every((m) => parseEdtfDate(m) !== null);
  }

  const slash = value.indexOf("/");
  if (slash >= 0 && value.indexOf("/", slash + 1) < 0) {
    const start = value.slice(0, slash);
    const end = value.slice(slash + 1);
    if (start === "" && end === "") return false;
    const s = start === "" || start === ".." ? null : parseEdtfDate(start);
    const e = end === "" || end === ".." ? null : parseEdtfDate(end);
    if ((start !== "" && start !== ".." && !s) || (end !== "" && end !== ".." && !e)) return false;
    if (s && e) {
      const so = ordinal(s);
      const eo = ordinal(e);
      if (so !== null && eo !== null && so > eo) return false;
    }
    return true;
  }
  return false;
}

/** ISO calendar date YYYY-MM-DD that really exists in the (proleptic) Gregorian calendar. */
export function isValidIsoDate(value: string): boolean {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
