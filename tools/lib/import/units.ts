/**
 * Turns what the sources list into units: one commemoration as one source
 * writes it, with its church date, its parsed title and its link.
 */
import { parseEn } from "./en.ts";
import type { ParsedTitle } from "./model.ts";
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
  // Councils, churches, earthquakes …: events, not saints.
  if (/^(?:The |A )?(?:Assembly|Council|Synod|Re-?Opening|Opening|Building|Construction|Consecration|Dedication|Earthquake|Great Earthquake|Feast|Miracle|Arrival|Coming|Flight|Entrance|Appearance of the Body|Renewal|Restoration|Pilgrimage)\b/i.test(t) && !/\bof (?:St\.?|Saint|Sts\.?|Saints|the (?:Holy |Great )?(?:Martyr|Apostle|Prophet|Archangel))\b/i.test(t)) {
    return event;
  }
  let m: RegExpExecArray | null;
  if ((m = /^(?:(?:The )?(?:Departure|Martyrdom|Commemoration|Repose|Death|Burial|Celebration|Feast)s? of (?:the )?)+(.*)$/i.exec(t))) {
    const person = stripCopticTitles(m[1] ?? "").replace(/(,|\band)\s+(?:St|Sts|Saint|Saints)\.?\s+/g, "$1 ");
    // "St. Gregory the Illuminator’s torments and commitment to the pit": an event of that saint.
    const owner = /^(.*?)['’]s\s+(?:torments|deliverance|commitment|relics|discovery|finding|translation|hand|head|body|miracle)/i.exec(person);
    if (owner?.[1]) return { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title, subject: parseEn(owner[1]) };
    const inner = parseEn(person);
    if (inner.kind === "saint" || inner.kind === "saints" || inner.kind === "group") {
      if (/^(?:The )?Martyrdom/i.test(t) && !inner.holiness.some((h) => /martyr/.test(h))) inner.holiness = [...inner.holiness, "martyr"];
      // The person is named without "The Departure of"; the line keeps it as the day's title.
      return { ...inner, title: person };
    }
    return { ...inner, title };
  }
  if ((m = /^(?:The )?(?:Consecration|Dedication) of (?:the )?Church of (?:the )?(?:Saint |St\.? |Sts\.? )?(.*)$/i.exec(t))) {
    return { kind: "event", holiness: [], plural: false, honorific: "", rest: t, names: [], title, subject: parseEn(stripCopticTitles(m[1] ?? "")) };
  }
  const turning = /^(?:The )?Turning Over of the (?:Relics|Body) of (?:the )?(.*?)(?: by \w+.*)?$/i.exec(t);
  if (turning?.[1]) return { kind: "relics_translation", holiness: [], plural: false, honorific: "", rest: t, names: [], title, subject: parseEn(stripCopticTitles(turning[1])) };
  if (/^(?:The )?(?:Appearance|Apparition|Translocation|Translation|Transfer|Return)\b/i.test(t)) {
    const p = parseEn(t);
    return { ...p, title };
  }
  const p = parseEn(stripCopticTitles(t));
  return { ...p, title };
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

export function overlayUnits(data: SourceData): Unit[] {
  return data.overlays.map((e) => {
    const parsed = parseEn(e.title);
    const unit: Unit = {
      uid: `overlay:${e.tradition}:${mmdd(e.month, e.day)}#${e.order}`,
      source: "overlay",
      family: "byzantine",
      lang: "en",
      title: e.title,
      parsed: parsed.kind === "skip" ? { ...parseEn(e.name), title: e.title } : parsed,
      month: e.month,
      day: e.day,
      order: e.order,
      citation: { source: "src:orthodox-calendar", locator: `backend/app/data/traditions/${e.file}`, accessed: data.accessed },
      ext: {},
      tradition: e.tradition,
    };
    if (e.url) unit.url = e.url;
    return unit;
  });
}
