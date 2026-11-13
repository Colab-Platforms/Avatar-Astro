// Run with: npm run test:security
// Checkpoint 0 — repository guard: provider keys must never be reachable from the browser, and the
// unauthenticated Vercel TTS proxies must stay deleted. (This inspects source only; it cannot prove
// what is deployed — see the post-deploy verification checklist in the Checkpoint 0 report.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|html)$/;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.test(name)) out.push(full);
  }
  return out;
}

test("the unauthenticated Vercel TTS proxies are gone (the authenticated backend /api/tts is the only TTS route)", () => {
  assert.equal(existsSync(join(REPO_ROOT, "api", "tts.ts")), false, "api/tts.ts must stay deleted");
  assert.equal(existsSync(join(REPO_ROOT, "frontend", "api", "tts.ts")), false, "frontend/api/tts.ts must stay deleted");
});

test("no serverless function directory reads VITE_* variables (VITE_ values are public by design)", () => {
  const offenders: string[] = [];
  for (const dir of [join(REPO_ROOT, "api"), join(REPO_ROOT, "frontend", "api")]) {
    for (const file of walk(dir)) {
      if (/process\.env\.VITE_|env\[['"]VITE_/.test(readFileSync(file, "utf8"))) offenders.push(relative(REPO_ROOT, file));
    }
  }
  assert.deepEqual(offenders, []);
});

test("frontend source never references the Sarvam or Groq key variables", () => {
  const offenders: string[] = [];
  for (const file of walk(join(REPO_ROOT, "frontend", "src"))) {
    const text = readFileSync(file, "utf8");
    if (/VITE_(SARVAM|GROQ)_[A-Z_]*KEY/.test(text)) offenders.push(relative(REPO_ROOT, file));
  }
  assert.deepEqual(offenders, [], "provider keys belong in backend env only (SARVAM_API_KEY / GROQ_API_KEY)");
});

test("the committed frontend env template does not define a VITE_SARVAM or VITE_GROQ key", () => {
  const template = readFileSync(join(REPO_ROOT, "frontend", ".env.example"), "utf8");
  const defined = template.split(/\r?\n/).filter((line) => /^\s*VITE_(SARVAM|GROQ)_[A-Z_]*KEY\s*=/.test(line));
  assert.deepEqual(defined, []);
});
