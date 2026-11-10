/**
 * Turns clusters into data files: persons, groups, icons and commemorations
 * with their locale files, and the calendar lines of every tradition. Existing
 * records are kept as they are; existing calendar days get the new lines after
 * their own.
 */
import { addCitation, addRef, extraKeys, firstOfList, holinessCompatible, knownByPlace, newSlot, numeralOf, personScore, placeKeys, type Cluster, type GroupSubject, type Slot, type SlotName } from "./cluster.ts";
import type { Existing, ExistingLine } from "./existing.ts";
import { FEASTS } from "./feasts.ts";
import type { HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { fold, givenSimilarity, skeleton, slugify } from "./names.ts";
import { parseEn } from "./en.ts";
import { parseRo } from "./ro.ts";
import type { BuildResult, LineDraft } from "./build.ts";
import { mmdd, type Citation, type Family } from "./units.ts";

type Rec = Record<string, any>;

export interface Output {
  /** Path relative to data/ → JSON value. */
  files: Map<string, Rec>;
  stats: Map<string, number>;
}

const SOURCE_NAMES: Record<string, string> = {
  "src:doxologia": "doxologia.ro",
  "src:calendar-patriarhia": "calendar.patriarhia.ro",
  "src:oca-lives": "oca.org",
  "src:copticchurch-synaxarium": "copticchurch.net",
  "src:st-takla-synaxarium": "st-takla.org",
  "src:armenianchurch-ge": "armenianchurch.ge",
  "src:orthodox-calendar": "orthodox-calendar",
  "src:wikipedia": "Wikipedia",
};

function importNote(citations: Citation[]): string {
  const names = [...new Set(citations.map((c) => SOURCE_NAMES[c.source] ?? c.source))];
  return `Importat automat din ${names.join(", ")}; de verificat.`;
}

/** Persons named by feasts that no source lists on their own. */
const KNOWN_PERSONS: Record<string, { ro: string; roFull: string; roParse?: string; en: string; enParse?: string; given: [string, string]; holiness: HolinessType[] }> = {
  "john-the-baptist": {
    ro: "Sf. Proroc Ioan Botezătorul",
    roFull: "Sfântul Proroc Ioan, Înaintemergătorul și Botezătorul Domnului",
    roParse: "Sfântul Proroc Ioan Botezătorul",
    en: "Holy Prophet, Forerunner, and Baptist John",
    enParse: "Prophet John the Baptist",
    given: ["Ioan", "John"],
    holiness: ["prophet"],
  },
};

/**
 * Saints that the Coptic Synaxarium names by their first name alone, where other saints of the family bear that name
 * with a place or an epithet, by the key of the name and the anchor of the saint's own day: "St. George" is the Great
 * Martyr, Prince of the Martyrs (23 Baramouda), "Abba Shenouda" the Archimandrite (7 Abib), "Mari Mina" the Wonder
 * Worker (15 Hatour), "St. Boctor (Victor)" the soldier of Shaou (5 Kiahk), not Boctor son of Romanus. "The Great St.
 * Mark" (the Apostle) is the Apostle and Evangelist whose martyrdom it keeps on 30 Baramouda, not a Pope Mark nor an
 * Apostle Mark of the Seventy: the line of that day points to him in the Byzantine calendars (see anchoredUniversal).
 */
const BARE_NAMES: Partial<Record<Family, Record<string, string>>> = {
  coptic: { grg: "8_23#1", snd: "11_7#1", mn: "3_15#1", bctr: "4_5#2", mrc: "8_30#1" },
};

/** Ranks that a name may carry and still name the saint by his first name alone ("the Great St. Mark the Apostle"). */
const RANK_KEYS = new Set(["apostle", "evangelist", "prophet"].map(skeleton));

export class RecordWriter {
  readonly files = new Map<string, Rec>();
  readonly stats = new Map<string, number>();
  private readonly used = new Map<string, Set<string>>();
  private readonly allSlots: Slot[] = [];
  /** The days ("MM-DD") on which the calendars keep each person, from the commemorations of the person. */
  private readonly keptOn = new Map<Slot, Set<string>>();
  /** The person of each Coptic line about one person, by the line's anchor ("8_30#1"). */
  private readonly anchors = new Map<string, Slot>();
  private readonly extraPersons = new Map<string, Slot>();
  private readonly existing: Existing;
  private readonly result: BuildResult;

  constructor(existing: Existing, result: BuildResult) {
    this.existing = existing;
    this.result = result;
    for (const [collection, ids] of existing.ids) this.used.set(collection, new Set(ids));
  }

  private count(key: string, n = 1): void {
    this.stats.set(key, (this.stats.get(key) ?? 0) + n);
  }

  private claim(collection: string, wanted: string, family?: Family): string {
    const set = this.used.get(collection) ?? new Set<string>();
    this.used.set(collection, set);
    let id = wanted.slice(0, 100).replace(/-+$/, "");
    if (!id) id = "unnamed";
    if (set.has(id) && family && family !== "byzantine") id = `${id}-${family}`;
    if (set.has(id)) {
      let n = 2;
      while (set.has(`${id}-${n}`)) n++;
      id = `${id}-${n}`;
    }
    set.add(id);
    return id;
  }

  // -------------------------------------------------------------------------
  // Subjects of relics, events and synaxes
  // -------------------------------------------------------------------------

  resolveSubjects(): void {
    const seen = new Set<Slot>();
    for (const slot of this.existing.persons.values()) {
      seen.add(slot);
      this.allSlots.push(slot);
    }
    for (const c of this.result.clusters) {
      for (const slot of c.slots) {
        if (seen.has(slot)) continue;
        seen.add(slot);
        this.allSlots.push(slot);
      }
    }
    for (const c of [...this.existing.clusters.values(), ...this.result.clusters]) {
      const [only] = c.slots;
      if (c.ext.copticchurch && c.kind === "persons" && c.slots.length === 1 && only && !this.anchors.has(c.ext.copticchurch)) this.anchors.set(c.ext.copticchurch, only);
      if (c.month === 0) continue;
      for (const slot of c.slots) this.keptOn.set(slot, (this.keptOn.get(slot) ?? new Set<string>()).add(mmdd(c.month, c.day)));
    }
    // Persons named only by feasts must be known before the relics and events are resolved.
    for (const id of Object.keys(KNOWN_PERSONS)) this.knownPerson(id);
    for (const c of this.result.clusters) {
      if (c.existingComm) continue;
      const feast = FEASTS.find((f) => f.id === c.feast);
      if (feast?.subjects) {
        for (const pid of feast.subjects) {
          const slot = this.knownPerson(pid);
          if (slot && !c.subjectSlots.includes(slot)) c.subjectSlots.push(slot);
        }
        continue;
      }
      const day = c.month > 0 ? mmdd(c.month, c.day) : undefined;
      // The churches of two saints: each saint on his own.
      if (c.subjectEach) {
        for (const t of c.subjectEach) {
          const resolved = this.resolve([t], c.family, day, c);
          if (resolved && !c.subjectSlots.includes(resolved)) c.subjectSlots.push(resolved);
        }
        continue;
      }
      // The church of the Forty Martyrs of Sebaste is theirs, not that of forty other martyrs.
      if (c.kind === "event" && c.family !== "byzantine" && c.subjectGroup && !c.subjectGroup.existingGroup) {
        const known = this.findGroup(c.subjectGroup, c.family);
        if (known) c.subjectGroup = known;
      }
      if (c.subjectSlots.length > 0 || c.subjectGroup) continue;
      const titles = c.subjectTitles;
      const resolved = this.resolve(titles, c.family, day, c);
      if (resolved) c.subjectSlots.push(resolved);
    }
  }

  /**
   * The group of the family, kept on its own day, that an event names: "the Forty Martyrs (of Sebaste)" are the group of
   * forty, "Sts. Cosmas, Damian, Their Mother, and Brothers" the group of Cosmas and Damian. The same number, or the same
   * two names or more; only one group may fit.
   */
  private findGroup(g: GroupSubject, family: Family): GroupSubject | undefined {
    const groups = new Set<GroupSubject>();
    for (const c of [...this.existing.clusters.values(), ...this.result.clusters]) if (c.family === family && c.kind === "group" && c.group && c.group !== g) groups.add(c.group);
    const fits: Array<{ group: GroupSubject; score: number }> = [];
    for (const group of groups) {
      if (g.count && group.count && g.count !== group.count) continue;
      const named = g.names.filter((part) => group.names.some((x) => givenSimilarity(part, x) >= 1)).length;
      const score = (g.count && g.count === group.count ? 2 : 0) + (named >= 2 ? named : 0);
      if (score > 0) fits.push({ group, score });
    }
    fits.sort((a, b) => b.score - a.score);
    const [best, second] = fits;
    return best && (!second || second.score < best.score) ? best.group : undefined;
  }

  private knownPerson(id: string): Slot | undefined {
    const existing = this.existing.persons.get(id);
    if (existing) return existing;
    const known = this.extraPersons.get(id);
    if (known) return known;
    if (id === "peter-the-apostle") {
      const found = this.findBest(parseRo("Sfântul Apostol Petru"), "ro", "byzantine");
      if (found) return found;
    }
    const k = KNOWN_PERSONS[id] ?? (id === "peter-the-apostle" ? { ro: "Sf. Ap. Petru", roFull: "Sfântul Apostol Petru", en: "Apostle Peter", given: ["Petru", "Peter"] as [string, string], holiness: ["apostle"] as HolinessType[] } : undefined);
    if (!k) return undefined;
    const slot = newSlot("byzantine");
    const ro = parseRo(k.roParse ?? k.roFull);
    const en = parseEn(k.enParse ?? k.en);
    const roPart = ro.names[0];
    const enPart = en.names[0];
    if (roPart) slot.ro = { part: roPart, display: k.ro, full: k.roFull, short: k.given[0], variants: new Set() };
    if (enPart) slot.en = { part: enPart, display: k.en, short: k.given[1], variants: new Set() };
    slot.gender = "male";
    for (const h of k.holiness) slot.holiness.add(h);
    slot.personId = this.claim("persons", id);
    this.extraPersons.set(id, slot);
    this.allSlots.push(slot);
    return slot;
  }

  /** The person a title names, searched in the whole calendar of the family; `day` is the day of the line that names it. */
  private findBest(p: ParsedTitle, lang: "ro" | "en", family: Family, day?: string): Slot | undefined {
    // The relics of "Venerable Zosimas and Sabbatius of Solovki" are those of Zosimas of Solovki: the first name of a
    // list takes the place that closes it, or every Venerable Zosimas would match alike.
    const part = firstOfList(p.names);
    if (!part) return undefined;
    const universal = this.anchoredUniversal(part, family);
    if (universal) return universal;
    // The body or the relics brought to a place ("the Relocation of the Body of St. Theodore, the Prince, to Shotb"), when
    // the name gives no place of its own: a saint known only by that place ("Theodore of Shotep") is the one whose body
    // went home; one known by more ("John, Archpriest of Scetis") is not, for the relic of St. John the Short.
    const brought: NamePart | undefined = p.to && placeKeys(part).length === 0 ? { ...part, text: `${part.text} of ${p.to}` } : undefined;
    const holiness = new Set(p.holiness);
    const scored: Array<{ slot: Slot; score: number; sameName: boolean; given: string }> = [];
    const honorificWords = new Set(
      fold(p.honorific)
        .split(/[\s,.]+/)
        .filter((w) => w.length > 2 && !["sfantul", "sfanta", "sfintii", "saint", "holy", "the", "and"].includes(w)),
    );
    for (const slot of this.allSlots) {
      if (slot.family !== family) continue;
      const name = slot[lang];
      const other = slot[lang === "ro" ? "en" : "ro"];
      let score = 0;
      let compared: SlotName | undefined;
      if (name) {
        score = Math.max(score, personScore(part, name.part, false), brought && knownByPlace(name.part) ? personScore(brought, name.part, false) : 0);
        compared = name;
      }
      // Through the other language only when the kind of holiness agrees exactly.
      if (other && !name && holiness.size > 0 && sameCategory(holiness, slot.holiness)) {
        score = Math.max(score, personScore(part, other.part, true));
        compared = other;
      }
      if (!holinessCompatible(holiness, slot.holiness)) score -= 0.3;
      // "Sfântul Mare Mucenic Gheorghe" is the great martyr, not a new martyr of the same name.
      if (holiness.size > 0 && [...holiness].every((h) => slot.holiness.has(h))) score += 0.1;
      const display = fold(`${slot.ro?.display ?? ""} ${slot.ro?.full ?? ""} ${slot.en?.display ?? ""}`);
      let shared = 0;
      for (const w of honorificWords) if (display.includes(w)) shared++;
      score += Math.min(shared, 3) * 0.05;
      if (score >= 0.95) scored.push({ slot, score, sameName: compared !== undefined && givenSimilarity(part, compared.part) >= 1, given: compared?.part.given ?? "" });
    }
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best) return undefined;
    const second = scored[1];
    // A first name alone must point to one saint only, or to one saint only among those that another line keeps
    // on the line's own day: the relics of St Evdochia brought on 4 August are those of the Martyr Eudokia of
    // Persia, whom the OCA keeps that day, not those of the Venerable Martyr Evdochia of 1 March.
    if (second && second.score >= best.score - 0.05 && best.score < 1.15) {
      const tied = scored.filter((x) => x.score >= best.score - 0.05);
      // The Coptic Synaxarium, the one source of its family, names a saint alone one way: the saint it means by a name
      // that several bear ("St. George" is the Great Martyr, see BARE_NAMES), or else the saint who bears the name as it
      // is written, not one whose name only sounds alike ("Demiana" is not Damianos nor Damian, "Mercurius" not Marcura).
      if (family !== "byzantine" && extraKeys(part).length === 0 && placeKeys(part).length === 0) {
        const anchor = BARE_NAMES[family]?.[part.key];
        const byAnchor = anchor ? tied.filter((x) => x.slot.ext.copticchurch === anchor) : [];
        const byName = tied.filter((x) => fold(x.given) === fold(part.given));
        const one = byAnchor.length === 1 ? byAnchor[0] : byName.length === 1 ? byName[0] : undefined;
        if (one?.sameName) return one.slot;
      }
      const kept = day ? tied.filter((x) => this.keptOn.get(x.slot)?.has(day)) : [];
      const only = kept.length === 1 ? kept[0] : undefined;
      return only?.sameName ? only.slot : undefined;
    }
    // Otherwise no day confirms a saint found across the whole calendar: a similar first name is another saint the
    // name may designate (above), but never the saint itself ("Herman" is not "Romanus": the name keys drop the H
    // and a leading vowel, and both come out as R-M-N).
    if (!best.sameName) return undefined;
    return best.slot;
  }

  /**
   * The saint of the Byzantine calendars a Coptic name means when it names him by his first name alone, or with his rank
   * only ("the Great St. Mark", "the Great St. Mark the Apostle"): the saint of the anchor of BARE_NAMES, when the line
   * of his own day points to a person of the Byzantine calendars (the Apostle and Evangelist Mark, 30 Baramouda).
   */
  private anchoredUniversal(part: NamePart, family: Family): Slot | undefined {
    const anchor = family === "byzantine" ? undefined : BARE_NAMES[family]?.[part.key];
    if (!anchor || numeralOf(part) || placeKeys(part).length > 0 || extraKeys(part).some((k) => !RANK_KEYS.has(k))) return undefined;
    const slot = this.anchors.get(anchor);
    return slot && slot.family !== family ? slot : undefined;
  }

  /** The person the titles of a commemoration name; `from` is the commemoration, whose sources tell of a new person. */
  private resolve(titles: ParsedTitle[], family: Family, day?: string, from?: Cluster): Slot | undefined {
    for (const t of titles) {
      const lang = /[ăâîșțĂÂÎȘȚ]|Sfânt|Sf\.|Cuvios|Mucenic/.test(t.title) ? "ro" : "en";
      const found = this.findBest(t, lang, family, day);
      if (found) return found;
    }
    // Not found: a new person, known only through this commemoration — if the line names a saint at all.
    const t = titles.find((x) => x.names.length > 0 && (x.honorific !== "" || x.holiness.length > 0));
    const part = t?.names[0];
    if (!t || !part) return undefined;
    const lang = /[ăâîșțĂÂÎȘȚ]|Sfânt|Sf\.|Cuvios|Mucenic/.test(t.title) ? "ro" : "en";
    const slot = newSlot(family);
    const display = lang === "ro" ? t.title.replace(/^Sfântul\b/, "Sf.").replace(/^Sfânta\b/, "Sf.") : t.title;
    slot[lang] = { part, display: display.replace(/\.$/, ""), short: part.text, variants: new Set() };
    for (const h of t.holiness) slot.holiness.add(h);
    if (t.gender) slot.gender = t.gender;
    else if (part.gender) slot.gender = part.gender;
    // The person is known from the line that names it ("The Consecration of the Church of St. Misaeal …"), not from a
    // source of its own.
    for (const x of from?.citations ?? []) addCitation(slot.citations, x);
    for (const x of from?.refs.get(lang) ?? []) addRef(slot.refs, lang, x);
    this.allSlots.push(slot);
    this.count("persons.from-feasts");
    return slot;
  }

  // -------------------------------------------------------------------------
  // Ids
  // -------------------------------------------------------------------------

  personId(slot: Slot): string {
    if (slot.personId) return slot.personId;
    let base: string;
    if (slot.angel) base = `archangel-${slugify(slot.en?.part.given ?? slot.ro?.part.given ?? "unknown")}`;
    else if (slot.en) {
      base = idFromName(slot.en.part.text, "en");
      // "New Martyr Theodore" alone says little: take the place from the Romanian name.
      if (!base.includes("-") && slot.ro) {
        const ro = idFromName(slot.ro.part.text, "ro");
        const place = /-of-(.+)$/.exec(ro)?.[1];
        if (place) base = `${base}-of-${place}`;
      }
    } else if (slot.ro) base = idFromName(slot.ro.part.text, "ro");
    else base = "saint";
    // A first name alone: say who it is ("peter-the-apostle", "isaiah-the-prophet").
    if (!base.includes("-") && !slot.angel) {
      if (slot.holiness.has("apostle")) base = `${base}-the-apostle`;
      else if (slot.holiness.has("prophet")) base = `${base}-the-prophet`;
    }
    slot.personId = this.claim("persons", base, slot.family);
    return slot.personId;
  }

  groupId(g: GroupSubject, family: Family): string {
    if (g.groupId) return g.groupId;
    const name = g.en ?? g.ro ?? "group";
    g.groupId = this.claim("groups", groupSlug(name, g.en ? "en" : "ro"), family);
    return g.groupId;
  }

  iconId(c: Cluster): string {
    const icon = c.icon;
    if (!icon) return "icon";
    if (icon.iconId) return icon.iconId;
    const name = icon.en ?? icon.ro ?? "icon";
    icon.iconId = this.claim("icons", iconSlug(name, icon.en ? "en" : "ro"));
    return icon.iconId;
  }

  commId(c: Cluster): string {
    if (c.commId) return c.commId;
    const date = mmdd(c.month, c.day);
    let base: string;
    switch (c.kind) {
      case "persons": {
        const ids = c.slots.map((s) => this.personId(s));
        if (ids.length === 0) base = shortSlug(c.titles.en ?? c.titles.ro ?? "commemoration");
        else if (ids.length === 1) {
          const set = this.used.get("commemorations") ?? new Set<string>();
          const later = c.family === "byzantine" ? date : c.family;
          base = set.has(`${ids[0]}--repose`) ? `${ids[0]}--${later}` : `${ids[0]}--repose`;
        } else if (ids.length === 2) base = `${ids[0]}-and-${ids[1]}`;
        else base = `${ids[0]}-and-companions`;
        break;
      }
      case "angels":
        base = `synaxis-of-${c.slots.map((s) => this.personId(s)).join("-and-")}`;
        if (c.slots.length === 0) base = "synaxis-of-the-archangels";
        break;
      case "group":
        base = this.groupId(c.group as GroupSubject, c.family);
        break;
      case "feast":
        base = c.feast ?? shortSlug(c.titles.en ?? c.titles.ro ?? "feast");
        break;
      case "forefeast":
      case "afterfeast":
      case "leavetaking":
        base = `${c.feast}--${c.kind}`;
        break;
      case "relics_translation":
      case "relics_finding": {
        const subject = c.subjectSlots[0] ? this.personId(c.subjectSlots[0]) : c.subjectGroup ? this.groupId(c.subjectGroup, c.family) : shortSlug(c.titles.en ?? c.titles.ro ?? "relics");
        base = `${subject}--${c.kind === "relics_translation" ? "translation-of-relics" : "finding-of-relics"}`;
        break;
      }
      case "glorification": {
        const subject = c.subjectSlots[0] ? this.personId(c.subjectSlots[0]) : c.subjectGroup ? this.groupId(c.subjectGroup, c.family) : shortSlug(c.titles.en ?? c.titles.ro ?? "saint");
        base = `${subject}--glorification`;
        break;
      }
      case "synaxis": {
        const subject = c.subjectGroup ? this.groupId(c.subjectGroup, c.family) : c.subjectSlots[0] ? this.personId(c.subjectSlots[0]) : shortSlug(c.titles.en ?? c.titles.ro ?? "synaxis");
        base = `synaxis-of-${subject.replace(/^synaxis-of-/, "").replace(/^of-/, "")}`;
        break;
      }
      case "icon": {
        const iid = this.iconId(c);
        base = (this.used.get("commemorations") ?? new Set<string>()).has(iid) ? `${iid}--${date}` : iid;
        break;
      }
      case "council":
        base = c.council ? `fathers-of-the-${ORDINALS[c.council] ?? c.council}-ecumenical-council` : shortSlug(c.titles.en ?? c.titles.ro ?? "council");
        break;
      default: {
        const title = c.titles.en ?? c.titles.ro ?? "event";
        base = c.subjectSlots[0] ? `${this.personId(c.subjectSlots[0])}--${slugify(eventWords(title)).slice(0, 40) || "event"}` : slugify(title).split("-").slice(0, 8).join("-");
      }
    }
    c.commId = this.claim("commemorations", base.replace(/-{3,}/g, "--"), c.family);
    return c.commId;
  }

  // -------------------------------------------------------------------------
  // Files
  // -------------------------------------------------------------------------

  write(): Output {
    this.resolveSubjects();
    const persons = new Map<string, Slot>();
    const groups = new Map<string, { g: GroupSubject; family: Family }>();
    for (const c of this.result.clusters) {
      if (c.existingComm) continue;
      const id = this.commId(c);
      const subjects: string[] = [];
      for (const slot of [...c.slots, ...c.subjectSlots]) {
        const pid = this.personId(slot);
        subjects.push(`person:${pid}`);
        if (!slot.existingPerson) persons.set(pid, slot);
      }
      const g = c.group ?? c.subjectGroup;
      if (g) {
        const gid = this.groupId(g, c.family);
        subjects.push(`group:${gid}`);
        if (!g.existingGroup) groups.set(gid, { g, family: c.family });
      }
      if (c.kind === "icon" && c.icon) {
        const iid = this.iconId(c);
        subjects.push(`icon:${iid}`);
        if (!c.icon.existingIcon && !this.files.has(`icons/${iid}.json`)) this.writeIcon(iid, c);
      }
      this.writeCommemoration(id, c, [...new Set(subjects)]);
    }
    for (const [pid, slot] of persons) this.writePerson(pid, slot);
    for (const [gid, { g, family }] of groups) this.writeGroup(gid, g, family);
    this.writeCalendars();
    return { files: this.files, stats: this.stats };
  }

  private editorial(citations: Citation[], confidence: "low" | "medium", extra: string[] = []): Rec {
    return { status: "draft", confidence, notes: [importNote(citations), ...extra] };
  }

  private writePerson(id: string, slot: Slot): void {
    const holiness = [...slot.holiness].filter((h) => h !== "archangel" || slot.angel);
    const notes: string[] = [];
    let confidence: "low" | "medium" = slot.ro && slot.en ? "medium" : "low";
    if (!slot.angel && holiness.length === 0) {
      const text = `${slot.ro?.display ?? ""} ${slot.en?.display ?? ""}`;
      if (/episcop|mitropolit|patriarh|bishop|metropolitan|patriarch|pope|papa\b/i.test(text)) holiness.push("hierarch");
      else if (/cuvios|cuvioas|venerable|monk|abbot|abbess|igumen|nun\b|hermit|ascetic/i.test(text)) holiness.push("venerable");
      else {
        holiness.push("righteous");
        notes.push("Chipul sfințeniei nu reiese din titlu; „righteous” e provizoriu.");
        confidence = "low";
      }
    }
    if (!slot.gender) {
      notes.push("Genul nu reiese din sursă; e de verificat.");
      confidence = "low";
    }
    const citations = slot.citations.length > 0 ? slot.citations : [{ source: "src:doxologia" }];
    const rec: Rec = {
      id,
      kind: slot.angel ? "angel" : "saint",
      gender: slot.gender ?? "male",
      holiness_types: slot.angel ? ["archangel"] : [...new Set(holiness)],
    };
    const ext = cleanExt(slot.ext);
    if (ext) rec.external_ids = ext;
    rec.sources = dedupeCitations(citations);
    rec.editorial = this.editorial(citations, confidence, notes);
    this.files.set(`persons/${id}.json`, rec);
    this.count("persons");
    for (const lang of ["ro", "en"] as const) {
      const name = slot[lang];
      if (!name) continue;
      const names: Rec = { display: name.display };
      if (name.full && name.full !== name.display) names.full = name.full;
      if (name.short && name.short !== name.display) names.short = name.short;
      const given = name.part.given.replace(/[^\p{L}-]/gu, "");
      if (given && /^\p{Lu}/u.test(given)) names.given = given;
      const variants = [...name.variants].filter((v) => v !== name.display && v !== name.full);
      if (variants.length > 0) names.variants = variants;
      const loc: Rec = { id, locale: lang, names };
      const refs = slot.refs.get(lang);
      if (refs && refs.length > 0) loc.references = dedupeCitations(refs);
      loc.translation = { status: "draft", method: "original" };
      this.files.set(`i18n/${lang}/persons/${id}.json`, loc);
    }
  }

  private writeGroup(id: string, g: GroupSubject, family: Family): void {
    const holiness = [...g.holiness];
    const rec: Rec = { id, kind: groupKind(g) };
    if (g.count) rec.count = { value: g.count, precision: "exact" };
    if (holiness.length > 0) rec.holiness_types = holiness;
    const ext = cleanExt(g.ext);
    if (ext) rec.external_ids = ext;
    const citations = g.citations.length > 0 ? g.citations : [{ source: family === "coptic" ? "src:copticchurch-synaxarium" : "src:doxologia" }];
    rec.sources = dedupeCitations(citations);
    rec.editorial = this.editorial(citations, g.ro && g.en ? "medium" : "low");
    this.files.set(`groups/${id}.json`, rec);
    this.count("groups");
    for (const lang of ["ro", "en"] as const) {
      const name = g[lang];
      if (!name) continue;
      const loc: Rec = { id, locale: lang, names: { display: name } };
      const refs = g.refs.get(lang);
      if (refs && refs.length > 0) loc.references = dedupeCitations(refs);
      loc.translation = { status: "draft", method: "original" };
      this.files.set(`i18n/${lang}/groups/${id}.json`, loc);
    }
  }

  private writeIcon(id: string, c: Cluster): void {
    const icon = c.icon;
    if (!icon) return;
    const text = `${icon.ro ?? ""} ${icon.en ?? ""}`;
    const theotokos = /maicii domnului|n[ăa]sc[ăa]toarei|mother of god|theotokos/i.test(text);
    const rec: Rec = { id, subject: theotokos ? "theotokos" : /\b(mântuitorului|domnului|christ|savior|saviour)\b/i.test(text) ? "christ" : "other" };
    if (theotokos && this.existing.persons.has("theotokos")) rec.depicts = ["person:theotokos"];
    const citations = icon.citations.length > 0 ? icon.citations : c.citations;
    rec.sources = dedupeCitations(citations);
    rec.editorial = this.editorial(citations, icon.ro && icon.en ? "medium" : "low");
    this.files.set(`icons/${id}.json`, rec);
    this.count("icons");
    for (const lang of ["ro", "en"] as const) {
      const name = icon[lang];
      if (!name) continue;
      const loc: Rec = { id, locale: lang, names: { display: name } };
      const refs = icon.refs.get(lang);
      if (refs && refs.length > 0) loc.references = dedupeCitations(refs);
      loc.translation = { status: "draft", method: "original" };
      this.files.set(`i18n/${lang}/icons/${id}.json`, loc);
    }
  }

  private writeCommemoration(id: string, c: Cluster, subjects: string[]): void {
    const kind = commemorationKind(c, subjects);
    const rec: Rec = { id, kind };
    if (subjects.length > 0) rec.subjects = subjects;
    rec.date_rule = dateRule(c);
    if (c.durationDays && c.durationDays > 1) rec.duration_days = c.durationDays;
    if (c.kind === "forefeast" || c.kind === "afterfeast" || c.kind === "leavetaking") rec.parent_feast = `comm:${c.feast}`;
    const feast = FEASTS.find((f) => f.id === c.feast);
    if (c.kind === "feast" && feast?.rank) rec.default_rank = feast.rank;
    const ext = cleanExt({ oca: c.ext.oca, copticchurch: c.ext.copticchurch });
    if (ext) rec.external_ids = ext;
    rec.sources = dedupeCitations(c.citations);
    const notes = c.note ? [c.note] : [];
    rec.editorial = this.editorial(c.citations, c.units.some((u) => u.lang === "ro") && c.units.some((u) => u.lang === "en") ? "medium" : "low", notes);
    this.files.set(`commemorations/${id}.json`, rec);
    this.count("commemorations");
    // Saints' days take their title from their subjects; other days need one.
    const derivable = kind === "repose" && subjects.length === 1;
    for (const lang of ["ro", "en", "ar"] as const) {
      const title = c.titles[lang];
      if (!title || (derivable && lang !== "ar")) continue;
      const loc: Rec = { id, locale: lang, names: { display: title } };
      const refs = c.refs.get(lang);
      if (refs && refs.length > 0 && lang !== "ar") loc.references = dedupeCitations(refs);
      loc.translation = { status: "draft", method: "original" };
      this.files.set(`i18n/${lang}/commemorations/${id}.json`, loc);
    }
    if (c.kind === "feast" && !c.titles.ro && !c.titles.en) {
      this.files.set(`i18n/en/commemorations/${id}.json`, { id, locale: "en", names: { display: id }, translation: { status: "draft", method: "original" } });
    }
  }

  // -------------------------------------------------------------------------
  // Calendars
  // -------------------------------------------------------------------------

  private lineJson(line: LineDraft, date?: string): Rec {
    const out: Rec = { commemorations: line.clusters.map((c) => `comm:${this.commId(c)}`) };
    if (line.symbol) out.symbol = line.symbol;
    // Periods take their date from the earliest source, so the check is made once all are read.
    const differs =
      date !== undefined &&
      line.clusters.some((c) => {
        if (c.month === 0 || c.family === "armenian") return false;
        if (c.leapDay && date === "02-28") return false;
        return mmdd(c.month, c.day) !== date;
      });
    if (differs) out.differs_from_default = true;
    if (line.confidence) out.confidence = line.confidence;
    return out;
  }

  private writeCalendars(): void {
    for (const [tradition, byDate] of this.result.lines) {
      const existing = this.existing.menaion.get(tradition) ?? new Map<string, ExistingLine[]>();
      for (const [date, lines] of byDate) {
        const [mm, dd] = date.split("-");
        const entries: Rec[] = [...((existing.get(date) ?? []) as Rec[])];
        for (const line of lines) entries.push(this.lineJson(line, date));
        this.files.set(`traditions/${tradition}/menaion/${mm}/${dd}.json`, { tradition, date, entries });
        this.count(`lines.${tradition}`, lines.length);
      }
    }
    // Official titles of the new Romanian lines.
    const roTradition = this.existing.dataset.locales.get("traditions")?.get("romanian")?.get("ro");
    if (roTradition) {
      const titles: Rec = { ...(roTradition.official_titles ?? {}) };
      let added = 0;
      for (const lines of this.result.lines.get("romanian")?.values() ?? []) {
        for (const line of lines) {
          const first = line.clusters[0];
          if (!line.title || !first) continue;
          const key = `comm:${this.commId(first)}`;
          if (key in titles) continue;
          titles[key] = line.title;
          added++;
        }
      }
      if (added > 0) this.files.set("i18n/ro/traditions/romanian.json", { ...roTradition, official_titles: titles });
    }
    for (const [tradition, lines] of this.result.movable) {
      const doc = this.existing.movable.get(tradition) ?? { tradition, entries: [] };
      const entries = [...((doc.entries ?? []) as Rec[]), ...lines.map((l) => this.lineJson(l))];
      this.files.set(`traditions/${tradition}/movable.json`, { ...doc, entries });
      this.count(`lines.${tradition}`, lines.length);
    }
  }
}

/** Whether two sets of holiness types share their main kind (martyr, monastic, hierarch …). */
function sameCategory(a: Set<HolinessType>, b: Set<HolinessType>): boolean {
  const cat = (s: Set<HolinessType>): Set<string> => {
    const out = new Set<string>();
    for (const x of s) {
      if (/martyr/.test(x)) out.add("martyr");
      else if (x === "venerable" || x === "hermit" || x === "stylite" || x === "recluse") out.add("venerable");
      else if (x === "hierarch") out.add("hierarch");
      else if (x === "apostle" || x === "evangelist" || x === "equal_to_apostles") out.add("apostle");
      else if (x === "prophet" || x === "forefather" || x === "righteous") out.add("prophet");
      else if (x === "archangel") out.add("angel");
    }
    return out;
  };
  const ca = cat(a);
  const cb = cat(b);
  for (const x of ca) if (cb.has(x)) return true;
  return false;
}

/** A slug of a title, limited to its first eight words. */
function shortSlug(title: string): string {
  return slugify(title.replace(/\([^)]*\)/g, " ")).split("-").slice(0, 8).join("-");
}

const ORDINALS: Record<number, string> = { 1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh" };


function cleanExt(ext: Record<string, string | undefined>): Rec | null {
  const out: Rec = {};
  for (const [k, v] of Object.entries(ext)) if (v) out[k] = v;
  return Object.keys(out).length > 0 ? out : null;
}

function dedupeCitations(list: Citation[]): Citation[] {
  const out: Citation[] = [];
  for (const c of list) addCitation(out, c);
  return out.map((c) => {
    const r: Citation = { source: c.source };
    if (c.url) r.url = c.url;
    if (c.locator) r.locator = c.locator;
    if (c.accessed) r.accessed = c.accessed;
    return r;
  });
}

function commemorationKind(c: Cluster, subjects: string[]): string {
  switch (c.kind) {
    case "persons":
      return subjects.length > 0 ? "repose" : "event";
    case "group":
      // "Sfinții Trei Ierarhi" is the synaxis that the OCA names "Synaxis of the Ecumenical Teachers".
      return c.units.some((u) => u.parsed.kind === "synaxis") || c.group?.synaxis ? "synaxis" : "repose";
    case "feast": {
      const f = FEASTS.find((x) => x.id === c.feast);
      if (f?.kind === "synaxis") return subjects.length > 0 ? "synaxis" : "event";
      return f?.kind ?? "event";
    }
    case "synaxis":
      return subjects.length > 0 ? "synaxis" : "event";
    case "relics_translation":
    case "relics_finding":
    case "glorification":
      return subjects.length > 0 ? c.kind : "event";
    case "angels":
      return subjects.length > 0 ? "angels" : "event";
    case "icon":
      return subjects.length > 0 ? "icon" : "event";
    default:
      return c.kind;
  }
}

function dateRule(c: Cluster): Rec {
  if (c.family === "armenian") return { type: "unspecified", note: "Zi mobilă în calendarul armean; regula e de stabilit." };
  if (c.family === "coptic") return { type: "fixed", month: c.month, day: c.day, calendar: "coptic" };
  if (c.leapDay && c.month === 2 && c.day === 29) return { type: "fixed", month: 2, day: 29, non_leap: { month: 2, day: 28 } };
  return { type: "fixed", month: c.month, day: c.day };
}

function groupKind(g: GroupSubject): string {
  const text = fold(`${g.ro ?? ""} ${g.en ?? ""}`);
  if ([...g.holiness].some((h) => /martyr/.test(h)) || /mucenic|martyr|martir/.test(text)) return "martyrs";
  if (/sinod|council/.test(text)) return "council_fathers";
  if (/soborul|synaxis|sfintii din|saints of/.test(text)) return "synaxis";
  if (/familia|family|parintii|parents|sons|fiii/.test(text)) return "family";
  if (/cuviosi|parinti|fathers|monks|monastic/.test(text)) return "community";
  return "other";
}

/** Honorifics that may still stand inside a name ("Theodore Saint of …"); names themselves have none. */
const EN_DROP = new Set(["saint", "saints", "st", "sts", "holy", "blessed", "sfantul", "sfanta", "sf"]);
const RO_WORDS: Record<string, string> = {
  din: "of",
  "de-la": "of",
  de: "of",
  cel: "the",
  cea: "the",
  mare: "great",
  nou: "new",
  noul: "new",
  si: "and",
};

/** "Gregory the Decapolite" → gregory-the-decapolite; "Proclus, Archbishop of Constantinople" → proclus-of-constantinople. */
export function idFromName(text: string, lang: "ro" | "en"): string {
  const clean = text.replace(/\([^)]*\)/g, " ").replace(/[„”"“«»]/g, "").replace(/\s+/g, " ").trim();
  const [head = "", ...tail] = clean.split(/,\s*/);
  let words = head.split(/\s+/).filter(Boolean);
  if (lang === "ro") words = translateRo(words);
  const hasPlace = words.some((w) => /^(of|from|at)$/i.test(w));
  if (!hasPlace) {
    for (const t of tail) {
      // Only the see or the place of an office ("Bishop of Nyssa", "Episcopul Romei"), not "companion of Venerable Procopius".
      if (!/^(?:(?:arch)?bishop|metropolitan|patriarch|pope|abbot|abbess|igumen|hegumen|archimandrite|founder|enlightener|catholicos|(?:arhi)?episcop|mitropolit|patriarh|egumen|stare|ctitor|lumin|of\b|din\b|de la\b)/i.test(t)) continue;
      // "Episcopul Nyssei" → of Nyssa, "Episcopul Tomisului" → of Tomis
      const see = lang === "ro" ? /^(?:arhi)?episcop\w*\s+(?:al\s+|de\s+)?(\p{Lu}[\p{L}-]*)|^(?:mitropolit|patriarh)\w*\s+(\p{Lu}[\p{L}-]*)/iu.exec(t) : null;
      const seeName = see?.[1] ?? see?.[2];
      if (seeName) {
        words.push("of", seeName.replace(/ului$/, "").replace(/iei$/, "ia").replace(/ei$/, "a").replace(/lor$/, ""));
        break;
      }
      const m = /\b(?:of|din|de la|al|a)\s+(?:the\s+)?([A-ZĂÂÎȘȚ][\p{L}'’-]*(?:\s+[A-ZĂÂÎȘȚ][\p{L}'’-]*)?)/u.exec(t);
      if (m?.[1] && !/^(?:See|Saint|St|Venerable|Holy|Blessed|Sf|Sfântul|Sfânta)\b/.test(m[1])) {
        words.push("of", ...m[1].split(/\s+/));
        break;
      }
    }
  }
  const slug = slugify(words.join(" "));
  const parts = slug.split("-").filter((w) => !EN_DROP.has(w) || w === "the" || w === "of" || w === "and");
  while (parts.length > 0 && ["the", "of", "and"].includes(parts[0] ?? "")) parts.shift();
  while (parts.length > 0 && ["the", "of", "and"].includes(parts[parts.length - 1] ?? "")) parts.pop();
  return parts.slice(0, 7).join("-") || slug || "saint";
}

function translateRo(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = fold(words[i] ?? "");
    if (w === "de" && fold(words[i + 1] ?? "") === "la") {
      out.push("of");
      i++;
      continue;
    }
    out.push(RO_WORDS[w] ?? (words[i] ?? ""));
  }
  return out;
}

function groupSlug(name: string, lang: "ro" | "en"): string {
  const head = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/:.*$/, "")
    .replace(/,?\s+(?:and|și|cu)\s+(?:those|cei|all|toți)\b.*$/i, " and companions")
    .replace(/,?\s+(?:and|with)\s+(?:his|her|their)\s+\w+.*$/i, " and companions");
  let words = head.replace(/[„”"“]/g, " ").split(/\s+/).filter(Boolean);
  if (lang === "ro") {
    const map: Record<string, string> = { sfintii: "", sfintele: "", sf: "", sfinti: "", cei: "", cele: "", mucenici: "martyrs", mucenite: "martyrs", mc: "martyrs", cuviosi: "venerable", cuv: "venerable", parinti: "fathers", parintii: "fathers", sfintiti: "", ierarhi: "hierarchs", apostoli: "apostles", tineri: "youths", prunci: "infants", fecioare: "virgins", soborul: "synaxis", sfintilor: "saints", companions: "companions" };
    words = translateRo(words).map((w) => {
      const f = fold(w).replace(/[^a-z0-9]/g, "");
      return f in map ? (map[f] ?? "") : w;
    });
  } else {
    // Leading honorifics: "Holy", "Hieromartyr", "Venerable" …
    while (words.length > 1 && /^(the|holy|saints?|sts?\.?|hieromartyrs?|venerable|blessed|righteous|great|monastic|virgin)$/i.test(words[0] ?? "")) words.shift();
    words = words.filter((w) => !/^holy$/i.test(w));
  }
  const slug = slugify(words.join(" ")).replace(/(^|-)(\d+)-of-/, "$1$2-").split("-").slice(0, 8).join("-") || "group";
  // "Sfinții din Rostov și Yaroslav" → saints-of-rostov-and-yaroslav
  return /^of-/.test(slug) ? `saints-${slug}` : slug;
}

function iconSlug(name: string, lang: "ro" | "en"): string {
  if (lang === "en") {
    const s = slugify(name.replace(/\([^)]*\)/g, " ").replace(/the Mother of God|the Most Holy Theotokos|the Theotokos/gi, "theotokos"));
    return s.split("-").slice(0, 9).join("-");
  }
  const s = slugify(
    name
      .replace(/^Icoana\s+/i, "")
      .replace(/Maicii Domnului|Născătoarei de Dumnezeu/gi, "theotokos")
      .replace(/\bdin\b|\bde la\b/gi, "of"),
  );
  return `icon-of-${s}`.split("-").slice(0, 9).join("-");
}

function eventWords(title: string): string {
  return title
    .replace(/\b(of|the|our|saint|st\.?|holy|a|al|lui|sfântului|sfintei|sf\.)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
}

