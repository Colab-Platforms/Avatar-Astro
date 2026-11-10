/**
 * npm run i18n:report
 *
 * Lists, per language: how many interface strings and glossary names are translated, which are missing (they fall back to English),
 * and the review status. Exits 1 if a language has missing strings so it can gate a release if wanted (pass --soft to always exit 0).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "i18n", "locales");
const CODES = ["hi", "mr", "ta", "te", "gu", "bn", "kn", "ml", "pa"];
const load = (c) => JSON.parse(readFileSync(join(DIR, `${c}.json`), "utf8"));
const leaves = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [[p + k, v]] : leaves(v, p + k + ".")));
const vars = (s) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(",");

const en = leaves(load("en"));
const enUi = en.filter(([k]) => !k.startsWith("glossary."));
const enGl = en.filter(([k]) => k.startsWith("glossary."));
const soft = process.argv.includes("--soft");
let gaps = 0;

console.log(`English source: ${enUi.length} interface strings, ${enGl.length} glossary names\n`);
console.log("lang  interface        glossary         placeholder-problems  status");
for (const c of CODES) {
  const map = new Map(leaves(load(c)));
  const miss = enUi.filter(([k]) => !map.get(k)?.trim());
  const missGl = enGl.filter(([k]) => !map.get(k)?.trim());
  const bad = enUi.filter(([k, v]) => map.get(k) && vars(map.get(k)) !== vars(v));
  gaps += miss.length + missGl.length + bad.length;
  const pct = (n, t) => `${t - n}/${t}`.padEnd(16);
  console.log(`${c.padEnd(5)} ${pct(miss.length, enUi.length)} ${pct(missGl.length, enGl.length)} ${String(bad.length).padEnd(21)} draft (AI-written, not reviewed)`);
  for (const [k] of [...miss, ...missGl].slice(0, 10)) console.log(`        missing: ${k}`);
  for (const [k] of bad.slice(0, 10)) console.log(`        placeholder mismatch: ${k}`);
}
console.log(gaps ? `\n${gaps} gap(s). Missing strings show in English; nothing shows a raw key.` : "\nNo gaps. Every language is complete, but all are still drafts until a named reviewer signs them off (see REVIEW_LOG in src/i18n/languages.ts).");
process.exit(gaps && !soft ? 1 : 0);
