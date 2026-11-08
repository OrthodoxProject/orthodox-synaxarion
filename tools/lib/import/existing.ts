/**
 * The records already in data/, seen as clusters, so that the importers add to
 * them instead of creating the same saints again. Existing files are never
 * rewritten; their commemorations are only placed in more calendars.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadDataset, type Dataset } from "../dataset.ts";
import { newSlot, type Cluster, type ClusterKind, type GroupSubject, type Slot } from "./cluster.ts";
import { parseEn } from "./en.ts";
import { FEASTS } from "./feasts.ts";
import type { Gender, HolinessType, NamePart } from "./model.ts";
import { parseRo } from "./ro.ts";
import type { Family } from "./units.ts";

type Rec = Record<string, any>;

export interface ExistingLine {
  commemorations: string[];
  [key: string]: unknown;
}

export interface Existing {
  dataset: Dataset;
  /** tradition → "MM-DD" → lines of data/traditions/<id>/menaion/MM/DD.json */
  menaion: Map<string, Map<string, ExistingLine[]>>;
  /** tradition → movable.json */
  movable: Map<string, Rec>;
  /** Existing commemorations as clusters, by id. */
  clusters: Map<string, Cluster>;
  /** Existing persons as slots, by id. */
  persons: Map<string, Slot>;
  groups: Map<string, GroupSubject>;
  /** All ids in use, by collection, with the former ids kept in `aliases`. */
  ids: Map<string, Set<string>>;
  /**
   * Commemorations by what identifies them in a source: "oca:<id>", "doxologia:<slug>",
   * "url:<link>", "patriarhia:<MM-DD>|<official title>". A second import finds them again here.
   */
  exact: Map<string, Cluster[]>;
}

function namesOf(ds: Dataset, collection: string, id: string, locale: string): string[] {
  const rec = ds.locales.get(collection)?.get(id)?.get(locale);
  if (!rec) return [];
  const names = rec.names ?? {};
  return [names.display, names.full, ...(names.variants ?? [])].filter((x): x is string => typeof x === "string");
}

function partsOf(texts: string[], lang: "ro" | "en"): NamePart[] {
  const out: NamePart[] = [];
  for (const t of texts) {
    const p = lang === "ro" ? parseRo(t) : parseEn(t);
    if (p.names[0]) out.push(p.names[0]);
  }
  return out;
}

function personSlot(ds: Dataset, id: string, rec: Rec, family: Family): Slot {
  const slot = newSlot(family);
  slot.existingPerson = id;
  slot.personId = id;
  slot.gender = rec.gender as Gender;
  for (const h of (rec.holiness_types ?? []) as HolinessType[]) slot.holiness.add(h);
  if (rec.kind === "angel") slot.angel = true;
  for (const lang of ["ro", "en"] as const) {
    const texts = namesOf(ds, "persons", id, lang);
    const parts = partsOf(texts, lang);
    const part = parts[0];
    if (part && texts[0]) {
      slot[lang] = { part, display: texts[0], short: part.text, variants: new Set(texts.slice(1)) };
      slot.alts.push(...parts.slice(1));
    }
  }
  const ext = rec.external_ids ?? {};
  if (ext.oca) slot.ext.oca = ext.oca;
  if (ext.doxologia) slot.ext.doxologia = ext.doxologia;
  if (ext.copticchurch) slot.ext.copticchurch = ext.copticchurch;
  for (const s of rec.sources ?? []) {
    const url = s.url as string | undefined;
    if (url && /doxologia\.ro\/(.+)$/.test(url)) slot.ext.doxologia ??= /doxologia\.ro\/(.+)$/.exec(url)?.[1];
  }
  return slot;
}

function groupSubject(ds: Dataset, id: string, rec: Rec): GroupSubject {
  const g: GroupSubject = { holiness: new Set((rec.holiness_types ?? []) as HolinessType[]), names: [], ext: {}, citations: [], refs: new Map(), existingGroup: id, groupId: id };
  if (rec.count?.value) g.count = rec.count.value;
  const ro = namesOf(ds, "groups", id, "ro");
  const en = namesOf(ds, "groups", id, "en");
  if (ro[0]) g.ro = ro[0];
  if (en[0]) g.en = en[0];
  for (const t of ro) g.names.push(...parseRo(t).names);
  for (const t of en) g.names.push(...parseEn(t).names);
  if (rec.external_ids?.oca) g.ext.oca = rec.external_ids.oca;
  return g;
}

const KIND_MAP: Record<string, ClusterKind> = {
  repose: "persons",
  relics_translation: "relics_translation",
  relics_finding: "relics_finding",
  synaxis: "synaxis",
  icon: "icon",
  council: "council",
  event: "event",
  glorification: "glorification",
  angels: "angels",
  forefeast: "forefeast",
  afterfeast: "afterfeast",
  leavetaking: "leavetaking",
  feast_of_the_lord: "feast",
  feast_of_theotokos: "feast",
  feast_of_cross: "feast",
};

export function loadExisting(dataDir: string): Existing {
  const ds = loadDataset(dataDir);
  const existing: Existing = { dataset: ds, menaion: new Map(), movable: new Map(), clusters: new Map(), persons: new Map(), groups: new Map(), ids: new Map(), exact: new Map() };
  for (const [collection, records] of ds.records) {
    // A merged record keeps the other id in `aliases`: that id is not free for a new record.
    const ids = new Set(records.keys());
    for (const rec of records.values()) for (const alias of (rec.aliases ?? []) as string[]) ids.add(alias);
    existing.ids.set(collection, ids);
  }

  const traditionsDir = join(dataDir, "traditions");
  for (const tradition of readdirSync(traditionsDir)) {
    const menaionDir = join(traditionsDir, tradition, "menaion");
    const byDate = new Map<string, ExistingLine[]>();
    existing.menaion.set(tradition, byDate);
    try {
      for (const mm of readdirSync(menaionDir)) {
        for (const file of readdirSync(join(menaionDir, mm))) {
          const doc = JSON.parse(readFileSync(join(menaionDir, mm, file), "utf8")) as Rec;
          byDate.set(doc.date as string, doc.entries as ExistingLine[]);
        }
      }
    } catch {
      // no menaion folder
    }
    const movablePath = join(traditionsDir, tradition, "movable.json");
    try {
      if (statSync(movablePath).isFile()) existing.movable.set(tradition, JSON.parse(readFileSync(movablePath, "utf8")) as Rec);
    } catch {
      // no movable.json
    }
  }

  const families = personFamilies(ds, existing);
  for (const [id, rec] of ds.records.get("persons") ?? []) existing.persons.set(id, personSlot(ds, id, rec, families.get(id) ?? "byzantine"));
  for (const [id, rec] of ds.records.get("groups") ?? []) existing.groups.set(id, groupSubject(ds, id, rec));

  for (const [id, rec] of ds.records.get("commemorations") ?? []) {
    const rule = rec.date_rule ?? {};
    const kind = KIND_MAP[rec.kind as string];
    if (!kind) continue;
    const family: Family = rule.calendar === "coptic" ? "coptic" : "byzantine";
    const c: Cluster = {
      uid: `existing:${id}`,
      family,
      kind,
      month: rule.type === "fixed" ? rule.month : 0,
      day: rule.type === "fixed" ? rule.day : 0,
      slots: [],
      subjectTitles: [],
      subjectSlots: [],
      titles: {},
      citations: [],
      refs: new Map(),
      ext: {},
      units: [],
      existingComm: id,
      commId: id,
    };
    if (rule.type === "fixed" && rule.month === 2 && rule.day === 29) c.leapDay = true;
    if (rec.duration_days) c.durationDays = rec.duration_days;
    const feast = FEASTS.find((f) => f.id === id || `comm:${f.id}` === rec.parent_feast);
    if (feast && (kind === "feast" || kind === "forefeast" || kind === "afterfeast" || kind === "leavetaking")) c.feast = feast.id;
    if (rec.external_ids?.oca) c.ext.oca = rec.external_ids.oca;
    for (const s of rec.sources ?? []) {
      const url = s.url as string | undefined;
      const m = url ? /\/saints\/lives\/\d+\/\d+\/\d+\/(\d+)-/.exec(url) : null;
      if (m?.[1]) c.ext.oca ??= m[1];
      const cop = url ? /synaxarium\/(\d+)_(\d+)\.html\?lang=en#(\d+)/.exec(url) : null;
      if (cop) c.ext.copticchurch ??= `${cop[1]}_${cop[2]}#${cop[3]}`;
    }
    for (const subject of (rec.subjects ?? []) as string[]) {
      const [prefix, sid] = subject.split(":");
      if (prefix === "person" && sid) {
        const slot = existing.persons.get(sid);
        if (slot) {
          if (kind === "persons" || kind === "angels") c.slots.push(slot);
          else c.subjectSlots.push(slot);
        }
      } else if (prefix === "group" && sid) {
        const g = existing.groups.get(sid);
        if (g) {
          if (kind === "persons") c.kind = "group";
          if (c.kind === "group") c.group = g;
          else c.subjectGroup = g;
          // Named members let the importers recognise a saint listed alone by another source.
          const members = ((ds.records.get("groups")?.get(sid)?.members ?? []) as Rec[]).map((m) => existing.persons.get(String(m.person).replace(/^person:/, "")));
          for (const slot of members) if (slot && c.kind === "group") c.slots.push(slot);
        }
      } else if (prefix === "icon" && sid) {
        c.icon = { citations: [], refs: new Map(), existingIcon: sid, iconId: sid };
        const ro = namesOf(ds, "icons", sid, "ro")[0];
        const en = namesOf(ds, "icons", sid, "en")[0];
        if (ro) c.icon.ro = ro;
        if (en) c.icon.en = en;
      }
    }
    const ro = namesOf(ds, "commemorations", id, "ro")[0];
    const en = namesOf(ds, "commemorations", id, "en")[0];
    if (ro) c.titles.ro = ro;
    if (en) c.titles.en = en;
    existing.clusters.set(id, c);
    for (const s of rec.sources ?? []) {
      const url = s.url as string | undefined;
      if (!url) continue;
      addExact(existing, `url:${url}`, c);
      const oca = /\/saints\/lives\/\d+\/\d+\/\d+\/(\d+)-/.exec(url);
      if (oca?.[1]) addExact(existing, `oca:${oca[1]}`, c);
      const doxologia = /^https:\/\/doxologia\.ro\/([^/?#]+)$/.exec(url);
      if (doxologia?.[1]) addExact(existing, `doxologia:${doxologia[1]}`, c);
    }
    if (rec.external_ids?.oca) addExact(existing, `oca:${rec.external_ids.oca}`, c);
  }
  // The official titles of the Romanian calendar name its lines.
  const titles = (ds.locales.get("traditions")?.get("romanian")?.get("ro")?.official_titles ?? {}) as Record<string, string>;
  for (const [date, lines] of existing.menaion.get("romanian") ?? []) {
    for (const line of lines) {
      const first = line.commemorations[0];
      const title = first ? titles[first] : undefined;
      if (!title) continue;
      for (const ref of line.commemorations) {
        const c = existing.clusters.get(ref.replace(/^comm:/, ""));
        if (c) addExact(existing, `patriarhia:${date}|${title}`, c);
      }
    }
  }
  return existing;
}

/** The family of calendars a tradition belongs to, as the importers group the sources. */
function traditionFamily(tradition: string): Family {
  return tradition === "coptic" ? "coptic" : tradition === "armenian" ? "armenian" : "byzantine";
}

/**
 * The family of each person, from the calendars that keep its commemorations:
 * a saint known only from the Coptic Synaxarium is a Coptic saint, so that a
 * new Coptic line about him finds him. The apostles and prophets, also named
 * by Coptic and Armenian lines, stay Byzantine.
 */
function personFamilies(ds: Dataset, existing: Existing): Map<string, Family> {
  const placed = new Map<string, Set<Family>>();
  const place = (ref: string, tradition: string): void => {
    const id = ref.replace(/^comm:/, "");
    placed.set(id, (placed.get(id) ?? new Set<Family>()).add(traditionFamily(tradition)));
  };
  for (const [tradition, byDate] of existing.menaion) for (const lines of byDate.values()) for (const line of lines) for (const ref of line.commemorations) place(ref, tradition);
  for (const [tradition, doc] of existing.movable) for (const line of (doc.entries ?? []) as ExistingLine[]) for (const ref of line.commemorations) place(ref, tradition);
  const seen = new Map<string, Set<Family>>();
  for (const [id, rec] of ds.records.get("commemorations") ?? []) {
    const families = placed.get(id) ?? new Set<Family>([rec.date_rule?.calendar === "coptic" ? "coptic" : "byzantine"]);
    for (const subject of (rec.subjects ?? []) as string[]) {
      if (!subject.startsWith("person:")) continue;
      const pid = subject.slice("person:".length);
      const set = seen.get(pid) ?? new Set<Family>();
      for (const f of families) set.add(f);
      seen.set(pid, set);
    }
  }
  const out = new Map<string, Family>();
  for (const [pid, set] of seen) out.set(pid, set.has("byzantine") ? "byzantine" : set.has("coptic") ? "coptic" : "armenian");
  return out;
}

function addExact(existing: Existing, key: string, c: Cluster): void {
  const list = existing.exact.get(key) ?? [];
  if (!list.includes(c)) list.push(c);
  existing.exact.set(key, list);
}
