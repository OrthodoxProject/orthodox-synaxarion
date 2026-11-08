/**
 * Imports the saints and feasts listed by the sources in data/sources/ into the
 * dataset: calendar.patriarhia.ro and doxologia.ro (Romanian calendar), the OCA
 * lives of the saints (Russian calendar), the local lists of orthodox-calendar,
 * the Coptic Synaxarium (copticchurch.net, st-takla.org) and the Armenian
 * calendar (armenianchurch.ge). Only facts are taken: names, days, crosses,
 * links and the fasting printed in the official Romanian calendar, which goes
 * to the yearly overrides; texts of lives and hymns are not copied.
 *
 *   npm run import                    # download what is missing, then write data/
 *   node tools/import.ts --offline    # use only pages already in build/cache/
 *   node tools/import.ts --dry-run    # report, without writing
 *   node tools/import.ts --oca-years 2026,2028   # years of the OCA calendar to compare
 *
 * Pages are cached in build/cache/; robots.txt and the sites' Crawl-delay are
 * honoured, so a first run takes about two hours (the OCA asks for 10 seconds
 * between pages). Existing records are not rewritten: new records are added,
 * and new lines are appended to existing calendar days. Run `npm run format`
 * and `npm run check` afterwards.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Builder } from "./lib/import/build.ts";
import { loadExisting } from "./lib/import/existing.ts";
import { fastingOverrides } from "./lib/import/fasting.ts";
import { PoliteFetcher } from "./lib/import/fetch.ts";
import { RecordWriter } from "./lib/import/records.ts";
import * as armenian from "./lib/import/sources/armenian.ts";
import * as coptic from "./lib/import/sources/coptic.ts";
import * as doxologia from "./lib/import/sources/doxologia.ts";
import * as oca from "./lib/import/sources/oca.ts";
import * as orthodoxCalendar from "./lib/import/sources/orthodox-calendar.ts";
import * as patriarhia from "./lib/import/sources/patriarhia.ts";
import { armenianUnits, copticUnits, doxologiaUnits, ocaUnits, overlayUnits, patriarhiaUnits, type SourceData } from "./lib/import/units.ts";
import { classify, isRomanian } from "./lib/layout.ts";
import { canonicalJson, fixCedilla, mapStrings } from "./lib/text.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    data: { type: "string" },
    cache: { type: "string" },
    offline: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "oca-years": { type: "string" },
  },
});

const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));
const cacheDir = resolve(values.cache ?? join(REPO_ROOT, "build", "cache"));
const log = (message: string): void => console.log(message);
const fetcher = new PoliteFetcher({ cacheDir, offline: values.offline, log });
const accessed = new Date().toISOString().slice(0, 10);
const ocaYears = values["oca-years"] ? values["oca-years"].split(",").map(Number) : oca.OCA_YEARS;

log("Reading the sources (cached pages are reused)…");
const data: SourceData = {
  accessed,
  patriarhia: await patriarhia.crawl(fetcher),
  doxologia: await doxologia.crawl(fetcher),
  oca: await oca.crawl(fetcher, log, ocaYears),
  coptic: await coptic.crawl(fetcher, log),
  armenian: await armenian.crawl(fetcher),
  overlays: await orthodoxCalendar.crawl(fetcher),
};
log(`  ${fetcher.requests} page(s) downloaded, ${fetcher.cacheHits} from the cache.`);

const existing = loadExisting(dataDir);
const builder = new Builder(existing);
const ocaSplit = ocaUnits(data, ocaYears);
builder.romanian(
  doxologiaUnits(data),
  patriarhiaUnits(data),
  data.patriarhia.map((d) => ({ month: d.month, day: d.day })),
);
builder.russian(ocaSplit.fixed);
const overlays = overlayUnits(data);
// The Romanian list only completes saints that the official calendar already has.
builder.overlay(overlays.filter((u) => u.tradition !== "romanian"));
builder.enrich(overlays.filter((u) => u.tradition === "romanian"));
builder.shared(["ecumenical", "serbian"]);
builder.coptic(copticUnits(data));
builder.armenian(armenianUnits(data));

const output = new RecordWriter(existing, { clusters: builder.clusters, lines: builder.lines, movable: builder.movable, stats: builder.stats }).write();

// The fasting printed in the official calendar goes to the yearly overrides of the Romanian calendar.
const romanian = existing.dataset.traditions.get("romanian");
const fasting = romanian
  ? fastingOverrides(dataDir, data.patriarhia, romanian, { source: "src:calendar-patriarhia", url: patriarhia.PATRIARHIA_URL, accessed })
  : { files: new Map<string, Record<string, unknown>>(), stats: new Map<string, number>() };
for (const [rel, doc] of fasting.files) output.files.set(rel, doc);

const report = new Map([...builder.stats, ...output.stats, ...fasting.stats]);
log("\nSources:");
for (const [k, v] of [...report].sort()) log(`  ${k.padEnd(28)} ${v}`);
log(`  ${"oca.movable (skipped)".padEnd(28)} ${new Set(ocaSplit.movable.map((x) => x.id)).size}`);

if (values["dry-run"]) {
  log(`\n${output.files.size} file(s) would be written (dry run).`);
} else {
  let created = 0;
  let updated = 0;
  for (const [rel, value] of output.files) {
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
