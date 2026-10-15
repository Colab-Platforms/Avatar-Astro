import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap";
if (!document.head.querySelector("link[href*='Cinzel']")) document.head.appendChild(fl);

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "openai/gpt-oss-120b";

async function callAI(system, user, maxTokens = 800) {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: GROQ_MODEL, temperature: 0.7, max_tokens: maxTokens, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return JSON.parse(d.choices?.[0]?.message?.content || "{}");
  } catch (e) { console.error("[Karma Journal] AI request failed:", e); return {}; }
}

const DASH_SYSTEM = `You are a Vedic karma AI. Return ONLY valid JSON:
{
  "karmaScore": 78,
  "dominantPattern": "Attachment",
  "patternInsight": "You may be holding on too tightly to people, outcomes or expectations. Practice letting go and trust the flow.",
  "patterns": [
    {"name":"Attachment","score":72,"color":"#BC6A4D","icon":"🔗"},
    {"name":"Anger","score":45,"color":"#ef4444","icon":"🔥"},
    {"name":"Responsibility","score":85,"color":"#BC6A4D","icon":"⚖️"},
    {"name":"Compassion","score":90,"color":"#ec4899","icon":"💛"},
    {"name":"Detachment","score":65,"color":"#BC6A4D","icon":"🌿"}
  ],
  "prompts": [
    {"id":1,"text":"I let go of expectations and trusted the process today.","icon":"☯️"},
    {"id":2,"text":"I reacted instead of responding in a tough situation.","icon":"⚡"},
    {"id":3,"text":"I acted with kindness without expecting anything in return.","icon":"💛"}
  ],
  "mantra": {
    "text": "I release what no longer serves me and trust the divine order of life.",
    "meaning": "Letting go creates space for peace, clarity and growth.",
    "source": "Bhagavad Gita, Chapter 2, Verse 47",
    "verse": "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
    "application": "Repeat in moments of stress to release attachment to outcomes.",
    "purpose": "Detachment & Inner Peace"
  },
  "action": "Practice non-attachment in one situation today. Let go of control and observe the results.",
  "actionImpact": "This reduces reactive patterns and builds lasting equanimity.",
  "aiReflectionPreview": "You are becoming more aware of your reactions and attachments. Keep practicing detachment and kindness in your daily actions."
}`;

const REFLECTION_SYSTEM = `Vedic karma AI. Based on 3 prompt responses, give a short reflection. Return ONLY JSON: {"summary":"2 sentences personalized reflection.","nextStep":"One specific suggestion for tomorrow."}`;
const EOD_SYSTEM = `Vedic karma end-of-day AI. Return ONLY JSON: {"summary":"2 sentence personal day summary.","aligned":"What was spiritually aligned.","improve":"One area to work on.","growth":"Encouraging soul insight."}`;

const FALLBACK = {
  karmaScore:78, dominantPattern:"Attachment",
  patternInsight:"You may be holding on too tightly to people, outcomes or expectations. Practice letting go and trust the flow.",
  patterns:[{name:"Attachment",score:72,color:"#BC6A4D",icon:"🔗"},{name:"Anger",score:45,color:"#ef4444",icon:"🔥"},{name:"Responsibility",score:85,color:"#BC6A4D",icon:"⚖️"},{name:"Compassion",score:90,color:"#ec4899",icon:"💛"},{name:"Detachment",score:65,color:"#BC6A4D",icon:"🌿"}],
  prompts:[{id:1,text:"I let go of expectations and trusted the process today.",icon:"☯️"},{id:2,text:"I reacted instead of responding in a tough situation.",icon:"⚡"},{id:3,text:"I acted with kindness without expecting anything in return.",icon:"💛"}],
  mantra:{text:"I release what no longer serves me and trust the divine order of life.",meaning:"Letting go creates space for peace, clarity and growth.",source:"Bhagavad Gita, Chapter 2, Verse 47",verse:"You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",application:"Repeat in moments of stress to release attachment to outcomes.",purpose:"Detachment & Inner Peace"},
  action:"Practice non-attachment in one situation today. Let go of control and observe the results.",
  actionImpact:"This reduces reactive patterns and builds lasting equanimity.",
  aiReflectionPreview:"You are becoming more aware of your reactions and attachments. Keep practicing detachment and kindness in your daily actions."
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#09090f;overflow-x:hidden;}

.kj{min-height:100vh;background:#09090f;color:#fff;font-family:'Astra','Iceland',sans-serif;}
.kj-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.55;}

/* Full-width page, no max-width constraint */
.kj-page{position:relative;z-index:1;max-width:1100px;margin:0 auto;}

/* Header — matches design: centered title, dark bg */
.kj-hdr{background:linear-gradient(180deg,rgba(188,106,77,.06) 0%,transparent 100%);padding:18px 24px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.06);}
.kj-back{font-size:16px;color:rgba(255,255,255,.75);text-decoration:none;font-family:'Astra','Iceland',sans-serif;letter-spacing:1px;}
.kj-back:hover{color:#BC6A4D;}
.kj-hdr-center{text-align:center;flex:1;}
.kj-hdr-title{font-family:'Astra','Iceland',sans-serif;font-size:19px;color:#BC6A4D;letter-spacing:.5px;}
.kj-hdr-sub{font-size:15px;color:#fff;margin-top:3px;}
.kj-hdr-date{font-size:15px;color:rgba(255,255,255,.8);font-family:'Astra','Iceland',sans-serif;background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.15);border-radius:50px;padding:4px 10px;white-space:nowrap;}

/* Content — full width with padding */
.kj-content{padding:0;}

/* Section wrapper — full width */
.kj-section{padding:20px 20px 0;}
.kj-section:last-child{padding-bottom:80px;}

/* Section label */
.kj-lbl{font-size:16px;font-family:'Astra','Iceland',sans-serif;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.85);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;}
.kj-lbl-right{font-size:15px;color:rgba(255,255,255,.8);letter-spacing:0;cursor:pointer;font-family:'Astra','Iceland',sans-serif;text-transform:none;}
.kj-lbl-right:hover{color:#BC6A4D;}

/* ── A. SCORE CARD — full width gold ── */
.kj-score-card{background:linear-gradient(135deg,rgba(188,106,77,.09) 0%,rgba(188,106,77,.07) 100%);border:1px solid rgba(188,106,77,.2);border-radius:18px;padding:24px;display:flex;align-items:center;gap:22px;position:relative;overflow:hidden;}
.kj-score-glow{position:absolute;right:-40px;top:-40px;width:180px;height:180px;background:radial-gradient(circle,rgba(188,106,77,.12) 0%,transparent 65%);pointer-events:none;}
.kj-ring-wrap{position:relative;flex-shrink:0;width:110px;height:110px;}
.kj-ring-svg{width:110px;height:110px;transform:rotate(-90deg);}
.kj-ring-bg{fill:none;stroke:rgba(255,255,255,.12);stroke-width:9;}
.kj-ring-fg{fill:none;stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1);}
.kj-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;line-height:1;}
.kj-ring-num{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#BC6A4D;line-height:1.1;}
.kj-ring-den{font-size:16px;color:#fff;font-family:'Astra','Iceland',sans-serif;}
.kj-ring-lbl{font-size:13px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:1px;}
.kj-score-info{flex:1;min-width:0;}
.kj-score-sub{font-size:15px;color:#fff;margin-bottom:4px;}
.kj-score-pattern{font-size:28px;font-weight:700;color:#fff;margin-bottom:10px;letter-spacing:-.3px;}
.kj-score-insight{font-size:15px;color:#fff;line-height:1.65;}
.kj-mandala-svg{width:90px;height:90px;flex-shrink:0;opacity:.85;animation:mspin 25s linear infinite;}
@keyframes mspin{to{transform:rotate(360deg);}}

/* ── B. REFLECTION PROMPTS — 3 equal columns ── */
.kj-prompts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
@media(max-width:620px){.kj-prompts{grid-template-columns:1fr;}}
.kj-prompt{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;transition:all .25s;}
.kj-prompt.done{border-color:rgba(188,106,77,.28);background:rgba(188,106,77,.05);}
.kj-pr-num{font-family:'Astra','Iceland',sans-serif;font-size:16px;color:#fff;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.kj-pr-icon{font-size:18px;}
.kj-pr-text{font-size:15px;color:#fff;line-height:1.6;margin-bottom:12px;min-height:58px;}
.kj-pr-resps{display:flex;flex-direction:column;gap:5px;}
.kj-resp{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:transparent;font-size:15px;color:#fff;cursor:pointer;transition:all .2s;text-align:left;font-family:'Astra','Iceland',sans-serif;width:100%;}
.kj-resp:hover{border-color:rgba(188,106,77,.35);color:#BC6A4D;}
.kj-resp.sel{background:rgba(188,106,77,.12);border-color:rgba(188,106,77,.42);color:#BC6A4D;font-weight:500;}
.kj-ai-box{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.22);border-radius:14px;padding:14px 16px;display:flex;gap:10px;align-items:flex-start;animation:fin .5s ease;}
@keyframes fin{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.kj-ai-star{color:#BC6A4D;font-size:15px;flex-shrink:0;margin-top:2px;}
.kj-ai-lbl{font-size:16px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#BC6A4D;margin-bottom:5px;}
.kj-ai-txt{font-size:15px;color:#fff;line-height:1.7;}
.kj-ai-next{font-size:16px;color:rgba(255,255,255,.8);margin-top:5px;font-style:italic;}
.kj-ai-placeholder{opacity:.4;}

/* ── C. PATTERN TRACKER — horizontal scroll chips ── */
.kj-pat-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;}
.kj-pat-scroll::-webkit-scrollbar{height:3px;}
.kj-pat-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
.kj-pat-chip{flex-shrink:0;width:110px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 10px;text-align:center;cursor:pointer;transition:all .2s;}
.kj-pat-chip:hover{border-color:rgba(255,255,255,.18);}
.kj-pat-icon{font-size:20px;margin-bottom:6px;display:block;}
.kj-pat-name{font-size:16px;color:#fff;font-weight:500;margin-bottom:6px;}
.kj-pat-track{height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;margin-bottom:4px;}
.kj-pat-fill{height:100%;border-radius:2px;transition:width 1.2s ease;}
.kj-pat-pct{font-size:16px;font-family:'Astra','Iceland',sans-serif;color:#fff;}
.kj-view-all{display:inline-flex;align-items:center;gap:5px;font-size:16px;color:rgba(255,255,255,.8);cursor:pointer;margin-top:10px;}
.kj-view-all:hover{color:#BC6A4D;}

/* ── D. MANTRA — full width warm gradient ── */
.kj-mantra-wrap{background:linear-gradient(135deg,rgba(30,18,6,.95) 0%,rgba(20,12,35,.95) 100%);border:1px solid rgba(188,106,77,.18);border-radius:18px;overflow:hidden;position:relative;}
.kj-mantra-haze{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(188,106,77,.08) 0%,transparent 70%);pointer-events:none;}
.kj-mantra-top{padding:18px 18px 14px;display:flex;align-items:flex-start;gap:14px;position:relative;}
.kj-lotus{width:54px;height:54px;flex-shrink:0;background:linear-gradient(135deg,rgba(188,106,77,.25),rgba(188,106,77,.25));border:1px solid rgba(188,106,77,.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 20px rgba(188,106,77,.2);}
.kj-mantra-text{font-family:'Astra','Iceland',sans-serif;font-size:19px;color:#fff;line-height:1.65;font-style:italic;}
.kj-mantra-meaning{font-size:15px;color:#fff;margin-top:6px;}
.kj-mantra-meaning strong{color:#BC6A4D;}
.kj-citation{background:rgba(188,106,77,.07);border-top:1px solid rgba(188,106,77,.15);padding:14px 18px;}
.kj-cit-lbl{font-size:13px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.8);margin-bottom:7px;}
.kj-cit-ref{font-size:16px;color:#BC6A4D;font-weight:600;margin-bottom:4px;}
.kj-cit-verse{font-size:16px;color:#fff;line-height:1.65;font-style:italic;margin-bottom:8px;}
.kj-cit-app{font-size:16px;color:#fff;line-height:1.6;padding-top:8px;border-top:1px solid rgba(188,106,77,.1);}
.kj-cit-app strong{color:rgba(188,106,77,.75);}
.kj-player{padding:12px 18px 16px;border-top:1px solid rgba(255,255,255,.05);}
.kj-player-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;}
.kj-play-btn{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;color:#09090f;flex-shrink:0;transition:all .25s;box-shadow:0 4px 14px rgba(188,106,77,.3);}
.kj-play-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(188,106,77,.45);}
.kj-waveform{flex:1;display:flex;align-items:center;gap:2px;height:28px;}
.kj-wbar{width:3px;border-radius:2px;background:rgba(188,106,77,.25);transition:height .15s ease,background .2s;}
.kj-wbar.a{background:#BC6A4D;}
.kj-player-time{font-size:16px;color:#fff;font-family:'Astra','Iceland',sans-serif;white-space:nowrap;}
.kj-player-ctrls{display:flex;gap:8px;}
.kj-pctrl{background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:5px 12px;font-size:15px;color:#fff;cursor:pointer;transition:all .2s;font-family:'Astra','Iceland',sans-serif;}
.kj-pctrl:hover,.kj-pctrl.on{border-color:rgba(188,106,77,.4);color:#BC6A4D;background:rgba(188,106,77,.08);}
.kj-understand-btn{width:100%;margin-top:10px;padding:8px;background:transparent;border:1px solid rgba(188,106,77,.22);border-radius:10px;font-size:16px;color:rgba(255,255,255,.85);cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .2s;}
.kj-understand-btn:hover{background:rgba(188,106,77,.1);color:#BC6A4D;}
.kj-up-panel{margin-top:10px;background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.15);border-radius:10px;padding:12px;animation:fin .35s ease;}
.kj-up-lbl{font-size:13px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#BC6A4D;margin-bottom:6px;}
.kj-up-txt{font-size:15px;color:#fff;line-height:1.7;}

/* ── E. KARMA ACTION ── */
.kj-action-card{background:rgba(188,106,77,.04);border:1px solid rgba(188,106,77,.15);border-radius:18px;padding:18px;}
.kj-action-row{display:flex;align-items:flex-start;gap:16px;margin-bottom:14px;}
.kj-action-body{flex:1;}
.kj-action-main{font-size:16px;color:#fff;line-height:1.7;margin-bottom:5px;}
.kj-action-impact{font-size:16px;color:#fff;font-style:italic;line-height:1.55;}
.kj-streak{text-align:center;flex-shrink:0;}
.kj-streak-lbl{font-size:16px;color:#BC6A4D;font-family:'Astra','Iceland',sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
.kj-streak-fire{font-size:22px;line-height:1;display:block;}
.kj-streak-num{font-family:'Astra','Iceland',sans-serif;font-size:26px;color:#BC6A4D;line-height:1;}
.kj-streak-days{font-size:16px;color:rgba(255,255,255,.8);font-family:'Astra','Iceland',sans-serif;}
.kj-check-btn{display:flex;align-items:center;gap:9px;padding:9px 16px;background:transparent;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:15px;color:#fff;cursor:pointer;transition:all .25s;font-family:'Astra','Iceland',sans-serif;}
.kj-check-btn:hover:not(:disabled){border-color:rgba(188,106,77,.4);color:#BC6A4D;}
.kj-check-btn.done{background:rgba(188,106,77,.09);border-color:rgba(188,106,77,.32);color:#BC6A4D;}
.kj-check-btn:disabled{cursor:default;}
.kj-chkbox{width:18px;height:18px;border-radius:5px;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.kj-check-btn.done .kj-chkbox{background:#BC6A4D;border-color:#BC6A4D;color:#09090f;}

/* ── F. TIMELINE ── */
.kj-tl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:520px){.kj-tl-grid{grid-template-columns:1fr;}}
.kj-tl-list{display:flex;flex-direction:column;gap:8px;}
.kj-tl-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;}
.kj-tl-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.kj-tl-icon{font-size:16px;flex-shrink:0;}
.kj-tl-name{font-size:15px;color:#fff;flex:1;}
.kj-tl-time{font-size:16px;color:#fff;font-family:'Astra','Iceland',sans-serif;white-space:nowrap;}
.kj-milestone{background:linear-gradient(135deg,rgba(188,106,77,.1),rgba(188,106,77,.08));border:1px solid rgba(188,106,77,.2);border-radius:16px;padding:18px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.kj-mile-lbl{font-size:16px;color:#BC6A4D;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;}
.kj-mile-icon{font-size:44px;margin-bottom:10px;filter:drop-shadow(0 0 16px rgba(188,106,77,.5));}
.kj-mile-name{font-family:'Astra','Iceland',sans-serif;font-size:16px;color:#fff;margin-bottom:4px;}
.kj-mile-sub{font-size:16px;color:#fff;}

/* ── G. EOD ── */
.kj-eod-card{background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:18px;}
.kj-eod-summary{font-size:16px;color:#fff;line-height:1.75;margin-bottom:14px;}
.kj-eod-empty{font-size:15px;color:#fff;font-style:italic;line-height:1.7;margin-bottom:14px;}
.kj-eod-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
@media(max-width:480px){.kj-eod-grid{grid-template-columns:1fr;}}
.kj-eod-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;}
.kj-eod-il{font-size:13px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;}
.kj-eod-il.g{color:rgba(255,255,255,.8);}
.kj-eod-il.a{color:rgba(255,255,255,.8);}
.kj-eod-iv{font-size:15px;color:#fff;line-height:1.55;}
.kj-eod-growth{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.15);border-radius:10px;padding:11px 13px;font-size:15px;color:#fff;line-height:1.7;font-style:italic;margin-bottom:12px;}
.kj-eod-preview{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.kj-eod-preview-txt{font-size:15px;color:#fff;line-height:1.65;flex:1;}
.kj-eod-orb{width:52px;height:52px;border-radius:50%;background:radial-gradient(circle,rgba(188,106,77,.5),rgba(188,106,77,.2));border:1px solid rgba(188,106,77,.3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;}
.kj-eod-btn{width:100%;margin-top:12px;padding:11px;background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.28);border-radius:12px;font-size:15px;color:#BC6A4D;font-weight:600;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:8px;}
.kj-eod-btn:hover:not(:disabled){background:rgba(188,106,77,.18);}
.kj-eod-btn:disabled{opacity:.45;cursor:default;}

/* Loading */
.kj-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;gap:14px;}
.kj-spin{width:44px;height:44px;border-radius:50%;border:2px solid rgba(188,106,77,.1);border-top-color:#BC6A4D;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.kj-load-t{font-family:'Astra','Iceland',sans-serif;font-size:16px;color:#BC6A4D;}
.kj-load-s{font-size:16px;color:#fff;font-style:italic;}

/* Divider between sections */
.kj-divider{height:1px;background:rgba(255,255,255,.05);margin:0 20px;}
`;

function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let W = window.innerWidth, H = window.innerHeight;
    c.width = W; c.height = H;
    const stars = Array.from({length:140},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.1+.15,op:Math.random()*.4+.07,ph:Math.random()*Math.PI*2,sp:Math.random()*.0007+.0003}));
    const shoots=[]; let t=0,st=0,raf;
    const spawnS=()=>shoots.push({x:Math.random()*W*.85,y:Math.random()*H*.35,len:100+Math.random()*130,speed:1.8+Math.random()*2.2,angle:Math.PI/5+Math.random()*.3,life:1});
    const frame=()=>{
      ctx.clearRect(0,0,W,H); t+=.016; st+=.016;
      if(st>5+Math.random()*5){spawnS();st=0;}
      stars.forEach(s=>{const o=s.op*(.6+.4*Math.sin(t*s.sp*60+s.ph));ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${o})`;ctx.fill();});
      for(let i=shoots.length-1;i>=0;i--){
        const s=shoots[i];s.x+=Math.cos(s.angle)*s.speed;s.y+=Math.sin(s.angle)*s.speed;s.life-=.008;
        if(s.life<=0){shoots.splice(i,1);continue;}
        const tx=s.x-Math.cos(s.angle)*s.len,ty=s.y-Math.sin(s.angle)*s.len;
        const g=ctx.createLinearGradient(tx,ty,s.x,s.y);
        g.addColorStop(0,"rgba(188,106,77,0)");g.addColorStop(.5,`rgba(188,106,77,${s.life*.3})`);g.addColorStop(1,`rgba(255,255,255,${s.life*.8})`);
        ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(s.x,s.y);ctx.strokeStyle=g;ctx.lineWidth=1.4;ctx.stroke();
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    const resize=()=>{W=window.innerWidth;H=window.innerHeight;c.width=W;c.height=H;};
    window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} className="kj-canvas"/>;
}

function ScoreRing({score}) {
  const r=46, circ=2*Math.PI*r, offset=circ-(score/100)*circ;
  const color=score>=70?"#BC6A4D":score>=50?"#BC6A4D":"#BC6A4D";
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{flexShrink:0}}>
      {/* Background ring */}
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="8"/>
      {/* Foreground ring - rotated from top */}
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 60 60)" style={{transition:"stroke-dashoffset 1.4s ease"}}/>
      {/* Score number - centered */}
      <text x="60" y="54" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="22" fontFamily="'Astra','Iceland',sans-serif" fontWeight="400">{score}</text>
      {/* /100 */}
      <text x="60" y="70" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,.55)" fontSize="10" fontFamily="'Astra','Iceland',sans-serif">/100</text>
      {/* Label */}
      <text x="60" y="83" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,.45)" fontSize="8" fontFamily="'Astra','Iceland',sans-serif" letterSpacing="1">KARMA</text>
    </svg>
  );
}

function Waveform({playing}) {
  const h=[4,7,13,19,15,9,17,22,14,8,18,24,16,11,6,20,12,17,8,14,19,7,15,10,5];
  return (
    <div className="kj-waveform">
      {h.map((v,i)=>(
        <div key={i} className={`kj-wbar${playing?" a":""}`}
          style={{height:playing?`${v}px`:"4px",transition:`height ${.08+i*.008}s ease`}}/>
      ))}
    </div>
  );
}

function MantraPlayer({text}) {
  const [playing,setPlaying]=useState(false);
  const [rate,setRate]=useState(1);
  const [showUp,setShowUp]=useState(false);
  const speak=(r)=>{
    window.speechSynthesis?.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.rate=r||rate;u.pitch=.9;u.volume=1;
    u.onend=()=>setPlaying(false);u.onerror=()=>setPlaying(false);
    window.speechSynthesis?.speak(u);setPlaying(true);
  };
  const stop=()=>{window.speechSynthesis?.cancel();setPlaying(false);};
  return (
    <div className="kj-player">
      <div className="kj-player-row">
        <button className="kj-play-btn" onClick={playing?stop:()=>speak()}>{playing?"⏸":"▶"}</button>
        <Waveform playing={playing}/>
        <span className="kj-player-time">0:15</span>
      </div>
      <div className="kj-player-ctrls">
        <button className={`kj-pctrl${rate===.6?" on":""}`} onClick={()=>{setRate(.6);if(playing){stop();speak(.6);}}}>🐢 Slow</button>
        <button className={`kj-pctrl${rate===1?" on":""}`} onClick={()=>{setRate(1);if(playing){stop();speak(1);}}}>▶ Normal</button>
        <button className="kj-pctrl" onClick={()=>{stop();speak();}}>↺ Repeat</button>
      </div>
      <button className="kj-understand-btn" onClick={()=>setShowUp(!showUp)}>
        {showUp?"▲ Hide context":"Understand Deeper →"}
      </button>
      {showUp&&(
        <div className="kj-up-panel">
          <div className="kj-up-lbl">Context & Application</div>
          <div className="kj-up-txt">This mantra shifts consciousness from result-attachment to process-engagement. Repeat during moments of anxiety or uncertainty. Most effective chanted at sunrise or before sleep for 21 consecutive days.</div>
        </div>
      )}
    </div>
  );
}

export default function InnerVoiceJournal() {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [refs,setRefs]=useState({});
  const [aiRef,setAiRef]=useState(null);
  const [loadingRef,setLoadingRef]=useState(false);
  const [actionDone,setActionDone]=useState(()=>{try{return JSON.parse(localStorage.getItem("kj_act_"+new Date().toDateString())||"false");}catch{return false;}});
  const [streak,setStreak]=useState(()=>{try{return parseInt(localStorage.getItem("kj_streak")||"0");}catch{return 0;}});
  const [eod,setEod]=useState(null);
  const [loadingEod,setLoadingEod]=useState(false);
  const today=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  useEffect(()=>{const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);return()=>document.head.removeChild(s);},[]);
  useEffect(()=>{init();},[]);

  const init=async()=>{
    setLoading(true);
    try{
      const entries=JSON.parse(localStorage.getItem("ivj_entries_v3")||"[]");
      const ctx=entries.slice(0,5).map(e=>e.text||"").join(". ")||"New user";
      const p=(()=>{try{return JSON.parse(localStorage.getItem("iv_profile")||"null");}catch{return null;}})();
      const d=await callAI(DASH_SYSTEM,`User context: ${ctx}. Sign: ${p?.sign||"Unknown"}`,1500);
      setData(Object.keys(d).length>0?d:FALLBACK);
    }catch{setData(FALLBACK);}
    finally{setLoading(false);}
  };

  const handleResp=async(id,resp)=>{
    const updated={...refs,[id]:resp};
    setRefs(updated);
    const allDone=data?.prompts?.every(p=>updated[p.id]);
    if(allDone&&!aiRef){
      setLoadingRef(true);
      try{
        const summary=data.prompts.map(p=>`"${p.text}": ${updated[p.id]}`).join("; ");
        const r=await callAI(REFLECTION_SYSTEM,`Responses: ${summary}`,400);
        setAiRef(r);
      }catch{}finally{setLoadingRef(false);}
    }
  };

  const markDone=()=>{
    setActionDone(true);
    localStorage.setItem("kj_act_"+new Date().toDateString(),"true");
    const ns=streak+1;setStreak(ns);localStorage.setItem("kj_streak",String(ns));
  };

  const genEod=async()=>{
    setLoadingEod(true);
    try{
      const r=await callAI(EOD_SYSTEM,`Pattern:${data?.dominantPattern}.Action:${actionDone}.Refs:${JSON.stringify(refs)}`,400);
      setEod(Object.keys(r).length>0?r:{summary:"You made conscious efforts toward awareness today.",aligned:"Morning reflection practice",improve:"Staying grounded under pressure",growth:"Every moment of awareness plants a seed for transformation."});
    }catch{setEod({summary:"You made conscious efforts toward awareness today.",aligned:"Morning reflection",improve:"Consistent practice",growth:"Every step forward matters."});}
    finally{setLoadingEod(false);}
  };

  const tl=[
    {icon:"🌅",name:"Morning Reflection Completed",time:"7:30 AM",color:"#BC6A4D"},
    {icon:"⚡",name:"Karma Action Completed",time:"1:20 PM",color:"#BC6A4D"},
    {icon:"🌙",name:"Evening Reflection Completed",time:"9:15 PM",color:"#BC6A4D"},
    {icon:"🤖",name:"AI Day Summary Generated",time:"9:30 PM",color:"#BC6A4D"},
  ];

  if(loading) return(
    <div className="kj"><style>{CSS}</style><StarCanvas/>
      <div className="kj-page"><div className="kj-loading"><div className="kj-spin"/><div className="kj-load-t">Reading Your Karma</div><div className="kj-load-s">Consulting cosmic patterns...</div></div></div>
    </div>
  );

  return(
    <div className="kj">
      <style>{CSS}</style>
      <StarCanvas/>
      <div className="kj-page">

        {/* Header */}
        <div className="kj-hdr">
          <Link to="/inner-voice" className="kj-back">← Inner Voice</Link>
          <div className="kj-hdr-center">
            <div className="kj-hdr-title">Karma Journal</div>
            <div className="kj-hdr-sub">Your daily space for reflection, awareness & action</div>
          </div>
          <div className="kj-hdr-date">{today}</div>
        </div>

        {/* ── A. KARMA SCORE DASHBOARD ── */}
        <div className="kj-section">
          <div className="kj-score-card">
            <div className="kj-score-glow"/>
            <ScoreRing score={data?.karmaScore||78}/>
            <div className="kj-score-info">
              <div className="kj-score-sub">Your dominant pattern today</div>
              <div className="kj-score-pattern">{data?.dominantPattern||"Attachment"}</div>
              <div className="kj-score-insight">{data?.patternInsight||""}</div>
            </div>
            <svg className="kj-mandala-svg" viewBox="0 0 100 100" fill="none">
              {[0,30,60,90,120,150,180,210,240,270,300,330].map(a=>(
                <g key={a}>
                  <line x1="50" y1="50" x2={50+44*Math.cos(a*Math.PI/180)} y2={50+44*Math.sin(a*Math.PI/180)} stroke="#BC6A4D" strokeWidth="1.2"/>
                  <circle cx={50+30*Math.cos(a*Math.PI/180)} cy={50+30*Math.sin(a*Math.PI/180)} r="2.5" fill="rgba(188,106,77,.9)"/>
                </g>
              ))}
              <circle cx="50" cy="50" r="44" stroke="#BC6A4D" strokeWidth="1"/>
              <circle cx="50" cy="50" r="30" stroke="#BC6A4D" strokeWidth="1"/>
              <circle cx="50" cy="50" r="15" stroke="#BC6A4D" strokeWidth="1"/>
              <circle cx="50" cy="50" r="5" fill="#BC6A4D"/>
            </svg>
          </div>
        </div>

        <div className="kj-divider" style={{margin:"16px 0 0"}}/>

        {/* ── B. TODAY'S KARMA REFLECTION ── */}
        <div className="kj-section" style={{paddingTop:20}}>
          <div className="kj-lbl">Today's Karma Reflection</div>
          <div className="kj-prompts">
            {(data?.prompts||[]).map((p,i)=>(
              <div key={p.id} className={`kj-prompt${refs[p.id]?" done":""}`}>
                <div className="kj-pr-num">{i+1} <span className="kj-pr-icon">{p.icon}</span></div>
                <div className="kj-pr-text">{p.text}</div>
                <div className="kj-pr-resps">
                  {["Strongly agree","Somewhat","Not really"].map(r=>(
                    <button key={r} className={`kj-resp${refs[p.id]===r?" sel":""}`} onClick={()=>handleResp(p.id,r)}>{r}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {loadingRef&&<div style={{textAlign:"center",padding:"10px 0",fontSize:13,color:"rgba(255,255,255,.8)",fontFamily:"'Astra','Iceland',sans-serif",letterSpacing:1}}>AI is reflecting...</div>}
          <div className={`kj-ai-box${!aiRef?" kj-ai-placeholder":""}`}>
            <div className="kj-ai-star">✦</div>
            <div>
              <div className="kj-ai-lbl">AI Reflection</div>
              <div className="kj-ai-txt">{aiRef?.summary||data?.aiReflectionPreview||"Answer all 3 prompts above to get your personalized AI reflection."}</div>
              {aiRef?.nextStep&&<div className="kj-ai-next">{aiRef.nextStep}</div>}
            </div>
          </div>
        </div>

        <div className="kj-divider" style={{margin:"20px 0 0"}}/>

        {/* ── C. KARMA PATTERN TRACKER ── */}
        <div className="kj-section" style={{paddingTop:20}}>
          <div className="kj-lbl">Karma Pattern Tracker <span className="kj-lbl-right">This Week ▾</span></div>
          <div className="kj-pat-scroll">
            {(data?.patterns||[]).map(p=>(
              <div key={p.name} className="kj-pat-chip">
                <span className="kj-pat-icon">{p.icon}</span>
                <div className="kj-pat-name">{p.name}</div>
                <div className="kj-pat-track"><div className="kj-pat-fill" style={{width:`${p.score}%`,background:p.color}}/></div>
                <div className="kj-pat-pct">{p.score}%</div>
              </div>
            ))}
          </div>
          <div className="kj-view-all">View all patterns →</div>
        </div>

        <div className="kj-divider" style={{margin:"20px 0 0"}}/>

        {/* ── D. TODAY'S KARMA MANTRA ── */}
        <div className="kj-section" style={{paddingTop:20}}>
          <div className="kj-lbl">Today's Karma Mantra <span className="kj-lbl-right">Understand Deeper →</span></div>
          <div className="kj-mantra-wrap">
            <div className="kj-mantra-haze"/>
            <div className="kj-mantra-top">
              <div className="kj-lotus">🪷</div>
              <div>
                <div className="kj-mantra-text">"{data?.mantra?.text}"</div>
                <div className="kj-mantra-meaning"><strong>Meaning:</strong> <span>{data?.mantra?.meaning}</span></div>
              </div>
            </div>
            {data?.mantra&&(
              <div className="kj-citation">
                <div className="kj-cit-lbl">📖 Scriptural Source</div>
                <div className="kj-cit-ref">{data.mantra.source}</div>
                <div className="kj-cit-verse">"{data.mantra.verse}"</div>
                <div className="kj-cit-app"><strong>How to use:</strong> {data.mantra.application}</div>
              </div>
            )}
            <MantraPlayer text={data?.mantra?.text||""}/>
          </div>
        </div>

        <div className="kj-divider" style={{margin:"20px 0 0"}}/>

        {/* ── E. KARMA ACTION FOR TODAY ── */}
        <div className="kj-section" style={{paddingTop:20}}>
          <div className="kj-lbl" style={{color:"rgba(255,255,255,.85)"}}>Karma Action for Today</div>
          <div className="kj-action-card">
            <div className="kj-action-row">
              <div className="kj-action-body">
                <div className="kj-action-main">{data?.action}</div>
                <div className="kj-action-impact">{data?.actionImpact}</div>
              </div>
              <div className="kj-streak">
                <div className="kj-streak-lbl">Streak</div>
                <span className="kj-streak-fire">🔥</span>
                <div className="kj-streak-num">{streak}</div>
                <div className="kj-streak-days">days</div>
              </div>
            </div>
            <button className={`kj-check-btn${actionDone?" done":""}`} onClick={!actionDone?markDone:undefined} disabled={actionDone}>
              <div className="kj-chkbox">{actionDone?"✓":""}</div>
              {actionDone?"Completed Today ✓":"Mark as Completed"}
            </button>
          </div>
        </div>

        <div className="kj-divider" style={{margin:"20px 0 0"}}/>

        {/* ── F. DAILY KARMA TIMELINE ── */}
        <div className="kj-section" style={{paddingTop:20}}>
          <div className="kj-lbl">Daily Karma Timeline</div>
          <div className="kj-tl-grid">
            <div className="kj-tl-list">
              {tl.map((t,i)=>(
                <div key={i} className="kj-tl-item">
                  <div className="kj-tl-dot" style={{background:t.color}}/>
                  <div className="kj-tl-icon">{t.icon}</div>
                  <div className="kj-tl-name">{t.name}</div>
                  <div className="kj-tl-time">{t.time}</div>
                </div>
              ))}
            </div>
            <div className="kj-milestone">
              <div className="kj-mile-lbl">Milestone Unlocked!</div>
              <div className="kj-mile-icon">🪷</div>
              <div className="kj-mile-name">{streak} Days of Awareness</div>
              <div className="kj-mile-sub">Keep going!</div>
            </div>
          </div>
        </div>

        <div className="kj-divider" style={{margin:"20px 0 0"}}/>

        {/* ── G. AI KARMA REFLECTION (EOD) ── */}
        <div className="kj-section" style={{paddingTop:20,paddingBottom:80}}>
          <div className="kj-lbl">AI Karma Reflection (End of Day)</div>
          <div className="kj-eod-card">
            {eod?(
              <>
                <div className="kj-eod-summary">{eod.summary}</div>
                <div className="kj-eod-grid">
                  <div className="kj-eod-item"><div className="kj-eod-il g">✅ What was aligned</div><div className="kj-eod-iv">{eod.aligned}</div></div>
                  <div className="kj-eod-item"><div className="kj-eod-il a">⚡ What can improve</div><div className="kj-eod-iv">{eod.improve}</div></div>
                </div>
                <div className="kj-eod-growth">{eod.growth}</div>
                <button className="kj-eod-btn" onClick={()=>setEod(null)}>↺ Refresh Summary</button>
              </>
            ):(
              <>
                <div className="kj-eod-preview">
                  <div className="kj-eod-preview-txt">You showed awareness in your reactions today and made conscious choices. With more detachment, you will feel lighter and more peaceful.</div>
                  <div className="kj-eod-orb">🌀</div>
                </div>
                <button className="kj-eod-btn" onClick={genEod} disabled={loadingEod}>
                  {loadingEod?"Generating your reflection...":"View Full Summary →"}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}