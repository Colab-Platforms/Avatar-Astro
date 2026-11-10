/**
 * REAL-PROVIDER check of Divya Margdarshak's reply language. This is NOT a mocked test and it is not part of `npm test`.
 *
 *   npx tsx --env-file=.env scripts/guruLiveLanguageCheck.ts [--out results.json]
 *
 * It starts the real /api/ai route in-process and sends the same kind of request the chat sends (the real Divya Margdarshak system
 * prompt, a question typed in English, the chosen language) to the real provider (Groq, the key and model from .env, nothing printed).
 * For each of the ten languages and each question it records the reply and judges it:
 *   - the reply is valid JSON with a message;
 *   - the message is in the chosen language's script (share of letters), with no English paragraph of real length;
 *   - no invented verse or chapter number (the chat gives the model no verses in this check) and no calendar terms (tithi, nakshatra);
 *   - it is not empty and not absurdly long.
 * It calls the provider 3 x 10 times, so it spends a few cents of credit. It cannot judge meaning or grammar: a native speaker must.
 */
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import aiProxyRoutes from "../src/routes/aiProxyRoutes.js";
import { setAccountStatusChecker } from "../src/middleware/authMiddleware.js";
import { RESPONSE_LANGUAGES, languageInfo, matchesResponseLanguage, namesCalendarTermIn, type ResponseLanguage } from "../src/utils/responseLanguage.js";

process.env.JWT_SECRET ||= "live-check-only-secret";
setAccountStatusChecker(async () => true);
const token = jwt.sign({ id: "live-check", role: "USER" }, process.env.JWT_SECRET!);

// The real system prompt, read from the frontend file so it cannot drift.
const src = fs.readFileSync(new URL("../../frontend/src/lib/guruChat.ts", import.meta.url), "utf8");
const SYSTEM = /GURU_CONSULTATION_SYSTEM = `([\s\S]*?)`;/.exec(src)?.[1].replace(/\\`/g, "`");
if (!SYSTEM) throw new Error("could not read GURU_CONSULTATION_SYSTEM");

// [what the user typed, the language it is written in] - the reply language is always the chosen one, whatever was typed.
const QUESTIONS: [string, string][] = [
  ["I feel very worried about my career and I cannot sleep well. How can I find some peace of mind?", "English"],
  ["What does the Bhagavad Gita teach about fear? And is today a good day to start something new?", "English"],
  ["मुझे अपने परिवार को लेकर बहुत चिंता रहती है। मैं क्या करूँ?", "Hindi"],
];

const paragraphsInOtherScript = (text: string, lang: ResponseLanguage): number =>
  text.split(/\n+/).filter((p) => {
    const letters = [...p].filter((c) => /\p{L}/u.test(c));
    return letters.length >= 30 && !matchesResponseLanguage(p, lang) && lang !== "en";
  }).length;
const INVENTED_REF = /\b(?:chapter|verse|adhyaya?|shloka|sloka)\s*\d|\b\d{1,2}\s*[.:]\s*\d{1,3}\b/i;
const ENGLISH_CALENDAR = /\b(tithi|nakshatra|panchami|ashtami|ekadashi|amavasya|purnima|rohini|ashwini|pushya)\b/i;

interface Row { language: string; question: number; ok: boolean; problems: string[]; review: string[]; letters: number; message: string; ms: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  const app = express();
  app.use("/api/ai", aiProxyRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const rows: Row[] = [];
  let n = 0;

  for (const lang of RESPONSE_LANGUAGES) {
    for (let q = 0; q < QUESTIONS.length; q++) {
      const started = Date.now();
      const problems: string[] = [];
      const review: string[] = []; // not failures: a person has to read these (a calendar WORD may only be a disclaimer such as "I cannot see your tithi")
      let message = "";
      try {
        // A rate-limited or briefly unavailable provider (the proxy answers 502) is retried after a wait; it is not counted as a language failure.
        let res!: Response;
        for (let attempt = 0; attempt < 4; attempt++) {
          res = await fetch(`${base}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Forwarded-For": `10.77.0.${++n}` },
          body: JSON.stringify({
            language: lang,
            temperature: 0.7,
            max_tokens: 900,
            json: true,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "system", content: `The user's latest message appears to be written in ${QUESTIONS[q][1]}. Understand it in whatever language it is written, but write your reply only in ${languageInfo(lang).english}.` },
              { role: "user", content: QUESTIONS[q][0] },
            ],
          }),
        });
          if (res.status !== 502) break;
          await sleep(20_000 * (attempt + 1));
        }
        const data: any = await res.json().catch(() => null);
        if (!res.ok) problems.push(`provider/proxy status ${res.status}`);
        const raw: string = data?.choices?.[0]?.message?.content ?? "";
        const m = /\{[\s\S]*\}/.exec(raw);
        try { message = String(JSON.parse(m ? m[0] : "")?.message ?? ""); } catch { problems.push("reply is not valid JSON"); message = raw; }
      } catch (e: any) {
        problems.push(`request failed: ${e?.name}`);
      }
      if (!message.trim()) problems.push("empty message");
      else {
        if (!matchesResponseLanguage(message, lang)) problems.push("wrong script / language");
        const eng = paragraphsInOtherScript(message, lang);
        if (eng) problems.push(`${eng} paragraph(s) not in the chosen script`);
        if (INVENTED_REF.test(message)) problems.push("contains a chapter/verse style reference");
        if (lang !== "en" && /\*\*[A-Za-z][A-Za-z ,&'-]{4,}\*\*/.test(message)) problems.push("section heading left in English");
        if (ENGLISH_CALENDAR.test(message)) review.push("uses an English calendar word");
        if (lang !== "en" && namesCalendarTermIn(message, lang as Exclude<ResponseLanguage, "en">)) review.push("uses a calendar word (tithi/nakshatra/panchang): check it is not an invented value");
        if (message.length > 2000) problems.push("longer than the chat accepts");
      }
      await sleep(4000); // stay under the provider's per-minute limits
      rows.push({ language: lang, question: q + 1, ok: problems.length === 0, problems, review, letters: [...message].filter((c) => /\p{L}/u.test(c)).length, message, ms: Date.now() - started });
      console.log(`${lang} Q${q + 1}: ${problems.length ? "FAIL  " + problems.join("; ") : "pass"}${review.length ? "  [review: " + review.join("; ") + "]" : ""}  (${rows[rows.length - 1].letters} letters, ${rows[rows.length - 1].ms} ms)`);
    }
  }
  server.close();
  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n${pass}/${rows.length} replies passed the automatic checks (valid JSON, chosen script, no English paragraph or heading, no chapter/verse reference).`);
  console.log(`${rows.filter((r) => r.review.length).length} reply(ies) are flagged for human review (calendar words).`);
  console.log("These checks cannot judge meaning or grammar; a native speaker must review the replies.");
  if (out) fs.writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), model: process.env.GROQ_MODEL || "(server default)", rows }, null, 2));
  process.exit(pass === rows.length ? 0 : 1);
}
main();
