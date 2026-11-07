/** Markdown of the long texts. Raw HTML is shown as text and script links are dropped. */
import { Marked } from "marked";

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const md = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
  walkTokens(token) {
    if ((token.type === "link" || token.type === "image") && /^\s*(?:javascript|vbscript|data):/i.test(token.href)) token.href = "#";
  },
});

export function markdown(text: string): string {
  return md.parse(text) as string;
}
