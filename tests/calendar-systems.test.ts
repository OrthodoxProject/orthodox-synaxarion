import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parse as parseYaml } from "yaml";
import { formatYmd, gregorianToJdn, jdnToCoptic, jdnToEthiopian, jdnToGregorian, jdnToJulian, julianToJdn } from "../tools/lib/calendar.ts";
import {
  ARMENIAN_EPOCH,
  CALENDAR_IDS,
  armenianNumeral,
  chineseNewYear,
  greekNumeral,
  hebrewNewYear,
  isPersianLeap,
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
} from "../tools/lib/calendar-systems.ts";
import { splitFrontMatter } from "../tools/lib/text.ts";
import { REPO_ROOT } from "../tools/lib/validate.ts";

const g = (y: number, m: number, d: number): number => gregorianToJdn({ year: y, month: m, day: d });
const iso = (jdn: number | undefined): string | undefined => (jdn === undefined ? undefined : formatYmd(jdnToGregorian(jdn)));
const DAY = g(2026, 11, 8);

describe("calendar systems", () => {
  it("dates 8 November 2026 in every calendar", () => {
    assert.deepEqual(jdnToJulian(DAY), { year: 2026, month: 10, day: 26 });
    assert.deepEqual(jdnToByzantine(DAY), { year: 7535, month: 10, day: 26, indiction: 5 });
    assert.deepEqual(jdnToCoptic(DAY), { year: 1743, month: 2, day: 29 });
    assert.deepEqual(jdnToEthiopian(DAY), { year: 2019, month: 2, day: 29 });
    assert.deepEqual(jdnToArmenian(DAY), { year: 1476, month: 4, day: 21 });
    assert.deepEqual(jdnToSeleucid(DAY), { year: 2338, month: 10, day: 26 });
    assert.deepEqual(jdnToHebrew(DAY), { year: 5787, month: "heshvan", day: 28 });
    assert.deepEqual(jdnToIslamic(DAY), { year: 1448, month: 5, day: 28 });
    assert.deepEqual(jdnToBahai(DAY), { year: 183, month: 13, day: 5 });
    assert.deepEqual(jdnToBuddhist(DAY), { year: 2569, month: 11, day: 8 });
    assert.deepEqual(jdnToNanakshahi(DAY), { year: 558, month: 8, day: 25 });
    assert.deepEqual(jdnToPersian(DAY), { year: 1405, month: 8, day: 17 });
    assert.deepEqual(jdnToIndian(DAY), { year: 1948, month: 8, day: 17 });
    assert.deepEqual(jdnToChinese(DAY), { year: 2026, month: 9, leap: false, day: 30 });
    assert.deepEqual(jdnToJapanese(DAY), { era: "reiwa", year: 8, month: 11, day: 8 });
    assert.deepEqual(jdnToRoman(DAY), { year: 2779, month: 10, day: 26 });
    assert.equal(DAY, 2461353);
  });

  it("begins the Byzantine year and the indiction on 1 September, Old Style", () => {
    assert.deepEqual(jdnToByzantine(g(2026, 9, 13)), { year: 7534, month: 8, day: 31, indiction: 4 });
    assert.deepEqual(jdnToByzantine(g(2026, 9, 14)), { year: 7535, month: 9, day: 1, indiction: 5 });
    // Peter the Great: 31 December 7208 was followed by 1 January 1700.
    assert.equal(jdnToByzantine(julianToJdn({ year: 1699, month: 12, day: 31 })).year, 7208);
  });

  it("begins the year of the Greeks on 1 October, Old Style", () => {
    assert.deepEqual(jdnToSeleucid(g(2026, 10, 13)), { year: 2337, month: 9, day: 30 });
    assert.deepEqual(jdnToSeleucid(g(2026, 10, 14)), { year: 2338, month: 10, day: 1 });
    // The Nestorian Stele of Xi'an: 4 February 781, the year 1092 of the Greeks.
    assert.equal(jdnToSeleucid(julianToJdn({ year: 781, month: 2, day: 4 })).year, 1092);
  });

  it("writes Roman dates by the Kalends, Nones and Ides", () => {
    const roman = (month: number, day: number, year = 2026) => romanDay({ year, month, day });
    assert.deepEqual(roman(10, 26), { count: 7, mark: "kalends", month: 11 });
    assert.deepEqual(roman(12, 25), { count: 8, mark: "kalends", month: 1 });
    assert.deepEqual(roman(3, 15), { count: 1, mark: "ides", month: 3 });
    assert.deepEqual(roman(3, 14), { count: 2, mark: "ides", month: 3 });
    assert.deepEqual(roman(1, 5), { count: 1, mark: "nones", month: 1 });
    assert.deepEqual(roman(1, 2), { count: 4, mark: "nones", month: 1 });
    assert.deepEqual(roman(1, 14), { count: 19, mark: "kalends", month: 2 });
    assert.deepEqual(roman(2, 1), { count: 1, mark: "kalends", month: 2 });
    assert.deepEqual(roman(2, 28), { count: 2, mark: "kalends", month: 3 });
    // A leap year counts 24 February twice.
    assert.deepEqual(roman(2, 23, 2028), { count: 7, mark: "kalends", month: 3 });
    assert.deepEqual(roman(2, 24, 2028), { count: 6, mark: "kalends", month: 3, bis: true });
    assert.deepEqual(roman(2, 25, 2028), { count: 6, mark: "kalends", month: 3 });
    assert.deepEqual(roman(2, 29, 2028), { count: 2, mark: "kalends", month: 3 });
  });

  it("writes Roman, Greek and Armenian numerals", () => {
    assert.equal(romanNumeral(2779), "MMDCCLXXIX");
    assert.equal(romanNumeral(19), "XIX");
    assert.equal(greekNumeral(7535), "͵ζφλεʹ");
    assert.equal(greekNumeral(5), "εʹ");
    assert.equal(greekNumeral(15), "ιεʹ");
    assert.equal(greekNumeral(6), "ϛʹ");
    assert.equal(armenianNumeral(1476), "ՌՆՀԶ");
    assert.equal(armenianNumeral(1455), "ՌՆԾԵ");
  });

  it("starts the Armenian era on 11 July 552 and drifts one day every four years", () => {
    assert.deepEqual(jdnToJulian(ARMENIAN_EPOCH), { year: 552, month: 7, day: 11 });
    assert.equal(iso(ARMENIAN_EPOCH + 1475 * 365), "2026-07-21");
    // The year 1462 began on 11 July 2012, Old Style.
    assert.deepEqual(jdnToArmenian(julianToJdn({ year: 2012, month: 7, day: 11 })), { year: 1462, month: 1, day: 1 });
    assert.deepEqual(jdnToArmenian(g(2026, 7, 20)), { year: 1475, month: 13, day: 5 });
  });

  it("keeps the Hebrew new years and feasts", () => {
    assert.equal(iso(hebrewNewYear(5787)), "2026-09-12");
    assert.equal(iso(hebrewNewYear(5786)), "2025-09-23");
    assert.deepEqual(jdnToHebrew(g(2026, 4, 2)), { year: 5786, month: "nisan", day: 15 });
    assert.deepEqual(jdnToHebrew(g(2026, 9, 21)), { year: 5787, month: "tishri", day: 10 });
    assert.deepEqual(jdnToJulian(hebrewNewYear(1)), { year: -3760, month: 10, day: 7 });
  });

  it("follows the Umm al-Qura calendar for the Islamic months", () => {
    assert.deepEqual(jdnToIslamic(g(2026, 2, 18)), { year: 1447, month: 9, day: 1 });
    assert.deepEqual(jdnToIslamic(julianToJdn({ year: 622, month: 7, day: 16 })), { year: 1, month: 1, day: 1 });
  });

  it("puts Naw-Rúz on the equinox and Ayyám-i-Há before the last month", () => {
    assert.deepEqual(jdnToBahai(g(2026, 3, 21)), { year: 183, month: 1, day: 1 });
    assert.deepEqual(jdnToBahai(g(2026, 3, 20)), { year: 182, month: 19, day: 19 });
    // 182 BE runs from 20 March 2025 to 20 March 2026: 366 days, so 5 days of Ayyám-i-Há.
    assert.deepEqual(jdnToBahai(g(2026, 2, 25)), { year: 182, month: 0, day: 1 });
    assert.deepEqual(jdnToBahai(g(2026, 3, 1)), { year: 182, month: 0, day: 5 });
    assert.deepEqual(jdnToBahai(g(2026, 3, 2)), { year: 182, month: 19, day: 1 });
    assert.deepEqual(jdnToBahai(g(2027, 3, 1)), { year: 183, month: 0, day: 4 });
    assert.deepEqual(jdnToBahai(g(2027, 3, 2)), { year: 183, month: 19, day: 1 });
    // Before 2015 the calendar of the West fixed Naw-Rúz on 21 March.
    assert.deepEqual(jdnToBahai(g(2014, 3, 21)), { year: 171, month: 1, day: 1 });
    assert.deepEqual(jdnToBahai(g(1844, 3, 21)), { year: 1, month: 1, day: 1 });
    assert.equal(jdnToBahai(g(1844, 3, 20)), undefined);
    assert.deepEqual(jdnToBahai(g(2064, 3, 19)), { year: 220, month: 19, day: 19 });
    assert.equal(jdnToBahai(g(2064, 3, 20)), undefined);
  });

  it("begins the Persian year at Nowruz with the 33-year rule", () => {
    assert.deepEqual(jdnToPersian(g(2026, 3, 21)), { year: 1405, month: 1, day: 1 });
    assert.deepEqual(jdnToPersian(g(2026, 3, 20)), { year: 1404, month: 12, day: 29 });
    assert.deepEqual(jdnToPersian(g(2025, 3, 20)), { year: 1403, month: 12, day: 30 });
    assert.deepEqual([1399, 1403, 1404, 1408].map(isPersianLeap), [true, true, false, true]);
  });

  it("begins the Indian national year on 22 March, or 21 March in leap years", () => {
    assert.deepEqual(jdnToIndian(g(2026, 3, 22)), { year: 1948, month: 1, day: 1 });
    assert.deepEqual(jdnToIndian(g(2026, 3, 21)), { year: 1947, month: 12, day: 30 });
    assert.deepEqual(jdnToIndian(g(2024, 3, 21)), { year: 1946, month: 1, day: 1 });
    assert.deepEqual(jdnToIndian(g(1957, 3, 22)), { year: 1879, month: 1, day: 1 });
  });

  it("begins the Nanakshahi months on fixed days", () => {
    assert.deepEqual(jdnToNanakshahi(g(2026, 3, 14)), { year: 558, month: 1, day: 1 });
    assert.deepEqual(jdnToNanakshahi(g(2026, 4, 14)), { year: 558, month: 2, day: 1 });
    assert.deepEqual(jdnToNanakshahi(g(2026, 10, 15)), { year: 558, month: 8, day: 1 });
    assert.deepEqual(jdnToNanakshahi(g(2027, 3, 13)), { year: 558, month: 12, day: 30 });
    assert.deepEqual(jdnToNanakshahi(g(2028, 3, 13)), { year: 559, month: 12, day: 31 });
  });

  it("counts the Japanese eras from 1873", () => {
    assert.deepEqual(jdnToJapanese(g(2019, 4, 30)), { era: "heisei", year: 31, month: 4, day: 30 });
    assert.deepEqual(jdnToJapanese(g(2019, 5, 1)), { era: "reiwa", year: 1, month: 5, day: 1 });
    assert.deepEqual(jdnToJapanese(g(1873, 1, 1)), { era: "meiji", year: 6, month: 1, day: 1 });
    assert.equal(jdnToJapanese(g(1872, 12, 31)), undefined);
  });

  it("takes the Chinese months from the Hong Kong Observatory", () => {
    assert.deepEqual(["2025", "2026", "2027", "2033", "2100"].map((y) => iso(chineseNewYear(Number(y)))), ["2025-01-29", "2026-02-17", "2027-02-06", "2033-01-31", "2100-02-09"]);
    // ICU puts this New Year on 7 February: the new Moon falls a few minutes before midnight in China.
    assert.deepEqual(jdnToChinese(g(2027, 2, 6)), { year: 2027, month: 1, leap: false, day: 1 });
    assert.deepEqual(jdnToChinese(g(2027, 2, 5)), { year: 2026, month: 12, leap: false, day: 29 });
    assert.deepEqual(jdnToChinese(g(2025, 7, 25)), { year: 2025, month: 6, leap: true, day: 1 });
    assert.deepEqual(jdnToChinese(g(2025, 8, 23)), { year: 2025, month: 7, leap: false, day: 1 });
    assert.deepEqual(jdnToChinese(g(2033, 12, 22)), { year: 2033, month: 11, leap: true, day: 1 });
    assert.deepEqual(jdnToChinese(g(1901, 2, 19)), { year: 1901, month: 1, leap: false, day: 1 });
    assert.equal(jdnToChinese(g(1901, 2, 18)), undefined);
    assert.equal(jdnToChinese(g(2100, 2, 9)), undefined);
  });

  it("agrees with ICU on the arithmetic calendars", () => {
    const format = (calendar: string, options: Intl.DateTimeFormatOptions = {}) =>
      new Intl.DateTimeFormat(`en-u-ca-${calendar}-nu-latn`, { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric", ...options });
    const parts = (f: Intl.DateTimeFormat, jdn: number): Record<string, string> => Object.fromEntries(f.formatToParts(jdnToDate(jdn)).map((p) => [p.type, p.value]));
    const hebrew = format("hebrew", { month: "long" });
    const hebrewMonths: Record<string, string> = { Tishri: "tishri", Heshvan: "heshvan", Kislev: "kislev", Tevet: "tevet", Shevat: "shevat", "Adar I": "adar1", "Adar II": "adar2", Adar: "adar", Nisan: "nisan", Iyar: "iyar", Sivan: "sivan", Tamuz: "tammuz", Av: "av", Elul: "elul" };
    const numeric: Array<[string, (jdn: number) => { year: number; month: number; day: number } | undefined, Intl.DateTimeFormat]> = [
      ["persian", jdnToPersian, format("persian")],
      ["indian", jdnToIndian, format("indian")],
      ["coptic", jdnToCoptic, format("coptic")],
      ["ethiopic", jdnToEthiopian, format("ethiopic")],
      ["buddhist", jdnToBuddhist, format("buddhist")],
      ["japanese", jdnToJapanese, format("japanese")],
    ];
    // Every 11th day from 1900 to 2100, and every day of 2026 and 2027.
    const days = new Set<number>();
    for (let jdn = g(1900, 1, 1); jdn <= g(2100, 12, 31); jdn += 11) days.add(jdn);
    for (let jdn = g(2026, 1, 1); jdn <= g(2027, 12, 31); jdn++) days.add(jdn);
    for (const jdn of days) {
      const h = jdnToHebrew(jdn);
      const ph = parts(hebrew, jdn);
      assert.deepEqual(h, { year: Number(ph.year), month: hebrewMonths[ph.month ?? ""], day: Number(ph.day) }, `hebrew ${iso(jdn)}`);
      for (const [name, convert, f] of numeric) {
        const ours = convert(jdn);
        if (!ours) continue;
        const p = parts(f, jdn);
        assert.deepEqual([ours.year, ours.month, ours.day], [Number(p.year), Number(p.month), Number(p.day)], `${name} ${iso(jdn)}`);
      }
    }
  });
});

describe("calendar pages", () => {
  const dir = join(REPO_ROOT, "docs", "calendars");
  const sections: Record<string, string[]> = {
    ro: ["Descriere", "Istorie", "Metoda de calcul", "Referințe"],
    en: ["Description", "History", "Method of calculation", "References"],
  };

  for (const lang of Object.keys(sections)) {
    it(`describes every calendar in ${lang}`, () => {
      const files = readdirSync(join(dir, lang)).filter((f) => f.endsWith(".md"));
      assert.deepEqual(files.map((f) => f.slice(0, -3)).sort(), [...CALENDAR_IDS].sort());
      for (const file of files) {
        const parts = splitFrontMatter(readFileSync(join(dir, lang, file), "utf8").replace(/\r\n/g, "\n"));
        assert.ok(parts, `${lang}/${file}: front matter`);
        const front = parseYaml(parts.frontMatter) as Record<string, unknown>;
        for (const key of ["title", "label", "summary"]) assert.equal(typeof front[key], "string", `${lang}/${file}: ${key}`);
        assert.deepEqual([...parts.body.matchAll(/^## (.+)$/gm)].map((m) => m[1]), sections[lang], `${lang}/${file}: sections`);
        for (const [, target] of parts.body.matchAll(/\]\(([^)#]+\.md)(?:#[^)]*)?\)/g)) {
          assert.ok((CALENDAR_IDS as string[]).includes(target?.slice(0, -3) ?? ""), `${lang}/${file}: link to ${target}`);
        }
      }
    });
  }
});
