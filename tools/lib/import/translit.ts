/**
 * Latin spellings of names written in Cyrillic (Bulgarian, Ukrainian, Russian, Serbian), Greek and Georgian, so that
 * the name keys of names.ts (skeleton, equivalent) compare them with the Romanian and English names of the data, and
 * so that new records named only in those languages get Latin ids.
 *
 * The letters follow the usual romanizations where they help the comparison and depart from them where they would
 * hide it: Cyrillic г is always g (Ukrainian Георгій is Georgii, not Heorhii, as George), х is h (Христофор,
 * Hristofor), ъ is a (Bulgarian Димитър, Dimitar); Georgian ფ, which renders Greek φ, is f (ფილიპე, Filipe), and the
 * letters that differ only by aspiration are one (თ and ტ are t, ქ and კ are k).
 */

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", ђ: "dj", е: "e", ё: "e", є: "ie", ж: "j", з: "z", ѕ: "dz", и: "i", і: "i",
  ї: "i", й: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c",
  у: "u", ў: "u", ф: "f", х: "h", ц: "ts", ч: "ch", џ: "dz", ш: "sh", щ: "sht", ъ: "a", ы: "i", ь: "", э: "e", ю: "iu",
  я: "ia", ѣ: "e", ѳ: "f", ѵ: "i", ѫ: "a",
};

const GREEK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o",
  π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

const GEORGIAN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t", ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p",
  ჟ: "zh", რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "f", ქ: "k", ღ: "gh", ყ: "q", შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz", წ: "ts",
  ჭ: "ch", ხ: "kh", ჯ: "j", ჰ: "h", ჱ: "ei", ჲ: "i", ჳ: "v", ჴ: "kh", ჵ: "o",
};

/** Accents of Greek and the stress marks of Cyrillic texts; the breve of й and the diaeresis of ї, ё stay (NFC). */
const MARKS = /[̀́̓̔͂ͅ]/g;

/** The text in Latin letters; what is already Latin (letters, digits, spaces, punctuation) stays as it is. */
export function romanize(text: string): string {
  const t = text.normalize("NFD").replace(MARKS, "").normalize("NFC");
  let out = "";
  for (const c of t) {
    const lower = c.toLowerCase();
    const latin = CYRILLIC[lower] ?? GREEK[lower] ?? GEORGIAN[lower];
    if (latin === undefined) out += c;
    else if (c !== lower && latin) out += latin.charAt(0).toUpperCase() + latin.slice(1);
    else out += latin;
  }
  return out;
}

/** Whether a text is written mostly in Cyrillic, Greek or Georgian letters. */
export function isNonLatin(text: string): boolean {
  let other = 0;
  let latin = 0;
  for (const c of text) {
    if (/\p{Script=Latin}/u.test(c)) latin++;
    else if (/[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Georgian}]/u.test(c)) other++;
  }
  return other > latin;
}
