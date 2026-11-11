/**
 * Calendar Creștin Ortodox of the Romanian Patriarchate (calendar.patriarhia.ro).
 * The home page embeds the whole year as JSON (copData.calendarData): for every
 * day, the title printed in the official calendar, with the crosses and their
 * colours, and a link to the day's page. Only facts are used (what is
 * celebrated, on which day, with which cross); the synaxarion texts and the
 * readings' texts are not copied. The synaxarion of the day is read only to
 * tell apart two saints of one name (see Builder.evidence).
 */
import { cleanText, decodeEntities } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const PATRIARHIA_URL = "https://calendar.patriarhia.ro/";

export type CrossColor = "red" | "blue" | "black";

export interface PatriarhiaItem {
  /** Text of one ';'-separated part of the day's title, cleaned. */
  text: string;
  /** "(†)", "†)", "†" or null. */
  cross: string | null;
  color: CrossColor;
}

export interface PatriarhiaDay {
  year: number;
  month: number;
  day: number;
  url: string;
  items: PatriarhiaItem[];
  /** The whole title, as text. */
  title: string;
  /** "Anul Nou", national days … */
  subtitle: string;
  publicHoliday: boolean;
  /** The day's synaxarion, as text, in the sections its headings open ("Sf. Zosima din Palestina"). */
  synaxarion?: SynaxarionSection[];
}

export interface SynaxarionSection {
  /** The heading that opens the section; "" before the first heading. */
  heading: string;
  text: string;
}

/** Splits the HTML of a synaxarion into the sections its headings open. */
export function synaxarionSections(html: string): SynaxarionSection[] {
  const text = (h: string): string => cleanText(decodeEntities(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")));
  const out: SynaxarionSection[] = [];
  const re = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let heading = "";
  let start = 0;
  let m: RegExpExecArray | null;
  const push = (end: number): void => {
    const body = text(html.slice(start, end));
    if (heading || body) out.push({ heading, text: body });
  };
  while ((m = re.exec(html))) {
    push(m.index);
    heading = text(m[1] ?? "");
    start = m.index + m[0].length;
  }
  push(html.length);
  return out;
}

/** Finds the JSON object assigned to `var copData` in the page. */
export function extractCalendarData(html: string): Record<string, any> {
  const start = html.indexOf("{", html.indexOf("var copData ="));
  if (start < 0) throw new Error("calendar.patriarhia.ro: copData not found");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1)) as Record<string, any>;
  }
  throw new Error("calendar.patriarhia.ro: copData is not closed");
}

function colorOf(style: string): CrossColor | null {
  const m = /color:\s*#([0-9a-f]{6})/i.exec(style);
  if (!m) return null;
  const hex = (m[1] ?? "").toLowerCase();
  if (hex === "1c58bb") return "blue";
  if (hex === "e52b34") return "red";
  return null;
}

/**
 * Splits the title's HTML into ';'-separated items, keeping the colour in force
 * where each item starts (the colour of a span applies to the cross it contains).
 */
export function splitTitle(html: string): PatriarhiaItem[] {
  const runs: Array<{ text: string; color: CrossColor }> = [];
  const stack: CrossColor[] = [];
  const re = /<(\/?)(\w+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      runs.push({ text: decodeEntities(m[4]), color: stack[stack.length - 1] ?? "black" });
      continue;
    }
    const closing = m[1] === "/";
    const tag = (m[2] ?? "").toLowerCase();
    if (tag !== "span") continue;
    if (closing) stack.pop();
    else stack.push(colorOf(m[3] ?? "") ?? stack[stack.length - 1] ?? "black");
  }
  const items: PatriarhiaItem[] = [];
  let text = "";
  let color: CrossColor | null = null;
  const flush = (): void => {
    const cleaned = cleanText(text);
    if (cleaned) {
      const cross = /^(\(†\)|†\)|†)\s*/.exec(cleaned);
      items.push({ text: cross ? cleaned.slice(cross[0].length).trim() : cleaned, cross: cross ? (cross[1] ?? null) : null, color: color ?? "black" });
    }
    text = "";
    color = null;
  };
  for (const run of runs) {
    for (const ch of run.text) {
      if (ch === ";") {
        flush();
        continue;
      }
      if (color === null && ch.trim() !== "") color = run.color;
      text += ch;
    }
  }
  flush();
  // "…puteri: Duminica a 24-a după Rusalii" — a Sunday glued with a colon.
  return items.flatMap((item) => {
    const glued = /^(.*?):\s*(Duminica .*)$/.exec(item.text);
    if (!glued) return [item];
    return [
      { ...item, text: (glued[1] ?? "").trim() },
      { text: (glued[2] ?? "").trim(), cross: null, color: item.color },
    ];
  });
}

export function parseCalendar(html: string): PatriarhiaDay[] {
  const data = extractCalendarData(html);
  const days: PatriarhiaDay[] = [];
  for (const entries of Object.values(data.calendarData as Record<string, any[]>)) {
    for (const e of entries) {
      const ymd = String(e.data_zilei);
      const day: PatriarhiaDay = {
        year: Number(ymd.slice(0, 4)),
        month: Number(ymd.slice(4, 6)),
        day: Number(ymd.slice(6, 8)),
        url: String(e.link ?? ""),
        items: splitTitle(String(e.titlu_acf ?? "")),
        title: cleanText(String(e.titlu_acf ?? "").replace(/<[^>]+>/g, "")),
        subtitle: cleanText(decodeEntities(String(e.subtitlu_acf ?? ""))),
        publicHoliday: e.zi_libera_acf === true,
      };
      const synaxarion = synaxarionSections(String(e.sinaxar_text_acf ?? ""));
      if (synaxarion.length > 0) day.synaxarion = synaxarion;
      days.push(day);
    }
  }
  return days.sort((a, b) => a.month - b.month || a.day - b.day);
}

export async function crawl(fetcher: PoliteFetcher): Promise<PatriarhiaDay[]> {
  return parseCalendar(await fetcher.get(PATRIARHIA_URL));
}
