/**
 * Lists, for the whole year at once, the matches of the import that a reviewer should check against the sources:
 * official titles naming a saint their line does not hold, Romanian saints joined to one of two OCA saints of the
 * same name, two saints of one name on one day (see tools/lib/import/suspects.ts and docs/PLAN.md).
 *
 *   npm run suspects                                  # every check, as text
 *   node tools/suspects.ts --check tie                # one check: official-missing, tie, same-day, romanian-only
 *   node tools/suspects.ts --json                     # as JSON
 *   node tools/suspects.ts --data <dir>               # another copy of data/
 */
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadExisting } from "./lib/import/existing.ts";
import { findSuspects, type SuspectCheck } from "./lib/import/suspects.ts";
import { REPO_ROOT } from "./lib/validate.ts";

const CHECKS: SuspectCheck[] = ["official-missing", "tie", "same-day", "romanian-only"];
const { values } = parseArgs({ options: { data: { type: "string" }, check: { type: "string" }, json: { type: "boolean", default: false } } });
if (values.check && !(CHECKS as string[]).includes(values.check)) throw new Error(`unknown check ${values.check}; one of ${CHECKS.join(", ")}`);

const all = findSuspects(loadExisting(resolve(values.data ?? join(REPO_ROOT, "data"))));
const list = values.check ? all.filter((s) => s.check === values.check) : all;
if (values.json) {
  console.log(JSON.stringify(list, null, 2));
} else {
  for (const check of CHECKS) {
    const items = list.filter((s) => s.check === check);
    if (items.length === 0) continue;
    console.log(`\n${check} (${items.length})`);
    for (const s of items) console.log(`  ${s.date}  ${s.text}${s.score === undefined ? "" : `  [${s.score.toFixed(2)}]`}`);
  }
  console.log(`\n${list.length} case(s) to check against the sources.`);
}
