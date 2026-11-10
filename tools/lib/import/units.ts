/**
 * Turns what the sources list into units: one commemoration as one source
 * writes it, with its church date, its parsed title and its link.
 */
import { parseEn } from "./en.ts";
import type { HolinessType, ParsedTitle } from "./model.ts";
import { parseRo } from "./ro.ts";
import type { ArmenianEntry } from "./sources/armenian.ts";
import { copticUrl, type CopticEntry } from "./sources/coptic.ts";
import type { DoxologiaListing } from "./sources/doxologia.ts";
import type { OcaListing } from "./sources/oca.ts";
import type { OverlayEntry } from "./sources/orthodox-calendar.ts";
import type { PatriarhiaDay, PatriarhiaItem } from "./sources/patriarhia.ts";

export type SourceKey = "doxologia" | "patriarhia" | "oca" | "coptic" | "armenian" | "overlay";
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
  /** The kind of holiness comes from the list's "feast_type", not from the title. */
  holinessFromList?: boolean;
  armenianMonth?: string;
  /** For patriarhia items: cross and colour. */
  cross?: string | null;
  color?: string;
}

export interface SourceData {
  accessed: string;
  patriarhia: PatriarhiaDay[];
  doxologia: DoxologiaListing[];
  oca: OcaListing[];
  coptic: CopticEntry[];
  armenian: ArmenianEntry[];
  overlays: OverlayEntry[];
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
      units.push({
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
      });
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
  const t = title.replace(/\.$/, "").trim();
  const event: ParsedTitle = { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title };
  // "The Angels' Annunciation of John the Baptist to Zacharias": an event of the saint announced.
  const announced = /^(?:The )?(?:Angels?['’]s? )?Annunciation of (?:the )?(.+?) to \p{Lu}/u.exec(t);
  if (announced?.[1]) return { ...event, subject: parseEn(stripCopticTitles(announced[1])) };
  const church = copticChurch(t, title);
  if (church) return church;
  // Councils, churches, earthquakes …: events, not saints.
  if (/^(?:The |A )?(?:Assembly|Council|Synod|Re-?Opening|Opening|Building|Construction|Consecration|Dedication|Earthquake|Great Earthquake|Feast|Miracle|Arrival|Coming|Flight|Entrance|Appearance of the Body|Renewal|Restoration|Pilgrimage)\b/i.test(t) && !/\bof (?:St\.?|Saint|Sts\.?|Saints|the (?:Holy |Great )?(?:Martyr|Apostle|Prophet|Archangel))\b/i.test(t)) {
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
      if (/^(?:The )?Martyrdom/i.test(t) && !inner.holiness.some((h) => /martyr/.test(h))) inner.holiness = [...inner.holiness, "martyr"];
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
