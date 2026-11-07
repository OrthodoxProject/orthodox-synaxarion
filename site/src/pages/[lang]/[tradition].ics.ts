import type { APIRoute } from "astro";
import { bibleRefText, churchDateText, lineTitle, readingRoleText, traditionName, vocab } from "../../lib/format.ts";
import { icsCalendar } from "../../lib/ics.ts";
import { calendarTraditions, dayHref, daysOf, ds, siteYears } from "../../lib/site.ts";
import { LANGS, t, type Lang } from "../../lib/ui.ts";

export function getStaticPaths() {
  return LANGS.flatMap((lang) => calendarTraditions().map((tradition) => ({ params: { lang, tradition } })));
}

type Rec = Record<string, any>;

export const GET: APIRoute = ({ params, site }) => {
  const lang = params.lang as Lang;
  const tradition = params.tradition as string;
  const glyphs = new Map(((ds().traditions.get(tradition)?.symbol_legend ?? []) as Rec[]).map((s) => [s.key as string, s.glyph as string]));
  const events = siteYears()
    .flatMap((year) => daysOf(tradition, year))
    .filter((day) => day.lines.length > 0)
    .map((day) => {
      const summary = day.lines
        .map((line) => {
          const glyph = line.symbol ? glyphs.get(line.symbol) : undefined;
          return glyph ? `${glyph} ${lineTitle(line, lang, tradition)}` : lineTitle(line, lang, tradition);
        })
        .join("; ");
      const details = [
        churchDateText(day, lang),
        day.fasting ? `${t(lang, "fasting")}: ${vocab(lang, `fasting_level.${day.fasting}`)}` : undefined,
        ...(day.readings ?? []).map((r) => `${readingRoleText(r.role, lang)}: ${bibleRefText(r.ref, lang)}`),
      ].filter((d): d is string => d !== undefined);
      return {
        date: day.date,
        summary,
        description: details.length > 0 ? details.join("\n") : undefined,
        url: site ? new URL(dayHref(lang, tradition, day.date), site).href : undefined,
      };
    });
  const body = icsCalendar({ name: `${traditionName(tradition, lang)} · ${t(lang, "siteName")}`, id: `${tradition}-${lang}`, events, stamp: new Date() });
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
