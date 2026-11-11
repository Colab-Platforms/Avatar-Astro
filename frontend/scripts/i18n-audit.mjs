/**
 * npm run i18n:audit [-- --json out.json] [-- --top 40]
 *
 * Finds user-facing English that bypasses the translation system, per file and per area. It is a HEURISTIC scanner, not a proof:
 *  - JSX text nodes with two or more words,
 *  - text-bearing attributes (placeholder, title, aria-label, alt, label),
 *  - string literals passed to toast / alert / Error / setError-style calls,
 *  - object-literal copy fields (title, description, subtitle, label, message, question, answer ...).
 * Strings already inside t("..."), i18n.t("...") or <Tx ...> are ignored. Test files and fixtures are skipped.
 * Use it to rank what still needs converting and to see progress; a file at 0 with "uses i18n" is a good sign, not a guarantee.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const args = process.argv.slice(2);
const TOP = Number(args[args.indexOf("--top") + 1]) || 40;
const JSON_OUT = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  if (statSync(p).isDirectory()) return /__tests__|__fixtures__|locales|node_modules/.test(f) ? [] : walk(p);
  return /\.(tsx|ts)$/.test(f) && !/\.(test|spec)\./.test(f) && !/\.d\.ts$/.test(f) ? [p] : [];
});

const WORDS = /[A-Za-z]{2,}[^<>{}"`]*\s[A-Za-z]{2,}/; // two or more words
const looksLikeCode = (s) => /[=;{}()\[\]]|=>|\bconst\b|\bimport\b|className|^\s*\/[/*]|https?:|\.(png|jpg|webp|svg|css|js)\b|^[a-z]+([A-Z][a-z]+)+$/.test(s);
const isCopy = (s) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length >= 6 && WORDS.test(t) && !looksLikeCode(t) && /[A-Z]/.test(t[0] + (t[1] ?? "")) || (t.length >= 12 && WORDS.test(t) && !looksLikeCode(t) && /\s/.test(t) && /^[A-Za-z(“"'\d]/.test(t));
};

function scan(file) {
  const raw = readFileSync(file, "utf8");
  const text = raw.replace(/\r\n/g, "\n");
  const found = [];
  const add = (kind, s, index) => { if (isCopy(s)) found.push({ kind, s: s.replace(/\s+/g, " ").trim().slice(0, 90), line: text.slice(0, index).split("\n").length }); };

  // JSX text: >  some words  <
  for (const m of text.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) add("jsx", m[1], m.index);
  // Text-bearing attributes with a literal
  for (const m of text.matchAll(/\b(?:placeholder|title|aria-label|alt|label|description|helperText|emptyText)=\s*"([^"{}]+)"/g)) add("attr", m[1], m.index);
  // Calls that surface text to the user
  for (const m of text.matchAll(/\b(?:toast(?:\.\w+)?|alert|setError|setErrorMsg|setNotice|setMessage|setStatus|throw new \w*Error|new \w*Error)\(\s*(["'`])((?:(?!\1)[^\\\n])+)\1/g)) add("msg", m[2], m.index);
  // Copy fields in data objects
  for (const m of text.matchAll(/\b(?:title|subtitle|description|desc|summary|heading|headline|label|message|question|answer|text|body|cta|ctaLabel|tagline|name|tip|note)\s*:\s*(["'`])((?:(?!\1)[^\\\n])+)\1/g)) add("data", m[2], m.index);

  // Drop anything already routed through i18n on the same line
  const lines = text.split("\n");
  const real = found.filter((f) => !/\bt\(\s*["'`]|i18n\.t\(|<Tx\b|defaultValue/.test(lines[f.line - 1] ?? ""));
  const usesI18n = /useTranslation|i18n\.t\(|<Tx\b|from ["']@\/i18n/.test(text);
  return { usesI18n, hits: real };
}

const AREAS = [
  ["Main website: navbar, footer, home, layout", /components\/(Navbar|Footer|Layout|hero|Home|Faq|Why|Zodiac|Featured|Live|AIGuru|AstrologyTools|ToolCard|FeatureButton|BackButton)|pages\/(Index|Home)/],
  ["Auth, profile, dashboard, account", /features\/(auth|dashboard)|pages\/(Login|Register|Profile|Dashboard)/],
  ["Astro Seva: Baby Name, Vehicle, Muhurat", /features\/(babyName|vehicleNumber|muhurat)|pages\/(BabyName|LuckyVehicle|Muhurat)/],
  ["Inner Voice: Divya Margdarshak, Voice, Karma, Bhavishya Marg, Shloka", /InnerVoice|ai-guru|features\/guru|VoiceConsultation|Karma|FutureLifePath|Shloka|Wisdom|guru/i],
  ["Kundali, birth chart, compatibility, horoscope, zodiac", /kundali|BirthChart|Compatib|Horoscope|Zodiac|Planet|Nakshatra|Panchang/i],
  ["Tarot, palm, face, name analysis, gemstone (Ratna), numerology", /Tarot|Palm|Face|NameDestiny|NameAnalysis|ratna|Ratna|Numer|Namank|Cosmic/i],
  ["Astrology audio, Live Darshan, books, devotion, puja, chadhawa", /astrology\/|Audio|Darshan|devotionLibrary|Devotion|Mantra|Book|puja|Puja|chadhawa|Chadhawa|avatar-live|AvatarLive|Live/],
  ["Shop, blog, about, contact, FAQ, static content", /features\/shop|Shop|Blog|About|Contact|Faq|Articles|Education|data\//],
  ["Astrologer application and listing", /astrologer|Astrologer/],
  ["Admin panel (staff-only)", /features\/admin|pages\/admin|Admin/],
];
const areaOf = (rel) => (AREAS.find(([, re]) => re.test(rel)) ?? ["Other", null])[0];

const rows = walk(SRC).map((f) => {
  const rel = relative(SRC, f).split(sep).join("/");
  const s = scan(f);
  return { rel, area: areaOf(rel), usesI18n: s.usesI18n, count: s.hits.length, samples: s.hits.slice(0, 3) };
});

const byArea = new Map();
for (const r of rows) {
  const a = byArea.get(r.area) ?? { files: 0, withI18n: 0, strings: 0, dirtyFiles: 0 };
  a.files++; a.withI18n += r.usesI18n ? 1 : 0; a.strings += r.count; a.dirtyFiles += r.count > 0 ? 1 : 0;
  byArea.set(r.area, a);
}
console.log("Hardcoded user-facing English by area (heuristic):\n");
console.log("area".padEnd(70), "files".padStart(6), "use i18n".padStart(9), "files w/ English".padStart(17), "strings".padStart(8));
for (const [name, a] of [...byArea].sort((x, y) => y[1].strings - x[1].strings)) {
  console.log(name.padEnd(70), String(a.files).padStart(6), String(a.withI18n).padStart(9), String(a.dirtyFiles).padStart(17), String(a.strings).padStart(8));
}
const total = rows.reduce((n, r) => n + r.count, 0);
console.log(`\nTOTAL: ${total} candidate strings in ${rows.filter((r) => r.count).length} of ${rows.length} source files.`);
console.log(`\nTop ${TOP} files:`);
for (const r of rows.filter((r) => r.count).sort((a, b) => b.count - a.count).slice(0, TOP)) console.log(String(r.count).padStart(4), r.usesI18n ? "i18n" : "----", r.rel);
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ total, areas: Object.fromEntries(byArea), files: rows.filter((r) => r.count) }, null, 2));
process.exit(0);
