import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidBibleRef } from "../tools/lib/bible.ts";
import { isValidEdtf, isValidIsoDate, isValidMonthDay } from "../tools/lib/dates.ts";
import { classify } from "../tools/lib/layout.ts";

describe("EDTF dates", () => {
  for (const ok of ["1053-11-07", "1053", "0968~", "1053?", "03XX", "196X", "-0850", "1714-08-15%", "[1714,1716]", "{1714,1716}", "1688/1714", "../1053", "1053/..", "1600-02-29"]) {
    it(`accepts ${ok}`, () => assert.equal(isValidEdtf(ok), true));
  }
  for (const bad of ["", "53", "1053-13-01", "1053-02-30", "1601-02-29", "1714/1688", "/", "1053-11-7", "c. 1053", "[1714,]"]) {
    it(`rejects ${JSON.stringify(bad)}`, () => assert.equal(isValidEdtf(bad), false));
  }
});

describe("Bible references", () => {
  const books = new Set(["LUK", "GAL", "JHN", "HEB", "2CO", "PSA"]);
  for (const ok of ["LUK 8:16-21", "GAL 5:22-26; 6:1-2", "JHN 15:17-16:2", "HEB 11:9-10, 32-40", "2CO 8:1-5", "PSA 50:1"]) {
    it(`accepts ${ok}`, () => assert.equal(isValidBibleRef(ok, books), true));
  }
  for (const bad of ["Luca 8, 16-21", "LUK 8", "LUK 8:16-", "XYZ 1:1", "LUK 0:1", "LUK 8:16-21;"]) {
    it(`rejects ${JSON.stringify(bad)}`, () => assert.equal(isValidBibleRef(bad, books), false));
  }
});

describe("church dates", () => {
  it("accepts 29 February in the Menaion", () => assert.equal(isValidMonthDay(2, 29), true));
  it("rejects 30 February", () => assert.equal(isValidMonthDay(2, 30), false));
  it("rejects a 13th month outside the Coptic calendar", () => assert.equal(isValidMonthDay(13, 1), false));
  it("accepts Paopi 30 in the Coptic calendar", () => assert.equal(isValidMonthDay(2, 30, "coptic"), true));
  it("accepts the 6th epagomenal day", () => assert.equal(isValidMonthDay(13, 6, "coptic"), true));
  it("rejects a 7th epagomenal day", () => assert.equal(isValidMonthDay(13, 7, "ethiopian"), false));
  it("checks ISO dates", () => {
    assert.equal(isValidIsoDate("2026-11-07"), true);
    assert.equal(isValidIsoDate("2026-02-29"), false);
  });
});

describe("file layout", () => {
  it("knows core records", () => assert.deepEqual(classify("persons/nicholas-of-myra.json"), { kind: "core", collection: "persons", id: "nicholas-of-myra" }));
  it("knows Menaion days", () =>
    assert.deepEqual(classify("traditions/romanian/menaion/11/07.json"), { kind: "menaion", tradition: "romanian", month: "11", day: "07" }));
  it("knows locale files with a script subtag", () =>
    assert.deepEqual(classify("i18n/sr-Cyrl/persons/nicholas-of-myra.json"), { kind: "i18n", locale: "sr-Cyrl", collection: "persons", id: "nicholas-of-myra" }));
  it("knows long texts", () =>
    assert.deepEqual(classify("i18n/ro/persons/lazarus-of-galesion.md"), { kind: "text", locale: "ro", collection: "persons", id: "lazarus-of-galesion" }));
  it("rejects unknown places", () => assert.deepEqual(classify("persons/sub/x.json"), { kind: "unknown" }));
  it("rejects ids with capitals", () => assert.deepEqual(classify("persons/Nicholas.json"), { kind: "unknown" }));
});
