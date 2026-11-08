import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { loadDataset } from "../tools/lib/dataset.ts";
import { REPO_ROOT } from "../tools/lib/validate.ts";
import { PAGES, anchor, buildWiki, type WikiOptions } from "../tools/lib/wiki.ts";

const FIXTURE = join(import.meta.dirname, "fixtures", "minimal", "data");
const SCHEMA_DIR = join(REPO_ROOT, "schema");

type Json = Record<string, any>;

function options(dataDir: string): WikiOptions {
  return {
    dataDir,
    schemaDir: SCHEMA_DIR,
    docsDir: join(REPO_ROOT, "docs"),
    year: 2026,
    repositoryUrl: "https://github.com/owner/repo",
    siteUrl: "https://owner.github.io/repo/",
  };
}

function readSchema(file: string): Json {
  return JSON.parse(readFileSync(join(SCHEMA_DIR, file), "utf8")) as Json;
}

/** Links that stay inside the wiki: "Page", "Page#heading" or "#heading". */
function wikiLinks(markdown: string): Array<{ page: string; fragment: string }> {
  return [...markdown.matchAll(/\]\(([^)\s]*)\)/g)]
    .map((m) => m[1] ?? "")
    .filter((target) => !/^[a-z]+:/i.test(target))
    .map((target) => {
      const [page = "", fragment = ""] = target.split("#");
      return { page, fragment };
    });
}

function headingAnchors(markdown: string): Set<string> {
  return new Set([...markdown.matchAll(/^#{1,6} (.+)$/gm)].map((m) => anchor(m[1] ?? "")));
}

/** Checks every link between wiki pages and returns how many there are. */
function assertLinksResolve(pages: Map<string, string>): number {
  let count = 0;
  for (const [file, markdown] of pages) {
    for (const { page, fragment } of wikiLinks(markdown)) {
      const target = page === "" ? file : `${page}.md`;
      assert.ok(pages.has(target), `${file} links to a missing page: ${page}`);
      if (fragment) assert.ok(headingAnchors(pages.get(target) ?? "").has(fragment), `${file} links to a missing heading: ${page}#${fragment}`);
      count++;
    }
  }
  return count;
}

describe("wiki anchors", () => {
  it("follow GitHub's heading anchors", () => {
    assert.equal(anchor("Person (locale)"), "person-locale");
    assert.equal(anchor("Long text (front matter)"), "long-text-front-matter");
    assert.equal(anchor("holiness_type"), "holiness_type");
    assert.equal(anchor("Convenții"), "convenții");
  });
});

describe("the wiki of the repository data", () => {
  const pages = buildWiki(options(join(REPO_ROOT, "data")));
  const page = (name: string): string => pages.get(`${name}.md`) ?? "";

  it("has every page, a sidebar and a footer", () => {
    const expected = [...Object.values(PAGES), "_Sidebar", "_Footer"].map((p) => `${p}.md`);
    assert.deepEqual([...pages.keys()].sort(), expected.sort());
  });

  it("links only to pages and headings that exist", () => {
    assert.ok(assertLinksResolve(pages) > 100);
  });

  it("documents every field of the main schemas", () => {
    const checks: Array<[string, string]> = [
      ["person.schema.json", PAGES.records],
      ["commemoration.schema.json", PAGES.records],
      ["tradition/tradition.schema.json", PAGES.traditions],
      ["tradition/overrides.schema.json", PAGES.traditions],
      ["i18n/person.schema.json", PAGES.locales],
      ["build/day.schema.json", PAGES.days],
    ];
    for (const [file, name] of checks) {
      const schema = readSchema(file);
      assert.match(page(name), new RegExp(`^## ${schema.title.replace(/[()]/g, "\\$&")}$`, "m"), `${file} has no section`);
      for (const field of Object.keys(schema.properties)) assert.ok(page(name).includes(`| \`${field}\` |`), `${file}: ${field} is missing`);
    }
    for (const def of Object.keys(readSchema("common/defs.schema.json").$defs)) assert.match(page(PAGES.definitions), new RegExp(`^### ${def}$`, "m"));
    assert.ok(page(PAGES.records).includes("| `ranks[].see` |"), "nested fields are listed");
  });

  it("lists every vocabulary label in each language", () => {
    const ds = loadDataset(join(REPO_ROOT, "data"));
    for (const [locale, labels] of ds.vocab) {
      for (const [key, label] of Object.entries(labels)) {
        assert.match(page(PAGES.vocabulary), new RegExp(`^## ${key.slice(0, key.indexOf("."))}$`, "m"));
        const forms = label as Json;
        const text = typeof label === "string" ? label : (forms.default ?? forms["m.sg"] ?? forms["f.sg"]);
        assert.ok(page(PAGES.vocabulary).includes(text), `${locale}: the label of ${key} is missing`);
      }
    }
  });

  it("counts the records and the calendar days", () => {
    const ds = loadDataset(join(REPO_ROOT, "data"));
    assert.ok(page(PAGES.coverage).includes(`| persons | ${ds.records.get("persons")?.size} |`));
    assert.ok(page(PAGES.home).includes(`| Traditions | ${ds.traditions.size} |`));
    assert.match(page(PAGES.coverage), /\| Romanian Orthodox Church \(`romanian`\) \| `revised_julian` \| [0-9]+ \| [0-9]+ \| [0-9]+ \| 2026 \| [0-9]+ of 365 \|/);
  });

  it("points the guide's links to files in the repository", () => {
    const guide = page(PAGES.guide);
    assert.ok(guide.includes("](https://github.com/owner/repo/blob/main/data/persons/lazarus-of-galesion.json)"));
    assert.ok(!guide.includes("](../"));
  });
});

describe("the wiki of the minimal dataset", () => {
  it("is complete and its links resolve", () => {
    const pages = buildWiki(options(FIXTURE));
    assert.ok(pages.has(`${PAGES.coverage}.md`));
    assert.ok(assertLinksResolve(pages) > 0);
  });
});
