/**
 * Generates the days of one or more years for one or more traditions.
 *
 *   npm run generate -- --year 2026                      # every tradition
 *   npm run generate -- --tradition romanian --from 2025 --to 2027
 *
 * Output: build/days/<tradition>/<year>/<MM-DD>.json and build/days/<tradition>/<year>.json
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs, styleText } from "node:util";
import { buildYear, compareWithOverrides, loadTradition, unresolved } from "./lib/days.ts";
import { canonicalJson } from "./lib/text.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    data: { type: "string" },
    out: { type: "string" },
    tradition: { type: "string", multiple: true },
    year: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
  },
});

const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));
const outDir = resolve(values.out ?? join(REPO_ROOT, "build", "days"));
const thisYear = new Date().getFullYear();
const from = Number(values.from ?? values.year ?? thisYear);
const to = Number(values.to ?? values.year ?? from);
if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
  console.error("Give a year (--year 2026) or a range (--from 2025 --to 2027).");
  process.exit(2);
}
const available = readdirSync(join(dataDir, "traditions"));
const traditions = values.tradition ?? available;
for (const id of traditions) {
  if (!available.includes(id)) {
    console.error(`Unknown tradition "${id}". Available: ${available.join(", ")}`);
    process.exit(2);
  }
}

let files = 0;
for (const id of traditions) {
  const data = loadTradition(dataDir, id);
  const pending = unresolved(data);
  for (let year = from; year <= to; year++) {
    const days = buildYear(data, year);
    const dir = join(outDir, id, String(year));
    mkdirSync(dir, { recursive: true });
    for (const day of days) {
      writeFileSync(join(dir, `${day.date.slice(5)}.json`), canonicalJson(day));
      files++;
    }
    writeFileSync(join(outDir, id, `${year}.json`), canonicalJson(days));
    files++;

    const withLines = days.filter((d) => d.lines.length > 0).length;
    let line = `${id} ${year}: ${withLines} day(s) with commemorations`;
    const mismatches = compareWithOverrides(data, year);
    if (mismatches.length > 0) line += styleText("yellow", ` · ${mismatches.length} computed value(s) differ from the official calendar`);
    if (pending.length > 0) line += styleText("yellow", ` · ${pending.length} commemoration(s) without a known date rule`);
    console.log(line);
    for (const m of mismatches) console.log(styleText("dim", `    ${m.date} ${m.field}: computed ${String(m.computed)}, official ${String(m.official)}`));
  }
}
console.log(`${files} file(s) written to ${outDir}`);
