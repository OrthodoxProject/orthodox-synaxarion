/**
 * Translation worklists: the names and texts that a record has in one of the
 * site's languages and lacks in another, for a translator to fill in, and the
 * locale files written back from the filled lists.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { isMachineTranslation, type Dataset } from "./dataset.ts";
import { REF_PREFIXES, REQUIRED_LOCALES, isRomanian } from "./layout.ts";
import { canonicalJson, fixCedilla, mapStrings } from "./text.ts";

type Rec = Record<string, any>;

/** Records whose names readers see on the site. */
export const TRANSLATED_COLLECTIONS = ["persons", "groups", "commemorations", "icons", "places"] as const;

/** Names carried into a translation; variants, popular names and inflected forms belong to each language. */
const NAME_FIELDS = ["display", "full", "short", "given", "epithets", "secular", "monastic", "modern"];
const LIST_FIELDS = new Set(["epithets", "monastic"]);
/** Short texts carried into a translation. */
const TEXT_FIELDS = ["summary", "synaxarion", "iconography_description"];

const PREFIX: Record<string, string> = Object.fromEntries(Object.entries(REF_PREFIXES).map(([prefix, collection]) => [collection, prefix]));

export interface Entry {
  collection: string;
  id: string;
  /** "names": the locale file <id>.json; "life": the long text <id>.md. */
  part: "names" | "life";
  /** Language of the source. */
  from: string;
  /** What helps to translate: kind, gender, holiness, the traditions that keep the record, names of related records in the target language. */
  context: Rec;
  /** What to translate. */
  source: Rec;
  /** The translation, in the shape of the source; null until a translator fills it in. */
  target: Rec | null;
}

export interface Worklist {
  /** Language to translate into. */
  locale: string;
  entries: Entry[];
}

/**
 * The day of one saint (or one group) is shown on the saint's page, under the saint's name, so
 * it is not translated on its own. The common day of several saints has a page and a title of its own.
 */
function derivable(rec: Rec): boolean {
  const subjects = (rec.subjects ?? []) as string[];
  return rec.kind === "repose" && subjects.length === 1 && /^(?:person|group):/.test(subjects[0] ?? "");
}

/** The language to translate from: the other site languages first, never a machine translation. */
function sourceLocale(available: Map<string, Rec>, target: string, preferred: readonly string[]): string | undefined {
  const order = [...preferred, ...[...available.keys()].sort()];
  return order.find((l) => l !== target && available.has(l) && !isMachineTranslation(available.get(l)));
}

/** Traditions that keep each record: commemorations, their subjects, and the members of groups among them. */
function traditionsByRef(ds: Dataset, dataDir: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (ref: string, tradition: string): void => {
    let set = out.get(ref);
    if (!set) out.set(ref, (set = new Set()));
    set.add(tradition);
  };
  const readJson = (path: string): Rec => JSON.parse(readFileSync(path, "utf8")) as Rec;
  for (const tradition of ds.traditions.keys()) {
    const dir = join(dataDir, "traditions", tradition);
    const lines: Rec[] = [];
    const menaion = join(dir, "menaion");
    if (existsSync(menaion)) {
      for (const mm of readdirSync(menaion)) {
        for (const file of readdirSync(join(menaion, mm))) lines.push(...((readJson(join(menaion, mm, file)).entries ?? []) as Rec[]));
      }
    }
    if (existsSync(join(dir, "movable.json"))) lines.push(...((readJson(join(dir, "movable.json")).entries ?? []) as Rec[]));
    for (const line of lines) for (const c of (line.commemorations ?? []) as string[]) add(c, tradition);
  }
  const members = new Map<string, string[]>();
  for (const [id, g] of ds.records.get("groups") ?? []) members.set(`group:${id}`, ((g.members ?? []) as Rec[]).map((m) => m.person as string));
  for (const [id, c] of ds.records.get("commemorations") ?? []) {
    const kept = out.get(`comm:${id}`);
    if (!kept) continue;
    for (const subject of (c.subjects ?? []) as string[]) {
      for (const tradition of kept) {
        add(subject, tradition);
        for (const person of members.get(subject) ?? []) add(person, tradition);
      }
    }
  }
  return out;
}

function nameIn(ds: Dataset, ref: string, locale: string): string | undefined {
  const collection = REF_PREFIXES[ref.slice(0, ref.indexOf(":"))];
  return collection ? (ds.locales.get(collection)?.get(ref.slice(ref.indexOf(":") + 1))?.get(locale)?.names?.display as string | undefined) : undefined;
}

function contextOf(ds: Dataset, kept: Map<string, Set<string>>, collection: string, id: string, rec: Rec, locale: string): Rec {
  const context: Rec = {};
  if (rec.kind) context.kind = rec.kind;
  if (rec.gender) context.gender = rec.gender;
  if ((rec.holiness_types ?? []).length > 0) context.holiness = rec.holiness_types;
  if (rec.count?.value) context.count = rec.count.value;
  const traditions = [...(kept.get(`${PREFIX[collection]}:${id}`) ?? [])].sort();
  if (traditions.length > 0) context.traditions = traditions;
  // Names that related records already have in the target language keep the translation consistent with them.
  const related = collection === "commemorations" ? ((rec.subjects ?? []) as string[]) : collection === "groups" ? ((rec.members ?? []) as Rec[]).map((m) => m.person as string) : [];
  const names = related.map((ref) => nameIn(ds, ref, locale)).filter((n): n is string => n !== undefined);
  if (names.length > 0) context.related = names.slice(0, 12);
  return context;
}

function namesSource(rec: Rec): Rec {
  const names: Rec = {};
  for (const field of NAME_FIELDS) if (rec.names?.[field] !== undefined) names[field] = rec.names[field];
  const source: Rec = { names };
  for (const field of TEXT_FIELDS) if (rec[field] !== undefined) source[field] = rec[field];
  return source;
}

/** What a language lacks: names of records with no locale file in it, and long texts. */
function entriesFor(ds: Dataset, kept: Map<string, Set<string>>, locale: string, preferred: readonly string[]): Entry[] {
  const entries: Entry[] = [];
  for (const collection of TRANSLATED_COLLECTIONS) {
    for (const [id, rec] of ds.records.get(collection) ?? []) {
      if (collection === "commemorations" && derivable(rec)) continue;
      const byLocale = ds.locales.get(collection)?.get(id);
      if (!byLocale || byLocale.has(locale)) continue;
      const from = sourceLocale(byLocale, locale, preferred);
      const src = from ? byLocale.get(from) : undefined;
      if (!from || !src) continue;
      entries.push({ collection, id, part: "names", from, context: contextOf(ds, kept, collection, id, rec, locale), source: namesSource(src), target: null });
    }
    for (const [id, byLocale] of ds.texts.get(collection) ?? []) {
      if (byLocale.has(locale) || !ds.records.get(collection as never)?.has(id)) continue;
      const fronts = new Map([...byLocale].map(([l, text]) => [l, text.frontMatter]));
      const from = sourceLocale(fronts, locale, preferred);
      const src = from ? byLocale.get(from) : undefined;
      if (!from || !src) continue;
      const source: Rec = {};
      if (src.frontMatter.title) source.title = src.frontMatter.title;
      source.body = src.body.trim();
      const context: Rec = { kind: src.frontMatter.kind };
      const name = nameIn(ds, `${PREFIX[collection]}:${id}`, locale);
      if (name) context.related = [name];
      entries.push({ collection, id, part: "life", from, context, source, target: null });
    }
  }
  return entries;
}

/** One worklist per language: what it lacks, with the text to translate it from. */
export function worklists(ds: Dataset, dataDir: string, locales: readonly string[] = REQUIRED_LOCALES): Worklist[] {
  const kept = traditionsByRef(ds, dataDir);
  return locales.map((locale) => ({ locale, entries: entriesFor(ds, kept, locale, locales) }));
}

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/** Why a filled entry cannot be written, if it cannot. */
export function targetProblem(entry: Entry): string | undefined {
  const target = entry.target;
  if (!target || typeof target !== "object") return "no translation";
  if (entry.part === "life") {
    if (!nonEmpty(target.body)) return "the text (body) is empty";
    if (target.title !== undefined && typeof target.title !== "string") return "the title is not text";
    const extra = Object.keys(target).filter((k) => k !== "title" && k !== "body");
    return extra.length > 0 ? `unknown field(s): ${extra.join(", ")}` : undefined;
  }
  const names = target.names as Rec | undefined;
  if (!names || !nonEmpty(names.display)) return "names.display is empty";
  const extraNames = Object.keys(names).filter((k) => !NAME_FIELDS.includes(k));
  if (extraNames.length > 0) return `unknown name field(s): ${extraNames.join(", ")}`;
  const extra = Object.keys(target).filter((k) => k !== "names" && !TEXT_FIELDS.includes(k));
  if (extra.length > 0) return `unknown field(s): ${extra.join(", ")}`;
  for (const [k, v] of Object.entries(names)) {
    const ok = LIST_FIELDS.has(k) ? Array.isArray(v) && v.every((x) => typeof x === "string") : typeof v === "string";
    if (!ok) return `names.${k} has the wrong type`;
  }
  for (const k of TEXT_FIELDS) if (target[k] !== undefined && typeof target[k] !== "string") return `${k} is not text`;
  return undefined;
}

/** Drops empty strings and lists, which a translator leaves for fields that do not apply. */
function compact(value: Rec): Rec {
  const out: Rec = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v)) {
      const items = v.filter((x) => !(typeof x === "string" && x.trim() === ""));
      if (items.length > 0) out[k] = items;
      continue;
    }
    out[k] = v && typeof v === "object" ? compact(v as Rec) : v;
  }
  return out;
}

export interface ApplyOptions {
  /** "machine" (the default) or "human". */
  method: "machine" | "human";
  /** Date of the translation, YYYY-MM-DD. */
  date: string;
}

export interface Applied {
  /** Files to write, by path relative to the data folder, with their contents. */
  files: Map<string, string>;
  /** Filled entries that were left out, and why. */
  skipped: string[];
}

/**
 * Locale files and long texts from the filled entries of a worklist. A record's
 * own text in that language is never replaced; an earlier machine translation is.
 */
export function applyWorklist(ds: Dataset, list: Worklist, options: ApplyOptions): Applied {
  const files = new Map<string, string>();
  const skipped: string[] = [];
  const locale = list.locale;
  const fix = (s: string): string => {
    const nfc = s.normalize("NFC").trim();
    return isRomanian(locale) ? fixCedilla(nfc) : nfc;
  };
  const translation = (from: string): Rec => ({ status: options.method === "machine" ? "machine" : "draft", method: options.method, from, date: options.date });
  for (const entry of list.entries) {
    if (entry.target === null || entry.target === undefined) continue;
    const where = `${locale}/${entry.collection}/${entry.id}${entry.part === "life" ? ".md" : ""}`;
    const problem = targetProblem(entry);
    if (problem) {
      skipped.push(`${where}: ${problem}`);
      continue;
    }
    const target = compact(mapStrings(entry.target, fix) as Rec);
    if (entry.part === "names") {
      // As the importer writes them: no full or short name that repeats the display name.
      const names = target.names as Rec;
      if (names.full === names.display) delete names.full;
      if (names.short === names.display) delete names.short;
      const existing = ds.locales.get(entry.collection)?.get(entry.id)?.get(locale);
      if (existing && !isMachineTranslation(existing)) {
        skipped.push(`${where}: already has its own names`);
        continue;
      }
      const src = ds.locales.get(entry.collection)?.get(entry.id)?.get(entry.from);
      const doc: Rec = { id: entry.id, locale, ...target };
      if (src?.references) doc.references = src.references;
      doc.translation = translation(entry.from);
      files.set(`i18n/${locale}/${entry.collection}/${entry.id}.json`, canonicalJson(doc));
    } else {
      const existing = ds.texts.get(entry.collection)?.get(entry.id)?.get(locale);
      if (existing && !isMachineTranslation(existing.frontMatter)) {
        skipped.push(`${where}: already has its own text`);
        continue;
      }
      const src = ds.texts.get(entry.collection)?.get(entry.id)?.get(entry.from);
      const front: Rec = { id: entry.id, locale, kind: src?.frontMatter.kind ?? "life" };
      if (target.title) front.title = target.title;
      if (src?.frontMatter.references) front.references = src.frontMatter.references;
      front.translation = translation(entry.from);
      files.set(`i18n/${locale}/${entry.collection}/${entry.id}.md`, `---\n${stringifyYaml(front)}---\n\n${target.body as string}\n`);
    }
  }
  return { files, skipped };
}
