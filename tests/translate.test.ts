import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { isMachineTranslation, loadDataset } from "../tools/lib/dataset.ts";
import { loadExisting } from "../tools/lib/import/existing.ts";
import { applyWorklist, targetProblem, worklists, type Entry } from "../tools/lib/translate.ts";
import { validate } from "../tools/lib/validate.ts";

const FIXTURE = join(import.meta.dirname, "fixtures", "minimal", "data");
const OPTIONS = { method: "machine", date: "2026-11-08" } as const;
const MACHINE = { status: "machine", method: "machine", from: "ro", date: "2026-11-08" };

/** Runs a test on a copy of the minimal dataset, changed first. */
function withCopy(change: (dir: string) => void, test: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "synaxarion-"));
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    change(dir);
    test(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeAll(dir: string, files: Map<string, string>): void {
  for (const [rel, content] of files) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
}

const withoutEnglishNames = (dir: string): void => unlinkSync(join(dir, "i18n", "en", "persons", "test-saint.json"));

function namesEntry(id: string, target: Entry["target"]): Entry {
  return { collection: "persons", id, part: "names", from: "en", context: {}, source: { names: { display: "Martyr Test" } }, target };
}

describe("machine translations", () => {
  it("are those that no one has reviewed yet", () => {
    assert.equal(isMachineTranslation({ translation: { status: "machine", method: "machine" } }), true);
    assert.equal(isMachineTranslation({ translation: { status: "reviewed", method: "machine" } }), false);
    assert.equal(isMachineTranslation({ translation: { status: "draft", method: "original" } }), false);
    assert.equal(isMachineTranslation(undefined), false);
  });
});

describe("translation worklists", () => {
  it("list the names a language lacks, with their source and context", () => {
    withCopy(withoutEnglishNames, (dir) => {
      const [ro, en] = worklists(loadDataset(dir), dir);
      assert.equal(ro?.locale, "ro");
      assert.deepEqual(ro?.entries, []);
      const names = en?.entries.find((e) => e.part === "names");
      assert.deepEqual(names, {
        collection: "persons",
        id: "test-saint",
        part: "names",
        from: "ro",
        context: { kind: "saint", gender: "male", holiness: ["martyr"], traditions: ["test-church"] },
        source: { names: { display: "Sf. Mc. Test" } },
        target: null,
      });
      // The saint's day takes its title from the saint.
      assert.ok(!en?.entries.some((e) => e.collection === "commemorations"));
    });
  });

  it("list the long texts a language lacks", () => {
    const en = worklists(loadDataset(FIXTURE), FIXTURE).find((l) => l.locale === "en");
    assert.deepEqual(
      en?.entries.map((e) => [e.part, e.id, e.from, e.source]),
      [["life", "test-saint", "ro", { body: "Viața de test." }]],
    );
  });

  it("are written back as machine translations that the validator accepts", () => {
    withCopy(withoutEnglishNames, (dir) => {
      const ds = loadDataset(dir);
      const en = worklists(ds, dir).find((l) => l.locale === "en");
      assert.ok(en);
      for (const e of en.entries) e.target = e.part === "names" ? { names: { display: "Martyr Test", full: "Martyr Test", short: "", given: "Test" } } : { body: "A test life." };
      const out = applyWorklist(ds, en, OPTIONS);
      assert.deepEqual(out.skipped, []);
      assert.deepEqual(JSON.parse(out.files.get("i18n/en/persons/test-saint.json") ?? "{}"), {
        id: "test-saint",
        locale: "en",
        names: { display: "Martyr Test", given: "Test" },
        translation: MACHINE,
      });
      const life = out.files.get("i18n/en/persons/test-saint.md") ?? "";
      assert.ok(life.startsWith("---\nid: test-saint\nlocale: en\nkind: life\ntranslation:\n  status: machine\n  method: machine\n  from: ro\n"));
      assert.ok(life.endsWith("---\n\nA test life.\n"));
      writeAll(dir, out.files);
      assert.deepEqual(validate({ dataDir: dir }).errors, []);
      assert.deepEqual(worklists(loadDataset(dir), dir).find((l) => l.locale === "en")?.entries, []);
    });
  });

  it("never replace a record's own names, only an earlier machine translation", () => {
    const ds = loadDataset(FIXTURE);
    const list = { locale: "ro", entries: [namesEntry("test-saint", { names: { display: "Sf. Mc. Testul" } })] };
    const kept = applyWorklist(ds, list, OPTIONS);
    assert.equal(kept.files.size, 0);
    assert.match(kept.skipped[0] ?? "", /already has its own names/);
    const ro = ds.locales.get("persons")?.get("test-saint")?.get("ro");
    assert.ok(ro);
    ro.translation = MACHINE;
    assert.equal(applyWorklist(ds, list, OPTIONS).files.size, 1);
  });

  it("write Romanian with the comma below and skip what is left empty", () => {
    const list = { locale: "ro", entries: [namesEntry("other-saint", { names: { display: "Sf. Mc. Ştefan" } }), namesEntry("third-saint", null)] };
    const out = applyWorklist(loadDataset(FIXTURE), list, OPTIONS);
    assert.deepEqual([...out.files.keys()], ["i18n/ro/persons/other-saint.json"]);
    assert.equal(JSON.parse(out.files.get("i18n/ro/persons/other-saint.json") ?? "{}").names.display, "Sf. Mc. Ștefan");
  });

  it("reject a translation in another shape than its source", () => {
    assert.equal(targetProblem(namesEntry("x", { names: { display: " " } })), "names.display is empty");
    assert.match(targetProblem(namesEntry("x", { names: { display: "X", nickname: "Y" } })) ?? "", /unknown name field/);
    assert.match(targetProblem(namesEntry("x", { names: { display: "X" }, life: "…" })) ?? "", /unknown field/);
    assert.match(targetProblem(namesEntry("x", { names: { display: "X", epithets: "cel Mare" } })) ?? "", /wrong type/);
    assert.equal(targetProblem(namesEntry("x", { names: { display: "X", epithets: ["cel Mare"] }, summary: "…" })), undefined);
  });
});

describe("the importer", () => {
  it("does not match names against machine translations", () => {
    const machineEnglish = (dir: string): void => {
      const doc = { id: "test-saint", locale: "en", names: { display: "Martyr Test" }, translation: MACHINE };
      writeFileSync(join(dir, "i18n", "en", "persons", "test-saint.json"), `${JSON.stringify(doc, null, 2)}\n`);
    };
    withCopy(machineEnglish, (dir) => {
      const existing = loadExisting(dir);
      assert.equal(existing.dataset.locales.get("persons")?.get("test-saint")?.has("en"), false);
      assert.equal(existing.persons.get("test-saint")?.en, undefined);
      assert.equal(existing.persons.get("test-saint")?.ro?.display, "Sf. Mc. Test");
    });
  });
});
