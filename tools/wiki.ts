/**
 * Generates the repository wiki as Markdown pages.
 *
 *   npm run wiki
 *   node tools/wiki.ts --out <dir> --year 2026
 *
 * Output: build/wiki/*.md. The Wiki workflow publishes these pages to the GitHub wiki.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT } from "./lib/validate.ts";
import { buildWiki } from "./lib/wiki.ts";

const { values } = parseArgs({ options: { data: { type: "string" }, out: { type: "string" }, year: { type: "string" } } });

const year = Number(values.year ?? new Date().getFullYear());
if (!Number.isInteger(year)) {
  console.error("Give the year of the calendar statistics as --year 2026.");
  process.exit(2);
}

// On GitHub Actions the links follow the repository that runs the workflow.
const repository = process.env.GITHUB_REPOSITORY ?? "OrthodoxProject/orthodox-synaxarion";
const [owner = "", name = ""] = repository.split("/");
const pages = buildWiki({
  dataDir: resolve(values.data ?? join(REPO_ROOT, "data")),
  schemaDir: join(REPO_ROOT, "schema"),
  docsDir: join(REPO_ROOT, "docs"),
  year,
  repositoryUrl: `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${repository}`,
  siteUrl: `https://${owner.toLowerCase()}.github.io/${name}/`,
});

const outDir = resolve(values.out ?? join(REPO_ROOT, "build", "wiki"));
mkdirSync(outDir, { recursive: true });
// Pages that are no longer generated must disappear from the wiki too.
for (const file of readdirSync(outDir)) if (file.endsWith(".md")) rmSync(join(outDir, file));
for (const [file, content] of pages) writeFileSync(join(outDir, file), content);
console.log(`${pages.size} page(s) written to ${outDir}`);
