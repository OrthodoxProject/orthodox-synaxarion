/**
 * The names of wonder-working icons, compared across languages. The Romanian calendars and the OCA name an icon of
 * the Theotokos by the place where it is kept, each in its own spelling ("din Eleț" / "Yelets", "de la Poceaev" / "of
 * Pochaev", "„Rjevskaia”" / "of Rzhevsk"), or by its title, each in its own language ("„Bucurie neașteptată”" / "“The
 * Unexpected Joy”", "„Rugul aprins”" / "“Unburnt Bush”"), and doxologia sometimes by the Greek or Russian title
 * ("„Cea care alăptează” (Galaktotrofousa)" / "the “Milkgiver”", "„Sedmiezerskaya”" / "“Seven Lakes”").
 */
import { fold, nameSimilarity, skeleton } from "./names.ts";

export type IconLang = "ro" | "en";

/**
 * Words of the names of icons that name no icon in particular, and Mount Athos, which keeps many: the OCA's "Icon of
 * the Mother of God “of the Three Hands” on Mount Athos" is not doxologia's "Prodromița de la Muntele Athos" (12 July).
 */
const STOP = new Set([
  "icoana", "icoanei", "icoane", "icoanele", "maicii", "domnului", "sfintei", "preasfintei", "nascatoare", "nascatoarei", "dumnezeu",
  "cinstirea", "aducerea", "sosirea", "soborul", "din", "de", "la", "cea", "care", "a", "si", "sau", "celor", "noastre",
  "sfantul", "sfantului", "manastirea", "manastirii", "muntele",
  "icon", "icons", "mother", "god", "theotokos", "most", "holy", "the", "of", "and", "or", "to", "in", "at", "from", "my", "who",
  "translation", "appearance", "arrival", "finding", "meeting", "commemoration", "synaxis", "saint", "monastery", "mount", "mt",
  "athos",
]);

/**
 * One word or phrase in each language, folded, and the names that the sources give one icon in other words: the
 * first form of a group is its key. A phrase is read before the words it is made of.
 */
const SAME: string[][] = [
  // Titles, word by word.
  ["joy", "joyful", "bucurie", "bucuria", "bucuriei", "bucurii"],
  ["unexpected", "neasteptata"],
  ["sorrow", "sorrows", "affliction", "afflictions", "intristare", "intristarile", "intristati", "necajiti"],
  ["assuage", "potoleste"],
  ["consolation", "comfort", "mangaietoarea", "mangaierea", "paramythia"],
  ["stabbed", "injunghiata"],
  ["perishing", "pierduti"],
  ["flesh", "trup"],
  ["uncut", "netaiat"],
  ["sweet", "dulcea"],
  ["kissing", "sarutare"],
  ["unfading", "nepieritoare"],
  ["flower", "floarea"],
  ["chalice", "potirul"],
  ["inexhaustible", "inexhastible", "nesecat"],
  ["seven", "sapte"],
  ["arrows", "sageti"],
  ["tenderness", "umilenie"],
  ["passion", "patimirilor"],
  ["bush", "rugul"],
  ["humble", "smeriti"],
  ["support", "ajutatoarea"],
  ["healer", "vindecatoarea", "telitelnita"],
  ["myrtle", "mirt"],
  ["multiplier", "sporitoarea"],
  ["wheat", "granelor"],
  ["virgin", "fecioria"],
  ["birth", "nastere"],
  ["deliverer", "izbavitoarea"],
  ["quick", "grabnic"],
  ["hear", "ascultatoarea"],
  ["merciful", "milostiva"],
  ["all", "toti", "tuturor"],
  ["rescuer", "salvatoarea"],
  ["drowning", "inec"],
  ["blessed", "binecuvantat"],
  ["womb", "pantecele"],
  // Titles that are not translated word by word, and the Greek or Russian ones that doxologia keeps.
  ["milkgiver", "milk giver", "cea care alapteaza", "galaktotrofousa"],
  ["seven lakes", "sapte lacuri", "sedmiezerskaya"],
  ["three hands", "trihirussa"],
  ["nurturer", "indrumatoarea si ocrotitoarea copiilor"],
  ["conversational", "sfatuitoarea"],
  // doxologia: „Ognevidnaya” „a primit numele Areovind sau Chip de foc”.
  ["areovindus", "areovind", "ognevidnaya"],
  // Places that the sound of the name does not bring near enough: the OCA's Kupyatitsa is the village of Kupiatici
  // (doxologia; "Kupyátitsa (or Kupyátich)", OCA), Gerbovets is Hârbovăț in Moldova, Filersk the Philermos of Rhodes.
  ["kupyatitsa", "kupiatici"],
  ["gerbovets", "harbovat"],
  ["filersk", "philermos"],
];

const PHRASES: Array<{ re: RegExp; key: string }> = [];
const WORDS = new Map<string, string>();
for (const group of SAME) {
  const key = `#${(group[0] ?? "").replace(/ /g, "-")}`;
  for (const form of group) {
    if (form.includes(" ")) PHRASES.push({ re: new RegExp(`(?:^| )${form}(?= |$)`, "g"), key });
    else WORDS.set(form, key);
  }
}
PHRASES.sort((a, b) => b.re.source.length - a.re.source.length);

/** A word of an icon's name: a key of SAME, or a word compared by its first letters and by its sound. */
export interface IconWord {
  meaning?: string;
  prefix?: string;
  sounds?: string[];
}

/**
 * The name keys of a word, as names.ts makes them, and for Romanian the sounds that Romanian spells otherwise: ț, ș
 * and j are ts, sh and zh ("Eleț" / "Yelets", "Miroj" / "Mirozh"), and h alone is the Russian kh ("Tihvin" /
 * "Tikhvin", "Vlahernskaya" / "Blachernae"). Russian Fe- is Greek Theo- ("Feodotevskaia" / "of Theodotiev").
 */
function soundsOf(word: string, lang: IconLang): string[] {
  const greek = (w: string): string => w.replace(/^feo/, "teo");
  const out = new Set([skeleton(greek(fold(word)))]);
  if (lang === "ro") {
    const spoken = word
      .toLowerCase()
      .replace(/[țţ]/g, "ts")
      .replace(/[șş]/g, "sh")
      .replace(/j/g, "zh")
      .replace(/(?<![cgkszh])h/g, "kh");
    out.add(skeleton(greek(fold(spoken))));
  }
  return [...out].filter((k) => k.length >= 2);
}

/** The words of an icon's name that may tell it from another icon. */
export function iconWords(text: string, lang: IconLang): IconWord[] {
  const out: IconWord[] = [];
  // Words as written (for their sound) and folded (for the tables), in step.
  const written = text.split(/[^\p{L}'’]+/u).filter((w) => w.length > 0);
  let folded = ` ${written.map((w) => fold(w).replace(/[^a-z]/g, "")).join(" ")} `;
  for (const { re, key } of PHRASES) folded = folded.replace(re, ` ${key}`);
  const words = folded.trim().split(/ +/);
  // Phrases changed the number of words: the written form is found again by its folded form.
  const byFold = new Map(written.map((w) => [fold(w).replace(/[^a-z]/g, ""), w]));
  for (const w of words) {
    if (w.startsWith("#")) out.push({ meaning: w });
    else if (WORDS.has(w)) out.push({ meaning: WORDS.get(w) });
    else if (w.length >= 3 && !STOP.has(w)) out.push({ prefix: w.slice(0, 5), sounds: w.length >= 4 ? soundsOf(byFold.get(w) ?? w, lang) : [] });
  }
  return out;
}

/**
 * Whether two name keys sound alike: the same key, the same but for a leading vowel ("Eleț" / "Yelets"), or one the
 * start of the other, with a Russian ending ("Igorevskaia" / "of Igor", "Ozeriansk" / "Ozeryana").
 */
function soundAlike(a: string, b: string): boolean {
  if (nameSimilarity(a, b) >= 0.8) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.startsWith(short);
}

/** Whether two words of names of icons are the same word: in the tables, by their first five letters or by their sound. */
export function sameIconWord(a: IconWord, b: IconWord): boolean {
  if (a.meaning || b.meaning) return a.meaning === b.meaning;
  if (a.prefix === b.prefix) return true;
  return (a.sounds ?? []).some((x) => (b.sounds ?? []).some((y) => soundAlike(x, y)));
}

/**
 * How many words of one name of an icon another name has, in either language (see sameIconWord), and, below one, how
 * much of the other name they cover: "Vil'na Icon of the Mother of God" (OCA, 15 February) is doxologia's "din
 * Vilnius" rather than its "„Ostrobramsk - Vilnius”" of the same day.
 */
export function iconNamesScore(mine: IconWord[], theirs: IconWord[]): number {
  let n = 0;
  for (const w of mine) if (theirs.some((t) => sameIconWord(w, t))) n++;
  if (n === 0 || theirs.length === 0) return n;
  const covered = theirs.filter((t) => mine.some((w) => sameIconWord(w, t))).length;
  return n + (0.5 * covered) / theirs.length;
}
