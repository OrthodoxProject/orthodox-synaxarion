/**
 * Checks the label list and the issue forms, or applies the list to GitHub.
 *
 *   npm run labels                          # checks .github/labels.yml and .github/ISSUE_TEMPLATE/
 *   npm run labels -- --sync [--dry-run]    # creates, renames and updates the labels on GitHub
 *
 * --sync needs a token that may write issues, in GITHUB_TOKEN or GH_TOKEN
 * (locally: GITHUB_TOKEN=$(gh auth token)). The repository is --repo, or
 * GITHUB_REPOSITORY on GitHub Actions. Labels that are not in the list are
 * reported, never deleted.
 */
import { parseArgs, styleText } from "node:util";
import { FORMS_DIR, LABELS_FILE, applyLabelChange, checkRepository, fetchLabels, planLabelSync } from "./lib/labels.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const { values } = parseArgs({
  options: {
    sync: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    repo: { type: "string" },
  },
});

const { labels, forms, problems } = checkRepository(REPO_ROOT);
for (const problem of problems) console.log(`${styleText("red", "error")} ${problem}`);
if (problems.length > 0) {
  console.log(styleText("red", `✖ ${problems.length} error(s)`));
  process.exit(1);
}
console.log(styleText("green", `✔ ${labels.length} labels in ${LABELS_FILE}, ${forms.size} issue forms in ${FORMS_DIR}/`));
if (!values.sync) process.exit(0);

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (!token) {
  console.error("Give a token that may write issues in GITHUB_TOKEN, for example GITHUB_TOKEN=$(gh auth token).");
  process.exit(2);
}
const github = {
  repository: values.repo ?? process.env.GITHUB_REPOSITORY ?? "OrthodoxProject/orthodox-synaxarion",
  token,
  apiUrl: process.env.GITHUB_API_URL,
};
const dryRun = values["dry-run"];

const { changes, extra } = planLabelSync(labels, await fetchLabels(github));
for (const change of changes) {
  const { name } = change.label;
  const line = change.action === "create" ? `create  ${name}` : change.from === name ? `update  ${name}` : `rename  ${change.from} → ${name}`;
  console.log(line);
  if (!dryRun) await applyLabelChange(github, change);
}
for (const name of extra) console.log(styleText("yellow", `not in ${LABELS_FILE}, left as it is: ${name}`));
const summary = changes.length === 0 ? "the labels are up to date" : `${changes.length} change(s)${dryRun ? " to make (dry run)" : " made"}`;
console.log(styleText("green", `✔ ${github.repository}: ${summary}`));
