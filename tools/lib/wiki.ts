/**
 * The repository's GitHub wiki, generated from the repository: the data
 * guide, a reference of every schema, the vocabulary in each language and
 * the coverage of the data. Pages are Markdown files named like wiki pages
 * ("Schema-records.md" is shown as "Schema records").
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { isMachineTranslation, loadDataset, type Dataset } from "./dataset.ts";
import { buildYear, loadTradition, unresolved, type TraditionData } from "./days.ts";
import { CORE_COLLECTIONS, I18N_COLLECTIONS, REQUIRED_LOCALES, TEXT_COLLECTIONS } from "./layout.ts";

type Rec = Record<string, any>;

export interface WikiOptions {
  dataDir: string;
  schemaDir: string;
  /** The guide in docs/SCHEMA.md becomes a page. */
  docsDir: string;
  /** Year of the calendar statistics. */
  year: number;
  /** https://github.com/<owner>/<repo>, for links to files. */
  repositoryUrl: string;
  /** Address of the published website. */
  siteUrl: string;
  /** Branch that links to files point to. */
  branch?: string;
}

/** Wiki page names (file names without .md). */
export const PAGES = {
  home: "Home",
  guide: "Cum-sunt-organizate-datele",
  records: "Schema-records",
  traditions: "Schema-traditions",
  locales: "Schema-locale-files",
  days: "Schema-generated-days",
  definitions: "Schema-definitions",
  vocabulary: "Vocabulary",
  coverage: "Coverage",
} as const;

/** Heading anchor, as GitHub makes it: "Person (locale)" → "person-locale". */
export function anchor(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

const code = (value: unknown): string => `\`${String(value)}\``;
const snake = (name: string): string => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function table(head: string[], rows: string[][]): string {
  const cell = (s: string): string => s.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n");
}

function page(...blocks: Array<string | false | undefined>): string {
  return `${blocks.filter((b): b is string => typeof b === "string" && b !== "").join("\n\n")}\n`;
}

// ---------------------------------------------------------------------------
// Schemas

interface Section {
  page: string;
  title: string;
}

interface SchemaContext {
  /** Schema files by path relative to the schema folder (POSIX). */
  schemas: Map<string, Rec>;
  /** Where each schema file is documented. */
  sections: Map<string, Section>;
  /** Vocabulary namespaces that have labels. */
  namespaces: Set<string>;
  repositoryUrl: string;
  branch: string;
}

const DEFINITION_FILES = ["common/defs.schema.json", "i18n/common.schema.json"];

/** Order of the schema files on their pages; files not listed come last. */
const ORDER = [
  "person",
  "group",
  "commemoration",
  "place",
  "icon",
  "hymn",
  "source",
  "media",
  "tradition",
  "entry",
  "menaion-day",
  "movable",
  "observances",
  "overrides",
  "text",
  "vocab",
  "day",
];

function schemaPage(file: string): string {
  if (file.startsWith("tradition/")) return PAGES.traditions;
  if (file.startsWith("i18n/")) return PAGES.locales;
  if (file.startsWith("build/")) return PAGES.days;
  return PAGES.records;
}

function loadSchemas(schemaDir: string): Map<string, Rec> {
  const out = new Map<string, Rec>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".schema.json")) out.set(relative(schemaDir, full).split(sep).join("/"), JSON.parse(readFileSync(full, "utf8")) as Rec);
    }
  };
  walk(schemaDir);
  return out;
}

function fileUrl(ctx: { repositoryUrl: string; branch: string }, path: string): string {
  return `${ctx.repositoryUrl}/blob/${ctx.branch}/${path}`;
}

interface RefTarget {
  file: string;
  pointer: string;
  node: Rec | undefined;
  name: string;
}

function resolveRef(ref: string, from: string, ctx: SchemaContext): RefTarget {
  const [path = "", pointer = ""] = ref.split("#");
  const file = path ? posix.normalize(posix.join(posix.dirname(from), path)) : from;
  let node: Rec | undefined = ctx.schemas.get(file);
  const keys = pointer
    .split("/")
    .slice(1)
    .map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~"));
  for (const key of keys) node = node?.[key];
  return { file, pointer, node, name: keys[keys.length - 1] ?? ctx.schemas.get(file)?.title ?? file };
}

function refLink(ref: string, from: string, ctx: SchemaContext): string {
  const target = resolveRef(ref, from, ctx);
  if (target.pointer.startsWith("/$defs/")) return `[${target.name}](${PAGES.definitions}#${anchor(target.name)})`;
  const section = ctx.sections.get(target.file);
  return section ? `[${section.title}](${section.page}#${anchor(section.title)})` : code(target.file);
}

function typeText(node: Rec, from: string, ctx: SchemaContext): string {
  if (node.$ref) return node.properties ? `${refLink(node.$ref, from, ctx)} with more fields` : refLink(node.$ref, from, ctx);
  if (node.const !== undefined) return code(node.const);
  if (node.enum) return (node.enum as unknown[]).map(code).join(", ");
  const choices = (node.oneOf ?? node.anyOf) as Rec[] | undefined;
  if (choices) return choices.map((c) => typeText(c, from, ctx)).join(" or ");
  const type = Array.isArray(node.type) ? (node.type as string[]).join(" or ") : (node.type as string | undefined);
  switch (type) {
    case "array":
      return `array of ${node.items ? typeText(node.items, from, ctx) : "values"}`;
    case "object":
      if (node.additionalProperties && typeof node.additionalProperties === "object") return `map of ${typeText(node.additionalProperties, from, ctx)}`;
      return "object";
    case "string":
      return node.format ? `string (${node.format})` : "string";
    case "integer":
    case "number":
      if (node.minimum !== undefined && node.maximum !== undefined) return `${type} ${node.minimum}–${node.maximum}`;
      if (node.minimum !== undefined) return `${type} ≥ ${node.minimum}`;
      return type;
    default:
      return type ?? "any value";
  }
}

/** Fields of an object, with nested objects as "parent.child" rows. A referenced type is described on its own. */
function propertyRows(node: Rec, from: string, ctx: SchemaContext, prefix = "", depth = 0): string[][] {
  const required = new Set((node.required ?? []) as string[]);
  const rows: string[][] = [];
  for (const [name, prop] of Object.entries((node.properties ?? {}) as Record<string, Rec>)) {
    const path = `${prefix}${name}`;
    rows.push([code(path), typeText(prop, from, ctx), required.has(name) ? "yes" : "", (prop.description as string | undefined) ?? ""]);
    const inner = prop.type === "array" ? (prop.items as Rec | undefined) : prop;
    if (depth < 2 && inner?.properties) rows.push(...propertyRows(inner, from, ctx, `${path}${prop.type === "array" ? "[]" : ""}.`, depth + 1));
  }
  return rows;
}

const FIELD_HEAD = ["Field", "Type", "Required", "Description"];

function schemaSection(file: string, schema: Rec, ctx: SchemaContext): string {
  const notes: string[] = [];
  if (schema.additionalProperties === false || schema.unevaluatedProperties === false) notes.push("No other fields are allowed.");
  if (schema.if || schema.allOf || schema.anyOf || schema.dependentRequired) notes.push(`Some fields are required only in certain cases: see the [schema file](${fileUrl(ctx, `schema/${file}`)}).`);
  return [
    `## ${schema.title ?? file}`,
    `[\`schema/${file}\`](${fileUrl(ctx, `schema/${file}`)})`,
    schema.description as string | undefined,
    table(FIELD_HEAD, propertyRows(schema, file, ctx)),
    notes.join(" "),
  ]
    .filter((b) => b)
    .join("\n\n");
}

function definitionSection(name: string, def: Rec, file: string, ctx: SchemaContext): string {
  const parts = [`### ${name}`];
  if (def.description) parts.push(def.description as string);
  if (def.properties) parts.push(table(FIELD_HEAD, propertyRows(def, file, ctx)));
  else if (def.enum) parts.push(`Values: ${(def.enum as unknown[]).map(code).join(", ")}`);
  else if (def.oneOf) parts.push(`One of: ${(def.oneOf as Rec[]).map((n) => typeText(n, file, ctx)).join(", ")}`);
  else parts.push(`Type: ${typeText(def, file, ctx)}${def.pattern ? ` matching ${code(def.pattern)}` : ""}`);
  const namespace = snake(name);
  if (ctx.namespaces.has(namespace)) parts.push(`Labels: [${namespace}](${PAGES.vocabulary}#${anchor(namespace)})`);
  return parts.join("\n\n");
}

function schemaPages(ctx: SchemaContext): Map<string, string> {
  const byPage = new Map<string, string[]>();
  const files = [...ctx.schemas.keys()]
    .filter((f) => !DEFINITION_FILES.includes(f))
    .sort((a, b) => {
      const rank = (f: string): number => {
        const i = ORDER.indexOf(posix.basename(f, ".schema.json"));
        return i === -1 ? ORDER.length : i;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  for (const file of files) {
    const p = schemaPage(file);
    const list = byPage.get(p) ?? [];
    list.push(schemaSection(file, ctx.schemas.get(file) ?? {}, ctx));
    byPage.set(p, list);
  }
  const intro: Record<string, string> = {
    [PAGES.records]: "Language-neutral records in `data/<collection>/<id>.json`. Names and texts live in the [locale files](Schema-locale-files).",
    [PAGES.traditions]: "Each tradition's calendar in `data/traditions/<id>/`: the tradition itself, the fixed days (Menaion), the movable cycle, observances and yearly overrides taken from the official calendar.",
    [PAGES.locales]: "Everything a reader sees, one file per language in `data/i18n/<locale>/`, plus long texts in Markdown with YAML front matter.",
    [PAGES.days]: "The days that `npm run generate` computes into `build/days/` and that the website publishes as JSON under `/api/v1/`.",
  };
  const out = new Map<string, string>();
  for (const [p, sections] of byPage) out.set(p, page(intro[p], ...sections));

  const definitions: string[] = ["Building blocks that the schemas refer to. Types link here; codes link to their labels in the [vocabulary](Vocabulary)."];
  for (const file of DEFINITION_FILES) {
    const schema = ctx.schemas.get(file);
    if (!schema) continue;
    definitions.push(`## ${schema.title ?? file}`, `[\`schema/${file}\`](${fileUrl(ctx, `schema/${file}`)})`);
    if (schema.description) definitions.push(schema.description as string);
    for (const [name, def] of Object.entries((schema.$defs ?? {}) as Record<string, Rec>)) definitions.push(definitionSection(name, def, file, ctx));
  }
  out.set(PAGES.definitions, page(...definitions));
  return out;
}

// ---------------------------------------------------------------------------
// Vocabulary

function labelText(label: unknown): string {
  if (label === undefined) return "—";
  if (typeof label === "string") return label;
  const forms = label as Rec;
  const shown = [...new Set(["default", "m.sg", "f.sg", "m.pl", "f.pl"].map((k) => forms[k] as string | undefined).filter(Boolean))];
  return `${shown.join(" / ")}${forms.abbr ? ` (${forms.abbr})` : ""}`;
}

function orderedLocales(locales: Iterable<string>): string[] {
  const all = [...new Set(locales)];
  return [...REQUIRED_LOCALES.filter((l) => all.includes(l)), ...all.filter((l) => !REQUIRED_LOCALES.includes(l)).sort()];
}

function vocabularyPage(ds: Dataset, repositoryUrl: string, branch: string): string {
  const locales = orderedLocales(ds.vocab.keys());
  const byNamespace = new Map<string, Set<string>>();
  for (const labels of ds.vocab.values()) {
    for (const key of Object.keys(labels)) {
      const dot = key.indexOf(".");
      const ns = key.slice(0, dot);
      const set = byNamespace.get(ns) ?? new Set<string>();
      set.add(key.slice(dot + 1));
      byNamespace.set(ns, set);
    }
  }
  const namespaces = [...byNamespace.keys()].sort();
  const files = locales.map((l) => `[${l}](${repositoryUrl}/blob/${branch}/data/i18n/${l}/vocab.json)`).join(" · ");
  const sections = namespaces.map((ns) => {
    const codes = [...(byNamespace.get(ns) ?? [])].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    const rows = codes.map((c) => [code(c), ...locales.map((l) => labelText(ds.vocab.get(l)?.[`${ns}.${c}`]))]);
    return `## ${ns}\n\n${table(["Code", ...locales], rows)}`;
  });
  return page(
    `Labels of the codes used in the data, in every language that has a vocabulary file (${files}). A label is either one text or several grammatical forms (masculine / feminine, singular / plural) with an abbreviation.`,
    `Namespaces: ${namespaces.map((ns) => `[${ns}](#${anchor(ns)})`).join(" · ")}`,
    ...sections,
  );
}

// ---------------------------------------------------------------------------
// Coverage

function displayName(ds: Dataset, collection: string, id: string): string {
  const byLocale = ds.locales.get(collection)?.get(id);
  return (byLocale?.get("en")?.names?.display ?? byLocale?.get("ro")?.names?.display ?? id) as string;
}

const LIMIT = 40;

function list(items: string[]): string {
  if (items.length === 0) return "None.";
  const shown = items.slice(0, LIMIT).map((i) => `- ${i}`);
  if (items.length > LIMIT) shown.push(`- … and ${items.length - LIMIT} more`);
  return shown.join("\n");
}

/** Table of the items that lack something in at least one of the required languages. */
function gapTable(head: string, items: Array<{ label: string; has: (locale: string) => boolean }>): string {
  const rows = items.filter((i) => REQUIRED_LOCALES.some((l) => !i.has(l))).map((i) => [i.label, ...REQUIRED_LOCALES.map((l) => (i.has(l) ? "✓" : "—"))]);
  if (rows.length === 0) return "None.";
  const more = rows.length > LIMIT ? `\n\n… and ${rows.length - LIMIT} more.` : "";
  return `${table([head, ...REQUIRED_LOCALES], rows.slice(0, LIMIT))}${more}`;
}

function coveragePage(ds: Dataset, traditions: Map<string, TraditionData>, year: number): string {
  const blocks: string[] = ["How much of the data exists, in which languages, and what is still missing. Every record is counted, whatever its editorial status."];

  blocks.push("## Records");
  blocks.push(
    table(
      ["Collection", "Records", "draft", "review", "approved"],
      CORE_COLLECTIONS.map((c) => {
        const records = [...(ds.records.get(c)?.values() ?? [])];
        const count = (status: string): string => String(records.filter((r) => r.editorial?.status === status).length);
        return [c, String(records.length), count("draft"), count("review"), count("approved")];
      }),
    ),
  );

  const locales = orderedLocales([...ds.locales.values()].flatMap((byId) => [...byId.values()].flatMap((byLocale) => [...byLocale.keys()])));
  blocks.push("## Languages");
  blocks.push("Locale files per language. Long texts are the Markdown lives and stories.");
  const rows = I18N_COLLECTIONS.map((c) => {
    const ids = ds.locales.get(c) ?? new Map<string, Map<string, Rec>>();
    const total = c === "traditions" ? ds.traditions.size : (ds.records.get(c as never)?.size ?? 0);
    return [c, String(total), ...locales.map((l) => String([...ids.values()].filter((byLocale) => byLocale.has(l)).length))];
  });
  rows.push([
    "long texts",
    "",
    ...locales.map((l) => String(TEXT_COLLECTIONS.reduce((n, c) => n + [...(ds.texts.get(c)?.values() ?? [])].filter((byLocale) => byLocale.has(l)).length, 0))),
  ]);
  blocks.push(table(["Collection", "Records", ...locales], rows));
  const machine = new Map<string, number>();
  const countMachine = (locale: string, rec: Rec): void => {
    if (isMachineTranslation(rec)) machine.set(locale, (machine.get(locale) ?? 0) + 1);
  };
  for (const byId of ds.locales.values()) for (const byLocale of byId.values()) for (const [locale, rec] of byLocale) countMachine(locale, rec);
  for (const byId of ds.texts.values()) for (const byLocale of byId.values()) for (const [locale, text] of byLocale) countMachine(locale, text.frontMatter);
  const machineTotal = [...machine.values()].reduce((a, b) => a + b, 0);
  const machineDetail = orderedLocales(machine.keys()).map((l) => `${code(l)}: ${machine.get(l)}`).join(" · ");
  blocks.push(`Machine translations waiting for review, shown on the website with a notice: ${machineTotal}${machineTotal > 0 ? ` (${machineDetail})` : ""}.`);

  blocks.push(`## Calendars in ${year}`);
  blocks.push(
    table(
      ["Tradition", "Calendar", "Menaion days", "Movable", "Observances", "Official years", `Days with commemorations in ${year}`],
      [...traditions].map(([id, data]) => {
        const days = buildYear(data, year);
        return [
          `${displayName(ds, "traditions", id)} (${code(id)})`,
          code(data.tradition.calendar_style),
          String(data.menaion.size),
          String(((data.movable.entries ?? []) as Rec[]).length),
          String(data.observances.length),
          [...data.overrides.keys()].sort().join(", ") || "—",
          `${days.filter((d) => d.lines.length > 0).length} of ${days.length}`,
        ];
      }),
    ),
  );

  blocks.push("## What is missing");
  const placed = new Set<string>();
  const pending = new Map<string, string[]>();
  for (const [id, data] of traditions) {
    for (const entries of data.menaion.values()) for (const e of entries) for (const c of (e.commemorations ?? []) as string[]) placed.add(c);
    for (const e of (data.movable.entries ?? []) as Rec[]) for (const c of (e.commemorations ?? []) as string[]) placed.add(c);
    for (const c of unresolved(data)) pending.set(c, [...(pending.get(c) ?? []), id]);
  }
  const unplaced = [...(ds.records.get("commemorations")?.keys() ?? [])].filter((id) => !placed.has(`comm:${id}`));
  blocks.push("### Commemorations that no calendar lists", list(unplaced.map((id) => `${code(`comm:${id}`)} ${displayName(ds, "commemorations", id)}`)));
  blocks.push(
    "### Commemorations without a known date",
    list([...pending].map(([c, ids]) => `${code(c)} ${displayName(ds, "commemorations", c.slice(c.indexOf(":") + 1))}: ${ids.map(code).join(", ")}`)),
  );
  // Same rule as the validator: a saint's day takes its title from its subjects.
  const named: Array<{ label: string; has: (locale: string) => boolean }> = [];
  for (const c of I18N_COLLECTIONS) {
    const ids = c === "traditions" ? [...ds.traditions.keys()] : [...(ds.records.get(c as never)?.keys() ?? [])];
    for (const id of ids) {
      const rec = ds.records.get(c as never)?.get(id);
      if (c === "commemorations" && rec?.kind === "repose" && (rec.subjects ?? []).length > 0) continue;
      named.push({ label: code(`${c}/${id}`), has: (l) => ds.locales.get(c)?.get(id)?.has(l) ?? false });
    }
  }
  blocks.push(`### Records without a name in ${REQUIRED_LOCALES.map(code).join(" or ")}`, gapTable("Record", named));

  const persons = [...(ds.records.get("persons")?.keys() ?? [])];
  const hasLife = (id: string, locale: string): boolean => ds.texts.get("persons")?.get(id)?.has(locale) ?? false;
  const counts = REQUIRED_LOCALES.map((l) => `${code(l)}: ${persons.filter((id) => hasLife(id, l)).length} of ${persons.length}`).join(" · ");
  blocks.push(
    "### Saints without a long life",
    `Lives written so far: ${counts}.`,
    gapTable(
      "Saint",
      persons.map((id) => ({ label: displayName(ds, "persons", id), has: (l) => hasLife(id, l) })),
    ),
  );
  return page(...blocks);
}

// ---------------------------------------------------------------------------
// Guide, home, sidebar, footer

/** docs/SCHEMA.md, with links to repository files made absolute. */
function guidePage(docsDir: string, repositoryUrl: string, branch: string): string | undefined {
  let text: string;
  try {
    text = readFileSync(join(docsDir, "SCHEMA.md"), "utf8").replace(/\r\n/g, "\n");
  } catch {
    return undefined;
  }
  return text.replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, (_, target: string) => {
    const path = posix.normalize(posix.join("docs", target));
    return `](${repositoryUrl}/blob/${branch}/${path})`;
  });
}

function homePage(ds: Dataset, options: WikiOptions, hasGuide: boolean): string {
  const counts: Array<[string, number]> = [
    ["Saints, the Theotokos and angels", ds.records.get("persons")?.size ?? 0],
    ["Groups of saints", ds.records.get("groups")?.size ?? 0],
    ["Commemorations", ds.records.get("commemorations")?.size ?? 0],
    ["Places", ds.records.get("places")?.size ?? 0],
    ["Hymns", ds.records.get("hymns")?.size ?? 0],
    ["Sources", ds.records.get("sources")?.size ?? 0],
    ["Traditions", ds.traditions.size],
    ["Languages", new Set([...ds.vocab.keys(), ...[...ds.locales.values()].flatMap((byId) => [...byId.values()].flatMap((byLocale) => [...byLocale.keys()]))]).size],
  ];
  return page(
    "**Orthodox Synaxarion** is an open, structured and multilingual synaxarion of the Orthodox Churches (Eastern Orthodox, Oriental Orthodox and the Assyrian Church of the East): JSON data validated by JSON Schema, from which a website, calendar feeds and a static API are generated.",
    `- Website: ${options.siteUrl}\n- Repository: ${options.repositoryUrl}`,
    "> This wiki is generated from the repository on every change to `main`. Edit the files in the repository, not these pages: changes made here are overwritten.",
    "## The data today",
    table(
      ["", "Count"],
      counts.map(([label, n]) => [label, String(n)]),
    ),
    "Every record is a draft until a reviewer approves it. See the [coverage](Coverage) for details and for what is missing.",
    "## Pages",
    [
      hasGuide ? `- [Cum sunt organizate datele](${PAGES.guide}) (in Romanian): how the data is organized and how to add a saint` : "",
      `- Schema reference: [records](${PAGES.records}) · [traditions](${PAGES.traditions}) · [locale files](${PAGES.locales}) · [generated days](${PAGES.days}) · [shared definitions](${PAGES.definitions})`,
      `- [Vocabulary](${PAGES.vocabulary}): the labels of every code, in each language`,
      `- [Coverage](${PAGES.coverage}): records, languages and calendars, and what is still missing`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

function sidebar(options: WikiOptions, hasGuide: boolean): string {
  return page(
    `**[Home](${PAGES.home})**`,
    hasGuide ? `**Guide**\n\n- [Cum sunt organizate datele](${PAGES.guide})` : "",
    [
      "**Schema**",
      "",
      `- [Records](${PAGES.records})`,
      `- [Traditions](${PAGES.traditions})`,
      `- [Locale files](${PAGES.locales})`,
      `- [Generated days](${PAGES.days})`,
      `- [Shared definitions](${PAGES.definitions})`,
    ].join("\n"),
    ["**Data**", "", `- [Vocabulary](${PAGES.vocabulary})`, `- [Coverage](${PAGES.coverage})`].join("\n"),
    `[Website](${options.siteUrl}) · [Repository](${options.repositoryUrl})`,
  );
}

function footer(options: WikiOptions): string {
  return page(`Generated from [the repository](${options.repositoryUrl}) by \`tools/wiki.ts\`. Edit the repository, not this wiki: changes made here are overwritten.`);
}

/** Every page of the wiki: file name → Markdown. */
export function buildWiki(options: WikiOptions): Map<string, string> {
  const branch = options.branch ?? "main";
  const ds = loadDataset(options.dataDir);
  const traditions = new Map([...ds.traditions.keys()].sort().map((id) => [id, loadTradition(options.dataDir, id)] as const));
  const schemas = loadSchemas(options.schemaDir);
  const sections = new Map<string, Section>();
  for (const [file, schema] of schemas) {
    if (!DEFINITION_FILES.includes(file)) sections.set(file, { page: schemaPage(file), title: (schema.title as string | undefined) ?? file });
  }
  const namespaces = new Set([...ds.vocab.values()].flatMap((labels) => Object.keys(labels).map((k) => k.slice(0, k.indexOf(".")))));
  const ctx: SchemaContext = { schemas, sections, namespaces, repositoryUrl: options.repositoryUrl, branch };

  const guide = guidePage(options.docsDir, options.repositoryUrl, branch);
  const pages = new Map<string, string>();
  pages.set(PAGES.home, homePage(ds, options, guide !== undefined));
  if (guide !== undefined) pages.set(PAGES.guide, guide);
  for (const [name, content] of schemaPages(ctx)) pages.set(name, content);
  pages.set(PAGES.vocabulary, vocabularyPage(ds, options.repositoryUrl, branch));
  pages.set(PAGES.coverage, coveragePage(ds, traditions, options.year));
  pages.set("_Sidebar", sidebar(options, guide !== undefined));
  pages.set("_Footer", footer(options));
  return new Map([...pages].map(([name, content]) => [`${name}.md`, content]));
}
