/**
 * Prints the independent-reference comparison (Drik Panchang) and writes it to
 * docs/panchang-validation/reference-results.json. Run: npx tsx scripts/panchang-reference-report.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { END_TOLERANCE_MIN, runReference } from "../src/modules/gemstone/__tests__/panchang.reference.js";
import { REFERENCE_CASES } from "../src/modules/gemstone/__tests__/panchang.reference.data.js";

const { ends, days } = runReference();
const endPass = ends.filter((r) => r.pass).length;
const dayChecks = days.flatMap((d) => d.checks.map((c) => ({ ...c, caseId: d.caseId })));
const dayPass = dayChecks.filter((c) => c.pass).length;

console.log(`END TIMES (tolerance ${END_TOLERANCE_MIN} min): ${endPass}/${ends.length} pass`);
for (const r of ends) {
  console.log(`${r.pass ? "ok  " : "FAIL"} ${r.caseId.padEnd(20)} ${r.element.padEnd(9)} ${r.refName.padEnd(18)} ref ${r.refEnd}  engine ${r.engineEnd}  diff ${r.diffMinutes} min${r.nameMatches ? "" : `  NAME ${r.engineName}`}`);
}
console.log(`\nDAY FIELDS: ${dayPass}/${dayChecks.length} pass`);
for (const c of dayChecks.filter((x) => !x.pass)) console.log(`FAIL ${c.caseId} ${c.field}: reference ${c.reference}, engine ${c.engine}`);

const abs = ends.map((r) => Math.abs(r.diffMinutes)).sort((a, b) => a - b);
const pct = (p: number) => abs[Math.min(abs.length - 1, Math.floor(p * abs.length))];
console.log(`\nabs diff minutes: median ${pct(0.5)}, p90 ${pct(0.9)}, max ${abs[abs.length - 1]}`);

mkdirSync("docs/panchang-validation", { recursive: true });
writeFileSync(
  "docs/panchang-validation/reference-results.json",
  JSON.stringify({ source: "Drik Panchang daily pages, read 2026-10-31", cases: REFERENCE_CASES.map(({ items, ...c }) => c), endTimeComparisons: ends, dayFieldComparisons: days }, null, 2),
);
