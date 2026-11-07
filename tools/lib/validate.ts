import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { parseBibleRef } from "./bible.ts";
import { isValidMonthDay, parseMonthDay, type DateCalendar } from "./dates.ts";
import { Reporter, type Issue } from "./issues.ts";
import {
  CORE_COLLECTIONS,
  REF_PREFIXES,
  REQUIRED_LOCALES,
  classify,
  isRomanian,
  schemaFor,
  type CoreCollection,
  type FileKind,
} from "./layout.ts";
import { describeErrors, loadSchemas, type SchemaSet } from "./schemas.ts";
import { canonicalJson, hasCedilla, splitFrontMatter, strings } from "./text.ts";

// Parsed JSON records are dynamic by nature; the schemas have already checked their shape.
type Rec = Record<string, any>;

interface Loaded {
  file: string;
  data: Rec;
}

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export interface ValidateOptions {
  dataDir: string;
  schemaDir?: string;
  requiredLocales?: string[];
}

export interface ValidationResult {
  issues: Issue[];
  errors: Issue[];
  warnings: Issue[];
  stats: Record<string, number>;
}

class Dataset {
  core = new Map<CoreCollection, Map<string, Loaded>>(CORE_COLLECTIONS.map((c) => [c, new Map()]));
  traditions = new Map<string, Loaded>();
  traditionFolders = new Set<string>();
  menaion: Array<Loaded & { tradition: string }> = [];
  movable = new Map<string, Loaded>();
  observances = new Map<string, Loaded>();
  overrides: Array<Loaded & { tradition: string }> = [];
  vocab = new Map<string, Loaded>();
  /** collection → id → locale → file */
  i18n = new Map<string, Map<string, Map<string, Loaded>>>();
  texts: Array<Loaded & { locale: string; collection: string; id: string }> = [];

  coll(c: CoreCollection): Map<string, Loaded> {
    const m = this.core.get(c);
    if (!m) throw new Error(`unknown collection ${c}`);
    return m;
  }

  locales(collection: string, id: string): Map<string, Loaded> {
    return this.i18n.get(collection)?.get(id) ?? new Map();
  }

  /** Every JSON document that was loaded, for dataset-wide scans. */
  *allDocuments(): Generator<Loaded> {
    for (const m of this.core.values()) yield* m.values();
    yield* this.traditions.values();
    yield* this.menaion;
    yield* this.movable.values();
    yield* this.observances.values();
    yield* this.overrides;
    yield* this.vocab.values();
    for (const byId of this.i18n.values()) for (const byLocale of byId.values()) yield* byLocale.values();
    yield* this.texts;
  }
}

const REF_RE = /^(person|group|comm|place|icon|hymn|src|media):([a-z0-9]+(?:-{1,2}[a-z0-9]+)*)$/;
const NAMED_COLLECTIONS = ["persons", "groups", "commemorations", "places", "icons"] as const;
const NOT_PUBLISHABLE_LICENSES = new Set(["LicenseRef-AllRightsReserved", "LicenseRef-Unknown"]);

function walk(dir: string, root: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).split(sep).join("/"));
  }
}

export function validate(options: ValidateOptions): ValidationResult {
  const dataDir = resolve(options.dataDir);
  const schemas = loadSchemas(resolve(options.schemaDir ?? join(REPO_ROOT, "schema")));
  const requiredLocales = options.requiredLocales ?? REQUIRED_LOCALES;
  const r = new Reporter();
  const ds = new Dataset();

  const files: string[] = [];
  walk(dataDir, dataDir, files);
  for (const rel of files) loadFile(dataDir, rel, schemas, ds, r);

  crossChecks(ds, r, requiredLocales);

  const stats: Record<string, number> = { files: files.length };
  for (const [c, m] of ds.core) stats[c] = m.size;
  stats.traditions = ds.traditions.size;
  stats["menaion days"] = ds.menaion.length;
  stats.locales = new Set([...ds.vocab.keys(), ...[...ds.i18n.values()].flatMap((byId) => [...byId.values()].flatMap((l) => [...l.keys()]))]).size;
  return { issues: r.issues, errors: r.errors, warnings: r.warnings, stats };
}

// ---------------------------------------------------------------------------
// Per-file checks
// ---------------------------------------------------------------------------

function loadFile(dataDir: string, rel: string, schemas: SchemaSet, ds: Dataset, r: Reporter): void {
  const kind = classify(rel);
  if (kind.kind === "readme") return;
  if (kind.kind === "unknown") {
    r.error("path.unexpected", rel, "File is not in a known location (see docs/SCHEMA.md).");
    return;
  }
  if (kind.kind !== "vocab" && kind.kind !== "i18n" && kind.kind !== "text" && "tradition" in kind) {
    ds.traditionFolders.add(kind.tradition);
  }

  const raw = readFileSync(join(dataDir, rel), "utf8");
  if (raw.includes("\r")) r.error("format.line-endings", rel, "Use LF line endings (run: npm run format).");
  const text = raw.replace(/\r\n/g, "\n");
  const romanian = "locale" in kind && isRomanian(kind.locale);

  if (kind.kind === "text") {
    loadText(rel, text, kind, romanian, schemas, ds, r);
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    r.error("json.parse", rel, (e as Error).message);
    return;
  }
  if (text !== canonicalJson(data)) {
    r.error("format.non-canonical", rel, "Not in canonical format (2-space indentation, final newline). Run: npm run format");
  }
  checkStrings(data, rel, romanian, r);

  const schemaPath = schemaFor(kind);
  if (!schemaPath) return;
  const validateFn = schemas.get(schemaPath);
  if (!validateFn(data)) {
    for (const message of describeErrors(validateFn.errors)) r.error("schema", rel, message);
    return; // cross-file checks assume a schema-valid shape
  }
  store(kind, { file: rel, data: data as Rec }, ds, r);
}

function loadText(
  rel: string,
  text: string,
  kind: Extract<FileKind, { kind: "text" }>,
  romanian: boolean,
  schemas: SchemaSet,
  ds: Dataset,
  r: Reporter,
): void {
  if (text !== text.normalize("NFC")) r.error("text.not-nfc", rel, "Text is not in Unicode NFC (run: npm run format).");
  if (romanian && hasCedilla(text)) r.error("text.cedilla", rel, "Use ș/ț with comma below, not ş/ţ (run: npm run format).");
  const parts = splitFrontMatter(text);
  if (!parts) {
    r.error("text.front-matter", rel, "Markdown files must start with a YAML front matter block (---).");
    return;
  }
  if (parts.body.trim() === "") r.warn("text.empty", rel, "The text is empty.");
  let fm: unknown;
  try {
    fm = parseYaml(parts.frontMatter);
  } catch (e) {
    r.error("text.front-matter", rel, `Invalid YAML: ${(e as Error).message}`);
    return;
  }
  const validateFn = schemas.get("i18n/text.schema.json");
  if (!validateFn(fm)) {
    for (const message of describeErrors(validateFn.errors)) r.error("schema", rel, message);
    return;
  }
  const data = fm as Rec;
  if (data.id !== kind.id) r.error("path.id-mismatch", rel, `id "${data.id}" does not match the file name "${kind.id}".`);
  if (data.locale !== kind.locale) r.error("path.locale-mismatch", rel, `locale "${data.locale}" does not match the folder "${kind.locale}".`);
  ds.texts.push({ file: rel, data, locale: kind.locale, collection: kind.collection, id: kind.id });
}

function checkStrings(data: unknown, rel: string, romanian: boolean, r: Reporter): void {
  let nfcReported = false;
  let cedillaReported = false;
  for (const [pointer, s] of strings(data)) {
    if (!nfcReported && s !== s.normalize("NFC")) {
      r.error("text.not-nfc", rel, `${pointer}: not in Unicode NFC (run: npm run format).`);
      nfcReported = true;
    }
    if (!cedillaReported && romanian && hasCedilla(s)) {
      r.error("text.cedilla", rel, `${pointer}: use ș/ț with comma below, not ş/ţ (run: npm run format).`);
      cedillaReported = true;
    }
  }
}

function store(kind: FileKind, doc: Loaded, ds: Dataset, r: Reporter): void {
  const { file, data } = doc;
  const expectId = (expected: string): void => {
    if (data.id !== expected) r.error("path.id-mismatch", file, `id "${data.id}" does not match the file name "${expected}".`);
  };
  const expectTradition = (expected: string): void => {
    if (data.tradition !== expected) {
      r.error("path.tradition-mismatch", file, `tradition "${data.tradition}" does not match the folder "${expected}".`);
    }
  };
  const expectLocale = (expected: string): void => {
    if (data.locale !== expected) r.error("path.locale-mismatch", file, `locale "${data.locale}" does not match the folder "${expected}".`);
  };

  switch (kind.kind) {
    case "core":
      expectId(kind.id);
      ds.coll(kind.collection).set(kind.id, doc);
      break;
    case "tradition":
      expectId(kind.tradition);
      ds.traditions.set(kind.tradition, doc);
      break;
    case "menaion":
      expectTradition(kind.tradition);
      if (data.date !== `${kind.month}-${kind.day}`) {
        r.error("path.date-mismatch", file, `date "${data.date}" does not match the path (${kind.month}/${kind.day}).`);
      }
      ds.menaion.push({ ...doc, tradition: kind.tradition });
      break;
    case "movable":
      expectTradition(kind.tradition);
      ds.movable.set(kind.tradition, doc);
      break;
    case "observances":
      expectTradition(kind.tradition);
      ds.observances.set(kind.tradition, doc);
      break;
    case "overrides":
      expectTradition(kind.tradition);
      if (data.year !== Number(kind.year)) r.error("path.year-mismatch", file, `year ${data.year} does not match the file name.`);
      ds.overrides.push({ ...doc, tradition: kind.tradition });
      break;
    case "vocab":
      expectLocale(kind.locale);
      ds.vocab.set(kind.locale, doc);
      break;
    case "i18n": {
      expectId(kind.id);
      expectLocale(kind.locale);
      let byId = ds.i18n.get(kind.collection);
      if (!byId) ds.i18n.set(kind.collection, (byId = new Map()));
      let byLocale = byId.get(kind.id);
      if (!byLocale) byId.set(kind.id, (byLocale = new Map()));
      byLocale.set(kind.locale, doc);
      break;
    }
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Cross-file checks
// ---------------------------------------------------------------------------

function exists(ds: Dataset, ref: string): boolean {
  const m = REF_RE.exec(ref);
  if (!m || !m[1] || !m[2]) return false;
  const collection = REF_PREFIXES[m[1]];
  return collection !== undefined && ds.coll(collection).has(m[2]);
}

function idOf(ref: string): string {
  return ref.slice(ref.indexOf(":") + 1);
}

function dateCalendar(tradition: Rec | undefined): DateCalendar {
  const style = tradition?.calendar_style;
  return style === "coptic" || style === "ethiopian" ? style : "church";
}

function crossChecks(ds: Dataset, r: Reporter, requiredLocales: string[]): void {
  checkReferences(ds, r);
  checkTraditionRefs(ds, r);
  checkAliases(ds, r);
  checkCommemorated(ds, r);
  checkRules(ds, r);
  const placed = checkCalendars(ds, r);
  for (const [id, doc] of ds.coll("commemorations")) {
    if (!placed.has(id)) r.warn("calendar.not-placed", doc.file, "No tradition places this commemoration in its calendar.");
  }
  checkGroups(ds, r);
  checkPlaces(ds, r);
  checkRelations(ds, r);
  checkLocales(ds, r, requiredLocales);
  checkVocabulary(ds, r, requiredLocales);
}

function checkReferences(ds: Dataset, r: Reporter): void {
  for (const doc of ds.allDocuments()) {
    for (const [pointer, value] of strings(doc.data)) {
      if (REF_RE.test(value) && !exists(ds, value)) {
        r.error("ref.missing", doc.file, `${pointer}: "${value}" does not exist.`);
      }
    }
  }
}

function checkTraditionRefs(ds: Dataset, r: Reporter): void {
  for (const folder of ds.traditionFolders) {
    if (!ds.traditions.has(folder)) {
      r.error("tradition.missing-definition", `traditions/${folder}/`, "Folder has no tradition.json.");
    }
  }
  const check = (file: string, value: unknown, where: string): void => {
    if (typeof value === "string" && !ds.traditions.has(value)) {
      r.error("ref.unknown-tradition", file, `${where}: tradition "${value}" does not exist.`);
    }
  };
  for (const c of ["persons", "groups"] as const) {
    for (const doc of ds.coll(c).values()) {
      (doc.data.veneration ?? []).forEach((v: Rec, i: number) => check(doc.file, v.tradition, `/veneration/${i}`));
      (doc.data.canonizations ?? []).forEach((v: Rec, i: number) => check(doc.file, v.tradition, `/canonizations/${i}`));
    }
  }
  for (const doc of ds.traditions.values()) if (doc.data.parent) check(doc.file, doc.data.parent, "/parent");
  for (const [id, byLocale] of ds.i18n.get("traditions") ?? []) {
    if (!ds.traditions.has(id)) for (const doc of byLocale.values()) r.error("i18n.orphan", doc.file, `Tradition "${id}" does not exist.`);
  }
}

function checkAliases(ds: Dataset, r: Reporter): void {
  for (const [, records] of ds.core) {
    const seen = new Map<string, string>();
    for (const [id, doc] of records) {
      for (const alias of doc.data.aliases ?? []) {
        if (records.has(alias)) r.error("alias.conflict", doc.file, `alias "${alias}" is the id of another record.`);
        const other = seen.get(alias);
        if (other) r.error("alias.conflict", doc.file, `alias "${alias}" is also used by ${other}.`);
        seen.set(alias, id);
      }
    }
  }
}

function checkCommemorated(ds: Dataset, r: Reporter): void {
  const persons = new Set<string>();
  const groups = new Set<string>();
  const icons = new Set<string>();
  for (const doc of ds.coll("commemorations").values()) {
    for (const subject of (doc.data.subjects ?? []) as string[]) {
      if (subject.startsWith("person:")) persons.add(idOf(subject));
      if (subject.startsWith("icon:")) icons.add(idOf(subject));
      if (subject.startsWith("group:")) {
        groups.add(idOf(subject));
        const group = ds.coll("groups").get(idOf(subject));
        for (const m of group?.data.members ?? []) persons.add(idOf(m.person));
      }
    }
  }
  for (const [id, doc] of ds.coll("persons")) {
    if (!persons.has(id)) {
      r.error("person.no-commemoration", doc.file, "Not a subject of any commemoration (directly or through a group).");
    }
  }
  for (const [id, doc] of ds.coll("groups")) {
    if (!groups.has(id)) r.error("group.no-commemoration", doc.file, "Not a subject of any commemoration.");
  }
  for (const [id, doc] of ds.coll("icons")) {
    if (!icons.has(id)) r.warn("icon.no-commemoration", doc.file, "Not a subject of any commemoration.");
  }
}

/** Checks one date rule; 'draft' tells whether an unspecified rule is allowed. */
function checkRule(rule: Rec, file: string, where: string, draft: boolean, r: Reporter): void {
  const bad = (msg: string): void => r.error("date.invalid", file, `${where}: ${msg}`);
  const checkMonthDayString = (value: unknown, field: string): void => {
    const md = typeof value === "string" ? parseMonthDay(value) : null;
    if (md && !isValidMonthDay(md.month, md.day)) bad(`${field} "${value}" is not a real church date.`);
  };
  switch (rule.type) {
    case "fixed": {
      const calendar: DateCalendar = rule.calendar ?? "church";
      if (!isValidMonthDay(rule.month, rule.day, calendar)) bad(`${rule.month}/${rule.day} does not exist in the ${calendar} calendar.`);
      if (rule.non_leap && !isValidMonthDay(rule.non_leap.month, rule.non_leap.day)) bad("non_leap is not a real date.");
      if (calendar === "church" && rule.month === 2 && rule.day === 29 && !rule.non_leap) {
        r.warn("rule.leap-day-without-fallback", file, `${where}: 29 February needs "non_leap" for common years.`);
      }
      break;
    }
    case "weekday_before":
    case "weekday_after":
      checkMonthDayString(rule.anchor, "anchor");
      break;
    case "weekday_in_range":
      checkMonthDayString(rule.from, "from");
      checkMonthDayString(rule.to, "to");
      break;
    case "unspecified":
      if (!draft) r.error("rule.unspecified-not-draft", file, `${where}: an unspecified rule is allowed only in draft records.`);
      break;
    default:
      break;
  }
}

function checkRules(ds: Dataset, r: Reporter): void {
  for (const doc of ds.coll("commemorations").values()) {
    checkRule(doc.data.date_rule, doc.file, "/date_rule", doc.data.editorial?.status === "draft", r);
  }
  for (const doc of ds.observances.values()) {
    (doc.data.observances as Rec[]).forEach((o, i) => checkRule(o.rule, doc.file, `/observances/${i}/rule`, false, r));
  }
}

/** Checks the traditions' calendars and returns the ids of all placed commemorations. */
function checkCalendars(ds: Dataset, r: Reporter): Set<string> {
  const placedAnywhere = new Set<string>();
  const placedIn = new Map<string, Map<string, string>>(); // tradition → comm id → where
  const linesFirst = new Map<string, Set<string>>(); // tradition → first commemoration of each line

  const legend = (tradition: string): Set<string> =>
    new Set(((ds.traditions.get(tradition)?.data.symbol_legend ?? []) as Rec[]).map((s) => s.key as string));

  const visitLine = (tradition: string, line: Rec, file: string, where: string, unique: boolean): void => {
    const comms = line.commemorations as string[];
    const first = comms[0];
    if (first) {
      let set = linesFirst.get(tradition);
      if (!set) linesFirst.set(tradition, (set = new Set()));
      set.add(first);
    }
    if (line.symbol && !legend(tradition).has(line.symbol)) {
      r.error("ref.unknown-symbol", file, `${where}/symbol: "${line.symbol}" is not in the symbol_legend of "${tradition}".`);
    }
    let placed = placedIn.get(tradition);
    if (!placed) placedIn.set(tradition, (placed = new Map()));
    for (const ref of comms) {
      const id = idOf(ref);
      placedAnywhere.add(id);
      if (!unique) continue;
      const previous = placed.get(id);
      if (previous) r.error("calendar.duplicate", file, `${where}: "${ref}" is already placed in ${previous}.`);
      else placed.set(id, file);
    }
  };

  for (const doc of ds.menaion) {
    const tradition = ds.traditions.get(doc.tradition);
    const calendar = dateCalendar(tradition?.data);
    const md = parseMonthDay(doc.data.date as string);
    if (md && !isValidMonthDay(md.month, md.day, calendar)) {
      r.error("date.invalid", doc.file, `${doc.data.date} does not exist in the ${calendar} calendar.`);
    }
    (doc.data.entries as Rec[]).forEach((line, i) => {
      visitLine(doc.tradition, line, doc.file, `/entries/${i}`, true);
      for (const ref of line.commemorations as string[]) {
        const comm = ds.coll("commemorations").get(idOf(ref))?.data;
        const rule = comm?.date_rule;
        if (!md || !rule || rule.type !== "fixed" || line.differs_from_default) continue;
        if ((rule.calendar ?? "church") !== calendar) continue;
        if (rule.month !== md.month || rule.day !== md.day) {
          r.warn(
            "calendar.default-date-mismatch",
            doc.file,
            `/entries/${i}: "${ref}" has default date ${String(rule.month).padStart(2, "0")}-${String(rule.day).padStart(2, "0")}; set "differs_from_default": true if this is intended.`,
          );
        }
      }
    });
  }

  for (const [tradition, doc] of ds.movable) {
    ((doc.data.entries ?? []) as Rec[]).forEach((line, i) => {
      visitLine(tradition, line, doc.file, `/entries/${i}`, true);
      for (const ref of line.commemorations as string[]) {
        const comm = ds.coll("commemorations").get(idOf(ref))?.data;
        const draft = comm?.editorial?.status === "draft";
        if (line.rule) checkRule(line.rule, doc.file, `/entries/${i}/rule`, draft, r);
        else if (comm?.date_rule?.type === "fixed") {
          r.warn("calendar.fixed-in-movable", doc.file, `/entries/${i}: "${ref}" has a fixed date; place it in menaion/ instead.`);
        }
      }
    });
    ((doc.data.transfers ?? []) as Rec[]).forEach((t, i) => {
      if (!placedIn.get(tradition)?.has(idOf(t.commemoration))) {
        r.warn("calendar.transfer-unplaced", doc.file, `/transfers/${i}: "${t.commemoration}" is not in this tradition's calendar.`);
      }
    });
  }

  for (const doc of ds.observances.values()) {
    const seen = new Set<string>();
    for (const o of doc.data.observances as Rec[]) {
      if (seen.has(o.id)) r.error("observance.duplicate-id", doc.file, `observance id "${o.id}" is used twice.`);
      seen.add(o.id);
    }
  }

  for (const doc of ds.overrides) {
    const seen = new Set<string>();
    (doc.data.days as Rec[]).forEach((day, i) => {
      const date = day.date as string;
      if (!date.startsWith(`${doc.data.year}-`)) r.error("override.year-mismatch", doc.file, `/days/${i}: ${date} is not in ${doc.data.year}.`);
      if (seen.has(date)) r.error("override.duplicate-date", doc.file, `/days/${i}: ${date} appears twice.`);
      seen.add(date);
      ((day.add ?? []) as Rec[]).forEach((line, j) => visitLine(doc.tradition, line, doc.file, `/days/${i}/add/${j}`, false));
    });
  }

  // Official titles must belong to a calendar line of the same tradition.
  for (const [id, byLocale] of ds.i18n.get("traditions") ?? []) {
    const firsts = linesFirst.get(id) ?? new Set<string>();
    const tradition = ds.traditions.get(id)?.data;
    const observanceIds = new Set(((ds.observances.get(id)?.data.observances ?? []) as Rec[]).map((o) => o.id as string));
    const symbolKeys = new Set(((tradition?.symbol_legend ?? []) as Rec[]).map((s) => s.key as string));
    for (const [locale, doc] of byLocale) {
      for (const key of Object.keys(doc.data.official_titles ?? {})) {
        if (!firsts.has(key)) r.warn("tradition.title-unused", doc.file, `official title for "${key}", which does not start a line of this tradition.`);
      }
      for (const key of Object.keys(doc.data.observances ?? {})) {
        if (!observanceIds.has(key)) r.warn("tradition.label-unused", doc.file, `label for unknown observance "${key}".`);
      }
      for (const key of Object.keys(doc.data.symbols ?? {})) {
        if (!symbolKeys.has(key)) r.warn("tradition.label-unused", doc.file, `label for unknown symbol "${key}".`);
      }
      if (locale === tradition?.default_locale) {
        for (const o of observanceIds) {
          if (!doc.data.observances?.[o]) r.warn("tradition.label-missing", doc.file, `no label for observance "${o}".`);
        }
        for (const s of symbolKeys) {
          if (!doc.data.symbols?.[s]) r.warn("tradition.label-missing", doc.file, `no label for symbol "${s}".`);
        }
      }
    }
  }
  return placedAnywhere;
}

function checkGroups(ds: Dataset, r: Reporter): void {
  for (const doc of ds.coll("groups").values()) {
    const members = (doc.data.members ?? []) as Rec[];
    const seen = new Set<string>();
    for (const m of members) {
      if (seen.has(m.person)) r.error("group.duplicate-member", doc.file, `"${m.person}" is listed twice.`);
      seen.add(m.person);
    }
    const count = doc.data.count as Rec | undefined;
    if (count && count.value < members.length) {
      const message = `count ${count.value} is smaller than the ${members.length} named members.`;
      if (count.precision === "exact") r.error("group.count-mismatch", doc.file, message);
      else r.warn("group.count-mismatch", doc.file, message);
    }
  }
}

function checkPlaces(ds: Dataset, r: Reporter): void {
  const places = ds.coll("places");
  for (const [id, doc] of places) {
    const seen = new Set<string>([id]);
    let current = doc.data.located_in as string | undefined;
    while (current) {
      const next = idOf(current);
      if (seen.has(next)) {
        r.error("place.cycle", doc.file, `located_in forms a cycle through "${next}".`);
        break;
      }
      seen.add(next);
      current = places.get(next)?.data.located_in;
    }
  }
}

function checkRelations(ds: Dataset, r: Reporter): void {
  for (const [id, doc] of ds.coll("persons")) {
    ((doc.data.relations ?? []) as Rec[]).forEach((rel, i) => {
      if (rel.target === `person:${id}`) r.error("relation.self", doc.file, `/relations/${i}: a person cannot be related to itself.`);
    });
  }
}

function checkLocales(ds: Dataset, r: Reporter, requiredLocales: string[]): void {
  // Orphans: locale files of records that do not exist.
  for (const [collection, byId] of ds.i18n) {
    if (collection === "traditions") continue;
    const records = ds.coll(collection as CoreCollection);
    for (const [id, byLocale] of byId) {
      if (!records.has(id)) {
        for (const doc of byLocale.values()) r.error("i18n.orphan", doc.file, `There is no ${collection}/${id}.json.`);
      }
    }
  }

  // Every named record needs a name in at least one language; MVP languages are expected.
  const expect = (collection: string, id: string, file: string, severity: "error" | "warning"): void => {
    const locales = ds.locales(collection, id);
    if (locales.size === 0) {
      const message = `No locale file: add data/i18n/<locale>/${collection}/${id}.json.`;
      if (severity === "error") r.error("i18n.missing", file, message);
      else r.warn("i18n.missing", file, message);
      return;
    }
    const missing = requiredLocales.filter((l) => !locales.has(l));
    if (missing.length > 0) r.warn("i18n.missing-locale", file, `No text in: ${missing.join(", ")}.`);
  };
  for (const collection of NAMED_COLLECTIONS) {
    for (const [id, doc] of ds.coll(collection)) {
      // A saint's day takes its title from its subjects, so it needs no locale file of its own.
      const derivable = collection === "commemorations" && doc.data.kind === "repose" && (doc.data.subjects ?? []).length > 0;
      if (!derivable) expect(collection, id, doc.file, "error");
    }
  }
  for (const [id, doc] of ds.traditions) expect("traditions", id, doc.file, "error");
  for (const [id, doc] of ds.coll("hymns")) expect("hymns", id, doc.file, "warning");
  for (const [id, doc] of ds.coll("media")) expect("media", id, doc.file, "warning");

  // Writings named in a locale must exist in the person record.
  for (const [id, byLocale] of ds.i18n.get("persons") ?? []) {
    const known = new Set(((ds.coll("persons").get(id)?.data.writings ?? []) as Rec[]).map((w) => w.id as string));
    for (const doc of byLocale.values()) {
      for (const w of (doc.data.writings ?? []) as Rec[]) {
        if (!known.has(w.id)) r.warn("i18n.unknown-writing", doc.file, `writing "${w.id}" is not listed in persons/${id}.json.`);
      }
    }
  }

  // Full hymn texts only with a license that allows publishing them.
  for (const byLocale of ds.i18n.get("hymns")?.values() ?? []) {
    for (const doc of byLocale.values()) {
      if (doc.data.text && NOT_PUBLISHABLE_LICENSES.has(doc.data.license)) {
        r.error("license.text-not-allowed", doc.file, `full text with license ${doc.data.license}: keep only the incipit and a reference.`);
      }
    }
  }

  // Long texts need the JSON locale file with the names.
  for (const t of ds.texts) {
    if (!ds.locales(t.collection, t.id).has(t.locale)) {
      r.error("text.orphan", t.file, `There is no ${t.collection}/${t.id}.json in this locale.`);
    }
  }
}

/** Codes used in the data, as vocabulary keys ("namespace.code"). */
function usedCodes(ds: Dataset): Set<string> {
  const used = new Set<string>();
  const add = (ns: string, code: unknown): void => {
    if (typeof code === "string" || typeof code === "number") used.add(`${ns}.${code}`);
  };
  const addReadings = (readings: unknown): void => {
    for (const reading of (readings ?? []) as Rec[]) {
      const parsed = parseBibleRef(reading.ref);
      if (parsed) add("bible_book", parsed.book);
    }
  };
  const addLines = (lines: unknown): void => {
    for (const line of (lines ?? []) as Rec[]) {
      add("typikon_rank", line.rank);
      addReadings(line.readings);
    }
  };

  for (const c of ["persons", "groups"] as const) {
    for (const { data } of ds.coll(c).values()) {
      for (const h of data.holiness_types ?? []) add("holiness_type", h);
      for (const x of data.ranks ?? []) add("clerical_rank", x.rank);
      for (const x of data.occupations ?? []) add("occupation", x.code);
      add("era", data.era);
      for (const x of data.places ?? []) add("place_role", x.role);
      for (const x of data.relations ?? []) add("relation_type", x.type);
      add("death_manner", data.died?.manner);
      for (const x of data.relics ?? []) add("relic_part", x.part);
      for (const x of data.patronage ?? []) add("patronage", x.code);
      for (const x of data.canonizations ?? []) add("scope", x.scope);
      for (const x of data.veneration ?? []) {
        add("veneration_status", x.status);
        add("scope", x.scope);
      }
      for (const x of data.iconography?.attributes ?? []) add("iconographic_attribute", x);
      if (c === "groups") add("group_kind", data.kind);
    }
  }
  for (const { data } of ds.coll("commemorations").values()) {
    add("commemoration_kind", data.kind);
    add("typikon_rank", data.default_rank);
    addReadings(data.readings);
  }
  for (const { data } of ds.coll("places").values()) add("place_kind", data.kind);
  for (const { data } of ds.coll("icons").values()) {
    add("icon_subject", data.subject);
    add("iconographic_type", data.iconographic_type);
  }
  for (const { data } of ds.coll("hymns").values()) add("hymn_type", data.type);
  for (const { data } of ds.traditions.values()) {
    add("tradition_family", data.family);
    add("calendar_style", data.calendar_style);
    for (const s of data.symbol_legend ?? []) add("typikon_rank", s.rank);
    if (data.calendar_style === "coptic" || data.calendar_style === "ethiopian") {
      for (let m = 1; m <= 13; m++) add(`${data.calendar_style}_month`, m);
    }
  }
  for (const doc of ds.menaion) addLines(doc.data.entries);
  for (const doc of ds.movable.values()) addLines(doc.data.entries);
  for (const doc of ds.observances.values()) for (const o of doc.data.observances) add("observance_kind", o.kind);
  for (const doc of ds.overrides) {
    for (const day of doc.data.days) {
      add("fasting_level", day.fasting);
      addReadings(day.readings);
      addLines(day.add);
    }
  }
  // Always needed to display dates.
  for (let m = 1; m <= 12; m++) add("month", m);
  for (const d of ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]) add("weekday", d);
  return used;
}

function checkVocabulary(ds: Dataset, r: Reporter, requiredLocales: string[]): void {
  const used = [...usedCodes(ds)].sort();
  for (const locale of requiredLocales) {
    const vocab = ds.vocab.get(locale);
    if (!vocab) {
      r.warn("vocab.missing-file", `i18n/${locale}/vocab.json`, "No vocabulary for this required locale.");
      continue;
    }
    const labels = vocab.data.labels as Rec;
    const missing = used.filter((key) => !(key in labels));
    if (missing.length > 0) {
      const shown = missing.slice(0, 15).join(", ");
      const more = missing.length > 15 ? ` … (+${missing.length - 15})` : "";
      r.warn("vocab.missing-label", vocab.file, `${missing.length} label(s) missing: ${shown}${more}`);
    }
  }
}
