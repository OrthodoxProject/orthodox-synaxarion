/**
 * Romanian calendar titles, as written by doxologia.ro ("Sfântul Cuvios Lazăr
 * din Muntele Galision") and by the official calendar ("Sf. Cuv. Lazăr din
 * Muntele Galisiei"): kind of line, kind of holiness, gender and names.
 */
import { FEASTS, RO_MOVABLE } from "./feasts.ts";
import type { Gender, HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { equivalent, fold, skeleton } from "./names.ts";

interface Honorific {
  holiness?: HolinessType[];
  gender?: Gender;
  plural?: boolean;
}

/** Honorific words (folded, without the final dot of abbreviations). */
const HONORIFICS: Record<string, Honorific> = {
  sf: {},
  sfantul: { gender: "male" },
  sfanta: { gender: "female" },
  sfintii: { plural: true },
  sfinti: { plural: true },
  sfintele: { plural: true, gender: "female" },
  sfinte: { plural: true, gender: "female" },
  sfantului: { gender: "male" },
  sfintei: { gender: "female" },
  sfintilor: { plural: true },
  cuv: { holiness: ["venerable"] },
  cuvios: { holiness: ["venerable"], gender: "male" },
  cuviosul: { holiness: ["venerable"], gender: "male" },
  cuvioasa: { holiness: ["venerable"], gender: "female" },
  cuviosi: { holiness: ["venerable"], plural: true },
  cuvioase: { holiness: ["venerable"], plural: true, gender: "female" },
  cuviosului: { holiness: ["venerable"], gender: "male" },
  cuvioasei: { holiness: ["venerable"], gender: "female" },
  cuviosilor: { holiness: ["venerable"], plural: true },
  mc: { holiness: ["martyr"] },
  mucenic: { holiness: ["martyr"], gender: "male" },
  mucenicul: { holiness: ["martyr"], gender: "male" },
  mucenita: { holiness: ["martyr"], gender: "female" },
  mucenici: { holiness: ["martyr"], plural: true },
  mucenite: { holiness: ["martyr"], plural: true, gender: "female" },
  mucenicului: { holiness: ["martyr"], gender: "male" },
  mucenitei: { holiness: ["martyr"], gender: "female" },
  mucenicilor: { holiness: ["martyr"], plural: true },
  martir: { holiness: ["martyr"], gender: "male" },
  martiri: { holiness: ["martyr"], plural: true },
  martira: { holiness: ["martyr"], gender: "female" },
  mare: {},
  mari: {},
  sfintit: {},
  sfintiti: { plural: true },
  ier: { holiness: ["hierarch"] },
  ierarh: { holiness: ["hierarch"], gender: "male" },
  ierarhul: { holiness: ["hierarch"], gender: "male" },
  ierarhi: { holiness: ["hierarch"], plural: true },
  ierarhului: { holiness: ["hierarch"], gender: "male" },
  ierarhilor: { holiness: ["hierarch"], plural: true },
  ap: { holiness: ["apostle"] },
  apostol: { holiness: ["apostle"], gender: "male" },
  apostolul: { holiness: ["apostle"], gender: "male" },
  apostoli: { holiness: ["apostle"], plural: true },
  apostolului: { holiness: ["apostle"], gender: "male" },
  apostolilor: { holiness: ["apostle"], plural: true },
  ev: { holiness: ["evangelist"] },
  evanghelist: { holiness: ["evangelist"], gender: "male" },
  evanghelistul: { holiness: ["evangelist"], gender: "male" },
  evanghelistului: { holiness: ["evangelist"], gender: "male" },
  proroc: { holiness: ["prophet"], gender: "male" },
  prooroc: { holiness: ["prophet"], gender: "male" },
  prorocul: { holiness: ["prophet"], gender: "male" },
  proorocul: { holiness: ["prophet"], gender: "male" },
  prorocului: { holiness: ["prophet"], gender: "male" },
  proorocului: { holiness: ["prophet"], gender: "male" },
  proroci: { holiness: ["prophet"], plural: true },
  prorocita: { holiness: ["prophet"], gender: "female" },
  proorocita: { holiness: ["prophet"], gender: "female" },
  drept: { holiness: ["righteous"], gender: "male" },
  dreptul: { holiness: ["righteous"], gender: "male" },
  dreapta: { holiness: ["righteous"], gender: "female" },
  drepti: { holiness: ["righteous"], plural: true },
  dreptii: { holiness: ["righteous"], plural: true },
  drepte: { holiness: ["righteous"], plural: true, gender: "female" },
  dreptului: { holiness: ["righteous"], gender: "male" },
  dreptei: { holiness: ["righteous"], gender: "female" },
  mart: { holiness: ["confessor"] },
  marturisitor: { holiness: ["confessor"], gender: "male" },
  marturisitorul: { holiness: ["confessor"], gender: "male" },
  marturisitoare: { holiness: ["confessor"], gender: "female" },
  marturisitori: { holiness: ["confessor"], plural: true },
  preot: {},
  diacon: {},
  diaconul: {},
  arhidiacon: {},
  intai: {},
  nou: { holiness: ["new_martyr"] },
  noul: { holiness: ["new_martyr"] },
  noua: { holiness: ["new_martyr"], gender: "female" },
  noii: { holiness: ["new_martyr"], plural: true },
  "nou-mucenic": { holiness: ["new_martyr", "martyr"], gender: "male" },
  "noul-mucenic": { holiness: ["new_martyr", "martyr"], gender: "male" },
  mironosita: { holiness: ["myrrhbearer"], gender: "female" },
  mironosite: { holiness: ["myrrhbearer"], plural: true, gender: "female" },
  imparat: { holiness: ["right_believing"], gender: "male" },
  imparatul: { holiness: ["right_believing"], gender: "male" },
  imparati: { holiness: ["right_believing"], plural: true },
  imparateasa: { holiness: ["right_believing"], gender: "female" },
  imparatese: { holiness: ["right_believing"], plural: true, gender: "female" },
  tar: { holiness: ["right_believing"], gender: "male" },
  tari: { holiness: ["right_believing"], plural: true },
  tarina: { holiness: ["right_believing"], gender: "female" },
  voievod: { holiness: ["right_believing"], gender: "male" },
  voievodul: { holiness: ["right_believing"], gender: "male" },
  domnitor: { holiness: ["right_believing"], gender: "male" },
  doamna: { holiness: ["right_believing"], gender: "female" },
  cneaz: { holiness: ["right_believing"], gender: "male" },
  cneaghina: { holiness: ["right_believing"], gender: "female" },
  print: { holiness: ["right_believing"], gender: "male" },
  printul: { holiness: ["right_believing"], gender: "male" },
  printesa: { holiness: ["right_believing"], gender: "female" },
  printi: { holiness: ["right_believing"], plural: true },
  rege: { holiness: ["right_believing"], gender: "male" },
  regele: { holiness: ["right_believing"], gender: "male" },
  regina: { holiness: ["right_believing"], gender: "female" },
  binecredinciosul: { holiness: ["right_believing"], gender: "male" },
  binecredincioasa: { holiness: ["right_believing"], gender: "female" },
  binecredincios: { holiness: ["right_believing"], gender: "male" },
  binecredinciosi: { holiness: ["right_believing"], plural: true },
  fecioara: { holiness: ["virgin"], gender: "female" },
  fecioare: { holiness: ["virgin"], plural: true, gender: "female" },
  stalpnic: { holiness: ["stylite"], gender: "male" },
  stalpnicul: { holiness: ["stylite"], gender: "male" },
  pustnic: { holiness: ["hermit"], gender: "male" },
  pustnica: { holiness: ["hermit"], gender: "female" },
  sihastru: { holiness: ["hermit"], gender: "male" },
  arh: { holiness: ["archangel"], gender: "male" },
  arhanghel: { holiness: ["archangel"], gender: "male" },
  arhanghelul: { holiness: ["archangel"], gender: "male" },
  arhangheli: { holiness: ["archangel"], plural: true },
  arhanghelului: { holiness: ["archangel"], gender: "male" },
  arhanghelilor: { holiness: ["archangel"], plural: true },
  fericitul: { holiness: ["venerable"], gender: "male" },
  fericita: { holiness: ["venerable"], gender: "female" },
  fericit: { holiness: ["venerable"], gender: "male" },
  parinte: { gender: "male" },
  parintii: { plural: true },
  parinti: { plural: true },
  doctor: { holiness: ["unmercenary"], gender: "male" },
  doctori: { holiness: ["unmercenary"], plural: true },
  doctorilor: { holiness: ["unmercenary"], plural: true },
  tribuni: { plural: true },
  episcopi: { holiness: ["hierarch"], plural: true },
  diaconi: { plural: true },
  diaconita: { gender: "female" },
  fericitii: { holiness: ["venerable"], plural: true },
  slavitul: {},
  slavita: {},
  slavitii: { plural: true },
  dumnezeiesti: {},
  dumnezeiestii: {},
  frati: { plural: true },
  intaia: {},
  intaiul: {},
  preoti: { plural: true },
  preotul: {},
  tamaduitor: { holiness: ["unmercenary"], gender: "male" },
  tamaduitorul: { holiness: ["unmercenary"], gender: "male" },
};

const NUMBER_WORDS: Record<string, number> = {
  doi: 2,
  doua: 2,
  trei: 3,
  patru: 4,
  cinci: 5,
  sase: 6,
  sapte: 7,
  opt: 8,
  noua: 9,
  zece: 10,
  doisprezece: 12,
  douasprezece: 12,
  patruzeci: 40,
};

/** Words that start a qualifier rather than a name ("episcopul Nyssei", "mama sa"). */
const LOWER_START = /^[a-zăâîșțşţ]/;

/** Applies a genitive honorific to nominative ("Sfântului Ierarh" → "Sfântul Ierarh"). */
function nominative(text: string): string {
  return text
    .replace(/\bSfântului\b/g, "Sfântul")
    .replace(/\bSfintei\b/g, "Sfânta")
    .replace(/\bSfinților\b/g, "Sfinții")
    .replace(/\bCuvioasei\b/g, "Cuvioasa")
    .replace(/\bCuviosului\b/g, "Cuviosul")
    .replace(/\bDreptului\b/g, "Dreptul")
    .replace(/\bDreptei\b/g, "Dreapta")
    .replace(/\bProorocului\b/g, "Proorocul")
    .replace(/\bProrocului\b/g, "Prorocul")
    .replace(/\bApostolului\b/g, "Apostol")
    .replace(/\bIerarhului\b/g, "Ierarh")
    .replace(/\bMucenicului\b/g, "Mucenic")
    .replace(/\bMucenițe\b(?= [A-ZĂÂÎȘȚ])/g, "Muceniță")
    .replace(/\bMuceniței\b/g, "Muceniță")
    .replace(/\bPreasfintei\b/g, "Preasfânta");
}

function honorificOf(word: string): Honorific | undefined {
  const w = fold(word).replace(/[.,:;]+$/, "");
  return HONORIFICS[w];
}

/** Splits "Sfântul Cuvios Lazăr din …" into honorifics and the rest. */
export function splitHonorifics(title: string): { honorific: string; rest: string; holiness: Set<HolinessType>; gender?: Gender; plural: boolean; count?: number } {
  const words = title.split(/\s+/).filter(Boolean);
  const holiness = new Set<HolinessType>();
  let gender: Gender | undefined;
  let plural = false;
  let count: number | undefined;
  let i = 0;
  let sawMare = false;
  let sawSfintit = false;
  let sawPreot = false;
  let sawNou = false;
  for (; i < words.length; i++) {
    const word = words[i] ?? "";
    const w = fold(word).replace(/[.,:;]+$/, "");
    // "Sfinții 33 de Mucenici", "Sfinții 20.000 de Mucenici", "Cei șase mii de mucenici"
    if (/^[0-9][0-9.]*$/.test(w)) {
      count = Number(w.replace(/\./g, ""));
      plural = true;
      if (fold(words[i + 1] ?? "") === "de") i++;
      continue;
    }
    if (w in NUMBER_WORDS && i > 0) {
      let n = NUMBER_WORDS[w] ?? 0;
      if (fold(words[i + 1] ?? "") === "mii") {
        n *= 1000;
        i++;
      }
      count = n;
      plural = true;
      if (fold(words[i + 1] ?? "") === "de") i++;
      continue;
    }
    if ((w === "cei" || w === "cele") && i === 0) {
      plural = true;
      continue;
    }
    if (w === "o" && fold(words[i + 1] ?? "") === "suta") {
      count = fold(words[i + 3] ?? "") === "mii" ? 100000 : 100;
      i += count === 100000 ? 4 : 2;
      plural = true;
      continue;
    }
    if (w === "fara" && fold(words[i + 1] ?? "") === "de" && /^arginti/.test(fold(words[i + 2] ?? ""))) {
      holiness.add("unmercenary");
      i += 2;
      continue;
    }
    if (w === "intocmai" && fold(words[i + 1] ?? "") === "cu" && /^apostol/.test(fold(words[i + 2] ?? ""))) {
      holiness.add("equal_to_apostles");
      i += 2;
      continue;
    }
    if (w === "facatorul" && fold(words[i + 1] ?? "") === "de" && /^minuni/.test(fold(words[i + 2] ?? ""))) {
      holiness.add("wonderworker");
      i += 2;
      continue;
    }
    if (w === "si" && i > 0 && honorificOf(words[i + 1] ?? "")) continue;
    if (w === "si" && i > 0 && fold(words[i + 1] ?? "") === "intocmai") continue;
    const h = honorificOf(word);
    if (!h) break;
    if (w === "mare" || w === "mari") sawMare = true;
    if (w === "sfintit" || w === "sfintiti") sawSfintit = true;
    if (w === "preot") sawPreot = true;
    if (w === "nou" || w === "noul" || w === "noua" || w === "noii") sawNou = true;
    for (const x of h.holiness ?? []) holiness.add(x);
    if (h.gender) gender = gender ?? h.gender;
    if (h.plural) plural = true;
  }
  if (holiness.has("martyr")) {
    if (sawMare) holiness.add("great_martyr");
    if (sawSfintit || sawPreot) holiness.add("hieromartyr");
    if (holiness.has("venerable")) holiness.add("venerable_martyr");
  }
  if (!holiness.has("martyr") && sawNou) holiness.delete("new_martyr");
  if (holiness.has("great_martyr") || holiness.has("hieromartyr") || holiness.has("venerable_martyr")) {
    // keep "martyr" only when nothing more precise was found
    holiness.delete("martyr");
  }
  if (holiness.has("venerable_martyr")) holiness.delete("venerable");
  const honorific = words.slice(0, i).join(" ").replace(/[,:]+$/, "");
  const rest = words
    .slice(i)
    .join(" ")
    .replace(/^[,:\s]+/, "")
    .replace(/^și\s+/, "");
  const result: ReturnType<typeof splitHonorifics> = { honorific, rest, holiness, plural };
  if (gender) result.gender = gender;
  if (count !== undefined) result.count = count;
  return result;
}

const FEMALE_RO = /(a|ia|ea)$/;
const MALE_ENDING_A = new Set([
  "cleopa", "aitala", "achepsima", "samona", "sava", "luca", "toma", "iona", "ilia", "nichita", "zosima", "cosma", "iuda", "mina", "foca", "dima", "matia", "zaharia", "ieremia", "isaia", "osea", "iezechia", "andreia", "sila", "barnaba", "varnava", "acvila", "zaheia", "ahila", "mamanta", "nicola", "akakia", "zahei", "ermia", "ilie", "mihea", "parmena", "ioachima", "nicandra",
  // Men's names that end like women's ("Anania", "Vavila", "Oprea").
  "achila", "agava", "agripa", "anania", "antipa", "areta", "arhilia", "artema", "ascala", "atenagora",
  "aulimpa", "azaria", "babnuda", "balana", "barsoma", "bata", "beda", "beza", "bidzina", "bisada",
  "chifa", "columba", "cucsa", "dasia", "dosa", "dula", "gavdela", "hedra", "heracla", "hristea",
  "iosua", "iuhanna", "kuksa", "marcura", "mari-mina", "maruta", "matra", "mausima", "miheia", "nehrua",
  "niceta", "oprea", "papa", "papia", "pisora", "rabula", "salva", "semaia", "senuda", "sina",
  "stefana", "suhia", "teona", "uarsenufa", "urosita", "varula", "vavila", "zevina", "zina",
]);

/** Gender of a Romanian first name, when the ending tells it. */
export function genderOfRoName(given: string): Gender | undefined {
  const g = fold(given);
  if (MALE_ENDING_A.has(g)) return "male";
  if (FEMALE_RO.test(g)) return "female";
  return undefined;
}

const NOT_NAME_WORDS = new Set(["din", "de", "la", "cel", "cea", "cei", "cele", "si", "al", "a", "ai", "ale", "lui", "in", "cu", "pe", "sa", "lor", "sau", "ca", "dupa", "nou", "noul", "mare", "mic", "tanar", "batran"]);

function namePart(text: string, gender?: Gender): NamePart {
  const clean = text.replace(/^(Sf\.|Sfântul|Sfânta|Sfinții)\s+/, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const given = (words[0] ?? "").replace(/[,.;:]+$/, "");
  const extra = words
    .slice(1)
    .map((w) => fold(w).replace(/[^a-z-]/g, ""))
    .filter((w) => w.length > 2 && !NOT_NAME_WORDS.has(w))
    .map((w) => skeleton(w));
  const first = given.split("-")[0] ?? given;
  const part: NamePart = { text: clean, given, key: skeleton(first), extra };
  const eq = equivalent(first);
  if (eq) part.eq = eq;
  const g = gender ?? genderOfRoName(given);
  if (g) part.gender = g;
  if (g && !gender) part.genderGuess = true;
  return part;
}

/** Offices and descriptions that follow a name after a comma ("Episcopul Nyssei", "Luminătorul Georgiei"). */
const TITLE_WORD = /^(?:(?:arhi)?episcop\w*|mitropolit\w*|patriarh\w*|papa|papă|(?:i|e)gumen\w*|stare[țţ]\w*|ctitor\w*|ocrotitor\w*|[îi]ntemeietor\w*|lumin[ăa]tor\w*|[îi]nv[ăa][țţ][ăa]tor\w*|dasc[ăa]l\w*|preot\w*|diacon\w*|arhidiacon\w*|protopop\w*|monah\w*|schimonah\w*|ieromonah\w*|arhimandrit\w*|c[ăa]lug[ăa]r\w*|pustnic\w*|sihastr\w*|[îi]mp[ăa]rat\w*|rege\w*|regin\w*|prin[țţ]\w*|domn\w*|voievod\w*|cneaz\w*|[țţ]ar\w*|nebun\w*|cel|cea|fost\w*|ap[ăa]r[ăa]tor\w*|mucenic\w*|m[ăa]rturisitor\w*|izvor[âa]tor\w*|t[ăa]m[ăa]duitor\w*|f[ăa]c[ăa]tor\w*|purt[ăa]tor\w*|prieten\w*|r[ăa]zboinic\w*|sfetnic\w*|vistier\w*|osta[șş]\w*|soldat\w*|comandant\w*|tribun\w*|medic\w*|doctor\w*|tovar[ăa][șş]\w*|apostol\w*|evanghelist\w*|ucenic\w*|fratele|fra[țţ]ii|sora|surorile|mama|tat[ăa]l|so[țţ]ia|so[țţ]ul|fiii|fiul|fiica|fiicele|nepot\w*|bunic\w*|p[ăa]rin[țţ]ii)(?=\s|,|$)/i;
const RELATION = /^(?:mama|tatăl|soția|soțul|fiul|fiica|fiii|fiicele|fratele|frații|sora|surorile|ucenicul|ucenicii|ucenica|părinții|nepotul|nepoata)\b(?:\s+(?:sa|său|lui|lor|săi|sale|ei))?\s*/i;
/** Unnamed companions closing a list: "și cei 7 fii" (as "cu cei 4 fii ai lor"). */
const COMPANIONS = /^(?:cei|cele) \S+ (?:fii|ucenici|tineri)\b/i;
/** Companions that a colon then names: "Luchilian și cei împreună cu el patru tineri:", "Sofia și fiicele sale:". */
const ANNOUNCED = /(?:^|\s)(?:cei|cele|fiii|fiicele|frații|surorile|ucenicii|ucenicele)(?:\s|$)/i;
/** Companions who are all women: "și fiicele sale", "și cele împreună cu ea". */
const ANNOUNCED_WOMEN = /(?:^|\s)(?:cele|fiicele|surorile|ucenicele)(?:\s|$)/i;
/** A genitive honorific after a relation ("surorile Dreptului Lazăr") names someone else. */
const GENITIVE_HONORIFIC = /^(?:Sf\.|Sfântului|Sfintei|Sfinților|Dreptului|Dreptei|Cuviosului|Cuvioasei|Prorocului|Proorocului|Ierarhului|Apostolului|Mucenicului|Muceniței|Sfințitului)\s/;
/** An office and its see, at the end of a name: "…, Mitropolitul Moscovei", "…, Arhiepiscopul Irakliei". */
const SEE = /(?:^|,\s*)(?:[Ee]piscop\w*|[Aa]rhiepiscop\w*|[Mm]itropolit\w*|[Pp]atriarh\w*)\s+\p{Lu}[\p{L}-]*$/u;
/** An epithet with the definite article: "Martirul", "Filosoful", "Teologul". */
const EPITHET = /^\p{Lu}\p{Ll}*[b-df-hj-np-tv-zșț]ul$/u;
const COUNTRY = /^(?:Georgia|Rusia|Grecia|România|Serbia|Bulgaria|Egipt|Cipru|Muntele Athos|Athos|Moldova|Ucraina|Italia|Spania|Galia|Britania|Irlanda|Anglia|Scoția|Suedia|Finlanda|Palestina|Siria|Asia|Armenia|Persia|Elveția|Germania|Franța|Polonia|Lituania|Belarus|Macedonia|Albania|Muntenegru|Bosnia|Croația|Ungaria|Cehia|Slovacia|America|Alaska|Japonia|China|Etiopia|Libia|Africa|Capadocia|Licia|Galatia|Frigia|Tracia|Dacia|Iliria|Panonia|Moesia|Dobrogea|Transilvania|Bucovina|Basarabia|Oltenia|Banat|Maramureș)\b/;

/**
 * Splits the names of a line: "Atanasie și Chiril, arhiepiscopii Alexandriei",
 * "Zotic, Atal, Camasie și Filip de la Niculițel", "Vasile cel Mare, … și mama
 * sa, Sf. Emilia". After a comma, an office, a relation or a country describes
 * the previous name; with a singular honorific, a comma never starts a name.
 */
export function splitNames(rest: string, gender?: Gender, plural = false, singular = false): NamePart[] {
  const text = rest.replace(/\s*\([^)]*\)\s*$/, "").replace(/[.;]+$/, "").trim();
  if (!text) return [];
  const pieces = text.split(/(,\s*|\s+și\s+)/);
  const names: string[] = [];
  let pendingRelation = false;
  for (let i = 0; i < pieces.length; i += 2) {
    let seg = (pieces[i] ?? "").trim();
    let sep = i === 0 ? "" : (pieces[i - 1] ?? "").trim();
    // ", și Petru, episcopul Alexandriei": after a comma, "și" starts another saint.
    const afterComma = /^și\s+/.test(seg);
    if (afterComma) {
      seg = seg.replace(/^și\s+/, "");
      sep = "și";
    }
    if (!seg) continue;
    if (/^(cei|cele) (împreună|dimpreună)/i.test(seg) || /^cu cei\b/i.test(seg) || COMPANIONS.test(seg)) break;
    const bare = seg.replace(/^(?:(?:Sf\.|Sfântul|Sfânta|Sfinții|Cuv\.|Mc\.|Cuvioasa|Cuviosul|Dreapta|Dreptul)\s+)+/, "");
    if (names.length === 0) {
      names.push(bare);
      continue;
    }
    const conj = sep === "și";
    const relation = RELATION.exec(bare);
    if (relation) {
      const after = bare.slice(relation[0].length).trim();
      if (GENITIVE_HONORIFIC.test(after)) names[names.length - 1] += `, ${seg}`;
      else if ((conj || plural) && /^[A-ZĂÂÎȘȚ]/.test(after)) names.push(after.replace(/^(?:Sf\.|Sfântul|Sfânta)\s+/, ""));
      else if (conj || plural) pendingRelation = true;
      // "Terentie, soția sa, Neonila": set off by commas, the relation names the saint after it.
      else if (!after && /^,/.test(pieces[i + 1] ?? "") && /^[A-ZĂÂÎȘȚ]/.test((pieces[i + 2] ?? "").trim())) pendingRelation = true;
      else names[names.length - 1] += `, ${seg}`;
      continue;
    }
    if (LOWER_START.test(bare) || TITLE_WORD.test(bare) || COUNTRY.test(bare)) {
      names[names.length - 1] += `, ${seg}`;
      continue;
    }
    // "luminător al Siberiei și Americii", "de la Cernica și Căldărușani", "Mitropolitul Moscovei și Kolomnei": a second place, not a second saint.
    const previous = names[names.length - 1] ?? "";
    if (conj && /^\p{Lu}[\p{L}-]*$/u.test(bare) && (/(?:^|\s)(?:al|a|ai|ale|din|de la|de|lui)\s+\p{Lu}[\p{L}-]*$/u.test(previous) || (!afterComma && SEE.test(previous)))) {
      names[names.length - 1] += ` și ${bare}`;
      continue;
    }
    // "Iustin Martirul și Filosoful": a second epithet, not a second saint.
    if (conj && !afterComma && EPITHET.test(bare) && EPITHET.test(previous.split(/\s+/).pop() ?? "")) {
      names[names.length - 1] += ` și ${bare}`;
      continue;
    }
    if (conj || pendingRelation || (!singular && (plural || !gender))) {
      names.push(bare);
      pendingRelation = false;
      continue;
    }
    names[names.length - 1] += `, ${seg}`;
  }
  // Only the first name keeps the gender of a singular honorific.
  return names.map((n, i) => namePart(n, plural || i > 0 ? undefined : gender));
}

function stripNotes(text: string): string {
  // Day notes in parentheses at the end ("(Harți)", "(Anul Nou. Tedeum)") are not part of the name.
  return text
    .replace(/\s*\((?:[^()]*\b(?:Har[țţ]i|Post|aliturgic|Tedeum|Anul Nou|Dezlegare|Canonul Mare|Pomenirea celor adormi|S[âa]mb[ăa]ta|Duminica|[ÎI]nceputul|Ajunul|L[ăa]satul|Denia|Mo[șş]ii|Ziua|Lit\.|Liturghia|zi de post)[^()]*)\)\s*$/i, "")
    .trim();
}

function feastOf(text: string): string | undefined {
  for (const f of FEASTS) if (f.ro.test(text)) return f.id;
  return undefined;
}

/** Parses one Romanian title. */
export function parseRo(original: string): ParsedTitle {
  const title = stripNotes(
    original
      .replace(/\s+/g, " ")
      .replace(/\b(Sf|Cuv|Mc|Ier|Ap|Mărt)\.(?=[A-ZĂÂÎȘȚ])/g, "$1. ")
      .trim(),
  );
  const base: ParsedTitle = { kind: "skip", holiness: [], plural: false, honorific: "", rest: title, names: [], title: original };
  if (!title) return base;

  if (RO_MOVABLE.some((re) => re.test(title))) return { ...base, kind: "movable" };

  let m: RegExpExecArray | null;
  if ((m = /^[ÎI]nainte-pr[ăa]znuirea (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "forefeast", feast } : { ...base, kind: "movable" };
  }
  if ((m = /^Dup[ăa]-pr[ăa]znuirea (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "afterfeast", feast } : { ...base, kind: "movable" };
  }
  if ((m = /^Odovania (?:praznicului )?(.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "leavetaking", feast } : { ...base, kind: "movable" };
  }
  if (/^(Întâia|A treia|A doua).* aflare a capului/i.test(title)) {
    return { ...base, kind: "relics_finding", subject: parseRo("Sfântul Proroc Ioan Botezătorul") };
  }
  const feast = FEASTS.find((f) => new RegExp(`^(?:${f.ro.source})`, "i").test(title));
  if (feast) return { ...base, kind: "feast", feast: feast.id };

  if ((m = /^(?:Aducerea|Mutarea|A[șş]ezarea|Sosirea) (?:la [A-ZĂÂÎȘȚ][^ ]+ a )?moa[șş]telor (.*)$/i.exec(title))) {
    return { ...base, kind: "relics_translation", subject: parseRo(nominative(trimDestination(m[1] ?? ""))) };
  }
  if ((m = /^(?:Aflarea|Descoperirea) (?:mormântului și a )?moa[șş]telor (.*)$/i.exec(title))) {
    return { ...base, kind: "relics_finding", subject: parseRo(nominative(trimDestination(m[1] ?? ""))) };
  }
  if ((m = /^(?:Cinstirea|Aducerea|Sosirea) (?:Sfintei |Sfintelor )?Icoan(?:e|ei)\s+(.*)$/i.exec(title))) {
    return { ...base, kind: "icon", icon: m[1] ?? "" };
  }
  if (/^(?:Sfin[țţ]ii |Sf\. )?P[ăa]rin[țţ]i(?:i)? de la Sinodul/i.test(title)) {
    const ord = /Sinodul (?:al )?([IVX]+)(?:-lea)?/i.exec(title);
    const council = ord ? romanToInt(ord[1] ?? "") : undefined;
    const r: ParsedTitle = { ...base, kind: "council" };
    if (council) r.council = council;
    return r;
  }
  if ((m = /^Soborul (Preasfintei N[ăa]sc[ăa]toare de Dumnezeu,.*)$/i.exec(title))) return { ...base, kind: "icon", icon: m[1] ?? "" };
  if ((m = /^Soborul (?:tuturor )?(.*)$/i.exec(title))) {
    const inner = parseRo(nominative(m[1] ?? ""));
    if (inner.holiness.includes("archangel")) return { ...base, kind: "angels", subject: inner };
    if (inner.plural && inner.kind === "saints" && !/\bși\b/.test(inner.rest)) inner.kind = "group";
    if (inner.kind === "skip") inner.kind = "group";
    return { ...base, kind: "synaxis", subject: inner };
  }
  if ((m = /^(?:Pomenirea minunii(?: din Colose a)?|Ar[ăa]tarea Maicii Domnului|Adormirea|Mutarea|Pomenirea)\s+(.*)$/i.exec(title))) {
    // Only the saint's own words turn to the nominative: "Sfânta Ana, mama Preasfintei Născătoare de Dumnezeu".
    const subject = trimDestination(m[1] ?? "");
    const comma = subject.indexOf(",");
    const inner = parseRo(comma < 0 ? nominative(subject) : `${nominative(subject.slice(0, comma))}${subject.slice(comma)}`);
    // "Adormirea Sfântului Apostol Ioan", "Mutarea Sf. Ap. și Evanghelist Ioan" are the saint's own day; the saint's name has no "Adormirea".
    if (/^(Adormirea|Mutarea)/i.test(title) && (inner.kind === "saint" || inner.kind === "saints")) return inner;
    return { ...base, kind: "event", subject: inner };
  }
  if (/^(Înnoirea|Târnosirea|Cămașa|Cutremurul|Pomenirea cutremurului|Cinstirea|Închinarea)/i.test(title)) return { ...base, kind: "event" };

  const h = splitHonorifics(title);
  const holiness = [...h.holiness];
  if (!h.honorific && !h.count) {
    // No honorific: not a saint line we understand.
    return { ...base, kind: "skip" };
  }
  let rest = h.rest;
  const r: ParsedTitle = { ...base, holiness, plural: h.plural, honorific: h.honorific, rest, names: [] };
  if (h.gender) r.gender = h.gender;
  const addHoliness = (x: HolinessType): void => {
    if (!r.holiness.includes(x)) r.holiness.push(x);
  };
  if (/\bTaumaturgul\b|\bFăcătorul de minuni\b/i.test(rest)) addHoliness("wonderworker");
  if (/\bnebun(ul)? pentru Hristos\b/i.test(rest)) addHoliness("fool_for_christ");
  if (/\bStâlpnicul\b/i.test(rest)) addHoliness("stylite");
  if (/\bîntocmai cu Apostolii\b/i.test(rest)) addHoliness("equal_to_apostles");
  if (/\bMărturisitorul\b/.test(rest)) addHoliness("confessor");
  if (r.holiness.length === 0 && /,\s*(?:(?:arhi)?episcop|mitropolit|patriarh|papa)/i.test(rest)) addHoliness("hierarch");
  if (h.count !== undefined) {
    r.kind = "group";
    r.count = h.count;
    // "Sfinții Trei Ierarhi: Vasile cel Mare, Grigorie Teologul și Ioan Gură de Aur"
    const listed = /:\s*(.+)$/.exec(rest)?.[1] ?? (/^[A-ZĂÂÎȘȚ]/.test(rest) ? rest : "");
    if (listed) r.names = splitNames(listed, undefined, true);
    return r;
  }
  if (/^(din|de la|ai|ale|de pe|de|pentru)\s/i.test(rest) || !rest || /^[a-zăâîșț]/.test(rest)) {
    // "Sfinții Cuvioși Mucenici din Sinai și Rait"
    r.kind = "group";
    return r;
  }
  const singular = /^(Sfântul|Sfânta|Cuviosul|Cuvioasa|Dreptul|Dreapta|Fericitul|Fericita|Binecredinciosul|Binecredincioasa)\b/.test(h.honorific);
  const colon = /^([^:]*):\s*(.*)$/.exec(rest);
  // "Sfântul Mucenic Luchilian și cei împreună cu el patru tineri: Ipatie, Paul, Dionisie și Claudie":
  // the colon names the companions announced before it, one saint after each comma.
  let members: NamePart[] = [];
  if (colon && singular && ANNOUNCED.test(colon[1] ?? "")) {
    rest = colon[1] ?? "";
    members = splitNames(colon[2] ?? "", undefined, true);
    if (ANNOUNCED_WOMEN.test(rest)) {
      for (const m of members) {
        m.gender = "female";
        delete m.genderGuess;
      }
    }
  } else if (colon && singular) rest = rest.replace(/:\s*/, ", ");
  else if (colon) {
    // "Sfinții Martiri Brâncoveni: Constantin Vodă …", "Sfinții Mucenici din Dobrogea: Macrobie, …"
    rest = colon[2] ?? "";
    r.names = splitNames(rest, undefined, true);
    r.kind = "group";
    return r;
  }
  if (/\b(cei|cele) (împreună|dimpreună) cu (ei|el|ea|ele)\b/i.test(rest) || /(?:^|\s)(?:cu|și) cei \S+ (fii|ucenici|tineri)\b/i.test(rest) || /\bcu cei doi fii\b/i.test(rest)) {
    r.names = [...splitNames(rest, h.gender, h.plural, singular), ...members];
    r.kind = "group";
    return r;
  }
  r.names = [...splitNames(rest, h.gender, h.plural, singular), ...members];
  if (h.plural && r.names.length === 1) {
    // "Sfinții Palamiți", "Sfinții Stareți de la Optina"
    r.kind = "group";
    return r;
  }
  r.kind = r.names.length > 1 || h.plural ? "saints" : "saint";
  if (r.kind === "saint" && !r.gender && r.names[0]?.gender) r.gender = r.names[0].gender;
  return r;
}

/** "Sfântului Ierarh Nicolae la Bari" → "Sfântului Ierarh Nicolae". */
function trimDestination(text: string): string {
  return text.replace(/\s+(?:la|în|in|de la)\s+(?:[A-ZĂÂÎȘȚ][\wăâîșț-]*)(?:\s+[A-ZĂÂÎȘȚ][\wăâîșț-]*)*\s*$/u, "").trim();
}

function romanToInt(roman: string): number | undefined {
  const map: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  const s = roman.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const v = map[s[i] ?? ""] ?? 0;
    const next = map[s[i + 1] ?? ""] ?? 0;
    total += v < next ? -v : v;
  }
  return total || undefined;
}

/** Calendar abbreviations, as printed by the official calendar ("Sf. Mc."). */
export function abbreviateRo(full: string): string {
  // A plain word boundary does not see ă, ș, ț as letters, so the boundaries are written out.
  return full
    .replace(/^Sfântul și Dreptul(?![\p{L}])/u, "Sf. și Drept.")
    .replace(/^(?:Sfântul|Sfânta|Sfinții|Sfintele|Sfinți)(?![\p{L}])/u, "Sf.")
    .replace(/(?<![\p{L}])Mare (?:Mucenic|Muceniță|Mucenicul)(?![\p{L}])/u, "Mare Mc.")
    .replace(/(?<![\p{L}])Sfințit Mucenic(?![\p{L}])/u, "Sfințit Mc.")
    .replace(/(?<![\p{L}])Sfințiți Mucenici(?![\p{L}])/u, "Sfințiți Mc.")
    .replace(/(?<![\p{L}])(?:Cuvios Mucenic|Cuvioasă Muceniță|Cuvioși Mucenici)(?![\p{L}])/u, "Cuv. Mc.")
    .replace(/(?<![\p{L}])(?:Mucenic|Muceniță|Mucenici|Mucenițe)(?![\p{L}])/u, "Mc.")
    .replace(/(?<![\p{L}])(?:Cuvios|Cuvioasă|Cuvioși|Cuvioase)(?![\p{L}])/u, "Cuv.")
    .replace(/(?<![\p{L}])(?:Ierarh|Ierarhi)(?![\p{L}])/u, "Ier.")
    .replace(/(?<![\p{L}])(?:Apostol|Apostoli)(?![\p{L}])/u, "Ap.")
    .replace(/(?<![\p{L}])Mărturisitor(?:i)?(?![\p{L}])(?= [A-ZĂÂÎȘȚ])/u, "Mărt.");
}
