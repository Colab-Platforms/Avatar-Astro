import { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { useLanguageDetection, type Language } from "../hooks/useLanguageDetection";
import { useConsultationGuard } from "../hooks/useConsultationGuard";
import { API_BASE_URL } from "@/lib/api";

// ── API ──────────────────────────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "openai/gpt-oss-120b";

// Sarvam AI TTS — routed through /api/tts serverless function (no CORS issues).
export const TTS_PROVIDER = "sarvam" as const;

// ── Transliteration ──────────────────────────────────────────────────────────
const DEVA_WORDS: Record<string, string> = {
  "मुझे":"mujhe","मेरा":"mera","मेरी":"meri","मेरे":"mere","मैं":"main",
  "आप":"aap","हूं":"hoon","हूँ":"hoon","है":"hai","हैं":"hain",
  "था":"tha","थी":"thi","थे":"the","हो":"ho","होगा":"hoga","होगी":"hogi",
  "नहीं":"nahi","क्या":"kya","क्यों":"kyun","कैसे":"kaise","कब":"kab",
  "कहाँ":"kahan","कितना":"kitna","और":"aur","लेकिन":"lekin","क्योंकि":"kyunki",
  "तो":"toh","पर":"par","में":"mein","से":"se","को":"ko","का":"ka","की":"ki","के":"ke",
  "भी":"bhi","बहुत":"bahut","थोड़ा":"thoda","ज्यादा":"zyada","सिर्फ":"sirf",
  "अभी":"abhi","पहले":"pehle","बाद":"baad","फिर":"phir","अगर":"agar",
  "जब":"jab","हाँ":"haan","ठीक":"theek","सही":"sahi","अच्छा":"achha",
  "नौकरी":"naukri","पैसा":"paisa","रिश्ता":"rishta","विवाह":"vivah",
  "परिवार":"parivar","स्वास्थ्य":"swasthya","तनाव":"tanav","घर":"ghar",
  "प्यार":"pyaar","शादी":"shaadi","जिंदगी":"zindagi","काम":"kaam",
  "करियर":"career","जॉब":"job","प्रॉब्लम":"problem","समझ":"samajh",
  "पंडित":"Pandit","जी":"ji","आपके":"aapke",
  "दोस्त":"dost","भाई":"bhai","बहन":"behen","माँ":"maa","बाप":"baap",
  "बच्चा":"bachcha","चिंता":"chinta","डर":"darr","खुश":"khush",
  "दुखी":"dukhi","प्रेम":"prem","सोचना":"sochna",
  "मिलता":"milta","रहना":"rehna","भविष्य":"bhavishy","शांति":"shanti",
  "जीवन":"jeevan","आध्यात्म":"adhyatm","कर्म":"karma","मन":"mann",
  "धर्म":"dharm","ईश्वर":"ishwar",
};
const DEVA_CHARS: Record<string, string> = {
  "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ng",
  "च":"ch","छ":"chh","ज":"j","झ":"jh","ञ":"ny",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n",
  "त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"ph","ब":"b","भ":"bh","म":"m",
  "य":"y","र":"r","ल":"l","व":"v","श":"sh",
  "ष":"sh","स":"s","ह":"h","ळ":"l",
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ऋ":"ri",
  "ए":"e","ऐ":"ai","ओ":"o","औ":"au",
  "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo",
  "े":"e","ै":"ai","ो":"o","ौ":"au",
  "ं":"n","ः":"h","ँ":"n","्":"",
  "।":"."," ॥":".",
  "०":"0","१":"1","२":"2","३":"3","४":"4",
  "५":"5","६":"6","७":"7","८":"8","९":"9",
};
function transliterateToRoman(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  let result = text;
  for (const [key, val] of Object.entries(DEVA_WORDS))
    result = result.replace(new RegExp(key, "g"), val);
  result = result.replace(/[ऀ-ॿ]+/g, (m) =>
    m.split("").map((c) => DEVA_CHARS[c] ?? "").join("")
  );
  return result.replace(/\s{2,}/g, " ").trim();
}

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
    const res = await fetch(`${API_BASE_URL}/tts`, {
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

// ── Translation helper ────────────────────────────────────────────────────────
async function translateText(text: string, targetLang: Language): Promise<string> {
  const instruction =
    targetLang === "english"
      ? "Translate the following to natural Indian English. Preserve the spiritual, warm, compassionate tone. Output ONLY the translation, no explanation."
      : targetLang === "hindi"
      ? "Translate the following to natural Hindi written entirely in Roman letters — absolutely NO Devanagari script. Preserve the spiritual tone. Output ONLY the translation."
      : "Translate the following to natural Hinglish — Hindi words in Roman letters mixed with English, as spoken in urban India. Preserve the spiritual tone. Output ONLY the translation.";
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: text },
        ],
      }),
    });
    const data = await res.json();
    return transliterateToRoman((data.choices?.[0]?.message?.content || "").trim()) || text;
  } catch {
    return text;
  }
}

// ── System Prompt ─────────────────────────────────────────────────────────────
const VOICE_SYSTEM_PROMPT = `You are Pandit Rameshwar Ji, a revered Jyotish Acharya and Vedic astrologer with 40 years of experience in temples, Vedic scriptures, and spiritual healing. A seeker is speaking to you live and your words will be read aloud.

You ONLY discuss: career, job, business, relationships, marriage, family, health, finances, stress, anxiety, spirituality, karma, life purpose, emotional struggles, inner peace, future guidance. Politely refuse every other topic.

LANGUAGE RULE — always match the seeker's style exactly:
- If they used Roman Hindi / Hinglish words (meri, nahi, bahut, karo, etc.) → respond in Hinglish
- If they spoke English → respond in English
- Never use Devanagari script in your response — always write in Roman letters

YOUR IDENTITY:
You are an experienced Indian astrologer — like a Jyotish Acharya, temple priest, or Vedic guru. You speak with calm authority, deep warmth, and spiritual wisdom. You sound like a real Pandit Ji on a phone consultation — never a chatbot or life coach.

CRITICAL — GREETING RULE (highest priority):
If the seeker says ONLY a greeting (hello, hi, namaste, namaskaar, hey, good morning, good evening, good night, how are you, or similar) with NO other concern shared:
- Respond with ONLY a warm welcome and ONE question asking how you can help.
- Maximum 2 sentences. Do NOT mention any planet, kundli, Shani, Rahu, dosha, remedy, puja, or emotional state.
- Do NOT assume they have a problem, stress, or any issue.
- Example: "Namaste beta, main Pandit Rameshwar Ji hoon, aapka swagat hai. Aaj aap kis vishay mein margdarshan chahte hain?"

RESPONSE STRUCTURE — only after the seeker shares a real concern:
1. Acknowledge what they shared with empathy (1 sentence, like a grandfather would speak)
2. Ask ONE focused follow-up question to understand their situation better — do NOT jump to remedies immediately
3. Only after gathering enough context (2–3 exchanges): give a Vedic astrological interpretation and remedy

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
- Never mention AI, ChatGPT, OpenAI, or any technology
- Never say you are artificial, a bot, or a program
- You are Pandit Rameshwar Ji — a real, wise, compassionate human Vedic astrologer`;

// ── Types ─────────────────────────────────────────────────────────────────────
type MicState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ConvEntry {
  role: "user" | "pandit";
  text: string;          // original text in detectedLang
  ttsLang: string;       // TTS lang for original
  detectedLang: Language;
  translations: Partial<Record<Language, string>>; // translation cache
  displayLang: Language; // language shown in text bubble
  audioLang: Language;   // language used for playback
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
.vc-topbar{flex-shrink:0;padding:7px 20px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(10,10,15,.55);}
.vc-topbar-title{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.25);font-family:'Astra','Iceland',sans-serif;margin-right:auto;}
.vc-ctrl-btn{display:flex;align-items:center;gap:5px;padding:5px 11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:rgba(255,255,255,.6);font-size:12px;cursor:pointer;transition:all .2s;font-family:'Astra','Iceland',sans-serif;white-space:nowrap;}
.vc-ctrl-btn:hover{background:rgba(255,255,255,.1);color:#fff;}
.vc-ctrl-btn.vc-muted{background:rgba(188,106,77,.08);border-color:rgba(188,106,77,.22);color:#fda4af;}
.vc-history{flex:1;overflow-y:auto;padding:22px 16px;display:flex;flex-direction:column;gap:16px;}
.vc-history::-webkit-scrollbar{width:3px;}
.vc-history::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
.vc-welcome{text-align:center;padding:44px 24px 24px;max-width:480px;margin:auto;}
.vc-welcome-om{font-size:58px;filter:drop-shadow(0 0 28px rgba(188,106,77,.5));margin-bottom:18px;line-height:1;}
.vc-welcome-text{font-size:17px;color:rgba(255,255,255,.62);line-height:1.9;white-space:pre-line;font-family:'Astra','Iceland',sans-serif;}
.vc-msg{display:flex;gap:10px;animation:vc-in .3s ease-out;}
@keyframes vc-in{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:translateY(0);}}
.vc-msg-user{flex-direction:row-reverse;}
.vc-msg-av{width:32px;height:32px;min-width:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;margin-top:2px;flex-shrink:0;}
.vc-msg-pandit .vc-msg-av{background:linear-gradient(135deg,rgba(188,106,77,.45),rgba(188,106,77,.2));border:1.5px solid rgba(188,106,77,.3);}
.vc-msg-user .vc-msg-av{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.14);}
.vc-msg-body{max-width:85%;display:flex;flex-direction:column;gap:6px;}
.vc-msg-text{font-size:15px;line-height:1.78;padding:12px 16px;}
.vc-msg-pandit .vc-msg-text{background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:4px 14px 14px 14px;color:#e8e8e8;}
.vc-msg-user .vc-msg-text{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);border-radius:14px 14px 4px 14px;color:#fff;}
/* Language dropdown row */
.vc-lang-row{display:flex;align-items:center;gap:7px;padding:2px 2px;}
.vc-lang-label{font-size:11px;color:rgba(255,255,255,.38);font-family:'Astra','Iceland',sans-serif;white-space:nowrap;}
.vc-lang-select{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);border-radius:6px;color:rgba(255,255,255,.8);font-size:12px;padding:4px 8px;cursor:pointer;outline:none;max-width:120px;}
.vc-lang-select:focus{border-color:rgba(188,106,77,.5);}
.vc-lang-loading{font-size:11px;color:rgba(188,106,77,.55);font-style:italic;}
/* Audio card */
.vc-audio-card{background:rgba(18,12,28,1);border:1.5px solid rgba(188,106,77,.55);border-radius:12px;overflow:hidden;margin-top:2px;}
.vc-audio-lang-row{display:flex;align-items:center;gap:7px;padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,.06);}
.vc-audio-wave{display:flex;gap:2px;align-items:center;height:40px;padding:4px 14px;background:rgba(188,106,77,.07);}
.vc-wave-bar{flex:1;background:rgba(188,106,77,.4);border-radius:2px;transform:scaleY(0.3);transform-origin:center;}
.vc-wave-bar.vc-wave-on{animation:vc-wv .7s ease-in-out infinite;background:#D9895F;}
@keyframes vc-wv{0%,100%{transform:scaleY(0.2);}50%{transform:scaleY(1);}}
.vc-audio-prog-row{display:flex;align-items:center;gap:8px;padding:6px 14px 4px;}
.vc-audio-time{font-size:11px;color:rgba(255,255,255,.6);font-family:'Astra','Iceland',sans-serif;min-width:34px;}
.vc-audio-track{flex:1;height:4px;background:rgba(255,255,255,.15);border-radius:2px;position:relative;}
.vc-audio-fill{height:100%;background:linear-gradient(90deg,#D9895F,#BC6A4D);border-radius:2px;position:relative;transition:width .1s linear;}
.vc-audio-thumb{width:10px;height:10px;background:#D9895F;border-radius:50%;position:absolute;right:-5px;top:-3px;box-shadow:0 0 8px rgba(188,106,77,.9);}
.vc-audio-btns{display:flex;gap:6px;padding:8px 12px 10px;flex-wrap:wrap;}
.vc-ab{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:7px;font-size:12px;font-weight:500;cursor:pointer;transition:all .18s;font-family:'Astra','Iceland',sans-serif;border:1.5px solid;white-space:nowrap;}
.vc-ab-play{background:rgba(188,106,77,.2);border-color:rgba(188,106,77,.6);color:#ff8fab;}
.vc-ab-play:hover{background:rgba(188,106,77,.35);}
.vc-ab-pause{background:rgba(188,106,77,.2);border-color:rgba(188,106,77,.6);color:#ff8fab;}
.vc-ab-stop{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.8);}
.vc-ab-stop:hover{background:rgba(255,255,255,.2);}
.vc-ab-replay{background:rgba(188,106,77,.15);border-color:rgba(188,106,77,.5);color:#BC6A4D;}
.vc-ab-replay:hover{background:rgba(188,106,77,.28);}
/* Mic area */
.vc-mic-area{flex-shrink:0;padding:18px 24px 26px;display:flex;flex-direction:column;align-items:center;gap:11px;border-top:1px solid rgba(255,255,255,.06);background:rgba(8,8,14,.8);}
.vc-mic-ring{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;user-select:none;transition:background .3s,border-color .3s,box-shadow .3s;}
.vc-mic-ring:not(.vc-mic-processing):active{transform:scale(.94);}
.vc-mic-idle{background:rgba(188,106,77,.07);border:2px solid rgba(188,106,77,.38);box-shadow:0 0 20px rgba(188,106,77,.14);}
.vc-mic-idle:hover{background:rgba(188,106,77,.14);box-shadow:0 0 34px rgba(188,106,77,.3);}
.vc-mic-listening{background:rgba(188,106,77,.1);border:2px solid rgba(188,106,77,.55);animation:vc-pr 1s ease-in-out infinite;}
.vc-mic-processing{background:rgba(188,106,77,.08);border:2px solid rgba(188,106,77,.5);animation:vc-pp 1.6s ease-in-out infinite;cursor:default;}
.vc-mic-speaking{background:rgba(188,106,77,.08);border:2px solid rgba(188,106,77,.45);animation:vc-pt 1.2s ease-in-out infinite;}
.vc-mic-error{background:rgba(248,113,113,.08);border:2px solid rgba(248,113,113,.38);cursor:default;}
@keyframes vc-pr{0%,100%{box-shadow:0 0 20px rgba(188,106,77,.28);}50%{box-shadow:0 0 52px rgba(188,106,77,.65),0 0 90px rgba(188,106,77,.18);}}
@keyframes vc-pp{0%,100%{box-shadow:0 0 20px rgba(188,106,77,.22);}50%{box-shadow:0 0 52px rgba(188,106,77,.5),0 0 90px rgba(188,106,77,.12);}}
@keyframes vc-pt{0%,100%{box-shadow:0 0 20px rgba(188,106,77,.22);}50%{box-shadow:0 0 52px rgba(188,106,77,.5),0 0 90px rgba(188,106,77,.12);}}
.vc-mic-icon{font-size:34px;line-height:1;}
.vc-mic-label{font-size:13px;letter-spacing:.3px;text-align:center;transition:color .3s;font-family:'Astra','Iceland',sans-serif;min-height:18px;}
.vc-transcript-box{max-width:460px;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 15px;font-size:14px;color:rgba(255,255,255,.56);text-align:center;font-style:italic;line-height:1.6;}
.vc-speak-bars{display:flex;gap:4px;align-items:center;height:20px;}
.vc-sp-bar{width:3px;border-radius:3px;background:#BC6A4D;animation:vc-sb .8s ease-in-out infinite;}
.vc-sp-bar:nth-child(1){height:6px;animation-delay:0s;}
.vc-sp-bar:nth-child(2){height:13px;animation-delay:.11s;}
.vc-sp-bar:nth-child(3){height:20px;animation-delay:.22s;}
.vc-sp-bar:nth-child(4){height:13px;animation-delay:.33s;}
.vc-sp-bar:nth-child(5){height:6px;animation-delay:.44s;}
@keyframes vc-sb{0%,100%{transform:scaleY(.3);opacity:.45;}50%{transform:scaleY(1);opacity:1;}}
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceConsultation() {
  const [micState, setMicState]       = useState<MicState>("idle");
  const [transcript, setTranscript]   = useState("");
  const [conversation, setConversation] = useState<ConvEntry[]>([]);
  const [errorMsg, setErrorMsg]       = useState("");
  const [audio, setAudio]             = useState<AudioState>({
    playingIdx: null, paused: false, progress: 0, elapsed: 0, duration: 0,
  });
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const transcriptRef  = useRef("");
  const abortRef       = useRef(false);
  const historyRef     = useRef<HTMLDivElement>(null);
  const audioTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStartRef  = useRef(0);
  const audioPauseElRef = useRef(0);
  const convRef        = useRef(conversation);
  useEffect(() => { convRef.current = conversation; }, [conversation]);

  const tts = useTextToSpeech();
  const { detectLanguage, getTTSLang } = useLanguageDetection();
  const { isAllowedTopic, getRejectionMessage } = useConsultationGuard();

  // CSS injection
  useEffect(() => {
    const id = "vc-style-tag";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = VC_CSS;
      document.head.appendChild(s);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Auto-scroll
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation]);

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
        onDone?.();
      }
    });
  }, [clearAudioTimer]);

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

  // ── Language switching ────────────────────────────────────────────────────
  const handleDisplayLangChange = useCallback(async (idx: number, lang: Language) => {
    const entry = convRef.current[idx];
    if (!entry) return;
    // Already cached or it's the original
    if (lang === entry.detectedLang || entry.translations[lang]) {
      setConversation((c) => c.map((e, i) => i === idx ? { ...e, displayLang: lang } : e));
      return;
    }
    setTranslating((t) => ({ ...t, [`${idx}-display`]: true }));
    const translated = await translateText(entry.text, lang);
    setConversation((c) => c.map((e, i) =>
      i === idx ? { ...e, displayLang: lang, translations: { ...e.translations, [lang]: translated } } : e
    ));
    setTranslating((t) => { const n = { ...t }; delete n[`${idx}-display`]; return n; });
  }, []);

  const handleAudioLangChange = useCallback(async (idx: number, lang: Language) => {
    const entry = convRef.current[idx];
    if (!entry) return;
    if (lang === entry.detectedLang || entry.translations[lang]) {
      setConversation((c) => c.map((e, i) => i === idx ? { ...e, audioLang: lang } : e));
      return;
    }
    setTranslating((t) => ({ ...t, [`${idx}-audio`]: true }));
    const translated = await translateText(entry.text, lang);
    setConversation((c) => c.map((e, i) =>
      i === idx ? { ...e, audioLang: lang, translations: { ...e.translations, [lang]: translated } } : e
    ));
    setTranslating((t) => { const n = { ...t }; delete n[`${idx}-audio`]; return n; });
  }, []);

  // ── Speech recognition ─────────────────────────────────────────────────────
  const { start, stop, supported } = useSpeechRecognition({
    lang: "en-IN",
    onResult: (text) => {
      const roman = transliterateToRoman(text);
      setTranscript(roman);
      transcriptRef.current = roman;
    },
    onEnd: () => {
      const text = transcriptRef.current.trim();
      transcriptRef.current = "";
      setTranscript("");
      if (!text) { setMicState("idle"); return; }
      processUserSpeech(text);
    },
    onError: (err) => {
      const msg = err === "no-speech"
        ? "No speech detected. Please tap and try again."
        : "Microphone error. Please check permissions.";
      setErrorMsg(msg);
      setMicState("error");
      setTimeout(() => { setMicState("idle"); setErrorMsg(""); }, 3500);
    },
  });

  // ── Main handler ──────────────────────────────────────────────────────────
  async function processUserSpeech(text: string) {
    if (abortRef.current) return;
    const lang = detectLanguage(text);
    const ttsLang = getTTSLang(lang);
    const userEntry: ConvEntry = {
      role: "user", text, ttsLang,
      detectedLang: lang,
      translations: { [lang]: text },
      displayLang: lang,
      audioLang: lang,
    };
    const updatedConv = [...convRef.current, userEntry];
    setConversation(updatedConv);

    if (!isAllowedTopic(text)) {
      const rejection = getRejectionMessage(lang);
      if (abortRef.current) return;
      const newIdx = updatedConv.length;
      const pandEntry: ConvEntry = {
        role: "pandit", text: rejection, ttsLang,
        detectedLang: lang,
        translations: { [lang]: rejection },
        displayLang: lang, audioLang: lang,
      };
      setConversation((c) => [...c, pandEntry]);
      setMicState("speaking");
      speakWithControls(newIdx, rejection, ttsLang, () => {
        if (!abortRef.current) setMicState("idle");
      });
      return;
    }

    setMicState("processing");
    try {
      const history = updatedConv.map((e) => ({
        role: e.role === "user" ? ("user" as const) : ("assistant" as const),
        content: e.text,
      }));
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.75,
          max_tokens: 380,
          messages: [{ role: "system", content: VOICE_SYSTEM_PROMPT }, ...history],
        }),
      });
      if (abortRef.current) return;
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const reply = transliterateToRoman((data.choices?.[0]?.message?.content || "").trim());
      if (!reply) throw new Error("Empty response");
      const replyLang = detectLanguage(reply);
      const replyTtsLang = getTTSLang(replyLang);
      const newIdx = updatedConv.length;
      const pandEntry: ConvEntry = {
        role: "pandit", text: reply, ttsLang: replyTtsLang,
        detectedLang: replyLang,
        translations: { [replyLang]: reply },
        displayLang: replyLang, audioLang: replyLang,
      };
      setConversation((c) => [...c, pandEntry]);
      setMicState("speaking");
      speakWithControls(newIdx, reply, replyTtsLang, () => {
        if (!abortRef.current) setMicState("idle");
      });
    } catch {
      if (abortRef.current) return;
      const fallback = "Kshama karein, kuch technical samasya aayi hai. Kripaya thodi der baad dobara prayaas karein.";
      const newIdx = updatedConv.length;
      const pandEntry: ConvEntry = {
        role: "pandit", text: fallback, ttsLang: "hi-IN",
        detectedLang: "hinglish",
        translations: { hinglish: fallback },
        displayLang: "hinglish", audioLang: "hinglish",
      };
      setConversation((c) => [...c, pandEntry]);
      setMicState("speaking");
      speakWithControls(newIdx, fallback, "hi-IN", () => {
        if (!abortRef.current) setMicState("idle");
      });
    }
  }

  // ── Mic controls ──────────────────────────────────────────────────────────
  const handleMicClick = () => {
    if (!supported) {
      setErrorMsg("Speech recognition requires Chrome or Edge browser.");
      setMicState("error");
      setTimeout(() => { setMicState("idle"); setErrorMsg(""); }, 3500);
      return;
    }
    if (micState === "processing") return;
    if (micState === "speaking") { stopAudio(); setMicState("idle"); return; }
    if (micState === "listening") { stop(); return; }
    abortRef.current = false;
    transcriptRef.current = "";
    setTranscript("");
    setErrorMsg("");
    start();
    setMicState("listening");
  };

  const newSession = () => {
    abortRef.current = true;
    stopAudio();
    stop();
    setConversation([]);
    transcriptRef.current = "";
    setTranscript("");
    setMicState("idle");
    setErrorMsg("");
    setTimeout(() => { abortRef.current = false; }, 60);
  };

  // ── Display ───────────────────────────────────────────────────────────────
  const MIC_ICONS: Record<MicState, string> = {
    idle: "🎤", listening: "🔴", processing: "🔮", speaking: "🕉️", error: "⚠️",
  };
  const MIC_COLORS: Record<MicState, string> = {
    idle: "rgba(188,106,77,.75)", listening: "#fda4af",
    processing: "#BC6A4D", speaking: "#BC6A4D", error: "#f87171",
  };
  const micLabel =
    micState === "error"      ? (errorMsg || "⚠️ Please try again") :
    micState === "idle"       ? "🎤 Tap to Speak" :
    micState === "listening"  ? "🌟 I am listening..." :
    micState === "processing" ? "🔮 Understanding your situation..." :
    "🕉️ Pandit Ji is speaking...";

  const WELCOME = "🕉️ Namaste.\n\nPlease share what troubles your heart — whether it is career, relationships, health, finances, or spiritual matters — and I will listen carefully.\n\nYou may speak in Hindi, English, or Hinglish.";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="vc-root">
      <div className="vc-topbar">
        <span className="vc-topbar-title">Voice Session</span>
        <button className={`vc-ctrl-btn${tts.muted ? " vc-muted" : ""}`} onClick={tts.toggleMute}>
          {tts.muted ? "🔇 Unmute" : "🔊 Voice On"}
        </button>
        {micState === "listening" && (
          <button className="vc-ctrl-btn" onClick={() => stop()}>⏹ Stop</button>
        )}
        {micState === "speaking" && (
          <button className="vc-ctrl-btn" onClick={() => { stopAudio(); setMicState("idle"); }}>⏹ Stop</button>
        )}
        {conversation.length > 0 && (
          <button className="vc-ctrl-btn" onClick={newSession}>🔄 New</button>
        )}
      </div>

      <div className="vc-history" ref={historyRef}>
        {conversation.length === 0 ? (
          <div className="vc-welcome">
            <div className="vc-welcome-om">🕉️</div>
            <div className="vc-welcome-text">{WELCOME}</div>
          </div>
        ) : (
          conversation.map((entry, i) => {
            const displayText = entry.role === "pandit"
              ? (entry.translations[entry.displayLang] ?? entry.text)
              : entry.text;
            return (
              <div key={i} className={`vc-msg vc-msg-${entry.role}`}>
                <div className="vc-msg-av">{entry.role === "user" ? "🙏" : "🧘"}</div>
                <div className="vc-msg-body">
                  <div className="vc-msg-text">{displayText}</div>

                  {entry.role === "pandit" && (
                    <>
                      {/* Text language selector */}
                      <div className="vc-lang-row">
                        <span className="vc-lang-label">🌐</span>
                        <select
                          className="vc-lang-select"
                          value={entry.displayLang}
                          onChange={(e) => handleDisplayLangChange(i, e.target.value as Language)}
                        >
                          <option value="english">English</option>
                          <option value="hinglish">Hinglish</option>
                          <option value="hindi">Hindi</option>
                        </select>
                        {translating[`${i}-display`] && (
                          <span className="vc-lang-loading">translating…</span>
                        )}
                      </div>

                      {/* Audio player with language selector */}
                      <AudioPlayer
                        idx={i}
                        entry={entry}
                        audio={audio}
                        translatingAudio={!!translating[`${i}-audio`]}
                        getTTSLangFn={getTTSLang}
                        onPlay={(text, lang) => speakWithControls(i, text, lang)}
                        onPause={pauseAudio}
                        onResume={(text, lang) => resumeAudio(i, text, lang)}
                        onStop={stopAudio}
                        onReplay={(text, lang) => speakWithControls(i, text, lang)}
                        onAudioLangChange={(lang) => handleAudioLangChange(i, lang)}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })
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
  translatingAudio: boolean;
  getTTSLangFn: (lang: Language) => string;
  onPlay: (text: string, ttsLang: string) => void;
  onPause: () => void;
  onResume: (text: string, ttsLang: string) => void;
  onStop: () => void;
  onReplay: (text: string, ttsLang: string) => void;
  onAudioLangChange: (lang: Language) => void;
}

function AudioPlayer({
  idx, entry, audio, translatingAudio, getTTSLangFn,
  onPlay, onPause, onResume, onStop, onReplay, onAudioLangChange,
}: AudioPlayerProps) {
  const isThisActive = audio.playingIdx === idx;
  const isPlaying    = isThisActive && !audio.paused;
  const isPaused     = isThisActive && audio.paused;

  const audioText    = entry.translations[entry.audioLang] ?? entry.text;
  const audioTtsLang = getTTSLangFn(entry.audioLang);

  const progress = isThisActive ? audio.progress : 0;
  const elapsed  = isThisActive ? audio.elapsed  : 0;
  const duration = isThisActive ? audio.duration : estimateDuration(entry.translations[entry.audioLang] ?? entry.text);

  return (
    <div className="vc-audio-card">
      {/* Audio language selector */}
      <div className="vc-audio-lang-row">
        <span className="vc-lang-label">🎧 Listen in:</span>
        <select
          className="vc-lang-select"
          value={entry.audioLang}
          onChange={(e) => onAudioLangChange(e.target.value as Language)}
        >
          <option value="english">English</option>
          <option value="hinglish">Hinglish</option>
          <option value="hindi">Hindi</option>
        </select>
        {translatingAudio && <span className="vc-lang-loading">loading…</span>}
      </div>

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
            ▶ Play
          </button>
        )}
        {isPlaying && (
          <button className="vc-ab vc-ab-pause" onClick={onPause}>⏸ Pause</button>
        )}
        {isPaused && (
          <button className="vc-ab vc-ab-play" onClick={() => onResume(audioText, audioTtsLang)}>
            ▶ Resume
          </button>
        )}
        {isThisActive && (
          <button className="vc-ab vc-ab-stop" onClick={onStop}>⏹ Stop</button>
        )}
        <button className="vc-ab vc-ab-replay" onClick={() => onReplay(audioText, audioTtsLang)}>
          🔁 Replay
        </button>
      </div>
    </div>
  );
}
