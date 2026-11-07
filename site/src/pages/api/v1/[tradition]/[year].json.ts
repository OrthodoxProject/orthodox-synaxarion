import type { APIRoute } from "astro";
import { calendarTraditions, daysOf, siteYears } from "../../../../lib/site.ts";

/** Every day of a year in a tradition, as records of schema/build/day.schema.json. */
export function getStaticPaths() {
  return calendarTraditions().flatMap((tradition) => siteYears().map((year) => ({ params: { tradition, year: String(year) } })));
}

export const GET: APIRoute = ({ params }) => {
  const days = daysOf(params.tradition as string, Number(params.year));
  return new Response(JSON.stringify(days), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
