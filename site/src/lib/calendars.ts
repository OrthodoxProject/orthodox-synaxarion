/**
 * The date in other calendars: which calendars the site shows, a day in each
 * of them in the reader's language (and in the calendar's own script), and
 * the descriptions in docs/calendars/<lang>/<id>.md.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { gregorianToJdn, jdnToCoptic, jdnToEthiopian, jdnToGregorian, jdnToJulian } from "../../../tools/lib/calendar.ts";
import {
  CALENDAR_IDS,
  armenianNumeral,
  greekNumeral,
  jdnToArmenian,
  jdnToBahai,
  jdnToBuddhist,
  jdnToByzantine,
  jdnToChinese,
  jdnToDate,
  jdnToHebrew,
  jdnToIndian,
  jdnToIslamic,
  jdnToJapanese,
  jdnToNanakshahi,
  jdnToPersian,
  jdnToRoman,
  jdnToSeleucid,
  romanDay,
  romanNumeral,
  type CalendarGroup,
  type CalendarId,
  type HebrewMonth,
  type JapaneseEra,
} from "../../../tools/lib/calendar-systems.ts";
import { splitFrontMatter } from "../../../tools/lib/text.ts";
import { markdown } from "./markdown.ts";
import { monthName, vocab } from "./format.ts";
import { href } from "./site.ts";
import type { Lang, UiKey } from "./ui.ts";

export { CALENDAR_GROUPS, CALENDAR_IDS, type CalendarId } from "../../../tools/lib/calendar-systems.ts";

/** Heading of each group of calendars. */
export const GROUP_TITLES: Record<CalendarGroup, UiKey> = { christian: "calendarsChristian", religions: "calendarsReligions", other: "calendarsOther" };

// ---------------------------------------------------------------------------
// Descriptions

export interface CalendarDoc {
  /** Title of the calendar's page. */
  title: string;
  /** Short name, in the list of dates. */
  label: string;
  /** One or two sentences, shown by the info button and under the title. */
  summary: string;
  /** Markdown: description, history, method of calculation, references. */
  body: string;
}

let docsDir: string | undefined;

function findDocsDir(): string {
  for (const candidate of ["docs/calendars", "../docs/calendars"]) {
    if (existsSync(resolve(candidate))) return resolve(candidate);
  }
  throw new Error("Cannot find docs/calendars.");
}

const docs = new Map<string, CalendarDoc>();

export function calendarDoc(id: CalendarId, lang: Lang): CalendarDoc {
  const key = `${lang}/${id}`;
  let doc = docs.get(key);
  if (!doc) {
    docsDir ??= findDocsDir();
    const file = join(docsDir, lang, `${id}.md`);
    const parts = splitFrontMatter(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
    const front = (parts ? parseYaml(parts.frontMatter) : undefined) as Record<string, unknown> | undefined;
    if (!parts || typeof front?.title !== "string" || typeof front.label !== "string" || typeof front.summary !== "string") {
      throw new Error(`${file} needs a front matter with title, label and summary.`);
    }
    doc = { title: front.title, label: front.label, summary: front.summary, body: parts.body };
    docs.set(key, doc);
  }
  return doc;
}

/** HTML of a calendar's page; links to another calendar's file ("julian.md") lead to its page. */
export function calendarHtml(body: string, lang: Lang): string {
  const ids = new Set<string>(CALENDAR_IDS);
  const linked = body.replace(/\]\(([a-z-]+)\.md(#[^)]*)?\)/g, (whole, id: string, anchor: string | undefined) => (ids.has(id) ? `](${href(lang, "calendars", id)}${anchor ?? ""})` : whole));
  return markdown(linked);
}

// ---------------------------------------------------------------------------
// Names

const HEBREW_MONTHS: Record<Lang, Record<HebrewMonth, string>> = {
  ro: { tishri: "Tișri", heshvan: "Heșvan", kislev: "Kislev", tevet: "Tevet", shevat: "Șvat", adar: "Adar", adar1: "Adar I", adar2: "Adar II", nisan: "Nisan", iyar: "Iyar", sivan: "Sivan", tammuz: "Tamuz", av: "Av", elul: "Elul" },
  en: { tishri: "Tishri", heshvan: "Heshvan", kislev: "Kislev", tevet: "Tevet", shevat: "Shevat", adar: "Adar", adar1: "Adar I", adar2: "Adar II", nisan: "Nisan", iyar: "Iyar", sivan: "Sivan", tammuz: "Tammuz", av: "Av", elul: "Elul" },
};

const ETHIOPIAN_MONTHS = ["Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit", "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume"];

const ARMENIAN_MONTHS: Record<Lang, string[]> = {
  ro: ["Navasard", "Hori", "Sahmi", "Tre", "Kaghoț", "Araț", "Mehekan", "Areg", "Ahekan", "Mareri", "Margaț", "Hrotiț", "Aveleaț"],
  en: ["Navasard", "Hori", "Sahmi", "Tre", "Kaghots", "Arats", "Mehekan", "Areg", "Ahekan", "Mareri", "Margats", "Hrotits", "Aveleats"],
};

/** Syriac names of the Julian months, January first. */
const SYRIAC_MONTHS: Record<Lang, string[]> = {
  ro: ["Kanun II", "Șvat", "Adar", "Nisan", "Iyar", "Hziran", "Tamuz", "Ab", "Ilul", "Teșrin I", "Teșrin II", "Kanun I"],
  en: ["Kanun II", "Shvat", "Adar", "Nisan", "Iyar", "Hziran", "Tammuz", "Ab", "Ilul", "Teshrin I", "Teshrin II", "Kanun I"],
};

const ISLAMIC_MONTHS = ["Muharram", "Safar", "Rabi’ al-Awwal", "Rabi’ al-Thani", "Jumada al-Ula", "Jumada al-Akhira", "Rajab", "Sha’ban", "Ramadan", "Shawwal", "Dhu al-Qa’da", "Dhu al-Hijja"];

/** Months of the Badíʿ calendar, with Ayyám-i-Há as month 0. */
const BAHAI_MONTHS = ["Ayyám-i-Há", "Bahá", "Jalál", "Jamál", "ʻAẓamat", "Núr", "Raḥmat", "Kalimát", "Kamál", "Asmáʼ", "ʻIzzat", "Mashíyyat", "ʻIlm", "Qudrat", "Qawl", "Masáʼil", "Sharaf", "Sulṭán", "Mulk", "ʻAláʼ"];

const PERSIAN_MONTHS = ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"];

const INDIAN_MONTHS = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadra", "Ashvin", "Kartika", "Agrahayana", "Pausha", "Magha", "Phalguna"];

const NANAKSHAHI_MONTHS = ["Chet", "Vaisakh", "Jeth", "Harh", "Sawan", "Bhadon", "Assu", "Katak", "Maghar", "Poh", "Magh", "Phagun"];
const NANAKSHAHI_GURMUKHI = ["ਚੇਤ", "ਵੈਸਾਖ", "ਜੇਠ", "ਹਾੜ", "ਸਾਵਣ", "ਭਾਦੋਂ", "ਅੱਸੂ", "ਕੱਤਕ", "ਮੱਘਰ", "ਪੋਹ", "ਮਾਘ", "ਫੱਗਣ"];

const JAPANESE_ERAS: Record<JapaneseEra, string> = { meiji: "Meiji", taisho: "Taishō", showa: "Shōwa", heisei: "Heisei", reiwa: "Reiwa" };

const STEMS = ["jiǎ", "yǐ", "bǐng", "dīng", "wù", "jǐ", "gēng", "xīn", "rén", "guǐ"];
const BRANCHES = ["zǐ", "chǒu", "yín", "mǎo", "chén", "sì", "wǔ", "wèi", "shēn", "yǒu", "xū", "hài"];
const STEM_CHARS = "甲乙丙丁戊己庚辛壬癸";
const BRANCH_CHARS = "子丑寅卯辰巳午未申酉戌亥";
/** The animals of the branches, with the article in Romanian ("Calul de Foc"). */
const ANIMALS: Record<Lang, string[]> = {
  ro: ["Șobolanul", "Bivolul", "Tigrul", "Iepurele", "Dragonul", "Șarpele", "Calul", "Capra", "Maimuța", "Cocoșul", "Câinele", "Mistrețul"],
  en: ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"],
};
/** The elements of the stems, two stems each. */
const ELEMENTS: Record<Lang, string[]> = { ro: ["Lemn", "Foc", "Pământ", "Metal", "Apă"], en: ["Wood", "Fire", "Earth", "Metal", "Water"] };
const CHINESE_MONTH_CHARS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const CHINESE_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** Day of a Chinese month in characters: 初一 … 初十, 十一 … 十九, 二十, 廿一 … 廿九, 三十. */
function chineseDay(day: number): string {
  if (day <= 10) return `初${CHINESE_DIGITS[day]}`;
  if (day < 20) return `十${CHINESE_DIGITS[day - 10]}`;
  if (day === 20) return "二十";
  if (day < 30) return `廿${CHINESE_DIGITS[day - 20]}`;
  return "三十";
}

const LATIN_MONTHS = ["Ian.", "Feb.", "Mart.", "Apr.", "Mai.", "Iun.", "Iul.", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
const LATIN_MARKS = { kalends: "Kal.", nones: "Non.", ides: "Id." };

const GURMUKHI_DIGITS = "੦੧੨੩੪੫੬੭੮੯";
const gurmukhi = (n: number): string => String(n).replace(/[0-9]/g, (d) => GURMUKHI_DIGITS[Number(d)] ?? d);

function ordinalEn(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

// ---------------------------------------------------------------------------
// Dates

export interface CalendarDate {
  /** The date as the reader reads it. */
  text: string;
  /** More about the day: the indiction of a Byzantine date. */
  detail?: string;
  /** The date in the calendar's own language and script. */
  native?: { text: string; lang: string; dir?: "rtl" };
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** A date written by ICU in a calendar's own language. */
function intlNative(locale: string, jdn: number, options: Intl.DateTimeFormatOptions = { dateStyle: "long" }): string {
  const key = `${locale} ${JSON.stringify(options)}`;
  let format = formats.get(key);
  if (!format) formats.set(key, (format = new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options })));
  return format.format(jdnToDate(jdn));
}

/** Month name of a date in a calendar's own language, from ICU. */
function intlMonth(locale: string, jdn: number): string {
  const key = `${locale} month`;
  let format = formats.get(key);
  if (!format) formats.set(key, (format = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long" })));
  return format.format(jdnToDate(jdn));
}

const dmy = (day: number, month: string, year: number | string): string => `${day} ${month} ${year}`;

/** A Gregorian day ("2026-11-08") in one of the calendars, or undefined when the calendar has no date for it. */
export function calendarDate(id: CalendarId, iso: string, lang: Lang): CalendarDate | undefined {
  const [y, m, d] = iso.split("-").map(Number);
  const jdn = gregorianToJdn({ year: y ?? 1, month: m ?? 1, day: d ?? 1 });
  switch (id) {
    case "gregorian": {
      const g = jdnToGregorian(jdn);
      return { text: dmy(g.day, monthName(g.month, lang), g.year) };
    }
    case "julian": {
      const j = jdnToJulian(jdn);
      return { text: dmy(j.day, monthName(j.month, lang), j.year) };
    }
    case "byzantine": {
      const b = jdnToByzantine(jdn);
      return {
        text: dmy(b.day, monthName(b.month, lang), b.year),
        detail: lang === "ro" ? `indictionul ${b.indiction}` : `indiction ${b.indiction}`,
        native: { text: `ἔτους ${greekNumeral(b.year)}, ἰνδικτιῶνος ${greekNumeral(b.indiction)}`, lang: "grc" },
      };
    }
    case "coptic": {
      const c = jdnToCoptic(jdn);
      return { text: dmy(c.day, vocab(lang, `coptic_month.${c.month}`), c.year) };
    }
    case "ethiopian": {
      const e = jdnToEthiopian(jdn);
      return { text: dmy(e.day, ETHIOPIAN_MONTHS[e.month - 1] ?? "", e.year), native: { text: dmy(e.day, intlMonth("am-ET-u-ca-ethiopic", jdn), e.year), lang: "am" } };
    }
    case "armenian": {
      const a = jdnToArmenian(jdn);
      return { text: dmy(a.day, ARMENIAN_MONTHS[lang][a.month - 1] ?? "", a.year), native: { text: `ԹՎ ${armenianNumeral(a.year)}`, lang: "hy" } };
    }
    case "syriac": {
      const s = jdnToSeleucid(jdn);
      return { text: dmy(s.day, SYRIAC_MONTHS[lang][s.month - 1] ?? "", s.year) };
    }
    case "hebrew": {
      const h = jdnToHebrew(jdn);
      return { text: dmy(h.day, HEBREW_MONTHS[lang][h.month], h.year), native: { text: intlNative("he-u-ca-hebrew", jdn), lang: "he", dir: "rtl" } };
    }
    case "islamic": {
      const i = jdnToIslamic(jdn);
      return { text: dmy(i.day, ISLAMIC_MONTHS[i.month - 1] ?? "", i.year), native: { text: intlNative("ar-SA-u-ca-islamic-umalqura", jdn), lang: "ar", dir: "rtl" } };
    }
    case "bahai": {
      const b = jdnToBahai(jdn);
      return b && { text: dmy(b.day, BAHAI_MONTHS[b.month] ?? "", b.year) };
    }
    case "buddhist": {
      const b = jdnToBuddhist(jdn);
      return { text: dmy(b.day, monthName(b.month, lang), b.year), native: { text: intlNative("th-TH-u-ca-buddhist", jdn), lang: "th" } };
    }
    case "nanakshahi": {
      const n = jdnToNanakshahi(jdn);
      return { text: dmy(n.day, NANAKSHAHI_MONTHS[n.month - 1] ?? "", n.year), native: { text: `${gurmukhi(n.day)} ${NANAKSHAHI_GURMUKHI[n.month - 1]} ${gurmukhi(n.year)}`, lang: "pa" } };
    }
    case "persian": {
      const p = jdnToPersian(jdn);
      return { text: dmy(p.day, PERSIAN_MONTHS[p.month - 1] ?? "", p.year), native: { text: intlNative("fa-IR-u-ca-persian", jdn), lang: "fa", dir: "rtl" } };
    }
    case "indian": {
      const i = jdnToIndian(jdn);
      return { text: dmy(i.day, INDIAN_MONTHS[i.month - 1] ?? "", i.year), native: { text: intlNative("hi-IN-u-ca-indian-nu-deva", jdn, { day: "numeric", month: "long", year: "numeric" }), lang: "hi" } };
    }
    case "chinese": {
      const c = jdnToChinese(jdn);
      if (!c) return undefined;
      const stem = (((c.year - 4) % 10) + 10) % 10;
      const branch = (((c.year - 4) % 12) + 12) % 12;
      const element = ELEMENTS[lang][Math.floor(stem / 2)] ?? "";
      const animal = ANIMALS[lang][branch] ?? "";
      const name = `${STEMS[stem]}${BRANCHES[branch]}`;
      const text =
        lang === "ro"
          ? `ziua ${c.day} din luna ${c.month === 1 ? "întâi" : `a ${c.month}-a`}${c.leap ? " intercalară" : ""}, anul ${name} (${animal} de ${element})`
          : `day ${c.day} of the ${c.leap ? "leap " : ""}${ordinalEn(c.month)} month, ${name} year (${element} ${animal})`;
      const native = `${STEM_CHARS[stem]}${BRANCH_CHARS[branch]}年${c.leap ? "闰" : ""}${CHINESE_MONTH_CHARS[c.month - 1]}${chineseDay(c.day)}`;
      return { text, native: { text: native, lang: "zh" } };
    }
    case "japanese": {
      const j = jdnToJapanese(jdn);
      if (!j) return undefined;
      const era = JAPANESE_ERAS[j.era];
      const text = lang === "ro" ? `${j.day} ${monthName(j.month, lang)}, anul ${j.year} ${era}` : `${j.day} ${monthName(j.month, lang)}, ${era} ${j.year}`;
      return { text, native: { text: intlNative("ja-JP-u-ca-japanese", jdn), lang: "ja" } };
    }
    case "roman": {
      const r = jdnToRoman(jdn);
      const day = romanDay(jdnToJulian(jdn));
      const mark = `${LATIN_MARKS[day.mark]} ${LATIN_MONTHS[day.month - 1]}`;
      const latin = day.bis ? `a.d. bis VI ${mark}` : day.count === 1 ? mark : day.count === 2 ? `prid. ${mark}` : `a.d. ${romanNumeral(day.count)} ${mark}`;
      return { text: `${dmy(r.day, monthName(r.month, lang), r.year)} ${lang === "ro" ? "a.u.c." : "AUC"}`, native: { text: `${latin} ${romanNumeral(r.year)} a.u.c.`, lang: "la" } };
    }
    case "julian-day":
      return { text: String(jdn) };
  }
}
