import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  copticToJdn,
  ethiopianToJdn,
  formatYmd,
  gregorianToJdn,
  jdnToCoptic,
  jdnToGregorian,
  jdnToJulian,
  paschaJdn,
} from "../tools/lib/calendar.ts";
import { buildYear, compareWithOverrides, loadTradition, unresolved, type Day } from "../tools/lib/days.ts";
import { loadSchemas } from "../tools/lib/schemas.ts";
import { REPO_ROOT } from "../tools/lib/validate.ts";

const DATA = join(REPO_ROOT, "data");
const g = (y: number, m: number, d: number): number => gregorianToJdn({ year: y, month: m, day: d });
const iso = (jdn: number): string => formatYmd(jdnToGregorian(jdn));

const cache = new Map<string, Map<string, Day>>();
function days(tradition: string, year: number): Map<string, Day> {
  const key = `${tradition}/${year}`;
  let byDate = cache.get(key);
  if (!byDate) {
    byDate = new Map(buildYear(loadTradition(DATA, tradition), year).map((d) => [d.date, d]));
    cache.set(key, byDate);
  }
  return byDate;
}
function day(tradition: string, date: string): Day {
  const d = days(tradition, Number(date.slice(0, 4))).get(date);
  assert.ok(d, `${tradition} ${date}`);
  return d;
}
const comms = (tradition: string, date: string): string[] => day(tradition, date).lines.flatMap((l) => l.commemorations);
const datesOf = (tradition: string, year: number, comm: string): string[] =>
  [...days(tradition, year).values()].filter((d) => d.lines.some((l) => l.commemorations.includes(comm))).map((d) => d.date);

describe("calendar arithmetic", () => {
  it("converts 7 Nov 2026 to 25 Oct (Julian) and 28 Paopi 1743 (Coptic)", () => {
    assert.deepEqual(jdnToJulian(g(2026, 11, 7)), { year: 2026, month: 10, day: 25 });
    assert.deepEqual(jdnToCoptic(g(2026, 11, 7)), { year: 1743, month: 2, day: 28 });
  });
  it("starts the Coptic year 1743 and the Ethiopian year 2019 on 11 Sep 2026", () => {
    assert.equal(iso(copticToJdn({ year: 1743, month: 1, day: 1 })), "2026-09-11");
    assert.equal(iso(ethiopianToJdn({ year: 2019, month: 1, day: 1 })), "2026-09-11");
  });
  it("puts Christmas on the old style on 7 Jan 2027", () => assert.deepEqual(jdnToJulian(g(2027, 1, 7)), { year: 2026, month: 12, day: 25 }));

  const orthodox: Array<[number, string]> = [
    [2024, "2024-05-05"],
    [2025, "2025-04-20"],
    [2026, "2026-04-12"],
    [2027, "2027-05-02"],
    [2028, "2028-04-16"],
    [2030, "2030-04-28"],
    [2033, "2033-04-24"],
  ];
  for (const [year, date] of orthodox) {
    it(`Orthodox Pascha ${year} is ${date}`, () => assert.equal(iso(paschaJdn(year, "julian")), date));
  }
  const western: Array<[number, string]> = [
    [2024, "2024-03-31"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2030, "2030-04-21"],
  ];
  for (const [year, date] of western) {
    it(`Gregorian Easter ${year} is ${date}`, () => assert.equal(iso(paschaJdn(year, "gregorian")), date));
  }
});

describe("Romanian Orthodox Church, 2026 (against the official calendar)", () => {
  const data = loadTradition(DATA, "romanian");
  const computed = new Map<string, Day>(buildYear(data, 2026, false).map((d) => [d.date, d]));
  const official = data.overrides.get(2026)?.days as Array<Record<string, any>>;

  for (const o of official) {
    for (const key of ["tone", "eothinon", "fasting"] as const) {
      if (o[key] === undefined) continue;
      it(`${o.date}: ${key} ${o[key]}`, () => assert.equal(computed.get(o.date)?.[key], o[key]));
    }
  }
  it("agrees with every official tone, eothinon and fasting value", () => assert.deepEqual(compareWithOverrides(data, 2026), []));

  it("puts the fixed lines of 7 November in calendar order", () =>
    assert.deepEqual(comms("romanian", "2026-11-07").slice(0, 2), ["comm:33-martyrs-of-melitene", "comm:lazarus-of-galesion--repose"]));
  it("puts Moșii de toamnă on Saturday 7 November", () => assert.ok(comms("romanian", "2026-11-07").includes("comm:memorial-saturday-autumn")));
  it("describes 7 November in both styles and relative to Pascha", () => {
    const d = day("romanian", "2026-11-07");
    assert.equal(d.church_calendar, "revised_julian");
    assert.equal(d.church_date, "11-07");
    assert.equal(d.julian_date, "2026-10-25");
    assert.equal(d.pascha_offset, 209);
  });
  it("puts Pascha first on 12 April and Thomas Sunday on 19 April", () => {
    assert.equal(comms("romanian", "2026-04-12")[0], "comm:pascha");
    assert.ok(comms("romanian", "2026-04-19").includes("comm:thomas-sunday"));
  });
  it("gives no tone and no eothinon on Palm Sunday or in Holy Week", () => {
    const palm = day("romanian", "2026-04-05");
    assert.equal(palm.tone, undefined);
    assert.equal(palm.eothinon, undefined);
    assert.equal(day("romanian", "2026-04-08").tone, undefined);
  });
  it("puts St John Cassian on 28 February in a common year", () =>
    assert.deepEqual(day("romanian", "2026-02-28").lines[0]?.commemorations, ["comm:john-cassian--repose", "comm:germanus-of-dobruja--repose"]));
  it("marks Christmas, Good Friday and the Dormition as public holidays", () => {
    assert.ok(day("romanian", "2026-12-25").observances?.includes("christmas-day-1"));
    assert.ok(day("romanian", "2026-04-10").observances?.includes("good-friday"));
    assert.equal(day("romanian", "2026-08-15").flags?.public_holiday, true);
  });
  it("counts the days of the forefeast of the Nativity", () =>
    assert.deepEqual(day("romanian", "2026-12-22").ongoing, [{ commemoration: "comm:nativity-of-christ--forefeast", day: 3, of: 5 }]));
  it("marks the days that carry facts from the official calendar", () => {
    assert.equal(day("romanian", "2026-11-08").official, true);
    assert.equal(day("romanian", "2026-11-09").official, undefined);
  });
});

describe("Romanian Orthodox Church, other years", () => {
  it("puts St John Cassian on 29 February in a leap year", () => {
    assert.ok(comms("romanian", "2028-02-29").includes("comm:john-cassian--repose"));
    assert.ok(!comms("romanian", "2028-02-28").includes("comm:john-cassian--repose"));
  });
  it("uses the old style before the 1924 reform (12 days apart until February 1900)", () => {
    const d = day("romanian", "1900-01-06");
    assert.equal(d.church_calendar, "julian");
    assert.equal(d.church_date, "12-25");
    assert.ok(d.lines.some((l) => l.commemorations.includes("comm:nativity-of-christ")));
  });
  it("makes Good Friday a public holiday only from 2018", () => {
    assert.equal(day("romanian", "2017-04-14").flags, undefined);
    assert.equal(day("romanian", "2018-04-06").flags?.public_holiday, true);
  });
  it("keeps St George on 23 April when it falls in Lent (2024)", () =>
    assert.deepEqual(datesOf("romanian", 2024, "comm:george-the-great-martyr--repose"), ["2024-04-23"]));
  it("moves St George to Bright Monday when 23 April falls in Holy Week (2033)", () => {
    assert.deepEqual(datesOf("romanian", 2033, "comm:george-the-great-martyr--repose"), ["2033-04-25"]);
    const line = day("romanian", "2033-04-25").lines.find((l) => l.commemorations.includes("comm:george-the-great-martyr--repose"));
    assert.equal(line?.transferred_from, "2033-04-23");
  });
  it("lists the proper readings of a feast when there is no official calendar for the year", () => {
    const readings = day("romanian", "2027-12-06").readings ?? [];
    assert.ok(readings.some((r) => r.ref === "HEB 13:17-21" && r.of === "commemoration"));
  });
  it("finds Moșii de toamnă on the Saturday before 8 November in 2027", () =>
    assert.deepEqual(datesOf("romanian", 2027, "comm:memorial-saturday-autumn"), ["2027-11-06"]));
});

describe("other traditions", () => {
  it("Russian: 7 Nov 2026 civil is 25 Oct in the Menaion (Marcian and Martyrius)", () => {
    const d = day("russian", "2026-11-07");
    assert.equal(d.church_date, "10-25");
    assert.ok(d.lines.some((l) => l.commemorations.includes("comm:marcian-and-martyrius-the-notaries")));
  });
  it("Russian: St Nicholas on 19 Dec and the Nativity on 7 Jan (civil)", () => {
    assert.ok(comms("russian", "2026-12-19").includes("comm:nicholas-of-myra--repose"));
    assert.ok(comms("russian", "2027-01-07").includes("comm:nativity-of-christ"));
  });
  it("Russian: St John Cassian on 28 Feb old style (13 Mar civil) in a common year", () =>
    assert.ok(comms("russian", "2026-03-13").includes("comm:john-cassian--repose")));
  it("Russian: no computed fasting (no fasting model)", () => assert.equal(day("russian", "2026-03-13").fasting, undefined));
  it("Coptic: Marcian and Martyrius on 28 Paopi = 7 Nov 2026, Michael on the 12th of every month", () => {
    assert.ok(comms("coptic", "2026-11-07").includes("comm:marcian-and-martyrius-the-notaries"));
    const michael = datesOf("coptic", 2026, "comm:archangel-michael--coptic-monthly");
    assert.equal(michael.length, 12);
    assert.ok(michael.includes("2026-11-21"));
  });
  it("Coptic: St Dioscorus on 7 Thout = 17 Sep 2026", () => {
    const d = day("coptic", "2026-09-17");
    assert.equal(d.church_calendar, "coptic");
    assert.equal(d.church_date, "01-07");
    assert.ok(d.lines.some((l) => l.commemorations.includes("comm:dioscorus-of-alexandria--repose")));
  });
  it("Ecumenical Patriarchate: St George moves to Bright Monday when 23 April falls before Pascha", () => {
    assert.deepEqual(datesOf("ecumenical", 2024, "comm:george-the-great-martyr--repose"), ["2024-05-06"]);
    assert.deepEqual(datesOf("ecumenical", 2033, "comm:george-the-great-martyr--repose"), ["2033-04-25"]);
  });
  it("Armenian: reports the commemorations whose rule is not known yet", () =>
    assert.deepEqual(unresolved(loadTradition(DATA, "armenian")), ["comm:gregory-the-illuminator--deliverance-from-the-pit"]));
});

describe("generated days", () => {
  const validateDay = loadSchemas(join(REPO_ROOT, "schema")).get("build/day.schema.json");
  const traditions = ["romanian", "ecumenical", "greece", "russian", "serbian", "coptic", "armenian", "assyrian"];
  for (const tradition of traditions) {
    it(`${tradition}: every day of 1900, 2024, 2026, 2028 and 2033 matches the output schema`, () => {
      for (const year of [1900, 2024, 2026, 2028, 2033]) {
        const all = [...days(tradition, year).values()];
        assert.equal(all.length, year % 4 === 0 && year !== 1900 ? 366 : 365);
        for (const d of all) assert.ok(validateDay(d), `${tradition} ${d.date}: ${JSON.stringify(validateDay.errors)}`);
      }
    });
  }
});
