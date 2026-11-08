/**
 * Clusters: one commemoration as the sources together describe it. A cluster
 * gathers the units of every source that list it on the same church day, and
 * holds its subjects (persons as slots, a group, an icon or a saint referred to
 * by a relics or event line).
 */
import type { Gender, HolinessType, NamePart, ParsedTitle, TitleKind } from "./model.ts";
import { fold, givenSimilarity, nameSimilarity, skeleton } from "./names.ts";
import { abbreviateRo } from "./ro.ts";
import type { Citation, Family, Unit } from "./units.ts";

export interface SlotName {
  part: NamePart;
  display: string;
  full?: string;
  short: string;
  variants: Set<string>;
}

/** A person, subject of a commemoration. */
export interface Slot {
  ro?: SlotName;
  en?: SlotName;
  ar?: SlotName;
  gender?: Gender;
  holiness: Set<HolinessType>;
  ext: { oca?: string; doxologia?: string; copticchurch?: string };
  citations: Citation[];
  /** References for readers, by locale. */
  refs: Map<string, Citation[]>;
  existingPerson?: string;
  personId?: string;
  angel?: boolean;
  family: Family;
  /** Other spellings, used only to recognise the person. */
  alts: NamePart[];
  /** Sources and days whose units already landed on this person ("oca@01-17"): one unit per source and day. */
  matched: Set<string>;
}

export interface GroupSubject {
  count?: number;
  holiness: Set<HolinessType>;
  ro?: string;
  en?: string;
  ar?: string;
  names: NamePart[];
  ext: { oca?: string; doxologia?: string; copticchurch?: string };
  citations: Citation[];
  refs: Map<string, Citation[]>;
  existingGroup?: string;
  groupId?: string;
  synaxis?: boolean;
}

export interface IconSubject {
  ro?: string;
  en?: string;
  citations: Citation[];
  refs: Map<string, Citation[]>;
  existingIcon?: string;
  iconId?: string;
}

export type ClusterKind = Exclude<TitleKind, "saint" | "saints" | "movable" | "skip"> | "persons";

export interface Cluster {
  uid: string;
  family: Family;
  kind: ClusterKind;
  month: number;
  day: number;
  leapDay?: boolean;
  durationDays?: number;
  slots: Slot[];
  group?: GroupSubject;
  icon?: IconSubject;
  /** The saint a relics, event or synaxis line is about, as parsed. */
  subjectTitles: ParsedTitle[];
  subjectSlots: Slot[];
  subjectGroup?: GroupSubject;
  feast?: string;
  council?: number;
  titles: { ro?: string; en?: string; ar?: string };
  citations: Citation[];
  refs: Map<string, Citation[]>;
  ext: { oca?: string; copticchurch?: string; doxologia?: string };
  units: Unit[];
  existingComm?: string;
  commId?: string;
  note?: string;
}

const MARTYR_LIKE = new Set<HolinessType>(["martyr", "great_martyr", "hieromartyr", "venerable_martyr", "new_martyr"]);

function category(h: Set<HolinessType>): Set<string> {
  const out = new Set<string>();
  for (const x of h) {
    if (MARTYR_LIKE.has(x)) out.add("martyr");
    else if (x === "venerable" || x === "hermit" || x === "stylite" || x === "recluse") out.add("venerable");
    else if (x === "hierarch") out.add("hierarch");
    else if (x === "apostle" || x === "evangelist" || x === "equal_to_apostles") out.add("apostle");
    else if (x === "prophet" || x === "forefather" || x === "righteous") out.add("prophet");
    else if (x === "archangel") out.add("angel");
  }
  return out;
}

export function holinessCompatible(a: Set<HolinessType>, b: Set<HolinessType>): boolean {
  const ca = category(a);
  const cb = category(b);
  if (ca.size === 0 || cb.size === 0) return true;
  for (const x of ca) if (cb.has(x)) return true;
  // "martyr" sits well with many others: a hieromartyr is also a hierarch, and so on.
  if ((ca.has("martyr") && (cb.has("hierarch") || cb.has("venerable"))) || (cb.has("martyr") && (ca.has("hierarch") || ca.has("venerable")))) return true;
  return false;
}

/**
 * The stricter test for the bare names of the orthodox-calendar lists: a
 * martyr is not a hierarch ("New Martyr Nicolas Karamos" is not "Nicholas of
 * Myra"), a monk is not a martyr ("Justin of Ćelije" is not "Justin the
 * Philosopher"). Monks and hierarchs go together (a bishop was a monk first);
 * "righteous" says nothing, since the importers use it when the title is silent.
 */
export function holinessAgrees(a: Set<HolinessType>, b: Set<HolinessType>): boolean {
  const kinds = (h: Set<HolinessType>): Set<string> => {
    const out = new Set<string>();
    for (const x of h) {
      if (MARTYR_LIKE.has(x)) out.add("martyr");
      if (x === "hierarch" || x === "hieromartyr" || x === "venerable" || x === "venerable_martyr" || x === "hermit" || x === "stylite" || x === "recluse") out.add("monastic");
      if (x === "apostle" || x === "evangelist" || x === "equal_to_apostles") out.add("apostle");
      if (x === "prophet" || x === "forefather") out.add("prophet");
      if (x === "archangel") out.add("angel");
    }
    return out;
  };
  const ka = kinds(a);
  const kb = kinds(b);
  if (ka.size === 0 || kb.size === 0) return true;
  for (const x of ka) if (kb.has(x)) return true;
  return false;
}

/** Regnal number of a name ("Sava II", "Eustathius I, Archbishop of Serbia", "Sava al III-lea"). */
export function numeralOf(part: NamePart): string | undefined {
  return /(?:^|\s)(?:al\s+)?([IVX]{1,4})(?:-lea)?(?=[\s,]|$)/.exec(part.text)?.[1];
}

/** Two names whose places ("of Gornjak" / "of Grigoriou") or numbers ("I" / "II") disagree. */
export function namesConflict(a: NamePart, b: NamePart): boolean {
  const na = numeralOf(a);
  const nb = numeralOf(b);
  if (na && nb && na !== nb) return true;
  const pa = placeKeys(a);
  const pb = placeKeys(b);
  return pa.length > 0 && pb.length > 0 && !pa.some((x) => pb.some((y) => x === y || nameSimilarity(x, y) >= 0.75));
}

/** Common words of English and Romanian titles, normalised so that both languages compare. */
const EPITHETS: Array<[RegExp, string]> = [
  [/^(mare|marele|great)$/, "great"],
  [/^(nou|noul|new|younger|tanar)$/, "new"],
  [/^(marturisitorul|confessor)$/, "confessor"],
  [/^(teologul|theologian)$/, "theologian"],
  [/^(taumaturgul|wonderworker|facatorul)$/, "wonderworker"],
  [/^(sirul|syrian|sirian)$/, "syrian"],
  [/^(persul|persian|persia)$/, "persia"],
  [/^(egipteanul|egyptian|egypt)$/, "egypt"],
  [/^(romanul|roman|rome|roma|romei)$/, "rome"],
  [/^(stalpnicul|stylite)$/, "stylite"],
  [/^(pustnicul|sihastrul|hermit|anchorite)$/, "hermit"],
  [/^(zavoratul|recluse)$/, "recluse"],
  [/^(milostivul|merciful|almsgiver)$/, "merciful"],
  [/^(gura|chrysostom|hrisostom)$/, "chrysostom"],
  [/^(botezatorul|baptist)$/, "baptist"],
  [/^(inaintemergatorul|forerunner)$/, "forerunner"],
  [/^(imnograful|hymnographer|hymnographer)$/, "hymnographer"],
  [/^(hozevitul|chozebite|choziba)$/, "chozebite"],
  [/^(decapolitul|decapolite)$/, "decapolite"],
  [/^(stratilat|stratelates|general)$/, "stratelates"],
  [/^(studitul|studite|studion|studium)$/, "studion"],
  [/^(ivirul|iviron|iveron|iberia|iberian|ivir)$/, "iveron"],
  [/^(sinaitul|sinai|sinaite)$/, "sinai"],
  [/^(athonitul|athonite|athos|aghioritul|hagiorite)$/, "athos"],
  [/^(sarovul|sarov)$/, "sarov"],
  [/^(cretanul|criteanul|crete|cretan)$/, "crete"],
  [/^(alexandrinul|alexandrian|alexandria)$/, "alexandria"],
  [/^(antiohianul|antioch|antiohiei)$/, "antioch"],
  [/^(ierusalimului|jerusalem|ierusalim)$/, "jerusalem"],
  [/^(constantinopolului|constantinople|constantinopol)$/, "constantinople"],
  [/^(sutasul|centurion)$/, "centurion"],
  [/^(diaconul|deacon)$/, "deacon"],
  [/^(preotul|presbyter|priest)$/, "priest"],
  [/^(tacutul|silent)$/, "silent"],
  [/^(postitorul|faster)$/, "faster"],
  [/^(iconograful|iconographer)$/, "iconographer"],
  [/^(lepros|leper)$/, "leper"],
  [/^(tiron|tyro|recruit)$/, "tyro"],
  [/^(izvoratorul|myrrh-gusher|myrrh-streaming)$/, "myrrh"],
];

/** Normalised extra words of a name, for comparison across languages. */
export function extraKeys(part: NamePart): string[] {
  return part.text
    .split(/[\s,()]+/)
    .slice(1)
    .map((w) => fold(w).replace(/[^a-z-]/g, ""))
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => {
      for (const [re, key] of EPITHETS) if (re.test(w)) return `=${key}`;
      return skeleton(w);
    })
    .filter((w) => w.length >= 2);
}

const STOP = new Set([
  "din", "de", "la", "cel", "cea", "cei", "cele", "si", "al", "ale", "ai", "lui", "in", "cu", "pe", "sa", "lor", "sau", "ca", "dupa", "the", "of", "and", "at", "near", "from", "by", "with", "who", "on", "to", "his", "her", "their", "saint", "holy",
  "episcopul", "episcop", "arhiepiscopul", "arhiepiscop", "mitropolitul", "patriarhul", "bishop", "archbishop", "metropolitan", "patriarch", "pope", "papa", "abbot", "igumen", "egumenul", "monk", "nun", "deacon", "diaconul", "presbyter", "preotul", "priest", "virgin", "fecioara", "martyr", "mucenic", "venerable", "cuvios", "founder", "ctitorul", "disciple", "ucenicul", "mother", "mama", "wife", "sotia", "sister", "sora", "brother", "fratele", "monastery", "manastirea", "manastirii", "mount", "muntele", "city", "orasul", "lavra", "caves", "pesterile", "near", "langa", "church", "biserica", "all", "first", "intai", "sfantul", "sfanta", "sfintilor", "sfantului", "sf",
]);

/** How well two names designate the same person, from 0 to about 1.4. */
export function personScore(a: NamePart, b: NamePart, crossLanguage: boolean): number {
  const g = givenSimilarity(a, b);
  if (g < 0.6) return 0;
  const ea = extraKeys(a);
  const eb = extraKeys(b);
  let overlap = 0;
  for (const x of ea) {
    if (eb.some((y) => x === y || (!x.startsWith("=") && !y.startsWith("=") && (nameSimilarity(x, y) >= 0.75 || commonPrefix(x, y) >= 3)))) overlap++;
  }
  let score = g + 0.2 * Math.min(overlap, 2);
  // Epithets and places that share nothing: two different saints of the same name.
  if (ea.length > 0 && eb.length > 0 && overlap === 0) score -= 0.25;
  // Two different places ("of Dymsk" / "din Veria") are two different saints, in any language.
  const pa = placeKeys(a);
  const pb = placeKeys(b);
  if (pa.length > 0 && pb.length > 0 && !pa.some((x) => pb.some((y) => x === y || nameSimilarity(x, y) >= 0.75))) score -= crossLanguage ? 0.3 : 0.1;
  if (a.gender && b.gender && a.gender !== b.gender && !a.genderGuess && !b.genderGuess) score -= 0.3;
  // "Eustathius I" and "Eustathius II" are two archbishops.
  const na = numeralOf(a);
  const nb = numeralOf(b);
  if (na && nb && na !== nb) score -= 1;
  return score;
}

/** Skeletons of the places in a name ("din Veria", "of Dymsk", "de la Calapodești"). */
export function placeKeys(part: NamePart): string[] {
  const out: string[] = [];
  const re = /\b(?:din|de la|de|of|from|at|in)\s+(\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)?)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(part.text))) {
    for (const w of (m[1] ?? "").split(/\s+/)) {
      const f = fold(w).replace(/[^a-z]/g, "");
      if (f.length > 2 && !STOP.has(f)) out.push(skeleton(f));
    }
  }
  // The see of a bishop, in the Romanian genitive: "Episcopul Ciprului", "Patriarhul Ierusalimului".
  const see = /\b(?:arhi)?episcop(?:ul)?\s+(?:al\s+|de\s+)?(\p{Lu}[\p{L}-]*)|\b(?:mitropolitul|patriarhul|papa)\s+(\p{Lu}[\p{L}-]*)/giu;
  while ((m = see.exec(part.text))) {
    const word = fold(m[1] ?? m[2] ?? "")
      .replace(/[^a-z]/g, "")
      .replace(/(ului|iei|ei|lor|ilor|ii)$/, "");
    if (word.length > 2) out.push(skeleton(word));
  }
  return out;
}

function commonPrefix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

export function newSlot(family: Family): Slot {
  return { holiness: new Set(), ext: {}, citations: [], refs: new Map(), family, alts: [], matched: new Set() };
}

export function addRef(map: Map<string, Citation[]>, locale: string, c: Citation): void {
  const list = map.get(locale) ?? [];
  if (!list.some((x) => x.url === c.url && x.source === c.source && x.locator === c.locator)) list.push(c);
  map.set(locale, list);
}

export function addCitation(list: Citation[], c: Citation): void {
  if (!list.some((x) => x.url === c.url && x.source === c.source && x.locator === c.locator)) list.push(c);
}

/** Singular English honorific for one name of a list ("Martyrs" → "Martyr"). */
const SINGULAR_EN = new Set(["martyrs", "hieromartyrs", "apostles", "prophets", "confessors", "venerables", "monks", "nuns", "virgins", "leaders", "fathers", "mothers", "hierarchs", "bishops", "passion-bearers", "newmartyrs", "wonderworkers", "princes", "myrrhbearers", "archangels", "deacons", "presbyters", "priests", "forefathers", "brothers", "sisters", "physicians", "ancestors"]);

/** Titles of a woman named after a man in the same line ("Emperor Constantine with his Mother Helen"). */
const FEMALE_EN: Record<string, string> = { emperor: "Empress", king: "Queen", prince: "Princess", tsar: "Tsaritsa" };

export function singularEn(honorific: string, gender?: Gender): string {
  const words = honorific.split(/\s+/).filter(Boolean);
  return words
    .map((w, i) => {
      const lw = w.toLowerCase().replace(/[,:]$/, "");
      if (lw === "unmercenaries") return "Unmercenary";
      if (lw === "saints" || lw === "sts.") return "Saint";
      if (lw === "equals") return w.replace(/s([,:]?)$/i, "$1");
      if (gender === "female" && FEMALE_EN[lw]) return w.replace(/^\w+/, FEMALE_EN[lw] ?? "");
      // "Equals of the Apostles", "Leaders of the Apostles": the apostles stay many.
      if (i >= 2 && words[i - 1]?.toLowerCase() === "the" && words[i - 2]?.toLowerCase() === "of") return w;
      return SINGULAR_EN.has(lw) ? w.replace(/s([,:]?)$/i, "$1") : w;
    })
    .join(" ")
    .replace(/^(Holy )?$/, "Saint");
}

const RO_SINGULAR: Record<string, [string, string]> = {
  sfintii: ["Sfântul", "Sfânta"],
  sfinti: ["Sfântul", "Sfânta"],
  sfintele: ["Sfântul", "Sfânta"],
  mucenici: ["Mucenic", "Muceniță"],
  mucenite: ["Mucenic", "Muceniță"],
  cuviosi: ["Cuvios", "Cuvioasă"],
  cuvioase: ["Cuvios", "Cuvioasă"],
  ierarhi: ["Ierarh", "Ierarh"],
  apostoli: ["Apostol", "Apostol"],
  proroci: ["Proroc", "Prorociță"],
  drepti: ["Drept", "Dreaptă"],
  dreptii: ["Dreptul", "Dreapta"],
  sfintiti: ["Sfințit", "Sfințită"],
  mari: ["Mare", "Mare"],
  marturisitori: ["Mărturisitor", "Mărturisitoare"],
  imparati: ["Împărat", "Împărăteasă"],
  mironosite: ["Mironosiță", "Mironosiță"],
  doctori: ["Doctor", "Doctor"],
  martiri: ["Martir", "Martiră"],
  fecioare: ["Fecioară", "Fecioară"],
  tari: ["Țar", "Țarină"],
  printi: ["Prinț", "Prințesă"],
  diaconi: ["Diacon", "Diaconiță"],
  preoti: ["Preot", "Preot"],
  fericitii: ["Fericitul", "Fericita"],
};

/** Singular Romanian honorific for one name of a list, in the calendar's abbreviations. */
export function singularRo(honorific: string, gender: Gender | undefined): string {
  const female = gender === "female";
  const words = honorific.split(/\s+/).filter(Boolean);
  const out = words.map((w) => {
    const pair = RO_SINGULAR[fold(w)];
    return pair ? (female ? pair[1] : pair[0]) : w;
  });
  return abbreviateRo(out.join(" "));
}

export function displayOf(parsed: ParsedTitle, part: NamePart, lang: "ro" | "en", single: boolean): { display: string; full?: string } {
  if (single) {
    if (lang === "ro") {
      const title = parsed.title.replace(/\s*\((?:[^()]*\b(?:Har[țţ]i|Post|aliturgic|Tedeum|Anul Nou|Dezlegare|Canonul Mare|Pomenirea celor adormi|S[âa]mb[ăa]ta|Duminica|[ÎI]nceputul|Ajunul|L[ăa]satul|Denia|Mo[șş]ii|Ziua)[^()]*)\)\s*$/i, "").trim();
      const abbreviated = /^Sf\./.test(title) ? title : abbreviateRo(title);
      const r: { display: string; full?: string } = { display: abbreviated };
      if (!/^Sf\./.test(title)) r.full = title;
      return r;
    }
    return { display: parsed.title.replace(/\.$/, "").trim() };
  }
  const honorific = lang === "ro" ? singularRo(parsed.honorific, part.gender) : singularEn(parsed.honorific, part.gender);
  return { display: `${honorific ? `${honorific} ` : ""}${part.text}`.trim() };
}
