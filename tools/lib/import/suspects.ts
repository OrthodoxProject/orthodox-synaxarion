/**
 * The matches of the import that a reviewer should check against the sources, for the whole year at once (see
 * docs/PLAN.md), instead of day by day. Each check lists one kind of mistake the first import made:
 *
 * - official-missing: a name of an official title whose saint the line does not hold, while another Romanian line of
 *   the day holds a saint of that name ("Sf. Cuv. Iosif Imnograful, Gheorghe din Maleon și Zosima", 4 April, held
 *   George and Joseph only: Zosima stood on a line of his own; "Sf. Mc. Iulian din Tars și Afrodisie", 21 June);
 * - tie: a saint with a Romanian name joined to one OCA saint, while the OCA has another saint of that first name that
 *   day whom the Romanian name fits as well, and whom the kind of holiness does not tell apart (the Romanian "Sf. Cuv.
 *   Zosima" of 4 April went to Zosimas of Vorbozomsk, listed first, not to Zosimas of Palestine);
 * - same-day: two saints of one first name on the Romanian lines of a day, one of them known only from a Romanian
 *   source ("Sf. Cuv. Iosif, scriitorul de cântări" of doxologia was the official calendar's "Iosif Imnograful");
 * - romanian-only: a saint known only from the Romanian sources and one known only from the OCA, of one first name, on
 *   the same day (the same saint, when the two calendars describe him in other words: "Maria Egipteanca" / "Mary of
 *   Egypt").
 *
 * The lists only point at what to read: two saints of one name on one day are often two saints.
 */
import { holinessAgrees, personScore } from "./cluster.ts";
import { parseEn } from "./en.ts";
import type { Existing } from "./existing.ts";
import type { HolinessType, NamePart } from "./model.ts";
import { fold, givenSimilarity, skeleton } from "./names.ts";
import { parseRo } from "./ro.ts";

export type SuspectCheck = "official-missing" | "tie" | "same-day" | "romanian-only";

export interface Suspect {
  check: SuspectCheck;
  /** MM-DD */
  date: string;
  /** The ids of the records to read, the first one the record the check is about. */
  ids: string[];
  /** What to check, in a line. */
  text: string;
  /** How well the names fit, where the check compares two names (see personScore). */
  score?: number;
}

type Rec = Record<string, any>;

/** Honorifics and words of the official titles that name no saint. */
const NOT_A_NAME = new Set(["sf", "sfantul", "sfanta", "sfintii", "sfintele", "cuv", "cuvioasa", "cuviosul", "mc", "mucenic", "mucenita", "ier", "ap", "mare", "marele", "drept", "dreptul", "dreapta", "proroc", "prooroc", "sfintit", "mart", "cuviosii", "mucenici", "ierarhi", "apostoli", "duminica", "pomenirea", "aducerea", "cinstirea", "soborul", "icoanei", "maicii", "domnului", "iisus", "hristos"]);

export function findSuspects(existing: Existing): Suspect[] {
  const ds = existing.dataset;
  const persons = ds.records.get("persons") ?? new Map<string, Rec>();
  const commemorations = ds.records.get("commemorations") ?? new Map<string, Rec>();
  // The loader leaves out machine translations: the names here are those the sources and the editors wrote.
  const nameOf = (id: string, locale: "ro" | "en"): Rec | undefined => ds.locales.get("persons")?.get(id)?.get(locale)?.names as Rec | undefined;
  const display = (id: string): string => (nameOf(id, "ro")?.display ?? nameOf(id, "en")?.display ?? id) as string;
  const label = (id: string): string => `${id} (${display(id)})`;
  const firstPart = (id: string): { part: NamePart; lang: "ro" | "en" } | undefined => {
    const ro = nameOf(id, "ro")?.display as string | undefined;
    const en = nameOf(id, "en")?.display as string | undefined;
    const part = ro ? parseRo(ro).names[0] : en ? parseEn(en).names[0] : undefined;
    return part ? { part, lang: ro ? "ro" : "en" } : undefined;
  };
  const sourcesOf = (id: string): string[] => ((persons.get(id)?.sources ?? []) as Rec[]).map((s) => String(s.source));
  const holinessOf = (id: string): Set<HolinessType> => new Set((persons.get(id)?.holiness_types ?? []) as HolinessType[]);
  const fromOca = (id: string): boolean => sourcesOf(id).includes("src:oca-lives");
  const romanianSources = (id: string): boolean => sourcesOf(id).some((s) => s === "src:doxologia" || s === "src:calendar-patriarhia");
  /** Known only from the Romanian sources: no OCA id, no other source. */
  const romanianOnly = (id: string): boolean => !persons.get(id)?.external_ids?.oca && nameOf(id, "ro") !== undefined && sourcesOf(id).every((s) => s === "src:doxologia" || s === "src:calendar-patriarhia");
  const ocaOnly = (id: string): boolean => Boolean(persons.get(id)?.external_ids?.oca) && nameOf(id, "ro") === undefined;
  const personsOfLine = (refs: string[]): string[] =>
    refs.flatMap((ref) => ((commemorations.get(ref.replace(/^comm:/, ""))?.subjects ?? []) as string[]).filter((s) => s.startsWith("person:")).map((s) => s.slice(7)));
  const linesOf = (tradition: string, date: string): string[][] => (existing.menaion.get(tradition)?.get(date) ?? []).map((l) => l.commemorations);
  const personsOfDay = (tradition: string, date: string): string[] => [...new Set(linesOf(tradition, date).flatMap(personsOfLine))];
  const dates = [...(existing.menaion.get("romanian")?.keys() ?? [])].sort();
  const out: Suspect[] = [];

  // official-missing
  const titles = (ds.locales.get("traditions")?.get("romanian")?.get("ro")?.official_titles ?? {}) as Record<string, string>;
  const keyOf = (word: string): string => skeleton(fold(word).replace(/[^a-z]/g, ""));
  for (const date of dates) {
    const lines = linesOf("romanian", date);
    for (const refs of lines) {
      const title = refs[0] ? titles[refs[0]] : undefined;
      // A feast's title names saints that are not its subjects ("Zămislirea Sfintei Fecioare Maria de către Sf. Ana").
      const subjects = refs.flatMap((ref) => (commemorations.get(ref.replace(/^comm:/, ""))?.subjects ?? []) as string[]);
      if (!title || !subjects.some((s) => s.startsWith("person:") || s.startsWith("group:"))) continue;
      const held = new Set<string>();
      for (const id of personsOfLine(refs)) {
        for (const locale of ["ro", "en"] as const) {
          const n = nameOf(id, locale);
          for (const text of [n?.given, n?.short, n?.display]) if (typeof text === "string") for (const w of text.split(/[\s,]+/)) held.add(keyOf(w));
        }
      }
      for (const ref of refs) {
        for (const s of (commemorations.get(ref.replace(/^comm:/, ""))?.subjects ?? []) as string[]) {
          if (!s.startsWith("group:")) continue;
          const g = ds.locales.get("groups")?.get(s.slice(6));
          for (const locale of ["ro", "en"]) for (const w of String(g?.get(locale)?.names?.display ?? "").split(/[\s,:]+/)) held.add(keyOf(w));
        }
      }
      const elsewhere = new Map<string, string[]>();
      for (const other of lines) {
        if (other === refs) continue;
        for (const id of personsOfLine(other)) {
          const given = (nameOf(id, "ro")?.given ?? nameOf(id, "en")?.given) as string | undefined;
          if (given) elsewhere.set(keyOf(given), [...(elsewhere.get(keyOf(given)) ?? []), id]);
        }
      }
      for (const word of title.replace(/\([^)]*\)/g, " ").split(/[\s,;:.()]+/)) {
        const f = fold(word).replace(/[^a-z]/g, "");
        if (!/^\p{Lu}/u.test(word) || f.length < 3 || NOT_A_NAME.has(f) || held.has(keyOf(word))) continue;
        const ids = elsewhere.get(keyOf(word));
        if (ids) out.push({ check: "official-missing", date, ids: [refs[0]?.replace(/^comm:/, "") ?? "", ...ids], text: `"${title}": ${word} stands on another line: ${ids.map(label).join(", ")}` });
      }
    }
  }

  // tie
  const ocaByDay = new Map<string, string[]>();
  // A saint of an OCA line: its OCA id may stand on the commemoration only ("Saints Barnabas and Sophronius of Asia Minor").
  for (const date of dates) ocaByDay.set(date, personsOfDay("russian", date).filter(fromOca));
  for (const date of dates) {
    for (const id of personsOfDay("romanian", date)) {
      const ro = nameOf(id, "ro")?.display as string | undefined;
      const en = nameOf(id, "en")?.display as string | undefined;
      if (!ro || !en || !fromOca(id) || !romanianSources(id)) continue;
      const part = parseRo(ro).names[0];
      const joined = parseEn(en).names[0];
      if (!part || !joined) continue;
      const score = personScore(part, joined, true);
      for (const other of ocaByDay.get(date) ?? []) {
        // A saint with a Romanian name of his own has his own Romanian line.
        const name = other === id || nameOf(other, "ro") ? undefined : (nameOf(other, "en")?.display as string | undefined);
        const otherPart = name ? parseEn(name).names[0] : undefined;
        if (!otherPart || givenSimilarity(part, otherPart) < 1) continue;
        const otherScore = personScore(part, otherPart, true);
        if (otherScore < score - 0.05 || !holinessAgrees(holinessOf(id), holinessOf(other))) continue;
        out.push({ check: "tie", date, ids: [id, other], text: `${ro} is ${en}, and fits ${label(other)} as well`, score: otherScore });
      }
    }
  }

  // same-day
  for (const date of dates) {
    const ids = personsOfDay("romanian", date);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i] ?? "";
        const b = ids[j] ?? "";
        if (!romanianOnly(a) && !romanianOnly(b)) continue;
        const pa = firstPart(a);
        const pb = firstPart(b);
        if (!pa || !pb || givenSimilarity(pa.part, pb.part) < 1) continue;
        const score = personScore(pa.part, pb.part, pa.lang !== pb.lang);
        out.push({ check: "same-day", date, ids: romanianOnly(a) ? [a, b] : [b, a], text: `${label(a)} and ${label(b)}`, score });
      }
    }
  }

  // romanian-only
  for (const date of dates) {
    const romanian = personsOfDay("romanian", date).filter(romanianOnly);
    const russian = personsOfDay("russian", date).filter(ocaOnly);
    for (const a of romanian) {
      const pa = firstPart(a);
      for (const b of russian) {
        const pb = firstPart(b);
        if (!pa || !pb || givenSimilarity(pa.part, pb.part) < 1 || !holinessAgrees(holinessOf(a), holinessOf(b))) continue;
        out.push({ check: "romanian-only", date, ids: [a, b], text: `${label(a)} and ${label(b)}`, score: personScore(pa.part, pb.part, true) });
      }
    }
  }
  return out;
}
