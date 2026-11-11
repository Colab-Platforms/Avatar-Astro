import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useConsultationGuard } from "../hooks/useConsultationGuard";
import { API_BASE_URL } from "@/lib/api";
import { authedFetch } from '@/lib/authedFetch';
import { askPandit, VoiceChatError } from "@/lib/voiceChat";
import { detectLanguageRequest } from "@/i18n/languageRequest";
import { LOCALES, isLocale, localeInfo, type LocaleCode } from "@/i18n/languages";
import { setLanguage } from "@/i18n";
import LanguageSelector from "@/components/LanguageSelector";

// ── API ──────────────────────────────────────────────────────────────────────

// Sarvam AI TTS — routed through /api/tts serverless function (no CORS issues).
export const TTS_PROVIDER = "sarvam" as const;

// ── Sarvam AI TTS ─────────────────────────────────────────────────────────────
let _sarvamAudio: HTMLAudioElement | null = null;

async function speakSarvam(
  text: string,
  ttsLang: string,
  onTimeUpdate: (current: number, total: number) => void,
  onEnd: () => void
): Promise<"ok" | "error"> {
  try {
    console.log("[Sarvam TTS] Requesting — provider: sarvam, speaker: manan, lang:", ttsLang, "chars:", text.length);
    const res = await authedFetch(`${API_BASE_URL}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: ttsLang }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[Sarvam TTS] HTTP error", res.status, errBody);
      return "error";
    }
    const data = await res.json();
    const b64 = data.audio;
    if (!b64) {
      console.error("[Sarvam TTS] No audio field in response", data);
      return "error";
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    console.log("[Sarvam TTS] Audio received, playing blob URL:", url);
    if (_sarvamAudio) { _sarvamAudio.pause(); _sarvamAudio = null; }
    const audio = new Audio(url);
    _sarvamAudio = audio;
    audio.ontimeupdate = () => onTimeUpdate(audio.currentTime, audio.duration || 1);
    audio.onended = () => { URL.revokeObjectURL(url); _sarvamAudio = null; onEnd(); };
    audio.onerror = (e) => { console.error("[Sarvam TTS] Audio playback error:", e); URL.revokeObjectURL(url); _sarvamAudio = null; onEnd(); };
    await audio.play();
    console.log("[Sarvam TTS] Playback started successfully");
    return "ok";
  } catch (err) {
    console.error("[Sarvam TTS] fetch failed:", err);
    return "error";
  }
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const VOICE_SYSTEM_PROMPT = `You are Pandit Rameshwar Ji, a warm, compassionate spiritual guide in the Vedic tradition. You are an AI guide, not a human pandit: you have no personal life or years of practice, and you cannot see the seeker's birth chart. A seeker is speaking to you live and your words will be read aloud.

You ONLY discuss: career, job, business, relationships, marriage, family, health, finances, stress, anxiety, spirituality, karma, life purpose, emotional struggles, inner peace, future guidance. Politely refuse every other topic.

LANGUAGE RULE — write ONLY in the language given in the language instruction that follows, in that language's own script, whatever language the seeker speaks or types in. Earlier turns may be in another language: still answer in the instructed language. Do not use English headings or long English paragraphs in a non-English reply. A request to change languages is handled by the interface and is never an off-topic request.

YOUR IDENTITY:
You speak with the calm authority, deep warmth and spiritual wisdom of a Jyotish Acharya, temple priest or Vedic guru, like a caring elder of the family. You sound like a kind Pandit Ji on a phone consultation, never like a chatbot or a life coach.
You are honest about what you are: if the seeker asks whether you are a real person, a human, a bot or an AI, say plainly, in the instructed language and in your warm voice, that you are an AI guide offering reflective guidance inspired by the Vedic tradition and not a human pandit, then gently return to their concern. Never claim to be human, never claim personal experience or years of practice, and never claim to have seen their chart.

CRITICAL — GREETING RULE (highest priority):
If the seeker says ONLY a greeting (hello, hi, namaste, namaskaar, hey, good morning, good evening, good night, how are you, or similar) with NO other concern shared:
- Respond with ONLY a warm welcome and ONE question asking how you can help.
- Maximum 2 sentences. Do NOT mention any planet, kundli, Shani, Rahu, dosha, remedy, puja, or emotional state.
- Do NOT assume they have a problem, stress, or any issue.
- Example (say it in the instructed language; this one is Hinglish): "Namaste beta, main Pandit Rameshwar Ji hoon, aapka swagat hai. Aaj aap kis vishay mein margdarshan chahte hain?"

RESPONSE STRUCTURE — only after the seeker shares a real concern:
1. Acknowledge what they shared with empathy (1 sentence, like a grandfather would speak)
2. Ask ONE focused follow-up question to understand their situation better — do NOT jump to remedies immediately
3. Only after gathering enough context (2–3 exchanges): give a Vedic astrological interpretation and remedy, offered as a traditional perspective for reflection, never as a certain prediction

RULES:
- MAXIMUM 5 sentences total — this is read aloud
- NEVER assume the seeker is troubled, stressed, or has a problem unless they say so
- NEVER mention planets, kundli, Shani, Rahu, dosha, remedies on a greeting or casual message
- NEVER recommend: LinkedIn, portfolio, resume, coding courses, skill upgrades, apps, or any generic career coaching
- NEVER give generic motivational advice like "stay positive", "believe in yourself", "work hard"
- For career problems → Shani / Rahu remedies, Hanuman Chalisa, mustard oil lamp, black sesame daan
- For relationship problems → Shiv-Parvati puja, Somvar fast, Om Namah Shivaya mantra
- For anxiety / stress → Gayatri Mantra, Mahamrityunjaya Mantra, Pranayam, Surya Arghya
- For financial problems → Lakshmi puja, Kubera mantra, feeding crows on Saturday
- Your guidance comes from: Bhagavad Gita, Vedas, Brihat Parashara Hora Shastra, Lal Kitab, temple traditions
- Never name any AI company, model or product, and never describe how you work internally
- Never use fear or guilt, never give certain predictions, and never say a paid ritual or remedy is required
- You are Pandit Rameshwar Ji, a wise, compassionate AI spiritual guide: warm, calm and honest`;

// ── Types ─────────────────────────────────────────────────────────────────────
type MicState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ConvEntry {
  role: "user" | "pandit";
  text: string;
  /** BCP 47 tag used for speech output of this entry (the language it was written in). */
  ttsLang: string;
  /** The language the entry was written in (sets the lang attribute, so the right font is used). */
  lang: LocaleCode;
}

interface AudioState {
  playingIdx: number | null;
  paused: boolean;
  progress: number;
  elapsed: number;
  duration: number;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const VC_CSS = `
.vc-root{display:flex;flex-direction:column;height:100%;overflow:hidden;}
.vc-topbar{flex-shrink:0;padding:7px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(89,34,9,0.2);background:#FBF5EC;}
.vc-topbar-title{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#301607;font-family:'DM Sans', system-ui, sans-serif;margin-right:auto;}
.vc-ctrl-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.05);border-radius:7px;color:rgba(48,22,7,0.75);font-size:12px;cursor:pointer;transition:all .2s;font-family:'DM Sans', system-ui, sans-serif;white-space:nowrap;}
.vc-ctrl-btn:hover{background:rgba(89,34,9,0.05);color:#301607;}
.vc-ctrl-btn.vc-muted{background:rgba(89,34,9,.08);border-color:rgba(89,34,9,.22);color:#6B4A37;}
.vc-history{flex:1;overflow-y:auto;padding:22px 16px;display:flex;flex-direction:column;gap:16px;}
.vc-history::-webkit-scrollbar{width:3px;}
.vc-history::-webkit-scrollbar-thumb{background:rgba(89,34,9,0.2);border-radius:2px;}
.vc-welcome{text-align:center;padding:44px 24px 24px;max-width:480px;margin:auto;}
.vc-welcome-om{font-size:58px;filter:drop-shadow(0 0 28px rgba(89,34,9,.5));margin-bottom:18px;line-height:1;}
.vc-welcome-text{font-size:17px;color:#301607;line-height:1.9;white-space:pre-line;font-family:'DM Sans', system-ui, sans-serif;}
.vc-msg{display:flex;gap:10px;animation:vc-in .3s ease-out;}
@keyframes vc-in{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:translateY(0);}}
.vc-msg-user{flex-direction:row-reverse;}
.vc-msg-av{width:32px;height:32px;min-width:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;margin-top:2px;flex-shrink:0;}
.vc-msg-pandit .vc-msg-av{background:linear-gradient(135deg,rgba(89,34,9,.45),rgba(89,34,9,.2));border:1.5px solid rgba(89,34,9,.3);}
.vc-msg-user .vc-msg-av{background:rgba(89,34,9,0.2);border:1.5px solid rgba(89,34,9,0.2);}
.vc-msg-body{max-width:85%;display:flex;flex-direction:column;gap:6px;}
.vc-msg-text{font-size:15px;line-height:1.78;padding:12px 16px;}
.vc-msg-pandit .vc-msg-text{background:#FBF5EC;border:1px solid rgba(89,34,9,0.05);border-radius:4px 14px 14px 14px;color:#301607;}
.vc-msg-user .vc-msg-text{background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.1);border-radius:14px 14px 4px 14px;color:#301607;}
/* Language dropdown row */
.vc-lang-row{display:flex;align-items:center;gap:7px;padding:2px 2px;}
.vc-lang-label{font-size:11px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;white-space:nowrap;}
.vc-lang-select{background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.1);border-radius:6px;color:#301607;font-size:12px;padding:4px 8px;cursor:pointer;outline:none;max-width:120px;}
.vc-lang-select:focus{border-color:rgba(89,34,9,.5);}
.vc-lang-loading{font-size:11px;color:#592209;font-style:italic;}
/* Audio card */
.vc-audio-card{background:#FBF5EC;border:1.5px solid rgba(89,34,9,.55);border-radius:12px;overflow:hidden;margin-top:2px;}
.vc-audio-lang-row{display:flex;align-items:center;gap:7px;padding:8px 14px 6px;border-bottom:1px solid rgba(89,34,9,0.2);}
.vc-audio-wave{display:flex;gap:2px;align-items:center;height:40px;padding:4px 14px;background:rgba(89,34,9,0.07);}
.vc-wave-bar{flex:1;background:rgba(89,34,9,.4);border-radius:2px;transform:scaleY(0.3);transform-origin:center;}
.vc-wave-bar.vc-wave-on{animation:vc-wv .7s ease-in-out infinite;background:#592209;}
@keyframes vc-wv{0%,100%{transform:scaleY(0.2);}50%{transform:scaleY(1);}}
.vc-audio-prog-row{display:flex;align-items:center;gap:8px;padding:6px 14px 4px;}
.vc-audio-time{font-size:11px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;min-width:34px;}
.vc-audio-track{flex:1;height:4px;background:rgba(89,34,9,0.2);border-radius:2px;position:relative;}
.vc-audio-fill{height:100%;background:linear-gradient(90deg,#592209,#592209);border-radius:2px;position:relative;transition:width .1s linear;}
.vc-audio-thumb{width:10px;height:10px;background:#592209;border-radius:50%;position:absolute;right:-5px;top:-3px;box-shadow:0 0 8px rgba(89,34,9,.9);}
.vc-audio-btns{display:flex;gap:6px;padding:8px 12px 10px;flex-wrap:wrap;}
.vc-ab{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;transition:all .18s;font-family:'DM Sans', system-ui, sans-serif;border:1.5px solid;white-space:nowrap;}
.vc-ab-play{background:rgba(89,34,9,.2);border-color:rgba(89,34,9,.6);color:#592209;}
.vc-ab-play:hover{background:rgba(89,34,9,0.08);}
.vc-ab-pause{background:rgba(89,34,9,.2);border-color:rgba(89,34,9,.6);color:#592209;}
.vc-ab-stop{background:rgba(89,34,9,0.05);border-color:rgba(89,34,9,0.1);color:#301607;}
.vc-ab-stop:hover{background:rgba(89,34,9,0.08);}
.vc-ab-replay{background:rgba(89,34,9,.15);border-color:rgba(89,34,9,.5);color:#592209;}
.vc-ab-replay:hover{background:rgba(89,34,9,0.08);}
/* Mic area */
.vc-mic-area{flex-shrink:0;padding:18px 24px 26px;display:flex;flex-direction:column;align-items:center;gap:11px;border-top:1px solid rgba(89,34,9,0.2);background:#FBF5EC;}
.vc-mic-ring{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;user-select:none;transition:background .3s,border-color .3s,box-shadow .3s;}
.vc-mic-ring:not(.vc-mic-processing):active{transform:scale(.94);}
.vc-mic-idle{background:rgba(89,34,9,.07);border:2px solid rgba(89,34,9,.38);box-shadow:0 0 20px rgba(89,34,9,.14);}
.vc-mic-idle:hover{background:rgba(89,34,9,0.08);box-shadow:0 0 34px rgba(89,34,9,0.08);}
.vc-mic-listening{background:rgba(89,34,9,.1);border:2px solid rgba(89,34,9,.55);animation:vc-pr 1s ease-in-out infinite;}
.vc-mic-processing{background:rgba(89,34,9,.08);border:2px solid rgba(89,34,9,.5);animation:vc-pp 1.6s ease-in-out infinite;cursor:default;}
.vc-mic-speaking{background:rgba(89,34,9,.08);border:2px solid rgba(89,34,9,.45);animation:vc-pt 1.2s ease-in-out infinite;}
.vc-mic-error{background:rgba(248,113,113,.08);border:2px solid rgba(248,113,113,.38);cursor:default;}
@keyframes vc-pr{0%,100%{box-shadow:0 0 20px rgba(89,34,9,.28);}50%{box-shadow:0 0 52px rgba(89,34,9,.65),0 0 90px rgba(89,34,9,.18);}}
@keyframes vc-pp{0%,100%{box-shadow:0 0 20px rgba(89,34,9,.22);}50%{box-shadow:0 0 52px rgba(89,34,9,.5),0 0 90px rgba(89,34,9,.12);}}
@keyframes vc-pt{0%,100%{box-shadow:0 0 20px rgba(89,34,9,.22);}50%{box-shadow:0 0 52px rgba(89,34,9,.5),0 0 90px rgba(89,34,9,.12);}}
.vc-mic-icon{font-size:34px;line-height:1;}
.vc-mic-label{font-size:13px;letter-spacing:.3px;text-align:center;transition:color .3s;font-family:'DM Sans', system-ui, sans-serif;min-height:18px;}
.vc-transcript-box{max-width:460px;width:100%;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.05);border-radius:10px;padding:9px 15px;font-size:14px;color:rgba(48,22,7,0.75);text-align:center;font-style:italic;line-height:1.6;}
.vc-speak-bars{display:flex;gap:4px;align-items:center;height:20px;}
.vc-sp-bar{width:3px;border-radius:3px;background:#FBF5EC;animation:vc-sb .8s ease-in-out infinite;}
.vc-sp-bar:nth-child(1){height:6px;animation-delay:0s;}
.vc-sp-bar:nth-child(2){height:13px;animation-delay:.11s;}
.vc-sp-bar:nth-child(3){height:20px;animation-delay:.22s;}
.vc-sp-bar:nth-child(4){height:13px;animation-delay:.33s;}
.vc-sp-bar:nth-child(5){height:6px;animation-delay:.44s;}
@keyframes vc-sb{0%,100%{transform:scaleY(.3);opacity:.45;}50%{transform:scaleY(1);opacity:1;}}
`;

/** Additions for the language selector row, the typed-message box, the typing indicator and the error state. */
const VC_CSS_EXTRA = `
.vc-topbar{flex-wrap:wrap;}
.vc-language-control{flex-shrink:0;}
.vc-lang-full{width:100%;order:1;}
.vc-topbar-title{order:0;}
.vc-topbar .vc-ctrl-btn{order:2;}
.vc-form{display:flex;gap:8px;width:100%;max-width:460px;}
.vc-input{flex:1;min-width:0;padding:10px 14px;border-radius:10px;border:1px solid rgba(89,34,9,0.3);background:#fff;color:#301607;font-size:15px;outline:none;}
.vc-input:focus{border-color:#592209;box-shadow:0 0 0 3px rgba(229,138,69,0.2);}
.vc-input:disabled{opacity:.6;}
.vc-send{padding:10px 16px;border-radius:10px;border:1px solid rgba(89,34,9,.6);background:#592209;color:#F5E9D6;font-size:14px;font-weight:600;cursor:pointer;}
.vc-send:disabled{opacity:.45;cursor:default;}
.vc-typing{display:flex;align-items:center;gap:5px;padding:12px 16px;background:#FBF5EC;border:1px solid rgba(89,34,9,0.1);border-radius:4px 14px 14px 14px;color:#6B4A37;font-size:13px;font-style:italic;}
.vc-dot{width:6px;height:6px;border-radius:50%;background:#592209;animation:vc-dot 0.9s ease-in-out infinite;}
.vc-dot:nth-child(3){animation-delay:.15s;}
.vc-dot:nth-child(4){animation-delay:.3s;}
@keyframes vc-dot{0%,100%{opacity:.3;transform:translateY(0);}50%{opacity:1;transform:translateY(-3px);}}
.vc-error{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:12px 16px;background:#FBF5EC;border:1px solid rgba(155,44,29,0.35);border-radius:4px 14px 14px 14px;color:#7A2417;font-size:14px;}
.vc-retry{padding:6px 14px;border-radius:999px;border:1px solid rgba(89,34,9,.5);background:#fff;color:#592209;font-size:13px;font-weight:600;cursor:pointer;}
.vc-retry:hover{background:#F5E9D6;}
.vc-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px;}
.vc-chips-label{width:100%;font-size:12px;color:#6B4A37;}
.vc-chip{padding:7px 13px;border-radius:999px;border:1px solid rgba(89,34,9,.3);background:#fff;color:#301607;font-size:13px;cursor:pointer;text-align:left;}
.vc-chip:hover{border-color:#E58A45;background:#F5E9D6;}
.vc-notice{max-width:460px;text-align:center;font-size:12px;color:#6B4A37;}
.vc-msg-text{overflow-wrap:anywhere;white-space:pre-line;}
/* This screen's own rules name DM Sans directly, which would override the Indic font of the chosen language. */
html[data-indic] .vc-root,html[data-indic] .vc-root *{font-family:var(--indic-sans),'DM Sans',system-ui,sans-serif;}
.vc-mic-area{padding:12px 20px 14px;gap:8px;}
.vc-mic-ring{width:72px;height:72px;}
.vc-mic-icon{font-size:28px;}
@media (max-width:640px){.vc-topbar-title{margin-right:0;}.vc-mic-area{padding:14px 14px 20px;}.vc-msg-body{max-width:90%;}}
`;

const WAVE_HEIGHTS = [
  0.35,0.55,0.80,0.65,0.90,0.50,1.00,0.70,0.45,0.85,
  0.60,0.95,0.40,0.75,0.55,0.88,0.45,0.70,0.60,0.38,
];

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,"0")}:${String(Math.floor(s%60)).padStart(2,"0")}`;
}
function estimateDuration(text: string) {
  return Math.max((text.replace(/\s+/g," ").length / 5) / (130 / 60), 2);
}

/** Chrome writes Punjabi (Gurmukhi) speech as pa-Guru-IN; the other nine are language-IN. */
const speechTag = (code: LocaleCode): string => (code === "pa" ? "pa-Guru-IN" : localeInfo(code).tag);
const ttsTag = (code: LocaleCode): string => localeInfo(code).tag;
const nativeNameForTag = (tag: string): string => LOCALES.find((l) => l.tag === tag)?.native ?? tag;

/** True on a narrow phone screen, where the language selector gets its own full-width row. */
function useNarrow(): boolean {
  const query = "(max-width: 640px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query)?.matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceConsultation() {
  // The ONE language preference of the whole site. There is no language state of its own here: the selector below is the shared one,
  // and this component only reads it.
  const { t, i18n } = useTranslation();
  const lang: LocaleCode = isLocale(i18n.language) ? i18n.language : "en";
  const narrow = useNarrow();

  const [micState, setMicState]       = useState<MicState>("idle");
  const [transcript, setTranscript]   = useState("");
  const [conversation, setConversation] = useState<ConvEntry[]>([]);
  const [errorMsg, setErrorMsg]       = useState("");
  const [notice, setNotice]           = useState("");
  const [input, setInput]             = useState("");
  /** The message whose reply failed, shown with a Retry button. The message itself is already in the conversation. */
  const [failure, setFailure]         = useState<{ text: string; message: string } | null>(null);
  const [audio, setAudio]             = useState<AudioState>({
    playingIdx: null, paused: false, progress: 0, elapsed: 0, duration: 0,
  });

  const transcriptRef  = useRef("");
  const abortRef       = useRef(false);
  const busyRef        = useRef(false); // one message at a time: blocks a double tap, a double Enter, and mic + typing at once
  const historyRef     = useRef<HTMLDivElement>(null);
  const audioTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStartRef  = useRef(0);
  const audioPauseElRef = useRef(0);
  const inputRef       = useRef<HTMLInputElement>(null);
  const convRef        = useRef<ConvEntry[]>([]);
  const rootRef        = useRef<HTMLDivElement>(null);

  const tts = useTextToSpeech();
  const { isAllowedTopic, getRejectionMessage } = useConsultationGuard();

  const pushEntry = (entry: ConvEntry): number => {
    convRef.current = [...convRef.current, entry];
    setConversation(convRef.current);
    return convRef.current.length - 1;
  };

  // The page around this screen is taller than the window (the site adds 32px of top padding to a full-height page), which cut off
  // the microphone. Fit the screen to what is actually visible, now and whenever the window or its toolbars change size.
  useLayoutEffect(() => {
    const fit = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const visible = Math.max(360, window.innerHeight - top);
      const room = el.parentElement?.clientHeight ?? 0;
      el.style.height = `${room > 0 ? Math.min(room, visible) : visible}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    // The page header above this screen changes height after load (for example when a Guru profile is assigned), which moves this
    // screen down. Its container shrinks when that happens, so watching the container keeps the fit correct.
    const parent = rootRef.current?.parentElement;
    const watcher = typeof ResizeObserver !== "undefined" && parent ? new ResizeObserver(fit) : null;
    if (watcher && parent) watcher.observe(parent);
    return () => { window.removeEventListener("resize", fit); window.removeEventListener("orientationchange", fit); watcher?.disconnect(); };
  }, []);

  // CSS injection
  useEffect(() => {
    const id = "vc-style-tag";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = VC_CSS + VC_CSS_EXTRA;
      document.head.appendChild(s);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    historyRef.current?.scrollTo?.({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, micState, failure]);

  // ── Audio helpers ─────────────────────────────────────────────────────────
  const clearAudioTimer = useCallback(() => {
    if (audioTimerRef.current) { clearInterval(audioTimerRef.current); audioTimerRef.current = null; }
  }, []);

  const mutedRef = useRef(tts.muted);
  useEffect(() => { mutedRef.current = tts.muted; }, [tts.muted]);

  const speakWithControls = useCallback((
    idx: number, text: string, ttsLang: string, onDone?: () => void
  ) => {
    clearAudioTimer();
    if (_sarvamAudio) { _sarvamAudio.pause(); _sarvamAudio = null; }

    const dur = estimateDuration(text);
    audioPauseElRef.current = 0;
    audioStartRef.current = Date.now();
    setAudio({ playingIdx: idx, paused: false, progress: 0, elapsed: 0, duration: dur });

    if (mutedRef.current) {
      setTimeout(() => {
        setAudio((a) => ({ ...a, playingIdx: null, paused: false, progress: 100, elapsed: dur }));
        onDone?.();
      }, 300);
      return;
    }

    console.log("[TTS] Invoking Sarvam AI — speaker: manan, lang:", ttsLang);
    speakSarvam(
      text,
      ttsLang,
      (current, total) => {
        setAudio((a) => ({
          ...a, elapsed: current,
          progress: Math.min((current / total) * 100, 99),
          duration: total,
        }));
      },
      () => {
        clearAudioTimer();
        setAudio((a) => ({ ...a, playingIdx: null, paused: false, progress: 100 }));
        onDone?.();
      }
    ).then((result) => {
      if (result === "error") {
        console.error("[TTS] Sarvam TTS failed — no fallback voice used.");
        setAudio((a) => ({ ...a, playingIdx: null, paused: false }));
        // The text reply stays on screen; the visitor is told, in their language, that no voice was played.
        setNotice(t("voice.ttsUnavailable", { language: nativeNameForTag(ttsLang) }));
        onDone?.();
      }
    });
  }, [clearAudioTimer, t]);

  const pauseAudio = useCallback(() => {
    if (_sarvamAudio && !_sarvamAudio.paused) _sarvamAudio.pause();
    clearAudioTimer();
    audioPauseElRef.current += (Date.now() - audioStartRef.current) / 1000;
    setAudio((a) => ({ ...a, paused: true }));
  }, [clearAudioTimer]);

  const resumeAudio = useCallback((idx: number, text: string, ttsLang: string) => {
    if (_sarvamAudio && _sarvamAudio.paused) {
      _sarvamAudio.play();
      audioStartRef.current = Date.now();
      const dur = _sarvamAudio.duration || estimateDuration(text);
      audioTimerRef.current = setInterval(() => {
        const el = _sarvamAudio ? _sarvamAudio.currentTime : 0;
        setAudio((a) => ({ ...a, elapsed: el, progress: Math.min((el / dur) * 100, 99) }));
      }, 80);
      setAudio((a) => ({ ...a, paused: false }));
    } else {
      // Re-request from Sarvam if audio element is gone
      speakWithControls(idx, text, ttsLang);
    }
  }, [speakWithControls]);

  const stopAudio = useCallback(() => {
    if (_sarvamAudio) { _sarvamAudio.pause(); _sarvamAudio = null; }
    clearAudioTimer();
    audioPauseElRef.current = 0;
    setAudio({ playingIdx: null, paused: false, progress: 0, elapsed: 0, duration: 0 });
  }, [clearAudioTimer]);

  // ── Speech recognition (in the chosen language) ─────────────────────────────────────────────────────────────────────
  const { start, stop, supported } = useSpeechRecognition({
    lang: speechTag(lang),
    onResult: (text) => {
      setTranscript(text);
      transcriptRef.current = text;
    },
    onEnd: () => {
      const text = transcriptRef.current.trim();
      transcriptRef.current = "";
      setTranscript("");
      if (!text) { setMicState((s) => (s === "listening" ? "idle" : s)); return; }
      void submit(text);
    },
    onError: (err) => {
      // The browser may not know this language: say so and keep the typed chat working.
      if (err === "language-not-supported") {
        setNotice(t("voice.speechLanguage", { language: localeInfo(lang).native }));
        setMicState("idle");
        return;
      }
      const msg = err === "no-speech" ? t("voice.noSpeech") : t("voice.micError");
      setErrorMsg(msg);
      setMicState("error");
      setTimeout(() => { setMicState("idle"); setErrorMsg(""); }, 3500);
    },
  });

  // ── Main handler: one typed or spoken message ───────────────────────────────────────────────────────────────────────
  async function submit(raw: string, retry = false) {
    const text = raw.trim();
    if (!text || abortRef.current || busyRef.current) return; // never two at once, never an empty or duplicate submit
    busyRef.current = true;
    try {
      setFailure(null);
      setNotice("");

      // Read the shared i18next state; an explicit language request is a preference change, not a chat topic.
      let chosen: LocaleCode = isLocale(i18n.language) ? i18n.language : "en";
      const asked = retry ? null : detectLanguageRequest(text);
      if (asked) {
        if (asked !== chosen && !(await setLanguage(asked))) {
          pushEntry({ role: "user", text, ttsLang: ttsTag(chosen), lang: chosen });
          setNotice(i18n.t("language.loadFailed", { lng: chosen }));
          setMicState("idle");
          return;
        }
        chosen = asked;
        pushEntry({ role: "user", text, ttsLang: ttsTag(chosen), lang: chosen });
        const confirmation = i18n.t("voice.languageChanged", {
          lng: chosen,
          language: localeInfo(chosen).native,
        });
        const idx = pushEntry({ role: "pandit", text: confirmation, ttsLang: ttsTag(chosen), lang: chosen });
        setMicState("speaking");
        speakWithControls(idx, confirmation, ttsTag(chosen), () => { if (!abortRef.current) setMicState("idle"); });
        return;
      }

      if (!retry) pushEntry({ role: "user", text, ttsLang: ttsTag(chosen), lang: chosen });

      if (!isAllowedTopic(text)) {
        const rejection = getRejectionMessage();
        const idx = pushEntry({ role: "pandit", text: rejection, ttsLang: ttsTag(chosen), lang: chosen });
        setMicState("speaking");
        speakWithControls(idx, rejection, ttsTag(chosen), () => { if (!abortRef.current) setMicState("idle"); });
        return;
      }

      setMicState("processing");
      const history = convRef.current.map((e) => ({
        role: e.role === "user" ? ("user" as const) : ("assistant" as const),
        content: e.text,
      }));
      const reply = await askPandit(history, chosen, VOICE_SYSTEM_PROMPT);
      if (abortRef.current) return;
      const idx = pushEntry({ role: "pandit", text: reply, ttsLang: ttsTag(chosen), lang: chosen });
      setMicState("speaking");
      speakWithControls(idx, reply, ttsTag(chosen), () => { if (!abortRef.current) setMicState("idle"); });
    } catch (e) {
      if (abortRef.current) return;
      // A failure is shown as a failure, with Retry. It is never replaced by a made-up reply or the welcome text.
      setFailure({ text, message: e instanceof VoiceChatError ? e.message : t("voice.replyFailed") });
      setMicState("idle");
    } finally {
      busyRef.current = false;
    }
  }

  // ── Mic controls ──────────────────────────────────────────────────────────
  const handleMicClick = () => {
    if (!supported) {
      // Typing still works; only the microphone is unavailable.
      setNotice(t("voice.speechUnsupported"));
      return;
    }
    if (micState === "processing") return;
    if (micState === "speaking") { stopAudio(); setMicState("idle"); return; }
    if (micState === "listening") { stop(); return; }
    abortRef.current = false;
    transcriptRef.current = "";
    setTranscript("");
    setErrorMsg("");
    setNotice("");
    start();
    setMicState("listening");
  };

  const newSession = () => {
    abortRef.current = true;
    stopAudio();
    stop();
    convRef.current = [];
    setConversation([]);
    setFailure(null);
    setNotice("");
    setInput("");
    transcriptRef.current = "";
    setTranscript("");
    setMicState("idle");
    setErrorMsg("");
    setTimeout(() => { abortRef.current = false; busyRef.current = false; }, 60);
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input;
    if (!v.trim() || micState === "processing" || busyRef.current) return;
    setInput("");
    void submit(v);
  };

  // ── Display ───────────────────────────────────────────────────────────────
  const MIC_ICONS: Record<MicState, string> = {
    idle: "🎤", listening: "🔴", processing: "🔮", speaking: "🕉️", error: "⚠️",
  };
  const MIC_COLORS: Record<MicState, string> = {
    idle: "rgba(89,34,9,.75)", listening: "#fda4af",
    processing: "#592209", speaking: "#592209", error: "#f87171",
  };
  const micLabel =
    micState === "error"      ? (errorMsg || `⚠️ ${t("voice.micTryAgain")}`) :
    micState === "idle"       ? `🎤 ${t("voice.micIdle")}` :
    micState === "listening"  ? `🌟 ${t("voice.micListening")}` :
    micState === "processing" ? `🔮 ${t("voice.micProcessing")}` :
    `🕉️ ${t("voice.micSpeaking")}`;

  const processing = micState === "processing";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="vc-root" ref={rootRef}>
      <div className="vc-topbar">
        <span className="vc-topbar-title">{t("voice.title")}</span>
        <div className={narrow ? "vc-lang-full" : "vc-language-control"}>
          <LanguageSelector variant={narrow ? "mobile" : "desktop"} />
        </div>
        <button className={`vc-ctrl-btn${tts.muted ? " vc-muted" : ""}`} onClick={tts.toggleMute}>
          {tts.muted ? `🔇 ${t("voice.unmute")}` : `🔊 ${t("voice.voiceOn")}`}
        </button>
        {micState === "listening" && (
          <button className="vc-ctrl-btn" onClick={() => stop()}>⏹ {t("voice.stop")}</button>
        )}
        {micState === "speaking" && (
          <button className="vc-ctrl-btn" onClick={() => { stopAudio(); setMicState("idle"); }}>⏹ {t("voice.stop")}</button>
        )}
        {conversation.length > 0 && (
          <button className="vc-ctrl-btn" onClick={newSession}>🔄 {t("voice.newSession")}</button>
        )}
      </div>

      <div className="vc-history" ref={historyRef} role="log" aria-live="polite">
        {conversation.length === 0 ? (
          <div className="vc-welcome">
            <div className="vc-welcome-om">🕉️</div>
            <div className="vc-welcome-text" data-testid="vc-welcome">{t("voice.welcome")}</div>
            <div className="vc-chips">
              <span className="vc-chips-label">{t("voice.startWith")}</span>
              {(["s1", "s2", "s3"] as const).map((k) => (
                <button key={k} type="button" className="vc-chip" onClick={() => { setInput(t(`voice.${k}`)); inputRef.current?.focus(); }}>
                  {t(`voice.${k}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversation.map((entry, i) => (
            <div key={i} className={`vc-msg vc-msg-${entry.role}`}>
              <div className="vc-msg-av">{entry.role === "user" ? "🙏" : "🧘"}</div>
              <div className="vc-msg-body">
                <div className="vc-msg-text" lang={localeInfo(entry.lang).tag.split("-")[0]}>{entry.text}</div>
                {entry.role === "pandit" && (
                  <AudioPlayer
                    idx={i}
                    entry={entry}
                    audio={audio}
                    onPlay={(text, l) => speakWithControls(i, text, l)}
                    onPause={pauseAudio}
                    onResume={(text, l) => resumeAudio(i, text, l)}
                    onStop={stopAudio}
                    onReplay={(text, l) => speakWithControls(i, text, l)}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {processing && (
          <div className="vc-msg vc-msg-pandit" role="status" data-testid="vc-typing">
            <div className="vc-msg-av">🧘</div>
            <div className="vc-msg-body">
              <div className="vc-typing"><span>{t("voice.typing")}</span><i className="vc-dot" /><i className="vc-dot" /><i className="vc-dot" /></div>
            </div>
          </div>
        )}

        {failure && (
          <div className="vc-msg vc-msg-pandit" data-testid="vc-failure">
            <div className="vc-msg-av">🧘</div>
            <div className="vc-msg-body">
              <div className="vc-error" role="alert">
                <span>{failure.message}</span>
                <button type="button" className="vc-retry" onClick={() => void submit(failure.text, true)}>{t("common.retry")}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="vc-mic-area">
        {micState === "speaking" && (
          <div className="vc-speak-bars">
            {[1,2,3,4,5].map((n) => <div key={n} className="vc-sp-bar" />)}
          </div>
        )}
        {transcript && micState === "listening" && (
          <div className="vc-transcript-box">{transcript}</div>
        )}
        {notice && <div className="vc-notice" role="status" data-testid="vc-notice">{notice}</div>}
        <form className="vc-form" onSubmit={onSubmitForm}>
          <input
            ref={inputRef}
            className="vc-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("voice.inputPlaceholder")}
            aria-label={t("voice.inputLabel")}
            maxLength={500}
            disabled={processing}
            autoComplete="off"
          />
          <button type="submit" className="vc-send" disabled={!input.trim() || processing}>{t("voice.send")}</button>
        </form>
        <div
          className={`vc-mic-ring vc-mic-${micState}`}
          onClick={handleMicClick}
          role="button"
          aria-label={micLabel}
        >
          <span className="vc-mic-icon">{MIC_ICONS[micState]}</span>
        </div>
        <div className="vc-mic-label" style={{ color: MIC_COLORS[micState] }}>{micLabel}</div>
      </div>
    </div>
  );
}

// ── AudioPlayer ───────────────────────────────────────────────────────────────
interface AudioPlayerProps {
  idx: number;
  entry: ConvEntry;
  audio: AudioState;
  onPlay: (text: string, ttsLang: string) => void;
  onPause: () => void;
  onResume: (text: string, ttsLang: string) => void;
  onStop: () => void;
  onReplay: (text: string, ttsLang: string) => void;
}

function AudioPlayer({ idx, entry, audio, onPlay, onPause, onResume, onStop, onReplay }: AudioPlayerProps) {
  const { t } = useTranslation();
  const isThisActive = audio.playingIdx === idx;
  const isPlaying    = isThisActive && !audio.paused;
  const isPaused     = isThisActive && audio.paused;

  const audioText    = entry.text;
  const audioTtsLang = entry.ttsLang;

  const progress = isThisActive ? audio.progress : 0;
  const elapsed  = isThisActive ? audio.elapsed  : 0;
  const duration = isThisActive ? audio.duration : estimateDuration(entry.text);

  return (
    <div className="vc-audio-card">
      {/* Waveform */}
      <div className="vc-audio-wave">
        {WAVE_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`vc-wave-bar${isPlaying ? " vc-wave-on" : ""}`}
            style={{
              transform: `scaleY(${isPlaying ? h : h * 0.35})`,
              animationDelay: `${(i * 71) % 700}ms`,
              animationDuration: `${0.45 + (i % 4) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Progress */}
      <div className="vc-audio-prog-row">
        <span className="vc-audio-time">{fmtSec(elapsed)}</span>
        <div className="vc-audio-track">
          <div className="vc-audio-fill" style={{ width: `${progress}%` }}>
            {isThisActive && <div className="vc-audio-thumb" />}
          </div>
        </div>
        <span className="vc-audio-time">{fmtSec(duration)}</span>
      </div>

      {/* Controls */}
      <div className="vc-audio-btns">
        {!isThisActive && (
          <button className="vc-ab vc-ab-play" onClick={() => onPlay(audioText, audioTtsLang)}>
            ▶ {t("voice.play")}
          </button>
        )}
        {isPlaying && (
          <button className="vc-ab vc-ab-pause" onClick={onPause}>⏸ {t("voice.pause")}</button>
        )}
        {isPaused && (
          <button className="vc-ab vc-ab-play" onClick={() => onResume(audioText, audioTtsLang)}>
            ▶ {t("voice.resume")}
          </button>
        )}
        {isThisActive && (
          <button className="vc-ab vc-ab-stop" onClick={onStop}>⏹ {t("voice.stop")}</button>
        )}
        <button className="vc-ab vc-ab-replay" onClick={() => onReplay(audioText, audioTtsLang)}>
          🔁 {t("voice.replay")}
        </button>
      </div>
    </div>
  );
}
