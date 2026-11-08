/**
 * Puts the sources together: units of the same church day that name the same
 * saint (or feast, relics, icon …) become one cluster, and every tradition gets
 * its calendar lines.
 *
 * - Romanian calendar: the official lines of calendar.patriarhia.ro (with their
 *   crosses), then the other saints of the day listed by doxologia.ro.
 * - Russian calendar: the fixed commemorations of the OCA, plus the local
 *   Russian saints of orthodox-calendar.
 * - Ecumenical Patriarchate and Serbian Church: the commemorations that both the
 *   Romanian and the Russian calendars hold (the shared Byzantine Menaion), with
 *   low confidence, plus the local Serbian saints of orthodox-calendar.
 * - Coptic Church: the Coptic Synaxarium. Armenian Church: its calendar of
 *   feasts, without days (movable).
 */
import {
  addCitation,
  addRef,
  displayOf,
  extraKeys,
  holinessAgrees,
  holinessCompatible,
  namesConflict,
  newSlot,
  numeralOf,
  personScore,
  type Cluster,
  type GroupSubject,
  type Slot,
} from "./cluster.ts";
import type { Existing, ExistingLine } from "./existing.ts";
import type { HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { parseEn } from "./en.ts";
import { fold, givenSimilarity } from "./names.ts";
import { mmdd, type Unit } from "./units.ts";

export type Confidence = "low" | "medium" | "high";

/**
 * Extra conditions for the bare names of the orthodox-calendar lists:
 * - agree: on the Menaion date, the kind of holiness must agree (a martyr is
 *   not a hierarch), and a match on the first name alone must not have other
 *   places or another regnal number ("Gregory of Gornjak" is not "Gregory of
 *   Grigoriou");
 * - sameGender: a match on the first name alone keeps the gender ("Dosithea"
 *   is not "Dositheus");
 * - anyHoliness: on the civil date, the kind of holiness the list gives apart
 *   from the title is not trusted ("Venerable" for a bishop).
 */
export interface MatchRules {
  agree?: boolean;
  anyHoliness?: boolean;
  sameGender?: boolean;
}

/** What a unit matched: the clusters, the persons its names landed on, and the names left over. */
export interface MatchResult {
  clusters: Cluster[];
  pairs: Array<[NamePart, Slot]>;
  rest: NamePart[];
}

export interface LineDraft {
  clusters: Cluster[];
  symbol?: string;
  title?: string;
  confidence?: Confidence;
  differs?: boolean;
}

export interface BuildResult {
  clusters: Cluster[];
  /** tradition → "MM-DD" → new lines */
  lines: Map<string, Map<string, LineDraft[]>>;
  /** tradition → movable lines (no rule: the commemoration's own rule applies) */
  movable: Map<string, LineDraft[]>;
  stats: Map<string, number>;
}

const PERSON_KINDS = new Set(["persons", "angels"]);

function symbolOf(cross: string | null | undefined, color: string | undefined): string | undefined {
  if (!cross) return undefined;
  const shape = cross === "(†)" ? "parenthesized" : cross === "†)" ? "half-parenthesized" : "plain";
  const key = `${color ?? "black"}-${shape}`;
  const legend = new Set(["red-parenthesized", "red-half-parenthesized", "red-plain", "black-half-parenthesized", "black-plain", "blue-half-parenthesized", "blue-plain"]);
  return legend.has(key) ? key : undefined;
}

export class Builder {
  readonly clusters: Cluster[] = [];
  readonly lines = new Map<string, Map<string, LineDraft[]>>();
  readonly movable = new Map<string, LineDraft[]>();
  readonly stats = new Map<string, number>();
  /** Byzantine clusters by "MM-DD" (02-29 clusters are also found on 02-28). */
  private readonly byDate = new Map<string, Cluster[]>();
  private readonly placed = new Map<string, Set<Cluster>>();
  /** Doxologia pages already seen: the same page on another day is the same saint. */
  private readonly doxologiaSlots = new Map<string, Slot>();
  private readonly periods = new Map<string, Cluster>();
  private readonly existingByComm = new Map<string, Cluster>();

  private readonly existing: Existing;

  constructor(existing: Existing) {
    this.existing = existing;
    for (const c of existing.clusters.values()) {
      this.existingByComm.set(c.existingComm ?? "", c);
      if (c.family === "byzantine" && c.month > 0) this.index(c);
    }
    // Existing placements count as placed, and index clusters on the days where traditions put them.
    for (const [tradition, byDate] of existing.menaion) {
      for (const [date, lines] of byDate) {
        for (const line of lines) {
          for (const ref of line.commemorations) {
            const c = this.existingByComm.get(ref.replace(/^comm:/, ""));
            if (!c) continue;
            this.markPlaced(tradition, c);
            if (c.family === "byzantine") this.indexAt(date, c);
          }
        }
      }
    }
    for (const [tradition, doc] of existing.movable) {
      for (const line of (doc.entries ?? []) as ExistingLine[]) {
        for (const ref of line.commemorations) {
          const c = this.existingByComm.get(ref.replace(/^comm:/, ""));
          if (c) this.markPlaced(tradition, c);
        }
      }
    }
    for (const slot of existing.persons.values()) {
      if (slot.ext.doxologia) this.doxologiaSlots.set(slot.ext.doxologia, slot);
    }
  }

  private count(key: string): void {
    this.stats.set(key, (this.stats.get(key) ?? 0) + 1);
  }

  private index(c: Cluster): void {
    this.indexAt(mmdd(c.month, c.day), c);
    if (c.leapDay) this.indexAt("02-28", c);
  }

  private indexAt(date: string, c: Cluster): void {
    const list = this.byDate.get(date) ?? [];
    if (!list.includes(c)) list.push(c);
    this.byDate.set(date, list);
  }

  private markPlaced(tradition: string, c: Cluster): void {
    let set = this.placed.get(tradition);
    if (!set) this.placed.set(tradition, (set = new Set()));
    set.add(c);
  }

  isPlaced(tradition: string, c: Cluster): boolean {
    return this.placed.get(tradition)?.has(c) ?? false;
  }

  /** Adds a calendar line, leaving out commemorations already placed in that tradition. */
  addLine(tradition: string, month: number, day: number, line: LineDraft): void {
    const clusters = line.clusters.filter((c, i, all) => all.indexOf(c) === i && !this.isPlaced(tradition, c));
    if (clusters.length === 0) return;
    // The official title belongs to the line as printed; it is kept only if the line starts as printed.
    const draft: LineDraft = { ...line, clusters };
    if (line.title && clusters[0] !== line.clusters[0]) delete draft.title;
    for (const c of clusters) this.markPlaced(tradition, c);
    let byDate = this.lines.get(tradition);
    if (!byDate) this.lines.set(tradition, (byDate = new Map()));
    const key = mmdd(month, day);
    const list = byDate.get(key) ?? [];
    list.push(draft);
    byDate.set(key, list);
  }

  addMovable(tradition: string, line: LineDraft): void {
    const clusters = line.clusters.filter((c) => !this.isPlaced(tradition, c));
    if (clusters.length === 0) return;
    for (const c of clusters) this.markPlaced(tradition, c);
    const list = this.movable.get(tradition) ?? [];
    list.push({ ...line, clusters });
    this.movable.set(tradition, list);
  }

  candidates(month: number, day: number): Cluster[] {
    return this.byDate.get(mmdd(month, day)) ?? [];
  }

  // -------------------------------------------------------------------------
  // Clusters from units
  // -------------------------------------------------------------------------

  private base(u: Unit, kind: Cluster["kind"]): Cluster {
    const c: Cluster = {
      uid: u.uid,
      family: u.family,
      kind,
      month: u.month,
      day: u.day,
      slots: [],
      subjectTitles: [],
      subjectSlots: [],
      titles: {},
      citations: [],
      refs: new Map(),
      ext: {},
      units: [],
    };
    if (u.leapDay) c.leapDay = true;
    return c;
  }

  slotFor(u: Unit, part: NamePart, single: boolean): Slot {
    if (u.ext.doxologia && single) {
      const known = this.doxologiaSlots.get(u.ext.doxologia);
      if (known) return known;
    }
    // The same full name on another day ("Antipa de la Calapodești", "Niceta de Remesiana") is the same saint.
    const key = identityKey(u, part);
    const same = key ? this.identity.get(key) : undefined;
    if (same && holinessCompatible(new Set(u.parsed.holiness), same.holiness)) {
      this.fillSlot(same, u, part, single);
      same.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
      return same;
    }
    const slot = newSlot(u.family);
    this.fillSlot(slot, u, part, single);
    slot.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
    if (u.ext.doxologia && single) this.doxologiaSlots.set(u.ext.doxologia, slot);
    if (key) this.identity.set(key, slot);
    return slot;
  }

  private readonly identity = new Map<string, Slot>();
  /** Archangels created by this import (the existing ones are in existing.persons). */
  private readonly angels: Slot[] = [];

  private knownAngel(part: NamePart, lang: "ro" | "en"): Slot | undefined {
    const all = [...[...this.existing.persons.values()].filter((s) => s.angel), ...this.angels];
    return all.find((s) => {
      const name = s[lang]?.part ?? s[lang === "ro" ? "en" : "ro"]?.part;
      return name !== undefined && givenSimilarity(part, name) >= 1;
    });
  }
  private readonly icons = new Map<string, NonNullable<Cluster["icon"]>>();

  fillSlot(slot: Slot, u: Unit, part: NamePart, single: boolean): void {
    const p = u.parsed;
    if (!slot[u.lang]) {
      const { display: shown, full } = displayOf(p, part, u.lang, single);
      // The orthodox-calendar lists give bare names ("Bretannio").
      const display = u.source === "overlay" && !p.honorific ? `Saint ${part.text}` : shown;
      slot[u.lang] = { part, display, short: part.text, variants: new Set() };
      if (full) (slot[u.lang] as NonNullable<Slot["ro"]>).full = full;
    } else if (single) {
      const { display } = displayOf(p, part, u.lang, single);
      const name = slot[u.lang] as NonNullable<Slot["ro"]>;
      if (display !== name.display) name.variants.add(display);
    }
    if (u.arTitle && !slot.ar) slot.ar = { part, display: u.arTitle, short: u.arTitle, variants: new Set() };
    if (slot.holiness.size === 0 || u.lang === "ro") for (const h of p.holiness) slot.holiness.add(h);
    const gender = single ? (p.gender ?? part.gender) : part.gender;
    if (gender && (!slot.gender || u.lang === "ro")) slot.gender = gender;
    if (p.holiness.includes("archangel")) slot.angel = true;
    if (u.ext.oca && single) slot.ext.oca ??= u.ext.oca;
    if (u.ext.doxologia && single) slot.ext.doxologia ??= u.ext.doxologia;
    if (u.ext.copticchurch && single) slot.ext.copticchurch ??= u.ext.copticchurch;
    addCitation(slot.citations, u.citation);
    if (u.url) addRef(slot.refs, u.lang, u.citation);
    if (u.taklaUrl) addCitation(slot.citations, { source: "src:st-takla-synaxarium", url: u.taklaUrl, ...(u.citation.accessed ? { accessed: u.citation.accessed } : {}) });
  }

  private group(u: Unit, p: ParsedTitle): GroupSubject {
    const g: GroupSubject = { holiness: new Set(p.holiness), names: p.names, ext: {}, citations: [], refs: new Map() };
    if (p.count) g.count = p.count;
    const title = u.lang === "ro" ? p.title : p.title.replace(/\.$/, "");
    g[u.lang] = u.parsed === p ? title.trim() : this.subjectDisplay(p, u.lang);
    if (u.arTitle && u.parsed === p) g.ar = u.arTitle;
    if (u.ext.oca) g.ext.oca = u.ext.oca;
    if (u.ext.doxologia) g.ext.doxologia = u.ext.doxologia;
    if (u.ext.copticchurch) g.ext.copticchurch = u.ext.copticchurch;
    addCitation(g.citations, u.citation);
    if (u.url) addRef(g.refs, u.lang, u.citation);
    return g;
  }

  private subjectDisplay(p: ParsedTitle, lang: "ro" | "en"): string {
    return lang === "ro" ? p.title : p.title.replace(/\.$/, "");
  }

  /** A new cluster for a unit that matched nothing. */
  clusterFrom(u: Unit, names?: NamePart[]): Cluster | null {
    const p = u.parsed;
    let c: Cluster;
    switch (p.kind) {
      case "saint":
      case "saints": {
        const list = names ?? p.names;
        if (list.length === 0) {
          // "All Orthodox Christians who died as martyrs …": nobody named, a group.
          c = this.base(u, "group");
          c.group = this.group(u, p);
          break;
        }
        c = this.base(u, "persons");
        const single = list.length === 1 && p.names.length === 1;
        for (const part of list) c.slots.push(this.slotFor(u, part, single));
        if (!single) c.titles[u.lang] = p.title.replace(/\.$/, "");
        if (u.arTitle && !single) c.titles.ar = u.arTitle;
        break;
      }
      case "angels": {
        c = this.base(u, "angels");
        const subject = p.subject ?? p;
        for (const part of subject.names) {
          // The archangels are the same in every calendar: Gavriil is the archangel Gabriel already known.
          const known = this.knownAngel(part, u.lang);
          if (known) {
            c.slots.push(known);
            continue;
          }
          const slot = newSlot(u.family);
          this.fillSlot(slot, { ...u, parsed: subject }, part, subject.names.length === 1);
          slot.angel = true;
          this.angels.push(slot);
          c.slots.push(slot);
        }
        c.titles[u.lang] = p.title.replace(/\.$/, "");
        break;
      }
      case "group": {
        c = this.base(u, "group");
        c.group = this.group(u, p);
        break;
      }
      case "feast":
      case "council":
      case "event":
      case "glorification":
      case "relics_translation":
      case "relics_finding":
      case "synaxis":
      case "icon": {
        c = this.base(u, p.kind);
        if (p.feast) c.feast = p.feast;
        if (p.council) c.council = p.council;
        if (p.subject) {
          if (p.subject.kind === "group" || (p.kind === "synaxis" && p.subject.names.length > 1)) c.subjectGroup = this.group(u, p.subject);
          else c.subjectTitles.push(p.subject);
        }
        if (p.kind === "icon") {
          // The same icon on another day is the same icon, with one more feast.
          const name = u.lang === "ro" ? roIconName(p.icon ?? "") : (p.icon ?? p.title).replace(/\.$/, "");
          const key = `${u.family}|${u.lang}|${fold(name)}`;
          const icon: NonNullable<Cluster["icon"]> = this.icons.get(key) ?? { citations: [], refs: new Map() };
          this.icons.set(key, icon);
          icon[u.lang] ??= name;
          addCitation(icon.citations, u.citation);
          if (u.url) addRef(icon.refs, u.lang, u.citation);
          c.icon = icon;
        }
        c.titles[u.lang] = p.title.replace(/\.$/, "").trim();
        if (u.arTitle) c.titles.ar = u.arTitle;
        break;
      }
      default:
        return null;
    }
    this.attach(c, u);
    this.clusters.push(c);
    if (c.family === "byzantine") this.index(c);
    return c;
  }

  /** Records that a unit describes this cluster. */
  attach(c: Cluster, u: Unit): void {
    if (!c.units.includes(u)) c.units.push(u);
    addCitation(c.citations, u.citation);
    if (u.source === "overlay" && u.url) addCitation(c.citations, { source: /wikipedia\.org/.test(u.url) ? "src:wikipedia" : "src:orthodox-calendar", url: u.url });
    if (u.taklaUrl) addCitation(c.citations, { source: "src:st-takla-synaxarium", url: u.taklaUrl, ...(u.citation.accessed ? { accessed: u.citation.accessed } : {}) });
    if (u.url) addRef(c.refs, u.lang, u.citation);
    if (u.ext.oca) c.ext.oca ??= u.ext.oca;
    if (u.ext.copticchurch) c.ext.copticchurch ??= u.ext.copticchurch;
    if (u.ext.doxologia) c.ext.doxologia ??= u.ext.doxologia;
    if (u.leapDay) c.leapDay = true;
    const p = u.parsed;
    if (!PERSON_KINDS.has(c.kind) && !c.titles[u.lang] && !c.existingComm) c.titles[u.lang] = p.title.replace(/\.$/, "").trim();
    if (c.group && !c.group[u.lang] && (p.kind === "group" || p.kind === "saints")) {
      c.group[u.lang] = p.title.replace(/\.$/, "").trim();
      addRef(c.group.refs, u.lang, u.citation);
      addCitation(c.group.citations, u.citation);
      if (u.ext.oca) c.group.ext.oca ??= u.ext.oca;
    }
    const synaxisGroup = c.group ?? c.subjectGroup;
    if (synaxisGroup && !synaxisGroup[u.lang] && p.kind === "synaxis" && p.subject) {
      synaxisGroup[u.lang] = p.subject.title.replace(/\.$/, "").trim();
      if (c.group) c.group.synaxis = true;
      addRef(synaxisGroup.refs, u.lang, u.citation);
      addCitation(synaxisGroup.citations, u.citation);
    }
    if (c.icon && !c.icon[u.lang] && p.kind === "icon") {
      c.icon[u.lang] = u.lang === "ro" ? roIconName(p.icon ?? "") : (p.icon ?? p.title).replace(/\.$/, "");
      addRef(c.icon.refs, u.lang, u.citation);
      addCitation(c.icon.citations, u.citation);
    }
    if (p.subject && p.subject.kind !== "group" && !c.subjectTitles.some((s) => s.title === p.subject?.title)) c.subjectTitles.push(p.subject);
  }

  // -------------------------------------------------------------------------
  // Matching a unit against the clusters of its day
  // -------------------------------------------------------------------------

  slotScore(part: NamePart, lang: "ro" | "en", slot: Slot): number {
    const same = slot[lang];
    const other = slot[lang === "ro" ? "en" : "ro"];
    let score = 0;
    // A name in the same language says more than a transliteration: use it when there is one.
    if (same) score = personScore(part, same.part, false);
    else {
      if (other) score = Math.max(score, personScore(part, other.part, true));
      for (const alt of slot.alts) score = Math.max(score, personScore(part, alt, true));
    }
    // Short skeletons ("In", "Rim") must agree exactly.
    if (part.key.length <= 2 && !part.eq) {
      const exact = [same?.part, other?.part, ...slot.alts].some((x) => x && x.key === part.key);
      if (!exact) score = Math.min(score, 0.5);
    }
    return score;
  }

  private threshold(lang: "ro" | "en", slot: Slot): number {
    return slot[lang] ? 0.95 : 0.8;
  }

  /**
   * Finds what a unit describes among the clusters of its day. Returns the
   * clusters (in order), the slots its names landed on, and the names that
   * matched nothing.
   */
  match(u: Unit, pool: Cluster[], rules: MatchRules = {}): { clusters: Cluster[]; pairs: Array<[NamePart, Slot]>; rest: NamePart[] } {
    const p = u.parsed;
    const none = { clusters: [] as Cluster[], pairs: [] as Array<[NamePart, Slot]>, rest: p.names };
    const sameKind = (k: string): Cluster[] => pool.filter((c) => c.kind === k);
    switch (p.kind) {
      case "feast": {
        const c = pool.find((x) => x.kind === "feast" && x.feast === p.feast) ?? pool.find((x) => x.feast === p.feast && x.kind !== "forefeast" && x.kind !== "afterfeast" && x.kind !== "leavetaking");
        return c ? { ...none, clusters: [c], rest: [] } : none;
      }
      case "council": {
        const list = sameKind("council").filter((c) => !p.council || !c.council || c.council === p.council);
        return list.length === 1 && list[0] ? { ...none, clusters: [list[0]], rest: [] } : none;
      }
      case "icon": {
        const best = this.bestByScore(sameKind("icon"), (c) => iconScore(u, c));
        return best && best.score >= 1 ? { ...none, clusters: [best.item], rest: [] } : none;
      }
      case "relics_translation":
      case "relics_finding":
      case "event":
      case "glorification":
      case "synaxis":
      case "angels": {
        const kinds = p.kind === "relics_translation" || p.kind === "relics_finding" ? ["relics_translation", "relics_finding"] : [p.kind];
        const list = pool.filter((c) => kinds.includes(c.kind));
        if (p.kind === "synaxis" && p.subject && p.subject.names.length >= 2) {
          const groups = pool.filter((c) => c.kind === "group" && c.group);
          const viaNames = this.bestByScore(groups, (c) => groupNamesScore({ ...u, parsed: p.subject as ParsedTitle }, c));
          if (viaNames && viaNames.score >= 0.67) return { ...none, clusters: [viaNames.item], rest: [] };
        }
        const best = this.bestByScore(list, (c) => subjectScore(this, u, c));
        if (best && best.score >= 0.8) return { ...none, clusters: [best.item], rest: [] };
        return none;
      }
      case "group": {
        const groups = pool.filter((c) => c.kind === "group" || (c.kind === "synaxis" && c.subjectGroup));
        const best = this.bestByScore(groups, (c) => groupScore(this, u, c));
        if (best && best.score >= 1) return { ...none, clusters: [best.item], rest: [] };
        if (p.names.length >= 1) {
          const byNames = this.matchNames(u, pool, rules);
          // A group matches persons only through its leading name.
          if (byNames.pairs.length > 0) return { ...byNames, rest: [] };
        }
        return none;
      }
      case "saint":
      case "saints":
        return this.matchNames(u, pool, rules);
      default:
        return none;
    }
  }

  private bestByScore<T>(items: T[], score: (x: T) => number): { item: T; score: number } | null {
    let best: { item: T; score: number } | null = null;
    for (const item of items) {
      const s = score(item);
      if (!best || s > best.score) best = { item, score: s };
    }
    return best;
  }

  private matchNames(u: Unit, pool: Cluster[], rules: MatchRules = {}): { clusters: Cluster[]; pairs: Array<[NamePart, Slot]>; rest: NamePart[] } {
    const p = u.parsed;
    const holiness = new Set(p.holiness);
    const fits = (other: Set<HolinessType>): boolean => (rules.agree ? holinessAgrees(holiness, other) : holinessCompatible(holiness, other));
    const taken = new Set<Slot>();
    const scored: Array<{ part: NamePart; slot: Slot; cluster: Cluster; score: number }> = [];
    for (const part of p.names) {
      for (const c of pool) {
        if (!PERSON_KINDS.has(c.kind) && !(c.kind === "group" && c.slots.length > 0)) continue;
        for (const slot of c.slots) {
          if (rules.agree && !fits(slot.holiness)) continue;
          const score = this.slotScore(part, u.lang, slot) + (fits(slot.holiness) ? 0 : -0.15);
          // A second unit of the same source and day lands on a person only when it names it exactly.
          const again = slot.matched.has(`${u.source}@${mmdd(u.month, u.day)}`);
          if (score >= (again ? Math.max(1, this.threshold(u.lang, slot)) : this.threshold(u.lang, slot))) scored.push({ part, slot, cluster: c, score });
        }
      }
    }
    scored.sort((a, b) => b.score - a.score);
    const usedParts = new Set<NamePart>();
    const pairs: Array<[NamePart, Slot]> = [];
    const clusters: Cluster[] = [];
    for (const s of scored) {
      if (usedParts.has(s.part) || taken.has(s.slot)) continue;
      usedParts.add(s.part);
      taken.add(s.slot);
      pairs.push([s.part, s.slot]);
      if (!clusters.includes(s.cluster)) clusters.push(s.cluster);
    }
    // Same language, same day, same first name, and only one such saint: the same saint,
    // even if the two sources describe him differently ("Iacob al lui Zevedeu" / "Iacob, fratele…").
    for (const part of p.names) {
      if (usedParts.has(part)) continue;
      const same: Array<{ slot: Slot; cluster: Cluster }> = [];
      for (const c of pool) {
        if (!PERSON_KINDS.has(c.kind) && !(c.kind === "group" && c.slots.length > 0)) continue;
        for (const slot of c.slots) {
          const name = slot[u.lang];
          if (!name || taken.has(slot) || slot.matched.has(`${u.source}@${mmdd(u.month, u.day)}`)) continue;
          if (givenSimilarity(part, name.part) < 1) continue;
          if (!rules.anyHoliness && !fits(slot.holiness)) continue;
          if (rules.agree && namesConflict(part, name.part)) continue;
          if (rules.sameGender && part.gender && slot.gender && part.gender !== slot.gender) continue;
          same.push({ slot, cluster: c });
        }
      }
      const only = same.length === 1 ? same[0] : undefined;
      if (!only) continue;
      usedParts.add(part);
      taken.add(only.slot);
      pairs.push([part, only.slot]);
      if (!clusters.includes(only.cluster)) clusters.push(only.cluster);
    }
    // A name may be the leader of a group of the other source ("Sf. Mc. Terentie" / "Sfântul Mucenic Terentie cu cei 7 fii ai săi").
    for (const part of p.names) {
      if (usedParts.has(part)) continue;
      const groups = pool.filter(
        (c) =>
          c.kind === "group" &&
          c.group &&
          c.slots.length === 0 &&
          (!rules.agree || fits(c.group.holiness)) &&
          c.group.names.some((n) => givenSimilarity(part, n) >= 1 && !(rules.agree && namesConflict(part, n))),
      );
      const only = groups.length === 1 ? groups[0] : undefined;
      if (!only) continue;
      usedParts.add(part);
      if (!clusters.includes(only)) clusters.push(only);
    }
    // A list of names may also be one group of the other source ("Sf. Mc. In, Pin și Rim").
    if (pairs.length === 0 && clusters.length === 0 && p.names.length >= 1) {
      const groups = pool.filter((c) => c.kind === "group" && c.group && (!rules.agree || fits(c.group.holiness)));
      const best = this.bestByScore(groups, (c) => groupNamesScore(u, c));
      if (best && best.score >= 0.67) return { clusters: [best.item], pairs: [], rest: [] };
    }
    const rest = p.names.filter((n) => !usedParts.has(n));
    // Keep the order of the unit's names.
    clusters.sort((a, b) => firstIndex(a, pairs, p.names) - firstIndex(b, pairs, p.names));
    return { clusters, pairs, rest };
  }

  /** Adds what a matched unit says to the clusters and slots it describes. */
  absorb(u: Unit, result: { clusters: Cluster[]; pairs: Array<[NamePart, Slot]> }): void {
    for (const c of result.clusters) this.attach(c, u);
    const single = u.parsed.names.length === 1 && result.pairs.length === 1;
    for (const [part, slot] of result.pairs) {
      slot.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
      if (slot.existingPerson) continue;
      this.fillSlot(slot, u, part, single);
    }
  }

  /** Existing commemorations that this very source line produced in an earlier import. */
  exactFor(u: Unit): Cluster[] {
    const keys: string[] = [];
    if (u.ext.oca) keys.push(`oca:${u.ext.oca}`);
    if (u.ext.doxologia) keys.push(`doxologia:${u.ext.doxologia}`);
    if (u.source === "patriarhia") keys.push(`patriarhia:${mmdd(u.month, u.day)}|${officialTitle(u.title)}`);
    if (u.url && (u.source === "overlay" || u.source === "armenian" || u.source === "coptic")) keys.push(`url:${u.url}`);
    const day = new Set(this.candidates(u.month, u.day));
    for (const key of keys) {
      const list = (this.existing.exact.get(key) ?? []).filter((c) => u.family !== "byzantine" || day.has(c));
      if (list.length > 0) return list;
    }
    return [];
  }

  /**
   * The names of all the units of one source and day, assigned together: the
   * best pairs first, so that "George of Iberia" takes "Gheorghe Ivirul" before
   * "George the Confessor" can. A person takes a second name of the same source
   * and day only when it matches it exactly (the feast of Peter and Paul, then
   * Peter alone).
   */
  prematch(units: Unit[], pool: Cluster[]): Map<Unit, MatchResult> {
    type Candidate = { u: Unit; part: NamePart; slot: Slot; cluster: Cluster; score: number };
    const candidates: Candidate[] = [];
    for (const u of units) {
      const p = u.parsed;
      const named = p.kind === "saint" || p.kind === "saints" || (p.kind === "group" && p.names.length > 0);
      if (!named || this.exactFor(u).length > 0) continue;
      for (const part of p.names) {
        for (const c of pool) {
          if (!PERSON_KINDS.has(c.kind) && !(c.kind === "group" && c.slots.length > 0)) continue;
          for (const slot of c.slots) {
            const score = this.slotScore(part, u.lang, slot) + (holinessCompatible(new Set(p.holiness), slot.holiness) ? 0 : -0.15);
            if (score >= this.threshold(u.lang, slot)) candidates.push({ u, part, slot, cluster: c, score });
          }
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const out = new Map<Unit, MatchResult>();
    const done = new Set<NamePart>();
    const uses = new Map<Slot, number>();
    for (const x of candidates) {
      if (done.has(x.part)) continue;
      const before = (uses.get(x.slot) ?? 0) + (x.slot.matched.has(`${x.u.source}@${mmdd(x.u.month, x.u.day)}`) ? 1 : 0);
      if (before > 0 && x.score < 1.15) continue;
      const r = out.get(x.u) ?? { clusters: [], pairs: [], rest: [] };
      if (r.pairs.some(([, s]) => s === x.slot)) continue;
      done.add(x.part);
      uses.set(x.slot, (uses.get(x.slot) ?? 0) + 1);
      r.pairs.push([x.part, x.slot]);
      if (!r.clusters.includes(x.cluster)) r.clusters.push(x.cluster);
      out.set(x.u, r);
    }
    for (const [u, r] of out) {
      r.rest = u.parsed.names.filter((n) => !done.has(n));
      r.clusters.sort((a, b) => firstIndex(a, r.pairs, u.parsed.names) - firstIndex(b, r.pairs, u.parsed.names));
    }
    return out;
  }

  /** Matches a unit on its day; creates a cluster for what is left. */
  place(u: Unit, pool = this.candidates(u.month, u.day), pre?: MatchResult): Cluster[] {
    const known = this.exactFor(u);
    if (known.length > 0) {
      for (const c of known) this.attach(c, u);
      this.count(`${u.source}.known`);
      return known;
    }
    const result = pre ?? this.match(u, pool);
    if (result.clusters.length > 0) {
      this.absorb(u, result);
      this.count(`${u.source}.matched`);
      const out = [...result.clusters];
      if (result.rest.length > 0 && (u.parsed.kind === "saint" || u.parsed.kind === "saints")) {
        const extra = this.clusterFrom(u, result.rest);
        if (extra) out.push(extra);
      }
      return out;
    }
    // A glorification on the day the saints are already kept is their day ("Sf. Zabulon și Suzana" / "Glorification of Saints Zabulon and Sosanna").
    const subject = u.parsed.subject;
    if (u.parsed.kind === "glorification" && subject && (subject.kind === "saint" || subject.kind === "saints")) {
      const own: Unit = { ...u, parsed: subject };
      const r = this.match(own, pool);
      if (r.pairs.length > 0 && r.rest.length === 0) {
        this.absorb(own, r);
        this.count(`${u.source}.matched`);
        return r.clusters;
      }
    }
    const c = this.clusterFrom(u);
    if (c) this.count(`${u.source}.new`);
    return c ? [c] : [];
  }

  // -------------------------------------------------------------------------
  // Periods: forefeasts, afterfeasts, leave-takings
  // -------------------------------------------------------------------------

  period(u: Unit): Cluster | null {
    const p = u.parsed;
    if (!p.feast) return null;
    const key = `${p.kind}|${p.feast}`;
    let c = this.periods.get(key);
    if (!c) {
      const existingId = p.kind === "forefeast" ? `${p.feast}--forefeast` : p.kind === "leavetaking" ? `${p.feast}--leavetaking` : `${p.feast}--afterfeast`;
      c = this.existingByComm.get(existingId);
      if (!c) {
        c = this.base(u, p.kind as Cluster["kind"]);
        c.feast = p.feast;
        this.clusters.push(c);
      }
      this.periods.set(key, c);
    }
    if (!c.existingComm) {
      // The period starts on its first day listed by any source.
      if (c.units.length === 0 || u.month * 100 + u.day < c.month * 100 + c.day) {
        c.month = u.month;
        c.day = u.day;
      }
    }
    this.attach(c, u);
    return c;
  }

  /** Days of a period as listed by one source: first day and length. */
  static span(units: Unit[]): { month: number; day: number; days: number } | null {
    if (units.length === 0) return null;
    const days = units.map((u) => dayOfYear(u.month, u.day)).sort((a, b) => a - b);
    const first = days[0] ?? 0;
    const last = days[days.length - 1] ?? first;
    const sorted = [...units].sort((a, b) => dayOfYear(a.month, a.day) - dayOfYear(b.month, b.day));
    const u0 = sorted[0];
    return u0 ? { month: u0.month, day: u0.day, days: last - first + 1 } : null;
  }

  // -------------------------------------------------------------------------
  // Romanian calendar
  // -------------------------------------------------------------------------

  romanian(doxologia: Unit[], patriarhia: Unit[], days: Array<{ month: number; day: number }>): void {
    const byDay = (units: Unit[]): Map<string, Unit[]> => {
      const m = new Map<string, Unit[]>();
      for (const u of units) {
        const k = mmdd(u.month, u.day);
        const list = m.get(k) ?? [];
        list.push(u);
        m.set(k, list);
      }
      return m;
    };
    const doxByDay = byDay(doxologia);
    const patrByDay = byDay(patriarhia);
    const periodUnits = new Map<Cluster, Unit[]>();
    for (const { month, day } of days) {
      const key = mmdd(month, day);
      const dayClusters: Cluster[] = [];
      const doxPre = this.prematch(doxByDay.get(key) ?? [], this.candidates(month, day));
      for (const u of doxByDay.get(key) ?? []) {
        const k = u.parsed.kind;
        if (k === "movable" || k === "skip") {
          this.count(`doxologia.${k}`);
          continue;
        }
        if (k === "forefeast" || k === "afterfeast" || k === "leavetaking") {
          const c = this.period(u);
          if (c) {
            const list = periodUnits.get(c) ?? [];
            list.push(u);
            periodUnits.set(c, list);
          }
          continue;
        }
        for (const c of this.place(u, undefined, doxPre.get(u))) if (!dayClusters.includes(c)) dayClusters.push(c);
      }
      // The official lines, in their order.
      const lineOf = new Set<Cluster>();
      const patrPre = this.prematch(patrByDay.get(key) ?? [], this.candidates(month, day));
      for (const u of patrByDay.get(key) ?? []) {
        const k = u.parsed.kind;
        if (k === "movable" || k === "skip") continue;
        let clusters: Cluster[];
        if (k === "forefeast" || k === "afterfeast" || k === "leavetaking") {
          const c = this.period(u);
          clusters = c ? [c] : [];
          if (c) {
            const list = periodUnits.get(c) ?? [];
            list.push(u);
            periodUnits.set(c, list);
          }
        } else {
          clusters = this.placeOfficial(u, patrPre.get(u));
        }
        if (clusters.length === 0) continue;
        for (const c of clusters) lineOf.add(c);
        const line: LineDraft = { clusters, title: officialTitle(u.title) };
        const symbol = symbolOf(u.cross, u.color);
        if (symbol) line.symbol = symbol;
        if (k !== "forefeast" && k !== "afterfeast" && k !== "leavetaking") this.addLine("romanian", month, day, withDiffers(line, month, day));
        else this.pendingPeriodLines.push({ tradition: "romanian", line, month, day });
      }
      for (const c of dayClusters) {
        if (lineOf.has(c)) continue;
        this.addLine("romanian", month, day, withDiffers({ clusters: [c] }, month, day));
      }
    }
    this.placePeriods("romanian", periodUnits);
  }

  private readonly pendingPeriodLines: Array<{ tradition: string; line: LineDraft; month: number; day: number }> = [];

  /** Places each period once, on its first day in that tradition. */
  private placePeriods(tradition: string, periodUnits: Map<Cluster, Unit[]>): void {
    for (const [c, units] of periodUnits) {
      const span = Builder.span(units);
      if (!span) continue;
      if (!c.existingComm && (c.kind === "forefeast" || c.kind === "afterfeast")) c.durationDays = Math.max(c.durationDays ?? 1, Math.min(span.days, 40));
      const pending = this.pendingPeriodLines.find((x) => x.tradition === tradition && x.line.clusters[0] === c && x.month === span.month && x.day === span.day);
      const line: LineDraft = pending ? pending.line : { clusters: [c] };
      this.addLine(tradition, span.month, span.day, withDiffers(line, span.month, span.day));
    }
  }

  /**
   * One official item: its names are looked up among the saints of the day
   * (doxologia first); names that are not there become new saints.
   */
  private placeOfficial(u: Unit, pre?: MatchResult): Cluster[] {
    const known = this.exactFor(u);
    if (known.length > 0) {
      for (const c of known) this.attach(c, u);
      this.count("patriarhia.known");
      return known;
    }
    const pool = this.candidates(u.month, u.day);
    const p = u.parsed;
    if (p.kind === "saint" || p.kind === "saints") {
      const result = pre ?? this.match(u, pool);
      if (result.clusters.length > 0) this.absorb(u, result);
      const out = [...result.clusters];
      // Names left over: a second place ("de la Cernica și Căldărușani") is not a saint.
      const rest = result.rest.filter((n) => !isPlaceContinuation(n, p.names));
      if (rest.length > 0) {
        const extra = this.clusterFrom(u, rest);
        if (extra) out.push(extra);
      }
      this.count(result.clusters.length > 0 ? "patriarhia.matched" : "patriarhia.new");
      return out;
    }
    return this.place(u, pool, pre);
  }

  // -------------------------------------------------------------------------
  // Russian calendar (OCA) and the local lists
  // -------------------------------------------------------------------------

  russian(oca: Unit[]): void {
    const periodUnits = new Map<Cluster, Unit[]>();
    let pre = new Map<Unit, MatchResult>();
    let preDay = "";
    for (const u of oca) {
      const day = mmdd(u.month, u.day);
      if (day !== preDay) {
        preDay = day;
        pre = this.prematch(oca.filter((x) => x.month === u.month && x.day === u.day), this.candidates(u.month, u.day));
      }
      const k = u.parsed.kind;
      if (k === "movable" || k === "skip") {
        this.count(`oca.${k}`);
        continue;
      }
      if (k === "forefeast" || k === "afterfeast" || k === "leavetaking") {
        const c = this.period(u);
        if (c) {
          const list = periodUnits.get(c) ?? [];
          list.push(u);
          periodUnits.set(c, list);
        }
        continue;
      }
      const pool = this.candidates(u.month, u.day);
      const clusters = this.place(u, pool, pre.get(u));
      if (clusters.length > 0) this.addLine("russian", u.month, u.day, withDiffers({ clusters }, u.month, u.day));
    }
    this.placePeriods("russian", periodUnits);
  }

  /** Adds what the units say to the clusters of their day, without creating or placing anything. */
  enrich(units: Unit[]): void {
    for (const u of units) {
      const k = u.parsed.kind;
      if (k === "movable" || k === "skip") continue;
      const result = this.match(u, this.candidates(u.month, u.day));
      if (result.clusters.length > 0) {
        this.absorb(u, result);
        this.count(`${u.source}.${u.tradition ?? ""}.matched`);
      } else this.count(`${u.source}.${u.tradition ?? ""}.unmatched`);
    }
  }

  overlay(units: Unit[]): void {
    for (const u of units) {
      if (!u.tradition) continue;
      const k = u.parsed.kind;
      if (k === "movable" || k === "skip") continue;
      const at = this.placeListed(u);
      if (at.clusters.length > 0) this.addLine(u.tradition, at.month, at.day, withDiffers({ clusters: at.clusters }, at.month, at.day));
    }
  }

  /**
   * A line of the lists of the Julian-calendar Churches, on its Menaion date
   * first, where a bare name ("Helen of Dečani") must not take another saint
   * of the same first name. The OCA keeps some saints of the 20th century on
   * their civil day (Sf. Patriarh Tihon on 7 April, the Royal Martyrs on 17
   * July), so a line that matches nothing on its Menaion date is looked for on
   * the day listed.
   */
  private placeListed(u: Unit): { clusters: Cluster[]; month: number; day: number } {
    const here = { month: u.month, day: u.day };
    const pool = this.candidates(u.month, u.day);
    const result = this.match(u, pool, { agree: true, sameGender: true });
    if (!u.listed || this.exactFor(u).length > 0) return { clusters: this.place(u, pool, result), ...here };
    const civil: Unit = { ...u, month: u.listed.month, day: u.listed.day };
    delete civil.leapDay;
    if (this.exactFor(civil).length > 0) return { clusters: this.place(civil), ...u.listed };
    if (result.clusters.length === 0) {
      const late = this.match(civil, this.candidates(civil.month, civil.day), { anyHoliness: u.holinessFromList === true, sameGender: true });
      if (late.clusters.length > 0 && late.rest.length === 0) return { clusters: this.place(civil, undefined, late), ...u.listed };
    }
    return { clusters: this.place(u, pool, result), ...here };
  }

  /**
   * The shared Byzantine Menaion: what both the Romanian and the Russian
   * calendars hold goes to the calendars of the Ecumenical Patriarchate and of
   * the Serbian Church, in the order of the Russian lines.
   */
  shared(traditions: string[]): void {
    const russian = this.lines.get("russian");
    if (!russian) return;
    const inRomanian = (c: Cluster): boolean => this.isPlaced("romanian", c) && c.units.some((u) => u.source === "doxologia" || u.source === "patriarhia");
    const inRussian = (c: Cluster): boolean => c.units.some((u) => u.source === "oca") || (c.existingComm !== undefined && this.isPlaced("russian", c));
    const dates = [...russian.keys()].sort();
    for (const date of dates) {
      const [month, day] = date.split("-").map(Number);
      for (const line of russian.get(date) ?? []) {
        const clusters = line.clusters.filter((c) => inRomanian(c) && inRussian(c));
        if (clusters.length === 0) continue;
        for (const t of traditions) this.addLine(t, month ?? 0, day ?? 0, { clusters, confidence: "low", ...(line.differs ? { differs: true } : {}) });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Coptic and Armenian
  // -------------------------------------------------------------------------

  coptic(units: Unit[]): void {
    const byAnchor = new Map<string, Cluster>();
    for (const c of this.existing.clusters.values()) if (c.family === "coptic" && c.ext.copticchurch) byAnchor.set(c.ext.copticchurch, c);
    for (const u of units) {
      const k = u.parsed.kind;
      if (k === "movable" || k === "skip") {
        this.count(`coptic.${k}`);
        // A Coptic line we cannot read is still a commemoration of the day.
        u.parsed = { ...u.parsed, kind: "event" };
      }
      oneSubject(u);
      const known = byAnchor.get(u.ext.copticchurch ?? "");
      if (known) {
        this.attach(known, u);
        if (!this.isPlaced("coptic", known)) this.addLine("coptic", u.month, u.day, { clusters: [known] });
        continue;
      }
      const c = this.clusterFrom(u);
      if (!c) continue;
      this.linkUniversal(c, u);
      this.count("coptic.new");
      this.addLine("coptic", u.month, u.day, { clusters: [c] });
    }
  }

  private universalSlots: Slot[] | null = null;

  /**
   * The Theotokos, the archangels, the apostles, the prophets and the Forerunner
   * are the same persons in every family of Churches: a Coptic or Armenian line
   * about them points to the person already known from the Byzantine calendars,
   * when its name designates exactly one.
   */
  private linkUniversal(c: Cluster, u: Unit): void {
    const title = u.title;
    const theotokos = this.existing.persons.get("theotokos");
    if (theotokos && /\b(Theotokos|Virgin (?:St\.? )?Mary|St\.? Mary|Mother of God|Holy Virgin|the Virgin)\b/i.test(title)) {
      c.kind = "event";
      c.slots = [];
      c.subjectSlots = [theotokos];
      c.titles.en ??= title.replace(/\.$/, "").trim();
      return;
    }
    const angel = /\bArchangel (Michael|Gabriel|Raphael|Suriel|Uriel)\b/i.exec(title)?.[1];
    if (angel) {
      const name = parseEn(`Archangel ${angel}`).names[0];
      const known = name ? this.knownAngel(name, "en") : undefined;
      const own = c.slots.find((s) => s.angel);
      const slot = known ?? own;
      if (slot) {
        if (!known) this.angels.push(slot);
        c.kind = "angels";
        c.slots = [slot];
        c.subjectSlots = [];
        c.titles.en ??= title.replace(/\.$/, "").trim();
        return;
      }
    }
    if (!this.universalSlots) {
      const all = new Set<Slot>(this.existing.persons.values());
      for (const x of this.clusters) if (x.family === "byzantine") for (const s of [...x.slots, ...x.subjectSlots]) all.add(s);
      this.universalSlots = [...all].filter((s) => s.family === "byzantine" && (s.holiness.has("apostle") || s.holiness.has("prophet") || s.holiness.has("evangelist")));
    }
    const replace = (list: Slot[]): Slot[] =>
      list.map((slot) => {
        const universal = slot.holiness.has("apostle") || slot.holiness.has("prophet") || slot.holiness.has("evangelist") || /\b(the Apostle|the Prophet|the Evangelist|the Baptist|the Forerunner)\b/i.test(slot.en?.display ?? "");
        const part = slot.en?.part;
        if (!universal || !part) return slot;
        const found = (this.universalSlots ?? []).filter((s) => {
          const other = s.en?.part ?? s.ro?.part;
          return other !== undefined && givenSimilarity(part, other) >= 0.9 && holinessCompatible(slot.holiness, s.holiness);
        });
        const target = found.length === 1 ? found[0] : /\bBaptist|Forerunner\b/i.test(slot.en?.display ?? "") ? (this.universalSlots ?? []).find((s) => /botez|baptist/i.test(`${s.ro?.display ?? ""} ${s.en?.display ?? ""}`)) : undefined;
        if (!target) return slot;
        for (const x of slot.citations) addCitation(target.citations, x);
        return target;
      });
    c.slots = replace(c.slots);
    c.subjectSlots = replace(c.subjectSlots);
  }

  armenian(units: Unit[]): void {
    const byUrl = new Map<string, Cluster>();
    for (const c of this.existing.clusters.values()) {
      const rec = this.existing.dataset.records.get("commemorations")?.get(c.existingComm ?? "");
      for (const s of rec?.sources ?? []) if (s.url) byUrl.set(s.url as string, c);
    }
    for (const u of units) {
      // Sundays, Lenten days, eves and the New Year belong to the movable cycle, not to the saints.
      if (u.parsed.kind === "movable" || ARMENIAN_SKIP.test(u.title)) {
        this.count("armenian.movable");
        continue;
      }
      if (u.parsed.kind === "skip") u.parsed = { ...u.parsed, kind: "event" };
      oneSubject(u);
      const known = byUrl.get(u.url ?? "");
      if (known) {
        this.attach(known, u);
        continue;
      }
      const c = this.clusterFrom(u);
      if (!c) continue;
      this.linkUniversal(c, u);
      c.note = `În calendarul armenianchurch.ge apare în luna ${monthName(u.armenianMonth ?? "")}; ziua se stabilește după regulile calendarului armean (de completat).`;
      this.count("armenian.new");
      this.addMovable("armenian", { clusters: [c] });
    }
  }
}

const ARMENIAN_SKIP = /^(?:New Year|About |Eve of|Median day|Holy (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)|Second Palm Sunday|Palm Sunday|Raising of Lazarus|Feast of (?:Pentecost|Ascension|the Holy Resurrection|the Holy Nativity)|Tiarn|Great Lent|Eve |Fast of|Candlemas)/i;

/**
 * Coptic and Armenian lines that name several saints are kept as one group,
 * named as the source names it: their lists are too irregular to split safely.
 */
function oneSubject(u: Unit): void {
  if (u.parsed.kind === "saints") u.parsed = { ...u.parsed, kind: "group", names: u.parsed.names };
}

/** A name distinctive enough to recognise the saint on another day: first name plus epithets or places. */
function identityKey(u: Unit, part: NamePart): string | null {
  const extra = extraKeys(part);
  if (extra.length === 0) return null;
  return `${u.family}|${u.lang}|${part.eq ?? part.key}|${numeralOf(part) ?? ""}|${[...new Set(extra)].sort().join(",")}`;
}

/** "a Maicii Domnului din Tinos" → "Icoana Maicii Domnului din Tinos". */
function roIconName(rest: string): string {
  return `Icoana ${rest.trim().replace(/^a\s+/, "")}`;
}

function withDiffers(line: LineDraft, month: number, day: number): LineDraft {
  const differs = line.clusters.some((c) => c.month > 0 && (c.month !== month || c.day !== day) && !(c.leapDay && month === 2 && day === 28));
  return differs ? { ...line, differs: true } : line;
}

function firstIndex(c: Cluster, pairs: Array<[NamePart, Slot]>, names: NamePart[]): number {
  let best = Number.MAX_SAFE_INTEGER;
  for (const [part, slot] of pairs) if (c.slots.includes(slot)) best = Math.min(best, names.indexOf(part));
  return best;
}


function dayOfYear(month: number, day: number): number {
  const cumulative = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  return (cumulative[month - 1] ?? 0) + day;
}

/** "Sf. Cuv. Ioan Casian şi Gherman, din Dobrogea" as printed, with day notes removed. */
function officialTitle(text: string): string {
  return text.replace(/\s*\((?:[^()]*\b(?:Har[țţ]i|Post|aliturgic|Tedeum|Anul Nou|Dezlegare|Canonul Mare|Pomenirea celor adormi|S[âa]mb[ăa]ta|Duminica|[ÎI]nceputul|Ajunul|L[ăa]satul|Denia|Mo[șş]ii|Ziua|Lit\.|Liturghia|zi de post)[^()]*)\)\s*$/i, "").replace(/[;,]\s*$/, "").trim();
}

/** "Gheorghe de la Cernica și Căldărușani": the second name is a place. */
function isPlaceContinuation(n: NamePart, all: NamePart[]): boolean {
  const i = all.indexOf(n);
  const prev = i > 0 ? all[i - 1] : undefined;
  if (!prev) return false;
  return /\b(?:din|de la|de|al|a)\s+[A-ZĂÂÎȘȚ][^,]*$/.test(prev.text) && /^[A-ZĂÂÎȘȚ][\wăâîșț-]*$/.test(n.text) && !n.gender;
}

function monthName(month: string): string {
  const ro: Record<string, string> = {
    january: "ianuarie",
    february: "februarie",
    march: "martie",
    april: "aprilie",
    may: "mai",
    june: "iunie",
    july: "iulie",
    august: "august",
    september: "septembrie",
    october: "octombrie",
    november: "noiembrie",
    december: "decembrie",
  };
  return ro[month] ?? month;
}

function iconScore(u: Unit, c: Cluster): number {
  const mine = iconWords(u.parsed.icon ?? u.parsed.title);
  const theirs = new Set([...iconWords(c.icon?.ro ?? ""), ...iconWords(c.icon?.en ?? ""), ...iconWords(c.titles.ro ?? ""), ...iconWords(c.titles.en ?? "")]);
  let n = 0;
  for (const w of mine) if (theirs.has(w)) n++;
  return n;
}

const ICON_STOP = new Set(["icoana", "icoanei", "icoanele", "maicii", "domnului", "sfintei", "icon", "mother", "god", "theotokos", "most", "holy", "the", "cinstirea", "din", "de", "la", "of", "cea", "care", "a", "si", "and", "aducerea", "translation", "to", "in"]);

function iconWords(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.split(/[\s,„”"“()«»–-]+/)) {
    const f = w
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    if (f.length < 3 || ICON_STOP.has(f)) continue;
    out.add(f.slice(0, 5));
  }
  return out;
}

function subjectScore(b: Builder, u: Unit, c: Cluster): number {
  const subject = u.parsed.subject;
  const parts = subject?.names ?? [];
  let best = 0;
  for (const part of parts) {
    for (const slot of [...c.subjectSlots, ...c.slots]) best = Math.max(best, b.slotScore(part, u.lang, slot));
    for (const t of c.subjectTitles) for (const other of t.names) best = Math.max(best, personScoreAny(part, other));
  }
  // A synaxis of a group ("Soborul Sfinților 70 de Apostoli") compares as a group.
  if (subject?.kind === "group" && c.subjectGroup) {
    if (subject.count && c.subjectGroup.count === subject.count) best = Math.max(best, 1);
    best = Math.max(best, keyOverlap(subject.title, c.subjectGroup.ro ?? c.subjectGroup.en ?? "") >= 1 ? 0.8 : 0);
  }
  if (u.parsed.kind === "angels") best = Math.max(best, 0.8);
  // "Înnoirea Constantinopolului" / "Founding of Constantinople": no saint, the same words.
  if (parts.length === 0 && c.subjectSlots.length === 0 && c.subjectTitles.length === 0 && !c.subjectGroup) {
    if (keyOverlap(u.parsed.title, `${c.titles.ro ?? ""} ${c.titles.en ?? ""}`) >= 1) best = Math.max(best, 0.8);
  }
  return best;
}

function personScoreAny(a: NamePart, b: NamePart): number {
  return Math.max(givenSimilarity(a, b) >= 0.9 ? 0.85 : 0, 0);
}

function keyOverlap(a: string, b: string): number {
  const ka = new Set(extraKeys({ text: `x ${a}`, given: "x", key: "x", extra: [] }));
  let n = 0;
  for (const k of extraKeys({ text: `x ${b}`, given: "x", key: "x", extra: [] })) if (ka.has(k)) n++;
  return n;
}

function groupScore(b: Builder, u: Unit, c: Cluster): number {
  const p = u.parsed;
  const g = c.group ?? c.subjectGroup;
  if (!g) return 0;
  let score = 0;
  if (p.count && g.count) score += p.count === g.count ? 1 : -1;
  const overlap = keyOverlap(p.title, [g.ro, g.en].filter(Boolean).join(" "));
  score += Math.min(overlap, 2) * 0.5;
  score += groupNamesScore(u, c);
  void b;
  return score;
}

/** Share of the unit's names found in the group's names. */
function groupNamesScore(u: Unit, c: Cluster): number {
  const names = u.parsed.names;
  const g = c.group;
  if (!g || names.length === 0 || g.names.length === 0) return 0;
  let n = 0;
  for (const part of names) if (g.names.some((x) => givenSimilarity(part, x) >= 0.8)) n++;
  return n / names.length;
}

