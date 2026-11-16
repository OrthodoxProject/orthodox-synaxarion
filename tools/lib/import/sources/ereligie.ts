/**
 * e-religie.ro, the platform of the teachers of Orthodox religion: its synaxarion
 * (/sinaxar/) has one page per month, which links the days, and one page per day
 * (/sinaxar/<month>/sinaxar-ziua-<day>-luna-<month>/), whose table of contents
 * ("Cuprins") names each saint of the day and links the section of his life
 * (#ancora-continut-<n>). Only that table is read: the name as the site writes
 * it, the day and the link; the lives are not copied.
 */
import { cleanText, textOf } from "../html.ts";
import type { PoliteFetcher } from "../fetch.ts";

export const ERELIGIE_URL = "https://e-religie.ro/sinaxar/";

export const MONTHS = [
  "ianuarie",
  "februarie",
  "martie",
  "aprilie",
  "mai",
  "iunie",
  "iulie",
  "august",
  "septembrie",
  "octombrie",
  "noiembrie",
  "decembrie",
] as const;

export interface EReligieDay {
  month: number;
  day: number;
  /** Address of the day's page. */
  url: string;
  /** The day as the month page links it: the saints' names joined by "; ". */
  title: string;
}

export interface EReligieEntry {
  month: number;
  day: number;
  order: number;
  /** The heading of the section, as the site writes it: "Sfântul Preacuviosul Paisie de la Neamț". */
  title: string;
  /** Address of the day's page. */
  url: string;
  /** Id of the section of the page ("ancora-continut-2"), if the table of contents links one. */
  anchor?: string;
}

export function monthUrl(month: number): string {
  return `${ERELIGIE_URL}${MONTHS[month - 1]}/`;
}

/** The days a month page links, in the order of the page. */
export function parseMonth(html: string, month: number): EReligieDay[] {
  const out: EReligieDay[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="(https:\/\/e-religie\.ro\/sinaxar\/[a-z]+\/sinaxar-ziua-(\d{1,2})-luna-(\d{1,2})\/?)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1] ?? "";
    if (Number(m[3]) !== month || seen.has(url)) continue;
    seen.add(url);
    out.push({ month, day: Number(m[2]), url: url.endsWith("/") ? url : `${url}/`, title: cleanText(textOf(m[4] ?? "")) });
  }
  return out;
}

/**
 * The saints of a day page, from its table of contents ("📑 Cuprins:"); a page
 * without one is read from the headings of its sections (`<h2 id="ancora-continut-…">`).
 */
export function parseDay(html: string, day: EReligieDay): EReligieEntry[] {
  const entries = (pairs: Array<{ anchor?: string; title: string }>): EReligieEntry[] =>
    pairs
      .filter((p) => p.title)
      .map((p, order) => {
        const entry: EReligieEntry = { month: day.month, day: day.day, order, title: p.title, url: day.url };
        if (p.anchor) entry.anchor = p.anchor;
        return entry;
      });
  const toc = /Cuprins:\s*<\/h\d>\s*<ul>([\s\S]*?)<\/ul>/i.exec(html);
  if (toc) {
    const pairs: Array<{ anchor?: string; title: string }> = [];
    const re = /<li>\s*(?:<a[^>]+href=['"]#([^'"]+)['"][^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(toc[1] ?? ""))) {
      const pair: { anchor?: string; title: string } = { title: cleanText(textOf(m[2] ?? "")) };
      if (m[1]) pair.anchor = m[1];
      pairs.push(pair);
    }
    if (pairs.length > 0) return entries(pairs);
  }
  const pairs: Array<{ anchor?: string; title: string }> = [];
  const re = /<h2[^>]+id=['"](ancora-continut-\d+)['"][^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) pairs.push({ anchor: m[1] ?? "", title: cleanText(textOf(m[2] ?? "")) });
  return entries(pairs);
}

/**
 * Headings that name no commemoration: the synaxarion of e-religie.ro is the one of the Lives of the Saints, whose
 * days also hold homilies ("Cuvânt la Acoperământul …"), stories ("Povestire despre ostașul Taxiot", "Minunea …",
 * "Monahul care n-a osândit pe nimeni"), lists of other saints ("Alți sfinți pomeniți la 3 noiembrie") and notes of
 * the day ("(Ajunul Bobotezei – Post)").
 */
const NOT_A_COMMEMORATION = /^(?:\(|Cuvânt\b|Povestire\b|Povestirea\b|Minunea\b|Minunile\b|Din minunile\b|Alți sfinți\b|Monahul\b|Despre (?!Icoana\b|alt\b|alți\b))/i;

/**
 * Lines checked by hand that keep no commemoration of their own: stories told on the day (an unknown hermit, 4
 * February; the three women found on a mountain, 10 September), the history of an icon told on the day of another (the
 * Hodegetria, on the day of the Tikhvin icon, 26 June) and a heading whose names are those of the heretics condemned by
 * the council of Pope Martin (14 April).
 */
const LEFT_OUT = new Set([
  "Pomenirea unui sihastru necunoscut",
  "Sfintele trei femei, ce s-au aflat într-un munte pustiu",
  "Icoana Maicii Domnului Odighitria",
  "Sf. Mărturisitori episcopi de Apus: Serghie, Pir și Teodor",
]);

/** Genitive honorifics that open the name of a saint ("Viața Cuviosului Iosif", "Pătimirea Sfinților Mucenici …"). */
const GENITIVE_SAINT = /^(?:Sf\.|Sfântului|Sfintei|Sfinților|Sfintelor|Cuviosului|Cuvioasei|Cuvioșilor|Cuvioaselor|Preacuviosului|Dreptului|Dreptei|Fericitului|Fericitei|Proorocului|Prorocului|Apostolului|Ierarhului|Mucenicului|Muceniței|Evlaviosului|Binecredinciosului)\s/;

/** Genitive honorifics and the words around them, in the nominative of the calendars. */
const NOMINATIVE: Array<[RegExp, string]> = [
  [/\bSfântului\b/g, "Sfântul"],
  [/\bSfintei\b/g, "Sfânta"],
  [/\bSfinților\b/g, "Sfinții"],
  [/\bSfintelor\b/g, "Sfintele"],
  [/\bPreacuviosului\b/g, "Preacuviosul"],
  [/\bCuviosului\b/g, "Cuviosul"],
  [/\bCuvioasei\b/g, "Cuvioasa"],
  [/\bCuvioșilor\b/g, "Cuvioșii"],
  [/\bCuvioaselor\b/g, "Cuvioasele"],
  [/\bPărintelui\b/g, "Părintele"],
  [/\bPărinților\b/g, "Părinții"],
  [/\bDreptului\b/g, "Dreptul"],
  [/\bDreptei\b/g, "Dreapta"],
  [/\bFericitului\b/g, "Fericitul"],
  [/\bFericitei\b/g, "Fericita"],
  [/\bProorocului\b/g, "Proorocul"],
  [/\bProrocului\b/g, "Prorocul"],
  [/\bApostolului\b/g, "Apostol"],
  [/\bApostolilor\b/g, "Apostoli"],
  [/\bIerarhului\b/g, "Ierarh"],
  [/\bMucenicului\b/g, "Mucenic"],
  [/\bMucenicilor\b/g, "Mucenici"],
  [/\bMuceniței\b/g, "Muceniță"],
  [/\bMucenițelor\b/g, "Mucenițe"],
  [/\bMarelui\b/g, "Mare"],
  [/\bEvlaviosului\b/g, "Binecredinciosul"],
  [/\bBinecredinciosului\b/g, "Binecredinciosul"],
  [/\bnostru\b/g, ""],
];

/**
 * Headings of feasts, relics and icons in the words of the Lives of the Saints, and the same in the words of the
 * calendars ("Cinstita Adormire a Preasfintei Măritei Stăpânei noastre …" is "Adormirea Maicii Domnului").
 */
const CALENDAR_FORMS: Array<[RegExp, string]> = [
  [/^Bunavestire\b.*$/i, "Buna Vestire"],
  [/^Cinstita Adormire\b.*$/i, "Adormirea Maicii Domnului"],
  [/^Pomenirea nașterii Preasfintei\b.*$/i, "Nașterea Maicii Domnului"],
  [/^Pomenirea Înălțării Cinstitei\b.*Cruci\b.*$/i, "Înălțarea Sfintei Cruci"],
  [/^Scoaterea Cinstitei\b.*Cruci\b.*$/i, "Scoaterea Sfintei Cruci"],
  [/^Afl?area Sfintei Cruci\b.*$/i, "Aflarea Sfintei Cruci"],
  [/^Gheorghe croitorul\b/, "Sfântul Gheorghe croitorul"],
  [/^Punerea Cinstitului Veșmânt al Maicii Domnului\b.*$/i, "Așezarea veșmântului Maicii Domnului"],
  [/^Zămislirea Fecioarei Maria\b.*$/i, "Zămislirea Sfintei Fecioare Maria"],
  [/^Nașterea Cinstitului Slăvitului Prooroc\b.*Ioan\b.*$/i, "Nașterea Sfântului Proroc Ioan Botezătorul"],
  [/^Tăierea cinstitului cap\b.*Ioan\b.*$/i, "Tăierea capului Sfântului Ioan Botezătorul"],
  [/^Aflarea capului Sfântului Ioan Botezătorul$/i, "Întâia și a doua aflare a capului Sfântului Ioan Botezătorul"],
  [/^A treia aflare a Cinstitului Cap\b.*$/i, "A treia aflare a capului Sfântului Ioan Botezătorul"],
  [/^Pomenirea suirii la cer\b.*Prooroc Ilie Tesviteanul$/i, "Sfântul Prooroc Ilie Tesviteanul"],
  [/^Sfinții Slăviților\b.*Apostoli Petru și Pavel$/i, "Sfinții Apostoli Petru și Pavel"],
  [/^Sf\. Măriților\b.*Constantin și mama sa Elena$/i, "Sfinții Împărați Constantin și mama sa, Elena"],
  [/^Pomenirea aducerii moaștelor Sf\. Lazar\b.*$/i, "Aducerea moaștelor Sfântului Lazăr, prietenul lui Hristos"],
  // "Aducerea cinstitelor moaște ale Sfântului Apostol Vartolomeu", "Aflarea Cinstitelor Moaște ale Sfintei Fecioare Iuliana"
  [/^(Aducerea|Aflarea|Mutarea) (?:cinstitelor|sfintelor) moaște ale\s+/i, "$1 moaștelor "],
  // "Icoana Maicii Domnului Tihfinsca", "Arătarea Icoanei … Tolgsca", "Pomenirea icoanei Maicii Domnului din Areovind"
  [/^(?:Icoana|Arătarea Icoanei|Pomenirea icoanei)\s+/i, "Cinstirea Icoanei "],
];

/**
 * The heading of a saint in the forms of the calendars, which parseRo reads, or null for a heading that names no
 * commemoration. "Viața Cuviosului Iosif, scriitorul de cântări", "Pătimirea Sfântului Mucenic Amfian" and
 * "Pomenirea Cuviosului Tit, făcătorul de minuni" are the saint's own day; "Despre alt Cuvios Patermutie" and "Alt
 * Sfânt Mucenic Iustin" name another saint of the name kept on the same day.
 */
export function ereligieTitle(heading: string): string | null {
  let t = cleanText(heading);
  if (NOT_A_COMMEMORATION.test(t) || LEFT_OUT.has(t)) return null;
  // A stray bracket ("Sf. Mc. Maxim]", 7 May).
  if (!t.includes("[")) t = t.replace(/\]/g, "").trim();
  t = t.replace(/^Despre\s+/i, "").replace(/^(?:alt|alți|alte|altă)\s+/i, "");
  for (const [re, to] of CALENDAR_FORMS) t = t.replace(re, to);
  const own = /^(?:Viața|Pătimirea|Pomenirea|Nevoințele)\s+(.*)$/i.exec(t);
  if (own?.[1] && GENITIVE_SAINT.test(own[1])) {
    // Only the honorifics and the saint's name turn to the nominative, not the words after the first comma.
    const comma = own[1].indexOf(",");
    const head = comma < 0 ? own[1] : own[1].slice(0, comma);
    t = NOMINATIVE.reduce((s, [re, to]) => s.replace(re, to), head) + (comma < 0 ? "" : own[1].slice(comma));
  } else if (GENITIVE_SAINT.test(t) && !/^Sf\./.test(t)) {
    t = NOMINATIVE.reduce((s, [re, to]) => s.replace(re, to), t);
  }
  return calendarHonorifics(
    t
      .replace(/^Sfânt\s/, "Sfântul ")
      // "Cuvioasa Maică Matroana", "Cuvioasa Maica noastră Eufrosina": the calendars write "Cuvioasa Matroana".
      .replace(/^((?:Sfânta\s+)?(?:Cuvioasa|Preacuvioasa|Cuv\.))\s+Maic[aă](?:\s+noastră)?\s+(?=\p{Lu})/u, "$1 ")
      // "Sfântul și Marele Mucenic Talaleu", "Sfântul Sfințit Mucenic …": the honorifics of the calendars.
      .replace(/^Sfântul și Marele\s/, "Sfântul Mare ")
      // "Cuv. Varsanufie, „Marele Bătrân”", "Cuv. Macarie cel Mare, Egipteanul", "Ștefan cel Mare și Sfânt": epithets, not saints.
      .replace(/,?\s*[„"]([^”"]+)[”"]/g, " $1")
      .replace(/,\s+(\p{Lu}\p{Ll}+ul)(?=\s*(?:,|$))/gu, " $1")
      .replace(/\s+și\s+Sfânt$/, "")
      // "Cuv. Ioan cel sărac pentru Hristos, care s-a mai numit și Colibasul", "Sf. Mc. Calinica și Achilina ce au crezut
      // prin Sf. Mc. Hristofor": what the clause tells is not a name.
      .replace(/,?\s+(?:care|cel ce|cea ce|cei ce|cele ce|ce)\s.*$/, "")
      .replace(/\bfără de argint\b/g, "fără de arginți")
      .replace(/\s+/g, " ")
      .replace(/\s+,/g, ",")
      .trim(),
  );
}

/**
 * The honorifics of a heading in the words of the calendars, so that a saint new to the data is named as the others
 * ("Sf. Cuv. Amona", "Sf. Mc. Teodot"): "Cuviosul Părinte Ioanichie cel Mare" is "Sfântul Cuvios Ioanichie cel Mare",
 * "Sf. sfințit mucenic Taghen" is "Sf. Sfințit Mc. Taghen". The abbreviation "Sf." says no gender, so it stays.
 */
export function calendarHonorifics(title: string): string {
  const t = title
    .replace(/^(?:Sfântul\s+)?(?:Prea)?[Cc]uviosul(?:\s+Părinte(?:le)?(?:\s+nostru)?)?\s+/u, "Sfântul Cuvios ")
    .replace(/^(?:Sfânta\s+)?(?:Prea)?[Cc]uvioasa(?:\s+Maică)?\s+/u, "Sfânta Cuvioasă ")
    .replace(/^(?:Sfinții\s+)?Cuvioșii(?:\s+Părinți)?\s+/u, "Sfinții Cuvioși ")
    .replace(/^(?:Sfintele\s+)?Cuvioasele\s+/u, "Sfintele Cuvioase ")
    .replace(/^Sfântul Sfințitul\s+/u, "Sfântul Sfințit ")
    .replace(/^Cuv\.\s+/u, "Sf. Cuv. ");
  if (!/^Sf\.\s/.test(t)) return t;
  // After "Sf.", the words of the honorific as the official calendar abbreviates them.
  return t
    .replace(/^Sf\.\s+(?:[Ss]fințit(?:ul)?)\s+(?:[Mm]ucenic|Mc\.)(?![\p{L}])/u, "Sf. Sfințit Mc.")
    .replace(/^Sf\.\s+(?:[Nn]oul(?:ui)?|[Nn]ou)\s+(?:[Mm]ucenic|Mc\.)(?![\p{L}])/u, "Sf. Nou Mc.")
    .replace(/^Sf\.\s+(?:[Mm]ucenic(?:ul)?|[Mm]ucenița|[Mm]ucenici)(?![\p{L}])/u, "Sf. Mc.")
    .replace(/^Sf\.\s+(?:[Cc]uvios(?:ul)?|[Cc]uvioasa|[Cc]uvioși)(?![\p{L}])/u, "Sf. Cuv.")
    .replace(/^Sf\.\s+[Pp]ro?oroc(?:ul)?(?![\p{L}])/u, "Sf. Proroc")
    .replace(/^Sf\.\s+[Aa]postol(?:ul)?(?![\p{L}])/u, "Sf. Ap.")
    .replace(/^Sf\.\s+[Ii]erarh(?:ul)?(?![\p{L}])/u, "Sf. Ier.");
}

/** Link of an entry: the day's page, at the section of the saint when there is one. */
export function entryUrl(entry: EReligieEntry): string {
  return entry.anchor ? `${entry.url}#${entry.anchor}` : entry.url;
}

export async function crawl(fetcher: PoliteFetcher, log: (message: string) => void = () => {}): Promise<EReligieEntry[]> {
  const all: EReligieEntry[] = [];
  for (let month = 1; month <= 12; month++) {
    const days = parseMonth(await fetcher.get(monthUrl(month)), month);
    if (days.length === 0) log(`e-religie.ro: no days found on ${monthUrl(month)}`);
    for (const day of days) {
      const found = parseDay(await fetcher.get(day.url), day);
      if (found.length === 0) log(`e-religie.ro: no saints found on ${day.url}`);
      all.push(...found);
    }
  }
  all.sort((a, b) => a.month - b.month || a.day - b.day || a.order - b.order);
  return all;
}
