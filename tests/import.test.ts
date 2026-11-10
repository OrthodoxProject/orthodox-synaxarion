import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import type { FastingLevel } from "../tools/lib/calendar.ts";
import { Builder, namesForerunner, namesTheotokos } from "../tools/lib/import/build.ts";
import type { Cluster } from "../tools/lib/import/cluster.ts";
import { genderOfEnName, parseEn } from "../tools/lib/import/en.ts";
import { loadExisting } from "../tools/lib/import/existing.ts";
import { fastingNote, mergeFasting, officialFasting } from "../tools/lib/import/fasting.ts";
import { givenSimilarity, skeleton } from "../tools/lib/import/names.ts";
import { RecordWriter } from "../tools/lib/import/records.ts";
import { abbreviateRo, parseRo } from "../tools/lib/import/ro.ts";
import { isAllowed, parseRobots } from "../tools/lib/import/robots.ts";
import { parseMonth } from "../tools/lib/import/sources/doxologia.ts";
import { parseDay } from "../tools/lib/import/sources/oca.ts";
import { splitTitle, type PatriarhiaDay, type PatriarhiaItem } from "../tools/lib/import/sources/patriarhia.ts";
import { armenianUnits, cleanOverlayTitle, copticUnits, doxologiaUnits, julianMenaionDate, ocaUnits, overlayUnits, parseCopticTitle, patriarhiaUnits, type SourceData } from "../tools/lib/import/units.ts";
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
  it("knows Romanian names that a name key does not bring near the English ones (Leon / Leo, Crescent / Crescens, Uar / Varus)", () => {
    for (const [ro, en] of [
      ["Sfântul Ierarh Leon, Episcopul Cataniei", "Saint Leo, Bishop of Catania in Sicily"],
      ["Sfântul Apostol Crescent", "Apostle Crescens of the Seventy"],
      ["Sfântul Mucenic Uar", "Martyr Varus"],
    ]) {
      const a = parseRo(ro ?? "").names[0];
      const b = parseEn(en ?? "").names[0];
      assert.ok(a && b);
      assert.equal(givenSimilarity(a, b), 1, `${ro} / ${en}`);
    }
  });
  it("knows the OCA spellings of Evdochia, Evdochim and Valent (Eudokia, Eudocimus, Valens)", () => {
    for (const [ro, en] of [
      ["Sfânta Cuvioasă Muceniță Evdochia", "Martyr Eudokia of Heliopolis"],
      ["Sfântul și Dreptul Evdochim", "Righteous Eudocimus of Cappadocia"],
      ["Sfântul Mucenic Valent diaconul", "Martyr Valens the Deacon"],
    ]) {
      const a = parseRo(ro ?? "").names[0];
      const b = parseEn(en ?? "").names[0];
      assert.ok(a && b);
      assert.equal(givenSimilarity(a, b), 1, `${ro} / ${en}`);
    }
  });
  it("reads the Romanian Ev- before a consonant as the Eu- of the Greek names (Evsignie / Eusignius, Evgraf / Eugraphus)", () => {
    for (const [ro, en] of [
      ["Evsignie", "Eusignius"],
      ["Evgraf", "Eugraphus"],
      ["Evloghie", "Eulogius"],
      ["Evlampie", "Eulampius"],
      ["Evria", "Euroea"],
    ]) {
      assert.equal(skeleton(ro ?? ""), skeleton(en ?? ""), `${ro} / ${en}`);
    }
    // Before a vowel, Ev- stays.
    assert.notEqual(skeleton("Evanghel"), skeleton("Euanghel"));
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
  it("reads a relation set off by commas as the relation of the saint after it, and unnamed sons as companions", () => {
    const terentie = parseRo("Sf. Mc. Terentie, soția sa, Neonila și cei 7 fii");
    assert.equal(terentie.kind, "group");
    assert.deepEqual(terentie.names.map((n) => n.text), ["Terentie", "Neonila"]);
    assert.deepEqual(parseRo("Sf. Mc. Marius, soția sa, Marta, și fiii lor, Audifaciu și Avacum").names.map((n) => n.text), ["Marius", "Marta", "Audifaciu", "Avacum"]);
    // After the name it follows, the relation stays with that name.
    assert.deepEqual(parseRo("Sf. Mc. Filit și Lidia, soția sa, cu cei 4 fii ai lor").names.map((n) => n.text), ["Filit", "Lidia, soția sa"]);
  });
  it("reads the companions that a colon names after a saint, one after each comma", () => {
    const luchilian = parseRo("Sfântul Mucenic Luchilian și cei împreună cu el patru tineri: Ipatie, Paul, Dionisie și Claudie");
    assert.equal(luchilian.kind, "group");
    assert.deepEqual(luchilian.names.map((n) => n.text), ["Luchilian", "Ipatie", "Paul", "Dionisie", "Claudie"]);
    assert.deepEqual(parseRo("Sfântul Mare Mucenic Eustatie și soția sa Teopista, cu cei doi fii: Agapie și Teopist").names.map((n) => n.text), ["Eustatie", "Teopista", "Agapie", "Teopist"]);
    // Daughters are women, whatever their names end in.
    const sofia = parseRo("Sfânta Muceniță Sofia și fiicele sale: Pistis, Elpis și Agapis");
    assert.equal(sofia.kind, "saints");
    assert.deepEqual(sofia.names.map((n) => [n.text, n.gender]), [["Sofia", "female"], ["Pistis", "female"], ["Elpis", "female"], ["Agapis", "female"]]);
    // A colon that announces nobody still introduces words about the saint.
    assert.deepEqual(parseRo("Sfântul Ierarh Nectarie: Episcopul Pentapolei").names.map((n) => n.text), ["Nectarie, Episcopul Pentapolei"]);
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
  it("does not take a second see or a second epithet for a second saint", () => {
    assert.deepEqual(parseRo("Sfântul Ierarh Filaret, Mitropolitul Moscovei și Kolomnei").names.map((n) => n.text), ["Filaret, Mitropolitul Moscovei și Kolomnei"]);
    assert.deepEqual(parseRo("Sfântul Grigorie Kallidis, Arhiepiscopul Irakliei și Redestului").names.map((n) => n.text), ["Grigorie Kallidis, Arhiepiscopul Irakliei și Redestului"]);
    assert.deepEqual(parseRo("Sfântul Iustin Martirul și Filosoful").names.map((n) => n.text), ["Iustin Martirul și Filosoful"]);
    // After a comma, "și" names another saint.
    assert.deepEqual(parseRo("Sf. Ier. Epifanie, arhiepiscopul Ciprului, și Gherman, patriarhul Constantinopolului").names.map((n) => n.given), ["Epifanie", "Gherman"]);
  });
  it("reads men's names that end like women's as men's names", () => {
    // The official calendar's abbreviations ("Sf. Ap.", "Sf. Mc.") do not tell the gender: the name does.
    for (const title of ["Sf. Ap. Anania", "Sf. Ap. Achila", "Sf. Sfințit Mc. Vavila, Episcopul Antiohiei", "Sf. Ier. Niceta de Remesiana", "Sf. Cuv. Antipa de la Calapodești", "Sf. Mc. Oprea", "Sf. Mc. Hristea"]) {
      assert.equal(parseRo(title).gender, "male", title);
    }
    // Women's names keep their endings, Agapia (the Virgin Martyr Agape) too.
    assert.deepEqual(parseRo("Sf. Mc. Agapia, Irina și Hionia").names.map((n) => n.gender), ["female", "female", "female"]);
    for (const title of ["Sf. Mc. Agripina", "Sf. Mc. Antonina"]) assert.equal(parseRo(title).gender, "female", title);
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
  it("names the saint of a repose without the word repose", () => {
    const p = parseEn("Repose of Venerable Seraphim, Wonderworker of Sarov");
    assert.equal(p.kind, "saint");
    assert.equal(p.title, "Venerable Seraphim, Wonderworker of Sarov");
    assert.equal(parseRo("Adormirea Sfintei Ana, mama Preasfintei Născătoare de Dumnezeu").title, "Sfânta Ana, mama Preasfintei Născătoare de Dumnezeu");
  });
  it("keeps glorifications and events apart from the saints' days", () => {
    const g = parseEn("Glorification of Saint John of Kronstadt");
    assert.equal(g.kind, "glorification");
    assert.equal(g.subject?.names[0]?.given, "John");
    assert.equal(parseEn("Commemoration of the Great Earthquake at Constantinople").kind, "event");
    assert.equal(parseEn("Relocation of the relics of St. John Chrysostom").kind, "relics_translation");
  });
  it("does not take a place for a second saint", () => {
    assert.equal(parseEn("Nicholas of Ohrid and Žiča").names.length, 1);
    assert.equal(parseEn("Holy New Martyr Gorazd, Bishop of Slovakia and the Czech Lands").names.length, 1);
    assert.deepEqual(parseEn("Martyr Gorazd of Prague, Bohemia and Moravo-Cilezsk").names.map((n) => n.text), ["Gorazd of Prague, Bohemia and Moravo-Cilezsk"]);
    assert.equal(parseEn("Hieromartyr Joanicus, Metropolitan of Montenegro and the Coast").names.length, 1);
    assert.equal(parseEn("Venerable Theodore Trichinas “the Hair-Shirt Wearer” and Hermit Near Constantinople").names.length, 1);
    // "and the North Caucasus people" is part of the title of the second saint.
    assert.deepEqual(parseEn("Saints Pimen of Salosi and Anton Meskhi, Enlighteners of Dagestan and the North Caucasus people").names.map((n) => n.given), ["Pimen", "Anton"]);
  });
  it("does not take a second place followed by more words about the saint for a second saint", () => {
    const innocent = parseEn("Saint Innocent of Komél and Vologda disciple of Saint Nilus of Sora");
    assert.equal(innocent.kind, "saint");
    assert.deepEqual(innocent.names.map((n) => n.text), ["Innocent of Komél and Vologda disciple of Saint Nilus of Sora"]);
    assert.deepEqual(parseEn("Saint Simon, Bishop of Vladimir and Suzdal of the Kiev Near Caves").names.map((n) => n.text), ["Simon, Bishop of Vladimir and Suzdal of the Kiev Near Caves"]);
    // A name with its own epithet or place is a second saint.
    assert.deepEqual(parseEn("Saint Gregory of Nyssa and Basil the Great").names.map((n) => n.given), ["Gregory", "Basil"]);
    assert.deepEqual(
      parseEn("Commemoration of St. John the Patriarch of Jerusalem, Armenian Patriarch St. John of Otzoon, St. John of Vorotan and St. Gregory of Datev").names.map((n) => n.given),
      ["John", "Gregory"],
    );
  });
  it("does not take a title for a name", () => {
    const joachim = parseEn("Holy and Righteous Ancestors of God, Joachim and Anna");
    assert.equal(joachim.kind, "saints");
    assert.deepEqual(joachim.holiness, ["righteous"]);
    assert.deepEqual(joachim.names.map((n) => n.text), ["Joachim", "Anna"]);
    assert.deepEqual(parseEn("Holy Wonderworking Unmercenary Physicians Cosmas and Damian at Rome").names.map((n) => n.text), ["Cosmas", "Damian at Rome"]);
    assert.deepEqual(parseEn("Holy Unmercenary Physician Diomedes").names.map((n) => n.text), ["Diomedes"]);
  });
  it("reads a line of a saint with companions and numbered martyrs as a group", () => {
    const augusta = parseEn("Empress Augusta, Porphyrius the General, the 50 philosophers and the 200 Soldiers martyred with the Great Martyr Katherine");
    assert.equal(augusta.kind, "group");
    assert.ok(augusta.holiness.includes("martyr"));
    assert.ok(augusta.names.every((n) => !/Soldiers|philosophers/.test(n.text)));
    assert.deepEqual(parseEn("Venerable Euthymius and twelve other Monks, martyred at Vatopedi").holiness, ["venerable_martyr"]);
  });
  it("reads a saint named with her son as two saints", () => {
    const p = parseEn("Blessed Cleopatra with her son John, in Egypt");
    assert.equal(p.kind, "saints");
    assert.deepEqual(p.names.map((n) => n.given), ["Cleopatra", "John"]);
    assert.equal(p.names[1]?.gender, "male");
  });
  it("names the saint of a beheading, and an event of a saint's relics after the saint", () => {
    const cornelius = parseEn("Beheading of Venerable Cornelius, Abbot of the Pskov Caves");
    assert.equal(cornelius.kind, "saint");
    assert.equal(cornelius.title, "Venerable Cornelius, Abbot of the Pskov Caves");
    assert.deepEqual(cornelius.holiness, ["venerable"]);
    // The Beheading of the Forerunner stays his feast.
    assert.equal(parseEn("The Beheading of the Holy Glorious Prophet, Forerunner, and Baptist John").feast, "beheading-of-john-the-baptist");
    const sava = parseEn("The Burning of Saint Sava's relics");
    assert.equal(sava.kind, "event");
    assert.equal(sava.subject?.title, "Saint Sava");
  });
  it("reads a feast named as holy as the feast", () => {
    const p = parseEn("The Holy Transfiguration of our Lord God and Savior Jesus Christ (the Second “Feast of the Savior” in August)");
    assert.equal(p.kind, "feast");
    assert.equal(p.feast, "transfiguration");
  });
  it("does not take an epithet or a title for a saint", () => {
    assert.deepEqual(parseEn("Saint Damiane (Demetrius), King and Hymnographer").names.map((n) => n.text), ["Damiane, King and Hymnographer"]);
    assert.equal(parseEn("Saint Theophanes the Confessor and Hymnographer, Bishop of Nicea").names.length, 1);
    const slavs = parseEn("Equals of the Apostles and Teachers of the Slavs, Cyril and Methodius");
    assert.equal(slavs.kind, "saints");
    assert.deepEqual(slavs.holiness, ["equal_to_apostles"]);
    assert.deepEqual(slavs.names.map((n) => n.given), ["Cyril", "Methodius"]);
    assert.deepEqual(parseEn("Equals of the Apostles, Emperor Mirian and Empress Nana of Georgia").names.map((n) => n.text), ["Mirian", "Nana of Georgia"]);
  });
  it("knows women's names that do not end in -a", () => {
    assert.equal(parseEn("Venerable Mary of Egypt").gender, "female");
    assert.deepEqual(parseEn("Martyrs Sophia, Irene, and Castor of Egypt").names.map((n) => n.gender), ["female", "female", undefined]);
    for (const name of ["Elizabeth", "Euphrosynē", "Salome", "Agnes", "Thais", "Helen"]) assert.equal(genderOfEnName(name), "female", name);
    // Men's names keep what the endings say.
    assert.equal(genderOfEnName("Irenaeus"), undefined);
    assert.equal(genderOfEnName("Elisha"), "male");
    assert.equal(genderOfEnName("Theodosia"), "female");
  });
  it("reads a saint named with his mother as two saints", () => {
    const p = parseEn("Equal of the Apostles and Emperor Constantine with his Mother Helen");
    assert.equal(p.kind, "saints");
    assert.deepEqual(p.names.map((n) => n.given), ["Constantine", "Helen"]);
    assert.equal(p.names[1]?.gender, "female");
  });
  it("reads events in the life of a saint as events, not as saints", () => {
    const nicholas = parseEn("Nativity of Saint Nicholas the Wonderworker");
    assert.equal(nicholas.kind, "event");
    assert.equal(nicholas.subject?.names[0]?.given, "Nicholas");
    const andrew = parseEn("Entrance of the Apostle Andrew into Georgia");
    assert.equal(andrew.kind, "event");
    assert.deepEqual(andrew.subject?.holiness, ["apostle"]);
    assert.equal(parseEn("The Meeting of the Mother of God and Saint Elizabeth").subject?.names[0]?.given, "Theotokos");
    assert.equal(parseEn("Commemoration of the Shepherds in Bethlehem who were watching their flocks, and went to see the Lord").kind, "event");
    const herman = parseEn("First Translation of the relics of Saint Herman, Archbishop of Kazan");
    assert.equal(herman.kind, "relics_translation");
    assert.equal(herman.subject?.names[0]?.given, "Herman");
  });
  it("recognises the feasts of the Theotokos and the days of an afterfeast", () => {
    assert.equal(parseEn("The Nativity of our Most Holy Lady the Mother of God and Ever-Virgin Mary").feast, "nativity-of-the-theotokos");
    assert.equal(parseEn("The Dormition of our Most Holy Lady the Mother of God and Ever-Virgin Mary").feast, "dormition-of-the-theotokos");
    const second = parseEn("Second Day of the Nativity of our Lord");
    assert.equal(second.kind, "afterfeast");
    assert.equal(second.feast, "nativity-of-christ");
  });
  it("reads men's names that end like women's as men's names", () => {
    for (const title of ["Venerable Constantine of Synnada", "Martyr Valentine", "Saint Augustine of Canterbury, Evangelizer of England", "Apostle Aquila of the Seventy", "Hieromartyr Kuksha", "Saint Columba of Iona, Enlightener of Scotland", "Urošica"]) {
      assert.equal(parseEn(title).gender, "male", title);
    }
    assert.deepEqual(parseEn("Martyrs Inna, Pinna, and Rimma, disciples of Apostle Andrew in Scythia").names.map((n) => n.gender), ["male", "male", "male"]);
    for (const title of ["The Departure of St. Shenouda (Shenoute), the Archimandrite.", "The Martyrdom of St. Mina (Menas), the Monk.", "The Departure of St. Takla Haymanot, the Ethiopian.", "Commemoration of Anba Marcura."]) {
      assert.equal(parseCopticTitle(title).gender, "male", title);
    }
    // Women's names keep their endings.
    for (const title of ["Martyr Aquilina", "Martyr Valentina", "Saint Constantia of Paphos"]) assert.equal(parseEn(title).gender, "female", title);
  });
});

describe("Coptic titles", () => {
  it("read relocations of relics as translations of the saint's relics", () => {
    const simon = parseCopticTitle("The Relocation of the Body of St. Simon (Simeon) the Stylite to the city of Antioch.");
    assert.equal(simon.kind, "relics_translation");
    assert.equal(simon.subject?.names[0]?.text, "Simon the Stylite");
    const john = parseCopticTitle("The Commemoration of the Relocation of the relics of St. John Chrysostom.");
    assert.equal(john.kind, "relics_translation");
    assert.equal(john.subject?.title, "Saint John Chrysostom");
    const apakir = parseCopticTitle("The Commemoration of the Relocation of the Relics of Sts. Apakir and John.");
    assert.deepEqual(apakir.subject?.names.map((n) => n.given), ["Apakir", "John"]);
    assert.equal(apakir.subject?.title, "Saints Apakir and John");
    const john2 = parseCopticTitle("The Arrival of the Holy Relic of St. John, the Short, to the Wilderness of Scetis.");
    assert.equal(john2.kind, "relics_translation");
    assert.equal(john2.subject?.names[0]?.text, "John, the Short");
  });
  it("read events as events of their saint", () => {
    const severus = parseCopticTitle("The Coming of Saint Severus, Patriarch of Antioch, to Egypt");
    assert.equal(severus.kind, "event");
    assert.equal(severus.subject?.names[0]?.text, "Severus, Patriarch of Antioch");
    assert.equal(parseCopticTitle("Raising of Lazarus from the dead.").subject?.names[0]?.text, "Lazarus");
    assert.equal(parseCopticTitle("Consultation of the Chief Priests to put the righteous Lazarus to death").subject?.names[0]?.text, "Lazarus");
    assert.equal(parseCopticTitle("The Commemoration of the Preaching of St. Bartholomew, the Apostle.").kind, "event");
    // A church named after a saint is not the saint.
    const cathedral = parseCopticTitle("The Inauguration of the New St. Mark Cathedral in the Monastery of Anba Rowais.");
    assert.equal(cathedral.kind, "event");
    assert.equal(cathedral.subject, undefined);
    assert.equal(parseCopticTitle("The Beginning of the Fast of the Nativity (Advent) in the Coptic Church.").subject, undefined);
  });
  it("read numbered groups", () => {
    const elders = parseCopticTitle("The Martyrdom of the Forty-Nine Saints, the Elders of Sheheat (Scetis).");
    assert.equal(elders.kind, "group");
    assert.equal(elders.count, 49);
    assert.ok(elders.holiness.includes("martyr"));
    const zadok = parseCopticTitle("The Martyrdom of St. Zadok and the 128 who were with Him.");
    assert.equal(zadok.kind, "group");
    assert.deepEqual(zadok.names.map((n) => n.text), ["Zadok"]);
  });
  it("read the departure of an apostle as one saint, and the great feasts as the feasts", () => {
    const john = parseCopticTitle("The Departure of St. John the Evangelist and Theologian");
    assert.equal(john.kind, "saint");
    assert.deepEqual(john.names.map((n) => n.text), ["John the Evangelist and Theologian"]);
    const theophany = parseCopticTitle("The Holy Theophany of Our Lord, God and Savior, Jesus Christ (Baptism of the Lord christ).");
    assert.equal(theophany.kind, "feast");
    assert.equal(theophany.feast, "theophany");
    const annunciation = parseCopticTitle("The Commemoration of the Life giving Annunciation.");
    assert.equal(annunciation.kind, "feast");
    assert.equal(annunciation.feast, "annunciation");
  });
  it("split a line that names a saint and another commemoration", () => {
    const timothy = parseCopticTitle("The Martyrdom of St. Timothy and the Relocation of the Body of St. Theodore, the Prince, to Shotb.");
    assert.equal(timothy.kind, "saint");
    assert.deepEqual(timothy.names.map((n) => n.text), ["Timothy"]);
    assert.equal(timothy.also?.[0]?.kind, "relics_translation");
    assert.equal(timothy.also?.[0]?.subject?.names[0]?.text, "Theodore, the Prince");
    const luke = parseCopticTitle("The Commemoration of the Departure of St. Luke the Stylite and the Relocation of His Holy Relics.");
    assert.equal(luke.title, "Saint Luke the Stylite");
    assert.equal(luke.also?.[0]?.ofLine, true);
    assert.equal(luke.also?.[0]?.title, "Relocation of the Holy Relics of Saint Luke the Stylite");
    const two = parseCopticTitle("The Commemoration of the Martyrdom of St. Archelaus and the Martyrdom of Elisha the Hegumen.");
    assert.deepEqual(two.names.map((n) => n.text), ["Archelaus", "Elisha the Hegumen"]);
    assert.equal(two.title, "Saints Archelaus and Elisha the Hegumen");
    const martyrs = parseCopticTitle("The Commemoration of the Holy Martyrs Alphaeus, Zacchaeus, Romanus and John, and the Commemoration of the Saints Thomas, Victor, and Isaac of the City of Ashmunen.");
    assert.equal(martyrs.title, "Holy Martyrs Alphaeus, Zacchaeus, Romanus and John");
    assert.deepEqual(martyrs.names.map((n) => n.text), ["Alphaeus", "Zacchaeus", "Romanus", "John"]);
    assert.equal(martyrs.also?.length, 1);
    assert.equal(martyrs.also?.[0]?.title, "Saints Thomas, Victor, and Isaac of the City of Ashmunen");
    assert.deepEqual(martyrs.also?.[0]?.names.map((n) => n.given), ["Thomas", "Victor", "Isaac"]);
  });
});

describe("Armenian titles", () => {
  it("read the disciples and the apostles of Christ as groups", () => {
    const disciples = parseCopticTitle("Commemoration of Christ’s seventy-two Disciples");
    assert.equal(disciples.kind, "group");
    assert.equal(disciples.count, 72);
    assert.equal(disciples.title, "Christ’s seventy-two Disciples");
    const apostles = parseCopticTitle("Commemoration of Christ’s twelve Apostles and thirteenth Apostle - St. Paul");
    assert.equal(apostles.kind, "group");
    assert.deepEqual(apostles.holiness, ["apostle"]);
  });
  it("read the Beheading of St John the Baptist as his feast", () => {
    assert.equal(parseCopticTitle("Commemoration of Beheading of St. John the Baptist").feast, "beheading-of-john-the-baptist");
  });
});

describe("the orthodox-calendar lists", () => {
  it("give the civil date of the Julian calendar, 13 days after the Menaion date", () => {
    assert.deepEqual(julianMenaionDate(1, 15), { month: 1, day: 2 });
    assert.deepEqual(julianMenaionDate(1, 2), { month: 12, day: 20 });
    assert.deepEqual(julianMenaionDate(3, 1), { month: 2, day: 17 });
  });
  it("lose years, link marks and abbreviations in their titles", () => {
    assert.equal(cleanOverlayTitle("Our Holy Father Peter, Metropolitan of Moscow (1326)"), "Our Holy Father Peter, Metropolitan of Moscow");
    assert.equal(cleanOverlayTitle("Nicanor of Hilandar [ sr ; bg ]"), "Nicanor of Hilandar");
    assert.equal(cleanOverlayTitle("Eustathius I Ј"), "Eustathius I");
    assert.equal(cleanOverlayTitle("Ven. Zosima of Solovetsk"), "Venerable Zosima of Solovetsk");
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

  /** The persons a Builder run makes of the Romanian and OCA lines of one day, as "Romanian name → English name". */
  const pairsOf = (doxologia: string[], oca: Array<[string, string]>, month: number, day: number): Record<string, string | undefined> => {
    const sources: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [],
      doxologia: doxologia.map((title, order) => ({ slug: `doxologia-${order}`, title, month, day, order, color: null, cross: null, secondRow: false })),
      oca: oca.flatMap(([id, title], order) => [2026, 2028].map((year) => ({ id, title, path: `/saints/lives/${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${id}`, year, month, day, order }))),
      coptic: [],
      armenian: [],
      overlays: [],
    };
    const builder = new Builder(loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data")));
    builder.romanian(doxologiaUnits(sources), [], [{ month, day }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const slots = new Set(builder.clusters.flatMap((c) => c.slots));
    return Object.fromEntries([...slots].map((s) => [s.ro?.display ?? `(${s.en?.display})`, s.en?.display]));
  };

  it("does not give a woman the name of a man of the same name key (1 March: Antonie, Marcel, Antonina)", () => {
    const doxologia = ["Sfântul Mucenic Antonie", "Sfântul Mucenic Marcel", "Sfânta Muceniță Antonina"];
    const oca: Array<[string, string]> = [
      ["100629", "Martyr Antonina of Nicea, in Bithynia"],
      ["100630", "Martyrs Marcellus and Anthony of Syria"],
    ];
    const expected = { "Sf. Mc. Antonie": "Martyr Anthony of Syria", "Sf. Mc. Marcel": "Martyr Marcellus", "Sf. Mc. Antonina": "Martyr Antonina of Nicea, in Bithynia" };
    // "Antonie", "Antonina" and "Anthony" share a name key: the order of the sources must not decide.
    assert.deepEqual(pairsOf(doxologia, oca, 3, 1), expected);
    assert.deepEqual(pairsOf([...doxologia].reverse(), [...oca].reverse(), 3, 1), expected);
  });

  it("keeps a saint apart from a saint of the other gender when nobody else shares the name key", () => {
    // Blessed Domna of Tomsk is not the Martyr Domnin, nor St Seraphima the hierarch Serafim (Sobolev).
    assert.deepEqual(pairsOf(["Sfântul Mucenic Domnin"], [["105703", "Saint Domna of Tomsk"]], 10, 16), { "Sf. Mc. Domnin": undefined, "(Saint Domna of Tomsk)": "Saint Domna of Tomsk" });
    assert.deepEqual(pairsOf(["Sfântul Ierarh Serafim (Sobolev), făcătorul de minuni din Sofia"], [["100426", "Saint Seraphima"]], 2, 13), {
      "Sf. Ier. Serafim (Sobolev), făcătorul de minuni din Sofia": undefined,
      "(Saint Seraphima)": "Saint Seraphima",
    });
    // A name read as a woman's from its ending ("Aquila") still finds the man of the same name.
    assert.deepEqual(pairsOf(["Sfântul Apostol Achila"], [["101950", "Apostle Aquila of the Seventy"]], 7, 14), { "Sf. Ap. Achila": "Apostle Aquila of the Seventy" });
  });

  it("finds a sister that the OCA names in her brother's line (30 October: Zenovie and Zenovia)", () => {
    const doxologia = ["Sfântul Sfințit Mucenic Zenovie, Episcopul Ciliciei", "Sfânta Muceniță Zenovia, sora Sfântului Mucenic Zenovie"];
    const oca: Array<[string, string]> = [["103110", "Hieromartyr Zenobios and his sister Zenobia, of Aegæ in Cilicia"]];
    const expected = {
      "Sf. Sfințit Mc. Zenovie, Episcopul Ciliciei": "Hieromartyr Zenobios",
      "Sf. Mc. Zenovia, sora Sfântului Mucenic Zenovie": "Hieromartyr Zenobia, of Aegæ in Cilicia",
    };
    assert.deepEqual(pairsOf(doxologia, oca, 10, 30), expected);
    assert.deepEqual(pairsOf([...doxologia].reverse(), oca, 10, 30), expected);
  });

  it("gives an official line the group of another source that its first saint leads (28 October: Terentie, his wife Neonila and the 7 sons)", () => {
    const title = "Sf. Mc. Terentie, soția sa, Neonila și cei 7 fii";
    const doxologia = ["Sfânta Muceniță Neonila, soția Sfântului Mucenic Terentie", "Sfântul Mucenic Terentie cu cei 7 fii ai săi"];
    for (const order of [doxologia, [...doxologia].reverse()]) {
      const sources: SourceData = {
        ...data,
        patriarhia: [{ year: 2026, month: 10, day: 28, url: "https://calendar.patriarhia.ro/calendar-entry-26/28-octombrie/", items: [{ text: title, cross: null, color: "black" }], title, subtitle: "", publicHoliday: false }],
        doxologia: order.map((t, i) => ({ slug: `doxologia-${i}`, title: t, month: 10, day: 28, order: i, color: null, cross: null, secondRow: false })),
        oca: [],
      };
      const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
      const builder = new Builder(existing);
      builder.romanian(doxologiaUnits(sources), patriarhiaUnits(sources), [{ month: 10, day: 28 }]);
      // One line, in the order of the official title, which it keeps: the group of Terentie with his sons, then Neonila.
      const lines = builder.lines.get("romanian")?.get("10-28") ?? [];
      assert.equal(lines.length, 1);
      assert.equal(lines[0]?.title, title);
      assert.deepEqual(
        lines[0]?.clusters.map((c) => c.group?.ro ?? c.slots[0]?.ro?.display),
        ["Sfântul Mucenic Terentie cu cei 7 fii ai săi", "Sf. Mc. Neonila, soția Sfântului Mucenic Terentie"],
      );
      // Neonila is the only person: Terentie is the group's.
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      assert.equal([...output.files.keys()].filter((k) => k.startsWith("persons/")).length, 1);
    }
  });

  it("gives an official line the group of another source whose title names the line's saint after a colon (3 June: Luchilian, Ipatie and Paula)", () => {
    const title = "Sf. Mc. Luchilian, Ipatie și Paula fecioara (Harți)";
    const group = "Sfântul Mucenic Luchilian și cei împreună cu el patru tineri: Ipatie, Paul, Dionisie și Claudie";
    const doxologia = [group, "Sfânta Muceniță Paula fecioara"];
    for (const order of [doxologia, [...doxologia].reverse()]) {
      const sources: SourceData = {
        ...data,
        patriarhia: [{ year: 2026, month: 6, day: 3, url: "https://calendar.patriarhia.ro/calendar-entry-26/3-iunie/", items: [{ text: title, cross: null, color: "black" }], title, subtitle: "", publicHoliday: false }],
        doxologia: order.map((t, i) => ({ slug: `doxologia-${i}`, title: t, month: 6, day: 3, order: i, color: null, cross: null, secondRow: false })),
        oca: [2026, 2028].map((year) => ({ id: "101571", title: "Martyr Lucillian and those who suffered with him at Byzantium", path: `/saints/lives/${year}/06/03/101571-martyr-lucillian`, year, month: 6, day: 3, order: 0 })),
      };
      const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
      const builder = new Builder(existing);
      builder.romanian(doxologiaUnits(sources), patriarhiaUnits(sources), [{ month: 6, day: 3 }]);
      builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
      // One line, in the order of the official title: the group (Ipatie is one of its four youths), then Paula, who is not its Paul.
      const lines = builder.lines.get("romanian")?.get("06-03") ?? [];
      assert.equal(lines.length, 1);
      assert.equal(lines[0]?.title, "Sf. Mc. Luchilian, Ipatie și Paula fecioara");
      assert.deepEqual(
        lines[0]?.clusters.map((c) => c.group?.ro ?? c.slots[0]?.ro?.display),
        [group, "Sf. Mc. Paula fecioara"],
      );
      assert.equal(lines[0]?.clusters[0]?.ext.oca, "101571");
      // Paula is the only person.
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      assert.deepEqual(
        [...output.files.keys()].filter((k) => k.startsWith("persons/")),
        ["persons/paula-fecioara.json"],
      );
    }
  });

  it("keeps apart two groups whose titles share only the words of such titles (30 July: Polychronius and Valentine, and those with them)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [],
      oca: [
        ["102138", "Hieromartyr Polychronius, Bishop of Babylon, and those with him"],
        ["102148", "Hieromartyr Valentine, Bishop of Interamna, Terni in Italy, and those with him"],
      ].flatMap(([id, title], order) => [2026, 2028].map((year) => ({ id: id ?? "", title: title ?? "", path: `/saints/lives/${year}/07/30/${id}`, year, month: 7, day: 30, order }))),
    };
    const builder = new Builder(loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data")));
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const lines = builder.lines.get("russian")?.get("07-30") ?? [];
    assert.deepEqual(
      lines.map((l) => l.clusters.map((c) => c.ext.oca)),
      [["102138"], ["102148"]],
    );
  });

  it("puts together the saints whose Romanian and English names only the table of equivalents knows (20 February: Leon / Leo, 30 July: Crescent / Crescens)", () => {
    assert.deepEqual(pairsOf(["Sfântul Ierarh Leon, Episcopul Cataniei"], [["100569", "Saint Leo, Bishop of Catania in Sicily"]], 2, 20), {
      "Sf. Ier. Leon, Episcopul Cataniei": "Saint Leo, Bishop of Catania in Sicily",
    });
    // The five apostles of the Seventy: one line in Romanian, one line each in the OCA.
    const oca: Array<[string, string]> = [
      ["102131", "Apostle Silas of the Seventy"],
      ["102132", "Apostle Silvanus of the Seventy"],
      ["102133", "Apostle Crescens of the Seventy"],
      ["102134", "Apostle Epenetus of the Seventy"],
      ["102135", "Apostle Andronicus of the Seventy"],
    ];
    assert.deepEqual(pairsOf(["Sfinții Apostoli Sila, Silvan, Crescent, Epenet și Andronic"], oca, 7, 30), {
      "Sf. Ap. Sila": "Apostle Silas of the Seventy",
      "Sf. Ap. Silvan": "Apostle Silvanus of the Seventy",
      "Sf. Ap. Crescent": "Apostle Crescens of the Seventy",
      "Sf. Ap. Epenet": "Apostle Epenetus of the Seventy",
      "Sf. Ap. Andronic": "Apostle Andronicus of the Seventy",
    });
  });

  it("gives a saint of the Romanian calendar the OCA line of the group he leads, in every calendar (19 October: Uar, the OCA's Varus with seven monastic martyrs)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [{ slug: "sfantul-mucenic-uar", title: "Sfântul Mucenic Uar", month: 10, day: 19, order: 0, color: null, cross: null, secondRow: false }],
      oca: [2026, 2028].map((year) => ({ id: "102998", title: "Martyr Varus, and seven Monastic Martyrs with him", path: `/saints/lives/${year}/10/19/102998-martyr-varus`, year, month: 10, day: 19, order: 0 })),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 10, day: 19 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    builder.shared(["ecumenical"]);
    // One commemoration in both calendars, and so in the shared Menaion.
    const lines = (tradition: string): Cluster[][] => builder.lines.get(tradition)?.get("10-19")?.map((l) => l.clusters) ?? [];
    assert.equal(lines("romanian").length, 1);
    assert.deepEqual(lines("russian"), lines("romanian"));
    assert.deepEqual(lines("ecumenical"), lines("romanian"));
    // One saint, with the names and ids of both sources; no group of his own.
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/") || k.startsWith("groups/")), ["persons/varus.json"]);
    assert.deepEqual(output.files.get("persons/varus.json")?.external_ids, { oca: "102998", doxologia: "sfantul-mucenic-uar" });
    assert.equal(output.files.get("i18n/ro/persons/varus.json")?.names.display, "Sf. Mc. Uar");
  });

  it("does not give the relics of a saint known only from them to a saint of a similar name (30 July: Herman of Solovki is not Romanus the Martyr)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [],
      oca: [
        { id: "100105", title: "Venerable Romanus the Martyr", month: 1, day: 5 },
        { id: "102137", title: "Uncovering of the relics of Venerable Herman of Solovki", month: 7, day: 30 },
      ].flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 }))),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    // Without the H and the leading vowel, "Herman" has the name key of "Romanus" (R-M-N): no day confirms him, so he is a saint of his own.
    assert.deepEqual(output.files.get("commemorations/herman-of-solovki--finding-of-relics.json")?.subjects, ["person:herman-of-solovki"]);
    assert.equal(output.files.get("i18n/en/persons/herman-of-solovki.json")?.names.display, "Venerable Herman of Solovki");
    assert.deepEqual(output.files.get("commemorations/romanus-the-martyr--repose.json")?.subjects, ["person:romanus-the-martyr"]);
  });

  it("puts together the saints whose OCA spelling only the table of equivalents knows (1 March: Evdochia / Eudokia, 31 July: Evdochim / Eudocimus)", () => {
    assert.deepEqual(pairsOf(["Sfânta Cuvioasă Muceniță Evdochia"], [["100625", "Martyr Eudokia of Heliopolis"]], 3, 1), { "Sf. Cuv. Mc. Evdochia": "Martyr Eudokia of Heliopolis" });
    assert.deepEqual(pairsOf(["Sfântul și Dreptul Evdochim"], [["102154", "Righteous Eudocimus of Cappadocia"]], 7, 31), { "Sf. și Drept. Evdochim": "Righteous Eudocimus of Cappadocia" });
  });

  it("puts together the saints whose Romanian Ev- is the OCA's Eu- (5 August: Evsignie / Eusignius, 10 December: Evgraf / Eugraphus, 30 April: Donat of Evria / Donatus of Euroea)", () => {
    assert.deepEqual(pairsOf(["Sfântul Mucenic Evsignie"], [["102206", "Martyr Eusignius of Antioch"]], 8, 5), { "Sf. Mc. Evsignie": "Martyr Eusignius of Antioch" });
    assert.deepEqual(pairsOf(["Sfântul Mucenic Evgraf", "Sfântul Mucenic Ermoghen", "Sfântul Mucenic Mina"], [["103511", "Martyrs Menas, Hermogenes, and Eugraphus, of Alexandria"]], 12, 10), {
      "Sf. Mc. Evgraf": "Martyr Eugraphus, of Alexandria",
      "Sf. Mc. Ermoghen": "Martyr Hermogenes",
      "Sf. Mc. Mina": "Martyr Menas",
    });
    // The see is a place of the name: Evria is Euroea.
    assert.deepEqual(pairsOf(["Sfântul Ierarh Donat, Episcopul Evriei"], [["107780", "Saint Donatus, Bishop of Euroea in Epirus"]], 4, 30), {
      "Sf. Ier. Donat, Episcopul Evriei": "Saint Donatus, Bishop of Euroea in Epirus",
    });
  });

  it("gives the official line of a saint and his sister the OCA line of their group, in every calendar (10 October: Evlampie and Evlampia, the OCA's Eulampius and Eulampia with 200 martyrs)", () => {
    const title = "Sf. Mc. Evlampie și sora sa, Evlampia";
    const sources: SourceData = {
      ...data,
      patriarhia: [{ year: 2026, month: 10, day: 10, url: "https://calendar.patriarhia.ro/calendar-entry-26/10-octombrie/", items: [{ text: title, cross: null, color: "black" }], title, subtitle: "", publicHoliday: false }],
      doxologia: ["Sfântul Mucenic Evlampie", "Sfânta Muceniță Evlampia, sora Sfântului Mucenic Evlampie"].map((t, order) => ({ slug: `doxologia-${order}`, title: t, month: 10, day: 10, order, color: null, cross: null, secondRow: false })),
      oca: [2026, 2028].map((year) => ({ id: "102919", title: "Martyrs Eulampius and Eulampia, at Nicomedia, and 200 Martyrs with them", path: `/saints/lives/${year}/10/10/102919-martyrs-eulampius`, year, month: 10, day: 10, order: 0 })),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), patriarhiaUnits(sources), [{ month: 10, day: 10 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    builder.shared(["ecumenical"]);
    // One line of the two saints in the Romanian calendar, and the same line in the Russian and shared calendars.
    const lines = (tradition: string): Cluster[][] => builder.lines.get(tradition)?.get("10-10")?.map((l) => l.clusters) ?? [];
    assert.equal(lines("romanian").length, 1);
    assert.equal(lines("romanian")[0]?.length, 2);
    assert.deepEqual(lines("russian"), lines("romanian"));
    assert.deepEqual(lines("ecumenical"), lines("romanian"));
    // Two saints, with the names of both sources; no group of their own.
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/") || k.startsWith("groups/")).sort(), ["persons/eulampia.json", "persons/eulampius.json"]);
    assert.equal(output.files.get("i18n/en/persons/eulampius.json")?.names.display, "Martyr Eulampius");
    assert.equal(output.files.get("i18n/ro/persons/eulampius.json")?.names.display, "Sf. Mc. Evlampie");
  });

  it("gives the OCA line of two saints and their companions to both saints of the official line (16 February: Pamfil and Valent, the OCA's Pamphilius and Valens)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: ["Sfântul Mucenic Pamfil preotul", "Sfântul Mucenic Valent diaconul"].map((title, order) => ({ slug: `doxologia-${order}`, title, month: 2, day: 16, order, color: null, cross: null, secondRow: false })),
      oca: [2026, 2028].map((year) => ({ id: "100533", title: "Martyrs Pamphilius the Presbyter, Valens the Deacon, and those with them, at Caesarea in Palestine", path: `/saints/lives/${year}/02/16/100533-martyrs-pamphilius`, year, month: 2, day: 16, order: 0 })),
    };
    const builder = new Builder(loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data")));
    builder.romanian(doxologiaUnits(sources), [], [{ month: 2, day: 16 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    builder.shared(["ecumenical"]);
    const names = (tradition: string): string[][] => builder.lines.get(tradition)?.get("02-16")?.map((l) => l.clusters.map((c) => `${c.slots[0]?.ro?.display} / ${c.slots[0]?.en?.display}`)) ?? [];
    const both = ["Sf. Mc. Pamfil preotul / Martyr Pamphilius the Presbyter", "Sf. Mc. Valent diaconul / Martyr Valens the Deacon"];
    assert.deepEqual(names("russian"), [both]);
    assert.deepEqual(names("ecumenical"), [both]);
  });

  it("gives relics that two saints of the name may claim alike to the one another line keeps that day (4 August: the relics of St Evdochia are those of Eudokia of Persia, not of the Evdochia of 1 March)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [
        { slug: "sfanta-cuvioasa-mucenita-evdochia", title: "Sfânta Cuvioasă Muceniță Evdochia", month: 3, day: 1, order: 0, color: null, cross: null, secondRow: false },
        { slug: "aducerea-moastelor-sfintei-mucenite-evdochia", title: "Aducerea moaștelor Sfintei Mucenițe Evdochia", month: 8, day: 4, order: 0, color: null, cross: null, secondRow: false },
      ],
      oca: [
        { id: "100625", title: "Martyr Eudokia of Heliopolis", month: 3, day: 1 },
        { id: "102203", title: "Martyr Eudokia of Persia", month: 8, day: 4 },
      ].flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 }))),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 3, day: 1 }, { month: 8, day: 4 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    assert.deepEqual(output.files.get("commemorations/eudokia-of-persia--translation-of-relics.json")?.subjects, ["person:eudokia-of-persia"]);
    assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/")).sort(), ["persons/eudokia-of-heliopolis.json", "persons/eudokia-of-persia.json"]);
  });

  it("lets the day choose only between saints of the name that score alike (2 May: the relics of Boris and Gleb are the passion-bearers', though the OCA also keeps St Boris of Bulgaria that day)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [],
      oca: [
        { id: "102082", title: "Martyrs and Passion-Bearers Boris and Gleb", month: 7, day: 24 },
        { id: "101277", title: "Saint Boris (in Baptism Michael), Equal of the Apostles, Prince and Baptizer of Bulgaria", month: 5, day: 2 },
        { id: "101270", title: "Translation of the Relics of the Holy Passionbearers Boris and Gleb (in Baptism Roman and David—1072 and 1115)", month: 5, day: 2 },
      ].flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 }))),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const relics = [...output.files.entries()].find(([k, v]) => k.startsWith("commemorations/") && v.kind === "relics_translation")?.[1];
    assert.equal(output.files.get(`i18n/en/persons/${relics?.subjects[0]?.replace(/^person:/, "")}.json`)?.names.display, "Martyr and Passion-Bearer Boris");
  });

  it("gives the relics of saints named together with one place to the saints of that place, not to the first saint of the name (8 August: Zosimas and Sabbatius of Solovki, 11 September: Sergius and Herman of Valaam)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [{ slug: "sfantul-cuvios-serghie-de-la-radonej", title: "Sfântul Cuvios Serghie de la Radonej", month: 9, day: 25, order: 0, color: null, cross: null, secondRow: false }],
      oca: [
        { id: "100987", title: "Venerable Zosimas, Abbot of Vorbozomsk", month: 4, day: 4 },
        { id: "900011", title: "Venerable Zosimas of Palestine", month: 4, day: 4 },
        { id: "101130", title: "Venerable Zosimas, Abbot of Solovki", month: 4, day: 17 },
        { id: "101836", title: "Venerable Sergius and Herman, Wonderworkers of Valaam", month: 6, day: 28 },
        { id: "900012", title: "Venerable Zosimas of Tuman", month: 8, day: 8 },
        { id: "102231", title: "Translation of the relics of Venerable Zosimas and Sabbatius of Solovki", month: 8, day: 8 },
        { id: "102571", title: "Translation of the relics of Venerable Sergius and Herman, Wonderworkers of Valaam", month: 9, day: 11 },
        { id: "102725", title: "Venerable Sergius the Wonderworker, Abbot of Radonezh", month: 9, day: 25 },
      ].flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 }))),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 9, day: 25 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const subjectOf = (oca: string): string | undefined => {
      const comm = [...output.files.entries()].find(([k, v]) => k.startsWith("commemorations/") && v.external_ids?.oca === oca)?.[1];
      return output.files.get(`i18n/en/persons/${comm?.subjects?.[0]?.replace(/^person:/, "")}.json`)?.names.display;
    };
    // Four Venerable Zosimases share the first name, and the OCA keeps Zosimas of Tuman that very day: "of Solovki" decides.
    assert.equal(subjectOf("102231"), "Venerable Zosimas, Abbot of Solovki");
    // The Sergius of the 28 June line of Sergius and Herman of Valaam, not the Sergius of Radonezh listed first.
    assert.equal(subjectOf("102571"), "Venerable Sergius");
  });

  /** OCA lines of given days, as the OCA pages of 2026 and 2028 list them. */
  const ocaLines = (lines: Array<{ id: string; title: string; month: number; day: number }>): SourceData["oca"] =>
    lines.flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 })));

  it("does not give a second OCA line of the day to a saint of a list closed by another place (28 June: Sergius of Paphlagonia is not the Sergius of Valaam; 12 June: Onouphrios of Vologda is not Onuphrius the Great)", () => {
    const lines = [
      { id: "101836", title: "Venerable Sergius and Herman, Wonderworkers of Valaam", month: 6, day: 28 },
      { id: "100478", title: "Venerable Confessor Sergius of Paphlagonia", month: 6, day: 28 },
      { id: "107799", title: "Venerable Onuphrius the Great", month: 6, day: 12 },
      { id: "101704", title: "Venerable Onouphrios and Auxentios of Vologda", month: 6, day: 12 },
    ];
    // The order of the OCA's lines must not decide: the place that closes a list counts on either side.
    for (const oca of [lines, [...lines].reverse()]) {
      const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
      const builder = new Builder(existing);
      builder.russian(ocaUnits({ ...data, doxologia: [], oca: ocaLines(oca) }, [2026, 2028]).fixed);
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      const subjectsOf = (id: string): Array<string | undefined> | undefined => {
        const comm = [...output.files.entries()].find(([k, v]) => k.startsWith("commemorations/") && v.external_ids?.oca === id)?.[1];
        return comm?.subjects.map((s: string) => output.files.get(`i18n/en/persons/${s.replace(/^person:/, "")}.json`)?.names.display);
      };
      assert.deepEqual(subjectsOf("101836"), ["Venerable Sergius", "Venerable Herman, Wonderworkers of Valaam"]);
      assert.deepEqual(subjectsOf("100478"), ["Venerable Confessor Sergius of Paphlagonia"]);
      assert.deepEqual(subjectsOf("107799"), ["Venerable Onuphrius the Great"]);
      assert.deepEqual(subjectsOf("101704"), ["Venerable Onouphrios", "Venerable Auxentios of Vologda"]);
      assert.equal([...output.files.keys()].filter((k) => k.startsWith("persons/")).length, 6);
    }
  });

  it("puts together a hierarch whom one calendar names by his see and the other by the place where he lived, the only one of the name that day (9 November: Nectarie of Aegina, 29 April: Vasile of Ostrog)", () => {
    const dox = (slug: string, title: string, month: number, day: number): SourceData["doxologia"][number] => ({ slug, title, month, day, order: 0, color: null, cross: null, secondRow: false });
    const sources: SourceData = {
      ...data,
      doxologia: [
        dox("sfantul-ierarh-vasile-de-ostrog", "Sfântul Ierarh Vasile de Ostrog", 4, 29),
        dox("mutarea-moastelor-sfantului-ierarh-nectarie", "Mutarea moaștelor Sfântului Ierarh Nectarie", 9, 3),
        dox("sfantul-ierarh-nectarie-taumaturgul-de-la-eghina", "Sfântul Ierarh Nectarie Taumaturgul de la Eghina", 11, 9),
        dox("sfantul-clement-arhiepiscopul-ohridei", "Sfântul Clement, Arhiepiscopul Ohridei", 11, 25),
      ],
      oca: ocaLines([
        { id: "101245", title: "Saint Basil, Bishop of Zakholmsk in Montenegro, Serbia", month: 4, day: 29 },
        { id: "103251", title: "Saint Nectarius Kephalas, Metropolitan of Pentapolis", month: 11, day: 9 },
        { id: "103393", title: "Hieromartyr Clement, Pope of Rome", month: 11, day: 25 },
      ]),
      // The Serbian list gives 12 May, the civil date on which the Serbian Church keeps 29 April.
      overlays: [{ tradition: "serbian", file: "serbian_saints.json", calendar: "julian", month: 5, day: 12, order: 0, name: "Basil of Ostrog", title: "Basil of Ostrog", url: "https://en.wikipedia.org/wiki/Basil_of_Ostrog", feastType: "Venerable" }],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 4, day: 29 }, { month: 9, day: 3 }, { month: 11, day: 9 }, { month: 11, day: 25 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    builder.overlay(overlayUnits(sources));
    builder.shared(["ecumenical", "serbian"]);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const names = (id: string): Array<string | undefined> => ["ro", "en"].map((lang) => output.files.get(`i18n/${lang}/persons/${id}.json`)?.names.display);
    const lineOf = (tradition: string, date: string): string[][] | undefined => output.files.get(`traditions/${tradition}/menaion/${date}.json`)?.entries.map((e: { commemorations: string[] }) => e.commemorations);
    // Metropolitan of Pentapolis is the see of St Nectarius; he lived and rests on Aegina.
    assert.deepEqual(names("nectarius-kephalas-of-pentapolis"), ["Sf. Ier. Nectarie Taumaturgul de la Eghina", "Saint Nectarius Kephalas, Metropolitan of Pentapolis"]);
    for (const tradition of ["romanian", "russian", "ecumenical", "serbian"]) assert.deepEqual(lineOf(tradition, "11/09"), [["comm:nectarius-kephalas-of-pentapolis--repose"]]);
    // The relics brought on 3 September are his: no other St Nectarius is left to claim them.
    assert.deepEqual(output.files.get("commemorations/nectarius-kephalas-of-pentapolis--translation-of-relics.json")?.subjects, ["person:nectarius-kephalas-of-pentapolis"]);
    // St Basil of Ostrog was Bishop of Zakholmsk (Zahumlje); the Serbian list's line is that commemoration too.
    assert.deepEqual(names("basil-of-zakholmsk"), ["Sf. Ier. Vasile de Ostrog", "Saint Basil, Bishop of Zakholmsk in Montenegro, Serbia"]);
    for (const tradition of ["romanian", "russian", "ecumenical", "serbian"]) assert.deepEqual(lineOf(tradition, "04/29"), [["comm:basil-of-zakholmsk--repose"]]);
    // Two sees are two hierarchs: St Clement of Ohrid is not St Clement, Pope of Rome.
    assert.equal([...output.files.keys()].filter((k) => k.startsWith("persons/")).length, 4);
  });

  it("gives a saint of the Russian list whom no calendar keeps on the list's day to the saint of that name and place kept on another day (19 October: John of Kronstadt, 12 December: Herman of Alaska), not to a saint called the New (23 September: John of Epirus)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [{ slug: "sfantul-ioan-de-kronstadt", title: "Sfântul Ioan de Kronstadt", month: 12, day: 20, order: 0, color: null, cross: null, secondRow: false }],
      oca: ocaLines([
        { id: "101143", title: "New Martyr John the New of Epirus", month: 4, day: 18 },
        { id: "103530", title: "Repose of Venerable Herman of Alaska, Wonderworker of All America", month: 12, day: 13 },
        { id: "103598", title: "Repose of Saint John of Kronstadt", month: 12, day: 20 },
      ]),
      // Civil dates of the Julian calendar: 6 October, 1 November and 25 December are 23 September, 19 October and 12 December.
      overlays: [
        { tradition: "russian", file: "russian_saints.json", calendar: "julian", month: 10, day: 6, order: 0, name: "New Martyr John of Epirus (1814)", title: "New Martyr John of Epirus (1814)", feastType: "New Martyr" },
        { tradition: "russian", file: "russian_saints.json", calendar: "julian", month: 11, day: 1, order: 0, name: "Righteous John", title: "Righteous John, Wonderworker of Kronstadt (1908).", url: "https://en.wikipedia.org/wiki/John_of_Kronstadt", feastType: "Saint" },
        { tradition: "russian", file: "russian_saints.json", calendar: "julian", month: 12, day: 25, order: 0, name: "St Herman", title: "St Herman, Wonderworker of Alaska (1836)", url: "https://en.wikipedia.org/wiki/Herman_of_Alaska", feastType: "Saint" },
      ],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 12, day: 20 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    builder.overlay(overlayUnits(sources));
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/")).sort(), ["persons/herman-of-alaska.json", "persons/john-of-epirus.json", "persons/john-of-kronstadt.json", "persons/john-the-new-of-epirus.json"]);
    // The birth of St John of Kronstadt, and St Herman a day before the OCA keeps him: one more day of the same saint.
    assert.deepEqual(output.files.get("commemorations/john-of-kronstadt--10-19.json")?.subjects, ["person:john-of-kronstadt"]);
    assert.deepEqual(output.files.get("traditions/russian/menaion/10/19.json")?.entries, [{ commemorations: ["comm:john-of-kronstadt--10-19"] }]);
    assert.deepEqual(output.files.get("commemorations/herman-of-alaska--12-12.json")?.subjects, ["person:herman-of-alaska"]);
    // John of Epirus died in 1814; John the New of Epirus (of Ioannina) in 1526.
    assert.deepEqual(output.files.get("commemorations/john-of-epirus--repose.json")?.subjects, ["person:john-of-epirus"]);
  });

  it("gives a second line of the same source and day to a saint already found only when it names him exactly (18 June: Leontie Dionisiatul; 22 June: Zina; 8 January: Gregory the Recluse; 22 September: Phocas the Gardener)", () => {
    // Doxologia lists the Martyr Leontie and Leontie of Dionysiou, an Athonite: the OCA's Venerable Leontius the Hagiorite.
    const leontie = ["Sfântul Mucenic Leontie", "Sfântul Cuvios Leontie Dionisiatul, Izvorâtorul de mir"];
    const leontius: Array<[string, string]> = [
      ["101746", "Martyrs Leontius, Hypatius, and Theodulus at Tripoli in Syria"],
      ["101749", "Venerable Leontius of the Kiev Far Caves"],
      ["101750", "Venerable Leontius the Hagiorite"],
    ];
    const expected = {
      "Sf. Mc. Leontie": "Martyr Leontius",
      "Sf. Cuv. Leontie Dionisiatul, Izvorâtorul de mir": "Venerable Leontius the Hagiorite",
      "(Martyr Hypatius)": "Martyr Hypatius",
      "(Martyr Theodulus at Tripoli in Syria)": "Martyr Theodulus at Tripoli in Syria",
      "(Venerable Leontius of the Kiev Far Caves)": "Venerable Leontius of the Kiev Far Caves",
    };
    assert.deepEqual(pairsOf(leontie, leontius, 6, 18), expected);
    assert.deepEqual(pairsOf([...leontie].reverse(), leontius, 6, 18), expected);
    // Zina, Zenon's servant, has the name key of Zenon.
    assert.deepEqual(pairsOf(["Sfântul Mucenic Zenon", "Sfântul Mucenic Zina"], [["101780", "Martyrs Zeno and his servant, Zenas, of Philadelphia"]], 6, 22), {
      "Sf. Mc. Zenon": "Martyr Zeno, his servant",
      "Sf. Mc. Zina": "Martyr Zenas, of Philadelphia",
    });
    // Two saints of the Kiev Caves, and two of Sinope.
    assert.deepEqual(Object.keys(pairsOf([], [["100115", "Venerable Gregory, Wonderworker of the Kiev Near Caves"], ["100116", "Venerable Gregory the Recluse, of the Kiev Caves"]], 1, 8)).sort(), ["(Venerable Gregory the Recluse, of the Kiev Caves)", "(Venerable Gregory, Wonderworker of the Kiev Near Caves)"]);
    assert.deepEqual(pairsOf(["Sfântul Sfințit Mucenic Foca, Episcopul de Sinope"], [["102695", "Hieromartyr Phocas, Bishop of Sinope"], ["102699", "Martyr Phokas the Gardener of Sinope"]], 9, 22), {
      "Sf. Sfințit Mc. Foca, Episcopul de Sinope": "Hieromartyr Phocas, Bishop of Sinope",
      "(Martyr Phokas the Gardener of Sinope)": "Martyr Phokas the Gardener of Sinope",
    });
    // Named exactly, the same saint: the feast of Peter and Paul, then each of them; Pontius spelled two ways.
    assert.deepEqual(
      pairsOf(
        ["Sfinții Apostoli Petru și Pavel"],
        [
          ["101840", "The Holy Glorious and All-Praised Leaders of the Apostles, Peter and Paul"],
          ["101841", "The Holy Glorious and All-Praised Leader of the Apostles, Peter"],
          ["101842", "The Holy Glorious and All-Praised Leader of the Apostles, Paul"],
        ],
        6,
        29,
      ),
      { "Sf. Ap. Petru": "The Holy Glorious and All-Praised Leader of the Apostles Peter", "Sf. Ap. Pavel": "The Holy Glorious and All-Praised Leader of the Apostles Paul" },
    );
    assert.deepEqual(Object.keys(pairsOf([], [["102209", "Hieromartyr Fabian, Pope of Rome, and Martyr Pontious"], ["109008", "Martyr Pontius"]], 8, 5)).length, 2);
  });

  it("keeps a group of a second line of the day apart from the saint its source named first (10 March: Quadratus of Nicomedia and those with him are not Codrat of Corinth)", () => {
    const sources: SourceData = {
      ...data,
      doxologia: [{ slug: "sfantul-mucenic-codrat", title: "Sfântul Mucenic Codrat", month: 3, day: 10, order: 0, color: null, cross: null, secondRow: false }],
      oca: ocaLines([
        { id: "100751", title: "Martyr Quadratus and those with him at Corinth", month: 3, day: 10 },
        { id: "100773", title: "Martyr Quadratus and those with him at Nicomedia", month: 3, day: 10 },
      ]),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(sources), [], [{ month: 3, day: 10 }]);
    builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const subjectsOf = (id: string): string[] | undefined => [...output.files.entries()].find(([k, v]) => k.startsWith("commemorations/") && v.external_ids?.oca === id)?.[1].subjects;
    assert.deepEqual(subjectsOf("100751"), ["person:quadratus"]);
    assert.deepEqual(subjectsOf("100773"), ["group:martyr-quadratus-and-companions"]);
  });

  it("does not give a saint the line of the same full name on another day when it names a man and a woman, or a martyr and a monk (11 September: Euphrosynos the Cook; 1 May: Macarius, Metropolitan of Kiev)", () => {
    const lines = ocaLines([
      { id: "100528", title: "Venerable Paphnutius and Euphrosynē of Alexandria", month: 2, day: 15 },
      { id: "102581", title: "Saint Euphrosynos the Cook of Alexandria", month: 9, day: 11 },
      // The same line as if the OCA did not call him the Cook: then only the endings of the names tell the man from the woman.
      { id: "900005", title: "Saint Euphrosynos of Alexandria", month: 9, day: 12 },
      { id: "100230", title: "Venerable Macarius the Deacon of the Kiev Caves", month: 1, day: 19 },
      { id: "101259", title: "Hieromartyr Macarius, Metropolitan of Kiev", month: 5, day: 1 },
    ]);
    const run = (doxologia: SourceData["doxologia"]): ((id: string) => Array<Array<string | undefined>> | undefined) => {
      const sources: SourceData = { ...data, doxologia, oca: lines };
      const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
      const builder = new Builder(existing);
      builder.romanian(doxologiaUnits(sources), [], [{ month: 9, day: 11 }]);
      builder.russian(ocaUnits(sources, [2026, 2028]).fixed);
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      return (id) =>
        [...output.files.entries()]
          .find(([k, v]) => k.startsWith("commemorations/") && v.external_ids?.oca === id)?.[1]
          .subjects.map((s: string) => ["ro", "en"].map((lang) => output.files.get(`i18n/${lang}/persons/${s.replace(/^person:/, "")}.json`)?.names.display));
    };
    const ocaOnly = run([]);
    assert.deepEqual(ocaOnly("102581"), [[undefined, "Saint Euphrosynos the Cook of Alexandria"]]);
    assert.deepEqual(ocaOnly("900005"), [[undefined, "Saint Euphrosynos of Alexandria"]]);
    assert.deepEqual(ocaOnly("101259"), [[undefined, "Hieromartyr Macarius, Metropolitan of Kiev"]]);
    // The Romanian calendar keeps him the same day: "bucătarul" is "the Cook".
    const withDoxologia = run([{ slug: "sfantul-cuvios-eufrosin-bucatarul", title: "Sfântul Cuvios Eufrosin Bucătarul", month: 9, day: 11, order: 0, color: null, cross: null, secondRow: false }]);
    assert.deepEqual(withDoxologia("102581"), [["Sf. Cuv. Eufrosin Bucătarul", "Saint Euphrosynos the Cook of Alexandria"]]);
  });

  it("puts together the saints whose first names or places only a table knows (4 February: Avramie is Abramius of Arbela, not Abraham of Pechenga; 19 January: Corfu is Kerkyra; 16 April: Hionia; 5 October: Haritina)", () => {
    const abramius: Array<[string, string]> = [
      ["100425", "Venerable Abraham and Coprius, of Pechenga"],
      ["100428", "Hieromartyr Abramius, Bishop of Arbela in Assyria"],
    ];
    const expected = {
      "Sf. Sfințit Mc. Avramie": "Hieromartyr Abramius, Bishop of Arbela in Assyria",
      "(Venerable Abraham)": "Venerable Abraham",
      "(Venerable Coprius, of Pechenga)": "Venerable Coprius, of Pechenga",
    };
    assert.deepEqual(pairsOf(["Sfântul Sfințit Mucenic Avramie"], abramius, 2, 4), expected);
    assert.deepEqual(pairsOf(["Sfântul Sfințit Mucenic Avramie"], [...abramius].reverse(), 2, 4), expected);
    assert.deepEqual(pairsOf(["Sfântul Ierarh Arsenie, Arhiepiscop de Corfu"], [["100235", "Saint Arsenius, Archbishop of Kerkyra"]], 1, 19), {
      "Sf. Ier. Arsenie, Arhiepiscop de Corfu": "Saint Arsenius, Archbishop of Kerkyra",
    });
    assert.deepEqual(pairsOf(["Sfintele Mucenițe fecioare Agapia, Irina și Hionia"], [["101106", "Virgin Martyrs Agape, Irene and Chionia, in Illyria"]], 4, 16), {
      "Sf. Mc. Fecioară Agapia": "Virgin Martyr Agape",
      "Sf. Mc. Fecioară Irina": "Virgin Martyr Irene",
      "Sf. Mc. Fecioară Hionia": "Virgin Martyr Chionia, in Illyria",
    });
    assert.deepEqual(pairsOf(["Sfânta Muceniță Haritina"], [["102870", "Martyr Charitina of Amisos"], ["102879", "Saint Charitina, Princess of Lithuania"]], 10, 5), {
      "Sf. Mc. Haritina": "Martyr Charitina of Amisos",
      "(Saint Charitina, Princess of Lithuania)": "Saint Charitina, Princess of Lithuania",
    });
  });

  it("writes one saint for a line that names him with two places (St Innocent of Komél and Vologda)", () => {
    const innocent: SourceData = {
      ...data,
      doxologia: [],
      oca: [2026, 2028].map((year) => ({ id: "900003", title: "Saint Innocent of Komél and Vologda disciple of Saint Nilus of Sora", path: `/saints/lives/${year}/03/19/900003-saint-innocent`, year, month: 3, day: 19, order: 0 })),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.russian(ocaUnits(innocent, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const persons = [...output.files.keys()].filter((k) => k.startsWith("persons/"));
    assert.equal(persons.length, 1);
    const id = persons[0]?.replace(/^persons\/|\.json$/g, "");
    assert.equal(output.files.get(`i18n/en/persons/${id}.json`)?.names.display, "Saint Innocent of Komél and Vologda disciple of Saint Nilus of Sora");
    assert.deepEqual(output.files.get(`commemorations/${id}--repose.json`)?.subjects, [`person:${id}`]);
  });

  it("finds a saint of the Russian list on the Menaion date, not on the civil date (St Seraphim of Sarov)", () => {
    const seraphim: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [],
      doxologia: [{ slug: "sfantul-cuvios-serafim-de-sarov", title: "Sfântul Cuvios Serafim de Sarov", month: 1, day: 2, order: 0, color: null, cross: null, secondRow: false }],
      oca: [2026, 2028].map((year) => ({ id: "100008", title: "Repose of Venerable Seraphim, Wonderworker of Sarov", path: `/saints/lives/${year}/01/02/100008-repose`, year, month: 1, day: 2, order: 0 })),
      coptic: [],
      armenian: [],
      // The list gives 15 January: the civil date on which the Russian Church keeps 2 January.
      overlays: [{ tradition: "russian", file: "russian_saints.json", calendar: "julian", month: 1, day: 15, order: 0, name: "Repose of St Seraphim of Sarov", title: "Repose of St Seraphim of Sarov", url: "https://en.wikipedia.org/wiki/Seraphim_of_Sarov", feastType: "Saint" }],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian(doxologiaUnits(seraphim), [], [{ month: 1, day: 2 }]);
    builder.russian(ocaUnits(seraphim, [2026, 2028]).fixed);
    builder.overlay(overlayUnits(seraphim));

    // One saint and one commemoration: the list's line is the day doxologia and the OCA already give.
    const clusters = builder.clusters.filter((c) => c.units.some((u) => u.source === "overlay"));
    assert.equal(clusters.length, 1);
    assert.deepEqual(clusters[0]?.units.map((u) => u.source).sort(), ["doxologia", "oca", "overlay"]);
    assert.equal(builder.lines.get("russian")?.get("01-15"), undefined);
    assert.equal(builder.lines.get("russian")?.get("01-02")?.[0]?.clusters[0], clusters[0]);

    // The person is named as a saint, not as the commemoration of his repose.
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const persons = [...output.files.keys()].filter((k) => k.startsWith("persons/"));
    assert.deepEqual(persons, ["persons/seraphim-of-sarov.json"]);
    assert.equal(output.files.get("i18n/en/persons/seraphim-of-sarov.json")?.names.display, "Venerable Seraphim, Wonderworker of Sarov");
  });

  it("keeps a saint of the Russian list on the day the OCA keeps the translation of his relics as that commemoration (5 June: Igor-George of Chernigov)", () => {
    const igor: SourceData = {
      ...data,
      doxologia: [],
      oca: [
        { id: "101611", title: "Translation of the relics of the Right-believing Igor-George, Tonsured Gabriel, Grand Prince of Chernigov, and Kiev", month: 6, day: 5 },
        { id: "102672", title: "Right-believing Great Prince Igor of Kiev and Chernigov", month: 9, day: 19 },
      ].flatMap((x) => [2026, 2028].map((year) => ({ id: x.id, title: x.title, path: `/saints/lives/${year}/${String(x.month).padStart(2, "0")}/${String(x.day).padStart(2, "0")}/${x.id}`, year, month: x.month, day: x.day, order: 0 }))),
      // The list gives 18 June, the civil date on which the Russian Church keeps 5 June.
      overlays: [{ tradition: "russian", file: "russian_saints.json", calendar: "julian", month: 6, day: 18, order: 0, name: "Blessed Igor-George", title: "Blessed Igor-George, tonsured Gabriel, great prince of Chernigov and Kiev (1147)", feastType: "Saint" }],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.russian(ocaUnits(igor, [2026, 2028]).fixed);
    builder.overlay(overlayUnits(igor));
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    // No saint of the list's own: the list keeps his relics, already on the Russian line of 5 June.
    assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/")), ["persons/igor-of-kiev-and-chernigov.json"]);
    const relics = output.files.get("commemorations/igor-of-kiev-and-chernigov--translation-of-relics.json");
    assert.deepEqual(relics?.subjects, ["person:igor-of-kiev-and-chernigov"]);
    assert.deepEqual(relics?.sources.map((s: { source: string }) => s.source), ["src:oca-lives", "src:orthodox-calendar"]);
    assert.deepEqual(output.files.get("traditions/russian/menaion/06/05.json")?.entries, [{ commemorations: ["comm:igor-of-kiev-and-chernigov--translation-of-relics"] }]);
  });

  it("writes a woman whose name does not end in -a as a woman (St Mary of Egypt)", () => {
    const mary: SourceData = {
      ...data,
      doxologia: [],
      oca: [2026, 2028].map((year) => ({ id: "900002", title: "Venerable Mary of Egypt", path: `/saints/lives/${year}/04/01/900002-venerable-mary-of-egypt`, year, month: 4, day: 1, order: 0 })),
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.russian(ocaUnits(mary, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const person = output.files.get("persons/mary-of-egypt.json");
    assert.equal(person?.gender, "female");
    assert.ok(!person?.editorial.notes.some((n: string) => n.startsWith("Genul nu reiese")));
  });

  it("keeps the two commemorations of one Coptic line on the same calendar line", () => {
    const coptic: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [],
      doxologia: [],
      oca: [],
      coptic: [
        { month: 3, day: 5, n: 2, title: "The Martyrdom of St. Timothy and the Relocation of the Body of St. Theodore, the Prince, to Shotb." },
        { month: 4, day: 17, n: 1, title: "The Commemoration of the Departure of St. Luke the Stylite and the Relocation of His Holy Relics." },
        { month: 2, day: 21, n: 2, title: "The Commemoration of the Relocation of the Body of Lazarus." },
        { month: 3, day: 21, n: 4, title: "The Commemoration of the Holy Martyrs Alphaeus, Zacchaeus, Romanus and John, and the Commemoration of the Saints Thomas, Victor, and Isaac of the City of Ashmunen." },
      ],
      armenian: [],
      overlays: [],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.coptic(copticUnits(coptic));
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const line = (date: string): string[] => output.files.get(`traditions/coptic/menaion/${date}.json`)?.entries.map((e: { commemorations: string[] }) => e.commemorations);
    assert.deepEqual(line("03/05"), [["comm:timothy--repose", "comm:theodore--translation-of-relics"]]);
    assert.equal(output.files.get("i18n/en/persons/theodore.json")?.names.display, "Saint Theodore, the Prince");
    // "the Relocation of His Holy Relics": the relics of the saint of the line.
    assert.deepEqual(line("04/17"), [["comm:luke-the-stylite--repose", "comm:luke-the-stylite--translation-of-relics"]]);
    assert.deepEqual(output.files.get("commemorations/luke-the-stylite--translation-of-relics.json")?.subjects, ["person:luke-the-stylite"]);
    // No person is named after a relocation.
    const persons = [...output.files.keys()].filter((k) => k.startsWith("persons/")).sort();
    assert.deepEqual(persons, ["persons/luke-the-stylite.json", "persons/theodore.json", "persons/timothy.json"]);
    const lazarus = line("02/21")[0]?.[0]?.replace(/^comm:/, "");
    assert.notEqual(output.files.get(`commemorations/${lazarus}.json`)?.kind, "repose");
    // Two groups named by one line: two commemorations on the same calendar line, each with its own group.
    const refs: string[] = output.files.get("traditions/coptic/menaion/03/21.json")?.entries[0]?.commemorations ?? [];
    assert.equal(refs.length, 2);
    const [martyrs, thomas] = refs.map((ref) => output.files.get(`commemorations/${ref.replace(/^comm:/, "")}.json`));
    assert.deepEqual([martyrs?.subjects, thomas?.subjects].map((s) => s?.length), [1, 1]);
    const groupName = (ref: string): string => output.files.get(`i18n/en/groups/${ref.replace(/^group:/, "")}.json`)?.names.display;
    assert.equal(groupName(martyrs?.subjects[0]), "Holy Martyrs Alphaeus, Zacchaeus, Romanus and John");
    assert.equal(groupName(thomas?.subjects[0]), "Saints Thomas, Victor, and Isaac of the City of Ashmunen");
  });

  it("gives the Coptic relics of the Great Martyr George to the Prince of the Martyrs, not to another George or to Gregory of Nyssa (16 Abib)", () => {
    const coptic: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [],
      doxologia: [],
      oca: [],
      coptic: [
        { month: 3, day: 7, n: 1, title: "The Martyrdom of St. George of Alexandria." },
        { month: 5, day: 21, n: 3, title: "The Departure of St. Gregorius (Gregory of Nyssa), Brother of St. Basil the Great." },
        { month: 8, day: 23, n: 1, title: "The Martyrdom of St. George Prince of the Martyrs." },
        { month: 11, day: 16, n: 2, title: "The Recovery of the Holy Relics of St. George, the Great Martyr." },
      ],
      armenian: [],
      overlays: [],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.coptic(copticUnits(coptic));
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    // "Prince of the Martyrs" is what the Coptic Synaxarium calls the Great Martyr.
    assert.deepEqual(output.files.get("commemorations/george-prince-of-the-martyrs--finding-of-relics.json")?.subjects, ["person:george-prince-of-the-martyrs"]);
    assert.equal([...output.files.keys()].filter((k) => k.startsWith("persons/")).length, 3);
  });

  it("gives the Coptic church of St. George of Cappadocia to the Prince of the Martyrs, not to another George (7 Hatour)", () => {
    const coptic: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [],
      doxologia: [],
      oca: [],
      coptic: [
        { month: 3, day: 7, n: 1, title: "The Martyrdom of St. George of Alexandria." },
        { month: 3, day: 7, n: 4, title: "The Consecration of the Church of St. George of Cappadocia." },
        { month: 8, day: 23, n: 1, title: "The Martyrdom of St. George Prince of the Martyrs." },
      ],
      armenian: [],
      overlays: [],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.coptic(copticUnits(coptic));
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const church = [...output.files.entries()].find(([k, v]) => k.startsWith("commemorations/") && v.external_ids?.copticchurch === "3_7#4")?.[1];
    assert.equal(church?.kind, "event");
    assert.deepEqual(church?.subjects, ["person:george-prince-of-the-martyrs"]);
    assert.equal([...output.files.keys()].filter((k) => k.startsWith("persons/")).length, 2);
  });

  it("writes a man whose name ends like a woman's as a man (Apostle Aquila, Sf. Ap. Achila)", () => {
    const aquila: SourceData = {
      accessed: "2026-11-08",
      patriarhia: [{ year: 2026, month: 7, day: 14, url: "https://calendar.patriarhia.ro/", items: [{ text: "Sf. Ap. Achila", cross: null, color: "black" }], title: "Sf. Ap. Achila", subtitle: "", publicHoliday: false }],
      doxologia: [],
      oca: [2026, 2028].map((year) => ({ id: "900003", title: "Apostle Aquila of the Seventy", path: `/saints/lives/${year}/07/14/900003-apostle-aquila-of-the-seventy`, year, month: 7, day: 14, order: 0 })),
      coptic: [],
      armenian: [],
      overlays: [],
    };
    const existing = loadExisting(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"));
    const builder = new Builder(existing);
    builder.romanian([], patriarhiaUnits(aquila), [{ month: 7, day: 14 }]);
    builder.russian(ocaUnits(aquila, [2026, 2028]).fixed);
    const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
    const persons = [...output.files.keys()].filter((k) => k.startsWith("persons/"));
    assert.equal(persons.length, 1);
    const person = output.files.get(persons[0] ?? "");
    assert.equal(person?.gender, "male");
    assert.ok(!person?.editorial.notes.some((n: string) => n.startsWith("Genul nu reiese")));
  });
});

describe("Coptic and Armenian lines on universal saints", () => {
  it("name the Theotokos only when they are about her", () => {
    const hers = [
      "The Commemoration of the Virgin St. Mary, the Theotokos.",
      "Commemoration of the Theotokos and Ever-Virgin St. Mary",
      "The Dormition of Our Lady, the Virgin Mary, the Theotokos.",
      "The Apparition of the Pure Lady the Virgin in the church of Zeiton.",
      "The Commemoration of the Consecration of the Church of the Virgin Lady known as El-Mahammah.",
      "The Commemoration of the Virgin, the Mother of God",
      "Feast of the Discovery of St. Mary’s Box",
      "Birth of St. Mary from Anna",
    ];
    for (const title of hers) assert.equal(namesTheotokos(title), true, title);
    const others = [
      "The Departure of St. Mary of Egypt.",
      "The Departure of St. Mary Magdalene.",
      "The Martyrdom of St. Mary, the Armenian.",
      "The Martyrdom of St. Mary the Israelite.",
      "The Commemoration of the Departure of St. Mary Known as Marina, the Ascetic.",
      "The Martyrdom of St. Melitina the Virgin.",
      "The Departure of St. Euphrasia (Eupraxia), the virgin.",
      "The Martyrdom of St. Arbsima (Repsima) the Virgin and Her Sisters the Virgins",
      "Commemoration of the Apostle Thaddeus and the Virgin Sandoukht",
      "The Departure of St. Anna (Hannah), the mother of the Theotokos.",
      "Commemoration of Sts. Joachim and Anna, Parents of the Holy Mother of God, and Oil-Bringing Women",
    ];
    for (const title of others) assert.equal(namesTheotokos(title), false, title);
  });

  it("tell St John the Baptist from the saints named after him", () => {
    assert.equal(namesForerunner("Saint John, the Baptist"), true);
    assert.equal(namesForerunner("Saint John the Forerunner (Baptist)"), true);
    assert.equal(namesForerunner("Beheading of St. John the Baptist"), true);
    assert.equal(namesForerunner("Prophets Ezekiel, Ezra and Zechariah - St. John the Baptist’s Father"), false);
    assert.equal(namesForerunner("Zacharias, the father of St. John the Baptist"), false);
    assert.equal(namesForerunner("Saint John, the Short"), false);
  });

  it("read the angels' annunciation to Zacharias as an event of St John the Baptist", () => {
    const p = parseCopticTitle("The Angels' Annunciation of John the Baptist to Zacharias");
    assert.equal(p.kind, "event");
    assert.equal(p.subject?.names[0]?.text, "John the Baptist");
  });

  /** The minimal fixture with more records, in a temporary folder. */
  const fixtureWith = (records: Record<string, unknown>): string => {
    const dir = mkdtempSync(join(tmpdir(), "synaxarion-import-"));
    cpSync(join(REPO_ROOT, "tests", "fixtures", "minimal", "data"), dir, { recursive: true });
    for (const [rel, value] of Object.entries(records)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), JSON.stringify(value));
    }
    return dir;
  };
  const person = (id: string, holiness: string[], en: string, ro?: string): Record<string, unknown> => ({
    [`persons/${id}.json`]: { id, kind: id === "theotokos" ? "theotokos" : "saint", holiness_types: holiness },
    [`i18n/en/persons/${id}.json`]: { id, locale: "en", names: { display: en } },
    ...(ro ? { [`i18n/ro/persons/${id}.json`]: { id, locale: "ro", names: { display: ro } } } : {}),
  });

  it("point to the Theotokos, to St John the Baptist or to the saints they name", () => {
    const dir = fixtureWith({
      ...person("theotokos", [], "Theotokos", "Maica Domnului"),
      // His mother and father are named after him; another John is an apostle.
      ...person("elizabeth-the-prophet", ["righteous", "prophet"], "Holy Prophet Elizabeth, parents of Saint John the Baptist", "Dreapta Elisabeta, mama Sfântului Ioan Botezătorul"),
      ...person("john-the-baptist", ["prophet"], "Holy Prophet, Forerunner, and Baptist John", "Sf. Proroc Ioan Botezătorul"),
      ...person("john-the-theologian", ["apostle", "evangelist"], "Apostle and Evangelist John the Theologian", "Sf. Ap. și Ev. Ioan"),
      ...person("john-mark", ["apostle"], "Apostle John, called Mark", "Sf. Ap. Ioan Marcu"),
      ...person("zachariah-the-prophet-2", ["prophet"], "Holy Prophet Zachariah", "Sf. Proroc Zaharia, tatăl Sfântului Ioan Botezătorul"),
    });
    try {
      const coptic: SourceData["coptic"] = [
        { month: 6, day: 21, n: 1, title: "The Commemoration of the Virgin St. Mary." },
        { month: 7, day: 21, n: 1, title: "Commemoration of the Theotokos and Ever-Virgin St. Mary" },
        { month: 8, day: 6, n: 2, title: "The Departure of St. Mary of Egypt." },
        { month: 3, day: 11, n: 1, title: "The Departure of St. Anna (Hannah), the mother of the Theotokos." },
        { month: 6, day: 25, n: 1, title: "The Martyrdom of Sts. Archippus, Philemon and Lycia the Virgin." },
        { month: 1, day: 2, n: 1, title: "The Martyrdom of St. John the Baptist." },
        { month: 1, day: 26, n: 1, title: "The Angels' Annunciation of John the Baptist to Zacharias" },
        { month: 10, day: 30, n: 1, title: "The Nativity of St. John, the Baptist." },
        { month: 5, day: 4, n: 1, title: "The Departure of St. John the Evangelist and Theologian" },
      ];
      const armenianPage = "https://armenianchurch.ge/en/kalendar-prazdnikov/description-2/";
      const armenian: SourceData["armenian"] = [
        { slug: "sandoukht", url: `${armenianPage}july/sandoukht`, month: "july", order: 1, title: "Commemoration of the Apostle Thaddeus and the Virgin Sandoukht" },
        { slug: "feastofthebirth", url: `${armenianPage}january/feastofthebirth`, month: "january", order: 2, title: "Feast of the Birth of St. John the Forerunner (Baptist)" },
        { slug: "beheading", url: `${armenianPage}april/beheading`, month: "april", order: 3, title: "Commemoration of Beheading of St. John the Baptist" },
      ];
      const data: SourceData = { accessed: "2026-11-08", patriarhia: [], doxologia: [], oca: [], coptic, armenian, overlays: [] };
      const existing = loadExisting(dir);
      const builder = new Builder(existing);
      builder.coptic(copticUnits(data));
      builder.armenian(armenianUnits(data));
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      const records = [...output.files].filter(([path]) => path.startsWith("commemorations/")).map(([, rec]) => rec);
      const of = (url: string): Record<string, any> | undefined => records.find((r) => r.sources.some((s: { url?: string }) => s.url === url));
      const subjects = (url: string): string[] => of(url)?.subjects ?? [];
      const copticLine = (anchor: string): string => `https://www.copticchurch.net/synaxarium/${anchor.replace("#", ".html?lang=en#")}`;

      // Lines about her name her alone, without a group of her names.
      assert.deepEqual(subjects(copticLine("6_21#1")), ["person:theotokos"]);
      assert.deepEqual(subjects(copticLine("7_21#1")), ["person:theotokos"]);
      assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("groups/")).sort(), ["groups/apostle-thaddeus-and-the-virgin-sandoukht.json", "groups/archippus-philemon-and-lycia-the-virgin.json"]);
      // Other Maries, her mother and the virgin saints are the saints of their lines.
      assert.deepEqual(subjects(copticLine("8_6#2")), ["person:mary-of-egypt"]);
      assert.equal(output.files.get("i18n/en/persons/mary-of-egypt.json")?.names.display, "Saint Mary of Egypt");
      assert.deepEqual(subjects(copticLine("3_11#1")), ["person:anna"]);
      assert.deepEqual(of(copticLine("6_25#1"))?.subjects, ["group:archippus-philemon-and-lycia-the-virgin"]);
      assert.equal(of(copticLine("6_25#1"))?.kind, "repose");
      assert.deepEqual(subjects(`${armenianPage}july/sandoukht`), ["group:apostle-thaddeus-and-the-virgin-sandoukht"]);

      // St John the Baptist, not his father or his mother, nor the apostle John.
      assert.deepEqual(subjects(copticLine("1_2#1")), ["person:john-the-baptist"]);
      assert.equal(of(copticLine("1_2#1"))?.kind, "repose");
      for (const url of [copticLine("1_26#1"), copticLine("10_30#1"), `${armenianPage}january/feastofthebirth`]) {
        assert.deepEqual(subjects(url), ["person:john-the-baptist"], url);
        assert.equal(of(url)?.kind, "event", url);
      }
      assert.deepEqual(subjects(`${armenianPage}april/beheading`), ["person:john-the-baptist"]);
      // Of the apostles named John, "the Evangelist" names one.
      assert.deepEqual(subjects(copticLine("5_4#1")), ["person:john-the-theologian"]);
      assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/")).sort(), ["persons/anna.json", "persons/mary-of-egypt.json"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("find an existing Coptic saint for a new Coptic line about him", () => {
    const copticDay = (id: string, month: number, day: number): Record<string, unknown> => ({
      [`commemorations/${id}.json`]: { id, kind: "repose", subjects: [`person:${id.split("--")[0]}`], date_rule: { type: "fixed", month, day, calendar: "coptic" } },
      [`traditions/coptic/menaion/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}.json`]: { tradition: "coptic", date: `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, entries: [{ commemorations: [`comm:${id}`] }] },
    });
    const dir = fixtureWith({
      ...person("severus-of-antioch", ["hierarch"], "Saint Severus, Patriarch of Antioch"),
      ...copticDay("severus-of-antioch--repose", 6, 14),
      // A prophet known only from the Coptic Synaxarium is still the prophet.
      ...person("joshua-son-of-nun", ["prophet"], "Great Prophet Joshua Son of Nun"),
      ...copticDay("joshua-son-of-nun--repose", 1, 1),
    });
    try {
      const coptic: SourceData["coptic"] = [
        { month: 7, day: 10, n: 1, title: "The Relocation of the Body of St. Severus, Patriarch of Antioch, to the Monastery of El-Zugag." },
        { month: 10, day: 26, n: 1, title: "The Departure of the Great Prophet Joshua Son of Nun." },
      ];
      const data: SourceData = { accessed: "2026-11-08", patriarhia: [], doxologia: [], oca: [], coptic, armenian: [], overlays: [] };
      const existing = loadExisting(dir);
      assert.equal(existing.persons.get("severus-of-antioch")?.family, "coptic");
      const builder = new Builder(existing);
      builder.coptic(copticUnits(data));
      const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();
      assert.deepEqual(output.files.get("commemorations/severus-of-antioch--translation-of-relics.json")?.subjects, ["person:severus-of-antioch"]);
      assert.deepEqual(output.files.get("commemorations/joshua-son-of-nun--coptic.json")?.subjects, ["person:joshua-son-of-nun"]);
      assert.deepEqual([...output.files.keys()].filter((k) => k.startsWith("persons/")), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
