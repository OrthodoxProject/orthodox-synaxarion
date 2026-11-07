/** Text-level helpers: canonical JSON, Unicode normalization, Romanian diacritics, front matter. */

/** The one accepted formatting of a JSON data file: 2-space indent, LF, final newline. */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** ş ţ Ş Ţ (cedilla) instead of ș ț Ș Ț (comma below). */
const CEDILLA = /[ŞşŢţ]/;
const CEDILLA_MAP: Record<string, string> = {
  "Ş": "Ș",
  "ş": "ș",
  "Ţ": "Ț",
  "ţ": "ț",
};

export function hasCedilla(text: string): boolean {
  return CEDILLA.test(text);
}

export function fixCedilla(text: string): string {
  return text.replace(/[ŞşŢţ]/g, (c) => CEDILLA_MAP[c] ?? c);
}

/** Every string value in a JSON tree, with its JSON pointer. */
export function* strings(value: unknown, pointer = ""): Generator<[string, string]> {
  if (typeof value === "string") {
    yield [pointer, value];
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* strings(value[i], `${pointer}/${i}`);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      yield [`${pointer}/${k}#key`, k];
      yield* strings(v, `${pointer}/${k}`);
    }
  }
}

/** Applies a function to every string (values and keys) of a JSON tree. */
export function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), mapStrings(v, fn)]));
  }
  return value;
}

/** Splits "---\n<yaml>\n---\n<body>" into front matter and body. */
export function splitFrontMatter(text: string): { frontMatter: string; body: string } | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return null;
  return { frontMatter: m[1] ?? "", body: m[2] ?? "" };
}
