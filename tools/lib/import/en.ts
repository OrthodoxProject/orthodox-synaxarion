/**
 * English calendar titles (OCA lives, the Coptic Synaxarium, the Armenian
 * calendar): kind of line, kind of holiness, gender and names.
 */
import { EN_MOVABLE, FEASTS } from "./feasts.ts";
import type { Gender, HolinessType, NamePart, ParsedTitle } from "./model.ts";
import { equivalent, fold, skeleton } from "./names.ts";

interface Honorific {
  holiness?: HolinessType[];
  gender?: Gender;
  plural?: boolean;
}

const HONORIFICS: Record<string, Honorific> = {
  saint: {},
  saints: { plural: true },
  st: {},
  sts: { plural: true },
  holy: {},
  the: {},
  our: {},
  father: { gender: "male" },
  fathers: { plural: true },
  mother: { gender: "female" },
  "god-bearing": {},
  godbearing: {},
  "god-bearer": {},
  glorious: {},
  "all-praised": {},
  "all-glorious": {},
  most: {},
  great: {},
  first: {},
  venerable: { holiness: ["venerable"] },
  venerables: { holiness: ["venerable"], plural: true },
  monastic: { holiness: ["venerable"] },
  monk: { holiness: ["venerable"], gender: "male" },
  monks: { holiness: ["venerable"], plural: true },
  nun: { holiness: ["venerable"], gender: "female" },
  nuns: { holiness: ["venerable"], plural: true, gender: "female" },
  schemamonk: { holiness: ["venerable"], gender: "male" },
  schemanun: { holiness: ["venerable"], gender: "female" },
  hieromonk: { holiness: ["venerable"], gender: "male" },
  hierodeacon: { holiness: ["venerable"], gender: "male" },
  abbess: { holiness: ["venerable"], gender: "female" },
  martyr: { holiness: ["martyr"] },
  martyrs: { holiness: ["martyr"], plural: true },
  protomartyr: { holiness: ["martyr"] },
  martyred: { holiness: ["martyr"], plural: true },
  greatmartyr: { holiness: ["great_martyr"] },
  "great-martyr": { holiness: ["great_martyr"] },
  hieromartyr: { holiness: ["hieromartyr"] },
  hieromartyrs: { holiness: ["hieromartyr"], plural: true },
  "priest-martyr": { holiness: ["hieromartyr"] },
  newmartyr: { holiness: ["new_martyr", "martyr"] },
  "new-martyr": { holiness: ["new_martyr", "martyr"] },
  new: {},
  virgin: { holiness: ["virgin"], gender: "female" },
  virgins: { holiness: ["virgin"], plural: true, gender: "female" },
  prophet: { holiness: ["prophet"], gender: "male" },
  prophets: { holiness: ["prophet"], plural: true },
  prophetess: { holiness: ["prophet"], gender: "female" },
  apostle: { holiness: ["apostle"] },
  apostles: { holiness: ["apostle"], plural: true },
  evangelist: { holiness: ["evangelist"], gender: "male" },
  righteous: { holiness: ["righteous"] },
  confessor: { holiness: ["confessor"] },
  confessors: { holiness: ["confessor"], plural: true },
  hieroconfessor: { holiness: ["confessor"], gender: "male" },
  blessed: {},
  "passion-bearer": { holiness: ["passion_bearer"] },
  "passion-bearers": { holiness: ["passion_bearer"], plural: true },
  passionbearer: { holiness: ["passion_bearer"] },
  passionbearers: { holiness: ["passion_bearer"], plural: true },
  hermits: { holiness: ["hermit"], plural: true },
  pontiff: { holiness: ["hierarch"], gender: "male" },
  catholicos: { holiness: ["hierarch"], gender: "male" },
  unmercenary: { holiness: ["unmercenary"] },
  unmercenaries: { holiness: ["unmercenary"], plural: true },
  "wonderworking": {},
  wonderworker: { holiness: ["wonderworker"] },
  wonderworkers: { holiness: ["wonderworker"], plural: true },
  emperor: { holiness: ["right_believing"], gender: "male" },
  empress: { holiness: ["right_believing"], gender: "female" },
  king: { holiness: ["right_believing"], gender: "male" },
  queen: { holiness: ["right_believing"], gender: "female" },
  prince: { holiness: ["right_believing"], gender: "male" },
  princess: { holiness: ["right_believing"], gender: "female" },
  princes: { holiness: ["right_believing"], plural: true },
  tsar: { holiness: ["right_believing"], gender: "male" },
  "right-believing": { holiness: ["right_believing"] },
  "right-believer": { holiness: ["right_believing"] },
  "fool-for-christ": { holiness: ["fool_for_christ"] },
  stylite: { holiness: ["stylite"], gender: "male" },
  hermit: { holiness: ["hermit"] },
  hermitess: { holiness: ["hermit"], gender: "female" },
  anchorite: { holiness: ["hermit"] },
  recluse: { holiness: ["recluse"] },
  myrrhbearer: { holiness: ["myrrhbearer"], gender: "female" },
  myrrhbearers: { holiness: ["myrrhbearer"], plural: true, gender: "female" },
  "myrrh-bearer": { holiness: ["myrrhbearer"], gender: "female" },
  "myrrh-bearing": { holiness: ["myrrhbearer"], gender: "female" },
  archangel: { holiness: ["archangel"], gender: "male" },
  archangels: { holiness: ["archangel"], plural: true },
  forefather: { holiness: ["forefather"], gender: "male" },
  forefathers: { holiness: ["forefather"], plural: true },
  patriarch: {},
  metropolitan: { holiness: ["hierarch"], gender: "male" },
  archbishop: { holiness: ["hierarch"], gender: "male" },
  bishop: { holiness: ["hierarch"], gender: "male" },
  bishops: { holiness: ["hierarch"], plural: true },
  pope: { holiness: ["hierarch"], gender: "male" },
  hierarch: { holiness: ["hierarch"] },
  hierarchs: { holiness: ["hierarch"], plural: true },
  deacon: {},
  deacons: { plural: true },
  slain: {},
  crown: {},
  royal: {},
  grand: {},
  duchess: { gender: "female" },
  duchesses: { plural: true, gender: "female" },
  tsaritsa: { holiness: ["right_believing"], gender: "female" },
  bl: {},
  rt: {},
  blv: { holiness: ["right_believing"] },
  ss: { plural: true },
  "god-seer": {},
  healer: { holiness: ["unmercenary"] },
  physician: {},
  physicians: { plural: true },
  layman: {},
  honored: {},
  honorable: {},
  tsarevich: { holiness: ["right_believing"], gender: "male" },
  presbyters: { plural: true },
  priests: { plural: true },
  deaconess: { gender: "female" },
  archdeacon: {},
  priest: {},
  presbyter: {},
  elder: {},
  abba: {},
  amma: { gender: "female" },
  mar: {},
  anba: {},
  abba_: {},
};

const NUMBER_WORDS: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  forty: 40,
  seventy: 70,
};

const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** "forty-nine" → 49. */
function compoundNumber(word: string): number | undefined {
  const m = /^([a-z]+)-([a-z]+)$/.exec(word);
  const tens = m ? TENS[m[1] ?? ""] : undefined;
  const units = m ? NUMBER_WORDS[m[2] ?? ""] : undefined;
  return tens !== undefined && units !== undefined && units < 10 ? tens + units : undefined;
}

/** Words after a comma that describe the previous name. */
const QUALIFIER = /^(?:(?:arch)?bishops?|metropolitans?|patriarchs?|popes?|catholicos|abbots?|abbess|igumens?|hegumens?|archimandrites?|hieromonks?|monks?|nuns?|schemamonks?|deacons?|archdeacons?|presbyters?|priests?|founders?|enlighteners?|equal|apostles?|evangelists?|disciples?|mothers?|fathers?|sisters?|brothers?|wife|wives|husbands?|sons?|daughters?|parents|children|kings?|queens?|princes?|princess(?:es)?|emperors?|empress(?:es)?|wonderworkers?|miracle-workers?|fools?|recluses?|hermits?|anchorites?|stylites?|missionar(?:y|ies)|confessors?|the|of|in|at|near|from|by|who|first|second|third|teachers?|physicians?|unmercenar(?:y|ies)|great|elders?|virgins?|martyrs?|exarchs?|instructors?|soldiers?|companions?|ascetics?|warriors?|nobles?|maidens?|youths?|children|infants?|hymnographers?|philosophers?|theologians?|iconographers?)\b/i;

/** A name never starts with these words: "Hermit Near Constantinople" describes the previous saint. */
const NOT_A_NAME = /^(?:Near|At|In|Of|From|By|On|Outside|Beyond)\b/;

/** Relations that name a second saint, with the gender they give: "with his Mother Helen". */
const RELATION_GENDER: Record<string, Gender> = { mother: "female", wife: "female", sister: "female", daughter: "female", father: "male", husband: "male", brother: "male", son: "male" };

const COUNTRIES = "Georgia|Russia|Greece|Serbia|Bulgaria|Egypt|Cyprus|Mount Athos|Athos|Moldavia|Romania|Ukraine|Italy|Spain|Gaul|Britain|Ireland|England|Scotland|Wales|Sweden|Finland|Palestine|Syria|Asia Minor|Armenia|Persia|Germany|France|Poland|Lithuania|Belarus|Macedonia|Albania|Montenegro|Bosnia|Croatia|Hungary|Alaska|America|Japan|China|Ethiopia|Libya|Africa|Cappadocia|Lycia|Galatia|Phrygia|Thrace|Estonia|Latvia|Karelia|Cornwall|Wessex|Mercia|Northumbria|Kent|Sicily|Crete|Cilicia|Bithynia|Pontus|Isauria|Lycaonia|Pamphylia|Paphlagonia|Mesopotamia|Arabia|Iberia|Kartli|Kakheti|Bohemia|Moravia|Silesia|Slovakia";
const COUNTRY = new RegExp(`^(?:${COUNTRIES})\\b`);
/** A place at the end of a name, with the lands after it: "of Prague, Bohemia". */
const PLACE_AT_END = new RegExp(`\\b(?:of|at|in) \\p{Lu}[\\p{L}'’-]*(?:, (?:${COUNTRIES}))*$`, "u");
/**
 * A second place after "of Komél and", alone or with more words about the same saint:
 * "Vologda disciple of Saint Nilus of Sora", "Suzdal of the Kiev Near Caves".
 * A saint's epithet or place makes it a second saint: "Basil the Great", "Gregory of Datev".
 */
const PLACE_THEN = /^\p{Lu}[\p{L}'’-]*(?:\s+(?:of the\s|(?!(?:the|of|in|at|from|near|on|by)\b)\p{Ll}).*)?$/u;

const FEMALE_EN = /(a|ia|ina|issa|ine|ia\)|ah)$/;
const MALE_ENDING_A = new Set([
  "savva",
  "sava",
  "nikita",
  "ilya",
  "foma",
  "kuzma",
  "joshua",
  "elisha",
  "jonah",
  "isaiah",
  "jeremiah",
  "obadiah",
  "zechariah",
  "zachariah",
  "zacharia",
  "micah",
  "hosea",
  "judah",
  "noah",
  "elijah",
  "josiah",
  "hezekiah",
  "nehemiah",
  "zephaniah",
  "luka",
  "jona",
  "nikola",
  "gavrila",
  "danila",
  "mykola",
  "akakia",
  "zosima",
  "kosma",
  "foka",
  "barsabba",
  "barsabbah",
  "abdiah",
  "ananiah",
  "azariah",
  "mishael",
  "simeon",
  "isaia",
  "matthia",
  "nicola",
  "ilia",
  "agathangela",
  "theodosia",
]);

export function genderOfEnName(given: string): Gender | undefined {
  const g = fold(given);
  if (MALE_ENDING_A.has(g)) return g === "theodosia" ? "female" : "male";
  if (FEMALE_EN.test(g)) return "female";
  return undefined;
}

const NOT_NAME_WORDS = new Set(["of", "the", "and", "in", "at", "near", "from", "by", "with", "who", "on", "to", "his", "her", "their", "new", "great", "elder", "younger", "blessed", "holy", "saint", "st"]);

function namePart(text: string, gender?: Gender): NamePart {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const given = (words[0] ?? "").replace(/[,.;:()"“”]+/g, "");
  const extra = words
    .slice(1)
    .map((w) => fold(w).replace(/[^a-z-]/g, ""))
    .filter((w) => w.length > 2 && !NOT_NAME_WORDS.has(w))
    .map((w) => skeleton(w));
  const first = given.split("-")[0] ?? given;
  const part: NamePart = { text: clean, given, key: skeleton(first), extra };
  const eq = equivalent(first);
  if (eq) part.eq = eq;
  const g = gender ?? genderOfEnName(given);
  if (g) part.gender = g;
  if (g && !gender) part.genderGuess = true;
  return part;
}

function honorificOf(word: string): Honorific | undefined {
  const w = fold(word).replace(/[.,:;]+$/, "").replace(/^"|"$/g, "");
  if (Object.hasOwn(HONORIFICS, w)) return HONORIFICS[w];
  // "New Confessor/Hieromartyr Tikhon"
  const parts = w.includes("/") ? w.split("/").map((x) => (Object.hasOwn(HONORIFICS, x) ? HONORIFICS[x] : undefined)) : [];
  if (parts.length === 0 || parts.some((p) => !p)) return undefined;
  return { holiness: parts.flatMap((p) => p?.holiness ?? []) };
}

export function splitEnHonorifics(title: string): { honorific: string; rest: string; holiness: Set<HolinessType>; gender?: Gender; plural: boolean; count?: number } {
  const words = title.split(/\s+/).filter(Boolean);
  const holiness = new Set<HolinessType>();
  let gender: Gender | undefined;
  let plural = false;
  let count: number | undefined;
  let i = 0;
  let sawGreat = false;
  let sawNew = false;
  for (; i < words.length; i++) {
    const word = words[i] ?? "";
    const w = fold(word).replace(/[.,:;]+$/, "");
    if (/^[0-9][0-9,]*$/.test(w)) {
      count = Number(w.replace(/,/g, ""));
      plural = true;
      continue;
    }
    const number = Object.hasOwn(NUMBER_WORDS, w) ? NUMBER_WORDS[w] : compoundNumber(w);
    if (number !== undefined && (i === 0 || honorificOf(words[i - 1] ?? ""))) {
      count = number;
      plural = true;
      continue;
    }
    // "Christ’s seventy-two Disciples" (folded without the apostrophe): the Lord's disciples, counted.
    if (i === 0 && w === "christs") {
      const next = fold(words[1] ?? "");
      const n = Object.hasOwn(NUMBER_WORDS, next) ? NUMBER_WORDS[next] : compoundNumber(next);
      if (n !== undefined) {
        count = n;
        plural = true;
        i++;
        continue;
      }
    }
    if ((w === "equal" || w === "equals") && /^(of|to)$/.test(fold(words[i + 1] ?? "")) && fold(words[i + 2] ?? "") === "the" && /^apostles/.test(fold(words[i + 3] ?? ""))) {
      holiness.add("equal_to_apostles");
      if (w === "equals") plural = true;
      i += 3;
      continue;
    }
    // "Equals of the Apostles and Teachers of the Slavs, Cyril and Methodius": a title, not a name.
    if (i > 0 && /^(?:teachers?|enlighteners?)$/.test(w) && fold(words[i + 1] ?? "") === "of") {
      const place = fold(words[i + 2] ?? "") === "the" ? i + 3 : i + 2;
      if (/^\p{Lu}/u.test(words[place] ?? "")) {
        i = place;
        continue;
      }
    }
    if (w === "equal-to-the-apostles" || w === "equal-of-the-apostles") {
      holiness.add("equal_to_apostles");
      continue;
    }
    // "Holy and Righteous Ancestors of God, Joachim and Anna": a title, not a name.
    if ((w === "ancestor" || w === "ancestors") && fold(words[i + 1] ?? "") === "of" && /^god\b/.test(fold(words[i + 2] ?? ""))) {
      if (w === "ancestors") plural = true;
      i += 2;
      continue;
    }
    // "The Holy Glorious and All-Praised Leaders of the Apostles, Peter and Paul"
    if ((w === "leader" || w === "leaders" || w === "chief") && fold(words[i + 1] ?? "") === "of" && fold(words[i + 2] ?? "") === "the" && /^apostles/.test(fold(words[i + 3] ?? ""))) {
      holiness.add("apostle");
      if (w === "leaders") plural = true;
      i += 3;
      continue;
    }
    if (w === "fool" && fold(words[i + 1] ?? "") === "for" && /^christ/.test(fold(words[i + 2] ?? ""))) {
      holiness.add("fool_for_christ");
      i += 2;
      continue;
    }
    if (w === "and" && i > 0 && (honorificOf(words[i + 1] ?? "") || fold(words[i + 1] ?? "") === "equal" || (/^(?:teachers?|enlighteners?)$/.test(fold(words[i + 1] ?? "")) && fold(words[i + 2] ?? "") === "of"))) continue;
    const h = honorificOf(word);
    if (!h) break;
    // "Saint" alone before a capitalised word is an honorific; "The" before a name too.
    if (w === "great") sawGreat = true;
    if (w === "new") sawNew = true;
    for (const x of h.holiness ?? []) holiness.add(x);
    if (h.gender) gender = gender ?? h.gender;
    if (h.plural) plural = true;
  }
  if (holiness.has("martyr")) {
    if (sawGreat) holiness.add("great_martyr");
    if (sawNew) holiness.add("new_martyr");
    if (holiness.has("venerable")) holiness.add("venerable_martyr");
  }
  if (holiness.has("great_martyr") || holiness.has("hieromartyr") || holiness.has("venerable_martyr")) holiness.delete("martyr");
  if (holiness.has("venerable_martyr")) holiness.delete("venerable");
  const honorific = words.slice(0, i).join(" ").replace(/[,:]+$/, "");
  const rest = words
    .slice(i)
    .join(" ")
    .replace(/^[,:\s]+/, "");
  const result: ReturnType<typeof splitEnHonorifics> = { honorific, rest, holiness, plural };
  if (gender) result.gender = gender;
  if (count !== undefined) result.count = count;
  return result;
}

/** Splits "Hermylus and Stratonicus of Belgrade", "Theopemptus, Bishop of Nicomedia, and Martyr Theonas". */
export function splitEnNames(rest: string, gender?: Gender, plural = false): { names: NamePart[]; holiness: Set<HolinessType> } {
  const text = rest
    .replace(/(\d),(\d{3})\b/g, "$1$2")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[.;]+$/, "")
    // "Constantine with his Mother Helen": two saints.
    .replace(/(?<![,;])\s+with\s+(his|her|their)\s+(?=(?:[Mm]other|[Ff]ather|[Ww]ife|[Hh]usband|[Ss]ister|[Bb]rother|[Ss]on|[Dd]aughter),?\s+\p{Lu})/gu, " and $1 ")
    .trim();
  const holiness = new Set<HolinessType>();
  if (!text) return { names: [], holiness };
  const pieces = text.split(/(,\s*and\s+|,\s*|\s+and\s+)/);
  const names: string[] = [];
  /** Genders that a relation gives ("his Mother Helen"), by index of the name. */
  const genders = new Map<number, Gender>();
  for (let i = 0; i < pieces.length; i += 2) {
    let seg = (pieces[i] ?? "").trim();
    const sep = i === 0 ? "" : (pieces[i - 1] ?? "").trim();
    if (!seg) continue;
    if (/^(those|all|many|others|\d+|the \w+ (others|with)|(?:two|three|four|five|six|seven|eight|nine|ten|twelve) \w+)\b/i.test(seg) || /^(his|her|their) (companions|disciples)\b/i.test(seg)) break;
    // "Augusta, Porphyrius the General, the 50 philosophers and the 200 Soldiers": members of the group, not names.
    if (/^the \d+\b/i.test(seg)) continue;
    const h = splitEnHonorifics(seg);
    // "and the Czech Lands": an article alone does not announce another saint; nor does "Hermit Near Constantinople".
    if (h.honorific && !/^(?:the|our)$/i.test(h.honorific) && h.rest && /^[A-Z]/.test(h.rest) && !NOT_A_NAME.test(h.rest)) {
      for (const x of h.holiness) holiness.add(x);
      seg = h.rest;
      if (names.length > 0 && (sep.includes("and") || plural)) {
        names.push(seg);
        continue;
      }
    }
    if (names.length === 0) {
      names.push(seg);
      continue;
    }
    const conj = sep.includes("and");
    const previous = names[names.length - 1] ?? "";
    const relation = /^(?:his|her|their)\s+(?:(?:two|three|four|five|six|seven)\s+)?(?:wife|husband|mother|father|sister|brother|son|daughter|sons|daughters|disciple|disciples|deacons?|servants?|companions?|children|councilor)\b,?:?\s*/i.exec(seg);
    if (relation) {
      const after = seg.slice(relation[0].length).trim();
      if (/^[A-Z]/.test(after) && (conj || plural || /^(his|her|their)/i.test(seg))) {
        names.push(splitEnHonorifics(after).rest || after);
        const g = RELATION_GENDER[fold(/^(?:his|her|their)\s+(\w+)/i.exec(seg)?.[1] ?? "")];
        if (g) genders.set(names.length - 1, g);
      } else names[names.length - 1] += `, ${seg}`;
      continue;
    }
    if (/^[a-z]/.test(seg) || QUALIFIER.test(seg) || COUNTRY.test(seg)) {
      names[names.length - 1] += `${conj ? " and" : ","} ${seg}`;
      continue;
    }
    // "of Pisma and Kostroma", "Bishop of Polotsk and Tver", "of Ohrid and Žiča", "of Prague, Bohemia and Moravo-Cilezsk": a place, not a second saint.
    if (conj && !plural && PLACE_AT_END.test(previous) && PLACE_THEN.test(seg)) {
      names[names.length - 1] += ` and ${seg}`;
      continue;
    }
    // "sister of Saints Basil the Great and Gregory of Nyssa"
    if (conj && /\b(?:of|to) (?:the )?(?:Saints?|Sts?\.?|Holy|Apostles?|Venerable|Martyrs?|Prophet)\b/.test(previous)) {
      names[names.length - 1] += ` and ${seg}`;
      continue;
    }
    if (conj || plural) {
      names.push(seg);
      continue;
    }
    names[names.length - 1] += `, ${seg}`;
  }
  return { names: names.map((n, i) => namePart(n, genders.get(i) ?? (plural || i > 0 ? undefined : gender))), holiness };
}

function feastOf(text: string): string | undefined {
  for (const f of FEASTS) if (f.en.test(text)) return f.id;
  return undefined;
}

/** Events in the life of a saint, named as "<event> of <saint>" ("The Burning of Saint Sava's relics"). */
const EVENT_OF = /^(?:The )?(?:Nativity|Birth|Entrance|Meeting|Raising|Coming|Arrival|Preaching|Ascension|Confession|Enthronement|Inauguration|Consultation|Beginning|Closing|Reign|Burning)\s+of\s+(.*)$/i;

/** Words that name a saint: "Saint Severus", "the Apostle Andrew", "the righteous Lazarus". */
const SAINT_MARK = /(?:^|\s)((?:Saints?|Sts?\.|St|the [Rr]ighteous|[Rr]ighteous|the Apostle|Apostle|the Prophet|Prophet|Pope|Great Martyr|Martyr|Venerable)\s+\p{Lu})/u;

/**
 * The saint an event is about, if it names one: "Saint Severus, Patriarch of
 * Antioch, to Egypt" → Severus; "the Chief Priests to put the righteous Lazarus
 * to death" → Lazarus; "the New St. Mark Cathedral" → none (a church is not the saint).
 */
function eventSubject(text: string): ParsedTitle | undefined {
  if (/\b(?:Theotokos|Mother of God)\b/i.test(text)) return parseEn("Theotokos");
  // "Saint Sava's relics" → Saint Sava.
  const cut = (s: string): string =>
    s
      .replace(/,?\s+(?:into|to|from|that|in|at)\s+.*$/, "")
      .replace(/['’]s\s+.*$/, "")
      .trim();
  const own = cut(text);
  if (/\b(?:Church|Churches|Cathedral|Monastery|Temples?|Fast)\b/.test(own)) return undefined;
  let named: string | undefined;
  if (SAINT_MARK.exec(own)?.index === 0 || /^\p{Lu}[\p{L}'’-]+(?: the \p{Lu}\p{L}+)?$/u.test(own)) named = own;
  else {
    const mark = SAINT_MARK.exec(text);
    if (mark?.[1]) named = cut(text.slice(text.indexOf(mark[1])));
  }
  if (!named) return undefined;
  const p = parseEn(named);
  return (p.kind === "saint" || p.kind === "saints" || p.kind === "group") && p.names.length > 0 ? p : undefined;
}

/** Parses one English title. */
export function parseEn(original: string): ParsedTitle {
  const title = original
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/(\d),(\d{3})\b/g, "$1$2")
    .replace(/^(?:Our )?(?:Holy )?(?:Father|Mother)s? among the Saints,?\s*/i, "Saint ")
    .replace(/;.*$/, "")
    .replace(/\.$/, "")
    .trim();
  const base: ParsedTitle = { kind: "skip", holiness: [], plural: false, honorific: "", rest: title, names: [], title: original };
  if (!title) return base;
  if (EN_MOVABLE.some((re) => re.test(title))) return { ...base, kind: "movable" };

  let m: RegExpExecArray | null;
  if ((m = /^(?:The )?Forefeast of (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "forefeast", feast } : { ...base, kind: "movable" };
  }
  if ((m = /^(?:The )?Afterfeast of (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "afterfeast", feast } : { ...base, kind: "movable" };
  }
  if ((m = /^(?:The )?(?:Leavetaking|Leave-taking|Apodosis) of (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "leavetaking", feast } : { ...base, kind: "movable" };
  }
  // "Second Day of the Nativity of our Lord": a day of the afterfeast.
  if ((m = /^(?:The )?(?:Second|Third|Fourth|Fifth|Sixth) Day of (.*)$/i.exec(title))) {
    const feast = feastOf(m[1] ?? "");
    return feast ? { ...base, kind: "afterfeast", feast } : { ...base, kind: "movable" };
  }
  if (/^(?:The )?Eve of\b/i.test(title)) return { ...base, kind: "movable" };
  if (/^(?:The )?(?:(?:First|Second|Third) )?(?:Translation|Transfer|Translocation|Relocation|Deposition|Return|Transferal|Arrival)\b.*\brelics?\b|^(?:The )?(?:(?:First|Second|Third) )?(?:Translation|Transfer|Translocation|Relocation) of the (?:body|head|hand)/i.test(title)) {
    const subj = /\b(?:relics?|body|head|hand|remains) of (?:the |our )?(.*?)(?:,? (?:from|to|into|in) (?:the )?[A-Z].*)?$/i.exec(title);
    return { ...base, kind: "relics_translation", subject: parseEn(subj?.[1] ?? "") };
  }
  if (/\bfinding of the (?:honorable |precious |venerable )?head of\b/i.test(title) && /\b(forerunner|baptist)\b/i.test(title)) {
    return { ...base, kind: "relics_finding", subject: parseEn("Prophet John the Baptist") };
  }
  if (/^(?:The )?(?:(?:First|Second|Third) )?(?:Uncovering|Discovery|Opening|Finding|Unearthing|Recovery)\b.*\b(?:relics?|head|body)\b/i.test(title)) {
    if (/\bhead of (?:the )?(?:holy,? )?(?:glorious )?(?:prophet,? )?(?:forerunner|john the baptist)/i.test(title)) {
      return { ...base, kind: "relics_finding", subject: parseEn("Prophet John the Baptist") };
    }
    const subj = /\b(?:relics?|body|head) of (?:the |our )?(.*?)(?:,? (?:from|to|in|at) [A-Z].*)?$/i.exec(title);
    return { ...base, kind: "relics_finding", subject: parseEn(subj?.[1] ?? "") };
  }
  // "The Holy Transfiguration of our Lord God and Savior Jesus Christ", "the Life giving Annunciation"
  const feast = FEASTS.find((f) => new RegExp(`^(?:the |feast of the |feast of |commemoration of the )?(?:(?:holy|life[- ]giving) )?(?:${f.en.source})`, "i").test(title));
  if (feast) return { ...base, kind: "feast", feast: feast.id };
  if (/\bIcon of the (?:Most Holy )?(?:Mother of God|Theotokos)\b|\bIcon of the Most Holy Theotokos\b/i.test(title)) {
    return { ...base, kind: "icon", icon: title };
  }
  if ((m = /^(?:Commemoration of )?(?:the )?(?:Holy )?Fathers of the (\w+) Ecumenical Council/i.exec(title))) {
    const ord = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"].indexOf(fold(m[1] ?? "")) + 1;
    const r: ParsedTitle = { ...base, kind: "council" };
    if (ord > 0) r.council = ord;
    return r;
  }
  if ((m = /^(?:The )?Synaxis of (?:the |all )?(.*)$/i.exec(title))) {
    const inner = parseEn(m[1] ?? "");
    if (inner.holiness.includes("archangel")) return { ...base, kind: "angels", subject: inner };
    if (inner.kind === "saints" && inner.plural) inner.kind = "group";
    if (inner.kind === "skip") inner.kind = "group";
    return { ...base, kind: "synaxis", subject: inner };
  }
  if ((m = /^(?:The )?(?:Glorification|Canonization) of (?:the |our )?(.*)$|^(?:The )?Commemoration of the (?:glorification|canonization)\b.*?\bof (?:the |our )?(.*)$/i.exec(title))) {
    const inner = parseEn(m[1] ?? m[2] ?? "");
    if (inner.kind === "saint" || inner.kind === "saints" || inner.kind === "group") return { ...base, kind: "glorification", subject: inner };
  }
  if ((m = /^(?:The )?(?:Repose|Falling Asleep|Dormition|Departure|Martyrdom|Beheading|Translation to heaven|Burial) of (?:the |our )?(.*)$/i.exec(title))) {
    // The saint's own day: the saint keeps the name the title gives, without "Repose of" ("Beheading of Venerable Cornelius").
    const inner = parseEn(m[1] ?? "");
    if (inner.kind === "saint" || inner.kind === "saints" || inner.kind === "group") return inner;
  }
  // "Nativity of Saint Nicholas", "Entrance of the Apostle Andrew into Georgia": an event in a saint's life, not the saint.
  if ((m = EVENT_OF.exec(title))) {
    const r: ParsedTitle = { ...base, kind: "event" };
    const subject = eventSubject(m[1] ?? "");
    if (subject) r.subject = subject;
    return r;
  }
  if ((m = /^(?:The )?Commemoration of (?:the )?(?:miracle|wonder|appearance|apparition)\b.*?\bof (?:the |our )?(.*)$/i.exec(title))) {
    return { ...base, kind: "event", subject: parseEn(m[1] ?? "") };
  }
  if (/^(?:The )?(?:Commemoration|Consecration|Dedication|Feast|Anniversary|Council|Earthquake|Miracle|Appearance|Apparition|Restoration|Construction|Founding|Renewal|Building|Placing|Laying|Deposition)\b/i.test(title)) {
    const inner = /^(?:The )?Commemoration of (?:the )?(.*)$/i.exec(title);
    if (inner) {
      // "Commemoration of Saint …" is a saint; "Commemoration of the Great Earthquake …" is not.
      const p = parseEn(inner[1] ?? "");
      const named = p.holiness.length > 0 || /\b(?:saints?|sts?|holy)\b/i.test(p.honorific);
      if (named && (p.kind === "saint" || p.kind === "saints" || p.kind === "group")) return p;
    }
    return { ...base, kind: "event" };
  }

  const h = splitEnHonorifics(title);
  // "Ecumenical Teachers and Hierarchs: Basil the Great, …", "9 Martyred brothers of Kola: Guram, …"
  const colon = /^([^:]*):\s*(.+)$/.exec(h.rest);
  if (colon?.[2] && /,|\band\b/.test(colon[2])) {
    const r: ParsedTitle = { ...base, kind: "group", holiness: [...h.holiness], plural: true, honorific: h.honorific, rest: h.rest, names: splitEnNames(colon[2], undefined, true).names };
    if (h.count !== undefined) r.count = h.count;
    return r;
  }
  if (!h.honorific && h.count === undefined) {
    // "Metropolitan Symeon of Smolensk" is caught above; a bare name is a saint all the same.
    if (/^[A-Z][a-z]+/.test(title) && !/\b(Icon|Church|Monastery|Cathedral|Council)\b/.test(title) && !/^(?:The )?(?:Translation|Transfer|Turning|Procession|Return|Placing|Laying|Finding|Uncovering|Opening|Discovery|Recovery|Commemoration|Feast|Synaxis)\b/i.test(title)) {
      const { names } = splitEnNames(title);
      const r: ParsedTitle = { ...base, kind: names.length > 1 ? "saints" : names.length === 1 ? "saint" : "group", names, rest: title };
      if (names.length === 1 && names[0]?.gender) r.gender = names[0].gender;
      return r;
    }
    return { ...base, kind: "skip" };
  }
  const r: ParsedTitle = { ...base, holiness: [...h.holiness], plural: h.plural, honorific: h.honorific, rest: h.rest, names: [] };
  if (h.gender) r.gender = h.gender;
  const add = (x: HolinessType): void => {
    if (!r.holiness.includes(x)) r.holiness.push(x);
  };
  if (/\bWonderworker\b/i.test(h.rest)) add("wonderworker");
  if (/\bFool[- ]for[- ]Christ\b/i.test(h.rest)) add("fool_for_christ");
  if (/\bStylite\b/i.test(h.rest)) add("stylite");
  if (/\bEqual[- ](of|to)[- ]the[- ]Apostles\b/i.test(h.rest)) add("equal_to_apostles");
  if (/\bthe Confessor\b/i.test(h.rest)) add("confessor");
  if (/\bthe Unmercenar/i.test(h.rest)) add("unmercenary");
  if (r.holiness.length === 0 && /,\s*(?:Arch)?bishop|,\s*Metropolitan|,\s*Patriarch|,\s*Pope|,\s*Catholicos/i.test(h.rest)) add("hierarch");
  if (r.holiness.length === 0 && /,\s*(?:Abbot|Abbess|Igumen|Hegumen|Monk|Nun|Hieromonk|Archimandrite|Founder of .*Monastery)/i.test(h.rest)) add("venerable");
  if (h.count !== undefined) {
    r.kind = "group";
    r.count = h.count;
    return r;
  }
  if (!h.rest || /^(of|from|at|in|who|slain|martyred)\b/i.test(h.rest) || /^(?:Children|Infants|Innocents|Fathers|Mothers|Monks|Nuns|Brothers|Sisters|Virgins|Women|Youths|Soldiers|Bishops|Hierarchs|Martyrs|Saints|Wonderworkers|Elders|Teachers)\b/.test(h.rest)) {
    r.kind = "group";
    return r;
  }
  const split = splitEnNames(h.rest, h.gender, h.plural);
  r.names = split.names;
  for (const x of split.holiness) add(x);
  // "Empress Augusta, Porphyrius the General, the 50 philosophers and the 200 Soldiers martyred with the Great Martyr Katherine": a group.
  if (/\b(and|with) (?:the )?(those|all|many|\d+|two|three|four|five|six|seven|eight|nine|ten|twelve)(?: [\w-]+){0,2} (others|with|companions|martyrs|soldiers|sons|daughters|children|disciples|servants|female|fathers|monks|virgins|women|men)/i.test(h.rest) ||/\band (his|her|their) (companions|disciples|children|sons|daughters)\b/i.test(h.rest) || /\band those with (him|her|them)\b/i.test(h.rest)) {
    r.kind = "group";
    // "… and the 200 Soldiers martyred with the Great Martyr Katherine", "… twelve other Monks, martyred at Vatopedi"
    if (/\bmartyred\b/i.test(h.rest) && !r.holiness.some((x) => /martyr/.test(x))) {
      if (r.holiness.includes("venerable")) r.holiness = [...r.holiness.filter((x) => x !== "venerable"), "venerable_martyr"];
      else add("martyr");
    }
    return r;
  }
  if (h.plural && r.names.length === 1) {
    r.kind = "group";
    return r;
  }
  r.kind = r.names.length > 1 || h.plural ? "saints" : "saint";
  if (r.kind === "saint" && !r.gender && r.names[0]?.gender) r.gender = r.names[0].gender;
  return r;
}
