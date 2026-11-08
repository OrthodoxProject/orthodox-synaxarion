import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkChooserConfig,
  checkFollowers,
  checkIssueForm,
  checkLabels,
  checkRepository,
  formLabels,
  optionId,
  planLabelSync,
  type Label,
} from "../tools/lib/labels.ts";
import { REPO_ROOT } from "../tools/lib/validate.ts";

const label = (name: string, extra: Partial<Label> = {}): Label => ({ name, color: "ededed", description: `About ${name}`, ...extra });

describe("the repository's labels and issue forms", () => {
  it("are valid, and follow the traditions and languages of data/", () => {
    const { labels, forms, problems } = checkRepository(REPO_ROOT);
    assert.deepEqual(problems, []);
    assert.ok(labels.length > 0);
    assert.ok(forms.size > 0);
  });

  it("give every form a status, and every type label to some form", () => {
    const { labels, forms } = checkRepository(REPO_ROOT);
    const applied = new Set<string>();
    for (const [file, form] of forms) {
      const names = formLabels(form as Record<string, unknown>);
      assert.ok(names.includes("status: triage"), `${file} does not add "status: triage"`);
      assert.ok(names.filter((n) => n.startsWith("type: ")).length <= 1, `${file} adds more than one type`);
      for (const name of names) applied.add(name);
    }
    for (const type of ["correction", "addition", "translation", "review", "source", "bug"]) {
      assert.ok(applied.has(`type: ${type}`), `no form adds "type: ${type}"`);
    }
    assert.ok(labels.some((l) => l.name === "good first issue") && labels.some((l) => l.name === "help wanted"));
  });
});

describe("checkLabels", () => {
  it("accepts a valid list", () => {
    assert.deepEqual(checkLabels([label("type: bug", { aliases: ["bug"] }), label("area: docs")]), []);
  });

  it("rejects colors with '#', long descriptions and unknown keys", () => {
    const problems = checkLabels([{ name: "a", color: "#ededed", description: "x".repeat(101), colour: "ededed" }]);
    assert.equal(problems.length, 3);
    assert.match(problems.join("\n"), /color/);
    assert.match(problems.join("\n"), /description/);
    assert.match(problems.join("\n"), /unknown key "colour"/);
  });

  it("rejects names and aliases used twice, whatever their case", () => {
    const problems = checkLabels([label("Bug"), label("type: bug", { aliases: ["bug"] }), label("bug ")]);
    assert.equal(problems.length, 2);
    assert.match(problems[0] ?? "", /"bug" is already used by "Bug"/);
    assert.match(problems[1] ?? "", /without spaces/);
  });
});

describe("checkIssueForm", () => {
  const names = new Set(["type: bug", "status: triage"]);
  const form = (body: unknown[], extra: Record<string, unknown> = {}) => ({ name: "Bug", description: "Something is broken", labels: ["type: bug"], body, ...extra });
  const textarea = (id: string, label: string) => ({ type: "textarea", id, attributes: { label } });

  it("accepts a valid form", () => {
    const body = [
      { type: "markdown", attributes: { value: "Hello" } },
      textarea("what", "What happened"),
      { type: "dropdown", id: "where", attributes: { label: "Where?", options: ["Website", "Tools"], default: 0 }, validations: { required: true } },
      { type: "checkboxes", id: "checks", attributes: { label: "Checks", options: [{ label: "I searched", required: true }] } },
    ];
    assert.deepEqual(checkIssueForm(form(body), names), []);
  });

  it("reports labels that are not in the list", () => {
    assert.deepEqual(checkIssueForm(form([textarea("a", "A")], { labels: "type: bug, bug" }), names), ['the label "bug" is not in .github/labels.yml']);
  });

  it("reports ids and labels used twice, unknown attributes and reserved options", () => {
    const body = [
      textarea("what", "What"),
      textarea("what", "What"),
      { type: "input", id: "x y", attributes: { label: "X", placholder: "…" } },
      { type: "dropdown", id: "d", attributes: { label: "D", options: ["None", "A"], default: 2 } },
      { type: "markdown", id: "intro", attributes: { value: "Hi" } },
      { type: "select", attributes: { label: "S" } },
    ];
    const problems = checkIssueForm(form(body), names);
    assert.deepEqual(problems, [
      'body[1]: the id "what" is used twice',
      'body[1]: the label "What" is used twice',
      'body[2]: input has no attribute "placholder"',
      'body[2]: the id may contain only letters, digits, "-" and "_"',
      'body[3]: "None" is reserved by GitHub',
      'body[3]: "default" must be the index of an option',
      "body[4]: markdown takes no id and no validations",
      "body[5]: the type must be one of markdown, textarea, input, dropdown, checkboxes",
    ]);
  });

  it("needs a field that is not markdown", () => {
    assert.deepEqual(checkIssueForm(form([{ type: "markdown", attributes: { value: "Hi" } }]), names), ['"body" needs at least one field that is not markdown']);
  });
});

describe("checkChooserConfig", () => {
  it("needs https links with a name and an about", () => {
    assert.deepEqual(checkChooserConfig({ blank_issues_enabled: false, contact_links: [{ name: "Guide", url: "https://example.org/", about: "Read it" }] }), []);
    assert.equal(checkChooserConfig({ contact_links: [{ name: "Guide", url: "http://example.org/" }] }).length, 1);
  });
});

describe("checkFollowers", () => {
  const labels = [label("tradition: romanian"), label("tradition: new"), label("tradition: old"), label("lang: ro"), label("lang: other")];
  const forms = new Map<string, unknown>([
    [
      "form.yml",
      {
        body: [
          { type: "dropdown", id: "traditions", attributes: { label: "Church", options: ["Romanian Orthodox Church (romanian)", "Another Church (say which below)"] } },
          { type: "dropdown", id: "language", attributes: { label: "Language", options: ["Romanian (ro)", "Klingon (tlh)"] } },
        ],
      },
    ],
  ]);

  it("reads the id at the end of an option", () => {
    assert.equal(optionId("Serbian, in Cyrillic (sr-Cyrl)"), "sr-Cyrl");
    assert.equal(optionId("Another Church (say which below)"), undefined);
  });

  it("reports folders without a label or an option, and labels or options without a folder", () => {
    const problems = checkFollowers(labels, forms, { "data/traditions": ["romanian", "serbian"], "data/i18n": ["ro"] });
    assert.deepEqual(problems, [
      '.github/labels.yml: data/traditions/serbian has no label "tradition: serbian"',
      '.github/labels.yml: "tradition: old" matches no folder in data/traditions/',
      'form.yml: the "traditions" field does not offer data/traditions/serbian; add an option "… (serbian)"',
      'form.yml: the "language" field offers "tlh", which matches no folder in data/i18n/',
    ]);
  });
});

describe("planLabelSync", () => {
  it("creates what is missing, renames aliases, updates what differs and leaves the rest alone", () => {
    const wanted = [label("type: bug", { color: "d73a4a", aliases: ["bug"] }), label("area: docs"), label("help wanted", { color: "008672" })];
    const remote = [
      { name: "bug", color: "d73a4a", description: "Something isn't working" },
      { name: "Help Wanted", color: "008672", description: "About help wanted" },
      { name: "wontfix", color: "ffffff", description: null },
    ];
    const { changes, extra } = planLabelSync(wanted, remote);
    assert.deepEqual(
      changes.map((c) => (c.action === "create" ? `create ${c.label.name}` : `update ${c.from} → ${c.label.name}`)),
      ["update bug → type: bug", "create area: docs", "update Help Wanted → help wanted"],
    );
    assert.deepEqual(extra, ["wontfix"]);
  });

  it("prefers the label's own name to an alias, and changes nothing when everything matches", () => {
    const wanted = [label("type: bug", { aliases: ["bug"] })];
    const remote = [
      { name: "type: bug", color: "EDEDED", description: "About type: bug" },
      { name: "bug", color: "d73a4a", description: "" },
    ];
    assert.deepEqual(planLabelSync(wanted, remote), { changes: [], extra: ["bug"] });
  });
});
