/**
 * Turns what the sources list into units: one commemoration as one source
 * writes it, with its church date, its parsed title and its link.
 */
import { parseEn } from "./en.ts";
import type { HolinessType, ParsedTitle } from "./model.ts";
import { cleanText } from "./html.ts";
import { fold } from "./names.ts";
import { parseRo, splitHonorifics } from "./ro.ts";
import type { ArmenianEntry } from "./sources/armenian.ts";
import { copticUrl, type CopticEntry } from "./sources/coptic.ts";
import type { DoxologiaListing } from "./sources/doxologia.ts";
import type { OcaListing } from "./sources/oca.ts";
import type { OverlayEntry } from "./sources/orthodox-calendar.ts";
import { entryUrl, ORTODOX_MD_YEARS, type OrtodoxMdEntry } from "./sources/ortodox-md.ts";
import type { PatriarhiaDay, PatriarhiaItem } from "./sources/patriarhia.ts";

export type SourceKey = "doxologia" | "patriarhia" | "oca" | "coptic" | "armenian" | "overlay" | "ortodoxmd";
export type Family = "byzantine" | "coptic" | "armenian";

export interface Citation {
  source: string;
  url?: string;
  locator?: string;
  accessed?: string;
}

export interface Unit {
  uid: string;
  source: SourceKey;
  family: Family;
  lang: "ro" | "en";
  title: string;
  parsed: ParsedTitle;
  month: number;
  day: number;
  order: number;
  url?: string;
  citation: Citation;
  ext: { oca?: string; doxologia?: string; copticchurch?: string };
  /** For OCA listings that exist only on 29 February. */
  leapDay?: boolean;
  arTitle?: string;
  taklaUrl?: string;
  /** For the orthodox-calendar lists: the tradition they complete. */
  tradition?: string;
  /** For the lists of Julian-calendar Churches: the civil date as listed (month and day are the Menaion date). */
  listed?: { month: number; day: number };
  /** For calendar.ortodox.md: the years its title gives in parentheses ("1576"), which tell the same saint listed twice a day. */
  dated?: string[];
  /** The kind of holiness comes from the list's "feast_type", not from the title. */
  holinessFromList?: boolean;
  armenianMonth?: string;
  /** For patriarhia items: cross and colour. */
  cross?: string | null;
  color?: string;
  /**
   * What the source writes of the line besides its title: the OCA's short life, the official calendar's synaxarion of
   * the day in its sections. Read only to tell apart two saints of one name (see Builder.evidence), never copied.
   */
  texts?: UnitText[];
}

export interface UnitText {
  /** The heading of a section of the synaxarion, which names the saint it is about; none for a text about the line's saint. */
  heading?: string;
  text: string;
}

export interface SourceData {
  accessed: string;
  patriarhia: PatriarhiaDay[];
  doxologia: DoxologiaListing[];
  oca: OcaListing[];
  coptic: CopticEntry[];
  armenian: ArmenianEntry[];
  overlays: OverlayEntry[];
  /** The calendar of the Orthodox Church of Moldova (calendar.ortodox.md), on the old style. */
  ortodoxMd?: OrtodoxMdEntry[];
}

/**
 * Sources read after all the others (calendar.ortodox.md, see Builder.moldova): the records known only from them are
 * looked for only from that step on, so that the other sources match the same records whether or not an earlier
 * import already added them, and a second import writes nothing.
 */
export const LATE_SOURCES = new Set(["src:calendar-ortodox-md"]);

/** Whether a record's sources are all sources read last. */
export function onlyLate(sources: Array<{ source?: string }> | undefined): boolean {
  return (sources ?? []).length > 0 && (sources ?? []).every((s) => LATE_SOURCES.has(s.source ?? ""));
}

export function mmdd(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function doxologiaUnits(data: SourceData): Unit[] {
  return data.doxologia.map((x) => {
    const parsed: ParsedTitle = x.secondRow ? { ...parseRo(x.title), kind: "movable" } : parseRo(x.title);
    const url = `https://doxologia.ro/${x.slug}`;
    return {
      uid: `doxologia:${x.slug}@${mmdd(x.month, x.day)}`,
      source: "doxologia",
      family: "byzantine",
      lang: "ro",
      title: x.title,
      parsed,
      month: x.month,
      day: x.day,
      order: x.order,
      url,
      citation: { source: "src:doxologia", url, accessed: data.accessed },
      ext: { doxologia: x.slug },
    } satisfies Unit;
  });
}

/** Items of the official title, without the Sunday, the readings and the notes that follow them. */
export function patriarhiaItems(day: PatriarhiaDay): PatriarhiaItem[] {
  const out: PatriarhiaItem[] = [];
  for (const item of day.items) {
    if (/^(Duminica|Ap\.|Ev\.|Apostolul|glas|Toate ale)\b/i.test(item.text)) break;
    if (/^\(/.test(item.text)) continue;
    if (/^[\d\s,;:.–-]+(?:\(.*)?$/.test(item.text) || /^\d+,\s*\d/.test(item.text)) continue;
    out.push(item);
  }
  return out;
}

export function patriarhiaUnits(data: SourceData): Unit[] {
  const units: Unit[] = [];
  for (const day of data.patriarhia) {
    patriarhiaItems(day).forEach((item, i) => {
      const unit: Unit = {
        uid: `patriarhia:${mmdd(day.month, day.day)}#${i}`,
        source: "patriarhia",
        family: "byzantine",
        lang: "ro",
        title: item.text,
        parsed: parseRo(item.text),
        month: day.month,
        day: day.day,
        order: i,
        url: day.url,
        citation: { source: "src:calendar-patriarhia", url: day.url, accessed: data.accessed },
        ext: {},
        cross: item.cross,
        color: item.color,
      };
      if (day.synaxarion) unit.texts = day.synaxarion;
      units.push(unit);
    });
  }
  return units;
}

/** OCA life URL without the year, as the dataset already cites them. */
export function ocaUrl(path: string): string {
  return `https://www.oca.org${path.replace(/^\/saints\/lives\/\d+\//, "/saints/lives/0000/")}`;
}

/**
 * Fixed OCA commemorations: the same id on the same month and day in every
 * year read. A listing found only on 29 February is fixed on that day.
 */
export function ocaUnits(data: SourceData, years: number[]): { fixed: Unit[]; movable: OcaListing[] } {
  const byId = new Map<string, OcaListing[]>();
  for (const x of data.oca) {
    const list = byId.get(x.id) ?? [];
    list.push(x);
    byId.set(x.id, list);
  }
  const fixed: Unit[] = [];
  const movable: OcaListing[] = [];
  for (const [id, listings] of byId) {
    const first = listings[0];
    if (!first) continue;
    const dates = new Set(listings.map((l) => mmdd(l.month, l.day)));
    const yearsSeen = new Set(listings.map((l) => l.year));
    let leapDay = false;
    let fixedDate: string | null = null;
    if (dates.size === 1 && yearsSeen.size === years.length) fixedDate = [...dates][0] ?? null;
    else if (dates.size === 1 && [...dates][0] === "02-29") {
      fixedDate = "02-29";
      leapDay = true;
    } else if (dates.size === 2 && dates.has("02-28") && dates.has("02-29")) {
      fixedDate = "02-29";
      leapDay = true;
    } else if (yearsSeen.size === years.length) {
      // Also kept on a movable day (an icon on 27 March and on Bright Monday): its fixed day is the one shared by every year.
      const shared = [...dates].filter((d) => years.every((y) => listings.some((l) => l.year === y && mmdd(l.month, l.day) === d)));
      if (shared.length === 1) fixedDate = shared[0] ?? null;
    }
    if (!fixedDate) {
      movable.push(...listings);
      continue;
    }
    const [month, day] = fixedDate.split("-").map(Number);
    const url = ocaUrl(first.path);
    const unit: Unit = {
      uid: `oca:${id}`,
      source: "oca",
      family: "byzantine",
      lang: "en",
      title: first.title,
      parsed: parseEn(first.title),
      month: month ?? 0,
      day: day ?? 0,
      order: first.order,
      url,
      citation: { source: "src:oca-lives", url, accessed: data.accessed },
      ext: { oca: id },
    };
    if (leapDay) unit.leapDay = true;
    const description = listings.find((l) => l.description)?.description;
    if (description) unit.texts = [{ text: description }];
    fixed.push(unit);
  }
  fixed.sort((a, b) => a.month - b.month || a.day - b.day || a.order - b.order);
  return { fixed, movable };
}

export function copticUnits(data: SourceData): Unit[] {
  return data.coptic.map((e) => {
    const url = copticUrl(e);
    const unit: Unit = {
      uid: `coptic:${e.month}_${e.day}#${e.n}`,
      source: "coptic",
      family: "coptic",
      lang: "en",
      title: e.title,
      parsed: parseCopticTitle(e.title),
      month: e.month,
      day: e.day,
      order: e.n,
      url,
      citation: { source: "src:copticchurch-synaxarium", url, accessed: data.accessed },
      ext: { copticchurch: `${e.month}_${e.day}#${e.n}` },
    };
    if (e.titleAr) unit.arTitle = e.titleAr;
    if (e.taklaUrl) unit.taklaUrl = e.taklaUrl;
    return unit;
  });
}

/** Coptic titles say what happened: "The Departure of St. Dioscorus, 25th Pope of Alexandria". */
export function parseCopticTitle(title: string): ParsedTitle {
  const t = title
    .replace(/\.$/, "")
    // "The Commemoration of the Transfer of the Relies of St. James" (30 Baramhat): the relics.
    .replace(/\bthe Relies of\b/gi, "the Relics of")
    .trim();
  const event: ParsedTitle = { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title };
  // "The Angels' Annunciation of John the Baptist to Zacharias": an event of the saint announced.
  const announced = /^(?:The )?(?:Angels?['’]s? )?Annunciation of (?:the )?(.+?) to \p{Lu}/u.exec(t);
  if (announced?.[1]) return { ...event, subject: parseEn(stripCopticTitles(announced[1])) };
  const church = copticChurch(t, title);
  if (church) return church;
  // Councils, churches, earthquakes, a liturgy …: events, not saints ("The First Pontifical Liturgy in the New St. Mark Cathedral").
  if (/^(?:The |A )?(?:Assembly|Council|Synod|Re-?Opening|Opening|Building|Construction|Consecration|Dedication|Earthquake|Great Earthquake|Feast|Miracle|Arrival|Coming|Flight|Entrance|Appearance of the Body|Renewal|Restoration|Pilgrimage|(?:First )?(?:Pontifical |Divine )?Liturgy)\b/i.test(t) && !/\bof (?:St\.?|Saint|Sts\.?|Saints|the (?:Holy |Great )?(?:Martyr|Apostle|Prophet|Archangel))\b/i.test(t)) {
    return event;
  }
  let m: RegExpExecArray | null;
  if ((m = /^(?:(?:The )?(?:Departure|Martyrdom|Commemoration|Repose|Death|Burial|Celebration|Feast)s? of (?:the )?)+(.*)$/i.exec(t))) {
    let text = m[1] ?? "";
    // "… and the Relocation of the Body of St. Theodore, the Prince, to Shotb", "… and the Relocation of His Holy Relics": a second commemoration.
    const relocation = /\s+and the ((?:Relocation|Translation|Translocation|Transfer) of (?:(?:His|Her|Their) (?:Holy )?(?:Relics|Body)|the (?:Holy )?(?:Relics|Body) of .+))$/i.exec(text);
    if (relocation) text = text.slice(0, relocation.index);
    // "Holy Martyrs Alphaeus, Zacchaeus, Romanus and John, and the Commemoration of the Saints Thomas, Victor, and Isaac": two commemorations.
    const other = /,?\s+and the Commemoration of (?:the )?(.+)$/i.exec(text);
    if (other) text = text.slice(0, other.index);
    // "St. Archelaus and the Martyrdom of Elisha the Hegumen": two saints of the day.
    const two = /\s+and the (?:Martyrdom|Departure) of (?:the )?/i.test(text);
    text = text.replace(/\s+and the (?:Martyrdom|Departure) of (?:the )?/gi, " and ");
    const person = stripCopticTitles(text).replace(/(,|\band)\s+(?:St|Sts|Saint|Saints)\.?\s+/g, "$1 ");
    // "St. Gregory the Illuminator’s torments and commitment to the pit": an event of that saint.
    const owner = /^(.*?)['’]s\s+(?:torments|deliverance|commitment|relics|discovery|finding|translation|hand|head|body|miracle)/i.exec(person);
    if (owner?.[1]) return { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title, subject: parseEn(owner[1]) };
    const inner = parseEn(person);
    if (inner.kind === "saint" || inner.kind === "saints" || inner.kind === "group") {
      // "The Martyrdom of …", "The Commemoration of the Martyrdom of St. Thecla": a martyr.
      if (/^(?:The )?(?:Commemoration of (?:the )?)?Martyrdom\b/i.test(t) && !inner.holiness.some((h) => /martyr/.test(h))) inner.holiness = [...inner.holiness, "martyr"];
      // The person is named without "The Departure of"; the line keeps it as the day's title.
      const own: ParsedTitle = { ...inner, title: two && inner.names.length > 1 ? person.replace(/^Saint /, "Saints ") : person };
      const also: ParsedTitle[] = [];
      if (relocation?.[1]) also.push(relocationOf(relocation[1], own.title));
      if (other?.[1]) also.push(parseCopticTitle(`The Commemoration of ${other[1]}`));
      if (also.length > 0) own.also = also;
      return own;
    }
    return withCopticSubject({ ...inner, title });
  }
  const turning = /^(?:The )?Turning Over of the (?:Relics|Body) of (?:the )?(.*?)(?: by \w+.*)?$/i.exec(t);
  if (turning?.[1]) return { kind: "relics_translation", holiness: [], plural: false, honorific: "", rest: t, names: [], title, subject: parseEn(stripCopticTitles(turning[1])) };
  if (/^(?:The )?(?:Appearance|Apparition|Translocation|Relocation|Translation|Transfer|Return)\b/i.test(t)) {
    const p = parseEn(t);
    return withCopticSubject({ ...p, title });
  }
  const p = parseEn(stripCopticTitles(t));
  return withCopticSubject({ ...p, title });
}

/**
 * A line about the building or the consecration of a church: "The Commemoration of the Consecration of the Church of
 * St. Peter, the Seal of Martyrs", "The Consecration of the First Church Dedicated for the Forty Martyrs of Sebaste",
 * "… of the first altar for St. Nicholas, Bishop of Mora for the Jacobite Christians", "The Construction of the first
 * church of St. George in the cities of Birma and Beer Maa …".
 */
const CHURCH_OF = /^(?:The )?(?:(?:Commemoration|Feast) of (?:the )?)?(?:Consecration|Dedication|Construction|Building) of (?:the )?(?:First )?(Church(?:es)?|Altar)(?: Dedicated)? (?:of|for|to) (?:the )?(.+)$/i;
/** Churches named after no saint: the Theotokos is found by the whole title, the archangels by their names. */
const NO_SAINT = /^(?:Holy |Pure |Honou?rable )?(?:Virgin|Lady|Cross|Resurrection|Savio(?:u)?r|Lord|Christ|Theotokos|Archangels?|Angels?)\b/i;

/**
 * The event of the saint, the saints or the group a church is named after. Where the church stands and whom it served
 * are the church's, not the saint's; the churches of two saints, each with his own title, are of two saints, not of a
 * group; another commemoration of the line ("Also, the Commemoration of the Martyrdom of …") is one more commemoration.
 */
function copticChurch(t: string, title: string): ParsedTitle | undefined {
  const m = CHURCH_OF.exec(t);
  if (!m?.[2]) return undefined;
  let text = m[2];
  const also = /\.\s+Also,?\s+(?:the )?(Commemoration of .+)$/i.exec(text);
  if (also) text = text.slice(0, also.index);
  // The line's other commemoration has its own title.
  const own: ParsedTitle = { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title: also ? title.slice(0, title.indexOf(also[0])) : title };
  text = text
    // "… and the Appearance of His Holy Head", ", and the Transfer of His Relics to It": the same commemoration.
    .replace(/,?\s+and the (?:Appearance|Transfer|Relocation|Translation) of (?:His|Her|Their)\b.*$/i, "")
    // "in the cities of Birma and Beer Maa (Water Well) in the Oases", "in the region of Sho", "at Maryut", "in Alexandria".
    .replace(/\s+(?:in|at) (?:the )?(?:cit(?:y|ies)|region|village|town|district|province)\b.*$/i, "")
    .replace(/\s+(?:in|at) \p{Lu}[\p{L}'’-]*$/u, "")
    // "for the Jacobite Christians"
    .replace(/\s+for the [\p{L}\s]*Christians$/iu, "")
    // "the Great St. Anthony" is St. Anthony the Great.
    .replace(/^Great (?:St\.?|Saint) (\p{Lu}[\p{L}'’-]*)/u, "Saint $1 the Great")
    .trim();
  // "Also, the Commemoration of the Martyrdom of Anba Behna …": their martyrdom.
  if (also?.[1]) own.also = [parseCopticTitle(`The ${also[1].replace(/^Commemoration of (?:the )?(?=Martyrdom|Departure)/i, "")}`)];
  if (NO_SAINT.test(text)) return own;
  const each = text.split(/,?\s+and\s+(?=(?:Saint|St\.?|Prince|Anba|Abba)\s)/);
  if (each.length > 1) {
    const subjects = each.map((x) => parseEn(stripCopticTitles(x)));
    const [first] = subjects;
    if (first && subjects.every((s) => s.kind === "saint")) return { ...own, subject: first, subjects };
  }
  const subject = parseEn(stripCopticTitles(text).replace(/(,|\band)\s+(?:St|Sts|Saint|Saints)\.?\s+/g, "$1 "));
  return subject.kind === "saint" || subject.kind === "saints" || subject.kind === "group" ? { ...own, subject } : own;
}

/** "Relocation of His Holy Relics" (of the saint of the line), "Relocation of the Body of St. Theodore, the Prince, to Shotb". */
function relocationOf(text: string, saint: string): ParsedTitle {
  const own = /^(\w+) of (?:His|Her|Their) (Holy )?(Relics|Body)$/i.exec(text);
  if (own) {
    const title = `${own[1]} of the ${own[2] ?? ""}${own[3] ?? ""} of ${saint}`;
    return { kind: "relics_translation", holiness: [], plural: false, honorific: "", rest: title, names: [], title, ofLine: true };
  }
  return withCopticSubject({ ...parseEn(text), title: text });
}

/** The saint of a Coptic relics or event line, named as the other Coptic lines name saints ("Saint Titus", "Saints Apakir and John"). */
function withCopticSubject(p: ParsedTitle): ParsedTitle {
  return p.subject ? { ...p, subject: { ...p.subject, title: stripCopticTitles(p.subject.title) } } : p;
}

function stripCopticTitles(text: string): string {
  return text.replace(/^(?:Saint|St\.?|Sts\.?|Saints)\s+/i, (m) => (/s\.?\s*$/i.test(m.trim()) ? "Saints " : "Saint "));
}

export function armenianUnits(data: SourceData): Unit[] {
  return data.armenian.map((e) => {
    const unit: Unit = {
      uid: `armenian:${e.slug}`,
      source: "armenian",
      family: "armenian",
      lang: "en",
      title: e.title,
      parsed: parseCopticTitle(e.title.replace(/^Commemoration (?:Day )?of /i, "Commemoration of ")),
      month: 0,
      day: 0,
      order: e.order,
      url: e.url,
      citation: { source: "src:armenianchurch-ge", url: e.url, accessed: data.accessed },
      ext: {},
      armenianMonth: e.month,
    };
    return unit;
  });
}

/**
 * The lists of the Russian and Serbian Churches ("calendar": "julian") give the
 * civil date on which these Churches keep the feast: the Menaion date plus 13
 * days (Sf. Serafim de Sarov is listed on 15 January, his day is 2 January).
 * The lists count as in a leap year: 1 March is 17 February.
 */
export function julianMenaionDate(month: number, day: number): { month: number; day: number } {
  const date = new Date(Date.UTC(2028, month - 1, day) - 13 * 86_400_000);
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

const OVERLAY_WORDS: Array<[RegExp, string]> = [
  [/^Unc\.\s*Rel\.\s*/, "Uncovering of the relics of "],
  [/^Trans\.\s*Rel\.\s*/, "Translation of the relics of "],
  [/^Repose (?=St\b|Saint\b)/, "Repose of "],
  [/\bRt\.\s*Blv\.\s*/g, "Right-believing "],
  [/\bBl\.\s*/g, "Blessed "],
  [/\bVen\.\s*/g, "Venerable "],
  [/\bMetrs\.\s*/g, "Metropolitans of "],
  [/\bMetr\.\s*/g, "Metropolitan "],
  // "Ss Peter, Aleksy, Jonah, Philip, Germogen, Metrs. Moscow": the synaxis of the hierarchs of Moscow.
  [/^Ss\s+(.+),\s*Metropolitans of (\S+)$/, "Synaxis of the Hierarchs of $2: $1"],
  [/^Ss\s+/, "Saints "],
];

/**
 * A title of the orthodox-calendar lists without what is not a name: years
 * ("(1326)", "(18th c.)"), dates of the old calendar, link marks copied from
 * Wikipedia ("[ sr ; bg ]", "Ј") and abbreviations ("Ven.", "Metr.").
 */
export function cleanOverlayTitle(title: string): string {
  let t = title
    .replace(/\s*\[[^\]]*\]?/g, " ")
    .replace(/\s+Ј(?=\s|$)/gu, " ")
    .replace(/\s*\((?:ca\.\s*)?\d{3,4}(?:\s*(?:and|[-–])\s*\d{2,4})*\)/g, " ")
    .replace(/\s*\(\d{1,2}(?:st|nd|rd|th) c\.\)/g, " ")
    .replace(/\s*\([A-Z][a-z]+ \d{1,2} OC\)/g, " ")
    .replace(/\s*\(\?\)/g, " ")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  for (const [re, word] of OVERLAY_WORDS) t = t.replace(re, word);
  return t.replace(/\s+/g, " ").replace(/\.$/, "").trim();
}

/** The kind of holiness the lists give apart from the title ("feast_type"). */
const FEAST_TYPES: Record<string, HolinessType[]> = {
  Venerable: ["venerable"],
  Martyr: ["martyr"],
  "New Martyr": ["new_martyr", "martyr"],
  Hieromartyr: ["hieromartyr"],
  Confessor: ["confessor"],
  Hierarch: ["hierarch"],
  Righteous: ["righteous"],
};

export function overlayUnits(data: SourceData): Unit[] {
  return data.overlays.map((e) => {
    const title = cleanOverlayTitle(e.title);
    const first = parseEn(title);
    const parsed = first.kind === "skip" ? { ...parseEn(cleanOverlayTitle(e.name)), title } : first;
    // Bare names ("Basil of Ostrog") take the kind of holiness from the list.
    const listHoliness = FEAST_TYPES[e.feastType ?? ""] ?? [];
    const fromList = parsed.holiness.length === 0 && listHoliness.length > 0 && (parsed.kind === "saint" || parsed.kind === "saints" || parsed.kind === "group");
    if (fromList) parsed.holiness = [...listHoliness];
    const date = e.calendar === "julian" ? julianMenaionDate(e.month, e.day) : { month: e.month, day: e.day };
    const unit: Unit = {
      uid: `overlay:${e.tradition}:${mmdd(e.month, e.day)}#${e.order}`,
      source: "overlay",
      family: "byzantine",
      lang: "en",
      title,
      parsed,
      month: date.month,
      day: date.day,
      order: e.order,
      citation: { source: "src:orthodox-calendar", locator: `backend/app/data/traditions/${e.file}`, accessed: data.accessed },
      ext: {},
      tradition: e.tradition,
    };
    if (e.calendar === "julian") unit.listed = { month: e.month, day: e.day };
    if (fromList) unit.holinessFromList = true;
    if (date.month === 2 && date.day === 29) unit.leapDay = true;
    if (e.url) unit.url = e.url;
    return unit;
  });
}

/**
 * The fixed commemorations of calendar.ortodox.md, on their old-style day (the Menaion date): an entry is fixed when
 * it is on the same old-style day in every year read. An entry found only on 29 February (2028), or on 28 February
 * in a common year and on 29 February in a leap year, is kept on 29 February. The others move with Pascha (the
 * Sundays, the weeks, the synaxes kept on a Sunday) or have no day (the page of Pascha lists thousands of them).
 */
export function ortodoxMdUnits(data: SourceData, years: number[] = ORTODOX_MD_YEARS): Unit[] {
  const byId = new Map<string, OrtodoxMdEntry[]>();
  for (const listed of data.ortodoxMd ?? []) {
    // In a leap year the site lists the saints of 16–28 February one day later (17 February … 29 February).
    const e = listed.year % 4 === 0 && listed.month === 2 && listed.day >= 17 ? { ...listed, day: listed.day - 1 } : listed;
    const list = byId.get(e.id) ?? [];
    list.push(e);
    byId.set(e.id, list);
  }
  const units: Unit[] = [];
  for (const [id, entries] of byId) {
    const dates = new Set(entries.map((e) => mmdd(e.month, e.day)));
    const on = (year: number): Set<string> => new Set(entries.filter((e) => e.year === year).map((e) => mmdd(e.month, e.day)));
    const shared = [...dates].filter((d) => years.every((y) => on(y).has(d)));
    let fixed: string | undefined;
    let leapDay = false;
    if (shared.length === 1) fixed = shared[0];
    else if (shared.length === 0 && [...dates].every((d) => d === "02-28" || d === "02-29") && dates.has("02-29") && years.every((y) => on(y).size === 1)) {
      fixed = "02-29";
      leapDay = true;
    }
    if (!fixed) continue;
    const [month, day] = fixed.split("-").map(Number);
    const listing = entries.find((e) => mmdd(e.month, e.day) === fixed) ?? entries[0];
    if (!listing) continue;
    const url = entryUrl(id);
    const dated = [...listing.title.matchAll(/\(([^()]*)\)/g)].flatMap((m) => (m[1] ?? "").match(/\d{3,4}/g) ?? []);
    // "Sfântul Mucenic Uar din Egipt. Sfânta fericită Cleopatra și fiul său Ioan din Egipt": two lines in one.
    const titles = listing.title.split(/\.\s+(?=(?:Sfântul|Sfânta|Sfinții|Sfintele|Cuviosul|Cuvioasa)\s)/u).flatMap((raw) => splitOrtodoxMdTitle(cleanOrtodoxMdTitle(raw)));
    titles.forEach((title, k) => {
      // Each commemoration of a line has a link of its own (the second is "…#2"), so that a later import finds each.
      const link = k === 0 ? url : `${url}#${k + 1}`;
      const unit: Unit = {
        uid: k === 0 ? `ortodoxmd:${id}` : `ortodoxmd:${id}#${k}`,
        source: "ortodoxmd",
        family: "byzantine",
        lang: "ro",
        title,
        parsed: parseOrtodoxMd(title),
        month: month ?? 0,
        day: day ?? 0,
        order: listing.order + k / 10,
        url: link,
        citation: { source: "src:calendar-ortodox-md", url: link, accessed: data.accessed },
        ext: {},
      };
      if (dated.length > 0) unit.dated = [...new Set(dated)];
      if (leapDay) unit.leapDay = true;
      units.push(unit);
    });
  }
  return units.sort((a, b) => a.month - b.month || a.day - b.day || a.order - b.order);
}

/** Honorifics in the genitive at the start of a part, and their nominative. */
const GENITIVE_START: Array<[RegExp, string]> = [
  [/^Sfântului /u, "Sfântul "],
  [/^Sfintei Mucenițe /u, "Sfânta Muceniță "],
  [/^Sfintei Cuvioase /u, "Sfânta Cuvioasă "],
  [/^Sfintei /u, "Sfânta "],
  [/^Sfinților /u, "Sfinții "],
  [/^Sfintelor /u, "Sfintele "],
  [/^Cuviosului /u, "Cuviosul "],
  [/^Cuvioasei /u, "Cuvioasa "],
  [/^Cuvioșilor /u, "Cuvioșii "],
  [/^Dreptului /u, "Dreptul "],
  [/^Dreptei /u, "Dreapta "],
];

/**
 * The commemorations that one line of the site joins, each with its honorifics: "Sfântul Ierarh Erhard, episcop de
 * Regensburg în Bavaria, a Sfântului Mucenic Avo din Tbilisi în Georgia, și a Sfântului Ierarh Grigor, episcop de
 * Ohrida" is three saints, "Sfântul Mucenic Codrat din Nicomidia și Sfinții Mucenici Saturnin, Rufin și ceilalți" two
 * lines. A relative named by an honorific in the genitive ("ucenicul Sfântului Ioan de la Rila") is not a part.
 */
export function splitOrtodoxMdTitle(title: string): string[] {
  const parts = title.split(/(?:,\s+(?:și\s+)?|\s+și\s+)(?:a\s+)?(?=(?:Sfântul|Sfânta|Sfinții|Sfintele|Sfântului|Sfintei|Sfinților|Sfintelor|Cuviosul|Cuvioasa|Cuvioșii|Cuviosului|Cuvioasei|Cuvioșilor|Dreptul|Dreapta|Dreptului|Dreptei)\s+[\p{Lu}\d])/u);
  if (parts.length === 1) return parts;
  return parts
    .map((part, i) => {
      if (i === 0) return part;
      let p = part;
      for (const [re, to] of GENITIVE_START) p = p.replace(re, to);
      return cleanOrtodoxMdTitle(p);
    })
    .filter((p) => p.length > 0);
}

/** parseRo, with the other events of the site as events ("Aducerea cinstitului veșmânt al Domnului … la Moscova"). */
function parseOrtodoxMd(title: string): ParsedTitle {
  // The readings of the day: "1 Cor. I, 18-24. Ioan XIX, 6-11", "Gal. IV, 4-7".
  if (/^(?:\d\s+)?\p{Lu}\p{Ll}*\.?\s+[IVXLC]+[,.]\s*\d/u.test(title)) return { kind: "skip", holiness: [], plural: false, honorific: "", rest: title, names: [], title };
  const p = parseRo(title);
  if (p.kind === "skip" && /^(?:Aducerea|Așezarea|Scoaterea|Arătarea|Sfințirea|Înnoirea|Târnosirea|Minunea|Pomenirea)\s/u.test(title)) return { ...p, kind: "event" };
  return p;
}

/** A note in parentheses that dates a saint: "(+341)", "(+ 320)", "(XVI)", "(sec. I)", "(apr. 450)", "(Italia, sec. V)", "(1751 sau 1651)". */
function isDateNote(inner: string): boolean {
  return /\d/.test(inner) || /\bsec(?:\.|olul)\s*[IVXL]+/i.test(inner) || /^\s*[IVXL]+(?:\s*[-–]\s*[IVXL]+)?\s*(?:î\.\s*Hr\.?)?\s*$/.test(inner);
}

/** The site's other spellings and slips: "Sfîntul", "Sfinta", "moastelor", "Bine-credincioasa", "Vasile(Smirnov)". */
const MD_SPELLING: Array<[RegExp, string]> = [
  [/Sfînt/g, "Sfânt"],
  [/(?<![\p{L}])Sfinta(?= \p{Lu})/gu, "Sfânta"],
  [/(?<![\p{L}])Sîmbăt/gu, "Sâmbăt"],
  [/dîns/g, "dâns"],
  [/moastel/g, "moaștel"],
  [/Sfintilor/g, "Sfinților"],
  [/(?<![\p{L}])([Bb])ine-credincio/gu, "$1inecredincio"],
  [/(\p{L})\(/gu, "$1 ("],
  [/^(Sfinții|Sfintele|Sfinți)\s+noi\s/u, "$1 Noi "],
];

/** Without the parentheses that the site opened and never closed, or closed without opening ("Liubov), maica lor"). */
function balanced(text: string): string {
  let depth = 0;
  const out: string[] = [];
  for (const c of text) {
    if (c === "(") depth++;
    if (c === ")") {
      if (depth === 0) continue;
      depth--;
    }
    out.push(c);
  }
  let s = out.join("");
  while (depth-- > 0) s = s.replace(/\s*\((?![^(]*\))/u, " ");
  return s;
}

/** The Theotokos and the Cross as the feasts of the official calendar name them. */
const MD_NAMES: Array<[RegExp, string]> = [
  [/(?<![\p{L}])Preasfintei (?:Stăpânei noastre,? )?(?:de Dumnezeu )?Născătoare[ai]?(?: de Dumnezeu)?(?:,? și [Pp]ururea Fecioar(?:ei|a) Maria)?(?![\p{L}])/gu, "Maicii Domnului"],
  [/(?<![\p{L}])[Cc]institei (?:și de viață făcătoarei )?Cruci(?![\p{L}])/gu, "Sfintei Cruci"],
];

/** Feasts that the site writes otherwise than the official calendar. */
const MD_FEASTS: Array<[RegExp, string]> = [
  [/^Nașterea Maicii Domnului.*$/u, "Nașterea Maicii Domnului"],
  [/^(?:Cinstita )?Adormire(?:a)? (?:a )?Maicii Domnului.*$/u, "Adormirea Maicii Domnului"],
  [/^Nașterea [^,]*?Ioan(?![\p{L}]).*$/u, "Nașterea Sfântului Ioan Botezătorul"],
  [/^Tăierea [Cc]apului .*Ioan(?![\p{L}]).*$/u, "Tăierea capului Sfântului Ioan Botezătorul"],
  [/^Zămislirea .*?(?:Înaintemergăt|Botezăt)\p{L}*.*Ioan(?![\p{L}]).*$/u, "Zămislirea Sfântului Ioan Botezătorul"],
  [/^Așezarea .*[Vv]eșmânt\p{L}* al Maicii Domnului.*$/u, "Așezarea veșmântului Maicii Domnului"],
  [/^Așezarea .*br[âa]u\p{L}* al Maicii Domnului.*$/u, "Așezarea cinstitului brâu al Maicii Domnului"],
  [/^((?:Întâia|Prima|A doua|A treia)(?: și a doua)? aflare a )(?:[Cc]institului )?[Cc]ap(?:ului)?(?: al)? /u, "$1capului "],
  [/^Înainte[ -]?[Pp]răznuirea /u, "Înainte-prăznuirea "],
  [/^După[ -]?[Pp]răznuirea /u, "După-prăznuirea "],
  [/^Pomenirea (?:celor \d+ )?Sfin(?:ților|ți) Părinți de la Sinodul/u, "Sfinții Părinți de la Sinodul"],
  [/^.*[Ll]anțuri\p{L}* ale Sfântului Apostol Petru.*$/u, "Cinstirea lanțului Sfântului Apostol Petru"],
  [/^Pomenirea arătării pe cer a semnului Sfintei Cruci.*$/u, "Arătarea pe cer a semnului Sfintei Cruci"],
  [/^Pomenirea arătării minunii .*Arhanghel Mihail la Colose.*$/u, "Pomenirea minunii din Colose a Sfântului Arhanghel Mihail"],
  // Relics: "Pomenirea aducerii moaștelor …", "Mutarea cinstitelor moaște ale …", "Aducerea moaștelor în Răsărit a …".
  [/^Pomenirea (aducerii|mutării|aflării)(?: aducerii)? (?:cinstitelor |sfintelor )?moaștelor /u, "$1 moaștelor "],
  [/^aducerii /u, "Aducerea "],
  [/^mutării /u, "Mutarea "],
  [/^aflării /u, "Aflarea "],
  [/^(Aducerea|Mutarea|Aflarea) cinstitelor moaște ale /u, "$1 moaștelor "],
  [/^(Aducerea|Mutarea|Aflarea) moaștelor (?:în|la) [^,]+? a /u, "$1 moaștelor "],
  // The saint's own day: "Pomenirea Sfântul Cuvios Vasian din Uglici", "Pomenirea adormirii Cuviosului Arhimandrit Cleopa".
  [/^Pomenirea (?:adormirii )?(?=(?:Sfântul|Sfânta|Sfinții|Sfintele|Cuviosul|Cuvioasa|Sfântului|Sfintei|Sfinților|Sfintelor|Cuviosului|Cuvioasei|Dreptului|Dreptei)\s)/u, ""],
  [/^Sinaxa /u, "Soborul "],
  [/^Soborului /u, "Soborul "],
];

/** Offices and states before a name in the lists of the new martyrs ("episcopul Victorin și preoții: Anania …"). */
const MD_ROLES =
  "(?:arhi)?episcop(?:ul|ii)|mitropolit(?:ul|ii)|protopresbiter(?:ul|ii)|protoiere(?:ul|ii)|preo(?:tul|ții)|prezbiter(?:ul|ii)|protodiacon(?:ul|ii)|arhidiacon(?:ul)|ierodiacon(?:ul|ii)|diacon(?:ul|ii|ița)|ieroschimonah(?:ul|ii)|ieromonah(?:ul|ii)|schimonah(?:ul|ia|ii)|schiarhimandrit(?:ul)|arhimandrit(?:ul|ii)|[ie]gumen(?:ul|a)|starețul|stareța|monah(?:ul|ii|ia|iile)|călugăr(?:ul|ița|ii)|rasofor(?:ul|ii)|ipodiacon(?:ul|ii)|citeț(?:ul|ii)|psalt(?:ul|ii)|cântăreț(?:ul|ii)|paracliser(?:ul)|novic(?:ele|ea|ii)|poslușnic(?:ul|a|ii)|fecioar(?:a|ele)|soldat(?:ul|ii)|ostaș(?:ul|ii)|mirean(?:ul|a)|miren(?:ii|ele)|(?:bine)?credincio(?:sul|asa|șii|asele)(?: creștin(?:ul|a|ă|ii|i|e|ele)?)?|creștin(?:ul|a|ii|ele)|învățător(?:ul|ii)|țăran(?:ul|ii)";
/** Names that end like a genitive ("Andrei" is not "Romei"). */
const NAMES_IN_EI = new Set(["andrei", "matei", "timotei", "filotei", "dorotei", "ierotei", "bartolomei", "alexei", "serghei", "zebedei", "pantelei", "elisei", "mihei", "tadei"]);

/**
 * Without the words that describe the saints between the honorifics and the first name ("Sfinții Mucenici pruncii Iacob și
 * Ioan", "Sfântul Ierarh cărturar Varlaam", "Sfinții Cuvioși egumenii: Amfilohie …", "Sfinții Împărați întocmai cu Apostolii
 * și primii împărați creștini Constantin …"), but with a place ("Sfinții Mucenici din Litva, Antonie, Ioan și Eustatie", whose
 * place goes after the names).
 */
function withoutDescriptors(t: string): string {
  const h = splitHonorifics(t);
  if (!h.honorific || h.count !== undefined) return t;
  const place = /^((?:din|de la) \p{Lu}[^,:]*),? (\p{Lu}[^,]*(?:,|\s+și\s+).*)$/u.exec(h.rest);
  if (place) return `${h.honorific} ${place[2]} ${place[1]}`;
  const words = /^((?:\p{Ll}[\p{L}-]*[,:]?\s+)+)(?=\p{Lu})/u.exec(h.rest);
  if (!words?.[1] || /^(?:din|de|dintre|ai|ale|al|a|la|de la|de pe)\s+$/u.test(words[1])) return t;
  // The colon of a list stays: "Sfinții Sfințiți Mucenici: episcopii: Petru și Leon, preoții: …" (see withoutRoles).
  return `${h.honorific}${/:\s*$/.test(words[1]) ? ":" : ""} ${h.rest.slice(words[1].length)}`;
}

/** Removes the offices before the names of a list, but not before a see ("Marcel, episcopul Siciliei"). */
function withoutRoles(list: string): string {
  return list.replace(new RegExp(`(?<![\\p{L}])(?:${MD_ROLES})(?![\\p{L}])\\s*:?\\s+(?=(\\p{Lu}[\\p{L}-]*))`, "giu"), (whole, next: string) => {
    const f = fold(next);
    return /(?:ului|ilor|iei|ei)$/.test(f) && !NAMES_IN_EI.has(f) ? whole : "";
  });
}

/**
 * A title of calendar.ortodox.md in the wording that parseRo reads: without the years and centuries in parentheses,
 * the fasting notes, "Părintele nostru", and the clauses that tell what happened to the saints ("…, care au pătimit în
 * timpul regimului comunist", "…, săvârșit prin sabie"); "dimpreună cu …" as "și cei împreună cu …"; the lists of
 * the new martyrs without the offices before their names and with their place after them ("Sfinții Sfințiți Noi
 * Mucenici din Rusia: episcopul Victorin și preoții: Anania (Aristov), …" → "Sfinții Sfințiți Noi Mucenici Victorin
 * și Anania (Aristov), … din Rusia"); the feasts, icons and relics as the official calendar writes them.
 */
export function cleanOrtodoxMdTitle(title: string): string {
  // Names in quotes stay as written ("Cea care alăptează", "Zid neclintit"): they are set aside while the rules run.
  const quoted: string[] = [];
  let t = cleanText(title).replace(/[„“”"][^„“”"]+[”“"]/gu, (whole) => String.fromCharCode(0xe000 + quoted.push(whole) - 1));
  for (const [re, to] of MD_SPELLING) t = t.replace(re, to);
  t = t.replace(/[.,;]?\s*(?:ZI FĂRĂ POST|Zi fără post|Post aspru|Dezlegare la [^.]*)\.?\s*$/iu, "");
  // Years, notes, and lists of other names ("Pistis, Elpis și Agapis (Vera, Nadejda, Liubov)") in parentheses go.
  t = t.replace(/\s*\(([^()]*)\)/g, (whole, inner: string) => (isDateNote(inner) || /Sărbătoare|schimbătoare|,/i.test(inner) ? "" : whole));
  // A parenthesis with a year that the site never closed: "Serghie(+1938, și Alexandru", "Gheorghe, Grecia(1805,1818".
  t = balanced(t.replace(/\s*\(\s*\+?\s*\d{3,4}[^()]*?(?=[,;]\s*\p{L}|$)/gu, ""));
  t = t.replace(/,?\s+(?:și\s+)?care[\s,].*$/iu, "");
  // Companions counted, not named: "… și 3 mucenici soldați", "…, alți 40 de mucenici", "… împreună cu 12 fecioare
  // mucenițe și 6 credincioși", "…, 4 dintre părinții uciși de arabi".
  t = t.replace(/,\s+\d+\s+dintre\s.*$/u, "");
  t = t.replace(/(?:,\s*(?:dimpreună\s+)?(?:și\s+|împreună cu\s+|cu\s+)?|\s+(?:dimpreună\s+)?(?:și|împreună cu|cu)\s+)(?:cei\s+|cele\s+|alți\s+|alte\s+)?\d+(?:\.\d+)?\s+(?:de\s+)?\p{L}.*$/u, " și cei împreună cu ei");
  t = t.replace(/^((?:Sfinții|Sfintele|Sfinți)(?:\s+\p{Lu}\p{Ll}+)*)\s+(?:și\s+)?(?:frați|surori)(?:\s+buni)?(?=[\s:,])/u, "$1");
  t = t.replace(/,?\s*\+\s*\d{3,4}.*$/u, "");
  t = t.replace(/^(Aflarea moaștelor), și a doua proslăvire a /u, "$1 ");
  t = t.replace(/,?\s*(?:s-au\s+|s-a\s+)?săvârșit\p{L}*\s+(?:prin|de|în|cu)\s.*$/iu, "");
  t = t.replace(/,?\s+în anul \d{3,4}.*$/u, "");
  // "…, împreună pătimitori cu Sfinții Iona și Varahisiu": the saints named after are others; "…, dintre care: Teodul, …"
  // names a few of a group.
  t = t.replace(/,?\s+(?:împreună|dimpreună) pătimitori cu\s.*$/u, "");
  t = t.replace(/,?\s+dintre care:?\s.*$/u, "");
  t = t.replace(/,?\s+ce\s+(?:a|au)\s.*$/u, "");
  t = t.replace(/(?<![\p{L}])cu dâns(ul|a|ii|ele)(?![\p{L}])/gu, (_, end: string) => `cu ${({ ul: "el", a: "ea", ii: "ei", ele: "ele" } as Record<string, string>)[end] ?? "el"}`);
  // A Russian monastery and its region: "din Koriajemsk-Vologda" is "Koryazhemsk, Vologda".
  // The icons keep their double names ("Șuia-Smolensk").
  if (!/[Ii]coan/u.test(t)) t = t.replace(/(?<=(?:din|de la|de) \p{Lu}\p{L}+)-(?:Vologda|Novgorod|Pskov|Kostroma|Iaroslavl|Yaroslavl|Tver|Riazan|Moscova|Perm|Kaluga|Tula|Olonets|Arhanghelsk|Kursk|Orel|Voronej)(?![\p{L}])/gu, "");
  t = t.replace(/(?<![\p{L}])(?:[Pp]ărintele|[Pp]ărinții|[Mm]aica) (?:nostru|noștri|noastră)(?![\p{L}])\s*/gu, "");
  for (const [re, to] of MD_NAMES) t = t.replace(re, to);
  for (const [re, to] of MD_FEASTS) t = t.replace(re, to);
  const plural = /^(?:Sfinții|Sfinți|Sfintele|Sfinte|Cuvioșii|Cuvioasele|Preacuvioșii)\s/u.test(t);
  t = t.replace(/,?\s+(?:și\s+)?(?:cei\s+|cele\s+)?dimpreună cu\s.*$/iu, plural ? " și cei împreună cu ei" : " și cei împreună cu el");
  // Icons: "Icoana făcătoare de minuni a Maicii Domnului – Kasperovskaia", "Prăznuirea Sfintei Icoane a Maicii Domnului …".
  t = t.replace(/^(?:(?:Prăznuirea|Cinstirea|Arătarea) (?:a )?)?(?:[Ss]fintei )?[Ii]coan(?:a|ei|e|ele)(?: [Ff]ăcătoare de minuni)? (?:a )?(Maicii Domnului|Mântuitorului)\s*(?:[–-]\s*)?(?:numită\s+)?/u, "Cinstirea Icoanei $1 ");
  t = t.replace(/^[Ii]coana ([^,]+?) a (Maicii Domnului|Mântuitorului),?\s*/u, "Cinstirea Icoanei $2 $1 ");
  t = t.replace(/^(Cinstirea Icoanei Maicii Domnului) din orașul /u, "$1 din ");
  // Relics: "Aducerea în Constantinopol a moaștelor sfântului mucenic Epimah", "A doua mutare a moaștelor …".
  t = t.replace(/^(?:Prima|Întâia|A doua|A treia) (aducere|mutare|aflare) a (?=(?:sfintelor |cinstitelor )?moaștelor)/u, (_, w: string) => `${w[0]?.toUpperCase()}${w.slice(1)}a `);
  t = t.replace(/^(Aducerea|Mutarea|Așezarea|Aflarea)(?: și mutarea)? (?:(?:în|la|de la|din) [^,]+? a )?(?:sfintelor |cinstitelor )?moaștelor /u, "$1 moaștelor ");
  t = t.replace(/^(Aducerea|Mutarea|Așezarea|Aflarea|Pomenirea|Soborul|Proslăvirea|Canonizarea) (.*)$/u, (_, verb: string, rest: string) => `${verb} ${rest.replace(/(?<![\p{L}])(sfântului|sfintei|sfinților|sfintelor|sfânta|sfântul|sfinții|cuviosului|cuvioasei|cuvioșilor|mucenicului|muceniței|mucenicilor|ierarhului|apostolului|proorocului|prorocului|dreptului|dreptei|binecredinciosului|binecredincioasei|împăratului|împărătesei|sfințitului|slăvitului|cinstitului)(?![\p{L}])/gu, (w) => `${w[0]?.toUpperCase()}${w.slice(1)}`)}`);
  // A genitive at the start ("Sfinților Apostoli …"), the Seventy ("Sfinții Apostoli din cei 70: …"), the words of praise
  // ("Sfântul, Slăvitul și întru tot lăudatul Apostol Andrei", "Sfântul și purtătorul de Dumnezeu Naum").
  for (const [re, to] of GENITIVE_START) t = t.replace(re, to);
  t = t.replace(/\s+(?:din|dintre) cei (?:70|72|șaptezeci)(?=[\s,:])/u, "");
  t = t.replace(/^(Sfântul|Sfânta),? Slăvitul și întru tot lăudatul /u, "$1 ").replace(/^(Sfântul|Sfânta) și purtătorul de Dumnezeu /u, "$1 ");
  t = withoutDescriptors(t);
  // Honorifics inside a list: "și fiii săi, Sfinții: Ștefan Milutin și Dragutin", "fiii săi: Mucenicii Boris și Nicolae".
  t = t.replace(/(?<=:\s*)(?:Sfinții|Sfântul|Sfânta|Sfintele|Mucenicii|Mucenițele|Cuvioșii)(?:\s+(?:Mucenici|Mucenic|Muceniță|Mucenițe|Cuvioși|Sfințiți))*\s+(?=\p{Lu})/gu, "");
  t = t.replace(/,?\s+(?:Sfinții|Sfintele):\s+/gu, " ");
  // Lists: the offices before the names go, the place before the colon goes after the names.
  const list = /^((?:Sfinții|Sfintele|Sfinți|Sfinte|Sfântul|Sfânta|Cuvioșii|Preacuvioșii|Cuviosul|Cuvioasa)(?:\s+(?:\p{Lu}[\p{Ll}-]*|și|fără|de|fecioare))*?)(?:\s+(?:și\s+)?(?:frați|surori)(?:\s+buni)?)?(?:\s+(din(?! cei)\s[^:]+?|din cei (?:70|șaptezeci)))?\s*:\s*(.+)$/u.exec(t);
  if (list) {
    const [, honorific = "", place, rest = ""] = list;
    const names = withoutRoles(rest).replace(/^(?:și\s+)/, "");
    t = `${honorific} ${names}${place && !/^din cei/.test(place) ? ` ${place}` : ""}`;
  } else if (/(?<![\p{L}])No(?:i|u|uă) Mucenic/u.test(t)) t = withoutRoles(t);
  // A plural list does not end with what all of them were: "…, prezbiteri", "…, mari dascăli și învățători ai lumii".
  const all = /^(?:Sfinții|Sfinți|Sfintele|Sfinte|Cuvioșii|Preacuvioșii)\s/u.test(t) ? /,\s+\p{Ll}[\p{L}-]*[ie](?=[\s,]|$)([^,]*)$/u.exec(t) : null;
  if (all) {
    // The place stays: "Macarie, Rufin, Just și Teofil, olari din Roma" → "… și Teofil din Roma".
    const place = /(?<![\p{L}])(?:din|de la) \p{Lu}.*$/u.exec(all[1] ?? "");
    t = `${t.slice(0, all.index)}${place ? ` ${place[0]}` : ""}`;
  }
  t = t.replace(/[-]/gu, (c) => quoted[c.charCodeAt(0) - 0xe000] ?? "");
  return cleanSpaces(t.replace(/[\s,.;:]+$/, ""));
}

function cleanSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
