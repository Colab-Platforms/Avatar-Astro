import { Router, Request, Response } from "express";
import express from "express";
import { createRateLimiter } from "../utils/rateLimit.js";
import { auth } from "../middleware/authMiddleware.js";

/**
 * Server-side proxy for the Groq chat-completions API so the key never ships
 * in the frontend bundle. Responses keep the OpenAI/Groq shape
 * ({ choices: [{ message: { content } }] } / { error: { message } }) so the
 * existing frontend parsing is unchanged.
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 45_000;

const MAX_MESSAGES = 60;
const MAX_TOTAL_CHARS = 60_000;
const MAX_TOKENS_CAP = 4000;
const ROLES = new Set(["system", "user", "assistant"]);

const router = Router();

// Every AI call spends provider credits, so it requires a signed-in user.
router.use(auth("USER"));
router.use(express.json({ limit: "250kb" }));
router.use(createRateLimiter({ windowMs: 60_000, max: 30 }));

function bad(res: Response, message: string) {
  return res.status(400).json({ error: { message } });
}

router.post("/chat", async (req: Request, res: Response) => {
  const { messages, temperature, max_tokens, json } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return bad(res, `messages must be an array of 1-${MAX_MESSAGES} items`);
  }
  let total = 0;
  const clean: { role: string; content: string }[] = [];
  for (const m of messages) {
    if (!m || typeof m.content !== "string" || !ROLES.has(m.role)) {
      return bad(res, "each message needs a valid role and string content");
    }
    total += m.content.length;
    clean.push({ role: m.role, content: m.content });
  }
  if (total > MAX_TOTAL_CHARS) return bad(res, "messages are too long");
  if (!clean.some((m) => m.role === "user")) return bad(res, "at least one user message is required");

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured");
    return res.status(503).json({ error: { message: "AI service is not configured" } });
  }

  const temp = typeof temperature === "number" && isFinite(temperature) ? Math.min(Math.max(temperature, 0), 1.5) : 0.7;
  const maxTokens =
    typeof max_tokens === "number" && isFinite(max_tokens) ? Math.min(Math.max(Math.floor(max_tokens), 1), MAX_TOKENS_CAP) : 1000;

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        temperature: temp,
        max_tokens: maxTokens,
        ...(json === true ? { response_format: { type: "json_object" } } : {}),
        messages: clean,
      }),
    });
    const data: any = await upstream.json().catch(() => null);
    if (!upstream.ok || !data || data.error) {
      console.error("Groq upstream error:", upstream.status);
      return res.status(502).json({ error: { message: "AI service request failed" } });
    }
    const content = data.choices?.[0]?.message?.content;
    return res.json({ choices: [{ message: { content: typeof content === "string" ? content : "" } }] });
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    console.error("Groq proxy error:", timedOut ? "timeout" : err?.name);
    return res
      .status(timedOut ? 504 : 502)
      .json({ error: { message: timedOut ? "AI service timed out" : "AI service unavailable" } });
  }
});

export default router;
