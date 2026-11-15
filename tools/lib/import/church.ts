/**
 * The calendars of Churches whose sources write in other languages than Romanian and English (the Georgian
 * Patriarchate's calendar, …). Each line of the source is read by the parser of its language into one or more parts,
 * each with an English title the importer's matcher understands (see ka.ts) and the names in the source's language.
 * A part is matched, with the importer's own matching (Builder.prematch and Builder.match), against the commemorations
 * that the calendars already in the data keep on the same Menaion day; the line then goes to the tradition's calendar
 * with the commemorations found. What is not found becomes a new commemoration, with its persons or its group, named
 * in the source's language. Lines of other kinds that match nothing (feasts, icons, relics of a saint kept on another
 * day) are left for review rather than guessed.
 */
import { Builder, type MatchResult } from "./build.ts";
import { holinessAgrees, numeralOf, personScore, type Cluster, type Slot } from "./cluster.ts";
import type { Existing } from "./existing.ts";
import type { Gender, HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { givenSimilarity, skeleton, slugify } from "./names.ts";
import { idFromName } from "./records.ts";
import { mmdd, type Citation, type SourceKey, type Unit } from "./units.ts";

type Rec = Record<string, any>;

export interface NativeName {
  /** The name in the source's language, in the nominative, as a record's display name. */
  display: string;
  given: string;
  /** The name as the English title writes it ("Basil of Ancyra"): what the matcher compared, and the base of a new id. */
  en: string;
  holiness: HolinessType[];
  gender?: Gender;
}

/** One commemoration of a source line: its English title as the matcher reads it, and its names in the source's language. */
export interface NativePart {
  en: string;
  parsed: ParsedTitle;
  names: NativeName[];
  /** The commemoration in the source's language, for a new record that is not one person. */
  display: string;
}

export interface ChurchEntry {
  /** What identifies the line in the source, from year to year ("3225"). */
  key: string;
  month: number;
  day: number;
  order: number;
  title: string;
  url: string;
  parts: NativePart[];
}

export interface ChurchSource {
  tradition: string;
  /** The source record ("src:patriarchate-ge"). */
  source: string;
  /** The source's key in the matcher's bookkeeping ("patriarchate-ge"). */
  key: string;
  /** Language of the titles ("ka"). */
  lang: string;
  /** What the editorial notes of new records say they come from. */
  note: string;
  entries: ChurchEntry[];
}

export type Outcome =
  | { kind: "matched"; comms: string[]; rest: string[] }
  | { kind: "new"; comms: string[] }
  | { kind: "known"; comms: string[] }
  | { kind: "left"; why: string }
  | { kind: "skip" };

export interface EntryReport {
  entry: ChurchEntry;
  parts: Array<{ part: NativePart; outcome: Outcome }>;
}

export interface ChurchImport {
  files: Map<string, Rec>;
  reports: EntryReport[];
  stats: Map<string, number>;
}

const SKIPPED = new Set(["skip", "movable", "forefeast", "afterfeast", "leavetaking"]);
const PERSONS = new Set(["saint", "saints"]);

/** Imports one Church's calendar from its source lines. */
export function importChurch(existing: Existing, src: ChurchSource, accessed: string): ChurchImport {
  const builder = new Builder(existing);
  const stats = new Map<string, number>();
  const count = (key: string, n = 1): void => {
    stats.set(key, (stats.get(key) ?? 0) + n);
  };
  const files = new Map<string, Rec>();
  const ids = new Map<string, Set<string>>();
  const claim = (collection: string, base: string): string => {
    const taken = (id: string): boolean => existing.ids.get(collection)?.has(id) === true || ids.get(collection)?.has(id) === true;
    let id = base || "saint";
    for (let n = 2; taken(id); n++) id = `${base}-${n}`;
    let set = ids.get(collection);
    if (!set) ids.set(collection, (set = new Set()));
    set.add(id);
    return id;
  };

  // The commemorations of one person alone (his repose, mostly), for the saints kept on another day (see elsewhere).
  const ownCommemorations = new Map<Slot, string[]>();
  for (const c of existing.clusters.values()) {
    const slot = c.slots[0];
    if (c.kind !== "persons" || c.slots.length !== 1 || !slot || !c.existingComm || c.family !== "byzantine") continue;
    ownCommemorations.set(slot, [...(ownCommemorations.get(slot) ?? []), c.existingComm]);
  }

  // Commemorations already in this tradition's calendar: a second import adds nothing.
  const placed = new Set<string>();
  for (const lines of existing.menaion.get(src.tradition)?.values() ?? []) for (const line of lines) for (const c of line.commemorations) placed.add(c);

  type Item = { entry: ChurchEntry; part: NativePart; unit: Unit };
  const items: Item[] = [];
  for (const entry of src.entries) {
    entry.parts.forEach((part, k) => {
      const citation: Citation = { source: src.source, url: entry.url, accessed };
      const unit: Unit = {
        uid: `${src.key}:${entry.key}#${k}`,
        // The matcher only compares source keys; a source of its own keeps the bookkeeping of the others apart.
        source: src.key as SourceKey,
        family: "byzantine",
        lang: "en",
        title: part.en,
        parsed: part.parsed,
        month: entry.month,
        day: entry.day,
        order: entry.order * 10 + k,
        url: entry.url,
        citation,
        ext: {},
      };
      if (entry.month === 2 && entry.day === 29) unit.leapDay = true;
      unit.foreign = src.lang;
      items.push({ entry, part, unit });
    });
  }

  // Matching, one Menaion day at a time: the names of all the day's lines are assigned together first.
  const results = new Map<Item, MatchResult | null>();
  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    const key = mmdd(it.entry.month, it.entry.day);
    byDay.set(key, [...(byDay.get(key) ?? []), it]);
  }
  for (const dayItems of byDay.values()) {
    const first = dayItems[0];
    if (!first) continue;
    const pool = builder.candidates(first.entry.month, first.entry.day);
    const units = dayItems.filter((it) => !SKIPPED.has(it.part.parsed.kind)).map((it) => it.unit);
    const pre = builder.prematch(units, pool);
    const claimed = new Set<Slot>([...pre.values()].flatMap((r) => r.pairs.map(([, slot]) => slot)));
    for (const it of dayItems) {
      if (SKIPPED.has(it.part.parsed.kind)) {
        results.set(it, null);
        continue;
      }
      const known = builder.exactFor({ ...it.unit, source: "overlay" });
      if (known.length > 0) {
        results.set(it, { clusters: known, pairs: [], rest: [] });
        continue;
      }
      // The ranks of a calendar are said in full: they must agree ("righteous" says nothing; a martyr is not a hierarch).
      results.set(it, pre.get(it.unit) ?? builder.match(it.unit, pool, { claimed, agree: true }));
    }
  }

  // Lines and new records.
  const reports: EntryReport[] = [];
  const lines = new Map<string, Rec[]>();
  for (const entry of src.entries) {
    const report: EntryReport = { entry, parts: [] };
    const comms: string[] = [];
    for (const it of items.filter((x) => x.entry === entry)) {
      const result = results.get(it);
      if (result === null || result === undefined) {
        report.parts.push({ part: it.part, outcome: { kind: "skip" } });
        count("skipped");
        continue;
      }
      const found = result.clusters.map((c) => c.existingComm).filter((c): c is string => c !== undefined);
      const restNames = result.rest.map((n) => n.given);
      // A line of several names found only in part: its first name leads it, so the line is the commemoration that
      // name was found in, with its companions ("Perpetua, Satyrus, Revocatus …" is "Martyr Perpetua and those with
      // her"); found only by a later name, it is not trusted ("Joseph the Betrothed, David the King and James" is not
      // the one James of another line of the day).
      const several = it.part.parsed.names.length >= 2 && PERSONS.has(it.part.parsed.kind);
      const partly = several && result.rest.length > 0 && result.pairs.length > 0;
      if (partly && !result.pairs.some(([n]) => n === it.part.parsed.names[0])) {
        report.parts.push({ part: it.part, outcome: { kind: "left", why: "only later names found on its day" } });
        count("left.partly");
        continue;
      }
      if (found.length > 0 && result.clusters.every((c) => c.existingComm)) {
        const fromUrl = (existing.exact.get(`url:${entry.url}`) ?? []).some((c) => result.clusters.includes(c));
        let all = found.map((c) => `comm:${c}`);
        if (!partly && result.rest.length > 0 && PERSONS.has(it.part.parsed.kind) && !result.rest.some((n) => elsewhere(n, it.part.parsed.holiness))) {
          // Names the day's records do not have: a commemoration of their own, on the same line.
          const restKeys = new Set(result.rest.map((n) => skeleton(n.given)));
          const extra = newPersons(
            it,
            it.part.names.filter((n) => restKeys.has(skeleton(n.en.split(/[\s,]/)[0] ?? n.en))),
          );
          if (extra) all = [...all, extra];
        }
        comms.push(...all);
        report.parts.push({ part: it.part, outcome: fromUrl ? { kind: "known", comms: all } : { kind: "matched", comms: all, rest: restNames } });
        count(fromUrl ? "known" : "matched");
        continue;
      }
      if (PERSONS.has(it.part.parsed.kind) && it.part.names.length > 0) {
        // A saint the other calendars keep on another day: his commemoration, if the data has only one such saint;
        // when it has several, the line is left for review rather than made a second time.
        const through = it.part.parsed.names.length === 1 ? throughOther(it) : undefined;
        if (through) {
          comms.push(`comm:${through}`);
          report.parts.push({ part: it.part, outcome: { kind: "matched", comms: [`comm:${through}`], rest: [] } });
          count("through-other");
          continue;
        }
        const surname = it.part.parsed.names.length === 1 ? /(([^)]+))/.exec(it.part.en)?.[1] : undefined;
        const others = it.part.parsed.names.map((n) => elsewhere(n, it.part.parsed.holiness, surname));
        const only = others.length === 1 ? others[0] : undefined;
        if (only && only !== "ambiguous") {
          comms.push(`comm:${only}`);
          report.parts.push({ part: it.part, outcome: { kind: "matched", comms: [`comm:${only}`], rest: [] } });
          count("elsewhere");
          continue;
        }
        if (others.some((o) => o !== undefined)) {
          report.parts.push({ part: it.part, outcome: { kind: "left", why: "a saint of this name is kept on another day" } });
          count("left.elsewhere");
          continue;
        }
        const id = newPersons(it, it.part.names);
        if (id) {
          comms.push(id);
          report.parts.push({ part: it.part, outcome: { kind: "new", comms: [id] } });
          count("new.persons");
          continue;
        }
      }
      if (it.part.parsed.kind === "group") {
        const id = newGroup(it);
        comms.push(id);
        report.parts.push({ part: it.part, outcome: { kind: "new", comms: [id] } });
        count("new.groups");
        continue;
      }
      report.parts.push({ part: it.part, outcome: { kind: "left", why: `${it.part.parsed.kind} not found on its day` } });
      count(`left.${it.part.parsed.kind}`);
    }
    reports.push(report);
    const unique = comms.filter((c, i) => comms.indexOf(c) === i && !placed.has(c));
    for (const c of unique) placed.add(c);
    if (unique.length === 0) continue;
    // The saints of 29 February, listed on 28 February in a common year, go to their own day.
    const leap = entry.month === 2 && entry.day === 28 && unique.every((c) => existing.clusters.get(c.replace(/^comm:/, ""))?.leapDay === true);
    const date = leap ? "02-29" : mmdd(entry.month, entry.day);
    lines.set(date, [...(lines.get(date) ?? []), { commemorations: unique }]);
  }

  // The tradition's calendar: the new lines after those already there; a commemoration whose usual day is another
  // is marked so.
  for (const [date, added] of lines) {
    const [mm, dd] = date.split("-");
    const before = (existing.menaion.get(src.tradition)?.get(date) ?? []).map((l) => ({ ...l }));
    for (const line of added) {
      const differs = (line.commemorations as string[]).some((ref) => {
        const c = existing.clusters.get(ref.replace(/^comm:/, ""));
        if (!c || c.month === 0) return false;
        if (c.leapDay && date === "02-28") return false;
        return mmdd(c.month, c.day) !== date;
      });
      if (differs) line.differs_from_default = true;
    }
    const entries = [...before, ...added];
    files.set(`traditions/${src.tradition}/menaion/${mm}/${dd}.json`, { tradition: src.tradition, date, entries });
    count("lines", added.length);
  }
  return { files, reports, stats };

  /**
   * A saint of the data whom the other calendars keep on another day: the only person of that first name whose
   * epithets or places agree (score of 1.2 and more, the same regnal number, an agreeing holiness), and his only
   * commemoration of his own. "ambiguous" when several persons, or several commemorations, would do.
   */
  function elsewhere(part: NamePart, holiness: HolinessType[], surname?: string): string | "ambiguous" | undefined {
    const sur = surname ? skeleton(surname.split(/[s,]+/)[0] ?? surname) : undefined;
    const found: Array<{ slot: Slot; score: number }> = [];
    for (const slot of existing.persons.values()) {
      if (slot.family !== "byzantine") continue;
      let best = 0;
      for (const x of [slot.en?.part, slot.ro?.part, ...slot.alts]) {
        if (!x || givenSimilarity(part, x) < 1 || numeralOf(part) !== numeralOf(x)) continue;
        best = Math.max(best, personScore(part, x, true));
        // The same surname in the person's names ("Saint Euthymius (Takaishvili)") says it is he.
        const texts = [slot.en?.display, slot.en?.full, slot.ro?.display, slot.ro?.full].filter((t): t is string => t !== undefined);
        if (sur && sur.length >= 3 && texts.some((t) => t.split(/[s,()]+/).some((w) => skeleton(w) === sur))) best = Math.max(best, 1.4);
      }
      if (best >= 1.2 && holinessAgrees(new Set(holiness), slot.holiness)) found.push({ slot, score: best });
    }
    if (found.length === 0) return undefined;
    found.sort((a, b) => b.score - a.score);
    const [top, second] = found;
    if (!top || (second && second.score >= top.score)) return "ambiguous";
    const own = ownCommemorations.get(top.slot) ?? [];
    return own.length === 1 ? own[0] : "ambiguous";
  }

  /**
   * The one commemoration of the day, other than a repose, whose saint the line names: the calendars keep him that day
   * through his relics, his glorification or another event of his (the glorification of St Theodosius of Chernigov,
   * 9 September).
   */
  function throughOther(it: Item): string | undefined {
    const part = it.part.parsed.names[0];
    if (!part) return undefined;
    const pool = builder.candidates(it.entry.month, it.entry.day);
    const found = pool.filter(
      (c) =>
        c.existingComm &&
        (c.kind === "relics_translation" || c.kind === "relics_finding" || c.kind === "glorification" || c.kind === "event") &&
        c.subjectSlots.some((s) => builder.slotScore(part, "foreign", s) >= 1 && holinessAgrees(new Set(it.part.parsed.holiness), s.holiness)),
    );
    return found.length === 1 ? found[0]?.existingComm : undefined;
  }

  /** A new commemoration of persons not found on their day, named in the source's language. */
  function newPersons(it: Item, names: NativeName[]): string | undefined {
    if (names.length === 0) return undefined;
    const known = (existing.exact.get(`url:${it.entry.url}`) ?? []).find((c) => c.kind === "persons");
    if (known?.existingComm) return `comm:${known.existingComm}`;
    const pids = names.map((n) => {
      const pid = claim("persons", idFromName(n.en, "en"));
      writePerson(pid, n, it);
      return pid;
    });
    const base = pids.length === 1 ? `${pids[0]}--repose` : pids.length === 2 ? `${pids[0]}-and-${pids[1]}` : `${pids[0]}-and-companions`;
    const id = claim("commemorations", base);
    const rec: Rec = { id, kind: "repose", subjects: pids.map((p) => `person:${p}`), date_rule: dateRule(it.entry) };
    rec.sources = [it.unit.citation];
    rec.editorial = editorial(it, []);
    files.set(`commemorations/${id}.json`, rec);
    if (pids.length > 1) files.set(`i18n/${src.lang}/commemorations/${id}.json`, locale(id, it.part.display, it));
    count("new.commemorations");
    return `comm:${id}`;
  }

  function newGroup(it: Item): string {
    const known = (existing.exact.get(`url:${it.entry.url}`) ?? []).find((c) => c.kind === "group");
    if (known?.existingComm) return `comm:${known.existingComm}`;
    const gid = claim("groups", groupSlugOf(it.part.en));
    const rec: Rec = { id: gid, kind: it.part.parsed.holiness.some((h) => /martyr/.test(h)) ? "martyrs" : "other" };
    if (it.part.parsed.count) rec.count = { value: it.part.parsed.count, precision: "exact" };
    if (it.part.parsed.holiness.length > 0) rec.holiness_types = [...new Set(it.part.parsed.holiness)];
    rec.sources = [it.unit.citation];
    rec.editorial = editorial(it, []);
    files.set(`groups/${gid}.json`, rec);
    files.set(`i18n/${src.lang}/groups/${gid}.json`, locale(gid, it.part.display, it));
    const id = claim("commemorations", gid);
    files.set(`commemorations/${id}.json`, { id, kind: "repose", subjects: [`group:${gid}`], date_rule: dateRule(it.entry), sources: [it.unit.citation], editorial: editorial(it, []) });
    count("new.commemorations");
    return `comm:${id}`;
  }

  function writePerson(pid: string, n: NativeName, it: Item): void {
    const notes = ["Numele e trecut automat din genitivul calendarului la nominativ; e de verificat."];
    if (!n.gender) notes.push("Genul nu reiese din sursă; e de verificat.");
    const holiness = n.holiness.length > 0 ? [...new Set(n.holiness)] : ["righteous"];
    if (n.holiness.length === 0) notes.push("Chipul sfințeniei nu reiese din titlu; „righteous” e provizoriu.");
    files.set(`persons/${pid}.json`, {
      id: pid,
      kind: "saint",
      gender: n.gender ?? "male",
      holiness_types: holiness,
      sources: [it.unit.citation],
      editorial: editorial(it, notes),
    });
    const loc = locale(pid, n.display, it);
    loc.names.given = n.given;
    files.set(`i18n/${src.lang}/persons/${pid}.json`, loc);
    count("new.persons.records");
  }

  function locale(id: string, display: string, it: Item): Rec {
    return { id, locale: src.lang, names: { display }, references: [it.unit.citation], translation: { status: "draft", method: "original" } };
  }

  function editorial(_it: Item, notes: string[]): Rec {
    return { status: "draft", confidence: "low", notes: [`Importat automat din ${src.note}; de verificat.`, ...notes] };
  }
}

function dateRule(e: ChurchEntry): Rec {
  if (e.month === 2 && e.day === 29) return { type: "fixed", month: 2, day: 29, non_leap: { month: 2, day: 28 } };
  return { type: "fixed", month: e.month, day: e.day };
}

function groupSlugOf(en: string): string {
  const s = slugify(en.replace(/^(?:Holy |Saints? |Venerable |Hieromartyrs? |Martyrs? )+/i, "").replace(/\s+and those with (?:him|them)$/i, " and companions"));
  return s.split("-").slice(0, 8).join("-") || "group";
}

export type { Cluster };
