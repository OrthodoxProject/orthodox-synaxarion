/**
 * Translates the names and texts that a record has in one of the site's
 * languages (ro, en) but not in the other, in two steps.
 *
 *   npm run translate -- --export     # writes build/translate/<locale>.json: what each language lacks
 *   npm run translate -- --apply      # writes the filled entries to data/i18n/<locale>/
 *   node tools/translate.ts --apply --dir <dir> --method human --date 2026-11-08
 *
 * Each entry of a worklist gives the text to translate ("source"), its language
 * ("from") and some context (kind, gender, holiness, the traditions that keep
 * the record, names that related records already have in the target language).
 * Fill "target" with the translation, in the shape of "source"; entries left
 * null are skipped. The files written are marked as machine translations
 * ("method": "machine", "status": "machine") unless --method human is given;
 * the website shows them with a notice until someone reviews them. A record's
 * own text in a language is never replaced; an earlier machine translation is.
 * Run `npm run check` afterwards.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadDataset } from "./lib/dataset.ts";
import { canonicalJson } from "./lib/text.ts";
import { applyWorklist, worklists, type Worklist } from "./lib/translate.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    export: { type: "boolean", default: false },
    apply: { type: "boolean", default: false },
    dir: { type: "string" },
    data: { type: "string" },
    method: { type: "string", default: "machine" },
    date: { type: "string" },
  },
});

if (values.export === values.apply) {
  console.error("Give either --export or --apply.");
  process.exit(2);
}
const method = values.method;
if (method !== "machine" && method !== "human") {
  console.error("--method is machine or human.");
  process.exit(2);
}
const date = values.date ?? new Date().toISOString().slice(0, 10);
if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
  console.error("--date is YYYY-MM-DD.");
  process.exit(2);
}

const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));
const dir = resolve(values.dir ?? join(REPO_ROOT, "build", "translate"));
const ds = loadDataset(dataDir);

if (values.export) {
  mkdirSync(dir, { recursive: true });
  for (const list of worklists(ds, dataDir)) {
    const path = join(dir, `${list.locale}.json`);
    writeFileSync(path, canonicalJson(list), "utf8");
    const counts = new Map<string, number>();
    for (const e of list.entries) {
      const key = e.part === "life" ? `${e.collection} (long texts)` : e.collection;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const detail = [...counts].map(([k, n]) => `${n} ${k}`).join(", ");
    console.log(`${list.locale}: ${list.entries.length} to translate${detail ? ` (${detail})` : ""} → ${relative(process.cwd(), path)}`);
  }
} else {
  if (!existsSync(dir)) {
    console.error(`No worklists in ${dir}; run --export first.`);
    process.exit(2);
  }
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const list = JSON.parse(readFileSync(join(dir, name), "utf8")) as Worklist;
    if (typeof list.locale !== "string" || !Array.isArray(list.entries)) continue;
    const result = applyWorklist(ds, list, { method, date });
    for (const [rel, content] of result.files) {
      const full = join(dataDir, rel);
      if (existsSync(full)) updated++;
      else created++;
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content, "utf8");
    }
    for (const reason of result.skipped) console.log(`skipped ${reason}`);
    skipped += result.skipped.length;
  }
  console.log(`${created} file(s) created, ${updated} updated, ${skipped} skipped in ${dataDir}.`);
  console.log("Next: npm run check");
}
