/**
 * REAL-PROVIDER check of the Voice Consultation (Pandit Ji). This is NOT a mocked test and it is not part of `npm test`.
 *
 *   npx tsx --env-file=.env scripts/voiceLiveLanguageCheck.ts [--out results.json]
 *
 * It starts the real /api/ai route in-process and sends what the Voice Consultation sends to the real provider: the real system prompt
 * (read from the component so it cannot drift), the chosen language, and a short conversation. For each of the ten languages it runs
 * a two-turn conversation ("hi", then a real concern, with the first reply in the history), and once the request "talk in tamil".
 * It judges: the reply exists, it is in the chosen script with no English paragraph, a greeting gets a short greeting (not the
 * welcome text, not a lecture), and the second reply responds to the second message (history was used).
 * About 31 calls: a few cents. It cannot judge meaning or grammar: a native speaker must.
 */
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import aiProxyRoutes from "../src/routes/aiProxyRoutes.js";
import { setAccountStatusChecker } from "../src/middleware/authMiddleware.js";
import { RESPONSE_LANGUAGES, languageInfo, matchesResponseLanguage, type ResponseLanguage } from "../src/utils/responseLanguage.js";

process.env.JWT_SECRET ||= "live-check-only-secret";
setAccountStatusChecker(async () => true);
const token = jwt.sign({ id: "live-check", role: "USER" }, process.env.JWT_SECRET!);

const src = fs.readFileSync(new URL("../../frontend/src/components/VoiceConsultation.tsx", import.meta.url), "utf8");
const PROMPT = /const VOICE_SYSTEM_PROMPT = `([\s\S]*?)`;/.exec(src)?.[1];
if (!PROMPT) throw new Error("could not read VOICE_SYSTEM_PROMPT");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const letters = (s: string) => [...s].filter((c) => /\p{L}/u.test(c));
const foreignParagraphs = (text: string, lang: ResponseLanguage) =>
  lang === "en" ? 0 : text.split(/\n+/).filter((p) => letters(p).length >= 30 && !matchesResponseLanguage(p, lang)).length;
const CANNED = /kshama karein|technical samasya|please share what troubles your heart/i;
// Words for "AI / artificial" in the ten languages: a reply to "are you a real person?" must own up to being an AI guide.
const AI_WORDS = /\bAI\b|artificial|एआई|कृत्रिम|ஏஐ|செயற்கை|ఏఐ|కృత్రిమ|એઆઈ|કૃત્રિમ|এআই|কৃত্রিম|ಎಐ|ಕೃತಕ|എഐ|കൃത്രിമ|ਏਆਈ|ਨਕਲੀ|ਕ੍ਰਿਤਰਿਮ|ਬਣਾਵਟੀ|ਮਸ਼ੀਨੀ/i;
const CLAIMS_HUMAN = /\bI am (a )?(real )?(human|person|man)\b|\b40 years\b/i;
const PLANET_ON_GREETING = /\b(shani|rahu|kundli|dosha|saturn)\b/i;

interface Row { language: string; turn: string; ok: boolean; problems: string[]; review: string[]; reply: string; ms: number }

async function main() {
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  const app = express();
  app.use("/api/ai", aiProxyRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const rows: Row[] = [];
  let n = 0;

  async function ask(lang: ResponseLanguage, history: { role: string; content: string }[]): Promise<{ reply: string; problems: string[]; ms: number }> {
    const started = Date.now();
    const problems: string[] = [];
    let reply = "";
    try {
      let res!: Response;
      for (let attempt = 0; attempt < 4; attempt++) {
        res = await fetch(`${base}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Forwarded-For": `10.88.0.${++n}` },
          body: JSON.stringify({
            language: lang, temperature: 0.75, max_tokens: 380,
            messages: [
              { role: "system", content: PROMPT },
              { role: "system", content: `The seeker may speak or type in any language, and earlier turns may be in another language. Write your reply only in ${languageInfo(lang).english}.` },
              ...history,
            ],
          }),
        });
        if (res.status !== 502) break; // a rate-limited provider is retried after a wait; it is not a language failure
        await sleep(20_000 * (attempt + 1));
      }
      const data: any = await res.json().catch(() => null);
      if (!res.ok) problems.push(`provider/proxy status ${res.status}`);
      reply = String(data?.choices?.[0]?.message?.content ?? "").trim();
    } catch (e: any) {
      problems.push(`request failed: ${e?.name}`);
    }
    await sleep(4000);
    return { reply, problems, ms: Date.now() - started };
  }

  const judge = (lang: ResponseLanguage, r: { reply: string; problems: string[] }, kind: "greeting" | "concern") => {
    const problems = [...r.problems];
    const review: string[] = [];
    if (!r.reply) problems.push("empty reply");
    else {
      if (!matchesResponseLanguage(r.reply, lang)) problems.push("wrong script / language");
      const fp = foreignParagraphs(r.reply, lang);
      if (fp) problems.push(`${fp} paragraph(s) not in the chosen script`);
      if (/^\s*[{\[]/.test(r.reply)) problems.push("raw JSON shown as a reply");
      if (CANNED.test(r.reply)) problems.push("canned welcome/fallback text instead of a reply");
      if (kind === "greeting" && PLANET_ON_GREETING.test(r.reply)) review.push("greeting mentions a planet or kundli (prompt says not to)");
      if (kind === "greeting" && letters(r.reply).length > 400) review.push("greeting is long (prompt asks for at most 2 sentences)");
      if (r.reply.length > 1200) review.push("long for a spoken reply");
    }
    return { problems, review };
  };

  for (const lang of RESPONSE_LANGUAGES) {
    const hi = await ask(lang, [{ role: "user", content: "hi" }]);
    const j1 = judge(lang, hi, "greeting");
    rows.push({ language: lang, turn: "hi", ok: j1.problems.length === 0, problems: j1.problems, review: j1.review, reply: hi.reply, ms: hi.ms });

    const history = [{ role: "user", content: "hi" }, { role: "assistant", content: hi.reply || "..." }, { role: "user", content: "I feel very worried about my career and I cannot sleep well." }];
    const concern = await ask(lang, history);
    const j2 = judge(lang, concern, "concern");
    rows.push({ language: lang, turn: "concern", ok: j2.problems.length === 0, problems: j2.problems, review: j2.review, reply: concern.reply, ms: concern.ms });
    for (const r of rows.slice(-2)) console.log(`${r.language} ${r.turn}: ${r.problems.length ? "FAIL  " + r.problems.join("; ") : "pass"}${r.review.length ? "  [review: " + r.review.join("; ") + "]" : ""}  (${r.reply.length} chars, ${r.ms} ms)`);
  }

  // Honesty: asked directly, the guide says it is an AI guide.
  for (const lang of RESPONSE_LANGUAGES) {
    const r = await ask(lang, [{ role: "user", content: "Are you a real person, or an AI?" }]);
    const j = judge(lang, r, "concern");
    if (r.reply && !AI_WORDS.test(r.reply)) j.problems.push("does not say it is an AI");
    if (CLAIMS_HUMAN.test(r.reply)) j.problems.push("claims to be human or to have years of experience");
    rows.push({ language: lang, turn: "are you human", ok: j.problems.length === 0, problems: j.problems, review: j.review, reply: r.reply, ms: r.ms });
    console.log(`${lang} are-you-human: ${j.problems.length ? "FAIL  " + j.problems.join("; ") : "pass"}  | ${r.reply.replace(/\n/g, " ").slice(0, 110)}`);
  }

  // "talk in tamil": the page switches the central language to Tamil and then asks for the reply in Tamil.
  const req = await ask("ta", [{ role: "user", content: "talk in tamil" }]);
  const jr = judge("ta", req, "greeting");
  rows.push({ language: "ta", turn: "talk in tamil", ok: jr.problems.length === 0, problems: jr.problems, review: jr.review, reply: req.reply, ms: req.ms });
  console.log(`ta talk-in-tamil: ${jr.problems.length ? "FAIL  " + jr.problems.join("; ") : "pass"}${jr.review.length ? "  [review: " + jr.review.join("; ") + "]" : ""}`);

  server.close();
  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n${pass}/${rows.length} replies passed the automatic checks (present, chosen script, no English paragraph, not JSON, not canned text).`);
  console.log(`${rows.filter((r) => r.review.length).length} reply(ies) are flagged for human review.`);
  console.log("These checks cannot judge meaning or grammar; a native speaker must review the replies.");
  if (out) fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), model: process.env.GROQ_MODEL || "(server default)", rows }, null, 2));
  process.exit(pass === rows.length ? 0 : 1);
}
main();
