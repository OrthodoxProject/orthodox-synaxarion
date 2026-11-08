/**
 * nikolareljin/orthodox-calendar: the lists of local saints of the Russian,
 * Serbian and Romanian Churches (backend/app/data/traditions/<id>_saints.json),
 * which complete the shared Byzantine calendar. Only the index is used (day,
 * name, link); the notes come from other sites and are not copied.
 */
import type { PoliteFetcher } from "../fetch.ts";

const RAW = "https://raw.githubusercontent.com/nikolareljin/orthodox-calendar/main/backend/app/data/traditions";

export const OVERLAYS = [
  { tradition: "russian", file: "russian_saints.json" },
  { tradition: "serbian", file: "serbian_saints.json" },
  { tradition: "romanian", file: "romanian_saints.json" },
] as const;

export interface OverlayEntry {
  tradition: string;
  file: string;
  /** Day as the list gives it: the civil date when `calendar` is "julian" (see units.ts). */
  month: number;
  day: number;
  order: number;
  name: string;
  title: string;
  url?: string;
  feastType?: string;
  /** "julian" (Russian and Serbian lists) or "revised" (Romanian list). */
  calendar?: string;
}

export function overlayLocator(file: string): string {
  return `backend/app/data/traditions/${file}`;
}

export async function crawl(fetcher: PoliteFetcher): Promise<OverlayEntry[]> {
  const out: OverlayEntry[] = [];
  for (const { tradition, file } of OVERLAYS) {
    const days = JSON.parse(await fetcher.get(`${RAW}/${file}`)) as Array<{ month_day: string; calendar?: string; saints: Array<Record<string, unknown>> }>;
    for (const day of days) {
      const [month, d] = day.month_day.split("-").map(Number);
      day.saints.forEach((s, order) => {
        const entry: OverlayEntry = {
          tradition,
          file,
          month: month ?? 0,
          day: d ?? 0,
          order,
          name: String(s.name ?? "").trim(),
          title: String(s.title ?? s.name ?? "").trim(),
        };
        if (typeof day.calendar === "string") entry.calendar = day.calendar;
        if (typeof s.hagiography_url === "string" && /^https?:\/\//.test(s.hagiography_url)) entry.url = s.hagiography_url;
        if (typeof s.feast_type === "string") entry.feastType = s.feast_type;
        out.push(entry);
      });
    }
  }
  return out;
}
