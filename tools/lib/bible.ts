/**
 * Bible references in the form "LUK 8:16-21", "GAL 5:22-26; 6:1-2",
 * "HEB 11:9-10, 32-40" or "JHN 15:17-16:2": USFM book code, then chapter:verse
 * ranges. ", " adds verses in the same chapter, "; " starts a new chapter.
 */

const VERSE = "[1-9][0-9]*[a-z]?";
const RANGE = `${VERSE}(?:-(?:[1-9][0-9]*:)?${VERSE})?`;
const CHAPTER_PART = `[1-9][0-9]*:${RANGE}(?:, ?${RANGE})*`;
const REF_RE = new RegExp(`^([1-4]?[A-Z0-9]{2,3}) (${CHAPTER_PART}(?:; ?${CHAPTER_PART})*)$`);

export function parseBibleRef(value: string): { book: string; passage: string } | null {
  const m = REF_RE.exec(value);
  if (!m || !m[1] || !m[2]) return null;
  return { book: m[1], passage: m[2] };
}

export function isValidBibleRef(value: string, books: ReadonlySet<string>): boolean {
  const parsed = parseBibleRef(value);
  return parsed !== null && books.has(parsed.book);
}
