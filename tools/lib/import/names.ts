/**
 * Name keys used to recognise the same saint in different sources and
 * languages: Romanian (Pigasie, Achindin), English (Pegasius, Acindynus) and the
 * transliterations in between. A key is a consonant skeleton of the name, after
 * mapping the spellings that differ between the languages; irregular pairs
 * (Ioan / John, Iacob / James) go through a table of equivalents.
 */

/** Lowercase ASCII without diacritics. */
const GREEK: Record<string, string> = { α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o" };

export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0370-\u03ff]/g, (c) => GREEK[c.toLowerCase()] ?? "")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʼ’'`]/g, "")
    .toLowerCase();
}

/** URL- and id-safe slug. */
export function slugify(text: string): string {
  return fold(text)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Irregular equivalents: each group lists spellings of one name in Romanian,
 * English and other transliterations. The first entry is the group's key.
 */
const EQUIVALENTS: string[][] = [
  ["ioan", "john", "ion", "ioann", "joannes", "ivan", "jovan", "yoannis", "ioannis", "joan"],
  ["iacob", "iacov", "james", "jacob", "iakovos", "yakov"],
  ["pavel", "paul", "pavlos", "paulus"],
  ["mihail", "michael", "mihai", "mikhail"],
  ["ilie", "elijah", "elias", "ilia", "ilya"],
  ["vasile", "basil", "vasilios", "basilius", "vasily", "vasilije"],
  ["gheorghe", "george", "georgios", "georgy", "georgije", "giorgi"],
  ["dimitrie", "demetrius", "dimitrios", "dmitry", "dimitrije"],
  ["nicolae", "nicholas", "nikolaos", "nikolai", "nikola"],
  ["nichita", "nicetas", "niketas", "nikita"],
  ["teodor", "theodore", "theodoros", "feodor", "fyodor", "teodorus"],
  ["teodora", "theodora"],
  ["teodosie", "theodosius", "feodosy"],
  ["teofil", "theophilus"],
  ["haralambie", "charalampus", "charalambos", "haralampy", "haralambos", "charalampos"],
  ["iosif", "joseph", "josif"],
  ["iuda", "jude", "judas"],
  ["iosua", "joshua", "jesus son of navi"],
  ["isaia", "isaiah", "esaias"],
  ["ieremia", "jeremiah", "jeremias"],
  ["iezechiel", "ezekiel"],
  ["ioachim", "joachim"],
  ["iona", "jonah", "jonas"],
  ["iov", "job"],
  ["ioil", "joel"],
  ["ilarion", "hilarion"],
  ["ipatie", "hypatius"],
  ["ipolit", "hippolytus"],
  ["irineu", "irenaeus"],
  ["eftimie", "euthymius", "evfimy", "euthymios"],
  ["eustatie", "eustathius", "eustace", "eustathios"],
  ["evdochia", "eudocia", "evdokia", "eudokia"],
  ["evdochim", "eudocimus", "eudokimos", "evdokim"],
  ["avraam", "abraham"],
  ["avacum", "habakkuk", "abbacum", "avvakum", "avakum"],
  ["avdie", "obadiah", "abdias"],
  ["agheu", "haggai", "aggeus"],
  ["sofonie", "zephaniah", "sophonias"],
  ["maleahi", "malachi", "malachias"],
  ["mihei", "micah", "michaeas"],
  ["naum", "nahum"],
  ["osea", "hosea"],
  ["zaharia", "zachariah", "zechariah", "zacharias"],
  ["elisei", "elisha", "eliseus"],
  ["moise", "moses"],
  ["samuel", "samuil"],
  ["ecaterina", "catherine", "aikaterini", "ekaterina", "katherine"],
  ["elisabeta", "elizabeth", "elisabeth"],
  ["elena", "helen", "helena", "eleni", "yelena"],
  ["ana", "anna", "anne", "hannah"],
  ["maria", "mary", "mariam"],
  ["marta", "martha"],
  ["varvara", "barbara"],
  ["parascheva", "paraskeva", "paraskevi", "praskovia", "petka", "paraschiva"],
  ["xenia", "xenia", "ksenia"],
  ["sava", "sabbas", "savvas", "savva"],
  ["serghie", "sergius", "sergiu", "sergei"],
  ["simeon", "symeon", "simion"],
  ["stefan", "stephen", "stephanos", "stefanos"],
  ["vlasie", "blaise", "blasius", "vlasios"],
  ["varlaam", "barlaam"],
  ["varnava", "barnabas"],
  ["uar", "varus"],
  ["vartolomeu", "bartholomew"],
  ["andrei", "andrew", "andreas"],
  ["matei", "matthew", "matthaios"],
  ["matia", "matthias"],
  ["luca", "luke", "lucas"],
  ["marcu", "mark", "marcus"],
  ["toma", "thomas"],
  ["filip", "philip"],
  ["petru", "peter", "petros"],
  ["grigorie", "gregory", "grigorios", "grigore"],
  ["ignatie", "ignatius"],
  ["antonie", "anthony", "antony", "antonius"],
  ["arsenie", "arsenius"],
  ["atanasie", "athanasius"],
  ["chiril", "cyril", "kyrillos", "kirill"],
  ["clement", "clement", "kliment"],
  ["constantin", "constantine"],
  ["damian", "damian"],
  ["efrem", "ephraim", "ephrem"],
  ["eutihie", "eutychius"],
  ["evstratie", "eustratius"],
  ["ghenadie", "gennadius"],
  ["gherman", "germanus"],
  ["ieronim", "jerome"],
  ["isidor", "isidore"],
  ["iustin", "justin"],
  ["iulian", "julian"],
  ["iuliana", "juliana"],
  ["iulita", "julitta"],
  ["macarie", "macarius"],
  ["paisie", "paisius"],
  ["pahomie", "pachomius"],
  ["pantelimon", "panteleimon"],
  ["spiridon", "spyridon"],
  ["trifon", "tryphon"],
  ["visarion", "bessarion"],
  ["zotic", "zoticus"],
  ["dorotei", "dorotheus"],
  ["eusebiu", "eusebius"],
  ["eugenia", "eugenia"],
  ["evghenie", "eugene", "eugenius"],
  ["policarp", "polycarp"],
  ["porfirie", "porphyrius"],
  ["procopie", "procopius"],
  ["sofronie", "sophronius"],
  ["valentin", "valentine"],
  ["valent", "valens"],
  ["vichentie", "vincent"],
  ["vladimir", "vladimir"],
  ["zenovie", "zenobius"],
  ["calinic", "callinicus"],
  ["daniil", "daniel"],
  ["ilie", "elijah"],
  ["agatanghel", "agathangelus"],
  ["agnia", "agnes"],
  ["agapie", "agapius"],
  ["ahila", "achillius"],
  ["calist", "callistus"],
  ["chiriac", "cyriacus"],
  ["ciprian", "cyprian"],
  ["clavdie", "claudius"],
  ["cosma", "cosmas"],
  ["dionisie", "dionysius"],
  ["epifanie", "epiphanius"],
  ["ermolae", "hermolaus"],
  ["eftimie", "euthymius"],
  ["gavriil", "gabriel"],
  ["ghelasie", "gelasius"],
  ["ierotei", "hierotheus"],
  ["ioanichie", "joannicius"],
  ["isaac", "isaac"],
  ["leontie", "leontius"],
  ["leon", "leo"],
  ["lucian", "lucian"],
  ["mamant", "mamas"],
  ["crescent", "crescens"],
  ["mercurie", "mercurius"],
  ["metodie", "methodius"],
  ["mitrofan", "metrophanes"],
  ["nectarie", "nectarius", "nektarios"],
  ["nifon", "niphon"],
  ["onufrie", "onuphrius"],
  ["pimen", "poemen"],
  ["platon", "plato"],
  ["sisoe", "sisoes"],
  ["talaleu", "thalelaeus"],
  ["teoctist", "theoctistus"],
  ["teofan", "theophanes"],
  ["teofilact", "theophylact"],
  ["teopempt", "theopemptus"],
  ["varahisie", "barachisius"],
  ["zosima", "zosimas"],
];

const EQUIV = new Map<string, string>();
for (const group of EQUIVALENTS) {
  const key = group[0] ?? "";
  for (const name of group) if (!EQUIV.has(name)) EQUIV.set(name, key);
}

/** The canonical spelling of an irregular name, if it has one. */
export function equivalent(word: string): string | undefined {
  return EQUIV.get(fold(word));
}

/** Consonant skeleton of a name, comparable across Romanian and English spellings. */
export function skeleton(word: string): string {
  let w = fold(word).replace(/[^a-z]/g, "");
  // Latin and Greek endings (English) and Romanian endings.
  w = w.replace(/(ius|ios|eus|aeus|us|os|ie|iu|ia|ea|is|as|es|e|a|i|o|u|y)$/, "");
  w = w
    // Romanian "Hr-" is Greek "Chr-" (Hristofor / Christopher, Hrisant / Chrysanthus).
    .replace(/^hr/, "cr")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/ch/g, "c")
    .replace(/kh/g, "c")
    .replace(/gh/g, "g")
    .replace(/k/g, "c")
    .replace(/q/g, "c")
    .replace(/x/g, "cs")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/w/g, "b")
    .replace(/j/g, "i")
    .replace(/h/g, "")
    .replace(/y/g, "i");
  // Drop vowels after the first letter, collapse doubled consonants.
  const first = w.slice(0, 1);
  const rest = w.slice(1).replace(/[aeiou]/g, "");
  return (first + rest).replace(/(.)\1+/g, "$1");
}

/** Similarity of two first names (equivalents first, then skeletons), from 0 to 1. */
export function givenSimilarity(a: { key: string; eq?: string }, b: { key: string; eq?: string }): number {
  if (a.eq && b.eq) return a.eq === b.eq ? 1 : 0;
  return nameSimilarity(a.key, b.key);
}

/** Similarity of two name skeletons, from 0 to 1. */
export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // Leading vowels are often dropped or added (Ecaterina / Catherine).
  const sa = a.replace(/^[aeiou]/, "");
  const sb = b.replace(/^[aeiou]/, "");
  if (sa === sb && sa.length >= 2) return 0.9;
  const short = sa.length <= sb.length ? sa : sb;
  const long = sa.length <= sb.length ? sb : sa;
  if (short.length >= 3 && long.startsWith(short)) return 0.8;
  const d = levenshtein(sa, sb);
  const max = Math.max(sa.length, sb.length);
  if (max >= 4 && d === 1) return 0.75;
  if (max >= 6 && d === 2) return 0.6;
  return 0;
}

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j] ?? 0;
      prev[j] = Math.min((prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length] ?? 0;
}
