<div align="center">

<img src="docs/logo.svg" alt="An Orthodox cross over an open book, inside a golden halo" width="160">

# orthodox-synaxarion

</div>

Orthodox Saints of the World: an open, structured, multilingual synaxarion of the Orthodox Churches (Eastern Orthodox, Oriental Orthodox and the Assyrian Church of the East), as JSON data validated by JSON Schema. A website with search, a static API and calendar feeds is generated from it.

**Status:** schema v0.1, with 17 edge-case examples. All records are drafts awaiting review.

## Documentation

[docs/SCHEMA.md](docs/SCHEMA.md) (in Romanian) explains how the data is organized and how to contribute.

## Quick start

Requires Node.js 24 or newer.

```bash
npm install
```

```bash
npm run check
```

`npm run check` type-checks the tools, runs the tests and validates everything in `data/`. Use `npm run format` to rewrite data files in canonical form.

```bash
npm run generate -- --year 2026
```

`npm run generate` computes every day of the year for each tradition (fixed and movable commemorations, transfers, tone, Resurrection Gospel, fasting, readings, public holidays) into `build/days/`.

## Website

```bash
npm run site:build
```

`npm run site:build` builds the static website into `build/site/` (with Astro) and its search index (with Pagefind). `npm run site:preview` then serves it at http://localhost:4321/orthodox-synaxarion/, and `npm run site:dev` runs a development server.

The website is in Romanian and English:

- `/ro/` and `/en/`: today's commemorations in the Romanian Orthodox Church, the next days, and the same day in the other traditions
- `/<lang>/<tradition>/<year>/<month>/` and `/<lang>/<tradition>/<year>/<month>/<day>/`: each tradition's calendar, with tone, fasting and readings
- `/<lang>/saints/<id>/`, `/<lang>/groups/<id>/` and `/<lang>/feasts/<id>/`: saints, groups of saints and feasts, with their days in every tradition
- `/<lang>/search/`: full-text search
- `/<lang>/<tradition>.ics`: a calendar feed to subscribe to from a phone or a calendar app
- `/api/v1/traditions.json` and `/api/v1/<tradition>/<year>.json`: the generated days as JSON (records of `schema/build/day.schema.json`)

Day pages are built for the current year and the next one; set `SITE_YEARS=2026,2027` to choose other years. Machine translations are left out until someone has reviewed them.

### Publishing on GitHub Pages

The `Site` workflow (`.github/workflows/pages.yml`) builds and publishes the website on every push to `main` and every night, so that "today" stays current. To turn it on, open the repository's Settings → Pages and set Source to "GitHub Actions" (needed only once). GitHub turns off scheduled workflows in repositories with no activity for 60 days; if that happens, turn it back on from the Actions tab.

## Layout

- `schema/`: JSON Schema (draft 2020-12) for every kind of data file
- `data/`: the dataset (language-neutral records, traditions' calendars, and `data/i18n/<locale>/` for every text)
- `tools/`: validator, formatter and calendar generator (TypeScript, run directly by Node)
- `site/`: the website (Astro pages that read `data/` through the tools)
- `tests/`: tests for the validator
