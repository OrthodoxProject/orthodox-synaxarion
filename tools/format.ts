/**
 * Rewrites data files in canonical form: JSON with 2-space indentation and a
 * final newline, LF line endings, Unicode NFC, and ș/ț with comma below in
 * Romanian locale files.
 *
 *   npm run format
 *   node tools/format.ts --data <dir>
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { classify, isRomanian } from "./lib/layout.ts";
import { canonicalJson, fixCedilla, mapStrings } from "./lib/text.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({ options: { data: { type: "string" } } });
const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

const files: string[] = [];
walk(dataDir, files);
let changed = 0;
for (const full of files) {
  const rel = relative(dataDir, full).split(sep).join("/");
  const kind = classify(rel);
  const romanian = "locale" in kind && isRomanian(kind.locale);
  const fix = (s: string): string => {
    const nfc = s.normalize("NFC");
    return romanian ? fixCedilla(nfc) : nfc;
  };
  const raw = readFileSync(full, "utf8");
  let next: string;
  if (full.endsWith(".json")) {
    try {
      next = canonicalJson(mapStrings(JSON.parse(raw), fix));
    } catch (e) {
      console.error(`skipped (invalid JSON): ${rel}: ${(e as Error).message}`);
      continue;
    }
  } else if (full.endsWith(".md")) {
    next = `${fix(raw.replace(/\r\n/g, "\n")).replace(/\s*$/, "")}\n`;
  } else {
    continue;
  }
  if (next !== raw) {
    writeFileSync(full, next, "utf8");
    changed++;
    console.log(`formatted ${rel}`);
  }
}
console.log(`${changed} file(s) changed, ${files.length} checked.`);
