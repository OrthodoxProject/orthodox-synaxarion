<div align="center">

<img src="docs/logo.svg" alt="An Orthodox cross over an open book, inside a golden halo" width="160">

# orthodox-synaxarion

Orthodox Saints of the World: an open, structured, multilingual synaxarion of the Orthodox Churches (Eastern Orthodox, Oriental Orthodox and the Assyrian Church of the East), as JSON data validated by JSON Schema. A [website](https://orthodoxproject.github.io/orthodox-synaxarion/) with search, a static API and calendar feeds is generated from it, and so is the documentation [wiki](https://github.com/OrthodoxProject/orthodox-synaxarion/wiki).

</div>


**Status:** schema v0.1. The dataset holds 3,923 holy persons (saints, the Theotokos, archangels) and 4,769 commemorations, with complete Romanian, Russian and Coptic calendars: 17 edge-case examples, and the rest imported from the sources in `data/sources/`. All records are drafts awaiting review.

## Documentation

[docs/SCHEMA.md](docs/SCHEMA.md) (in Romanian) explains how the data is organized and how to contribute. The [wiki](https://github.com/OrthodoxProject/orthodox-synaxarion/wiki) adds a reference of every schema, the vocabulary in each language and the coverage of the data, with what is still missing.

## Quick start

Requires Node.js 24 or newer.

```bash
npm install
```

```bash
npm run check
```

`npm run check` type-checks the tools and the website, runs the tests and validates everything in `data/`. Use `npm run format` to rewrite data files in canonical form.

```bash
npm run generate -- --year 2026
```

`npm run generate` computes every day of the year for each tradition (fixed and movable commemorations, transfers, tone, Resurrection Gospel, fasting, readings, public holidays) into `build/days/`.

## Importing from the sources

```bash
npm run import
```

`npm run import` reads the sources listed in `data/sources/` (the official calendar of the Romanian Patriarchate, doxologia.ro, the OCA lives of the saints, the local lists of orthodox-calendar, the Coptic Synaxarium of copticchurch.net and st-takla.org, and the Armenian calendar of armenianchurch.ge) and adds the saints and feasts they list to `data/`: persons, groups, icons, commemorations, their names in Romanian and English, and the calendar lines of each tradition, plus the fasting printed in the official Romanian calendar, which goes to the yearly overrides. It takes only facts (names, days, crosses, links, fasting), never the texts of the lives. The same saint found in several sources becomes one record. Pages are cached in `build/cache/`, and robots.txt and the sites' crawl delays are honoured, so the first run takes about two hours; `--offline` works from the cache only and `--dry-run` only reports. Existing records are never rewritten. Run `npm run format` and `npm run check` afterwards. See [docs/SCHEMA.md](docs/SCHEMA.md#importul-din-surse) for how the sources are matched.

## Translating the names

```bash
npm run translate -- --export
```

Many records are named in only one of the site's languages: the saints of the OCA, Coptic and Armenian calendars in English, those of the Romanian calendar in Romanian. `npm run translate -- --export` lists what each language lacks in `build/translate/<locale>.json`: every entry gives the names or texts to translate, their language and some context (kind, gender, holiness, the traditions that keep the record). Fill each entry's `target` with the translation, in the shape of its `source`, then `npm run translate -- --apply` writes the locale files, marked as machine translations (`--method human` for a translation made by a person). A record's own names are never replaced, only earlier machine translations, and the importer does not match names against machine translations. Run `npm run check` afterwards. See [docs/SCHEMA.md](docs/SCHEMA.md#traducerea-numelor).

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
- `/<lang>/calendars/` and `/<lang>/calendars/<calendar>/`: today in 18 calendars (Gregorian, Julian, Byzantine, Coptic, Ethiopian, Armenian, Syriac, Hebrew, Islamic, Bahá'í, Buddhist, Sikh, Persian, Indian, Chinese, Japanese, Roman and the Julian Day), with a page for each calendar: description, history, method of calculation and references
- `/<lang>/<tradition>.ics`: a calendar feed to subscribe to from a phone or a calendar app
- `/api/v1/traditions.json` and `/api/v1/<tradition>/<year>.json`: the generated days as JSON (records of `schema/build/day.schema.json`)

At the end of every day page and of the home page, a closed panel, "This date in other calendars", gives the same day in these calendars; the "i" next to each one shows its description and leads to its page. The conversions are in `tools/lib/calendar-systems.ts`, and the pages are the Markdown files of `docs/calendars/ro/` and `docs/calendars/en/`, which can also be read on GitHub.

Day pages are built for the current year and the next one; set `SITE_YEARS=2026,2027` to choose other years. Every page is in the reader's language: a name or a text that a record has only in the other language is shown as a machine translation, with a notice, until someone reviews it.

Old addresses keep working: each former id in the `aliases` of a person, group or commemoration (for instance a duplicate merged into it) keeps a small page at `/<lang>/saints/<alias>/`, `/<lang>/groups/<alias>/` or `/<lang>/feasts/<alias>/` that sends the reader on to the record's page in the same language (for a saint's day, the saint's page). These pages are marked `noindex` and are left out of the search and the lists.

Pages end with a "Report a mistake" link to the correction form among the repository's issues, with the page's public address already filled in as the place of the mistake (on the home page, the address of today's day page).

### Publishing on GitHub Pages

The `Site` workflow (`.github/workflows/pages.yml`) builds and publishes the website on every push to `main` and every night, so that "today" stays current. To turn it on, open the repository's Settings → Pages and set Source to "GitHub Actions" (needed only once). GitHub turns off scheduled workflows in repositories with no activity for 60 days; if that happens, turn it back on from the Actions tab.

## Wiki

```bash
npm run wiki
```

`npm run wiki` writes the wiki pages to `build/wiki/`: the guide from `docs/SCHEMA.md`, a reference of every schema, the vocabulary and the coverage of the data. The `Wiki` workflow (`.github/workflows/wiki.yml`) publishes them to the repository's wiki whenever data, schemas, docs or tools change on `main`, replacing every page. Edit the repository, not the wiki; to keep it that way, restrict wiki editing to collaborators in Settings → General → Features.

## Contributing

Corrections, missing saints, names in other languages, reviews of the drafts and new sources are all welcome. [Open an issue](https://github.com/OrthodoxProject/orthodox-synaxarion/issues/new/choose) and choose the form that fits: each one asks for what is needed to act on it, above all a source for every fact. The forms are in English, but you can write in Romanian. To change the data yourself, follow the [guide](docs/SCHEMA.md) and open a pull request.

Issues are sorted with [labels](https://github.com/OrthodoxProject/orthodox-synaxarion/labels): one `type:` (correction, addition, translation, review, source, bug, feature, question), the `area:` of the repository, the `tradition:` and the `lang:` it concerns, and a `status:`; `good first issue` and `help wanted` show newcomers where to start. The forms add `status: triage` and the type, and maintainers add the rest.

```bash
npm run labels
```

The labels are listed in `.github/labels.yml`. `npm run labels` checks the list and the issue forms in `.github/ISSUE_TEMPLATE/`, and so does `npm test`: every tradition in `data/traditions/` and every language in `data/i18n/` needs its label and its option in the forms. The `Labels` workflow (`.github/workflows/labels.yml`) applies the list to the repository whenever it changes on `main`. It creates the missing labels, updates the others and renames GitHub's default ones (`bug` becomes `type: bug`), so that their issues keep them; labels that are not in the list are left alone. To apply the list by hand, run `npm run labels -- --sync` with a token in `GITHUB_TOKEN`; `--dry-run` only shows what would change.

## Layout

- `schema/`: JSON Schema (draft 2020-12) for every kind of data file
- `data/`: the dataset (language-neutral records, traditions' calendars, and `data/i18n/<locale>/` for every text)
- `docs/`: the data guide and the pages about the calendars (`docs/calendars/`)
- `tools/`: validator, formatter, calendar generator, conversions to other calendars, wiki generator, importer and translation worklists (TypeScript, run directly by Node)
- `site/`: the website (Astro pages that read `data/` through the tools)
- `tests/`: tests for the tools
- `.github/`: the issue forms, the label list and the workflows
