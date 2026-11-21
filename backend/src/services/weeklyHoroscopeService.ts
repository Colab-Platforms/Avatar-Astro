/**
 * Weekly Sun-sign horoscope: one stored reading per sign per Monday-Sunday week (Asia/Kolkata).
 *
 * Mirrors the daily service: the first request for a sign in a week asks the AI provider for a structured reading,
 * validates and stores it in weekly_horoscopes; later requests that week return the stored row. Nothing is invented
 * when the provider fails (the caller gets an HoroscopeUnavailableError). Same convention as the daily horoscope:
 * general guidance for the Western tropical Sun sign, with no claim about computed planetary positions.
 */
import axios from "axios";
import prisma from "@root/prisma.js";
import { OPENROUTER_MODEL } from "../config/aiModels.js";
import { HOROSCOPE_TIMEZONE, HoroscopeUnavailableError, todayKey, type Sign } from "./dailyHoroscopeService.js";

export { weekRangeOf, sanitizeWeekly, type WeeklySections, type WeeklyHoroscope } from "./weeklyHoroscopeCore.js";
import { weekRangeOf, sanitizeWeekly, type WeeklySections, type WeeklyHoroscope } from "./weeklyHoroscopeCore.js";

/** The provider answered, but not with a complete weekly reading. Nothing is stored. */
export class WeeklyInvalidResponseError extends HoroscopeUnavailableError {}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildPrompt(sign: Sign, start: string, end: string): string {
  return `Write the weekly horoscope for the Western (tropical) Sun sign ${sign[0].toUpperCase()}${sign.slice(1)} for the week ${start} to ${end}.

Rules:
- This is general reflective guidance for everyone born under this Sun sign, for personal interest. It is not a prediction of fixed events.
- Do NOT mention planetary positions, transits, moon phases, dashas or any astrological calculation, and do not claim any real astronomical event: none has been computed.
- No guaranteed outcomes, no specific dates, days or times, no medical, legal or financial-product advice, no fear-based language.
- Plain, warm, everyday English. 2-3 short sentences per field. Do not repeat the same point in different fields.
- "advice" is ONE practical thing the reader can do this week.
- Include "lucky" only if you want to offer a lucky colour and/or number; otherwise omit it.

Return ONLY valid JSON (no markdown, no fences) with exactly these keys:
{"overview":"the week's overall theme","career":"work and professional life","love":"love and relationships","finance":"money and spending, general mindset only","health":"general wellbeing tip, no medical claims","family":"family and personal life","advice":"one practical action for the week","lucky":{"color":"a colour name","number":"a single number"}}`;
}

export async function generateWeekly(sign: Sign, start: string, end: string): Promise<{ sections: WeeklySections; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new HoroscopeUnavailableError("The horoscope provider is not configured");
  let content = "";
  try {
    const res = await axios.post(
      OPENROUTER_URL,
      { model: OPENROUTER_MODEL, temperature: 0.4, max_tokens: 1200, messages: [
        { role: "system", content: "You write short, safe, plain-English weekly horoscopes as reflective guidance." },
        { role: "user", content: buildPrompt(sign, start, end) },
      ] },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Astrology App" }, timeout: 45_000 },
    );
    content = res.data?.choices?.[0]?.message?.content ?? "";
  } catch (e: any) {
    console.error("Weekly horoscope provider error:", e?.response?.status ?? e?.code ?? e?.message);
    throw new HoroscopeUnavailableError("The horoscope provider could not be reached");
  }
  const match = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
  let parsed: unknown = null;
  try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
  const sections = sanitizeWeekly(parsed);
  if (!sections) {
    console.error("Weekly horoscope provider returned an unusable reading");
    throw new WeeklyInvalidResponseError("The horoscope provider returned an incomplete reading");
  }
  return { sections, model: OPENROUTER_MODEL };
}

const view = (sign: Sign, start: string, end: string, sections: WeeklySections, cached: boolean): WeeklyHoroscope => ({
  sign, weekStart: start, weekEnd: end, timezone: HOROSCOPE_TIMEZONE, system: "western-tropical-sun-sign", sections, cached,
});

const inFlight = new Map<string, Promise<WeeklyHoroscope>>();

export async function getWeeklyHoroscope(sign: Sign, now: Date = new Date()): Promise<WeeklyHoroscope> {
  const { start, end } = weekRangeOf(todayKey(now));
  const weekStart = new Date(`${start}T00:00:00Z`);
  const where = { sign_weekStart: { sign, weekStart } };

  const stored = await prisma.weeklyHoroscope.findUnique({ where });
  const storedSections = stored ? sanitizeWeekly(stored.content) : null;
  if (storedSections) return view(sign, start, end, storedSections, true);

  const key = `${sign}:${start}`;
  const running = inFlight.get(key);
  if (running) return running;

  const job = (async () => {
    const { sections, model } = await generateWeekly(sign, start, end);
    try {
      await prisma.weeklyHoroscope.create({ data: { sign, weekStart, content: sections as any, model } });
      return view(sign, start, end, sections, false);
    } catch (e: any) {
      if (e?.code === "P2002") {
        const winner = await prisma.weeklyHoroscope.findUnique({ where });
        const w = winner ? sanitizeWeekly(winner.content) : null;
        if (w) return view(sign, start, end, w, true);
      }
      throw e;
    }
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}
