import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nominative, parseKa } from "../tools/lib/import/ka.ts";
import { equivalent } from "../tools/lib/import/names.ts";
import { parseDay, yearDays } from "../tools/lib/import/sources/patriarchate-ge.ts";

describe("Georgian calendar titles", () => {
  it("puts names from the genitive in the nominative", () => {
    assert.equal(nominative("დიმიტრისა"), "დიმიტრი");
    assert.equal(nominative("იოანესი"), "იოანე");
    assert.equal(nominative("მალაქიასი"), "მალაქია");
    assert.equal(nominative("გრიგოლისა"), "გრიგოლ");
  });
  it("reads a martyr, with the year left out", () => {
    const [part] = parseKa("მოწამისა დიმიტრისა (დაახლ. 307);");
    assert.equal(part?.parsed.kind, "saint");
    assert.ok(part?.parsed.holiness.includes("martyr"));
    assert.equal(part?.parsed.names[0]?.eq, equivalent("Demetrius"));
    assert.equal(part?.names[0]?.display, "მოწამე დიმიტრი");
  });
  it("reads a list of names after a plural rank", () => {
    const [part] = parseKa("მოწამეთა: გურისა, სამონისა (299-306) და აბიბოსი - აღმსარებელთა (322);");
    assert.equal(part?.parsed.kind, "saints");
    assert.deepEqual(part?.parsed.names.map((n) => n.key), ["gr", "smn", "ab"]);
    assert.ok(part?.parsed.holiness.includes("martyr") && part.parsed.holiness.includes("confessor"));
  });
  it("tells the offices and places that describe a name from more names", () => {
    const [part] = parseKa("მღვდელმოწამე თეოგენესი, პარიელი ეპისკოპოსისა (320);");
    assert.equal(part?.parsed.names.length, 1);
    assert.ok(part?.parsed.holiness.includes("hierarch"));
    const [mother] = parseKa("წმიდისა ემილიასი, წმიდა ბასილი დიდის დედისა (IV).");
    assert.equal(mother?.parsed.names.length, 1);
    assert.match(mother?.en ?? "", /mother of Basil the Great/);
  });
  it("reads an office or a people before the name", () => {
    const [part] = parseKa("მიცვალება ქართველთა კეთილმორწმუნე მეფისა თამარისა (1213);");
    assert.equal(part?.parsed.names[0]?.given, "Tamar");
    assert.ok(part?.parsed.holiness.includes("right_believing"));
  });
  it("splits several commemorations of one line", () => {
    assert.equal(parseKa("ღირ. ფოსტირიოს მეუდაბნოისა; ღირ. მინასი (VI);").length, 2);
    assert.equal(parseKa("მღვდელმოწამისა ათანასე ეპისკოპოსისა (270-275), ღირსისა ანთუსასი (დაახ. 298)").length, 2);
  });
  it("reads a group with its number of companions", () => {
    const [part] = parseKa("მღვდელმოწ. ისიდორე ხუცისა და მისთანა 72 მოწამეთა (1472).");
    assert.equal(part?.parsed.kind, "group");
    assert.equal(part?.parsed.count, 72);
  });
  it("reads the feasts and the equals of the apostles", () => {
    assert.equal(parseKa("წინადაცვეთა უფლისა ჩვენისა იესო ქრისტესი")[0]?.parsed.feast, "circumcision-of-the-lord");
    const [nina] = parseKa("წმიდისა დედისა ჩვენისა და მოციქულთა სწორისა, ქალწულისა ნინოსი, ქართველთა განმანათლებელისა (IV);");
    assert.ok(nina?.parsed.holiness.includes("equal_to_apostles"));
    assert.equal(nina?.parsed.names[0]?.given, "Nina");
  });
  it("leaves out the movable days typed in as fixed", () => {
    assert.equal(parseKa("ღირსისა შიო მღვიმელისა (VI), შიოობა*;").some((p) => p.parsed.kind === "skip"), true);
  });
  it("names no one after a place or a deed, and leaves such a line for review", () => {
    const [part] = parseKa("მარტიროპოლში წამებულ სპარსელთა (IV);");
    assert.equal(part?.parsed.kind, "event");
    assert.equal(part?.parsed.names.length, 0);
    assert.equal(parseKa("ღირსისა სერაფიმე საროველისა, სასწაულთმოქმედისა (1833)").length, 1);
  });
});

describe("the calendar of the Patriarchate of Georgia", () => {
  const page = (texts: unknown[], notes: string): string =>
    `<script data-page="app" type="application/json">${JSON.stringify({
      props: { day: { date: "2026-03-22", old_month_day: "03-09", categories: [{ code: "saints", texts }, { code: "notes", texts: [{ title: notes }] }] } },
    })}</script>`;
  it("reads a day's commemorations with their Menaion date", () => {
    const [e] = parseDay(page([{ id: 3225, title: "მოწამისა დიმიტრისა;", old_month_day: "03-09", mode: "fixed", position: 20 }], ""));
    assert.deepEqual([e?.id, e?.month, e?.day, e?.mode], [3225, 3, 9, "fixed"]);
  });
  it("gives as movable a starred line that the day's note says is movable", () => {
    const [e] = parseDay(page([{ id: 1, title: "ღირსისა იოანე კლემაქსისა (649)*;", mode: "fixed" }], "* გარდამავალია, აღინიშნება დიდმარხვის მეოთხე კვირას."));
    assert.equal(e?.mode, "movable");
  });
  it("reads the 29 February first", () => assert.equal(yearDays()[0], "2024-03-13"));
});
