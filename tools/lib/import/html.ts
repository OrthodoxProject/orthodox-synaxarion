/** Small HTML helpers for the importers (the pages are simple enough to need no parser library). */

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  bdquo: "„",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  middot: "·",
  dagger: "†",
  acirc: "â",
  Acirc: "Â",
  icirc: "î",
  Icirc: "Î",
  atilde: "ã",
  abreve: "ă",
  Abreve: "Ă",
  aacute: "á",
  Aacute: "Á",
  eacute: "é",
  Eacute: "É",
  iacute: "í",
  Iacute: "Í",
  oacute: "ó",
  Oacute: "Ó",
  uacute: "ú",
  Uacute: "Ú",
  yacute: "ý",
  agrave: "à",
  egrave: "è",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  ecirc: "ê",
  ocirc: "ô",
  ucirc: "û",
  auml: "ä",
  euml: "ë",
  iuml: "ï",
  ouml: "ö",
  uuml: "ü",
  Ouml: "Ö",
  Uuml: "Ü",
  ntilde: "ñ",
  ccedil: "ç",
  scaron: "š",
  Scaron: "Š",
  zcaron: "ž",
  emacr: "ē",
  amacr: "ā",
  omacr: "ō",
  szlig: "ß",
  oslash: "ø",
  aring: "å",
  aelig: "æ",
  rsaquo: "›",
  lsaquo: "‹",
};

/** Decodes HTML character references. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z]+);/g, (whole, ref: string) => {
    if (ref.startsWith("#x")) return String.fromCodePoint(Number.parseInt(ref.slice(2), 16));
    if (ref.startsWith("#")) return String.fromCodePoint(Number.parseInt(ref.slice(1), 10));
    return NAMED[ref] ?? whole;
  });
}

/** Text content of an HTML fragment, with collapsed white space. */
export function textOf(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Normalizes text taken from a page: NFC, single spaces, ș/ț with comma below, no stray spaces before punctuation. */
export function cleanText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[   ]/g, " ")
    .replace(/[ŞşŢţ]/g, (c) => ({ Ş: "Ș", ş: "ș", Ţ: "Ț", ţ: "ț" })[c] ?? c)
    .replace(/\s+/g, " ")
    .replace(/\s+([,;.:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();
}
