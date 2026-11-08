/** Pages left at the old addresses of records (the former ids in their aliases), so that old links keep working. */
import { linkOf, nameOf } from "./format.ts";
import { t, type Lang } from "./ui.ts";

const escapeHtml = (text: string): string => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Page at an old address of a record: it sends readers on to the record's page in the same language
 * (meta refresh) and search engines too (canonical link, noindex). It has no data-pagefind-body, so the
 * site's search leaves it out.
 */
export function redirectPage(ref: string, lang: Lang): Response {
  const to = linkOf(ref, lang);
  if (!to) throw new Error(`${ref} has no page to redirect to.`);
  const name = nameOf(ref, lang);
  // The public address, from the configured site, like the one in "Report a mistake".
  const canonical = import.meta.env.SITE ? new URL(to, import.meta.env.SITE).href : to;
  const html = `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <meta http-equiv="refresh" content="0; url=${escapeHtml(to)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <title>${escapeHtml(`${name} · ${t(lang, "siteName")}`)}</title>
  </head>
  <body>
    <p>${escapeHtml(t(lang, "pageMoved"))} <a href="${escapeHtml(to)}">${escapeHtml(name)}</a></p>
  </body>
</html>
`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
