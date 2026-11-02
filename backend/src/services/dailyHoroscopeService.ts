/**
 * Daily Sun-sign horoscope: one stored reading per sign per Asia/Kolkata calendar day.
 *
 * The first request for a sign on a given day asks the AI provider for a structured reading, validates it and stores it
 * in daily_horoscopes. Every later request that day (refreshes, other users, other tabs) returns the stored row, so the
 * reading never changes within a day and a new day gets a new one. A reading the provider could not supply (or that fails
 * validation) is never stored or replaced by invented text: the caller gets an HoroscopeUnavailableError instead.
 */
import axios from "axios";
import prisma from "@root/prisma.js";
import { OPENROUTER_MODEL } from "../config/aiModels.js";
import { DAILY_CHAT_TIMEZONE } from "../config/dailyChatLimit.js";

export const HOROSCOPE_TIMEZONE = DAILY_CHAT_TIMEZONE; // Asia/Kolkata: the same product-wide "today" as the daily chat limit
export const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
export type Sign = (typeof SIGNS)[number];

export class HoroscopeUnavailableError extends Error {}

export interface HoroscopeSections {
  overview: string; career: string; love: string; health: string; mood: string; opportunities: string; mindful: string; guidance: string;
  lucky?: { color?: string; number?: string };
}

export interface DailyHoroscope {
  sign: string;
  date: string;      // YYYY-MM-DD in Asia/Kolkata
  weekday: string;   // e.g. "Monday"
  timezone: string;
  system: "western-tropical-sun-sign";
  sections: HoroscopeSections;
  cached: boolean;
}

export const parseSign = (raw: unknown): Sign | null => {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (SIGNS as readonly string[]).includes(s) ? (s as Sign) : null;
};

/** Today's calendar date (YYYY-MM-DD) in the horoscope timezone. */
export const todayKey = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: HOROSCOPE_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

export const weekdayOf = (dateKey: string): string =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(new Date(`${dateKey}T00:00:00Z`));

const MAX = 700;
const str = (v: unknown, max = MAX): string | undefined => (typeof v === "string" && v.trim() ? v.replace(/\u0000/g, "").trim().slice(0, max) : undefined);

/** Accepts only a complete reading; the lucky details are kept only if the provider actually gave them. */
export function sanitizeSections(raw: any): HoroscopeSections | null {
  if (!raw || typeof raw !== "object") return null;
  const out = {
    overview: str(raw.overview), career: str(raw.career), love: str(raw.love), health: str(raw.health),
    mood: str(raw.mood), opportunities: str(raw.opportunities), mindful: str(raw.mindful), guidance: str(raw.guidance),
  };
  if (Object.values(out).some((v) => !v)) return null;
  const color = str(raw.lucky?.color, 30);
  const number = str(typeof raw.lucky?.number === "number" ? String(raw.lucky.number) : raw.lucky?.number, 12);
  return { ...(out as Omit<HoroscopeSections, "lucky">), ...(color || number ? { lucky: { ...(color ? { color } : {}), ...(number ? { number } : {}) } } : {}) };
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function buildPrompt(sign: Sign, dateKey: string): string {
  return `Write the daily horoscope for the Western (tropical) Sun sign ${sign[0].toUpperCase()}${sign.slice(1)} for ${weekdayOf(dateKey)}, ${dateKey}.

Rules:
- This is general reflective guidance for everyone born under this Sun sign, for personal interest. It is not a prediction of fixed events.
- Do NOT mention planetary positions, transits, moon phases, dashas or any astrological calculation, and do not claim any real astronomical event: none has been computed.
- No guaranteed outcomes, no specific dates or times, no medical, legal or financial-product advice, no fear-based language.
- Plain, warm, everyday English. 1-2 short sentences per field. Do not repeat the same point in different fields.
- "guidance" is ONE practical thing the reader can do today.
- Include "lucky" only if you want to offer a lucky colour and/or number; otherwise omit it.

Return ONLY valid JSON (no markdown, no fences) with exactly these keys:
{"overview":"the day's overall theme","career":"work, business, money - with one practical tip","love":"relationships theme","health":"general wellness tip, no medical claims","mood":"likely emotional or motivational theme","opportunities":"what to pay attention to or make use of","mindful":"a challenge or behaviour to watch out for","guidance":"one practical action for today","lucky":{"color":"a colour name","number":"a single number"}}`;
}

async function generate(sign: Sign, dateKey: string): Promise<{ sections: HoroscopeSections; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new HoroscopeUnavailableError("The horoscope provider is not configured");
  let content = "";
  try {
    const res = await axios.post(
      OPENROUTER_URL,
      { model: OPENROUTER_MODEL, temperature: 0.4, max_tokens: 900, messages: [
        { role: "system", content: "You write short, safe, plain-English daily horoscopes as reflective guidance." },
        { role: "user", content: buildPrompt(sign, dateKey) },
      ] },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Astrology App" }, timeout: 45_000 },
    );
    content = res.data?.choices?.[0]?.message?.content ?? "";
  } catch (e: any) {
    console.error("Daily horoscope provider error:", e?.response?.status ?? e?.code ?? e?.message);
    throw new HoroscopeUnavailableError("The horoscope provider could not be reached");
  }
  const match = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
  let parsed: unknown = null;
  try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
  const sections = sanitizeSections(parsed);
  if (!sections) {
    console.error("Daily horoscope provider returned an unusable reading");
    throw new HoroscopeUnavailableError("The horoscope provider returned an incomplete reading");
  }
  return { sections, model: OPENROUTER_MODEL };
}

const view = (sign: Sign, dateKey: string, sections: HoroscopeSections, cached: boolean): DailyHoroscope => ({
  sign, date: dateKey, weekday: weekdayOf(dateKey), timezone: HOROSCOPE_TIMEZONE, system: "western-tropical-sun-sign", sections, cached,
});

const inFlight = new Map<string, Promise<DailyHoroscope>>();

export async function getDailyHoroscope(sign: Sign, now: Date = new Date()): Promise<DailyHoroscope> {
  const dateKey = todayKey(now);
  const horoscopeDate = new Date(`${dateKey}T00:00:00Z`);
  const where = { sign_horoscopeDate: { sign, horoscopeDate } };

  const stored = await prisma.dailyHoroscope.findUnique({ where });
  const storedSections = stored ? sanitizeSections(stored.content) : null;
  if (storedSections) return view(sign, dateKey, storedSections, true);

  const key = `${sign}:${dateKey}`;
  const running = inFlight.get(key);
  if (running) return running;

  const job = (async () => {
    const { sections, model } = await generate(sign, dateKey);
    try {
      await prisma.dailyHoroscope.create({ data: { sign, horoscopeDate, content: sections as any, model } });
      return view(sign, dateKey, sections, false);
    } catch (e: any) {
      // Another instance stored today's reading first: that one wins so everyone sees the same text.
      if (e?.code === "P2002") {
        const winner = await prisma.dailyHoroscope.findUnique({ where });
        const w = winner ? sanitizeSections(winner.content) : null;
        if (w) return view(sign, dateKey, w, true);
      }
      throw e;
    }
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

/** Plain-text rendition kept for the saved-library view and any older client that reads `horoscope`. */
export const toPlainText = (s: HoroscopeSections): string =>
  [["Today's Overview", s.overview], ["Career & Finance", s.career], ["Love & Relationships", s.love], ["Health & Well-being", s.health],
    ["Energy & Mood", s.mood], ["Opportunities Today", s.opportunities], ["Be Mindful Of", s.mindful], ["Today's Guidance", s.guidance]]
    .map(([h, t]) => `${h}\n${t}`).join("\n\n");
