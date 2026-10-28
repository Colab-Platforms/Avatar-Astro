import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import FeatureIntro from "@/components/FeatureIntro";
import { aiChat } from "@/lib/aiClient";

const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap";
if (!document.head.querySelector("link[href*='Cinzel']")) document.head.appendChild(fl);


const SYSTEM_PROMPT = `You are Pandit Rameshwar Ji, a revered Vedic astrologer with 40 years of experience.
Analyze the seeker's situation and return ONLY a valid JSON object with EXACTLY these keys (all required):
{
  "lifeDomain": "Career / Relationships / Health / Finance / Spiritual / Family / Mind",
  "karmaType": "Sanchita Karma / Prarabdha Karma / Kriyamana Karma / Agami Karma",
  "severity": "Gentle Turbulence / Significant Lesson / Deep Karmic Debt / Breakthrough Moment",
  "rootPlanet": "e.g. Saturn in 7th house — specific planet and house",
  "karmicPattern": "2-3 sentences describing the karmic pattern from a Vedic perspective",
  "soulLesson": "The specific soul lesson this situation is teaching (1-2 sentences)",
  "pastLifeEcho": "What past-life karma this is clearing — thoughtful Vedic perspective (1-2 sentences)",
  "suggestedAction": "Exact remedy: specific pooja name, mantra with count, fasting day",
  "remedyUrgency": "Today / This Week / This Month",
  "weeklyPlan": ["Specific action 1", "Specific action 2", "Specific action 3", "Specific action 4"],
  "planets": [
    {"name": "Saturn", "influence": "Strong", "note": "brief specific note"},
    {"name": "Jupiter", "influence": "Moderate", "note": "brief specific note"},
    {"name": "Rahu", "influence": "Challenging", "note": "brief specific note"}
  ],
  "karmaScores": {
    "spiritual": 72,
    "discipline": 58,
    "compassion": 81,
    "karmaDebt": "Medium"
  },
  "currentCycle": "Learning & Expansion",
  "affirmation": "A personalized Sanskrit or English Vedic affirmation"
}`;

async function callAI(userMsg) {
  const res = await aiChat({
      temperature: 0.7,
      max_tokens: 1500,
      json: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `My situation: ${userMsg}` }
      ]
    });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
.iv-app{min-height:100vh;background:#050510;color:#e8e0f0;font-family:'Astra','Iceland',sans-serif;overflow-x:hidden;position:relative;}

/* ── STARFIELD ── */
.iv-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}

/* ── PAGE ── */
.iv-page{position:relative;z-index:1;}
.iv-container{width:100%;max-width:1440px;margin:0 auto;padding:0 48px;}
@media(max-width:768px){.iv-container{padding:0 20px;}}

/* ── HERO ── */
.iv-hero{padding:100px 48px 80px;text-align:center;}
@media(max-width:768px){.iv-hero{padding:80px 20px 60px;}}
.iv-hero-eyebrow{font-family:'Astra','Iceland',sans-serif;font-size:14px;letter-spacing:7px;color:#BC6A4D;text-transform:uppercase;margin-bottom:22px;}
.iv-hero-om{font-size:60px;display:block;margin-bottom:22px;filter:drop-shadow(0 0 28px rgba(188,106,77,.65));}
.iv-hero-title{font-family:'Astra','Iceland',sans-serif;font-size:clamp(48px,8vw,80px);font-weight:900;line-height:1.0;margin-bottom:18px;background:linear-gradient(135deg,#BC6A4D 0%,#D9895F 50%,#BC6A4D 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:2px;}
.iv-hero-tagline{font-family:'Astra','Iceland',sans-serif;font-size:14px;letter-spacing:6px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:26px;}
.iv-hero-sub{color:rgba(255,255,255,.85);font-style:italic;font-size:21px;line-height:1.8;max-width:640px;margin:0 auto 44px;}
.iv-karma-strip{display:flex;justify-content:center;gap:56px;flex-wrap:wrap;}
.iv-ks-item{text-align:center;}
.iv-ks-val{font-family:'Astra','Iceland',sans-serif;font-size:36px;color:#BC6A4D;line-height:1;}
.iv-ks-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:3px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-top:7px;}

/* ── NAV GRID ── */
.iv-nav-section{padding:0 48px 80px;}
@media(max-width:768px){.iv-nav-section{padding:0 20px 60px;}}
.iv-nav-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;max-width:1440px;margin:0 auto;}
@media(max-width:1100px){.iv-nav-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:540px){.iv-nav-grid{grid-template-columns:1fr;}}
.iv-nav-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:34px 28px;text-decoration:none;transition:all .35s;position:relative;overflow:hidden;display:block;}
.iv-nav-card:hover{transform:translateY(-6px);box-shadow:0 24px 64px rgba(0,0,0,.55);}
.iv-nav-card.gold:hover{border-color:rgba(188,106,77,.5);background:rgba(188,106,77,.05);}
.iv-nav-card.purple:hover{border-color:rgba(188,106,77,.45);background:rgba(188,106,77,.05);}
.iv-nav-card.cyan:hover{border-color:rgba(188,106,77,.4);background:rgba(188,106,77,.04);}
.iv-nav-card.rose:hover{border-color:rgba(188,106,77,.4);background:rgba(188,106,77,.04);}
.iv-nc-icon{font-size:40px;margin-bottom:18px;display:block;}
.iv-nc-tag{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;}
.gold .iv-nc-tag{color:rgba(255,255,255,.8);}
.purple .iv-nc-tag{color:rgba(255,255,255,.8);}
.cyan .iv-nc-tag{color:rgba(255,255,255,.8);}
.rose .iv-nc-tag{color:rgba(255,255,255,.8);}
.iv-nc-name{font-family:'Astra','Iceland',sans-serif;font-size:23px;color:#fff;margin-bottom:12px;}
.iv-nc-desc{font-size:17px;color:rgba(255,255,255,.78);line-height:1.68;font-style:italic;}
.iv-nc-arrow{position:absolute;top:28px;right:28px;color:rgba(188,106,77,.35);font-size:22px;transition:transform .3s,color .3s;}
.iv-nav-card:hover .iv-nc-arrow{transform:translateX(5px);color:#BC6A4D;}

/* ── DIAGNOSIS SECTION ── */
.iv-diag-section{background:rgba(11,16,32,.75);border-top:1px solid rgba(188,106,77,.12);border-bottom:1px solid rgba(188,106,77,.12);padding:80px 48px;}
@media(max-width:768px){.iv-diag-section{padding:60px 20px;}}
.iv-diag-inner{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start;}
@media(max-width:960px){.iv-diag-inner{grid-template-columns:1fr;gap:44px;}}

.iv-diag-heading{font-family:'Astra','Iceland',sans-serif;font-size:clamp(32px,4.5vw,50px);color:#BC6A4D;line-height:1.15;margin-bottom:18px;}
.iv-diag-sub{font-size:20px;color:rgba(255,255,255,.68);font-style:italic;line-height:1.78;margin-bottom:36px;}
.iv-diag-hints{display:flex;flex-direction:column;gap:14px;}

/* CLICKABLE hint cards */
.iv-hint{display:flex;align-items:center;gap:16px;padding:18px 22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;cursor:pointer;transition:all .3s;}
.iv-hint:hover{background:rgba(188,106,77,.1);border-color:rgba(188,106,77,.45);transform:translateX(6px);}
.iv-hint-icon{font-size:24px;flex-shrink:0;}
.iv-hint-txt{font-size:18px;color:rgba(255,255,255,.8);line-height:1.55;}
.iv-hint:hover .iv-hint-txt{color:#fff;}

/* Input card */
.iv-input-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:38px;}
.iv-voice-row{display:flex;gap:12px;margin-bottom:20px;align-items:center;}
.iv-voice-btn{background:rgba(188,106,77,.09);border:1px solid rgba(188,106,77,.28);border-radius:10px;padding:11px 20px;color:#BC6A4D;font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:2px;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;}
.iv-voice-btn:hover{background:rgba(188,106,77,.18);}
.iv-voice-btn.listening{background:rgba(188,106,77,.14);border-color:rgba(188,106,77,.45);color:#D9895F;animation:pulse-anim 1s ease-in-out infinite;}
@keyframes pulse-anim{0%,100%{opacity:1;}50%{opacity:.4;}}
.iv-char{font-family:'Astra','Iceland',sans-serif;font-size:13px;color:rgba(255,255,255,.6);margin-left:auto;}
.iv-textarea{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:22px;color:#fff;font-family:'Astra','Iceland',sans-serif;font-size:21px;line-height:1.75;resize:vertical;min-height:170px;outline:none;transition:border .3s;}
.iv-textarea:focus{border-color:#BC6A4D;box-shadow:0 0 0 3px rgba(188,106,77,.12);}
.iv-textarea::placeholder{color:rgba(255,255,255,.4);font-style:italic;}
.iv-submit-btn{width:100%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);color:#050510;border:none;border-radius:14px;padding:20px;font-family:'Astra','Iceland',sans-serif;font-size:15px;letter-spacing:4px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:20px;}
.iv-submit-btn:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 14px 44px rgba(188,106,77,.45);}
.iv-submit-btn:disabled{opacity:.38;cursor:not-allowed;}
.iv-loading{text-align:center;padding:52px 0;}
.iv-loader{width:58px;height:58px;border:2px solid rgba(188,106,77,.15);border-top-color:#BC6A4D;border-radius:50%;animation:iv-spin 1s linear infinite;margin:0 auto 20px;}
@keyframes iv-spin{to{transform:rotate(360deg);}}
.iv-loading-text{font-family:'Astra','Iceland',sans-serif;font-size:14px;letter-spacing:4px;color:rgba(255,255,255,.8);text-transform:uppercase;}
.iv-err{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.25);border-radius:12px;padding:16px;color:#D9895F;font-family:'Astra','Iceland',sans-serif;font-size:14px;text-align:center;margin-top:18px;}

/* ── REPORT ── */
.iv-report-wrap{background:rgba(5,5,16,.9);border-top:1px solid rgba(188,106,77,.14);}
.iv-report{max-width:1440px;margin:0 auto;padding:80px 48px 110px;}
@media(max-width:768px){.iv-report{padding:50px 20px 80px;}}
.iv-report-anim{animation:report-in .9s ease-out;}
@keyframes report-in{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}

/* Report header */
.iv-report-hdr{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:18px;margin-bottom:52px;padding-bottom:32px;border-bottom:1px solid rgba(188,106,77,.15);}
.iv-report-title{font-family:'Astra','Iceland',sans-serif;font-size:clamp(30px,4vw,44px);color:#BC6A4D;}
.iv-report-title span{display:block;font-size:16px;font-family:'Astra','Iceland',sans-serif;letter-spacing:3px;color:rgba(255,255,255,.75);text-transform:uppercase;margin-top:8px;font-weight:400;}
.iv-report-badges{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.iv-badge{display:inline-flex;align-items:center;border-radius:50px;padding:7px 20px;font-family:'Astra','Iceland',sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
.iv-badge.karma-type{background:rgba(188,106,77,.13);border:1px solid rgba(188,106,77,.38);color:#D9895F;}
.iv-badge.sev-gentle{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.3);color:#BC6A4D;}
.iv-badge.sev-significant{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.32);color:#D9895F;}
.iv-badge.sev-deep{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.32);color:#D9895F;}
.iv-badge.sev-breakthrough{background:rgba(188,106,77,.12);border:1px solid rgba(188,106,77,.42);color:#BC6A4D;}

/* Grid layouts */
.iv-row{display:grid;gap:22px;margin-bottom:22px;}
.iv-row-2{grid-template-columns:1fr 1fr;}
.iv-row-3{grid-template-columns:1fr 1fr 1fr;}
@media(max-width:900px){.iv-row-2,.iv-row-3{grid-template-columns:1fr;}}

/* Cards */
.iv-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:22px;padding:32px 34px;}
.iv-card.gold-card{background:rgba(188,106,77,.04);border-color:rgba(188,106,77,.22);}
.iv-card.purple-card{background:rgba(188,106,77,.05);border-color:rgba(188,106,77,.22);}
.iv-card.cyan-card{background:rgba(188,106,77,.04);border-color:rgba(188,106,77,.2);}
.iv-card.dark-card{background:rgba(5,5,16,.7);border-color:rgba(255,255,255,.08);}
.iv-card-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:4px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:20px;display:block;}
.iv-card-title{font-family:'Astra','Iceland',sans-serif;font-size:24px;color:#BC6A4D;margin-bottom:10px;}
.iv-card-body{font-size:19px;line-height:1.8;color:rgba(255,255,255,.85);}
.iv-card-body.italic{font-style:italic;}
.iv-card-body.gold{color:#D9895F;}

/* Karma Snapshot */
.iv-snap-scores{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;}
.iv-score-item{}
.iv-score-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:9px;}
.iv-score-track{background:rgba(255,255,255,.07);border-radius:50px;height:9px;overflow:hidden;margin-bottom:5px;}
.iv-score-fill{height:100%;border-radius:50px;}
.iv-score-pct{font-family:'Astra','Iceland',sans-serif;font-size:13px;color:rgba(255,255,255,.7);text-align:right;}
.iv-debt-row{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:14px;}
.iv-debt-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,.8);text-transform:uppercase;}
.iv-debt-val{font-family:'Astra','Iceland',sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;}
.debt-Low{color:#BC6A4D;}
.debt-Medium{color:#D9895F;}
.debt-High{color:#D9895F;}
.iv-cycle{display:inline-block;background:rgba(188,106,77,.13);border:1px solid rgba(188,106,77,.32);border-radius:50px;padding:7px 18px;font-family:'Astra','Iceland',sans-serif;font-size:12px;letter-spacing:2px;color:#BC6A4D;margin-top:16px;}

/* Timeline */
.iv-tl{display:flex;flex-direction:column;}
.iv-tl-item{display:flex;gap:20px;position:relative;}
.iv-tl-line{position:absolute;left:19px;top:44px;bottom:0;width:1px;background:linear-gradient(to bottom,rgba(188,106,77,.35),transparent);}
.iv-tl-dot{width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(188,106,77,.45);background:rgba(188,106,77,.08);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;margin-top:3px;}
.iv-tl-body{flex:1;padding-bottom:30px;}
.iv-tl-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:3px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:9px;}
.iv-tl-txt{font-size:19px;line-height:1.78;color:rgba(255,255,255,.85);}

/* Soul lessons */
.iv-lessons{display:flex;flex-direction:column;gap:15px;}
.iv-lesson{display:flex;gap:22px;align-items:flex-start;padding:22px 26px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;transition:border .3s;}
.iv-lesson:hover{border-color:rgba(188,106,77,.3);}
.iv-lesson-num{font-family:'Astra','Iceland',sans-serif;font-size:32px;color:rgba(188,106,77,.22);flex-shrink:0;line-height:1;min-width:44px;}
.iv-lesson-txt{font-size:19px;line-height:1.75;color:rgba(255,255,255,.85);padding-top:5px;}

/* Remedies */
.iv-rem-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;}
.iv-rem-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:26px 22px;transition:all .3s;}
.iv-rem-card:hover{border-color:rgba(188,106,77,.35);transform:translateY(-4px);background:rgba(188,106,77,.04);}
.iv-rem-icon{font-size:32px;margin-bottom:14px;display:block;}
.iv-rem-type{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:2px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:8px;}
.iv-rem-txt{font-size:18px;line-height:1.68;color:rgba(255,255,255,.8);}

/* Weekly plan */
.iv-week{display:flex;flex-direction:column;gap:13px;}
.iv-week-item{display:flex;align-items:flex-start;gap:16px;padding:17px 22px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;}
.iv-week-check{width:24px;height:24px;border-radius:50%;border:1px solid rgba(188,106,77,.38);background:rgba(188,106,77,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#BC6A4D;font-size:12px;margin-top:3px;}
.iv-week-txt{font-size:19px;line-height:1.65;color:rgba(255,255,255,.82);}

/* Planets */
.iv-planets{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:15px;}
.iv-planet-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:24px 20px;text-align:center;}
.iv-planet-name{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#fff;margin-bottom:10px;}
.iv-planet-inf{font-family:'Astra','Iceland',sans-serif;font-size:12px;letter-spacing:2px;border-radius:50px;padding:5px 16px;margin:0 auto 12px;display:inline-block;}
.inf-Strong{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.32);color:#BC6A4D;}
.inf-Moderate{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.3);color:#BC6A4D;}
.inf-Challenging{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.3);color:#D9895F;}
.iv-planet-note{font-size:16px;color:rgba(255,255,255,.78);line-height:1.62;font-style:italic;}

/* Sacred quote */
.iv-quote{background:linear-gradient(135deg,rgba(188,106,77,.08),rgba(188,106,77,.07));border:1px solid rgba(188,106,77,.2);border-radius:24px;padding:56px 52px;text-align:center;position:relative;overflow:hidden;margin-bottom:22px;}
@media(max-width:768px){.iv-quote{padding:40px 28px;}}
.iv-quote-deco{position:absolute;font-family:serif;font-size:160px;color:rgba(188,106,77,.05);line-height:1;user-select:none;}
.iv-quote-deco.l{left:12px;top:-10px;}
.iv-quote-deco.r{right:12px;bottom:-30px;}
.iv-quote-lbl{font-family:'Astra','Iceland',sans-serif;font-size:13px;letter-spacing:5px;color:rgba(255,255,255,.8);text-transform:uppercase;margin-bottom:24px;}
.iv-quote-txt{font-family:'Astra','Iceland',sans-serif;font-size:clamp(20px,3vw,32px);color:#D9895F;line-height:1.65;position:relative;z-index:1;}

/* Reset */
.iv-reset-btn{width:100%;background:transparent;border:1px solid rgba(188,106,77,.28);border-radius:14px;padding:18px;color:rgba(255,255,255,.85);font-family:'Astra','Iceland',sans-serif;font-size:14px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
.iv-reset-btn:hover{background:rgba(188,106,77,.08);color:#BC6A4D;border-color:rgba(188,106,77,.5);}
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechCtor = new () => any;
type SpeechWindow = { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };

const NAV_CARDS = [
  { icon:"🧘", name:"AI Guru", tag:"Pandit Intelligence", desc:"Converse with a Vedic pandit. Get pooja prescriptions, mantra remedies, and personal dharmic guidance.", path:"/inner-voice/chat", color:"gold" },
  { icon:"⚡", name:"Karma Score", tag:"Natal + Behavioral", desc:"Your real karma score — calculated from your birth chart, planetary transits, and daily actions combined.", path:"/inner-voice/dashboard", color:"purple" },
  { icon:"🧭", name:"Future Life Path Prediction", tag:"Interpretive Astrology", desc:"Explore possible life directions through interpretive astrological guidance.", path:"/inner-voice/future-path", color:"rose" },
  { icon:"🕉", name:"Sacred Shloka", tag:"Vedic Wisdom", desc:"Discover the meaning and practical wisdom of traditional Sanskrit verses.", path:"/inner-voice/wisdom", color:"cyan" },
];

const HINTS = [
  { icon:"💼", text:"Career stagnation, job loss, or a difficult boss" },
  { icon:"💛", text:"Relationship conflicts, marriage issues, or loneliness" },
  { icon:"💰", text:"Financial struggles, debt, or business failure" },
  { icon:"🌿", text:"Recurring health issues or unexplained suffering" },
];

// ── Animated starfield canvas ──────────────────────────────────────────────
function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;

    // Static stars
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.2,
      opacity: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.001 + 0.0005,
      phase: Math.random() * Math.PI * 2,
    }));

    // Shooting stars pool
    const shoots = [];
    const spawnShoot = () => {
      shoots.push({
        x: Math.random() * W * 0.8,
        y: Math.random() * H * 0.4,
        len: Math.random() * 160 + 80,
        speed: Math.random() * 3 + 2,
        angle: Math.PI / 5 + Math.random() * 0.3,
        life: 1, dx: 0, dy: 0,
      });
    };

    let t = 0, shootTimer = 0;
    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.016;
      shootTimer += 0.016;
      if (shootTimer > 3.5 + Math.random() * 3) { spawnShoot(); shootTimer = 0; }

      // Draw stars
      stars.forEach(s => {
        const op = s.opacity * (0.6 + 0.4 * Math.sin(t * s.speed * 60 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      });

      // Draw shooting stars
      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.life -= 0.008;
        if (s.life <= 0) { shoots.splice(i, 1); continue; }
        const tailX = s.x - Math.cos(s.angle) * s.len;
        const tailY = s.y - Math.sin(s.angle) * s.len;
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, `rgba(188,106,77,0)`);
        grad.addColorStop(0.6, `rgba(188,106,77,${s.life * 0.5})`);
        grad.addColorStop(1, `rgba(255,255,255,${s.life * 0.9})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Head glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.life * 0.8})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    const raf = requestAnimationFrame(frame);
    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="iv-canvas" />;
}

function ScoreBar({ label, value, gradient }) {
  return (
    <div className="iv-score-item">
      <div className="iv-score-lbl">{label}</div>
      <div className="iv-score-track">
        <div className="iv-score-fill" style={{ width:`${value||0}%`, background: gradient }} />
      </div>
      <div className="iv-score-pct">{value||0}%</div>
    </div>
  );
}

function ReportView({ result, onReset }) {
  if (!result || !Object.keys(result).length) return null;
  const sevClass = (s="") => {
    if (s.includes("Gentle")) return "sev-gentle";
    if (s.includes("Significant")) return "sev-significant";
    if (s.includes("Deep")) return "sev-deep";
    if (s.includes("Breakthrough")) return "sev-breakthrough";
    return "sev-significant";
  };
  const ks = result.karmaScores || {};
  const planets = Array.isArray(result.planets) ? result.planets : [];
  const weekly = Array.isArray(result.weeklyPlan) ? result.weeklyPlan : [];

  const remedies = [
    { icon:"📿", type:"Mantra Practice", txt: result.suggestedAction || "Chant the prescribed mantra 108 times daily at sunrise" },
    { icon:"🪔", type:"Pooja Ritual", txt: `Perform the indicated pooja — urgency: ${result.remedyUrgency || "This Week"}` },
    { icon:"🌅", type:"Morning Sadhana", txt: "15 minutes of silent meditation and pranayama each morning before sunrise" },
    { icon:"🤲", type:"Seva / Charity", txt: "Offer food, donate to the needy, or perform community service on the auspicious day" },
  ];

  const lessons = [result.soulLesson, result.pastLifeEcho, result.karmicPattern].filter(Boolean);
  const timeline = [
    { icon:"🌱", label:"Past Karma", txt: result.pastLifeEcho },
    { icon:"⚡", label:"Current Challenge", txt: result.karmicPattern },
    { icon:"🎓", label:"Soul Lesson", txt: result.soulLesson },
    { icon:"🌟", label:"Path Forward", txt: result.suggestedAction },
  ].filter(t => t.txt);

  return (
    <div className="iv-report iv-report-anim">
      {/* Header */}
      <div className="iv-report-hdr">
        <div className="iv-report-title">
          Your Karma Report
          <span>Personalized Vedic Analysis</span>
        </div>
        <div className="iv-report-badges">
          {result.karmaType && <span className="iv-badge karma-type">{result.karmaType}</span>}
          {result.severity && <span className={`iv-badge ${sevClass(result.severity)}`}>{result.severity}</span>}
          {result.lifeDomain && <span className="iv-badge" style={{background:"rgba(188,106,77,.08)",border:"1px solid rgba(188,106,77,.25)",color:"#BC6A4D"}}>{result.lifeDomain}</span>}
        </div>
      </div>

      {/* Row 1: Snapshot + Domain + Pattern */}
      <div className="iv-row iv-row-3">
        {/* Karma Snapshot */}
        <div className="iv-card gold-card">
          <span className="iv-card-lbl">Karma Snapshot</span>
          <div className="iv-snap-scores">
            <ScoreBar label="Spiritual" value={ks.spiritual} gradient="linear-gradient(90deg,#BC6A4D,#D9895F)" />
            <ScoreBar label="Discipline" value={ks.discipline} gradient="linear-gradient(90deg,#BC6A4D,#BC6A4D)" />
            <ScoreBar label="Compassion" value={ks.compassion} gradient="linear-gradient(90deg,#D9895F,#f43f5e)" />
          </div>
          <div className="iv-debt-row">
            <span className="iv-debt-lbl">Karmic Debt</span>
            <span className={`iv-debt-val debt-${ks.karmaDebt||"Medium"}`}>{ks.karmaDebt||"Medium"}</span>
          </div>
          {result.currentCycle && <div className="iv-cycle">{result.currentCycle}</div>}
        </div>

        {/* Domain + Planet */}
        <div className="iv-card">
          <span className="iv-card-lbl">Life Domain & Ruling Planet</span>
          {result.lifeDomain && <div className="iv-card-title">{result.lifeDomain}</div>}
          {result.rootPlanet && <div className="iv-card-body">{result.rootPlanet}</div>}
          {result.remedyUrgency && (
            <div style={{marginTop:20,fontFamily:"'Astra','Iceland',sans-serif",fontSize:11,letterSpacing:2,color:"rgba(188,106,77,.8)",textTransform:"uppercase"}}>
              ⚡ Act: {result.remedyUrgency}
            </div>
          )}
        </div>

        {/* Karmic Pattern */}
        <div className="iv-card cyan-card">
          <span className="iv-card-lbl">Karmic Pattern</span>
          {result.karmicPattern && <div className="iv-card-body italic" style={{fontSize:19}}>{result.karmicPattern}</div>}
        </div>
      </div>

      {/* Row 2: Timeline + Soul Lessons + Weekly */}
      <div className="iv-row iv-row-2">
        {/* Timeline */}
        <div className="iv-card">
          <span className="iv-card-lbl">Karmic Journey</span>
          <div className="iv-tl">
            {timeline.map((t, i) => (
              <div key={i} className="iv-tl-item">
                {i < timeline.length - 1 && <div className="iv-tl-line" />}
                <div className="iv-tl-dot">{t.icon}</div>
                <div className="iv-tl-body">
                  <div className="iv-tl-lbl">{t.label}</div>
                  <div className="iv-tl-txt">{t.txt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Soul Lessons + Weekly */}
        <div style={{display:"flex",flexDirection:"column",gap:22}}>
          <div className="iv-card purple-card">
            <span className="iv-card-lbl">Soul Lessons</span>
            <div className="iv-lessons">
              {lessons.map((l, i) => (
                <div key={i} className="iv-lesson">
                  <div className="iv-lesson-num">0{i+1}</div>
                  <div className="iv-lesson-txt">{l}</div>
                </div>
              ))}
            </div>
          </div>
          {weekly.length > 0 && (
            <div className="iv-card dark-card">
              <span className="iv-card-lbl">This Week's Actions</span>
              <div className="iv-week">
                {weekly.map((w, i) => (
                  <div key={i} className="iv-week-item">
                    <div className="iv-week-check">✓</div>
                    <div className="iv-week-txt">{w}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Remedies */}
      <div className="iv-card" style={{marginBottom:22}}>
        <span className="iv-card-lbl">Prescribed Remedies</span>
        <div className="iv-rem-grid">
          {remedies.map((r, i) => (
            <div key={i} className="iv-rem-card">
              <span className="iv-rem-icon">{r.icon}</span>
              <div className="iv-rem-type">{r.type}</div>
              <div className="iv-rem-txt">{r.txt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Planets */}
      {planets.length > 0 && (
        <div className="iv-card" style={{marginBottom:22}}>
          <span className="iv-card-lbl">Cosmic Influences</span>
          <div className="iv-planets">
            {planets.map((p, i) => (
              <div key={i} className="iv-planet-card">
                <div className="iv-planet-name">{p.name}</div>
                <div className={`iv-planet-inf inf-${(p.influence||"Moderate").split(" ")[0]}`}>{p.influence}</div>
                <div className="iv-planet-note">{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sacred quote */}
      {result.affirmation && (
        <div className="iv-quote">
          <span className="iv-quote-deco l">"</span>
          <span className="iv-quote-deco r">"</span>
          <div className="iv-quote-lbl">Your Sacred Affirmation</div>
          <div className="iv-quote-txt">"{result.affirmation}"</div>
        </div>
      )}

      <button className="iv-reset-btn" onClick={onReset}>↩ New Diagnosis</button>
    </div>
  );
}

export default function InnerVoice() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  const karmaHistory = (() => { try { return JSON.parse(localStorage.getItem("iv_karma_v2")||"[]"); } catch { return []; } })();
  const latestScore = karmaHistory[0]?.composite || null;

  const startVoice = () => {
    const SR = (window as unknown as SpeechWindow).SpeechRecognition || (window as unknown as SpeechWindow).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice input."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "hi-IN";
    rec.onresult = e => setText(Array.from(e.results).map(r => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.start(); recognitionRef.current = rec; setListening(true);
  };

  const diagnose = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await callAI(text);
      if (!data || !Object.keys(data).length) throw new Error("Empty response. Please try again.");
      setResult(data);
    } catch(e) { console.error("[Know Your Karma] request failed:", e); setError("Could not read your karma right now. Please try again in a moment."); }
    finally { setLoading(false); }
  };

  // Hint click — fills textarea and scrolls to input
  const onHintClick = (txt) => {
    setText(txt);
    (document.querySelector(".iv-textarea") as HTMLElement | null)?.focus();
  };

  return (
    <div className="iv-app">
      <style>{CSS}</style>
      <StarCanvas />
      <div className="iv-page">

        {/* Hero */}
        <div className="iv-hero">
          <div className="iv-hero-eyebrow">Spiritual Intelligence Platform</div>
          <span className="iv-hero-om">🕉</span>
          <h1 className="iv-hero-title">Inner Voice</h1>
          <div className="iv-hero-tagline">Know Your Karma · Improve Your Karma</div>
          <p className="iv-hero-sub">Your personal Vedic guidance system — powered by ancient wisdom and modern AI. Diagnose karmic patterns, track your dharmic progress, and receive actionable remedies.</p>
          {latestScore && (
            <div className="iv-karma-strip">
              <div className="iv-ks-item"><div className="iv-ks-val">{latestScore}</div><div className="iv-ks-lbl">Karma Score</div></div>
              <div className="iv-ks-item"><div className="iv-ks-val">{karmaHistory.length}</div><div className="iv-ks-lbl">Days Tracked</div></div>
            </div>
          )}
        </div>

        {/* Nav grid */}
        <div className="iv-nav-section">
          <div className="iv-nav-grid">
            {NAV_CARDS.map(c => (
              <Link key={c.path} to={c.path} className={`iv-nav-card ${c.color}`}>
                <span className="iv-nc-icon">{c.icon}</span>
                <div className="iv-nc-tag">{c.tag}</div>
                <div className="iv-nc-name">{c.name}</div>
                <div className="iv-nc-desc">{c.desc}</div>
                <span className="iv-nc-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Diagnosis */}
        {!result && (
          <div className="iv-diag-section">
            <FeatureIntro
              className="mb-10"
              description="Explore the principles of karma and reflect on how your actions, intentions, and choices influence your personal journey. Know Your Karma offers a space to understand karmic concepts and discover meaningful guidance inspired by traditional spiritual wisdom."
              steps={[
                { title: "Share Your Situation", text: "Describe what is on your mind in your own words (Hindi, English or Hinglish), or tap an example below." },
                { title: "Explore Your Karma Insights", text: "Review the karmic pattern, soul lesson and suggested practices generated for you." },
                { title: "Reflect and Learn", text: "Use the insights as an opportunity for personal reflection and more mindful decision-making." },
              ]}
              disclaimer="Karma insights are spiritual guidance for reflection. They are AI-generated interpretations, not scientific fact, professional advice, or a prediction of what will happen."
            />
            <div className="iv-diag-inner">
              <div>
                <h2 className="iv-diag-heading">Know Your Karma</h2>
                <p className="iv-diag-sub">Share your situation in any language — Hindi, English, or Hinglish. Pandit Ji will diagnose the karmic root and prescribe exact remedies.</p>
                <div className="iv-diag-hints">
                  {HINTS.map((h, i) => (
                    <div key={i} className="iv-hint" onClick={() => onHintClick(h.text)} role="button" tabIndex={0} onKeyDown={e => e.key==="Enter" && onHintClick(h.text)}>
                      <span className="iv-hint-icon">{h.icon}</span>
                      <span className="iv-hint-txt">{h.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="iv-input-card">
                  <div className="iv-voice-row">
                    <button className={`iv-voice-btn${listening?" listening":""}`} onClick={startVoice}>
                      {listening ? "🔴 Listening..." : "🎙️ Speak"}
                    </button>
                    <span className="iv-char">{text.length} / 1500</span>
                  </div>
                  <textarea
                    className="iv-textarea"
                    placeholder="Apni situation batayein... What is weighing on your heart right now? Be honest and specific."
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, 1500))}
                  />
                  {loading ? (
                    <div className="iv-loading">
                      <div className="iv-loader" />
                      <div className="iv-loading-text">Pandit Ji is reading your karma...</div>
                    </div>
                  ) : (
                    <button className="iv-submit-btn" onClick={diagnose} disabled={text.trim().length < 10}>
                      ॐ &nbsp; Know My Karma
                    </button>
                  )}
                  {error && <div className="iv-err">⚠ {error}</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report */}
        {result && (
          <div className="iv-report-wrap">
            <div className="iv-container">
              <ReportView result={result} onReset={() => { setResult(null); setText(""); }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}