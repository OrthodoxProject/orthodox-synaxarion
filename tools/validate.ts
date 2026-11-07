/**
 * Validates the dataset: JSON Schema for every file, then the rules that span
 * several files (references, commemorations, locales, licenses, diacritics).
 *
 *   npm run validate                 # validates data/
 *   node tools/validate.ts --data <dir> [--quiet]
 */
import { join, resolve } from "node:path";
import { parseArgs, styleText } from "node:util";
import type { Issue } from "./lib/issues.ts";
import { REPO_ROOT, validate } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    data: { type: "string" },
    quiet: { type: "boolean", default: false },
  },
});

const dataDir = resolve(values.data ?? join(REPO_ROOT, "data"));
const result = validate({ dataDir });
const shown = values.quiet ? result.errors : result.issues;

const byFile = new Map<string, Issue[]>();
for (const issue of shown) {
  const list = byFile.get(issue.file) ?? [];
  list.push(issue);
  byFile.set(issue.file, list);
}

for (const file of [...byFile.keys()].sort()) {
  console.log(styleText("underline", file || "(dataset)"));
  for (const issue of byFile.get(file) ?? []) {
    const label = issue.severity === "error" ? styleText("red", "error  ") : styleText("yellow", "warning");
    console.log(`  ${label} ${styleText("dim", issue.code.padEnd(32))} ${issue.message}`);
  }
}

const counts = Object.entries(result.stats)
  .map(([k, v]) => `${v} ${k}`)
  .join(" · ");
console.log(`\n${counts}`);
const summary = `${result.errors.length} error(s), ${result.warnings.length} warning(s)`;
console.log(result.errors.length > 0 ? styleText("red", `✖ ${summary}`) : styleText("green", `✔ ${summary}`));
process.exitCode = result.errors.length > 0 ? 1 : 0;
