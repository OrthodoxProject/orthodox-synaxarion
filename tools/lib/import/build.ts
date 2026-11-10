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
  gendersDiffer,
  holinessAgrees,
  holinessCompatible,
  nameAgreement,
  namesConflict,
  newSlot,
  numeralOf,
  personScore,
  placeKeys,
  withListPlace,
  type Cluster,
  type GroupSubject,
  type Slot,
  type SlotName,
} from "./cluster.ts";
import type { Existing, ExistingLine } from "./existing.ts";
import type { HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { parseEn } from "./en.ts";
import { fold, givenSimilarity, levenshtein, nameSimilarity } from "./names.ts";
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

/** Commemorations of a saint other than his repose. */
const SAINT_DAYS = new Set(["relics_translation", "relics_finding", "glorification", "event"]);

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
    // The same full name on another day ("Antipa de la Calapodești", "Niceta de Remesiana") is the same saint (see sameSaint).
    const key = identityKey(u, part);
    const same = key ? this.identity.get(key) : undefined;
    if (same && sameSaint(part, new Set(u.parsed.holiness), same[u.lang]?.part, same.holiness)) {
      this.fillSlot(same, u, part, single);
      same.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
      return same;
    }
    // A saint of the lists that the calendars keep on another day (see placeListed).
    const listed = single ? this.listedSaints.get(u) : undefined;
    if (listed) {
      if (!listed.existingPerson) this.fillSlot(listed, u, part, single);
      listed.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
      return listed;
    }
    const slot = newSlot(u.family);
    this.fillSlot(slot, u, part, single);
    slot.matched.add(`${u.source}@${mmdd(u.month, u.day)}`);
    if (u.ext.doxologia && single) this.doxologiaSlots.set(u.ext.doxologia, slot);
    if (key) this.identity.set(key, slot);
    return slot;
  }

  /** The saints that list lines name on days on which no other line keeps them (see placeListed). */
  private readonly listedSaints = new Map<Unit, Slot>();

  /**
   * The saint of a list line that matched nothing on its day: the one saint of the family with the same first name
   * and the same place. The Russian list keeps St John of Kronstadt on 19 October as well ("Righteous John,
   * Wonderworker of Kronstadt"; his repose is on 20 December), and St Herman of Alaska on 12 December ("St Herman,
   * Wonderworker of Alaska"; the OCA keeps him on 13 December). "The New" tells a saint from an older one of the
   * same name and place: "New Martyr John of Epirus" (1814), on 23 September, is not "New Martyr John the New of
   * Epirus" (of Ioannina, 1526), kept on 18 April.
   */
  private keptElsewhere(u: Unit, part: NamePart): Slot | undefined {
    const places = placeKeys(part);
    if (places.length === 0) return undefined;
    const holiness = new Set(u.parsed.holiness);
    const isNew = extraKeys(part).includes("=new");
    const found = new Set<Slot>();
    const consider = (slot: Slot): void => {
      if (slot.family !== u.family || slot.angel || found.has(slot) || !holinessAgrees(holiness, slot.holiness)) return;
      for (const name of [slot.en?.part, slot.ro?.part, ...slot.alts]) {
        if (!name || givenSimilarity(part, name) < 1 || gendersDiffer(part, name) || namesConflict(part, name)) continue;
        if (extraKeys(name).includes("=new") !== isNew) continue;
        const own = placeKeys(name);
        if (!places.some((x) => own.some((y) => x === y || nameSimilarity(x, y) >= 0.75))) continue;
        found.add(slot);
        return;
      }
    };
    for (const slot of this.existing.persons.values()) consider(slot);
    for (const c of this.clusters) for (const slot of c.slots) consider(slot);
    return found.size === 1 ? [...found][0] : undefined;
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
      const listed = withListPlace(part, p.names);
      if (listed !== part) (slot[u.lang] as NonNullable<Slot["ro"]>).listed = listed;
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

  /** How well a name designates a person; `listed` compares the person's names with the place that closes their list. */
  slotScore(part: NamePart, lang: "ro" | "en", slot: Slot, listed = false): number {
    const same = slot[lang];
    const other = slot[lang === "ro" ? "en" : "ro"];
    const nameOf = (n: SlotName): NamePart => (listed ? (n.listed ?? n.part) : n.part);
    let score = 0;
    // A name in the same language says more than a transliteration: use it when there is one.
    if (same) score = personScore(part, nameOf(same), false);
    else {
      if (other) score = Math.max(score, personScore(part, nameOf(other), true));
      for (const alt of slot.alts) score = Math.max(score, personScore(part, alt, true));
    }
    // Short skeletons ("In", "Rim") must agree exactly.
    if (part.key.length <= 2 && !part.eq) {
      const exact = [same?.part, other?.part, ...slot.alts].some((x) => x && x.key === part.key);
      if (!exact) score = Math.min(score, 0.5);
    }
    return score;
  }

  /**
   * Whether a name of a second line of a source names exactly the person that another line of the same source and day
   * already named (see namesExactly): compared with the person's name in that language, with the place that closes its
   * list; a person named in the other language only is not named exactly.
   */
  namedExactly(part: NamePart, lang: "ro" | "en", slot: Slot, other?: NamePart): boolean {
    const same = slot[lang];
    const name = other ?? (same ? (same.listed ?? same.part) : undefined);
    return name !== undefined && namesExactly(part, name);
  }

  /** How much a name agrees with the names of a person besides the score (see nameAgreement), compared as slotScore compares them. */
  slotAgreement(part: NamePart, lang: "ro" | "en", slot: Slot): number {
    const same = slot[lang];
    const names = same ? [same.part] : [slot[lang === "ro" ? "en" : "ro"]?.part, ...slot.alts];
    let best: number | undefined;
    for (const name of names) if (name) best = Math.max(best ?? -Infinity, nameAgreement(part, name));
    return best ?? 0;
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
    const scored: Array<{ part: NamePart; slot: Slot; cluster: Cluster; score: number; agreement: number }> = [];
    for (const part of p.names) {
      for (const c of pool) {
        if (!PERSON_KINDS.has(c.kind) && !(c.kind === "group" && c.slots.length > 0)) continue;
        for (const slot of c.slots) {
          if (rules.agree && !fits(slot.holiness)) continue;
          // A second unit of the same source and day lands on a person only when it names it exactly (see namedExactly),
          // and a group's unit never does: the group is another commemoration ("Paul", one of St Luchilian's youths, is not "Sfânta Muceniță Paula fecioara").
          const again = slot.matched.has(`${u.source}@${mmdd(u.month, u.day)}`);
          if (again && (p.kind === "group" || !this.namedExactly(withListPlace(part, p.names), u.lang, slot))) continue;
          // Exactly means with the places that close the two lists: "Sergius of Paphlagonia" is not the Sergius of
          // "Sergius and Herman, Wonderworkers of Valaam", whom the OCA lists the same day.
          const own = again ? this.slotScore(withListPlace(part, p.names), u.lang, slot, true) : this.slotScore(part, u.lang, slot);
          const score = own + (fits(slot.holiness) ? 0 : -0.15);
          if (score >= (again ? Math.max(1, this.threshold(u.lang, slot)) : this.threshold(u.lang, slot))) scored.push({ part, slot, cluster: c, score, agreement: this.slotAgreement(part, u.lang, slot) });
        }
      }
    }
    scored.sort(bestFirst);
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
          if (givenSimilarity(part, name.part) < 1 || gendersDiffer(part, name.part)) continue;
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
    // A name may be the leader of a group of the other source.
    const leaders = new Map<Cluster, NamePart>();
    for (const part of p.names) {
      if (usedParts.has(part)) continue;
      const only = this.ledGroup(u, part, pool, rules);
      if (!only) continue;
      usedParts.add(part);
      if (!clusters.includes(only)) clusters.push(only);
      if (!leaders.has(only)) leaders.set(only, part);
    }
    // A list of names may also be one group of the other source ("Sf. Mc. In, Pin și Rim").
    if (pairs.length === 0 && clusters.length === 0 && p.names.length >= 1) {
      const groups = pool.filter((c) => c.kind === "group" && c.group && (!rules.agree || fits(c.group.holiness)) && !sameSourceDescribes(c, u));
      const best = this.bestByScore(groups, (c) => groupNamesScore(u, c));
      if (best && best.score >= 0.67) return { clusters: [best.item], pairs: [], rest: [] };
    }
    const rest = p.names.filter((n) => !usedParts.has(n));
    // Keep the order of the unit's names.
    clusters.sort((a, b) => firstIndex(a, pairs, p.names, leaders) - firstIndex(b, pairs, p.names, leaders));
    return { clusters, pairs, rest };
  }

  /**
   * The group of the other source that a name leads or belongs to ("Sf. Mc.
   * Terentie" / "Sfântul Mucenic Terentie cu cei 7 fii ai săi", "Ipatie" /
   * "… și cei împreună cu el patru tineri: Ipatie, Paul, Dionisie și
   * Claudie"): the only group of the day without named members that has a
   * member of that first name. A group that another line of the same source
   * and day already describes is another commemoration ("Sfânta Muceniță
   * Paula fecioara" is not that group's Paul).
   */
  private ledGroup(u: Unit, part: NamePart, pool: Cluster[], rules: MatchRules = {}): Cluster | undefined {
    const holiness = new Set(u.parsed.holiness);
    const groups = pool.filter(
      (c) =>
        c.kind === "group" &&
        c.group &&
        c.slots.length === 0 &&
        !sameSourceDescribes(c, u) &&
        (!rules.agree || holinessAgrees(holiness, c.group.holiness)) &&
        c.group.names.some((n) => givenSimilarity(part, n) >= 1 && !(rules.agree && namesConflict(part, n))),
    );
    return groups.length === 1 ? groups[0] : undefined;
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
   * and day only when it names him exactly (the feast of Peter and Paul, then
   * Peter alone; see namesExactly): "Martyr Phokas the Gardener of Sinope" is
   * not "Hieromartyr Phocas, Bishop of Sinope" (OCA, 22 September).
   */
  prematch(units: Unit[], pool: Cluster[]): Map<Unit, MatchResult> {
    type Candidate = { u: Unit; part: NamePart; slot: Slot; cluster: Cluster; score: number; agreement: number };
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
            if (score >= this.threshold(u.lang, slot)) candidates.push({ u, part, slot, cluster: c, score, agreement: this.slotAgreement(part, u.lang, slot) });
          }
        }
      }
    }
    candidates.sort(bestFirst);
    const out = new Map<Unit, MatchResult>();
    const done = new Set<NamePart>();
    const uses = new Map<Slot, number>();
    /** The name that a unit of this source gave each person, with the place that closes its list. */
    const named = new Map<Slot, NamePart>();
    for (const x of candidates) {
      if (done.has(x.part)) continue;
      const own = withListPlace(x.part, x.u.parsed.names);
      const before = (uses.get(x.slot) ?? 0) + (x.slot.matched.has(`${x.u.source}@${mmdd(x.u.month, x.u.day)}`) ? 1 : 0);
      // As in matchNames, a group's unit never takes a person that its source already named that day.
      if (before > 0 && (x.u.parsed.kind === "group" || !this.namedExactly(own, x.u.lang, x.slot, named.get(x.slot)))) continue;
      const r = out.get(x.u) ?? { clusters: [], pairs: [], rest: [] };
      if (r.pairs.some(([, s]) => s === x.slot)) continue;
      done.add(x.part);
      named.set(x.slot, named.get(x.slot) ?? own);
      uses.set(x.slot, (uses.get(x.slot) ?? 0) + 1);
      r.pairs.push([x.part, x.slot]);
      if (!r.clusters.includes(x.cluster)) r.clusters.push(x.cluster);
      out.set(x.u, r);
    }
    for (const [u, part, slot, cluster] of this.seeAndPlace(units, pool, done, uses)) {
      done.add(part);
      uses.set(slot, (uses.get(slot) ?? 0) + 1);
      const r = out.get(u) ?? { clusters: [], pairs: [], rest: [] };
      r.pairs.push([part, slot]);
      if (!r.clusters.includes(cluster)) r.clusters.push(cluster);
      out.set(u, r);
    }
    for (const [u, r] of out) {
      // A name left over may still lead a group of the other source, as in match() ("Sf. Mc. Terentie, soția sa, Neonila și cei 7 fii").
      const leaders = new Map<Cluster, NamePart>();
      for (const part of u.parsed.names) {
        if (done.has(part)) continue;
        const group = this.ledGroup(u, part, pool);
        if (!group) continue;
        done.add(part);
        if (!r.clusters.includes(group)) r.clusters.push(group);
        if (!leaders.has(group)) leaders.set(group, part);
      }
      r.rest = u.parsed.names.filter((n) => !done.has(n));
      r.clusters.sort((a, b) => firstIndex(a, r.pairs, u.parsed.names, leaders) - firstIndex(b, r.pairs, u.parsed.names, leaders));
    }
    return out;
  }

  /**
   * Across languages, a hierarch whom one calendar names by his see and the other by the place where he lived is one
   * saint when he is the only one of his name that day in each: "Saint Nectarius Kephalas, Metropolitan of
   * Pentapolis" (OCA) is "Sf. Ier. Nectarie de la Eghina" (doxologia, the official calendar) on 9 November. The
   * first names must be the same in the table of equivalents; the see stands for neither a place nor an epithet of
   * the other name, so the two names score as two saints. Returns the pairs that no score made.
   */
  private seeAndPlace(units: Unit[], pool: Cluster[], done: Set<NamePart>, uses: Map<Slot, number>): Array<[Unit, NamePart, Slot, Cluster]> {
    const parts = units
      .filter((u) => (u.parsed.kind === "saint" || u.parsed.kind === "saints") && this.exactFor(u).length === 0)
      .flatMap((u) => u.parsed.names.map((part) => ({ u, part })));
    const out: Array<[Unit, NamePart, Slot, Cluster]> = [];
    for (const { u, part } of parts) {
      if (done.has(part) || !part.eq || parts.filter((x) => x.part.eq === part.eq).length !== 1) continue;
      const named: Array<{ slot: Slot; cluster: Cluster }> = [];
      for (const c of pool) {
        if (!PERSON_KINDS.has(c.kind)) continue;
        for (const slot of c.slots) if ([slot.ro, slot.en].some((n) => n?.part.eq === part.eq) && !named.some((x) => x.slot === slot)) named.push({ slot, cluster: c });
      }
      const only = named.length === 1 ? named[0] : undefined;
      const name = only?.slot[u.lang === "ro" ? "en" : "ro"]?.part;
      if (!only || !name || only.slot[u.lang] || uses.has(only.slot) || only.slot.matched.has(`${u.source}@${mmdd(u.month, u.day)}`)) continue;
      const hierarch = (holiness: Iterable<HolinessType>, n: NamePart): boolean => [...holiness].includes("hierarch") || hasSee(n);
      // Two sees are two hierarchs: "Sfântul Clement, Arhiepiscopul Ohridei" is not "Hieromartyr Clement, Pope of Rome" (25 November).
      if (!hierarch(u.parsed.holiness, part) || !hierarch(only.slot.holiness, name) || hasSee(part) === hasSee(name)) continue;
      if (gendersDiffer(part, name) || namesConflictByNumber(part, name)) continue;
      out.push([u, part, only.slot, only.cluster]);
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
   * of the same first name. A saint that the Menaion date keeps through his
   * relics or his glorification, not through a line of his own, is kept that
   * way (see saintsOtherDay). The OCA keeps some saints of the 20th century on
   * their civil day (Sf. Patriarh Tihon on 7 April, the Royal Martyrs on 17
   * July), so a line that matches nothing on its Menaion date is looked for on
   * the day listed. A line that matches nothing on either day names a saint
   * the calendars keep on another day, or on that day under another name (see
   * keptElsewhere): on its Menaion date it is then a commemoration of that
   * saint, or the one that keeps him that day.
   */
  private placeListed(u: Unit): { clusters: Cluster[]; month: number; day: number } {
    const here = { month: u.month, day: u.day };
    const pool = this.candidates(u.month, u.day);
    const named = this.match(u, pool, { agree: true, sameGender: true });
    const own = named.clusters.length === 0 ? this.saintsOtherDay(u, pool) : undefined;
    const result: MatchResult = own ? { clusters: [own], pairs: [], rest: [] } : named;
    if (!u.listed || this.exactFor(u).length > 0) return { clusters: this.place(u, pool, result), ...here };
    const civil: Unit = { ...u, month: u.listed.month, day: u.listed.day };
    delete civil.leapDay;
    if (this.exactFor(civil).length > 0) return { clusters: this.place(civil), ...u.listed };
    if (result.clusters.length === 0) {
      const late = this.match(civil, this.candidates(civil.month, civil.day), { anyHoliness: u.holinessFromList === true, sameGender: true });
      if (late.clusters.length > 0 && late.rest.length === 0) return { clusters: this.place(civil, undefined, late), ...u.listed };
      const part = u.parsed.names.length === 1 && (u.parsed.kind === "saint" || u.parsed.kind === "saints") ? u.parsed.names[0] : undefined;
      const saint = part ? this.keptElsewhere(u, part) : undefined;
      if (part && saint) {
        // "Basil of Ostrog" (the Serbian list) is the OCA's "Saint Basil, Bishop of Zakholmsk", kept the same day.
        const today = pool.find((c) => (PERSON_KINDS.has(c.kind) || c.kind === "group") && c.slots.includes(saint));
        if (today) return { clusters: this.place(u, pool, { clusters: [today], pairs: [[part, saint]], rest: [] }), ...here };
        this.listedSaints.set(u, saint);
      }
    }
    return { clusters: this.place(u, pool, result), ...here };
  }

  /**
   * The one commemoration of the day, other than a saint's repose, whose saint a
   * list names by more than a first name: the Russian list keeps "Blessed
   * Igor-George, tonsured Gabriel, great prince of Chernigov and Kiev" on 5
   * June, the day of the translation of his relics; his repose is on 19
   * September. The saint is read from the commemoration's title.
   */
  private saintsOtherDay(u: Unit, pool: Cluster[]): Cluster | undefined {
    const p = u.parsed;
    const part = p.names.length === 1 ? p.names[0] : undefined;
    if (!part || (p.kind !== "saint" && p.kind !== "saints") || u.lang !== "en") return undefined;
    const holiness = new Set(p.holiness);
    const found = pool.filter((c) => {
      const title = SAINT_DAYS.has(c.kind) ? c.titles.en : undefined;
      const subject = title ? parseEn(title).subject : undefined;
      if (!subject || (subject.kind !== "saint" && subject.kind !== "saints") || !holinessAgrees(holiness, new Set(subject.holiness))) return false;
      return subject.names.some((n) => givenSimilarity(part, n) >= 1 && personScore(part, n, false) >= 1.2 && !namesConflict(part, n));
    });
    return found.length === 1 ? found[0] : undefined;
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
    // A line may hold several commemorations ("The Martyrdom of St. Timothy and the Relocation of the Body of St. Theodore"): all keep its anchor.
    const byAnchor = new Map<string, Cluster[]>();
    for (const c of this.existing.clusters.values()) {
      if (c.family !== "coptic" || !c.ext.copticchurch) continue;
      byAnchor.set(c.ext.copticchurch, [...(byAnchor.get(c.ext.copticchurch) ?? []), c]);
    }
    for (const u of units) {
      const k = u.parsed.kind;
      if (k === "movable" || k === "skip") {
        this.count(`coptic.${k}`);
        // A Coptic line we cannot read is still a commemoration of the day.
        u.parsed = { ...u.parsed, kind: "event" };
      }
      oneSubject(u);
      const known = byAnchor.get(u.ext.copticchurch ?? "") ?? [];
      if (known.length > 0) {
        for (const c of known) this.attach(c, u);
        this.addLine("coptic", u.month, u.day, { clusters: known });
        continue;
      }
      const c = this.clusterFrom(u);
      if (!c) continue;
      this.linkUniversal(c, u);
      const clusters = [c];
      (u.parsed.also ?? []).forEach((part, i) => {
        const other: Unit = { ...u, uid: `${u.uid}+${i + 1}`, parsed: part };
        // The Arabic title names the whole line.
        delete other.arTitle;
        oneSubject(other);
        const extra = this.clusterFrom(other);
        if (!extra) return;
        // "and the Relocation of His Holy Relics": the saint of the line.
        if (part.ofLine) {
          if (c.slots.length > 0) extra.subjectSlots = [...c.slots];
          else if (c.group) extra.subjectGroup = c.group;
        } else this.linkUniversal(extra, other);
        clusters.push(extra);
      });
      this.count("coptic.new");
      this.addLine("coptic", u.month, u.day, { clusters });
    }
  }

  private universalSlots: Slot[] | null = null;

  /** The apostles, prophets and evangelists already known, and those of the Byzantine calendars read now. */
  private universal(): Slot[] {
    if (!this.universalSlots) {
      const all = new Set<Slot>(this.existing.persons.values());
      for (const x of this.clusters) if (x.family === "byzantine") for (const s of [...x.slots, ...x.subjectSlots]) all.add(s);
      this.universalSlots = [...all].filter((s) => (s.existingPerson !== undefined || s.family === "byzantine") && (s.holiness.has("apostle") || s.holiness.has("prophet") || s.holiness.has("evangelist")));
    }
    return this.universalSlots;
  }

  /**
   * The person of the Byzantine calendars a Coptic or Armenian name designates:
   * St John the Baptist, or the only apostle, prophet or evangelist of that
   * name (of a compatible kind of holiness, when `holinessMustFit`), or of
   * that name and epithet ("St. John the Evangelist").
   */
  private universalFor(part: NamePart, holiness: Set<HolinessType>, text: string, holinessMustFit: boolean): Slot | undefined {
    // Many Johns are apostles or prophets: "the Baptist" names one.
    if (namesForerunner(text)) {
      const john = this.universal().find((s) => s.personId === "john-the-baptist");
      if (john) return john;
    }
    const universal = holiness.has("apostle") || holiness.has("prophet") || holiness.has("evangelist") || /\b(?:the Apostle|the Prophet|the Evangelist)\b/i.test(text);
    if (!universal) return undefined;
    const found = this.universal().filter((s) => {
      const other = s.en?.part ?? s.ro?.part;
      return other !== undefined && givenSimilarity(part, other) >= 0.9 && (!holinessMustFit || holinessCompatible(holiness, s.holiness));
    });
    if (found.length === 1) return found[0];
    const epithets = (["apostle", "prophet", "evangelist"] as const).filter((h) => new RegExp(`\\bthe ${h}\\b`, "i").test(text));
    const named = epithets.length > 0 ? found.filter((s) => epithets.every((h) => s.holiness.has(h))) : [];
    return named.length === 1 ? named[0] : undefined;
  }

  /**
   * The Theotokos, the archangels, the apostles, the prophets and the Forerunner
   * are the same persons in every family of Churches: a Coptic or Armenian line
   * about them points to the person already known from the Byzantine calendars,
   * when its name designates exactly one.
   */
  private linkUniversal(c: Cluster, u: Unit): void {
    const title = u.title;
    const theotokos = this.existing.persons.get("theotokos");
    // "The Entrance of Saint Mary into the Temple": an event of a Mary named by nothing else.
    const mary = u.parsed.kind === "event" && u.parsed.subject?.names.length === 1 && u.parsed.subject.names[0]?.text === "Mary";
    if (theotokos && (mary || namesTheotokos(title))) {
      c.kind = "event";
      c.slots = [];
      c.subjectTitles = [];
      c.subjectSlots = [theotokos];
      // "Commemoration of the Theotokos and Ever-Virgin St. Mary" names her twice, not a group.
      delete c.group;
      delete c.subjectGroup;
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
    const replace = (list: Slot[]): Slot[] =>
      list.map((slot) => {
        const part = slot.en?.part;
        const target = part ? this.universalFor(part, slot.holiness, slot.en?.display ?? "", true) : undefined;
        if (!target) return slot;
        for (const x of slot.citations) addCitation(target.citations, x);
        return target;
      });
    c.slots = replace(c.slots);
    c.subjectSlots = replace(c.subjectSlots);
    // Events and relics of these saints ("The Ascension of Elijah the Prophet") point to them too.
    for (const t of [...c.subjectTitles]) {
      const part = t.names[0];
      const target = part && t.names.length === 1 ? this.universalFor(part, new Set(t.holiness), t.title, false) : undefined;
      if (!target) continue;
      c.subjectSlots.push(target);
      c.subjectTitles = c.subjectTitles.filter((x) => x !== t);
    }
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
 * Words of the Theotokos that also stand in other saints' names: other Maries
 * ("St. Mary of Egypt", "St. Mary Magdalene", "St. Mary, the Armenian", "St.
 * Mary Known as Marina"), virgins ("Melitina the Virgin", "the Virgin
 * Sandoukht") and her parents ("Anna, the mother of the Theotokos", "Joachim
 * and Anna, Parents of the Holy Mother of God").
 */
const NOT_THEOTOKOS: RegExp[] = [
  /\b(?:St\.?|Saint)\s+Mary\b(?=,?\s+(?:of\b|the\s+(?!Theotokos\b|Mother of God\b)|\p{Lu}))/gu,
  /(?<!\p{L})(?!(?:Lady|Mary|Our|Pure|Holy|Blessed|The|Ever)\b)\p{Lu}[\p{L}'’-]*(?:\s*\([^)]*\))?,?\s+the\s+[Vv]irgins?\b/gu,
  /\b[Tt]he\s+Virgins?\s+(?!(?:Mary|Lady|St|Saint)\b)\p{Lu}[\p{L}'’-]*/gu,
  /\b(?:[Mm]other|[Ff]ather|[Pp]arents?|[Gg]randmother|[Gg]randfather|[Aa]ncestors?|[Dd]aughter|[Ss]ons?)\s+of\s+(?:the\s+)?(?:(?:Most\s+)?Holy\s+)?(?:Theotokos|Mother of God|Virgin)\b/gu,
];

/**
 * Whether a Coptic or Armenian line is about the Theotokos: "The Commemoration
 * of the Virgin St. Mary, the Theotokos", "The Apparition of the Pure Lady the
 * Virgin in the church of Zeiton", "Feast of the Discovery of St. Mary’s Box";
 * not "The Departure of St. Mary of Egypt" or "The Martyrdom of St. Melitina
 * the Virgin".
 */
export function namesTheotokos(title: string): boolean {
  let text = title;
  for (const re of NOT_THEOTOKOS) text = text.replace(re, " ");
  return /\b(?:Theotokos|Mother of God|Virgin|(?:St\.?|Saint)\s+Mary)\b/u.test(text);
}

/**
 * Whether a name is St John the Baptist himself ("Saint John, the Baptist",
 * "St. John the Forerunner (Baptist)", "Beheading of St. John the Baptist"),
 * not his father or a disciple ("Zechariah - St. John the Baptist’s Father").
 */
export function namesForerunner(text: string): boolean {
  const m = /\bJohn,?\s+the\s+(?:Baptist|Forerunner)\b(?!['’]s)/.exec(text);
  return m !== null && !/\b(?:father|mother|parents?|sons?|daughters?|disciples?|brothers?|sisters?|relatives?)\s+of\b/i.test(text.slice(0, m.index));
}

/**
 * Coptic and Armenian lines that name several saints are kept as one group,
 * named as the source names it: their lists are too irregular to split safely.
 */
function oneSubject(u: Unit): void {
  if (u.parsed.kind === "saints") u.parsed = { ...u.parsed, kind: "group", names: u.parsed.names };
  // "The Relocation of the Relics of Sts. Apakir and John": the relics of a group.
  if (u.parsed.subject?.kind === "saints") u.parsed = { ...u.parsed, subject: { ...u.parsed.subject, kind: "group" } };
}

/**
 * Whether a name and the person that has the same full name on another day (see identityKey) are one saint: their kinds
 * of holiness are compatible, and they are not a man and a woman nor a martyr and a saint who was not one. The key
 * leaves out the endings and the ranks: "Saint Euphrosynos the Cook of Alexandria" (OCA, 11 September) is not
 * "Euphrosynē of Alexandria" of "Venerable Paphnutius and Euphrosynē of Alexandria" (15 February), and "Hieromartyr
 * Macarius, Metropolitan of Kiev" (1 May) is not "Venerable Macarius the Deacon of the Kiev Caves" (19 January).
 */
function sameSaint(part: NamePart, holiness: Set<HolinessType>, other: NamePart | undefined, otherHoliness: Set<HolinessType>): boolean {
  if (!holinessCompatible(holiness, otherHoliness) || martyrdomDiffers(holiness, otherHoliness)) return false;
  return other === undefined || !manAndWoman(part, other);
}

/**
 * Whether two names of one skeleton are a man's and a woman's: their genders differ (see gendersDiffer), or they are
 * spelled differently and only one of them reads as a woman's ("Euphrosynos" / "Euphrosynē"). Spelled alike, the
 * names are one, whatever the titles say of the gender.
 */
function manAndWoman(a: NamePart, b: NamePart): boolean {
  return gendersDiffer(a, b) || (fold(a.given) !== fold(b.given) && (a.gender === "female") !== (b.gender === "female"));
}

const MARTYRS = new Set<HolinessType>(["martyr", "great_martyr", "hieromartyr", "venerable_martyr", "new_martyr"]);
/** Kinds of holiness that tell a saint who was not a martyr: a hierarch may also be a hieromartyr, and "righteous" says nothing. */
const NOT_MARTYRS = new Set<HolinessType>(["venerable", "hermit", "stylite", "recluse", "apostle", "evangelist", "equal_to_apostles", "prophet", "forefather", "archangel"]);

/** Whether one kind of holiness is a martyr's and the other one tells a saint who was not a martyr. */
function martyrdomDiffers(a: Set<HolinessType>, b: Set<HolinessType>): boolean {
  const martyr = (h: Set<HolinessType>): boolean => [...h].some((x) => MARTYRS.has(x));
  const other = (h: Set<HolinessType>): boolean => [...h].some((x) => NOT_MARTYRS.has(x));
  return (martyr(a) && !martyr(b) && other(b)) || (martyr(b) && !martyr(a) && other(a));
}

/** A name distinctive enough to recognise the saint on another day: first name plus epithets or places. */
function identityKey(u: Unit, part: NamePart): string | null {
  const extra = extraKeys(part);
  if (extra.length === 0) return null;
  return `${u.family}|${u.lang}|${part.eq ?? part.key}|${numeralOf(part) ?? ""}|${[...new Set(extra)].sort().join(",")}`;
}

/** A bishop's see in a name: "Metropolitan of Pentapolis", "Bishop of Ryazan", "Episcopul Ciprului", "Arhiepiscop de Corfu", "Mitropolitul Moldovei". */
function hasSee(part: NamePart): boolean {
  return (
    /\b(?:(?:arch)?bishop|metropolitan|patriarch|pope|catholicos)\s+of\s/i.test(part.text) ||
    /\b(?:[Aa]rhi)?[Ee]piscop(?:ul)?\s+(?:al\s+|a\s+|de\s+(?:la\s+)?)?\p{Lu}|\b(?:[Mm]itropolit|[Pp]atriarh)(?:ul)?\s+(?:al\s+|a\s+)?\p{Lu}/u.test(part.text)
  );
}

/**
 * Whether two names of one source name one saint exactly: the same first name, spelled alike but for a letter (the
 * OCA's "Martyr Pontious" with St Fabian and "Martyr Pontius", 5 August), and the same epithets and places. A source
 * lists a saint once a day, so two of its lines that name him otherwise are two saints: "Sfântul Cuvios Leontie
 * Dionisiatul, Izvorâtorul de mir" is not "Sfântul Mucenic Leontie" (doxologia, 18 June), "Sfântul Mucenic Zina" is
 * not "Sfântul Mucenic Zenon" (22 June), "Venerable Gregory the Recluse, of the Kiev Caves" is not "Venerable Gregory,
 * Wonderworker of the Kiev Near Caves" (OCA, 8 January).
 */
export function namesExactly(a: NamePart, b: NamePart): boolean {
  if (levenshtein(fold(a.given), fold(b.given)) > 1) return false;
  const ka = new Set(extraKeys(a));
  const kb = new Set(extraKeys(b));
  return ka.size === kb.size && [...ka].every((k) => kb.has(k));
}

/** Two names with different regnal numbers ("Eustathius I" / "Eustathius II"). */
function namesConflictByNumber(a: NamePart, b: NamePart): boolean {
  const na = numeralOf(a);
  const nb = numeralOf(b);
  return na !== undefined && nb !== undefined && na !== nb;
}

/** "a Maicii Domnului din Tinos" → "Icoana Maicii Domnului din Tinos". */
function roIconName(rest: string): string {
  return `Icoana ${rest.trim().replace(/^a\s+/, "")}`;
}

function withDiffers(line: LineDraft, month: number, day: number): LineDraft {
  const differs = line.clusters.some((c) => c.month > 0 && (c.month !== month || c.day !== day) && !(c.leapDay && month === 2 && day === 28));
  return differs ? { ...line, differs: true } : line;
}

/**
 * Order of the candidate pairs of names and persons: the best score first;
 * between equal scores (on the 0.05 grid of the scores), the pair whose
 * names agree most, not the source that comes first ("Antonina" takes
 * "Sfânta Muceniță Antonina" before "Sfântul Mucenic Antonie" can).
 */
function bestFirst(a: { score: number; agreement: number }, b: { score: number; agreement: number }): number {
  return Math.round((b.score - a.score) * 1000) || b.agreement - a.agreement;
}

/** Whether another line of the unit's source and day already describes the cluster: one source lists a commemoration once a day. */
function sameSourceDescribes(c: Cluster, u: Unit): boolean {
  return c.units.some((x) => x !== u && x.source === u.source && x.month === u.month && x.day === u.day);
}

/** Where a cluster comes in the unit's names: its first paired name, or the name that leads its group. */
function firstIndex(c: Cluster, pairs: Array<[NamePart, Slot]>, names: NamePart[], leaders?: Map<Cluster, NamePart>): number {
  let best = Number.MAX_SAFE_INTEGER;
  for (const [part, slot] of pairs) if (c.slots.includes(slot)) best = Math.min(best, names.indexOf(part));
  const leader = leaders?.get(c);
  if (leader) best = Math.min(best, names.indexOf(leader));
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

/** Words that many group titles share ("and those with him", "and those who suffered with them"): they tell no group apart. */
const TITLE_FILLER = new Set(extraKeys({ text: "x those him them", given: "x", key: "x", extra: [] }));

function keyOverlap(a: string, b: string): number {
  const ka = new Set(extraKeys({ text: `x ${a}`, given: "x", key: "x", extra: [] }));
  let n = 0;
  for (const k of extraKeys({ text: `x ${b}`, given: "x", key: "x", extra: [] })) if (ka.has(k) && !TITLE_FILLER.has(k)) n++;
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

