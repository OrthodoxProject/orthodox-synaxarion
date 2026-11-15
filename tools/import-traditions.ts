/**
 * Imports the calendars of the Churches whose sources write in other languages than Romanian and English: for now
 * the Georgian Orthodox Church, from the calendar of the Patriarchate of Georgia (patriarchate.ge). Each line is
 * matched with the commemorations that the calendars already in data/ keep on the same Menaion day (see
 * tools/lib/import/church.ts); the lines go to the tradition's calendar, and what is not found becomes new records,
 * named in the source's language. Run it after `npm run import`, then `npm run format` and `npm run check`.
 *
 *   npm run import:traditions                      # download what is missing, then write data/
 *   node tools/import-traditions.ts --offline      # use only pages already in build/cache/
 *   node tools/import-traditions.ts --dry-run      # report, without writing
 *   node tools/import-traditions.ts --report <file> # also list every line and what it became (TSV)
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { importChurch, type ChurchSource } from "./lib/import/church.ts";
import { loadExisting } from "./lib/import/existing.ts";
import { PoliteFetcher } from "./lib/import/fetch.ts";
import { parseKa } from "./lib/import/ka.ts";
import * as georgian from "./lib/import/sources/patriarchate-ge.ts";
import { classify, isRomanian } from "./lib/layout.ts";
import { canonicalJson, fixCedilla, mapStrings } from "./lib/text.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    data: { type: "string" },
    cache: { type: "string" },
    offline: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    report: { type: "string" },
  },
});

const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));
const cacheDir = resolve(values.cache ?? join(REPO_ROOT, "build", "cache"));
const log = (message: string): void => console.log(message);
const fetcher = new PoliteFetcher({ cacheDir, offline: values.offline, log });
const accessed = new Date().toISOString().slice(0, 10);

log("Reading the calendar of the Patriarchate of Georgia (cached pages are reused)…");
const entries = await georgian.crawl(fetcher, log);
const source: ChurchSource = {
  tradition: "georgian",
  source: "src:patriarchate-ge",
  key: "patriarchate-ge",
  lang: "ka",
  note: "calendarul Patriarhiei Georgiei (patriarchate.ge)",
  entries: entries.map((e) => ({ key: String(e.id), month: e.month, day: e.day, order: e.order, title: e.title, url: georgian.entryUrl(e), parts: parseKa(e.title) })),
};
log(`  ${entries.length} commemorations, ${fetcher.requests} page(s) downloaded, ${fetcher.cacheHits} from the cache.`);

const existing = loadExisting(dataDir);
const result = importChurch(existing, source, accessed);

log("\nGeorgian Orthodox Church:");
for (const [k, v] of [...result.stats].sort()) log(`  ${k.padEnd(28)} ${v}`);

if (values.report) {
  const rows = ["date\tid\ttitle\tenglish\toutcome\tcommemorations"];
  for (const r of result.reports) {
    for (const { part, outcome } of r.parts) {
      const comms = "comms" in outcome ? outcome.comms.join(" ") : "why" in outcome ? outcome.why : "";
      rows.push([`${String(r.entry.month).padStart(2, "0")}-${String(r.entry.day).padStart(2, "0")}`, r.entry.key, r.entry.title, part.en, outcome.kind, comms].join("\t"));
    }
  }
  mkdirSync(dirname(resolve(values.report)), { recursive: true });
  writeFileSync(resolve(values.report), `${rows.join("\n")}\n`, "utf8");
  log(`\nReport: ${resolve(values.report)}`);
}

if (values["dry-run"]) {
  log(`\n${result.files.size} file(s) would be written (dry run).`);
} else {
  let created = 0;
  let updated = 0;
  for (const [rel, value] of result.files) {
    const full = join(dataDir, rel);
    const kind = classify(rel);
    const romanian = "locale" in kind && isRomanian(kind.locale);
    const fixed = mapStrings(value, (s) => (romanian ? fixCedilla(s.normalize("NFC")) : s.normalize("NFC")));
    if (existsSync(full)) updated++;
    else created++;
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, canonicalJson(fixed), "utf8");
  }
  log(`\n${created} file(s) created, ${updated} updated in ${dataDir}.`);
  log("Next: npm run format && npm run check");
}
