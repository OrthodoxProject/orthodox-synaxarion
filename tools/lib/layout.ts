/**
 * Where every kind of file lives in data/, and which schema validates it.
 * Paths are relative to the data folder, with POSIX separators.
 */

export const CORE_COLLECTIONS = [
  "persons",
  "groups",
  "commemorations",
  "places",
  "icons",
  "hymns",
  "sources",
  "media",
] as const;
export type CoreCollection = (typeof CORE_COLLECTIONS)[number];

/** Locale files exist for these collections (plus traditions). */
export const I18N_COLLECTIONS = [
  "persons",
  "groups",
  "commemorations",
  "places",
  "icons",
  "hymns",
  "media",
  "traditions",
] as const;
export type I18nCollection = (typeof I18N_COLLECTIONS)[number];

/** Collections that may have a long Markdown text (<id>.md) per locale. */
export const TEXT_COLLECTIONS = ["persons", "groups", "commemorations", "icons"] as const;

/** Prefix used in references ("person:lazarus-of-galesion") → collection. */
export const REF_PREFIXES: Record<string, CoreCollection> = {
  person: "persons",
  group: "groups",
  comm: "commemorations",
  place: "places",
  icon: "icons",
  hymn: "hymns",
  src: "sources",
  media: "media",
};

/** Languages of the first public version (decision Q37): missing texts in these are reported as warnings. */
export const REQUIRED_LOCALES = ["ro", "en"];

const SLUG = /^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/;
const LOCALE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?(?:-[a-z0-9]{5,8})*$/;

export type FileKind =
  | { kind: "core"; collection: CoreCollection; id: string }
  | { kind: "tradition"; tradition: string }
  | { kind: "menaion"; tradition: string; month: string; day: string }
  | { kind: "movable"; tradition: string }
  | { kind: "observances"; tradition: string }
  | { kind: "overrides"; tradition: string; year: string }
  | { kind: "vocab"; locale: string }
  | { kind: "i18n"; locale: string; collection: I18nCollection; id: string }
  | { kind: "text"; locale: string; collection: string; id: string }
  | { kind: "readme" }
  | { kind: "unknown" };

function stem(name: string, ext: string): string | null {
  return name.endsWith(ext) ? name.slice(0, -ext.length) : null;
}

export function classify(rel: string): FileKind {
  const parts = rel.split("/");
  const last = parts[parts.length - 1] ?? "";
  if (last === "README.md") return { kind: "readme" };
  const [a, b, c, d, e] = parts;

  if (parts.length === 2 && a && (CORE_COLLECTIONS as readonly string[]).includes(a)) {
    const id = stem(b ?? "", ".json");
    if (id && SLUG.test(id)) return { kind: "core", collection: a as CoreCollection, id };
  }

  if (a === "traditions" && b && SLUG.test(b)) {
    if (parts.length === 3 && c === "tradition.json") return { kind: "tradition", tradition: b };
    if (parts.length === 3 && c === "movable.json") return { kind: "movable", tradition: b };
    if (parts.length === 3 && c === "observances.json") return { kind: "observances", tradition: b };
    if (parts.length === 4 && c === "overrides") {
      const year = stem(d ?? "", ".json");
      if (year && /^[0-9]{4}$/.test(year)) return { kind: "overrides", tradition: b, year };
    }
    if (parts.length === 5 && c === "menaion" && d && /^(?:0[1-9]|1[0-3])$/.test(d)) {
      const day = stem(e ?? "", ".json");
      if (day && /^(?:0[1-9]|[12][0-9]|3[01])$/.test(day)) {
        return { kind: "menaion", tradition: b, month: d, day };
      }
    }
  }

  if (a === "i18n" && b && LOCALE.test(b)) {
    if (parts.length === 3 && c === "vocab.json") return { kind: "vocab", locale: b };
    if (parts.length === 4 && c && (I18N_COLLECTIONS as readonly string[]).includes(c)) {
      const jsonId = stem(d ?? "", ".json");
      if (jsonId && SLUG.test(jsonId)) {
        return { kind: "i18n", locale: b, collection: c as I18nCollection, id: jsonId };
      }
      const mdId = stem(d ?? "", ".md");
      if (mdId && SLUG.test(mdId) && (TEXT_COLLECTIONS as readonly string[]).includes(c)) {
        return { kind: "text", locale: b, collection: c, id: mdId };
      }
    }
  }

  return { kind: "unknown" };
}

/** Schema file (relative to schema/) for each kind of JSON file. */
export function schemaFor(file: FileKind): string | null {
  switch (file.kind) {
    case "core":
      return `${singular(file.collection)}.schema.json`;
    case "tradition":
      return "tradition/tradition.schema.json";
    case "menaion":
      return "tradition/menaion-day.schema.json";
    case "movable":
      return "tradition/movable.schema.json";
    case "observances":
      return "tradition/observances.schema.json";
    case "overrides":
      return "tradition/overrides.schema.json";
    case "vocab":
      return "i18n/vocab.schema.json";
    case "i18n":
      return `i18n/${singular(file.collection)}.schema.json`;
    case "text":
      return "i18n/text.schema.json";
    default:
      return null;
  }
}

function singular(collection: string): string {
  if (collection === "media") return "media";
  if (collection === "commemorations") return "commemoration";
  return collection.replace(/s$/, "");
}

/** True for Romanian locale folders (ro, ro-MD …), where ș/ț must use the comma below. */
export function isRomanian(locale: string): boolean {
  return locale === "ro" || locale.startsWith("ro-");
}
