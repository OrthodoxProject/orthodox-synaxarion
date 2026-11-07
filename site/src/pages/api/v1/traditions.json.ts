import type { APIRoute } from "astro";
import { traditionName } from "../../../lib/format.ts";
import { calendarTraditions, ds, siteYears } from "../../../lib/site.ts";
import { LANGS } from "../../../lib/ui.ts";

/** Index of the JSON files: traditions with their names and the years that have data. */
export const GET: APIRoute = () => {
  const years = siteYears();
  const traditions = calendarTraditions().map((id) => {
    const info = ds().traditions.get(id) ?? {};
    return {
      id,
      family: info.family,
      calendar_style: info.calendar_style,
      paschalion: info.paschalion,
      names: Object.fromEntries(LANGS.map((lang) => [lang, traditionName(id, lang)])),
      years: Object.fromEntries(years.map((year) => [year, `${id}/${year}.json`])),
    };
  });
  return new Response(JSON.stringify({ years, traditions }, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
