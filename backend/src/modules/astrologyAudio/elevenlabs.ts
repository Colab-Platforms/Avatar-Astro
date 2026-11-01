import { isMp3 } from "./astrologyAudio.config.js";

const API = "https://api.elevenlabs.io/v1";
const TIMEOUT_MS = 90_000;

export type ElevenLabsErrorCode =
  | "NOT_CONFIGURED"
  | "AUTH"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "VOICE_NOT_FOUND"
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "BAD_AUDIO";

/** Carries only a message that is safe to show an admin: never the API key, headers or raw upstream body. */
export class ElevenLabsError extends Error {
  constructor(
    public code: ElevenLabsErrorCode,
    message: string,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

const apiKey = () => process.env.ELEVENLABS_API_KEY?.trim() || "";
export const isElevenLabsConfigured = () => Boolean(apiKey());

/** Reads ElevenLabs' `{ detail: { status, message } }` / `{ detail: "..." }` shapes without trusting them. */
async function readDetail(res: Response): Promise<{ status: string; message: string }> {
  try {
    const body: any = await res.json();
    const d = body?.detail;
    if (typeof d === "string") return { status: "", message: d };
    return { status: String(d?.status ?? ""), message: String(d?.message ?? "") };
  } catch {
    return { status: "", message: "" };
  }
}

function mapHttpError(status: number, detail: { status: string; message: string }): ElevenLabsError {
  const s = detail.status.toLowerCase();
  const m = detail.message.toLowerCase();
  if (status === 401 && (s.includes("quota") || m.includes("quota") || m.includes("credit"))) {
    return new ElevenLabsError("INSUFFICIENT_CREDITS", "ElevenLabs account has insufficient credits.", false);
  }
  if (status === 402 || s.includes("quota_exceeded") || m.includes("quota") || m.includes("credits")) {
    return new ElevenLabsError("INSUFFICIENT_CREDITS", "ElevenLabs account has insufficient credits.", false);
  }
  if (status === 401 || status === 403) {
    return new ElevenLabsError("AUTH", "ElevenLabs rejected the server API key. Check ELEVENLABS_API_KEY.", false);
  }
  if (status === 429) {
    return new ElevenLabsError("RATE_LIMITED", "ElevenLabs is rate limiting requests. Wait a minute and retry.", true);
  }
  if (status === 404 || s.includes("voice_not_found") || m.includes("voice") && m.includes("not found")) {
    return new ElevenLabsError("VOICE_NOT_FOUND", "ElevenLabs does not recognise this voice ID.", false);
  }
  if (status === 400 || status === 422) {
    const why = detail.message ? ` (${detail.message.slice(0, 160)})` : "";
    return new ElevenLabsError("INVALID_REQUEST", `ElevenLabs rejected the request${why}.`, false);
  }
  return new ElevenLabsError("UNAVAILABLE", `ElevenLabs is unavailable right now (HTTP ${status}). Retry shortly.`, true);
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const key = apiKey();
  if (!key) throw new ElevenLabsError("NOT_CONFIGURED", "ElevenLabs is not configured on the server.", false);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, headers: { ...(init.headers ?? {}), "xi-api-key": key }, signal: ctl.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw new ElevenLabsError("TIMEOUT", "ElevenLabs took too long to respond. Retry.", true);
    throw new ElevenLabsError("UNAVAILABLE", "Could not reach ElevenLabs. Retry shortly.", true);
  } finally {
    clearTimeout(timer);
  }
}

export interface SynthesizeInput {
  text: string;
  voiceId: string;
  modelId: string;
}

/** POST /v1/text-to-speech/{voice_id}: returns the MP3 bytes for exactly the text given. */
export async function synthesizeSpeech({ text, voiceId, modelId }: SynthesizeInput): Promise<Buffer> {
  const res = await request(`${API}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: modelId }),
  });
  if (!res.ok) throw mapHttpError(res.status, await readDetail(res));
  const audio = Buffer.from(await res.arrayBuffer());
  if (!isMp3(audio)) throw new ElevenLabsError("BAD_AUDIO", "ElevenLabs returned data that is not a valid MP3.", true);
  return audio;
}

/** GET /v1/voices/{voice_id}: confirms a voice exists for this account before it is saved. */
export async function verifyVoice(voiceId: string): Promise<void> {
  const res = await request(`${API}/voices/${encodeURIComponent(voiceId)}`, { method: "GET" });
  if (!res.ok) throw mapHttpError(res.status, await readDetail(res));
}
