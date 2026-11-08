/**
 * Read-only loader of the whole dataset, for the site and the wiki.
 * It assumes valid data: run the validator first.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import { CORE_COLLECTIONS, classify, type CoreCollection } from "./layout.ts";
import { splitFrontMatter } from "./text.ts";

type Rec = Record<string, any>;

export interface LongText {
  frontMatter: Rec;
  body: string;
}

export interface Dataset {
  /** Language-neutral records, by collection and id. */
  records: Map<CoreCollection, Map<string, Rec>>;
  /** tradition.json of each tradition, by id. */
  traditions: Map<string, Rec>;
  /** Locale files: collection → id → locale → record. Traditions use the collection "traditions". */
  locales: Map<string, Map<string, Map<string, Rec>>>;
  /** Long Markdown texts: collection → id → locale → text. */
  texts: Map<string, Map<string, Map<string, LongText>>>;
  /** Vocabulary labels by locale. */
  vocab: Map<string, Rec>;
}

/** True for a machine translation that no one has reviewed yet. */
export function isMachineTranslation(rec: Rec | undefined): boolean {
  const translation = rec?.translation as Rec | undefined;
  const machine = translation?.method === "machine" || translation?.status === "machine";
  return machine && translation?.status !== "reviewed" && translation?.status !== "approved";
}

/** The dataset without its unreviewed machine translations (locale files and long texts). */
export function withoutMachineTranslations(ds: Dataset): Dataset {
  for (const byId of ds.locales.values()) {
    for (const [id, byLocale] of byId) {
      for (const [locale, rec] of byLocale) if (isMachineTranslation(rec)) byLocale.delete(locale);
      if (byLocale.size === 0) byId.delete(id);
    }
  }
  for (const byId of ds.texts.values()) {
    for (const [id, byLocale] of byId) {
      for (const [locale, text] of byLocale) if (isMachineTranslation(text.frontMatter)) byLocale.delete(locale);
      if (byLocale.size === 0) byId.delete(id);
    }
  }
  return ds;
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

function nested<V>(map: Map<string, Map<string, Map<string, V>>>, a: string, b: string): Map<string, V> {
  let byId = map.get(a);
  if (!byId) map.set(a, (byId = new Map()));
  let byLocale = byId.get(b);
  if (!byLocale) byId.set(b, (byLocale = new Map()));
  return byLocale;
}

export function loadDataset(dataDir: string): Dataset {
  const ds: Dataset = {
    records: new Map(CORE_COLLECTIONS.map((c) => [c, new Map()])),
    traditions: new Map(),
    locales: new Map(),
    texts: new Map(),
    vocab: new Map(),
  };
  const files: string[] = [];
  walk(dataDir, files);
  for (const full of files) {
    const kind = classify(relative(dataDir, full).split(sep).join("/"));
    const raw = readFileSync(full, "utf8");
    switch (kind.kind) {
      case "core":
        ds.records.get(kind.collection)?.set(kind.id, JSON.parse(raw) as Rec);
        break;
      case "tradition":
        ds.traditions.set(kind.tradition, JSON.parse(raw) as Rec);
        break;
      case "i18n":
        nested(ds.locales, kind.collection, kind.id).set(kind.locale, JSON.parse(raw) as Rec);
        break;
      case "vocab":
        ds.vocab.set(kind.locale, (JSON.parse(raw) as Rec).labels as Rec);
        break;
      case "text": {
        const parts = splitFrontMatter(raw.replace(/\r\n/g, "\n"));
        if (parts) nested(ds.texts, kind.collection, kind.id).set(kind.locale, { frontMatter: parseYaml(parts.frontMatter) as Rec, body: parts.body });
        break;
      }
      default:
        break;
    }
  }
  return ds;
}
