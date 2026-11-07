import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { REPO_ROOT, validate, type ValidationResult } from "../tools/lib/validate.ts";

const FIXTURE = join(import.meta.dirname, "fixtures", "minimal", "data");

type Json = Record<string, any>;

/** Copies the minimal valid dataset, applies one change and validates the copy. */
function validateMutated(mutate: (dir: string) => void): ValidationResult {
  const dir = mkdtempSync(join(tmpdir(), "synaxarion-"));
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    mutate(dir);
    return validate({ dataDir: dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function editJson(dir: string, rel: string, change: (data: Json) => void): void {
  const path = join(dir, rel);
  const data = JSON.parse(readFileSync(path, "utf8")) as Json;
  change(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function writeJson(dir: string, rel: string, data: Json): void {
  writeFileSync(join(dir, rel), `${JSON.stringify(data, null, 2)}\n`);
}

function errorCodes(result: ValidationResult): string[] {
  return result.errors.map((e) => e.code);
}

describe("the repository data", () => {
  it("has no validation errors", () => {
    const result = validate({ dataDir: join(REPO_ROOT, "data") });
    assert.deepEqual(result.errors, []);
  });
});

describe("the minimal fixture", () => {
  it("is valid", () => {
    const result = validate({ dataDir: FIXTURE });
    assert.deepEqual(result.errors, []);
  });
});

describe("the validator reports", () => {
  const cases: Array<[string, string, (dir: string) => void]> = [
    ["a reference to a missing record", "ref.missing", (dir) =>
      editJson(dir, "commemorations/test-saint--repose.json", (d) => {
        d.subjects = ["person:missing-saint"];
      })],
    ["an id that differs from the file name", "path.id-mismatch", (dir) =>
      editJson(dir, "persons/test-saint.json", (d) => {
        d.id = "another-saint";
      })],
    ["ş/ţ with cedilla in Romanian text", "text.cedilla", (dir) =>
      editJson(dir, "i18n/ro/persons/test-saint.json", (d) => {
        d.names.display = "Sf. Mc. Ştefan";
      })],
    ["a church date that does not exist", "date.invalid", (dir) =>
      editJson(dir, "commemorations/test-saint--repose.json", (d) => {
        d.date_rule = { type: "fixed", month: 2, day: 30 };
      })],
    ["an invalid EDTF date", "schema", (dir) =>
      editJson(dir, "persons/test-saint.json", (d) => {
        d.died.date = "1053-13-01";
      })],
    ["a person without any commemoration", "person.no-commemoration", (dir) => {
      const person = JSON.parse(readFileSync(join(dir, "persons/test-saint.json"), "utf8")) as Json;
      writeJson(dir, "persons/other-saint.json", { ...person, id: "other-saint" });
      writeJson(dir, "i18n/ro/persons/other-saint.json", {
        id: "other-saint",
        locale: "ro",
        names: { display: "Sf. Mc. Alt" },
        translation: { status: "draft", method: "original" },
      });
    }],
    ["an unspecified rule in a record that is not a draft", "rule.unspecified-not-draft", (dir) =>
      editJson(dir, "commemorations/test-saint--repose.json", (d) => {
        d.date_rule = { type: "unspecified" };
        d.editorial = { status: "approved" };
      })],
    ["a full hymn text without an open license", "license.text-not-allowed", (dir) =>
      editJson(dir, "i18n/grc/hymns/test-saint--troparion.json", (d) => {
        d.license = "LicenseRef-AllRightsReserved";
      })],
    ["a file in an unknown place", "path.unexpected", (dir) => writeJson(dir, "stray.json", {})],
    ["a JSON file that is not canonically formatted", "format.non-canonical", (dir) => {
      const path = join(dir, "places/test-city.json");
      writeFileSync(path, JSON.stringify(JSON.parse(readFileSync(path, "utf8"))));
    }],
    ["a Menaion file whose date differs from its path", "path.date-mismatch", (dir) =>
      editJson(dir, "traditions/test-church/menaion/01/15.json", (d) => {
        d.date = "01-16";
      })],
    ["a locale file without its record", "i18n.orphan", (dir) =>
      writeJson(dir, "i18n/ro/persons/ghost.json", {
        id: "ghost",
        locale: "ro",
        names: { display: "Fantomă" },
        translation: { status: "draft", method: "original" },
      })],
    ["a place located inside itself", "place.cycle", (dir) =>
      editJson(dir, "places/test-city.json", (d) => {
        d.located_in = "place:test-city";
      })],
    ["the same commemoration twice in one tradition", "calendar.duplicate", (dir) =>
      editJson(dir, "traditions/test-church/menaion/01/15.json", (d) => {
        d.entries.push({ commemorations: ["comm:test-saint--repose"] });
      })],
    ["a symbol missing from the tradition's legend", "ref.unknown-symbol", (dir) =>
      editJson(dir, "traditions/test-church/menaion/01/15.json", (d) => {
        d.entries[0].symbol = "green-star";
      })],
    ["a long text without the locale file that names the record", "text.orphan", (dir) =>
      rmSync(join(dir, "i18n/ro/persons/test-saint.json"))],
    ["a tradition folder without tradition.json", "tradition.missing-definition", (dir) => {
      writeJson(dir, "traditions/test-church/movable.json", { tradition: "test-church" });
      rmSync(join(dir, "traditions/test-church/tradition.json"));
    }],
  ];

  for (const [what, code, mutate] of cases) {
    it(`${code}: ${what}`, () => {
      const result = validateMutated(mutate);
      assert.ok(errorCodes(result).includes(code), `expected ${code}, got: ${JSON.stringify(result.errors, null, 2)}`);
    });
  }
});
