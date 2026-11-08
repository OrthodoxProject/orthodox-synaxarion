/**
 * The labels of the issues and pull requests (.github/labels.yml) and the
 * issue forms that apply them (.github/ISSUE_TEMPLATE/): the checks of both,
 * and the changes that bring the labels on GitHub in line with the list.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface Label {
  name: string;
  /** Six lowercase hexadecimal digits, without "#". */
  color: string;
  description: string;
  /** Earlier names: a label found under one of them is renamed, so that its issues keep it. */
  aliases?: string[];
}

/** A label as the GitHub API returns it. */
export interface RemoteLabel {
  name: string;
  color: string;
  description: string | null;
}

export type LabelChange = { action: "create"; label: Label } | { action: "update"; from: string; label: Label };

export const LABELS_FILE = ".github/labels.yml";
export const FORMS_DIR = ".github/ISSUE_TEMPLATE";

/** GitHub's limits. */
const MAX_NAME = 50;
const MAX_DESCRIPTION = 100;

/**
 * Labels and form fields that follow the folders of data/: a `tradition:` label
 * for each folder in data/traditions/ and a `lang:` label for each folder in
 * data/i18n/, and form dropdowns with this id that list every one of them as
 * "Name (id)". `open` is the label for what has no folder yet.
 */
const FOLLOWERS = [
  { prefix: "tradition: ", open: "tradition: new", field: "traditions", folder: "data/traditions" },
  { prefix: "lang: ", open: "lang: other", field: "language", folder: "data/i18n" },
] as const;

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownKeys(value: Rec, allowed: readonly string[]): string[] {
  return Object.keys(value).filter((key) => !allowed.includes(key));
}

// ---------------------------------------------------------------------------
// The label list

/** Problems in the label list; none means that it can be used as Label[]. */
export function checkLabels(list: unknown): string[] {
  if (!Array.isArray(list)) return ["the file must be a list of labels"];
  const problems: string[] = [];
  /** Lower-case name or alias → the label that declares it (GitHub ignores case). */
  const declared = new Map<string, string>();
  list.forEach((item: unknown, i) => {
    if (!isRecord(item)) {
      problems.push(`label ${i + 1}: must have a name, a color and a description`);
      return;
    }
    const { name, color, description, aliases = [] } = item;
    const where = typeof name === "string" ? `"${name}"` : `label ${i + 1}`;
    for (const key of unknownKeys(item, ["name", "color", "description", "aliases"])) problems.push(`${where}: unknown key "${key}"`);
    if (typeof name !== "string" || name === "" || name.trim() !== name || [...name].length > MAX_NAME) {
      problems.push(`${where}: the name must have 1 to ${MAX_NAME} characters, without spaces at either end`);
    }
    if (typeof color !== "string" || !/^[0-9a-f]{6}$/.test(color)) problems.push(`${where}: the color must be six lowercase hexadecimal digits, without "#"`);
    if (typeof description !== "string" || description === "" || [...description].length > MAX_DESCRIPTION) {
      problems.push(`${where}: the description must have 1 to ${MAX_DESCRIPTION} characters`);
    }
    const names: unknown[] = [name];
    if (Array.isArray(aliases) && aliases.every((alias) => typeof alias === "string" && alias !== "")) names.push(...aliases);
    else problems.push(`${where}: "aliases" must be a list of label names`);
    for (const n of names) {
      if (typeof n !== "string") continue;
      const first = declared.get(n.toLowerCase());
      if (first === undefined) declared.set(n.toLowerCase(), where);
      else problems.push(`${where}: "${n}" is already used by ${first}`);
    }
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Issue forms (https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)

const FORM_KEYS = ["name", "description", "title", "labels", "assignees", "projects", "type", "body"];
const ELEMENT_KEYS = ["type", "id", "attributes", "validations"];
const ATTRIBUTES: Record<string, readonly string[]> = {
  markdown: ["value"],
  textarea: ["label", "description", "placeholder", "value", "render"],
  input: ["label", "description", "placeholder", "value"],
  dropdown: ["label", "description", "multiple", "options", "default"],
  checkboxes: ["label", "description", "options"],
};

/** The labels a form applies ("a, b" or a list). */
export function formLabels(form: Rec): string[] {
  const { labels } = form;
  if (typeof labels === "string") return labels.split(",").map((l) => l.trim()).filter(Boolean);
  return Array.isArray(labels) ? labels.filter((l): l is string => typeof l === "string") : [];
}

/** Problems in an issue form: GitHub's rules that can be checked offline, and labels that are not in the list. */
export function checkIssueForm(form: unknown, labelNames: ReadonlySet<string>): string[] {
  if (!isRecord(form)) return ["the form must be a mapping"];
  const problems: string[] = [];
  for (const key of ["name", "description"]) if (typeof form[key] !== "string" || form[key] === "") problems.push(`"${key}" is required`);
  for (const key of unknownKeys(form, FORM_KEYS)) problems.push(`unknown key "${key}"`);
  if (form.labels !== undefined && typeof form.labels !== "string" && !Array.isArray(form.labels)) problems.push(`"labels" must be a list`);
  for (const label of formLabels(form)) if (!labelNames.has(label)) problems.push(`the label "${label}" is not in ${LABELS_FILE}`);

  const { body } = form;
  if (!Array.isArray(body) || body.length === 0) return [...problems, `"body" must be a list of fields`];
  if (!body.some((element) => isRecord(element) && element.type !== "markdown")) problems.push(`"body" needs at least one field that is not markdown`);
  const ids = new Set<string>();
  const labels = new Set<string>();
  body.forEach((element: unknown, i) => {
    const where = `body[${i}]`;
    if (!isRecord(element) || typeof element.type !== "string" || !Object.hasOwn(ATTRIBUTES, element.type)) {
      problems.push(`${where}: the type must be one of ${Object.keys(ATTRIBUTES).join(", ")}`);
      return;
    }
    const { type, id, attributes, validations } = element;
    for (const key of unknownKeys(element, ELEMENT_KEYS)) problems.push(`${where}: unknown key "${key}"`);
    if (!isRecord(attributes)) {
      problems.push(`${where}: "attributes" is required`);
      return;
    }
    for (const key of unknownKeys(attributes, ATTRIBUTES[type] ?? [])) problems.push(`${where}: ${type} has no attribute "${key}"`);
    if (type === "markdown") {
      if (typeof attributes.value !== "string" || attributes.value === "") problems.push(`${where}: markdown needs a "value"`);
      if (id !== undefined || validations !== undefined) problems.push(`${where}: markdown takes no id and no validations`);
      return;
    }
    if (id !== undefined) {
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) problems.push(`${where}: the id may contain only letters, digits, "-" and "_"`);
      else if (ids.has(id)) problems.push(`${where}: the id "${id}" is used twice`);
      else ids.add(id);
    }
    const { label } = attributes;
    if (typeof label !== "string" || label === "") problems.push(`${where}: "label" is required`);
    else if (labels.has(label)) problems.push(`${where}: the label "${label}" is used twice`);
    else labels.add(label);
    if (validations !== undefined && !(isRecord(validations) && unknownKeys(validations, ["required"]).length === 0 && typeof validations.required === "boolean")) {
      problems.push(`${where}: "validations" may only set "required" to true or false`);
    }
    const { options } = attributes;
    if (type === "dropdown") {
      if (!Array.isArray(options) || options.length === 0 || !options.every((o) => typeof o === "string" && o !== "")) {
        problems.push(`${where}: a dropdown needs a list of options`);
        return;
      }
      if (new Set(options).size !== options.length) problems.push(`${where}: the options must be different`);
      if (options.includes("None")) problems.push(`${where}: "None" is reserved by GitHub`);
      const { default: index } = attributes;
      if (index !== undefined && !(Number.isInteger(index) && (index as number) >= 0 && (index as number) < options.length)) {
        problems.push(`${where}: "default" must be the index of an option`);
      }
    }
    if (type === "checkboxes") {
      const valid = (o: unknown) => isRecord(o) && typeof o.label === "string" && o.label !== "" && (o.required === undefined || typeof o.required === "boolean");
      if (!Array.isArray(options) || options.length === 0 || !options.every(valid)) problems.push(`${where}: checkboxes need options, each with a label`);
    }
  });
  return problems;
}

/** Problems in the issue chooser's configuration (config.yml). */
export function checkChooserConfig(config: unknown): string[] {
  if (!isRecord(config)) return ["the file must be a mapping"];
  const problems = unknownKeys(config, ["blank_issues_enabled", "contact_links"]).map((key) => `unknown key "${key}"`);
  if (config.blank_issues_enabled !== undefined && typeof config.blank_issues_enabled !== "boolean") problems.push(`"blank_issues_enabled" must be true or false`);
  const links = config.contact_links ?? [];
  if (!Array.isArray(links)) return [...problems, `"contact_links" must be a list`];
  links.forEach((link: unknown, i) => {
    const valid = isRecord(link) && unknownKeys(link, ["name", "url", "about"]).length === 0 && [link.name, link.about].every((v) => typeof v === "string" && v !== "");
    if (!valid || typeof link.url !== "string" || !link.url.startsWith("https://")) problems.push(`contact_links[${i}]: needs a name, an https url and an about`);
  });
  return problems;
}

// ---------------------------------------------------------------------------
// Labels and forms that follow data/

/** The id at the end of a dropdown option written "Name (id)", if any. */
export function optionId(option: string): string | undefined {
  return /\(([A-Za-z][A-Za-z0-9-]*)\)$/.exec(option)?.[1];
}

/**
 * Every tradition and every locale of data/ has its label and is offered by the
 * forms' dropdowns, and nothing else is.
 */
export function checkFollowers(labels: readonly Label[], forms: ReadonlyMap<string, unknown>, folders: Readonly<Record<string, readonly string[]>>): string[] {
  const problems: string[] = [];
  for (const { prefix, open, field, folder } of FOLLOWERS) {
    const ids = new Set(folders[folder] ?? []);
    const labelled = new Set(labels.filter((l) => l.name.startsWith(prefix) && l.name !== open).map((l) => l.name.slice(prefix.length)));
    for (const id of ids) if (!labelled.has(id)) problems.push(`${LABELS_FILE}: ${folder}/${id} has no label "${prefix}${id}"`);
    for (const id of labelled) if (!ids.has(id)) problems.push(`${LABELS_FILE}: "${prefix}${id}" matches no folder in ${folder}/`);
    if (!labels.some((l) => l.name === open)) problems.push(`${LABELS_FILE}: the label "${open}" is missing`);
    for (const [file, form] of forms) {
      if (!isRecord(form) || !Array.isArray(form.body)) continue;
      for (const element of form.body) {
        if (!isRecord(element) || element.id !== field || element.type !== "dropdown" || !isRecord(element.attributes)) continue;
        const options = Array.isArray(element.attributes.options) ? element.attributes.options : [];
        const offered = new Set(options.map((o) => (typeof o === "string" ? optionId(o) : undefined)).filter((id): id is string => id !== undefined));
        for (const id of ids) if (!offered.has(id)) problems.push(`${file}: the "${field}" field does not offer ${folder}/${id}; add an option "… (${id})"`);
        for (const id of offered) if (!ids.has(id)) problems.push(`${file}: the "${field}" field offers "${id}", which matches no folder in ${folder}/`);
      }
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// The repository

function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, "utf8"));
}

function subfolders(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export interface RepositoryLabels {
  labels: Label[];
  /** Issue forms by path (config.yml excluded). */
  forms: Map<string, unknown>;
  problems: string[];
}

/** Loads and checks the label list and the issue forms of the repository at `root`. */
export function checkRepository(root: string): RepositoryLabels {
  const problems: string[] = [];
  const forms = new Map<string, unknown>();
  let list: unknown = [];
  try {
    list = readYaml(join(root, LABELS_FILE));
  } catch (error) {
    problems.push(`${LABELS_FILE}: ${(error as Error).message}`);
  }
  const labelProblems = checkLabels(list);
  problems.push(...labelProblems.map((p) => `${LABELS_FILE}: ${p}`));
  const labels = labelProblems.length === 0 ? (list as Label[]) : [];
  const names = new Set(labels.map((l) => l.name));

  const formsDir = join(root, FORMS_DIR);
  const files = existsSync(formsDir) ? readdirSync(formsDir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
  for (const file of files) {
    const path = `${FORMS_DIR}/${file}`;
    let content: unknown;
    try {
      content = readYaml(join(formsDir, file));
    } catch (error) {
      problems.push(`${path}: ${(error as Error).message}`);
      continue;
    }
    if (/^config\.ya?ml$/.test(file)) {
      problems.push(...checkChooserConfig(content).map((p) => `${path}: ${p}`));
      continue;
    }
    forms.set(path, content);
    if (labels.length > 0) problems.push(...checkIssueForm(content, names).map((p) => `${path}: ${p}`));
  }
  if (forms.size === 0) problems.push(`${FORMS_DIR}: no issue forms`);

  if (labels.length > 0) {
    const folders = Object.fromEntries(FOLLOWERS.map(({ folder }) => [folder, subfolders(join(root, folder))]));
    problems.push(...checkFollowers(labels, forms, folders));
  }
  return { labels, forms, problems };
}

// ---------------------------------------------------------------------------
// Synchronization with GitHub

/**
 * What to change on GitHub so that its labels match the list: labels are found
 * by name, then by alias (and renamed), else created. Labels that are not in the
 * list are left alone and returned as `extra`.
 */
export function planLabelSync(wanted: readonly Label[], remote: readonly RemoteLabel[]): { changes: LabelChange[]; extra: string[] } {
  const byName = new Map(remote.map((l) => [l.name.toLowerCase(), l]));
  const matched = new Set<string>();
  const changes: LabelChange[] = [];
  for (const label of wanted) {
    const current = [label.name, ...(label.aliases ?? [])].map((n) => byName.get(n.toLowerCase())).find((l) => l !== undefined && !matched.has(l.name.toLowerCase()));
    if (current === undefined) {
      changes.push({ action: "create", label });
      continue;
    }
    matched.add(current.name.toLowerCase());
    if (current.name !== label.name || current.color.toLowerCase() !== label.color || (current.description ?? "") !== label.description) {
      changes.push({ action: "update", from: current.name, label });
    }
  }
  const extra = remote.filter((l) => !matched.has(l.name.toLowerCase())).map((l) => l.name);
  return { changes, extra };
}

export interface GitHubRepository {
  /** "owner/name". */
  repository: string;
  token: string;
  apiUrl?: string;
}

async function request(github: GitHubRepository, method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${github.apiUrl ?? "https://api.github.com"}/repos/${github.repository}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${github.token}`,
      "user-agent": "orthodox-synaxarion-labels",
      "x-github-api-version": "2022-11-28",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
}

/** Every label of the repository. */
export async function fetchLabels(github: GitHubRepository): Promise<RemoteLabel[]> {
  const labels: RemoteLabel[] = [];
  for (let page = 1; ; page++) {
    const batch = (await request(github, "GET", `/labels?per_page=100&page=${page}`)) as RemoteLabel[];
    labels.push(...batch);
    if (batch.length < 100) return labels;
  }
}

export async function applyLabelChange(github: GitHubRepository, change: LabelChange): Promise<void> {
  const { name, color, description } = change.label;
  if (change.action === "create") await request(github, "POST", "/labels", { name, color, description });
  else await request(github, "PATCH", `/labels/${encodeURIComponent(change.from)}`, { new_name: name, color, description });
}
