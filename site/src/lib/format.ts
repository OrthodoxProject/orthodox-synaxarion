/** Names, dates, rules and references, rendered in the reader's language. */
import { jdnToGregorian, julianToJdn } from "../../../tools/lib/calendar.ts";
import type { LongText } from "../../../tools/lib/dataset.ts";
import { REF_PREFIXES } from "../../../tools/lib/layout.ts";
import { ds, href, idOf, pageSubject, record, todayIso, type Placement } from "./site.ts";
import { t, type Lang } from "./ui.ts";

type Rec = Record<string, any>;
type Form = "m.sg" | "f.sg" | "m.pl" | "f.pl" | "abbr";

const FALLBACK: Record<Lang, string[]> = { ro: ["ro", "en"], en: ["en", "ro"] };

export function capitalize(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/** Vocabulary label of a code ("holiness_type.martyr"), with a grammatical form when the label has several. */
export function vocab(lang: Lang, key: string, form?: Form): string {
  for (const l of FALLBACK[lang]) {
    const label = ds().vocab.get(l)?.[key];
    if (label === undefined) continue;
    if (typeof label === "string") return label;
    return (form ? label[form] : undefined) ?? label.default ?? label["m.sg"] ?? label["f.sg"] ?? label["m.pl"] ?? label["f.pl"] ?? key;
  }
  return key.slice(key.indexOf(".") + 1).replace(/_/g, " ");
}

/** Machine translations are published only after a person has reviewed them. */
export function publishable(rec: Rec | undefined): boolean {
  const translation = rec?.translation as Rec | undefined;
  const machine = translation?.method === "machine" || translation?.status === "machine";
  return !machine || translation?.status === "reviewed" || translation?.status === "approved";
}

export function exactLocale(collection: string, id: string, lang: string): Rec | undefined {
  const found = ds().locales.get(collection)?.get(id)?.get(lang);
  return publishable(found) ? found : undefined;
}

/** Locale record in the reader's language, else English or Romanian, else any language. */
export function localeOf(collection: string, id: string, lang: Lang): Rec | undefined {
  const byLocale = ds().locales.get(collection)?.get(id);
  if (!byLocale) return undefined;
  for (const l of FALLBACK[lang]) {
    const found = byLocale.get(l);
    if (found && publishable(found)) return found;
  }
  return [...byLocale.values()].find((r) => publishable(r));
}

/** All published locale records of a record, by locale. */
export function allLocales(collection: string, id: string): Map<string, Rec> {
  return new Map([...(ds().locales.get(collection)?.get(id) ?? [])].filter(([, r]) => publishable(r)));
}

/** Long Markdown text in the reader's language, else in the other site language, else in any language. */
export function textOf(collection: string, id: string, lang: Lang): { locale: string; text: LongText } | undefined {
  const byLocale = ds().texts.get(collection)?.get(id);
  if (!byLocale) return undefined;
  const order = [...FALLBACK[lang], ...byLocale.keys()];
  for (const locale of order) {
    const text = byLocale.get(locale);
    if (text && publishable(text.frontMatter)) return { locale, text };
  }
  return undefined;
}

/** Name of a language in the reader's language: "sr-Cyrl" → "sârbă (chirilică)". */
export function languageName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function genderForm(gender: string | undefined): Form {
  return gender === "female" ? "f.sg" : "m.sg";
}

/** Quoted text with the reader's quotation marks. */
export function quote(text: string, lang: Lang): string {
  return lang === "ro" ? `„${text}”` : `“${text}”`;
}

/** "Text (detail, detail)", leaving out empty details. */
export function withDetails(text: string, ...details: Array<string | undefined | false>): string {
  const shown = details.filter((d): d is string => typeof d === "string" && d !== "");
  return shown.length > 0 ? `${text} (${shown.join(", ")})` : text;
}

/** Name of a place, with its present-day name when it differs: "Mira Lichiei (azi Demre)". */
export function placeText(ref: string, lang: Lang, modern = true): string {
  const names = localeOf("places", idOf(ref), lang)?.names;
  if (!names) return idOf(ref);
  return modern && names.modern && names.modern !== names.display ? `${names.display} (${t(lang, "nowCalled")} ${names.modern})` : names.display;
}

export function nameOf(ref: string, lang: Lang, field: "display" | "full" | "short" = "display"): string {
  const prefix = ref.slice(0, ref.indexOf(":"));
  const collection = REF_PREFIXES[prefix];
  if (collection === "commemorations") return commName(ref, lang);
  const names = collection ? localeOf(collection, idOf(ref), lang)?.names : undefined;
  return names?.[field] ?? names?.display ?? idOf(ref);
}

/** Title of a commemoration: its own title in this language, else the names of its subjects. */
export function commName(ref: string, lang: Lang): string {
  const id = idOf(ref);
  const own = exactLocale("commemorations", id, lang)?.names?.display;
  if (own) return own;
  const subjects = ((record("commemorations", id)?.subjects ?? []) as string[]).filter((s) => !s.startsWith("place:"));
  const derived = subjects.map((s) => nameOf(s, lang)).join(", ");
  return derived || localeOf("commemorations", id, lang)?.names?.display || id;
}

/** Title of a calendar line: the tradition's official title in this language, else the commemorations' titles. */
export function lineTitle(line: Rec, lang: Lang, tradition: string): string {
  const commemorations = line.commemorations as string[];
  const official = exactLocale("traditions", tradition, lang)?.official_titles?.[commemorations[0] ?? ""];
  return official ?? commemorations.map((c) => commName(c, lang)).join("; ");
}

/** Page of a record; a saint's day links to the saint. */
export function linkOf(ref: string, lang: Lang): string | undefined {
  const prefix = ref.slice(0, ref.indexOf(":"));
  const id = idOf(ref);
  switch (prefix) {
    case "person":
      return href(lang, "saints", id);
    case "group":
      return href(lang, "groups", id);
    case "comm": {
      const subject = pageSubject(id);
      return subject ? linkOf(subject, lang) : href(lang, "feasts", id);
    }
    default:
      return undefined;
  }
}

export function traditionName(id: string, lang: Lang, field: "display" | "short" = "display"): string {
  const names = localeOf("traditions", id, lang)?.names;
  return names?.[field] ?? names?.display ?? id;
}

export function monthName(month: number, lang: Lang): string {
  return vocab(lang, `month.${month}`);
}

export function monthDayText(month: number, day: number, lang: Lang): string {
  return `${day} ${monthName(month, lang)}`;
}

export function dateText(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${monthDayText(m ?? 1, d ?? 1, lang)} ${y}`;
}

export function weekdayText(name: string, lang: Lang): string {
  return vocab(lang, `weekday.${name}`);
}

export function longDateText(date: string, weekday: string, lang: Lang): string {
  return `${capitalize(weekdayText(weekday, lang))}, ${dateText(date, lang)}`;
}

/** Church date of a day when it differs from the civil one (old style, Coptic, Ethiopian). */
export function churchDateText(day: Rec, lang: Lang): string | undefined {
  const [m, d] = (day.church_date as string).split("-").map(Number);
  switch (day.church_calendar) {
    case "julian":
      return `${monthDayText(m ?? 1, d ?? 1, lang)}, ${t(lang, "oldStyle")}`;
    case "coptic":
    case "ethiopian":
      return `${d} ${vocab(lang, `${day.church_calendar}_month.${m}`)}`;
    default:
      return undefined;
  }
}

/** The same day on the old style, for new-style traditions. */
export function oldStyleText(day: Rec, lang: Lang): string | undefined {
  if (day.church_calendar !== "revised_julian" && day.church_calendar !== "gregorian") return undefined;
  const [, m, d] = (day.julian_date as string).split("-").map(Number);
  return `${monthDayText(m ?? 1, d ?? 1, lang)}, ${t(lang, "oldStyle")}`;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

function centuryText(n: number, lang: Lang): string {
  if (lang === "ro") return n === 1 ? "secolul I" : `secolul al ${ROMAN[n - 1] ?? n}-lea`;
  return `${ordinal(n)} century`;
}

function edtfDateText(value: string, lang: Lang): string {
  const m = /^(-?)([0-9]{2}[0-9X]{2})(?:-([0-9]{2}|XX))?(?:-([0-9]{2}|XX))?([?~%])?$/.exec(value);
  if (!m || !m[2]) return value;
  const [, sign, digits, month, day, qualifier] = m;
  let text: string;
  if (digits.endsWith("XX")) text = centuryText(Number(digits.slice(0, 2)) + 1, lang);
  else if (digits.endsWith("X")) text = lang === "ro" ? `anii ${Number(digits.slice(0, 3)) * 10}` : `the ${Number(digits.slice(0, 3)) * 10}s`;
  else {
    const year = Number(digits);
    text = String(year);
    if (month && month !== "XX") {
      text = day && day !== "XX" ? `${Number(day)} ${monthName(Number(month), lang)} ${year}` : `${monthName(Number(month), lang)} ${year}`;
    }
  }
  if (sign === "-") text += ` ${t(lang, "bc")}`;
  if (qualifier === "~" || qualifier === "%") text = `${lang === "ro" ? "cca" : "c."} ${text}`;
  if (qualifier === "?" || qualifier === "%") text += ` (${t(lang, "uncertain")})`;
  return text;
}

/** Readable form of an EDTF date: "1053-11-07" → "7 noiembrie 1053", "03XX" → "secolul al IV-lea". */
export function edtfText(value: string, lang: Lang): string {
  if (value.startsWith("[") || value.startsWith("{")) {
    return value.slice(1, -1).split(/,|\.\./).map((v) => edtfDateText(v, lang)).join(` ${t(lang, "or")} `);
  }
  if (value.includes("/")) return value.split("/").map((v) => (v === "" || v === ".." ? "…" : edtfDateText(v, lang))).join("–");
  return edtfDateText(value, lang);
}

/** Period of an office or a stay: "1688–1714", "din 1087", "până în 1714". */
export function rangeText(from: string | undefined, to: string | undefined, lang: Lang): string | undefined {
  if (from && to) return `${edtfText(from, lang)}–${edtfText(to, lang)}`;
  if (from) return `${t(lang, "since")} ${edtfText(from, lang)}`;
  if (to) return `${t(lang, "until")} ${edtfText(to, lang)}`;
  return undefined;
}

/** Birth or death: date (old style when stated so) and place. */
export function lifeEventText(event: Rec | undefined, lang: Lang): string | undefined {
  if (!event) return undefined;
  const parts: string[] = [];
  if (event.date) {
    const fullDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(event.date);
    parts.push(fullDate && event.calendar === "julian" ? `${edtfText(event.date, lang)} (${t(lang, "oldStyle")})` : edtfText(event.date, lang));
  }
  if (event.place) parts.push(placeText(event.place, lang));
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** "LUK 8:16-21" → "Luca 8, 16-21" (ro) or "Luke 8:16-21" (en). */
export function bibleRefText(ref: string, lang: Lang): string {
  const m = /^(\S+) (.+)$/.exec(ref);
  if (!m || !m[1] || !m[2]) return ref;
  const passage = lang === "ro" ? m[2].replace(/([0-9]+):/g, "$1, ") : m[2];
  return `${vocab(lang, `bible_book.${m[1]}`)} ${passage}`;
}

export function readingRoleText(role: string, lang: Lang): string {
  if (role === "apostle") return t(lang, "apostle");
  if (role === "gospel") return t(lang, "gospel");
  if (role === "paremia") return t(lang, "paremia");
  return t(lang, "otherReading");
}

function anchorText(anchor: unknown, lang: Lang, before: boolean): string {
  if (typeof anchor === "string") {
    const [m, d] = anchor.split("-").map(Number);
    const date = monthDayText(m ?? 1, d ?? 1, lang);
    if (lang === "ro") return before ? `zilei de ${date}` : `ziua de ${date}`;
    return date;
  }
  const a = anchor as Rec;
  if (typeof a.pascha === "number" && a.pascha === 0) return lang === "ro" ? (before ? "Paștilor" : "Paști") : "Pascha";
  if (typeof a.pascha === "number") return lang === "ro" ? `ziua ${a.pascha} față de Paști` : `day ${a.pascha} from Pascha`;
  if (typeof a.commemoration === "string") return `„${commName(a.commemoration, lang)}”`;
  return "?";
}

/** Readable form of a date rule. */
export function ruleText(rule: Rec, lang: Lang): string {
  switch (rule.type) {
    case "fixed": {
      if (rule.calendar) return `${rule.day} ${vocab(lang, `${rule.calendar}_month.${rule.month}`)}`;
      const base = monthDayText(rule.month, rule.day, lang);
      if (!rule.non_leap) return base;
      const fallback = monthDayText(rule.non_leap.month, rule.non_leap.day, lang);
      return lang === "ro" ? `${base} (${fallback} în anii nebisecți)` : `${base} (${fallback} in common years)`;
    }
    case "pascha":
      if (rule.offset === 0) return t(lang, "pascha");
      if (rule.offset > 0) return lang === "ro" ? `la ${rule.offset} zile după Paști` : `${rule.offset} days after Pascha`;
      return lang === "ro" ? `cu ${-rule.offset} zile înainte de Paști` : `${-rule.offset} days before Pascha`;
    case "pentecost_sunday":
      return lang === "ro" ? `duminica a ${rule.n}-a după Rusalii` : `the ${ordinal(rule.n)} Sunday after Pentecost`;
    case "weekday_before":
    case "weekday_after": {
      const before = rule.type === "weekday_before";
      const day = weekdayText(rule.weekday, lang);
      const anchor = anchorText(rule.anchor, lang, before);
      if (lang === "ro") return `${day} ${before ? "dinaintea" : "de după"} ${anchor}`;
      return `the ${day} ${before ? "before" : "after"} ${anchor}`;
    }
    case "weekday_in_range": {
      const [fm, fd] = (rule.from as string).split("-").map(Number);
      const [tm, td] = (rule.to as string).split("-").map(Number);
      const from = monthDayText(fm ?? 1, fd ?? 1, lang);
      const to = monthDayText(tm ?? 1, td ?? 1, lang);
      const day = weekdayText(rule.weekday, lang);
      return lang === "ro" ? `${day} dintre ${from} și ${to}` : `the ${day} between ${from} and ${to}`;
    }
    case "monthly": {
      const calendar = vocab(lang, `calendar_style.${rule.calendar}`);
      return lang === "ro" ? `în ziua a ${rule.day}-a a fiecărei luni (calendarul ${calendar})` : `on the ${ordinal(rule.day)} of every month (${calendar} calendar)`;
    }
    default:
      return lang === "ro" ? "dată încă necunoscută" : "date not known yet";
  }
}

/** Where a tradition places a commemoration, e.g. "7 noiembrie" or "7 noiembrie, stil vechi (20 noiembrie, stil nou)". */
export function placementText(p: Placement, lang: Lang): string {
  if (p.rule) return ruleText(p.rule, lang);
  const style = ds().traditions.get(p.tradition)?.calendar_style;
  const year = Number(todayIso().slice(0, 4));
  return p.dates
    .map((md) => {
      const [m, d] = md.split("-").map(Number);
      if (style === "coptic" || style === "ethiopian") return `${d} ${vocab(lang, `${style}_month.${m}`)}`;
      const text = monthDayText(m ?? 1, d ?? 1, lang);
      if (style !== "julian") return text;
      const civil = jdnToGregorian(julianToJdn({ year, month: m ?? 1, day: d ?? 1 }));
      return `${text}, ${t(lang, "oldStyle")} (${monthDayText(civil.month, civil.day, lang)}, ${t(lang, "newStyleShort")})`;
    })
    .join("; ");
}

/** Holiness labels in the right grammatical gender: "Cuviosul, Stâlpnicul". */
export function holinessText(codes: string[], gender: string | undefined, lang: Lang): string {
  return codes.map((c) => vocab(lang, `holiness_type.${c}`, gender === "female" ? "f.sg" : "m.sg")).join(", ");
}
