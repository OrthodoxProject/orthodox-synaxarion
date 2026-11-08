import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { FastingLevel } from "../tools/lib/calendar.ts";
import { Builder } from "../tools/lib/import/build.ts";
import { parseEn } from "../tools/lib/import/en.ts";
import { loadExisting } from "../tools/lib/import/existing.ts";
import { fastingNote, mergeFasting, officialFasting } from "../tools/lib/import/fasting.ts";
import { givenSimilarity, skeleton } from "../tools/lib/import/names.ts";
import { abbreviateRo, parseRo } from "../tools/lib/import/ro.ts";
import { isAllowed, parseRobots } from "../tools/lib/import/robots.ts";
import { parseMonth } from "../tools/lib/import/sources/doxologia.ts";
import { parseDay } from "../tools/lib/import/sources/oca.ts";
import { splitTitle, type PatriarhiaDay, type PatriarhiaItem } from "../tools/lib/import/sources/patriarhia.ts";
import { doxologiaUnits, ocaUnits, type SourceData } from "../tools/lib/import/units.ts";
import { REPO_ROOT } from "../tools/lib/validate.ts";

describe("robots.txt", () => {
  it("lets Allow win a tie with Disallow (RFC 9309)", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /\n\nAllow: /\nAllow: /home/\n", "orthodox-synaxarion-importer");
    assert.equal(isAllowed(rules, "/calendar-entry-26/x/"), true);
  });
  it("keeps the longest match and the crawl delay", () => {
    const rules = parseRobots("User-agent: *\nDisallow: /files/PDF/\nCrawl-delay: 10\n", "orthodox-synaxarion-importer");
    assert.equal(rules.crawlDelay, 10);
    assert.equal(isAllowed(rules, "/files/PDF/a.pdf"), false);
    assert.equal(isAllowed(rules, "/saints/lives/2026/01/01"), true);
  });
  it("applies the group of the product token when there is one", () => {
    const text = "User-agent: orthodox-synaxarion-importer\nDisallow: /private/\n\nUser-agent: *\nDisallow: /\n";
    const rules = parseRobots(text, "orthodox-synaxarion-importer");
    assert.equal(isAllowed(rules, "/calendar"), true);
    assert.equal(isAllowed(rules, "/private/x"), false);
  });
});

describe("name keys", () => {
  const same = [
    ["Pigasie", "Pegasius"],
    ["Achindin", "Acindynus"],
    ["Aftonie", "Aphthonius"],
    ["Elpidifor", "Elpidephorus"],
    ["Teonas", "Theonas"],
    ["Hristofor", "Christopher"],
    ["Varvara", "Barbara"],
  ];
  for (const [ro, en] of same) it(`${ro} ~ ${en}`, () => assert.equal(skeleton(ro ?? ""), skeleton(en ?? "")));
  it("knows irregular equivalents", () => {
    const a = parseRo("Sfântul Ierarh Ioan Gură de Aur").names[0];
    const b = parseEn("Saint John Chrysostom").names[0];
    assert.ok(a && b);
    assert.equal(givenSimilarity(a, b), 1);
  });
});

describe("Romanian titles", () => {
  it("reads a saint", () => {
    const p = parseRo("Sfântul Cuvios Lazăr din Muntele Galision");
    assert.equal(p.kind, "saint");
    assert.deepEqual(p.holiness, ["venerable"]);
    assert.equal(p.gender, "male");
    assert.equal(p.names[0]?.given, "Lazăr");
  });
  it("reads several saints of an official line", () => {
    const p = parseRo("Sf. Ier. Atanasie și Chiril, arhiepiscopii Alexandriei");
    assert.equal(p.kind, "saints");
    assert.deepEqual(p.names.map((n) => n.given), ["Atanasie", "Chiril"]);
  });
  it("keeps offices with the name", () => {
    const p = parseRo("Sfântul Ierarh Vasile cel Mare, Arhiepiscopul Cezareei Capadociei");
    assert.equal(p.kind, "saint");
    assert.equal(p.names.length, 1);
  });
  it("reads a numbered group", () => {
    const p = parseRo("Sfinții 40 de Mucenici din Sevastia");
    assert.equal(p.kind, "group");
    assert.equal(p.count, 40);
  });
  it("tells the kinds of holiness apart", () => {
    assert.deepEqual(parseRo("Sf. Mare Mc. Teodor Tiron").holiness, ["great_martyr"]);
    assert.deepEqual(parseRo("Sf. Sfințit Mc. Haralambie").holiness, ["hieromartyr"]);
    assert.deepEqual(parseRo("Sf. Cuv. Mc. Anastasie Persul").holiness, ["venerable_martyr"]);
  });
  it("recognises feasts, relics, icons and movable days", () => {
    assert.equal(parseRo("Botezul Domnului (Boboteaza)").feast, "theophany");
    assert.equal(parseRo("Înainte-prăznuirea Nașterii Domnului").kind, "forefeast");
    const relics = parseRo("Aducerea moaștelor Sfântului Ierarh Nicolae la Bari");
    assert.equal(relics.kind, "relics_translation");
    assert.equal(relics.subject?.names[0]?.given, "Nicolae");
    assert.equal(parseRo("Cinstirea Sfintei Icoane a Maicii Domnului din Kazan").kind, "icon");
    assert.equal(parseRo("Duminica a 24-a după Rusalii").kind, "movable");
    assert.equal(parseRo("Sfânta și Marea Joi").kind, "movable");
  });
  it("abbreviates as the official calendar does", () => {
    assert.equal(abbreviateRo("Sfântul Mucenic Pigasie"), "Sf. Mc. Pigasie");
    assert.equal(abbreviateRo("Sfânta Cuvioasă Parascheva"), "Sf. Cuv. Parascheva");
  });
});

describe("English titles", () => {
  it("reads a saint", () => {
    const p = parseEn("Venerable Gregory the Decapolite");
    assert.equal(p.kind, "saint");
    assert.deepEqual(p.holiness, ["venerable"]);
  });
  it("reads saints with their own honorifics", () => {
    const p = parseEn("Hieromartyr Theopemptus, Bishop of Nicomedia, and Martyr Theonas");
    assert.deepEqual(p.names.map((n) => n.given), ["Theopemptus", "Theonas"]);
  });
  it("does not take a second place for a second saint", () => {
    assert.equal(parseEn("Venerable Makarios of Pisma and Kostroma").names.length, 1);
  });
  it("reads groups, feasts and relics", () => {
    assert.equal(parseEn("40 Holy Martyrs of Sebaste").count, 40);
    assert.equal(parseEn("Martyr Quadratus and those with him at Corinth").kind, "group");
    assert.equal(parseEn("Feast of the Theophany of our Lord and Savior Jesus Christ").feast, "theophany");
    assert.equal(parseEn("Translation of the relics of Saint John Chrysostom, Archbishop of Constantinople").kind, "relics_translation");
    assert.equal(parseEn("Sunday of the Prodigal Son").kind, "movable");
  });
});

describe("source pages", () => {
  it("splits an official title with its crosses and colours", () => {
    const items = splitTitle('<h2>Sf. Ier. Grigorie, episcopul Nyssei; <span style="color: #1c58bb">†) Sf. Cuv. Antipa de la Calapodești; </span>Sf. Ier. Dometian</h2>');
    assert.deepEqual(
      items.map((i) => [i.text, i.cross, i.color]),
      [
        ["Sf. Ier. Grigorie, episcopul Nyssei", null, "black"],
        ["Sf. Cuv. Antipa de la Calapodești", "†)", "blue"],
        ["Sf. Ier. Dometian", null, "black"],
      ],
    );
  });
  it("reads a month of doxologia.ro", () => {
    const html = '<div class="calendar-calendar"><div class="month-view"><div class="large-12 cell grid-x"><div class="large-1 cell"><a href="/2-noiembrie" class="a-initday"><div class="initday">2 L</div></a></div><div class="large-11 cell"><div class="calendar-zi "><a href="/sfantul-mucenic-pigasie" class=""> Sfântul Mucenic Pigasie</a><a href="/sfantul-ierarh-nectarie" class="albastru">✝ Sfântul Ierarh Nectarie</a> <a href="/ev-luca-10-22-24" target="_blank" class="ev-zi">Ev. Luca 10, 22-24</a> </div></div></div></div></div>';
    const days = parseMonth(html, 11);
    assert.deepEqual(
      days.map((d) => [d.day, d.slug, d.title, d.color, d.cross]),
      [
        [2, "sfantul-mucenic-pigasie", "Sfântul Mucenic Pigasie", null, null],
        [2, "sfantul-ierarh-nectarie", "Sfântul Ierarh Nectarie", "blue", "✝"],
      ],
    );
  });
  it("reads a day of the OCA lives", () => {
    const html = '<section class="saints"><article class="saint"><h2 class="name">Venerable Gregory the Decapolite <!-- 103340--></h2><a href="/saints/lives/2026/11/20/103340-venerable-gregory-the-decapolite" class="button"><span>Read the Life</span></a></article></section>';
    const listings = parseDay(html, 2026, 11, 20);
    assert.equal(listings.length, 1);
    assert.equal(listings[0]?.id, "103340");
    assert.equal(listings[0]?.title, "Venerable Gregory the Decapolite");
  });
});

describe("official fasting", () => {
  it("reads the fasting notes of a title", () => {
    assert.equal(fastingNote("(†) Intrarea în biserică a Maicii Domnului (Dezlegare la pește)"), "fish");
    assert.equal(fastingNote("† Sf. Anastasia; Sf. Proroc Naum (Tedeum. Dezlegare la peşte)"), "fish");
    assert.equal(fastingNote("(†) Nașterea Domnului (Crăciunul. Harți)"), "fast_free");
    assert.equal(fastingNote("Sf. Mc. Teopempt și Teona (Ajunul Botezului Domnului. Post)"), "strict");
    assert.equal(fastingNote("Sf. Ier. Leon, episcopul Romei (Zi aliturgică. Dezlegare la brânză, lapte, ouă şi peşte)"), "no_meat");
    assert.equal(fastingNote("†) Sf. Cuv. Paisie de la Neamţ (Începutul Postului Naşterii Domnului); Ev. Luca 10, 25-37 (Pilda samarineanului milostiv)"), undefined);
  });

  const romanian = { id: "romanian", calendar_style: "revised_julian", calendar_history: [{ style: "julian", until: "1924-10-13" }], paschalion: "julian" };
  const official = (date: string, title: string, items: PatriarhiaItem[] = []): PatriarhiaDay => {
    const [year = 0, month = 0, day = 0] = date.split("-").map(Number);
    return { year, month, day, url: "", items, title, subtitle: "", publicHoliday: false };
  };
  it("takes the printed notes, and fish away where the model would give it and the calendar does not", () => {
    const levels = officialFasting(
      [
        official("2026-11-15", "†) Sf. Cuv. Paisie de la Neamţ (Începutul Postului Naşterii Domnului)", [{ text: "Sf. Cuv. Paisie de la Neamţ", cross: "†)", color: "blue" }]),
        official("2026-11-21", "(†) Intrarea în biserică a Maicii Domnului (Dezlegare la pește)", [{ text: "Intrarea în biserică a Maicii Domnului", cross: "(†)", color: "red" }]),
        official("2026-11-22", "Sf. Ap. Filimon, Arhip, Onisim şi Apfia"),
        official("2026-11-23", "† Sf. Cuv. Antonie de la Iezerul Vâlcii", [{ text: "Sf. Cuv. Antonie de la Iezerul Vâlcii", cross: "†", color: "blue" }]),
        official("2026-11-24", "Sf. Sfințiți Mc. Clement, episcopul Romei, și Petru, episcopul Alexandriei"),
      ],
      romanian,
    );
    assert.deepEqual(
      [...(levels.get(2026) ?? [])],
      [
        ["2026-11-21", "fish"],
        ["2026-11-22", "oil_wine"],
        ["2026-11-23", "strict"],
      ],
    );
  });

  it("adds the fasting to the yearly overrides without rewriting what is there", () => {
    const doc = {
      tradition: "romanian",
      year: 2026,
      source: { source: "src:calendar-patriarhia", url: "https://calendar.patriarhia.ro/", accessed: "2026-11-07" },
      days: [
        { date: "2026-11-28", readings: [{ service: "liturgy", role: "gospel", ref: "LUK 9:57-62" }] },
        { date: "2026-12-25", fasting: "fast_free", flags: { public_holiday: true } },
      ],
    };
    const levels = new Map<string, FastingLevel>([
      ["2026-11-28", "fish"],
      ["2026-11-21", "fish"],
      ["2026-12-25", "fish"],
    ]);
    const source = { source: "src:calendar-patriarhia", url: "https://calendar.patriarhia.ro/", accessed: "2026-11-08" };
    const merged = mergeFasting(doc, "romanian", 2026, levels, source);
    assert.equal(merged.added, 2);
    assert.equal(merged.kept, 1);
    assert.equal(merged.doc.source.accessed, "2026-11-08");
    const days = merged.doc.days as Array<Record<string, unknown>>;
    assert.deepEqual(
      days.map((d) => [d.date, d.fasting]),
      [
        ["2026-11-21", "fish"],
        ["2026-11-28", "fish"],
        ["2026-12-25", "fast_free"],
      ],
    );
    assert.deepEqual(Object.keys(days[1] ?? {}), ["date", "readings", "fasting"]);
    // A second run adds nothing and leaves the file as it is.
    assert.equal(mergeFasting(merged.doc, "romanian", 2026, levels, source).doc, merged.doc);
  });
});

describe("matching the sources", () => {
  const data: SourceData = {
    accessed: "2026-11-08",
    patriarhia: [],
    doxologia: [{ slug: "sfantul-mucenic-pigasie", title: "Sfântul Mucenic Pigasie", month: 1, day: 15, order: 0, color: null, cross: null, secondRow: false }],
    oca: [2026, 2028].map((year) => ({ id: "900001", title: "Martyrs Acindynus, Pegasius, and Aphthonius", path: `/saints/lives/${year}/01/15/900001-martyrs`, year, month: 1, day: 15, order: 0 })),
    coptic: [],
    armenian: [],
    overlays: [],
  };

  it("puts the Romanian and English names of a saint together", () => {
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(data), [], [{ month: 1, day: 15 }]);
    builder.russian(ocaUnits(data, [2026, 2028]).fixed);
    const pigasie = builder.clusters.find((c) => c.slots[0]?.ro?.display === "Sf. Mc. Pigasie");
    assert.ok(pigasie);
    assert.equal(pigasie.slots[0]?.en?.display, "Martyr Pegasius");
    // The two names the Romanian calendar does not have make a cluster of their own, on the same Russian line.
    const russian = builder.lines.get("russian")?.get("01-15") ?? [];
    assert.equal(russian.length, 1);
    assert.equal(russian[0]?.clusters.length, 2);
  });
});
