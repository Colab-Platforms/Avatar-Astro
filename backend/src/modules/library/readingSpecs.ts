import type { Request } from "express";
import { isConversationFeature, type ConversationFeature, type ReadingFeature } from "@/config/readingFeatures.js";

/**
 * What each AI route returns and how it becomes a library record. This is the ONLY place that knows a route's response shape;
 * the capture middleware, storage and dashboard are shared. A spec returns null when the response is not a complete, successful
 * result, in which case nothing is saved.
 */
export interface ReadingBuild {
  kind: "reading";
  feature: ReadingFeature;
  title: string;
  output: unknown;
  summary?: string;
  inputMeta?: Record<string, unknown>;
  /** Default true: only save when an AI provider call in this request actually succeeded (so canned fallbacks are never saved as readings). */
  requiresProvider?: boolean;
}
export interface ConversationBuild {
  kind: "conversation";
  feature: ConversationFeature;
  user: string;
  assistant: string;
  conversationId?: string | null;
}
export interface CaptureSpec {
  method: "GET" | "POST";
  /** Matched against the request path without the /api prefix and query string. */
  path: RegExp;
  build: (req: Request, body: any, match: RegExpMatchArray) => ReadingBuild | ConversationBuild | null;
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const wrapIfText = (v: unknown) => (typeof v === "string" ? { text: v } : v);

/** Parses a model reply that should be JSON; tolerates code fences and surrounding prose. Returns null for plain text. */
export function parseJsonLoose(text: string): Record<string, any> | null {
  const t = text.trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const v = JSON.parse(t.slice(start, end + 1));
    return isObj(v) ? v : null;
  } catch {
    return null;
  }
}

/** The text of an OpenAI-shaped chat completion, or "". */
const completionText = (body: any): string => (typeof body?.choices?.[0]?.message?.content === "string" ? body.choices[0].message.content : "");

/** Optional client hint on /api/ai/chat: { library: { feature, conversationId? } }. It only labels the result; the stored content always comes from the provider reply. */
const hint = (req: Request) => (isObj((req.body as any)?.library) ? ((req.body as any).library as Record<string, unknown>) : null);

const lastUserMessage = (req: Request): string => {
  const msgs = (req.body as any)?.messages;
  if (!Array.isArray(msgs)) return "";
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i]?.role === "user" && typeof msgs[i].content === "string") return msgs[i].content;
  return "";
};

const simple = (method: "GET" | "POST", path: RegExp, feature: ReadingFeature, title: string, pick: (body: any) => unknown, meta?: (req: Request, m: RegExpMatchArray) => Record<string, unknown>): CaptureSpec => ({
  method, path,
  build: (req, body, m) => {
    const output = pick(body);
    if (!output || (isObj(output) && Object.keys(output).length === 0)) return null;
    return { kind: "reading", feature, title, output: wrapIfText(output), inputMeta: meta?.(req, m) };
  },
});

const rawBody = (b: any) => (isObj(b) && !("error" in b) ? b : null);
const dataBody = (b: any) => (isObj(b) && b.success === true && b.data ? b.data : null);

export const SPECS: CaptureSpec[] = [
  {
    method: "POST", path: /^\/tarot\/reading$/,
    build: (req, body) => {
      const data = dataBody(body);
      if (!data) return null;
      const mode = (req.body as any)?.mode === "karma" ? "karma" : "timeline";
      const cards = Array.isArray((req.body as any)?.cards) ? (req.body as any).cards.map((c: any) => (typeof c === "string" ? c : c?.name)).filter((n: unknown) => typeof n === "string").slice(0, 10) : [];
      return { kind: "reading", feature: "tarot", title: mode === "karma" ? "Karma tarot reading" : "Life timeline tarot reading", output: data, inputMeta: { mode, category: str((req.body as any)?.question, 40), cards } };
    },
  },
  {
    method: "GET", path: /^\/interpretation\/horoscope\/([^/]+)$/,
    build: (_req, body, m) => {
      const data = dataBody(body);
      if (!data || !data.horoscope) return null;
      const sign = str(data.sign ?? decodeURIComponent(m[1]), 20) ?? "Daily";
      return { kind: "reading", feature: "horoscope", title: `${sign} daily horoscope`, output: data, inputMeta: { sign, date: str(data.date, 12) } };
    },
  },
  simple("POST", /^\/interpretation\/birth-chart$/, "birth-chart", "Birth chart interpretation", dataBody),
  {
    method: "GET", path: /^\/interpretation\/compatibility$/,
    build: (_req, body) => {
      const data = dataBody(body);
      if (!data || !data.analysis) return null;
      const a = str(data.sign1, 20), b = str(data.sign2, 20);
      return { kind: "reading", feature: "compatibility", title: a && b ? `${a} & ${b} compatibility` : "Zodiac compatibility", output: data, inputMeta: { sign1: a, sign2: b } };
    },
  },
  simple("POST", /^\/compatibility\/analyze$/, "compatibility", "Relationship compatibility analysis", rawBody),
  simple("POST", /^\/birthchart\/analyze$/, "birth-chart", "Birth chart analysis", rawBody),
  simple("POST", /^\/name-analysis\/narrative$/, "name-analysis", "Name numerology narrative", rawBody),
  simple("POST", /^\/palm-reading$/, "palm-reading", "Palm reading", dataBody),
  {
    method: "POST", path: /^\/gemstone-calculator\/calculate$/,
    build: (_req, body) => {
      const data = isObj(body) && body.status === true && isObj(body.data) ? body.data : null;
      if (!data) return null;
      const stone = str(data.primary?.stone?.name, 60);
      // The calculation itself is the reading, so it is kept even when the explanation text was written by rules instead of AI.
      return { kind: "reading", feature: "gemstone", title: stone ? `Ratna Jyotish: ${stone}` : "Ratna Jyotish gemstone guidance", output: data, summary: str(data.explanation?.text, 300), requiresProvider: false };
    },
  },
  simple("POST", /^\/inner-voice\/diagnose$/, "karma", "Karma diagnosis", rawBody),
  simple("POST", /^\/inner-voice\/wisdom$/, "shloka", "Sacred shloka", rawBody),
  simple("POST", /^\/inner-voice\/analyze-journal$/, "journal", "Journal insight", rawBody),
  simple("POST", /^\/inner-voice\/life-path$/, "life-path", "Future life path", rawBody),
  {
    method: "POST", path: /^\/inner-voice\/guru-chat$/,
    build: (req, body) => {
      if (!isObj(body) || typeof body.guidance !== "string") return null;
      const user = str((req.body as any)?.message, 4000);
      if (!user) return null;
      const parts = [body.guidance, body.reflection, body.action && `Remedy: ${body.action}`, body.spiritualPractice && `Practice: ${body.spiritualPractice}`, body.question]
        .filter((p) => typeof p === "string" && p.trim());
      const cid = str((req.body as any)?.conversationId, 40);
      return { kind: "conversation", feature: "inner-voice", user, assistant: parts.join("\n\n"), conversationId: cid ?? null };
    },
  },
  {
    // The shared Groq chat proxy serves Karma, Sacred Shloka and AI Guru. The client says which one (a label only).
    method: "POST", path: /^\/ai\/chat$/,
    build: (req, body) => {
      const h = hint(req);
      const feature = h?.feature;
      const text = completionText(body).trim();
      if (!text) return null;
      if (feature === "karma" || feature === "shloka" || feature === "guru-report") {
        // These replies are requested as JSON; plain text means the model did not produce a usable result, so nothing is saved.
        const parsed = parseJsonLoose(text);
        if (!parsed) return null;
        const title = feature === "karma" ? "Karma reading" : feature === "shloka" ? "Sacred shloka" : "AI Guru diagnosis report";
        return { kind: "reading", feature, title, output: parsed };
      }
      if (feature === "ai-guru" && isConversationFeature(feature)) {
        const user = lastUserMessage(req).trim();
        if (!user) return null;
        const parsed = parseJsonLoose(text);
        const assistant = typeof parsed?.message === "string" && parsed.message.trim() ? parsed.message : text;
        return { kind: "conversation", feature: "ai-guru", user, assistant, conversationId: str(h?.conversationId, 40) ?? null };
      }
      return null;
    },
  },
];
