# orthodox-synaxarion

Orthodox Saints of the World: an open, structured, multilingual synaxarion of the Orthodox Churches (Eastern Orthodox, Oriental Orthodox and the Assyrian Church of the East), as JSON data validated by JSON Schema. A website, a wiki, a static API and calendar feeds will be generated from it.

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

## Layout

- `schema/`: JSON Schema (draft 2020-12) for every kind of data file
- `data/`: the dataset (language-neutral records, traditions' calendars, and `data/i18n/<locale>/` for every text)
- `tools/`: validator and formatter (TypeScript, run directly by Node)
- `tests/`: tests for the validator
