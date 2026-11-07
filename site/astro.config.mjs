// Static site built from data/ (run from the repository root: npm run site:build).
// SITE_URL and SITE_BASE come from the Pages settings when the site is published.
import { defineConfig } from "astro/config";

const base = process.env.SITE_BASE;

export default defineConfig({
  site: process.env.SITE_URL || "https://orthodoxproject.github.io",
  base: base === undefined ? "/orthodox-synaxarion" : base || "/",
  outDir: "../build/site",
  cacheDir: "../node_modules/.astro",
  trailingSlash: "always",
  build: { format: "directory" },
  // The pages import the tooling and read the data outside the site folder.
  vite: { server: { fs: { allow: [".."] } } },
});
