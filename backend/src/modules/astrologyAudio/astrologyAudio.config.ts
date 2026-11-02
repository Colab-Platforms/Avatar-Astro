import { createHash } from "node:crypto";

/**
 * Tools that have an About section on their page. Slugs match the feature ids in
 * frontend/src/data/featureCatalog.ts. Ratna Jyotish is intentionally absent: it has no About section yet.
 */
export const AUDIO_TOOLS = [
  { slug: "tarot", label: "Tarot Drishti" },
  { slug: "zodiac", label: "Rashi Chakra" },
  { slug: "birth-chart", label: "Janma Kundali" },
  { slug: "compatibility", label: "Jodi Jyotish" },
  { slug: "palm-reading", label: "Hasta Rekha" },
  { slug: "name-numerology", label: "Naamank Jyotish" },
] as const;

export const AUDIO_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
] as const;

export type ToolSlug = (typeof AUDIO_TOOLS)[number]["slug"];
export type LanguageCode = (typeof AUDIO_LANGUAGES)[number]["code"];

export const isToolSlug = (v: unknown): v is ToolSlug => AUDIO_TOOLS.some((t) => t.slug === v);
export const isLanguage = (v: unknown): v is LanguageCode => AUDIO_LANGUAGES.some((l) => l.code === v);
export const languageName = (code: string) => AUDIO_LANGUAGES.find((l) => l.code === code)?.name ?? code;

/**
 * ElevenLabs models an admin may pick, and the languages each one speaks. This is deliberately a fixed
 * allow-list (a client-supplied model id is never trusted) and a compatibility table: a model is only
 * offered for a language it supports. Update it here if ElevenLabs changes model coverage.
 */
export const ELEVENLABS_MODELS: { id: string; label: string; languages: readonly LanguageCode[] }[] = [
  { id: "eleven_v3", label: "Eleven v3 (most languages)", languages: ["en", "hi", "mr"] },
  { id: "eleven_multilingual_v2", label: "Multilingual v2", languages: ["en", "hi"] },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5", languages: ["en", "hi"] },
  { id: "eleven_flash_v2_5", label: "Flash v2.5", languages: ["en", "hi"] },
  { id: "eleven_turbo_v2", label: "Turbo v2 (English only)", languages: ["en"] },
  { id: "eleven_flash_v2", label: "Flash v2 (English only)", languages: ["en"] },
];

export const modelSupportsLanguage = (modelId: string, language: string): boolean =>
  ELEVENLABS_MODELS.some((m) => m.id === modelId && (m.languages as readonly string[]).includes(language));

export const NARRATION_MIN_CHARS = 20;
export const NARRATION_MAX_CHARS = 5000;
export const PREVIEW_MAX_CHARS = 250;
/** ElevenLabs voice ids are short alphanumeric strings. */
export const VOICE_ID_PATTERN = /^[A-Za-z0-9]{8,40}$/;

/** Normalises line endings and surrounding whitespace so a hash only changes when the words do. */
export const normalizeText = (text: string): string => text.replace(/\r\n?/g, "\n").trim();

export const contentHash = (language: string, text: string): string =>
  createHash("sha256").update(`${language}\n${normalizeText(text)}`).digest("hex");

const DEVANAGARI = /[ऀ-ॿ]/g;
const LETTERS = /\p{L}/gu;

/**
 * Hindi and Marathi narration must actually be in Devanagari. Without this an admin could save the
 * English copy under "hi" and it would be read out by a Hindi voice.
 */
export function looksLikeDevanagari(text: string): boolean {
  const letters = text.match(LETTERS)?.length ?? 0;
  if (letters === 0) return false;
  return (text.match(DEVANAGARI)?.length ?? 0) / letters >= 0.5;
}

/** First bytes of a real MP3: an ID3 tag or an MPEG audio frame sync. */
export function isMp3(buf: Buffer): boolean {
  if (buf.length < 128) return false;
  if (buf.subarray(0, 3).toString("latin1") === "ID3") return true;
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
}
