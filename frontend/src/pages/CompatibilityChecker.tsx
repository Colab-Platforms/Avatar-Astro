// import { useState, useEffect, useRef, useCallback } from "react";
// import { useBackOverride } from "../context/NavigationContext";

// const fontLink = document.createElement("link");
// fontLink.rel = "stylesheet";
// fontLink.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap";
// document.head.appendChild(fontLink);

// const css = `
//   :root {
//     --void: #03010a;
//     --deep: #07030f;
//     --nebula: #F0DFC7;
//     --aurora-1: #592209;
//     --aurora-2: #592209;
//     --aurora-3: #592209;
//     --gold: #592209;
//     --stardust: rgba(89,34,9,0.05);
//     --glass: rgba(89,34,9,0.05);
//     --glass-border: rgba(89,34,9,0.2);
//     --font-display: 'DM Sans', system-ui, sans-serif;
//     --font-body: 'DM Sans', system-ui, sans-serif;
//     --font-mono: 'DM Sans', system-ui, sans-serif;
//   }
//   * { box-sizing: border-box; margin: 0; padding: 0; }
//   .universe-app {
//     min-height: 100vh; background: var(--void); color: #301607;
//     font-family: var(--font-body); font-size: 18px; overflow-x: hidden; position: relative;
//   }
//   .starfield { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
//   .star { position: absolute; border-radius: 50%; background: rgba(89,34,9,0.25); animation: twinkle var(--d,3s) ease-in-out infinite; animation-delay: var(--delay,0s); opacity: var(--op,0.6); }
//   @keyframes twinkle { 0%,100%{opacity:var(--op,0.6);transform:scale(1);}50%{opacity:0.1;transform:scale(0.5);} }
//   .nebula-blob { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; animation: drift 20s ease-in-out infinite alternate; }
//   @keyframes drift { from{transform:translate(0,0) scale(1);}to{transform:translate(40px,30px) scale(1.1);} }
//   .content { position: relative; z-index: 1; }
//   .header { text-align: center; padding: 60px 20px 40px; }
//   .header-tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: 6px; color: var(--aurora-3); text-transform: uppercase; margin-bottom: 16px; opacity: 0.8; }
//   .header h1 { font-family: var(--font-display); font-size: clamp(22px,4vw,44px); font-weight: 900; background: linear-gradient(135deg,var(--gold) 0%,var(--aurora-2) 40%,var(--aurora-1) 80%,var(--aurora-3) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2; margin-bottom: 12px; }
//   .header p { color: #301607; font-size: 17px; font-style: italic; letter-spacing: 0.5px; }
//   .form-container { max-width: 900px; margin: 0 auto; padding: 0 20px 60px; }
//   .persons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
//   @media(max-width:680px){.persons-grid{grid-template-columns:1fr;}}
//   .person-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; padding: 28px 24px; backdrop-filter: blur(16px); position: relative; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s; }
//   .person-card::before { content:''; position:absolute; inset:0; background:var(--grad); opacity:0.04; pointer-events:none; }
//   .person-card:hover { border-color: rgba(89,34,9,0.3); box-shadow: 0 0 40px rgba(89,34,9,0.15); }
//   .card-title { font-family: var(--font-display); font-size: 13px; letter-spacing: 2px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
//   .card-icon { font-size: 20px; }
//   .field { margin-bottom: 16px; }
//   .field label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: rgba(48,22,7,1); text-transform: uppercase; display: block; margin-bottom: 6px; }
//   .field input,.field select { width:100%; background:rgba(89,34,9,0.05); border:1px solid rgba(89,34,9,0.05); border-radius:10px; padding:11px 14px; color:#301607; font-family:var(--font-body); font-size:16px; outline:none; transition:border 0.3s,box-shadow 0.3s; -webkit-appearance:none; }
//   .field input:focus,.field select:focus { border-color:var(--aurora-1); box-shadow:0 0 0 3px rgba(89,34,9,0.15); }
//   .field input::placeholder { color:rgba(48,22,7,0.75); }
//   .field select option { background:#FBF5EC; }
//   .date-row { display:grid; grid-template-columns:2fr 2fr 3fr; gap:8px; }
//   .time-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
//   .place-wrap { position:relative; }
//   .place-dropdown { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#FBF5EC; border:1px solid rgba(89,34,9,0.4); border-radius:10px; z-index:100; overflow:hidden; box-shadow:0 20px 60px rgba(89,34,9,0.2); }
//   .place-item { padding:10px 14px; cursor:pointer; font-size:15px; color:#301607; transition:background 0.2s; border-bottom:1px solid rgba(89,34,9,0.05); }
//   .place-item:hover { background:rgba(89,34,9,0.08); }
//   .place-item small { display:block; font-size:12px; color:#301607; margin-top:2px; font-family:var(--font-mono); }
//   .submit-btn { display:block; width:100%; max-width:400px; margin:0 auto; padding:18px 40px; background:linear-gradient(135deg,var(--aurora-1),var(--aurora-2)); border:none; border-radius:50px; color:#F5E9D6; font-family:var(--font-display); font-size:14px; letter-spacing:2px; cursor:pointer; position:relative; overflow:hidden; transition:transform 0.2s,box-shadow 0.3s; text-transform:uppercase; }
//   .submit-btn:hover { transform:translateY(-2px); box-shadow:0 20px 60px rgba(89,34,9,0.4); }
//   .submit-btn:active { transform:translateY(0); }
//   .submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
//   .loading-screen { position:fixed; inset:0; background:var(--void); z-index:200; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px; }
//   .loading-cosmos { width:180px; height:180px; position:relative; }
//   .orbit-ring { position:absolute; border-radius:50%; border:1px solid transparent; animation:orbit-spin linear infinite; }
//   .orbit-ring:nth-child(1){inset:0;border-color:rgba(89,34,9,0.5);animation-duration:4s;}
//   .orbit-ring:nth-child(2){inset:20px;border-color:rgba(89,34,9,0.5);animation-duration:3s;animation-direction:reverse;}
//   .orbit-ring:nth-child(3){inset:40px;border-color:rgba(89,34,9,0.5);animation-duration:5s;}
//   .orbit-dot { position:absolute; width:8px; height:8px; border-radius:50%; top:-4px; left:50%; transform:translateX(-50%); }
//   @keyframes orbit-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
//   .orbit-center { position:absolute; inset:60px; border-radius:50%; background:radial-gradient(circle,var(--aurora-1),var(--aurora-2)); display:flex; align-items:center; justify-content:center; font-size:24px; animation:pulse-glow 2s ease-in-out infinite; }
//   @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(89,34,9,0.5);}50%{box-shadow:0 0 60px rgba(89,34,9,0.8),0 0 100px rgba(89,34,9,0.4);}}
//   .loading-steps { display:flex; flex-direction:column; gap:10px; text-align:center; }
//   .loading-step { font-family:var(--font-mono); font-size:12px; letter-spacing:2px; color:#301607; transition:color 0.5s,opacity 0.5s; display:flex; align-items:center; gap:10px; justify-content:center; }
//   .loading-step.active { color:var(--aurora-3); text-shadow:0 0 20px var(--aurora-3); }
//   .loading-step.done { color:var(--gold); }
//   .step-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
//   .results { max-width: 1000px; margin: 0 auto; padding: 20px 20px 80px; }

//   /* ── COUPLE HEADER — LARGE VISIBLE NAMES ── */
//   .couple-header { text-align:center; padding:50px 20px 44px; }
//   .couple-names {
//     font-family: var(--font-display);
//     font-size: clamp(16px, 3.5vw, 48px);
//     background: linear-gradient(135deg,var(--gold) 0%,var(--aurora-2) 45%,var(--aurora-1) 80%,var(--aurora-3) 100%);
//     -webkit-background-clip: text;
//     -webkit-text-fill-color: transparent;
//     background-clip: text;
//     margin-bottom: 16px;
//     display: block;
//     filter: drop-shadow(0 0 28px rgba(89,34,9,0.5));
//     line-height: 1.3;
//     white-space: nowrap;
//     overflow: hidden;
//     text-overflow: ellipsis;
//     max-width: 100%;
//   }
//   .couple-sub { font-family:var(--font-mono); font-size:12px; letter-spacing:4px; color:rgba(48,22,7,0.9); text-transform:uppercase; display:block; }

//   /* ── SCORE CIRCLE ── */
//   .score-hero { display:flex; justify-content:center; margin-bottom:48px; }
//   .score-circle-wrap { text-align:center; }
//   .score-circle { width:200px; height:200px; display:grid; place-items:center; margin:0 auto 16px; position:relative; }
//   .score-svg { width:200px; height:200px; transform:rotate(-90deg); position:absolute; top:0; left:0; }
//   .score-track { fill:none; stroke:rgba(89,34,9,0.05); stroke-width:10; }
//   .score-fill { fill:none; stroke-width:10; stroke-linecap:round; stroke:url(#scoreGrad); }
//   .score-inner { display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; z-index:10; }
//   .score-num { font-family:var(--font-display); font-size:54px; font-weight:900; color:#592209; line-height:1; display:block; text-shadow:0 0 32px rgba(89,34,9,0.7); }
//   .score-pct { font-family:var(--font-mono); font-size:18px; color:rgba(48,22,7,1); margin-top:4px; display:block; }
//   .score-label { font-family:var(--font-display); font-size:15px; letter-spacing:2px; color:var(--gold); margin-bottom:4px; }
//   .score-tag { font-family:var(--font-mono); font-size:11px; letter-spacing:3px; color:#301607; text-transform:uppercase; }
//   .section-head { font-family:var(--font-display); font-size:13px; letter-spacing:3px; color:var(--aurora-3); text-transform:uppercase; margin-bottom:20px; display:flex; align-items:center; gap:12px; }
//   .section-head::after { content:''; flex:1; height:1px; background:linear-gradient(to right,rgba(89,34,9,0.08),transparent); }
//   .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-bottom:40px; }

//   /* ── COMPAT CARD — HOVER GLOW ── */
//   .compat-card {
//     background: var(--glass);
//     border: 1px solid var(--glass-border);
//     border-radius: 16px;
//     padding: 20px;
//     backdrop-filter: blur(12px);
//     transition: transform 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease;
//     position: relative;
//     overflow: hidden;
//     cursor: pointer;
//   }
//   .compat-card::after {
//     content: "";
//     position: absolute;
//     inset: 0;
//     opacity: 0;
//     transition: opacity 0.35s ease;
//     z-index: 0;
//     pointer-events: none;
//     border-radius: 16px;
//     background: var(--hov, linear-gradient(135deg,rgba(89,34,9,0.08),rgba(89,34,9,0.08)));
//   }
//   .compat-card:hover::after { opacity: 1; }
//   .compat-card:hover {
//     transform: translateY(-8px) scale(1.025);
//     border-color: rgba(89,34,9,0.3);
//     box-shadow: 0 24px 70px var(--hov-shadow, rgba(89,34,9,.45)), 0 0 50px rgba(89,34,9,.2);
//   }
//   .compat-card > * { position: relative; z-index: 1; }

//   .card-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
//   .card-emoji { font-size:22px; }
//   .card-name { font-family:var(--font-display); font-size:12px; letter-spacing:1px; color:#301607; flex:1; }
//   .card-score-num { font-family:var(--font-mono); font-size:18px; font-weight:700; color:var(--gold); }
//   .prog-bar { height:6px; background:rgba(89,34,9,0.2); border-radius:3px; overflow:hidden; margin-bottom:8px; }
//   .prog-fill { height:100%; border-radius:3px; background:var(--bar-color,linear-gradient(to right,var(--aurora-1),var(--aurora-2))); transition:width 1.5s cubic-bezier(0.4,0,0.2,1); width:0; }
//   .prog-fill.animate { width:var(--target-width,0%); }
//   .prog-label { display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:#301607; letter-spacing:1px; }
//   .sub-metrics { display:flex; flex-direction:column; gap:10px; }
//   .sub-metric-row { display:flex; align-items:center; gap:10px; }
//   .sub-metric-label { font-size:13px; color:rgba(48,22,7,1); width:130px; flex-shrink:0; font-style:italic; }
//   .sub-metric-bar { flex:1; height:4px; background:rgba(89,34,9,0.2); border-radius:2px; overflow:hidden; }
//   .sub-metric-fill { height:100%; border-radius:2px; background:var(--fill-c,var(--aurora-3)); transition:width 1.8s cubic-bezier(0.4,0,0.2,1); width:0; }
//   .sub-metric-fill.animate { width:var(--w,0%); }
//   .sub-metric-val { font-family:var(--font-mono); font-size:11px; color:var(--fill-c,var(--aurora-3)); width:32px; text-align:right; }
//   .insight-box { background:rgba(89,34,9,0.08); border:1px solid rgba(89,34,9,0.25); border-radius:12px; padding:14px 16px; margin-top:12px; font-size:14px; font-style:italic; color:#301607; line-height:1.6; }
//   .insight-label { font-family:var(--font-mono); font-size:9px; letter-spacing:3px; color:var(--aurora-1); text-transform:uppercase; margin-bottom:6px; }
//   .planet-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:12px; margin-bottom:40px; }
//   .planet-item { background:var(--glass); border:1px solid var(--glass-border); border-radius:14px; padding:14px 10px; text-align:center; backdrop-filter:blur(8px); transition:transform 0.2s; }
//   .planet-item:hover { transform:translateY(-4px); }
//   .planet-symbol { font-size:28px; margin-bottom:6px; }
//   .planet-name { font-family:var(--font-mono); font-size:9px; letter-spacing:2px; color:#301607; text-transform:uppercase; margin-bottom:6px; }
//   .planet-score { font-family:var(--font-display); font-size:16px; color:var(--gold); }
//   .timeline { position:relative; padding:20px 0 20px 30px; margin-bottom:40px; }
//   .timeline::before { content:''; position:absolute; left:8px; top:0; bottom:0; width:2px; background:linear-gradient(to bottom,var(--aurora-1),var(--aurora-2),var(--aurora-3)); }
//   .tl-item { position:relative; margin-bottom:20px; padding-left:20px; }
//   .tl-dot { position:absolute; left:-26px; top:6px; width:12px; height:12px; border-radius:50%; background:var(--dot-c,var(--aurora-1)); border:2px solid var(--void); box-shadow:0 0 12px var(--dot-c,var(--aurora-1)); }
//   .tl-phase { font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--dot-c,var(--aurora-1)); text-transform:uppercase; margin-bottom:3px; }
//   .tl-desc { font-size:14px; color:rgba(48,22,7,1); font-style:italic; }
//   .flags-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:40px; }
//   @media(max-width:600px){.flags-grid{grid-template-columns:1fr;}}
//   .flags-col { background:var(--glass); border:1px solid var(--glass-border); border-radius:16px; padding:20px; }
//   .flags-col-title { font-family:var(--font-mono); font-size:10px; letter-spacing:3px; text-transform:uppercase; margin-bottom:14px; }
//   .flag-item { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; font-size:14px; color:#301607; font-style:italic; }
//   .flag-icon { flex-shrink:0; font-size:16px; }
//   .ai-insights-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; margin-bottom:40px; }
//   .ai-card { background:linear-gradient(135deg,rgba(89,34,9,0.08),rgba(89,34,9,0.05)); border:1px solid rgba(89,34,9,0.2); border-radius:14px; padding:18px; }
//   .ai-card-title { font-family:var(--font-mono); font-size:10px; letter-spacing:3px; color:var(--aurora-1); text-transform:uppercase; margin-bottom:10px; }
//   .ai-card-text { font-size:15px; color:#301607; line-height:1.65; font-style:italic; }
//   .reset-btn { display:block; margin:0 auto; padding:14px 40px; background:transparent; border:1px solid rgba(89,34,9,0.1); border-radius:50px; color:rgba(48,22,7,0.75); font-family:var(--font-mono); font-size:11px; letter-spacing:3px; text-transform:uppercase; cursor:pointer; transition:all 0.3s; }
//   .reset-btn:hover { border-color:var(--aurora-1); color:var(--aurora-3); box-shadow:0 0 30px rgba(89,34,9,0.2); }
//   .error-box { background:rgba(89,34,9,0.1); border:1px solid rgba(89,34,9,0.3); border-radius:12px; padding:14px 18px; color:#592209; font-family:var(--font-mono); font-size:12px; letter-spacing:1px; margin-bottom:20px; text-align:center; }
//   ::-webkit-scrollbar { width:6px; }
//   ::-webkit-scrollbar-track { background:var(--void); }
//   ::-webkit-scrollbar-thumb { background:rgba(89,34,9,0.4); border-radius:3px; }

//   /* ── WHO LOVES MORE ── */
//   .wlm-wrap { margin-bottom: 40px; }
//   .wlm-card {
//     background: linear-gradient(135deg, rgba(89,34,9,0.07), rgba(89,34,9,0.07));
//     border: 1px solid rgba(89,34,9,.25);
//     border-radius: 20px;
//     padding: 28px 24px;
//     position: relative;
//     overflow: hidden;
//   }
//   .wlm-card::before {
//     content: "♥";
//     position: absolute;
//     right: 24px; top: 16px;
//     font-size: 80px;
//     color: rgba(48,22,7,0.75);
//     line-height: 1;
//   }
//   .wlm-disclaimer {
//     font-family: var(--font-mono);
//     font-size: 9px;
//     letter-spacing: 2px;
//     color: rgba(48,22,7,0.72);
//     text-transform: uppercase;
//     margin-bottom: 20px;
//     text-align: center;
//   }
//   .wlm-persons { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
//   @media(max-width:560px){ .wlm-persons { grid-template-columns: 1fr; } }
//   .wlm-person { text-align: center; }
//   .wlm-person-name {
//     font-family: var(--font-display);
//     font-size: 14px;
//     letter-spacing: 1px;
//     margin-bottom: 14px;
//     white-space: nowrap;
//     overflow: hidden;
//     text-overflow: ellipsis;
//   }
//   .wlm-ring-wrap {
//     width: 130px;
//     height: 130px;
//     position: relative;
//     margin: 0 auto 14px;
//   }
//   .wlm-ring-svg { width: 130px; height: 130px; transform: rotate(-90deg); position: absolute; top:0; left:0; }
//   .wlm-ring-bg { fill: none; stroke: rgba(89,34,9,0.05); stroke-width: 10; }
//   .wlm-ring-fg { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1); }
//   .wlm-ring-inner {
//     position: absolute; inset: 0;
//     display: flex; flex-direction: column;
//     align-items: center; justify-content: center;
//     gap: 0;
//   }
//   .wlm-pct-num {
//     font-family: var(--font-display);
//     font-size: 30px;
//     font-weight: 900;
//     line-height: 1;
//   }
//   .wlm-pct-sym { font-size: 14px; color: rgba(48,22,7,0.85); font-family: var(--font-mono); margin-top: 2px; }
//   .wlm-label {
//     font-family: var(--font-mono);
//     font-size: 10px;
//     letter-spacing: 2px;
//     text-transform: uppercase;
//     color: rgba(48,22,7,0.75);
//     margin-bottom: 6px;
//   }
//   .wlm-bar-wrap { height: 6px; background: rgba(89,34,9,0.2); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
//   .wlm-bar-fill { height: 100%; border-radius: 3px; transition: width 1.8s cubic-bezier(.4,0,.2,1); width: 0; }
//   .wlm-bar-fill.animate { width: var(--w, 0%); }
//   .wlm-intensity-label {
//     font-size: 12px;
//     font-style: italic;
//     color: rgba(48,22,7,0.8);
//     font-family: var(--font-body);
//     margin-top: 4px;
//   }
//   .wlm-vs {
//     position: relative;
//     height: 6px;
//     background: rgba(89,34,9,0.05);
//     border-radius: 3px;
//     overflow: hidden;
//     margin: 8px 0 20px;
//   }
//   .wlm-vs-fill1 { position: absolute; left: 0; top: 0; height: 100%; border-radius: 3px 0 0 3px; transition: width 1.8s cubic-bezier(.4,0,.2,1); }
//   .wlm-vs-fill2 { position: absolute; right: 0; top: 0; height: 100%; border-radius: 0 3px 3px 0; transition: width 1.8s cubic-bezier(.4,0,.2,1); }
//   .wlm-vs-labels { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: rgba(48,22,7,0.72); margin-bottom: 4px; }
//   .wlm-insight {
//     background: rgba(89,34,9,0.08);
//     border: 1px solid rgba(89,34,9,.18);
//     border-radius: 12px;
//     padding: 14px 16px;
//     margin-bottom: 14px;
//   }
//   .wlm-insight-lbl { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #592209; margin-bottom: 6px; }
//   .wlm-insight-txt { font-size: 14px; color: rgba(48,22,7,1); line-height: 1.7; font-style: italic; }
//   .wlm-pattern-badge {
//     display: inline-flex;
//     align-items: center;
//     gap: 8px;
//     background: rgba(89,34,9,0.08);
//     border: 1px solid rgba(89,34,9,.25);
//     border-radius: 50px;
//     padding: 6px 16px;
//     font-family: var(--font-mono);
//     font-size: 10px;
//     letter-spacing: 2px;
//     text-transform: uppercase;
//     color: #592209;
//     margin-bottom: 14px;
//   }
//   .wlm-confidence {
//     display: flex;
//     align-items: center;
//     gap: 10px;
//     font-family: var(--font-mono);
//     font-size: 10px;
//     color: rgba(48,22,7,0.72);
//     letter-spacing: 1px;
//     text-transform: uppercase;
//     margin-top: 4px;
//   }
//   .wlm-conf-bar { flex: 1; height: 3px; background: rgba(89,34,9,0.2); border-radius: 2px; overflow: hidden; }
//   .wlm-conf-fill { height: 100%; background: #F5E9D6; border-radius: 2px; transition: width 2s ease; width: 0; }
//   .wlm-conf-fill.animate { width: var(--w, 0%); }

// `;

// const styleEl = document.createElement("style");
// styleEl.textContent = css;
// document.head.appendChild(styleEl);

// async function fetchCompatibilityReport(p1, p2, scores) {
//   const res = await fetch("/api/compatibility/analyze", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ p1, p2, scores }),
//   });
//   if (!res.ok) throw new Error(`Backend error: ${res.status}`);
//   return res.json();
// }

// const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const YEARS = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i);
// const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
// const MINS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// function getZodiac(day, month) {
//   const signs = [
//     ["Capricorn",1,19],["Aquarius",2,18],["Pisces",3,20],["Aries",4,19],
//     ["Taurus",5,20],["Gemini",6,20],["Cancer",7,22],["Leo",8,22],
//     ["Virgo",9,22],["Libra",10,22],["Scorpio",11,21],["Sagittarius",12,21],["Capricorn",12,31]
//   ];
//   for (const [s, m, d] of signs) if (month < m || (month === m && day <= d)) return s;
//   return "Capricorn";
// }

// function getLifePath(dob) {
//   const digits = dob.replace(/-/g, "").split("").map(Number);
//   let sum = digits.reduce((a, b) => a + b, 0);
//   while (sum > 9 && sum !== 11 && sum !== 22) {
//     sum = String(sum).split("").map(Number).reduce((a, b) => a + b, 0);
//   }
//   return sum;
// }

// function deriveScore(base, name1, name2, seed) {
//   const n = (name1 + name2 + seed).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
//   return Math.min(99, Math.max(52, base + (n % 20) - 10));
// }

// async function searchPlaces(q) {
//   if (!q || q.length < 2) return [];
//   const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
//   const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "SpiritualAIApp/1.0" } });
//   const data = await res.json();
//   return data.map(d => ({
//     display: d.display_name.split(",").slice(0, 3).join(", "),
//     city: d.address?.city || d.address?.town || d.address?.village || d.name,
//     state: d.address?.state || "",
//     country: d.address?.country || "",
//     lat: parseFloat(d.lat),
//     lon: parseFloat(d.lon),
//   }));
// }

// function Starfield() {
//   const stars = Array.from({ length: 120 }, (_, i) => ({
//     id: i, x: Math.random() * 100, y: Math.random() * 100,
//     size: Math.random() * 2.5 + 0.5,
//     d: (Math.random() * 4 + 2).toFixed(1),
//     delay: (Math.random() * 6).toFixed(2),
//     op: (Math.random() * 0.6 + 0.2).toFixed(2),
//   }));
//   return (
//     <div className="starfield">
//       {stars.map(s => (
//         <div key={s.id} className="star" style={{ left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, "--d":`${s.d}s`, "--delay":`${s.delay}s`, "--op":s.op }} />
//       ))}
//     </div>
//   );
// }

// function ProgBar({ value, color }) {
//   const ref = useRef(null);
//   useEffect(() => { const el = ref.current; if (!el) return; setTimeout(() => el.classList.add("animate"), 100); }, []);
//   return (
//     <div className="prog-bar">
//       <div ref={ref} className="prog-fill" style={{ "--target-width":`${value}%`, "--bar-color":color || undefined }} />
//     </div>
//   );
// }

// function SubMetric({ label, value, color }) {
//   const ref = useRef(null);
//   useEffect(() => { const el = ref.current; if (!el) return; setTimeout(() => el.classList.add("animate"), 200); }, []);
//   return (
//     <div className="sub-metric-row">
//       <div className="sub-metric-label">{label}</div>
//       <div className="sub-metric-bar">
//         <div ref={ref} className="sub-metric-fill" style={{ "--w":`${value}%`, "--fill-c":color || "var(--aurora-3)" }} />
//       </div>
//       <div className="sub-metric-val" style={{ color: color || "var(--aurora-3)" }}>{value}%</div>
//     </div>
//   );
// }

// function ScoreCircle({ score }) {
//   const r = 80, circ = 2 * Math.PI * r;
//   const [offset, setOffset] = useState(circ);
//   useEffect(() => { setTimeout(() => setOffset(circ - (score / 100) * circ), 200); }, [score, circ]);
//   const medal = score >= 90 ? "✨ Cosmic Soulmates" : score >= 75 ? "💫 Stellar Match" : score >= 60 ? "⭐ Promising Pair" : "🌙 Growing Bond";
//   return (
//     <div className="score-circle-wrap">
//       <div className="score-circle">
//         <svg className="score-svg" viewBox="0 0 180 180">
//           <defs>
//             <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
//               <stop offset="0%" stopColor="#592209" />
//               <stop offset="50%" stopColor="#592209" />
//               <stop offset="100%" stopColor="#592209" />
//             </linearGradient>
//           </defs>
//           <circle className="score-track" cx="90" cy="90" r={r} />
//           <circle className="score-fill" cx="90" cy="90" r={r} strokeDasharray={circ} strokeDashoffset={offset} style={{ transition:"stroke-dashoffset 2s cubic-bezier(0.4,0,0.2,1)" }} />
//         </svg>
//         <div className="score-inner">
//           <span className="score-num">{score}</span>
//           <span className="score-pct">%</span>
//         </div>
//       </div>
//       <div className="score-label">{medal}</div>
//       <div className="score-tag">Overall Compatibility</div>
//     </div>
//   );
// }

// function PlaceInput({ value, onChange }) {
//   const [query, setQuery] = useState(value?.display || "");
//   const [results, setResults] = useState([]);
//   const [open, setOpen] = useState(false);
//   const timer = useRef(null);
//   const handleChange = (e) => {
//     const v = e.target.value; setQuery(v); clearTimeout(timer.current);
//     if (v.length < 2) { setResults([]); return; }
//     timer.current = setTimeout(async () => { const res = await searchPlaces(v); setResults(res); setOpen(res.length > 0); }, 400);
//   };
//   const pick = (r) => { setQuery(r.display); onChange(r); setOpen(false); };
//   return (
//     <div className="place-wrap">
//       <input value={query} onChange={handleChange} onBlur={() => setTimeout(() => setOpen(false), 200)}
//         placeholder="Type city name…" style={{ width:"100%", background:"rgba(89,34,9,0.2)", border:"1px solid rgba(89,34,9,0.2)", borderRadius:10, padding:"11px 14px", color:"#301607", fontFamily:"var(--font-body)", fontSize:16, outline:"none" }} />
//       {open && (
//         <div className="place-dropdown">
//           {results.map((r, i) => (
//             <div key={i} className="place-item" onMouseDown={() => pick(r)}>
//               {r.display}
//               <small>{r.lat?.toFixed(4)}, {r.lon?.toFixed(4)}</small>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function PersonForm({ title, icon, grad, data, onChange }) {
//   const up = (k, v) => onChange({ ...data, [k]: v });
//   return (
//     <div className="person-card" style={{ "--grad": grad }}>
//       <div className="card-title">
//         <span className="card-icon">{icon}</span>
//         <span style={{ background:grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>{title}</span>
//       </div>
//       <div className="field">
//         <label>Full Name *</label>
//         <input value={data.name} onChange={e => up("name", e.target.value)} placeholder="Enter full name" />
//       </div>
//       <div className="field">
//         <label>Date of Birth *</label>
//         <div className="date-row">
//           <select value={data.day} onChange={e => up("day", e.target.value)}>
//             <option value="">DD</option>
//             {DAYS.map(d => <option key={d} value={d}>{String(d).padStart(2,"0")}</option>)}
//           </select>
//           <select value={data.month} onChange={e => up("month", e.target.value)}>
//             <option value="">MM</option>
//             {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
//           </select>
//           <select value={data.year} onChange={e => up("year", e.target.value)}>
//             <option value="">YYYY</option>
//             {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
//           </select>
//         </div>
//       </div>
//       <div className="field">
//         <label>Time of Birth (optional)</label>
//         <div className="time-row">
//           <select value={data.hour} onChange={e => up("hour", e.target.value)}>
//             <option value="">HH</option>
//             {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
//           </select>
//           <select value={data.min} onChange={e => up("min", e.target.value)}>
//             <option value="">MM</option>
//             {MINS.filter((_,i) => i%5===0).map(m => <option key={m} value={m}>{m}</option>)}
//           </select>
//           <select value={data.ampm} onChange={e => up("ampm", e.target.value)}>
//             <option value="AM">AM</option>
//             <option value="PM">PM</option>
//           </select>
//         </div>
//       </div>
//       <div className="field">
//         <label>Place of Birth (optional)</label>
//         <PlaceInput value={data.place} onChange={v => up("place", v)} />
//       </div>
//     </div>
//   );
// }

// const LOADING_STEPS = [
//   "Reading Birth Charts","Mapping Planetary Positions","Aligning Cosmic Energies",
//   "Matching Soul Frequencies","Calculating Love Compatibility","Analyzing Marriage Potential",
//   "Generating Personalized Insights","Preparing Universe Report",
// ];

// function LoadingScreen() {
//   const [step, setStep] = useState(0);
//   useEffect(() => { const t = setInterval(() => setStep(s => Math.min(s+1,LOADING_STEPS.length-1)), 700); return () => clearInterval(t); }, []);
//   return (
//     <div className="loading-screen">
//       <div className="loading-cosmos">
//         <div className="orbit-ring"><div className="orbit-dot" style={{ background:"#FBF5EC" }}/></div>
//         <div className="orbit-ring"><div className="orbit-dot" style={{ background:"#FBF5EC" }}/></div>
//         <div className="orbit-ring"><div className="orbit-dot" style={{ background:"#FBF5EC" }}/></div>
//         <div className="orbit-center">💫</div>
//       </div>
//       <div className="loading-steps">
//         {LOADING_STEPS.map((s,i) => (
//           <div key={s} className={`loading-step ${i===step?"active":i<step?"done":""}`}>
//             <div className="step-dot"/><span>✨ {s}</span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Card hover colors config
// const CARD_HOVERS = {
//   love:     { hov:"linear-gradient(135deg,rgba(89,34,9,.22),rgba(89,34,9,.14))",  shadow:"rgba(89,34,9,.5)"  },
//   emo:      { hov:"linear-gradient(135deg,rgba(89,34,9,.24),rgba(89,34,9,.14))",   shadow:"rgba(89,34,9,.5)"  },
//   phys:     { hov:"linear-gradient(135deg,rgba(255,107,53,.24),rgba(89,34,9,.16))",  shadow:"rgba(89,34,9,.5)"  },
//   fri:      { hov:"linear-gradient(135deg,rgba(89,34,9,.22),rgba(89,34,9,.14))",   shadow:"rgba(89,34,9,.45)"  },
//   mar:      { hov:"linear-gradient(135deg,rgba(89,34,9,.22),rgba(89,34,9,.16))",  shadow:"rgba(89,34,9,.45)" },
//   fin:      { hov:"linear-gradient(135deg,rgba(46,204,113,.22),rgba(89,34,9,.14))",  shadow:"rgba(229,138,69,.45)" },
//   fam:      { hov:"linear-gradient(135deg,rgba(230,126,34,.22),rgba(89,34,9,.14))",  shadow:"rgba(229,138,69,.45)" },
//   fam2:     { hov:"linear-gradient(135deg,rgba(89,34,9,.2),rgba(89,34,9,.14))",   shadow:"rgba(89,34,9,.4)"  },
//   spi:      { hov:"linear-gradient(135deg,rgba(89,34,9,.24),rgba(89,34,9,.2))",    shadow:"rgba(89,34,9,.55)" },
// };

// function CC({ type, children }) {
//   const h = CARD_HOVERS[type] || CARD_HOVERS.love;
//   return <div className="compat-card" style={{"--hov":h.hov,"--hov-shadow":h.shadow}}>{children}</div>;
// }

// // ── WHO LOVES MORE — deterministic from compatibility factors ────────────────
// function computeWhoLovesMore(p1, p2, scores) {
//   // Factors that indicate emotional investment
//   const s = scores;

//   // P1 investment signals: emotional score relative to love, high friendship
//   // P2 investment signals: spiritual alignment, physical
//   const p1Base =
//     (s.emotional * 0.35) +
//     (s.love * 0.25) +
//     (s.friendship * 0.2) +
//     (s.marriage * 0.2);

//   const p2Base =
//     (s.spiritual * 0.35) +
//     (s.physical * 0.25) +
//     (s.family * 0.2) +
//     (s.financial * 0.2);

//   // Name-derived tiebreaker (deterministic)
//   const n1 = p1.name.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
//   const n2 = p2.name.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
//   const nameBias = ((n1 - n2) % 15); // -14 to +14 range

//   const raw1 = p1Base + nameBias;
//   const raw2 = p2Base - nameBias;
//   const total = raw1 + raw2;
//   let pct1 = Math.round((raw1 / total) * 100);
//   let pct2 = 100 - pct1;

//   // Clamp to 15-85 range (avoid extremes)
//   pct1 = Math.min(85, Math.max(15, pct1));
//   pct2 = 100 - pct1;

//   // Determine pattern label
//   const diff = Math.abs(pct1 - pct2);
//   const pattern =
//     diff <= 4  ? "Balanced Love" :
//     diff <= 12 ? "Slightly More Invested" :
//     diff <= 22 ? "Noticeably More Invested" :
//     diff <= 35 ? "Deeply Invested" :
//                  "One-Sided Attraction";

//   const patternEmoji =
//     diff <= 4  ? "⚖️" :
//     diff <= 12 ? "💛" :
//     diff <= 22 ? "💕" :
//     diff <= 35 ? "💗" : "❤️‍🔥";

//   // Confidence: higher when signals are clear (big diff = more confident)
//   const confidence = Math.min(95, 55 + diff * 1.2);

//   // Who loves more
//   const moreInvested = pct1 >= pct2 ? p1.name : p2.name;
//   const lessInvested = pct1 >= pct2 ? p2.name : p1.name;
//   const morePct = Math.max(pct1, pct2);
//   const lessPct = Math.min(pct1, pct2);

//   // Insight text
//   const insightMap = [
//     { max: 4,  text: `${p1.name} and ${p2.name} share a beautifully balanced emotional investment. Both are equally committed, creating a foundation of mutual love and stability. This rare equilibrium is one of the strongest indicators of lasting partnership.` },
//     { max: 12, text: `${moreInvested} tends to be slightly more emotionally expressive and invests just a little more in the relationship. ${lessInvested} is deeply caring too — the difference is subtle and reflects complementary love styles rather than imbalance.` },
//     { max: 22, text: `${moreInvested} is noticeably more emotionally invested at this stage, often being the initiator and emotional anchor. ${lessInvested} shows love through actions and loyalty rather than emotional expression. This dynamic can work beautifully when both understand each other's style.` },
//     { max: 35, text: `${moreInvested} carries significantly more of the emotional weight in this relationship. Their deep feelings drive the connection forward. ${lessInvested} values the relationship but expresses it differently — understanding this difference is key to harmony.` },
//     { max: 100, text: `The emotional intensity is strongly skewed toward ${moreInvested}. This doesn't mean ${lessInvested} doesn't care — it reflects a deeply different emotional expression style. Open communication about love languages could transform this dynamic significantly.` },
//   ];
//   const insight = insightMap.find(i => diff <= i.max)?.text || insightMap[insightMap.length-1].text;

//   // Intensity labels
//   const intensity = (pct) =>
//     pct >= 75 ? "Deeply Devoted" :
//     pct >= 62 ? "Strongly Invested" :
//     pct >= 52 ? "Warmly Engaged" :
//     pct >= 42 ? "Steadily Present" :
//                 "Quietly Caring";

//   return { pct1, pct2, pattern, patternEmoji, confidence: Math.round(confidence), moreInvested, morePct, lessInvested, lessPct, insight, intensity1: intensity(pct1), intensity2: intensity(pct2) };
// }

// function WhoLovesMore({ p1, p2, scores }) {
//   const wlm = computeWhoLovesMore(p1, p2, scores);
//   const r = 52, circ = 2 * Math.PI * r;
//   const offset1 = circ - (wlm.pct1 / 100) * circ;
//   const offset2 = circ - (wlm.pct2 / 100) * circ;

//   const ref1 = useRef(null), ref2 = useRef(null);
//   const refBar1 = useRef(null), refBar2 = useRef(null);
//   const refConf = useRef(null);

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       ref1.current?.style && (ref1.current.style.strokeDashoffset = offset1);
//       ref2.current?.style && (ref2.current.style.strokeDashoffset = offset2);
//       refBar1.current?.classList.add("animate");
//       refBar2.current?.classList.add("animate");
//       refConf.current?.classList.add("animate");
//     }, 300);
//     return () => clearTimeout(timer);
//   }, []);

//   const c1 = "#592209", c2 = "#592209";

//   return (
//     <div className="wlm-wrap">
//       <div className="wlm-card">
//         <div className="wlm-disclaimer">✦ AI-Generated Relationship Analysis — For Entertainment & Insight Only ✦</div>

//         <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,flexWrap:"wrap"}}>
//           <div className="wlm-pattern-badge">{wlm.patternEmoji} {wlm.pattern}</div>
//         </div>

//         {/* Two rings side by side */}
//         <div className="wlm-persons">
//           {[
//             {name:p1.name, pct:wlm.pct1, color:c1, offset:offset1, ref:ref1, barRef:refBar1, intensity:wlm.intensity1},
//             {name:p2.name, pct:wlm.pct2, color:c2, offset:offset2, ref:ref2, barRef:refBar2, intensity:wlm.intensity2},
//           ].map((person, i) => (
//             <div key={i} className="wlm-person">
//               <div className="wlm-person-name" style={{color:person.color}}>{person.name}</div>
//               <div className="wlm-ring-wrap">
//                 <svg className="wlm-ring-svg" viewBox="0 0 120 120">
//                   <circle className="wlm-ring-bg" cx="60" cy="60" r={r}/>
//                   <circle ref={person.ref} className="wlm-ring-fg" cx="60" cy="60" r={r}
//                     stroke={person.color} strokeDasharray={circ}
//                     strokeDashoffset={circ}
//                     style={{transition:"stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1)"}}/>
//                 </svg>
//                 <div className="wlm-ring-inner">
//                   <span className="wlm-pct-num" style={{color:person.color}}>{person.pct}</span>
//                   <span className="wlm-pct-sym">%</span>
//                 </div>
//               </div>
//               <div className="wlm-label">Love Intensity</div>
//               <div className="wlm-bar-wrap">
//                 <div ref={person.barRef} className="wlm-bar-fill"
//                   style={{"--w":`${person.pct}%`, background:person.color}}/>
//               </div>
//               <div className="wlm-intensity-label">{person.intensity}</div>
//             </div>
//           ))}
//         </div>

//         {/* VS bar */}
//         <div className="wlm-vs-labels">
//           <span style={{color:c1}}>{p1.name}</span>
//           <span style={{color:"rgba(48,22,7,0.72)"}}>vs</span>
//           <span style={{color:c2}}>{p2.name}</span>
//         </div>
//         <div className="wlm-vs">
//           <div className="wlm-vs-fill1" style={{width:`${wlm.pct1}%`, background:`linear-gradient(to right,${c1},#FBF5EC)`}}/>
//           <div className="wlm-vs-fill2" style={{width:`${wlm.pct2}%`, background:`linear-gradient(to left,${c2},#FBF5EC)`}}/>
//         </div>
//         <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--font-mono)",fontSize:11,color:"#301607",marginBottom:20}}>
//           <span style={{color:c1}}>{wlm.pct1}%</span>
//           <span style={{color:c2}}>{wlm.pct2}%</span>
//         </div>

//         {/* Insight */}
//         <div className="wlm-insight">
//           <div className="wlm-insight-lbl">💬 Relationship Dynamics Insight</div>
//           <div className="wlm-insight-txt">{wlm.insight}</div>
//         </div>

//         {/* Summary message */}
//         <div style={{fontSize:14,color:"rgba(48,22,7,1)",lineHeight:1.7,fontStyle:"italic",marginBottom:16,textAlign:"center"}}>
//           Based on the relationship dynamics, <strong style={{color:wlm.moreInvested===p1.name?c1:c2}}>{wlm.moreInvested}</strong> appears to be {wlm.pattern === "Balanced Love" ? "equally" : "more"} emotionally invested{wlm.pattern !== "Balanced Love" ? ` at ${wlm.morePct}%` : ""}.
//         </div>

//         {/* Confidence score */}
//         <div className="wlm-confidence">
//           <span>Analysis Confidence</span>
//           <div className="wlm-conf-bar">
//             <div ref={refConf} className="wlm-conf-fill" style={{"--w":`${wlm.confidence}%`}}/>
//           </div>
//           <span style={{color:"#592209",minWidth:32}}>{wlm.confidence}%</span>
//         </div>
//       </div>
//     </div>
//   );
// }


// function Results({ p1, p2, report, onReset }) {
//   const s = report.scores;
//   const PLANETS = [
//     { symbol:"☀️", name:"Sun",     score:deriveScore(s.overall,   p1.name,p2.name,"sun")   },
//     { symbol:"🌙", name:"Moon",    score:deriveScore(s.emotional, p1.name,p2.name,"moon")  },
//     { symbol:"⬆️", name:"Rising",  score:deriveScore(s.love,      p1.name,p2.name,"rise")  },
//     { symbol:"♀️", name:"Venus",   score:deriveScore(s.love,      p1.name,p2.name,"venus") },
//     { symbol:"♂️", name:"Mars",    score:deriveScore(s.physical,  p1.name,p2.name,"mars")  },
//     { symbol:"☿",  name:"Mercury", score:deriveScore(s.emotional, p1.name,p2.name,"merc")  },
//     { symbol:"♃",  name:"Jupiter", score:deriveScore(s.spiritual, p1.name,p2.name,"jup")   },
//     { symbol:"♄",  name:"Saturn",  score:deriveScore(s.marriage,  p1.name,p2.name,"sat")   },
//   ];
//   const TL = [
//     { phase:"First Attraction",   desc:report.timeline?.attraction,  c:"#592209" },
//     { phase:"Connection Phase",   desc:report.timeline?.connection,   c:"#592209" },
//     { phase:"Relationship Growth",desc:report.timeline?.growth,       c:"#592209" },
//     { phase:"Commitment Phase",   desc:report.timeline?.commitment,   c:"#592209" },
//     { phase:"Marriage Potential", desc:report.timeline?.marriage,     c:"#592209" },
//     { phase:"Long-Term Stability",desc:report.timeline?.stability,    c:"#592209" },
//   ];
//   return (
//     <div className="results">
//       {/* Couple names — BIG and VISIBLE */}
//       <div className="couple-header">
//         <span className="couple-names">{p1.name} ✦ {p2.name}</span>
//         <span className="couple-sub">Universe Compatibility Analysis · {p1.zodiac} & {p2.zodiac}</span>
//       </div>

//       <div className="score-hero"><ScoreCircle score={s.overall}/></div>

//       <div className="section-head">💞 Who Loves More?</div>
//       <WhoLovesMore p1={p1} p2={p2} scores={s}/>


//       <div className="section-head">❤️ Love Compatibility</div>
//       <div className="cards-grid">
//         <CC type="love">
//           <div className="card-head"><span className="card-emoji">💕</span><span className="card-name">Love Score</span><span className="card-score-num">{s.love}%</span></div>
//           <ProgBar value={s.love} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Emotional Bond"     value={deriveScore(s.love,p1.name,p2.name,"bond")}  color="#592209"/>
//             <SubMetric label="Romantic Spark"     value={deriveScore(s.love,p1.name,p2.name,"spark")} color="#592209"/>
//             <SubMetric label="Soulmate Potential" value={deriveScore(s.love,p1.name,p2.name,"soul")}  color="#592209"/>
//           </div>
//           {report.loveInsight && <div className="insight-box"><div className="insight-label">AI Insight</div>{report.loveInsight}</div>}
//         </CC>
//         <CC type="emo">
//           <div className="card-head"><span className="card-emoji">🧠</span><span className="card-name">Emotional Compatibility</span><span className="card-score-num">{s.emotional}%</span></div>
//           <ProgBar value={s.emotional} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Understanding" value={deriveScore(s.emotional,p1.name,p2.name,"und")}   color="#592209"/>
//             <SubMetric label="Trust"         value={deriveScore(s.emotional,p1.name,p2.name,"trust")} color="#592209"/>
//             <SubMetric label="Communication" value={deriveScore(s.emotional,p1.name,p2.name,"comm")}  color="#592209"/>
//             <SubMetric label="Loyalty"       value={deriveScore(s.emotional,p1.name,p2.name,"loyal")} color="#592209"/>
//           </div>
//         </CC>
//         <CC type="phys">
//           <div className="card-head"><span className="card-emoji">🔥</span><span className="card-name">Physical Attraction</span><span className="card-score-num">{s.physical}%</span></div>
//           <ProgBar value={s.physical} color="linear-gradient(to right,#ff6b35,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Chemistry"       value={deriveScore(s.physical,p1.name,p2.name,"chem")} color="#ff6b35"/>
//             <SubMetric label="Passion Index"   value={deriveScore(s.physical,p1.name,p2.name,"pass")} color="#592209"/>
//             <SubMetric label="Attraction Score"value={deriveScore(s.physical,p1.name,p2.name,"attr")} color="#592209"/>
//           </div>
//         </CC>
//       </div>

//       <div className="section-head">🤝 Friendship & Commitment</div>
//       <div className="cards-grid">
//         <CC type="fri">
//           <div className="card-head"><span className="card-emoji">🤝</span><span className="card-name">Friendship Score</span><span className="card-score-num">{s.friendship}%</span></div>
//           <ProgBar value={s.friendship} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Support Level"  value={deriveScore(s.friendship,p1.name,p2.name,"sup")}  color="#592209"/>
//             <SubMetric label="Long-Term Bond" value={deriveScore(s.friendship,p1.name,p2.name,"ltb")}  color="#592209"/>
//             <SubMetric label="Teamwork"       value={deriveScore(s.friendship,p1.name,p2.name,"team")} color="#592209"/>
//           </div>
//         </CC>
//         <CC type="mar">
//           <div className="card-head"><span className="card-emoji">💍</span><span className="card-name">Marriage Potential</span><span className="card-score-num">{s.marriage}%</span></div>
//           <ProgBar value={s.marriage} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Marriage Readiness" value={deriveScore(s.marriage,p1.name,p2.name,"mrd")}  color="#592209"/>
//             <SubMetric label="Commitment Score"   value={deriveScore(s.marriage,p1.name,p2.name,"com")}  color="#592209"/>
//             <SubMetric label="Stability"          value={deriveScore(s.marriage,p1.name,p2.name,"stab")} color="#592209"/>
//           </div>
//           {report.marriageWindow && <div className="insight-box"><div className="insight-label">Most Favorable Period</div>{report.marriageWindow}</div>}
//         </CC>
//         <CC type="fin">
//           <div className="card-head"><span className="card-emoji">💰</span><span className="card-name">Financial Compatibility</span><span className="card-score-num">{s.financial}%</span></div>
//           <ProgBar value={s.financial} color="linear-gradient(to right,#2ecc71,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Wealth Building"  value={deriveScore(s.financial,p1.name,p2.name,"wb")} color="#2ecc71"/>
//             <SubMetric label="Money Management" value={deriveScore(s.financial,p1.name,p2.name,"mm")} color="#592209"/>
//             <SubMetric label="Spending Style"   value={deriveScore(s.financial,p1.name,p2.name,"sp")} color="#592209"/>
//           </div>
//         </CC>
//       </div>

//       <div className="section-head">🏠 Family & Spiritual</div>
//       <div className="cards-grid">
//         <CC type="fam">
//           <div className="card-head"><span className="card-emoji">🏠</span><span className="card-name">Family Harmony</span><span className="card-score-num">{s.family}%</span></div>
//           <ProgBar value={s.family} color="linear-gradient(to right,#e67e22,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Domestic Harmony"  value={deriveScore(s.family,p1.name,p2.name,"dh")} color="#e67e22"/>
//             <SubMetric label="Family Acceptance" value={deriveScore(s.family,p1.name,p2.name,"fa")} color="#592209"/>
//             <SubMetric label="Parenting Energy"  value={deriveScore(s.family,p1.name,p2.name,"pe")} color="#592209"/>
//           </div>
//         </CC>
//         <CC type="fam2">
//           <div className="card-head"><span className="card-emoji">👶</span><span className="card-name">Future Family Energy</span><span className="card-score-num">{deriveScore(s.family,p1.name,p2.name,"ffe")}%</span></div>
//           <ProgBar value={deriveScore(s.family,p1.name,p2.name,"ffe")} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Family Growth"      value={deriveScore(s.family,p1.name,p2.name,"fg")} color="#592209"/>
//             <SubMetric label="Nurturing Potential"value={deriveScore(s.family,p1.name,p2.name,"np")} color="#592209"/>
//             <SubMetric label="Child Compatibility"value={deriveScore(s.family,p1.name,p2.name,"cc")} color="#592209"/>
//           </div>
//           <div className="insight-box" style={{fontSize:13}}><div className="insight-label">Note</div>These are astrology-based compatibility indicators, not guarantees of future outcomes.</div>
//         </CC>
//         <CC type="spi">
//           <div className="card-head"><span className="card-emoji">🌙</span><span className="card-name">Spiritual Connection</span><span className="card-score-num">{s.spiritual}%</span></div>
//           <ProgBar value={s.spiritual} color="linear-gradient(to right,#592209,#592209)"/>
//           <div className="sub-metrics" style={{marginTop:12}}>
//             <SubMetric label="Karma Connection"    value={deriveScore(s.spiritual,p1.name,p2.name,"karma")} color="#592209"/>
//             <SubMetric label="Soul Bond"            value={deriveScore(s.spiritual,p1.name,p2.name,"soul2")} color="#592209"/>
//             <SubMetric label="Past Life Indicators" value={deriveScore(s.spiritual,p1.name,p2.name,"past")}  color="#592209"/>
//             <SubMetric label="Destiny Connection"   value={deriveScore(s.spiritual,p1.name,p2.name,"dest")}  color="#592209"/>
//           </div>
//         </CC>
//       </div>

//       <div className="section-head">🪐 Planetary Analysis</div>
//       <div className="planet-row">
//         {PLANETS.map(pl => (
//           <div key={pl.name} className="planet-item">
//             <div className="planet-symbol">{pl.symbol}</div>
//             <div className="planet-name">{pl.name}</div>
//             <div className="planet-score">{pl.score}%</div>
//           </div>
//         ))}
//       </div>

//       <div className="section-head">📅 Relationship Timeline</div>
//       <div className="timeline">
//         {TL.map((t,i) => (
//           <div key={i} className="tl-item">
//             <div className="tl-dot" style={{"--dot-c":t.c}}/>
//             <div className="tl-phase" style={{color:t.c}}>{t.phase}</div>
//             <div className="tl-desc">{t.desc || "Cosmic energies align for this phase of your journey."}</div>
//           </div>
//         ))}
//       </div>

//       <div className="section-head">🚩 Compatibility Indicators</div>
//       <div className="flags-grid">
//         <div className="flags-col">
//           <div className="flags-col-title" style={{color:"#2F6B3A"}}>✅ Green Flags</div>
//           {(report.greenFlags||[]).map((f,i) => <div key={i} className="flag-item"><span className="flag-icon">✅</span>{f}</div>)}
//         </div>
//         <div className="flags-col">
//           <div className="flags-col-title" style={{color:"#592209"}}>⚠️ Areas to Navigate</div>
//           {(report.redFlags||[]).map((f,i) => <div key={i} className="flag-item"><span className="flag-icon">⚠️</span>{f}</div>)}
//         </div>
//       </div>

//       <div className="section-head">🤖 AI Relationship Insights</div>
//       <div className="ai-insights-grid">
//         {(report.aiInsights||[]).map((ins,i) => (
//           <div key={i} className="ai-card">
//             <div className="ai-card-title">{ins.title}</div>
//             <div className="ai-card-text">{ins.text}</div>
//           </div>
//         ))}
//       </div>

//       <button className="reset-btn" onClick={onReset}>✦ New Reading</button>
//     </div>
//   );
// }

// const empty = () => ({ name:"", day:"", month:"", year:"", hour:"", min:"", ampm:"AM", place:null });

// export default function App() {
//   const [p1,setP1] = useState(empty());
//   const [p2,setP2] = useState(empty());
//   const [phase,setPhase] = useState("form");
//   const [report,setReport] = useState(null);
//   const [error,setError] = useState("");

//   // Back button returns to form from loading/results phases
//   useBackOverride(
//     phase !== "form" ? () => { setPhase("form"); setReport(null); setError(""); } : null,
//     [phase],
//   );

//   const compute = useCallback(async () => {
//     setError("");
//     if (!p1.name||!p2.name||!p1.day||!p1.month||!p1.year||!p2.day||!p2.month||!p2.year) {
//       setError("Please fill in the required fields (Name & Date of Birth) for both persons."); return;
//     }
//     setPhase("loading");
//     const z1=getZodiac(+p1.day,+p1.month), z2=getZodiac(+p2.day,+p2.month);
//     const dob1=`${p1.year}-${String(p1.month).padStart(2,"0")}-${String(p1.day).padStart(2,"0")}`;
//     const dob2=`${p2.year}-${String(p2.month).padStart(2,"0")}-${String(p2.day).padStart(2,"0")}`;
//     const lp1=getLifePath(dob1), lp2=getLifePath(dob2);
//     const seed=p1.name+p2.name+dob1+dob2;
//     const hash=seed.split("").reduce((a,c)=>(a*31+c.charCodeAt(0))&0xffff,0);
//     const base=60+(hash%35);
//     const scores={
//       overall:Math.min(99,base+5), love:deriveScore(base,p1.name,p2.name,"love"),
//       emotional:deriveScore(base,p1.name,p2.name,"emo"), physical:deriveScore(base,p1.name,p2.name,"phys"),
//       friendship:deriveScore(base,p1.name,p2.name,"fri"), marriage:deriveScore(base,p1.name,p2.name,"mar"),
//       financial:deriveScore(base,p1.name,p2.name,"fin"), family:deriveScore(base,p1.name,p2.name,"fam"),
//       spiritual:deriveScore(base,p1.name,p2.name,"spi"),
//     };
//     let aiData=null;
//     try { aiData=await fetchCompatibilityReport({name:p1.name,dob:dob1,zodiac:z1,lifePath:lp1,place:p1.place?.city},{name:p2.name,dob:dob2,zodiac:z2,lifePath:lp2,place:p2.place?.city},scores); }
//     catch(e) { console.warn("AI backend error:",e); }
//     const fallback={
//       loveInsight:`${p1.name} and ${p2.name} share a profound emotional resonance rooted in their ${z1}–${z2} cosmic alignment. Their life path numbers ${lp1} and ${lp2} create a complementary energetic balance.`,
//       marriageWindow:`${2027+(hash%5)} – ${2029+(hash%5)}`,
//       greenFlags:["Strong emotional connection and mutual understanding","Complementary zodiac energies create natural harmony","Shared life path resonance supports long-term growth","Deep spiritual alignment and karmic connection","High marriage potential with stable long-term outlook"],
//       redFlags:["Occasional communication style differences to navigate","Financial planning approaches may need alignment","Personal space and independence balance requires attention"],
//       timeline:{attraction:"Initial cosmic attraction is powerful and immediate, drawing these souls together.",connection:"Emotional bonds deepen as shared values and dreams align beautifully.",growth:"The relationship blossoms through mutual support and spiritual growth.",commitment:"A natural progression toward deeper commitment feels destined.",marriage:`Marriage energy peaks around ${2027+(hash%5)}, supported by favorable planetary alignments.`,stability:"Long-term cosmic compatibility ensures enduring happiness and harmony."},
//       aiInsights:[
//         {title:"Relationship Strengths",text:`${p1.name} and ${p2.name} possess remarkable compatibility rooted in their ${z1} and ${z2} synergy. Their combined life path numbers ${lp1} and ${lp2} create a relationship that balances ambition with emotional depth.`},
//         {title:"Communication Style",text:"Your communication is naturally intuitive, often understanding each other without words. Building clear channels for expressing needs will transform this connection from good to extraordinary."},
//         {title:"Love Languages",text:`${p1.name} expresses love through thoughtful gestures and quality time, while ${p2.name}'s love language centers around words of affirmation and deep emotional sharing.`},
//         {title:"Growth Opportunities",text:"Together you inspire each other's highest potential. Embrace your differences as cosmic teachers rather than obstacles, and watch your relationship evolve beautifully."},
//         {title:"Conflict Resolution",text:"When tensions arise, return to your core emotional connection. Both partners benefit from taking reflective pauses before discussing sensitive topics, honoring each other's processing styles."},
//         {title:"Long-Term Vision",text:"The stars indicate a relationship built for the long journey. Your combined energies create a stable, loving foundation that grows stronger with each passing year."},
//       ],
//     };
//     await new Promise(r=>setTimeout(r,5600));
//     setP1(prev=>({...prev,zodiac:z1,lifePath:lp1}));
//     setP2(prev=>({...prev,zodiac:z2,lifePath:lp2}));
//     setReport({scores,...(aiData||fallback)});
//     setPhase("results");
//   },[p1,p2]);

//   return (
//     <div className="universe-app">
//       <Starfield/>
//       <div className="nebula-blob" style={{width:600,height:600,top:"-200px",left:"-200px",background:"radial-gradient(circle,rgba(89,34,9,0.08),transparent 70%)",animationDuration:"18s"}}/>
//       <div className="nebula-blob" style={{width:500,height:500,bottom:"10%",right:"-150px",background:"radial-gradient(circle,rgba(89,34,9,0.08),transparent 70%)",animationDuration:"22s",animationDelay:"3s"}}/>
//       <div className="nebula-blob" style={{width:400,height:400,top:"40%",left:"30%",background:"radial-gradient(circle,rgba(89,34,9,0.07),transparent 70%)",animationDuration:"25s",animationDelay:"6s"}}/>
//       {phase==="loading" && <LoadingScreen/>}
//       <div className="content" style={{display:phase==="loading"?"none":"block"}}>
//         {phase==="form" && (
//           <>
//             <div className="header">
//               <div className="header-tag">✦ Universe Relationship Analyzer ✦</div>
//               <h1>Cosmic Compatibility<br/>Oracle</h1>
//               <p>Let the universe reveal the truth of your connection</p>
//             </div>
//             <div className="form-container">
//               {error && <div className="error-box">⚠ {error}</div>}
//               <div className="persons-grid">
//                 <PersonForm title="The Divine Masculine" icon="♂" grad="linear-gradient(135deg,#592209,#592209)" data={p1} onChange={setP1}/>
//                 <PersonForm title="The Divine Feminine"  icon="♀" grad="linear-gradient(135deg,#592209,#592209)" data={p2} onChange={setP2}/>
//               </div>
//               <button className="submit-btn" onClick={compute}>✦ Reveal Cosmic Compatibility ✦</button>
//             </div>
//           </>
//         )}
//         {phase==="results" && report && (
//           <Results p1={p1} p2={p2} report={report} onReset={()=>{setPhase("form");setReport(null);setP1(empty());setP2(empty());}}/>
//         )}
//       </div>
//     </div>
//   );
// }



//komal nsp
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { useBackOverride } from "../context/NavigationContext";
import { User, ArrowRight } from "lucide-react";
import { zodiacSigns } from "@/data/zodiacData";
import CompatibilityEducation from "@/components/CompatibilityEducation";
import zodiacAries from "@/assets/zodiac-gold/aries.png";
import zodiacTaurus from "@/assets/zodiac-gold/taurus.png";
import zodiacGemini from "@/assets/zodiac-gold/gemini.png";
import zodiacCancer from "@/assets/zodiac-gold/cancer.png";
import zodiacLeo from "@/assets/zodiac-gold/leo.png";
import zodiacVirgo from "@/assets/zodiac-gold/virgo.png";
import zodiacLibra from "@/assets/zodiac-gold/libra.png";
import zodiacScorpio from "@/assets/zodiac-gold/scorpio.png";
import zodiacSagittarius from "@/assets/zodiac-gold/sagittarius.png";
import zodiacCapricorn from "@/assets/zodiac-gold/capricorn.png";
import zodiacAquarius from "@/assets/zodiac-gold/aquarius.png";
import zodiacPisces from "@/assets/zodiac-gold/pisces.png";
import { requireSignIn } from "@/lib/authedFetch";

const css = `
  :root {
    --void: #F5E9D6;
    --deep: #FBF5EC;
    --nebula: #0d0520;
    --aurora-1: #592209;
    --aurora-2: #E58A45;
    --aurora-3: #461B07;
    --gold: #592209;
    --stardust: rgba(89,34,9,0.05);
    --glass: rgba(89,34,9,0.05);
    --glass-border: rgba(89,34,9,0.2);
    --font-display: Cinzel, Georgia, serif;
    --font-body: 'DM Sans', system-ui, sans-serif;
    --font-mono: 'DM Sans', system-ui, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .universe-app {
    min-height: 100vh; background: var(--void); color: #301607;
    font-family: var(--font-body); font-size: 18px; overflow-x: hidden; position: relative;
  }
  .starfield { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
  .star { position: absolute; border-radius: 50%; background: rgba(89,34,9,0.25); animation: twinkle var(--d,3s) ease-in-out infinite; animation-delay: var(--delay,0s); opacity: var(--op,0.6); }
  @keyframes twinkle { 0%,100%{opacity:var(--op,0.6);transform:scale(1);}50%{opacity:0.1;transform:scale(0.5);} }
  .nebula-blob { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; animation: drift 20s ease-in-out infinite alternate; }
  @keyframes drift { from{transform:translate(0,0) scale(1);}to{transform:translate(40px,30px) scale(1.1);} }
  .content { position: relative; z-index: 1; }
  .header { text-align: center; padding: 60px 20px 40px; }
  .header-tag { font-family: var(--font-mono); font-size: 11px; letter-spacing: 6px; color: var(--aurora-3); text-transform: uppercase; margin-bottom: 16px; opacity: 0.8; }
  .header h1 { font-family: var(--font-display); font-size: clamp(22px,4vw,44px); font-weight: 900; background: linear-gradient(135deg,var(--gold) 0%,var(--aurora-2) 40%,var(--aurora-1) 80%,var(--aurora-3) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2; margin-bottom: 12px; }
  .header p { color: #301607; font-size: 17px; font-style: italic; letter-spacing: 0.5px; }
  .form-container { max-width: 900px; margin: 0 auto; padding: 0 20px 60px; }
  .persons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  @media(max-width:680px){.persons-grid{grid-template-columns:1fr;}}
  .person-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; padding: 28px 24px; backdrop-filter: blur(16px); position: relative; overflow: hidden; transition: border-color 0.3s, box-shadow 0.3s; }
  .person-card::before { content:''; position:absolute; inset:0; background:var(--grad); opacity:0.04; pointer-events:none; }
  .person-card:hover { border-color: rgba(89,34,9,0.3); box-shadow: 0 0 40px rgba(89,34,9,0.15); }
  .card-title { font-family: var(--font-display); font-size: 13px; letter-spacing: 2px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  .card-icon { font-size: 20px; }
  .field { margin-bottom: 16px; }
  .field label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 3px; color: rgba(48,22,7,1); text-transform: uppercase; display: block; margin-bottom: 6px; }
  .field input,.field select { width:100%; background:rgba(89,34,9,0.05); border:1px solid rgba(89,34,9,0.05); border-radius:10px; padding:11px 14px; color:#301607; font-family:var(--font-body); font-size:16px; outline:none; transition:border 0.3s,box-shadow 0.3s; -webkit-appearance:none; }
  .field input:focus,.field select:focus { border-color:var(--aurora-1); box-shadow:0 0 0 3px rgba(89,34,9,0.15); }
  .field input::placeholder { color:rgba(48,22,7,0.75); }
  .field select option { background:#FBF5EC; }
  .date-row { display:grid; grid-template-columns:2fr 2fr 3fr; gap:8px; }
  .time-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .place-wrap { position:relative; }
  .place-dropdown { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#FBF5EC; border:1px solid rgba(89,34,9,0.4); border-radius:10px; z-index:100; overflow:hidden; box-shadow:0 20px 60px rgba(89,34,9,0.2); }
  .place-item { padding:10px 14px; cursor:pointer; font-size:15px; color:#301607; transition:background 0.2s; border-bottom:1px solid rgba(89,34,9,0.05); }
  .place-item:hover { background:rgba(89,34,9,0.2); }
  .place-item small { display:block; font-size:12px; color:#301607; margin-top:2px; font-family:var(--font-mono); }
  .submit-btn { display:block; width:100%; max-width:400px; margin:0 auto; padding:18px 40px; background:linear-gradient(135deg,var(--aurora-1),var(--aurora-2)); border:none; border-radius:50px; color:#F5E9D6; font-family:var(--font-display); font-size:14px; letter-spacing:2px; cursor:pointer; position:relative; overflow:hidden; transition:transform 0.2s,box-shadow 0.3s; text-transform:uppercase; }
  .submit-btn:hover { transform:translateY(-2px); box-shadow:0 20px 60px rgba(89,34,9,0.4); }
  .submit-btn:active { transform:translateY(0); }
  .submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .loading-screen { position:fixed; inset:0; background:#F5E9D6; z-index:200; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:32px; padding:0 16px; }
  .loading-cosmos { width:min(280px,70vw); height:min(280px,70vw); position:relative; border-radius:50%; background:radial-gradient(circle at 50% 50%,#5A2208 0%,#3A1505 48%,#1F0B03 100%); box-shadow:0 0 0 1px rgba(233,184,114,.5),0 18px 48px rgba(89,34,9,.35),inset 0 0 40px rgba(0,0,0,.5); }
  .orbit-ring { position:absolute; border-radius:50%; border:1.5px solid rgba(233,184,114,.75); box-shadow:0 0 10px rgba(229,138,69,.25); animation:orbit-spin linear infinite; }
  .orbit-ring:nth-child(1){inset:5%;  animation-duration:20s; border-style:dashed;}
  .orbit-ring:nth-child(2){inset:17%; animation-duration:14s; animation-direction:reverse;}
  .orbit-ring:nth-child(3){inset:29%; animation-duration:8s;}
  .orbit-ring:nth-child(4){inset:40%; border-color:rgba(229,138,69,.9); animation-duration:4.5s; animation-direction:reverse;}
  .orbit-dot { position:absolute; width:10px; height:10px; border-radius:50%; top:-5px; left:50%; transform:translateX(-50%); background:#F5E9D6 !important; color:#F5E9D6 !important; box-shadow:0 0 8px 2px currentColor; }
  .orbit-ring:nth-child(4) .orbit-dot { background:#E58A45 !important; color:#E58A45 !important; }
  @keyframes orbit-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  .orbit-center { position:absolute; inset:45%; border-radius:50%; background:radial-gradient(circle at 36% 34%,#ffffff 0%,#fff6d0 14%,#F3B25F 42%,#E58A45 100%); animation:pulse-glow 2.4s ease-in-out infinite; z-index:2; }
  .orbit-center::after{ content:''; position:absolute; inset:-90%; border-radius:50%; background:linear-gradient(to right,transparent 0%,rgba(255,246,208,.85) 49.3%,rgba(255,246,208,.85) 50.7%,transparent 100%),linear-gradient(to bottom,transparent 0%,rgba(255,246,208,.85) 49.3%,rgba(255,246,208,.85) 50.7%,transparent 100%); mix-blend-mode:screen; -webkit-mask-image:radial-gradient(circle,black 12%,transparent 62%); mask-image:radial-gradient(circle,black 12%,transparent 62%); pointer-events:none; animation:flare-spin 24s linear infinite; }
  @keyframes flare-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes pulse-glow{0%,100%{box-shadow:0 0 10px 3px rgba(229,138,69,.55),0 0 26px 8px rgba(229,138,69,.35);}50%{box-shadow:0 0 16px 5px rgba(229,138,69,.8),0 0 40px 14px rgba(229,138,69,.5);}}
  .loading-steps { display:flex; flex-direction:column; gap:10px; text-align:center; }
  .loading-step { font-family:'DM Sans', system-ui, sans-serif; font-size:14px; letter-spacing:1.5px; color:#301607; opacity:.6; transition:color 0.5s,opacity 0.5s; display:flex; align-items:center; gap:10px; justify-content:center; }
  .loading-step.active { color:#592209; opacity:1; font-weight:700; }
  .loading-step.done { color:#6B4A37; opacity:.9; }
  .step-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }
  @media (prefers-reduced-motion: reduce) { .orbit-ring, .orbit-center, .orbit-center::after { animation:none; } }
  .results { max-width: 1000px; margin: 0 auto; padding: 20px 20px 80px; }

  /* ── COUPLE HEADER — LARGE VISIBLE NAMES ── */
  .couple-header { text-align:center; padding:50px 20px 44px; }
  .couple-names {
    font-family: var(--font-display);
    font-size: clamp(16px, 3.5vw, 48px);
    background: linear-gradient(135deg,var(--gold) 0%,var(--aurora-2) 45%,var(--aurora-1) 80%,var(--aurora-3) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 16px;
    display: block;
    filter: drop-shadow(0 0 28px rgba(89,34,9,0.5));
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .couple-sub { font-family:var(--font-mono); font-size:12px; letter-spacing:4px; color:rgba(48,22,7,0.9); text-transform:uppercase; display:block; }

  /* ── SCORE CIRCLE ── */
  .score-hero { display:flex; justify-content:center; margin-bottom:48px; }
  .score-circle-wrap { text-align:center; }
  .score-circle { width:200px; height:200px; display:grid; place-items:center; margin:0 auto 16px; position:relative; }
  .score-svg { width:200px; height:200px; transform:rotate(-90deg); position:absolute; top:0; left:0; }
  .score-track { fill:none; stroke:rgba(89,34,9,0.05); stroke-width:10; }
  .score-fill { fill:none; stroke-width:10; stroke-linecap:round; stroke:url(#scoreGrad); }
  .score-inner { display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; z-index:10; }
  .score-num { font-family:var(--font-display); font-size:54px; font-weight:900; color:#301607; line-height:1; display:block; text-shadow:0 0 32px rgba(229,138,69,0.7); }
  .score-pct { font-family:var(--font-mono); font-size:18px; color:rgba(48,22,7,1); margin-top:4px; display:block; }
  .score-label { font-family:var(--font-display); font-size:15px; letter-spacing:2px; color:var(--gold); margin-bottom:4px; }
  .score-tag { font-family:var(--font-mono); font-size:11px; letter-spacing:3px; color:#301607; text-transform:uppercase; }
  .section-head { font-family:var(--font-display); font-size:13px; letter-spacing:3px; color:var(--aurora-3); text-transform:uppercase; margin-bottom:20px; display:flex; align-items:center; gap:12px; }
  .section-head::after { content:''; flex:1; height:1px; background:linear-gradient(to right,rgba(89,34,9,0.3),transparent); }
  .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-bottom:40px; }

  /* ── COMPAT CARD — HOVER GLOW ── */
  .compat-card {
    background: var(--glass);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
    backdrop-filter: blur(12px);
    transition: transform 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease;
    position: relative;
    overflow: hidden;
    cursor: pointer;
  }
  .compat-card::after {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.35s ease;
    z-index: 0;
    pointer-events: none;
    border-radius: 16px;
    background: var(--hov, linear-gradient(135deg,rgba(89,34,9,.2),rgba(89,34,9,.14)));
  }
  .compat-card:hover::after { opacity: 1; }
  .compat-card:hover {
    transform: translateY(-8px) scale(1.025);
    border-color: rgba(89,34,9,0.3);
    box-shadow: 0 24px 70px var(--hov-shadow, rgba(89,34,9,.45)), 0 0 50px rgba(89,34,9,.2);
  }
  .compat-card > * { position: relative; z-index: 1; }

  .card-head { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .card-emoji { font-size:22px; }
  .card-name { font-family:var(--font-display); font-size:12px; letter-spacing:1px; color:#301607; flex:1; }
  .card-score-num { font-family:var(--font-mono); font-size:18px; font-weight:700; color:var(--gold); }
  .prog-bar { height:6px; background:rgba(89,34,9,0.2); border-radius:3px; overflow:hidden; margin-bottom:8px; }
  .prog-fill { height:100%; border-radius:3px; background:var(--bar-color,linear-gradient(to right,var(--aurora-1),var(--aurora-2))); transition:width 1.5s cubic-bezier(0.4,0,0.2,1); width:0; }
  .prog-fill.animate { width:var(--target-width,0%); }
  .prog-label { display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:10px; color:#301607; letter-spacing:1px; }
  .sub-metrics { display:flex; flex-direction:column; gap:10px; }
  .sub-metric-row { display:flex; align-items:center; gap:10px; }
  .sub-metric-label { font-size:13px; color:rgba(48,22,7,1); width:130px; flex-shrink:0; font-style:italic; }
  .sub-metric-bar { flex:1; height:4px; background:rgba(89,34,9,0.2); border-radius:2px; overflow:hidden; }
  .sub-metric-fill { height:100%; border-radius:2px; background:var(--fill-c,var(--aurora-3)); transition:width 1.8s cubic-bezier(0.4,0,0.2,1); width:0; }
  .sub-metric-fill.animate { width:var(--w,0%); }
  .sub-metric-val { font-family:var(--font-mono); font-size:11px; color:var(--fill-c,var(--aurora-3)); width:32px; text-align:right; }
  .insight-box { background:rgba(89,34,9,0.08); border:1px solid rgba(89,34,9,0.25); border-radius:12px; padding:14px 16px; margin-top:12px; font-size:14px; font-style:italic; color:#301607; line-height:1.6; }
  .insight-label { font-family:var(--font-mono); font-size:9px; letter-spacing:3px; color:var(--aurora-1); text-transform:uppercase; margin-bottom:6px; }
  .planet-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:12px; margin-bottom:40px; }
  .planet-item { background:var(--glass); border:1px solid var(--glass-border); border-radius:14px; padding:14px 10px; text-align:center; backdrop-filter:blur(8px); transition:transform 0.2s; }
  .planet-item:hover { transform:translateY(-4px); }
  .planet-symbol { font-size:28px; margin-bottom:6px; }
  .planet-name { font-family:var(--font-mono); font-size:9px; letter-spacing:2px; color:#301607; text-transform:uppercase; margin-bottom:6px; }
  .planet-score { font-family:var(--font-display); font-size:16px; color:var(--gold); }
  .timeline { position:relative; padding:20px 0 20px 30px; margin-bottom:40px; }
  .timeline::before { content:''; position:absolute; left:8px; top:0; bottom:0; width:2px; background:linear-gradient(to bottom,var(--aurora-1),var(--aurora-2),var(--aurora-3)); }
  .tl-item { position:relative; margin-bottom:20px; padding-left:20px; }
  .tl-dot { position:absolute; left:-26px; top:6px; width:12px; height:12px; border-radius:50%; background:var(--dot-c,var(--aurora-1)); border:2px solid var(--void); box-shadow:0 0 12px var(--dot-c,var(--aurora-1)); }
  .tl-phase { font-family:var(--font-mono); font-size:10px; letter-spacing:2px; color:var(--dot-c,var(--aurora-1)); text-transform:uppercase; margin-bottom:3px; }
  .tl-desc { font-size:14px; color:rgba(48,22,7,1); font-style:italic; }
  .flags-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:40px; }
  @media(max-width:600px){.flags-grid{grid-template-columns:1fr;}}
  .flags-col { background:var(--glass); border:1px solid var(--glass-border); border-radius:16px; padding:20px; }
  .flags-col-title { font-family:var(--font-mono); font-size:10px; letter-spacing:3px; text-transform:uppercase; margin-bottom:14px; }
  .flag-item { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; font-size:14px; color:#301607; font-style:italic; }
  .flag-icon { flex-shrink:0; font-size:16px; }
  .ai-insights-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; margin-bottom:40px; }
  .ai-card { background:linear-gradient(135deg,rgba(89,34,9,0.08),rgba(89,34,9,0.05)); border:1px solid rgba(89,34,9,0.2); border-radius:14px; padding:18px; }
  .ai-card-title { font-family:var(--font-mono); font-size:10px; letter-spacing:3px; color:var(--aurora-1); text-transform:uppercase; margin-bottom:10px; }
  .ai-card-text { font-size:15px; color:#301607; line-height:1.65; font-style:italic; }
  .reset-btn { display:block; margin:0 auto; padding:14px 40px; background:transparent; border:1px solid rgba(89,34,9,0.1); border-radius:50px; color:rgba(48,22,7,0.75); font-family:var(--font-mono); font-size:11px; letter-spacing:3px; text-transform:uppercase; cursor:pointer; transition:all 0.3s; }
  .reset-btn:hover { border-color:var(--aurora-1); color:var(--aurora-3); box-shadow:0 0 30px rgba(89,34,9,0.2); }
  .error-box { background:rgba(89,34,9,0.1); border:1px solid rgba(89,34,9,0.3); border-radius:12px; padding:14px 18px; color:#592209; font-family:var(--font-mono); font-size:12px; letter-spacing:1px; margin-bottom:20px; text-align:center; }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:var(--void); }
  ::-webkit-scrollbar-thumb { background:rgba(89,34,9,0.4); border-radius:3px; }

  /* ── WHO LOVES MORE ── */
  .wlm-wrap { margin-bottom: 40px; }
  .wlm-card {
    background: linear-gradient(135deg, rgba(89,34,9,.07), rgba(89,34,9,.07));
    border: 1px solid rgba(89,34,9,.25);
    border-radius: 20px;
    padding: 28px 24px;
    position: relative;
    overflow: hidden;
  }
  .wlm-card::before {
    content: "♥";
    position: absolute;
    right: 24px; top: 16px;
    font-size: 80px;
    color: rgba(48,22,7,0.75);
    line-height: 1;
  }
  .wlm-disclaimer {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(48,22,7,0.72);
    text-transform: uppercase;
    margin-bottom: 20px;
    text-align: center;
  }
  .wlm-persons { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  @media(max-width:560px){ .wlm-persons { grid-template-columns: 1fr; } }
  .wlm-person { text-align: center; }
  .wlm-person-name {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 1px;
    margin-bottom: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wlm-ring-wrap {
    width: 130px;
    height: 130px;
    position: relative;
    margin: 0 auto 14px;
  }
  .wlm-ring-svg { width: 130px; height: 130px; transform: rotate(-90deg); position: absolute; top:0; left:0; }
  .wlm-ring-bg { fill: none; stroke: rgba(89,34,9,0.05); stroke-width: 10; }
  .wlm-ring-fg { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 1.8s cubic-bezier(.4,0,.2,1); }
  .wlm-ring-inner {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0;
  }
  .wlm-pct-num {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 900;
    line-height: 1;
  }
  .wlm-pct-sym { font-size: 14px; color: rgba(48,22,7,0.85); font-family: var(--font-mono); margin-top: 2px; }
  .wlm-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(48,22,7,0.75);
    margin-bottom: 6px;
  }
  .wlm-bar-wrap { height: 6px; background: rgba(89,34,9,0.2); border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
  .wlm-bar-fill { height: 100%; border-radius: 3px; transition: width 1.8s cubic-bezier(.4,0,.2,1); width: 0; }
  .wlm-bar-fill.animate { width: var(--w, 0%); }
  .wlm-intensity-label {
    font-size: 12px;
    font-style: italic;
    color: rgba(48,22,7,0.8);
    font-family: var(--font-body);
    margin-top: 4px;
  }
  .wlm-vs {
    position: relative;
    height: 6px;
    background: rgba(89,34,9,0.05);
    border-radius: 3px;
    overflow: hidden;
    margin: 8px 0 20px;
  }
  .wlm-vs-fill1 { position: absolute; left: 0; top: 0; height: 100%; border-radius: 3px 0 0 3px; transition: width 1.8s cubic-bezier(.4,0,.2,1); }
  .wlm-vs-fill2 { position: absolute; right: 0; top: 0; height: 100%; border-radius: 0 3px 3px 0; transition: width 1.8s cubic-bezier(.4,0,.2,1); }
  .wlm-vs-labels { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: rgba(48,22,7,0.72); margin-bottom: 4px; }
  .wlm-insight {
    background: rgba(89,34,9,0.08);
    border: 1px solid rgba(89,34,9,.18);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
  }
  .wlm-insight-lbl { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #592209; margin-bottom: 6px; }
  .wlm-insight-txt { font-size: 14px; color: rgba(48,22,7,1); line-height: 1.7; font-style: italic; }
  .wlm-pattern-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(89,34,9,.1);
    border: 1px solid rgba(89,34,9,.25);
    border-radius: 50px;
    padding: 6px 16px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #592209;
    margin-bottom: 14px;
  }
  .wlm-confidence {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: rgba(48,22,7,0.72);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .wlm-conf-bar { flex: 1; height: 3px; background: rgba(89,34,9,0.2); border-radius: 2px; overflow: hidden; }
  .wlm-conf-fill { height: 100%; background: linear-gradient(to right, #592209, #592209); border-radius: 2px; transition: width 2s ease; width: 0; }
  .wlm-conf-fill.animate { width: var(--w, 0%); }

`;

const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i);

type Person = { name: string; day: string; month: string; year: string };
const empty = (): Person => ({ name: "", day: "", month: "", year: "" });

function getZodiac(day: number, month: number) {
  const signs: [string, number, number][] = [
    ["Capricorn",1,19],["Aquarius",2,18],["Pisces",3,20],["Aries",4,19],
    ["Taurus",5,20],["Gemini",6,20],["Cancer",7,22],["Leo",8,22],
    ["Virgo",9,22],["Libra",10,22],["Scorpio",11,21],["Sagittarius",12,21],["Capricorn",12,31]
  ];
  for (const [s, m, d] of signs) if (month < m || (month === m && day <= d)) return s;
  return "Capricorn";
}

// ── The method (all deterministic; no scores, no randomness, no AI) ──────────
// 1. Each person's Western (tropical) Sun sign comes from their birth date.
// 2. Elements: same element or Fire+Air / Earth+Water are the traditionally harmonious pairings.
// 3. Aspect: the distance between the two signs around the zodiac (0-6 signs apart) gives the traditional aspect.
const ELEMENT_OF = Object.fromEntries(zodiacSigns.map(z => [z.name, z.element])) as Record<string, string>;
const SIGN_INDEX = Object.fromEntries(zodiacSigns.map((z, i) => [z.name, i])) as Record<string, number>;

type Aspect = { distance: number; name: string; tone: string; text: string };
const ASPECTS: Aspect[] = [
  { distance: 0, name: "Same sign", tone: "Mirror", text: "You share the same Sun sign, so you tend to react in similar ways and share the same blind spots. Traditionally this brings instant familiarity, and it can feel like looking in a mirror." },
  { distance: 1, name: "Neighbouring signs", tone: "Different but close", text: "Neighbouring signs sit side by side on the zodiac but have different elements and qualities. Traditionally each partner can find the other a little puzzling at first, with plenty to learn from one another." },
  { distance: 2, name: "Sextile (two signs apart)", tone: "Supportive", text: "Signs two apart share compatible elements (Fire with Air, or Earth with Water). Traditionally this is a supportive, cooperative link that works well when both put in some effort." },
  { distance: 3, name: "Square (three signs apart)", tone: "Dynamic", text: "Signs three apart have clashing elements and styles. Traditionally this is a dynamic pairing with friction that can motivate growth when handled with patience." },
  { distance: 4, name: "Trine (four signs apart)", tone: "Flowing", text: "Signs four apart share the same element. Traditionally this is the most natural fit, with a similar approach to life and an easy understanding." },
  { distance: 5, name: "Quincunx (five signs apart)", tone: "Needs adjustment", text: "Signs five apart share neither element nor quality. Traditionally there is less common ground, so the pairing asks for more conscious adjustment on both sides." },
  { distance: 6, name: "Opposition (opposite signs)", tone: "Magnetic opposites", text: "Opposite signs sit across the zodiac from each other. Traditionally they are strongly drawn to what the other has, and the lesson is balancing two contrasting approaches." },
];

const ELEMENT_NOTES: Record<string, string> = {
  "Fire+Fire": "You share a fast, enthusiastic approach to life. Traditionally this is a lively match; the thing to watch is two strong wills with little patience.",
  "Earth+Earth": "You share a practical, steady approach. Traditionally this is a stable match; the thing to watch is getting stuck in routine.",
  "Air+Air": "You share a love of ideas and conversation. Traditionally this is a mentally stimulating match; the thing to watch is staying in the head and avoiding feelings.",
  "Water+Water": "You share emotional depth and intuition. Traditionally this is a tender match; the thing to watch is moods feeding each other.",
  "Air+Fire": "Air feeds Fire. Traditionally this is a lively, energetic and compatible pairing, where ideas fuel action.",
  "Earth+Water": "Water nourishes Earth. Traditionally this is a supportive, compatible pairing, where feeling meets practicality.",
  "Earth+Fire": "Fire is spontaneous and Earth is steady. Traditionally this is a contrasting pairing; each can ground or frustrate the other, and it works best with patience for the other's pace.",
  "Air+Water": "Air is thoughtful and Water is feeling-led. Traditionally this is a contrasting pairing, where talk and emotion need translating for each other.",
  "Fire+Water": "Fire is outward and Water is inward. Traditionally this is the most contrasting pairing; it asks for care with each other's sensitivities.",
  "Air+Earth": "Earth is practical and Air is abstract. Traditionally this is a contrasting pairing, where realism and ideas can either complement or talk past each other.",
};

const HARMONIOUS = new Set(["Fire+Fire", "Earth+Earth", "Air+Air", "Water+Water", "Air+Fire", "Earth+Water"]);

const CONVERSATION_STARTERS = [
  "What does feeling cared for look like to each of us?",
  "How do we each prefer to handle disagreements: talk straight away, or take time first?",
  "What are we each hoping for in the next few years, and where do those hopes overlap?",
];

function comparePair(sign1: string, sign2: string) {
  const d = (SIGN_INDEX[sign2] - SIGN_INDEX[sign1] + 12) % 12;
  const distance = Math.min(d, 12 - d);
  const aspect = ASPECTS[distance];
  const e1 = ELEMENT_OF[sign1], e2 = ELEMENT_OF[sign2];
  const key = [e1, e2].sort().join("+");
  return { aspect, e1, e2, elementKey: key, elementNote: ELEMENT_NOTES[key], harmonious: HARMONIOUS.has(key) };
}

const ZODIAC_IMAGES: Record<string, string> = {Aries:zodiacAries,Taurus:zodiacTaurus,Gemini:zodiacGemini,Cancer:zodiacCancer,Leo:zodiacLeo,Virgo:zodiacVirgo,Libra:zodiacLibra,Scorpio:zodiacScorpio,Sagittarius:zodiacSagittarius,Capricorn:zodiacCapricorn,Aquarius:zodiacAquarius,Pisces:zodiacPisces};

function Starfield() {
  const stars = Array.from({ length: 120 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    d: (Math.random() * 4 + 2).toFixed(1),
    delay: (Math.random() * 6).toFixed(2),
    op: (Math.random() * 0.6 + 0.2).toFixed(2),
  }));
  return (
    <div className="starfield">
      {stars.map(s => (
        <div key={s.id} className="star" style={{ left:`${s.x}%`, top:`${s.y}%`, width:s.size, height:s.size, "--d":`${s.d}s`, "--delay":`${s.delay}s`, "--op":s.op } as CSSProperties} />
      ))}
    </div>
  );
}

const ccInputStyle: CSSProperties = {
  width:"100%", background:"#FBF5EC", border:"1px solid rgba(89,34,9,0.2)",
  borderBottom:"2px solid rgba(89,34,9,0.5)", borderRadius:10, padding:"14px 16px",
  color:"#301607", fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:15, outline:"none",
};
const ccLabelStyle: CSSProperties = { display:"block", color:"#592209", fontWeight:700, fontSize:13, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:10 };

const formCss = `
.cc-forms{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}
.cc-hero{display:flex;align-items:center;justify-content:center;gap:clamp(12px,3vw,40px);margin-bottom:48px;}
.cc-two{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px;}
.cc-portrait{position:relative;width:clamp(120px,24vw,300px);height:clamp(120px,24vw,300px);flex-shrink:1;min-width:0;display:flex;align-items:center;justify-content:center;}
@media(max-width:760px){.cc-forms,.cc-two{grid-template-columns:1fr}}
`;

function PersonForm({ idp, title, accentColor, data, onChange }: { idp: string; title: string; accentColor: string; data: Person; onChange: (p: Person) => void }) {
  const up = (k: keyof Person, v: string) => onChange({ ...data, [k]: v });
  return (
    <div style={{background:"#FBF5EC", border:`1px solid ${accentColor}33`, borderRadius:20, padding:"28px 24px"}}>
      <div style={{display:"flex", alignItems:"center", gap:14, marginBottom:24}}>
        <div aria-hidden="true" style={{width:44, height:44, borderRadius:"50%", background:`${accentColor}22`, display:"flex", alignItems:"center", justifyContent:"center", color:accentColor, fontSize:20, flexShrink:0}}>✦</div>
        <h2 style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:20, fontWeight:700, color:"#301607", textTransform:"uppercase", letterSpacing:"0.05em"}}>{title}</h2>
      </div>

      <div style={{marginBottom:20}}>
        <label htmlFor={`${idp}-name`} style={ccLabelStyle}>Name *</label>
        <div style={{position:"relative"}}>
          <User size={16} style={{position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"rgba(48,22,7,0.72)", pointerEvents:"none"}}/>
          <input id={`${idp}-name`} maxLength={60} autoComplete="off" value={data.name} onChange={e => up("name", e.target.value)} placeholder="First name or nickname" style={{...ccInputStyle, paddingLeft:38}} />
        </div>
      </div>

      <div>
        <label htmlFor={`${idp}-day`} style={ccLabelStyle}>Date of Birth *</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1.3fr", gap:10}}>
          <select id={`${idp}-day`} aria-label={`${title} day of birth`} value={data.day} onChange={e => up("day", e.target.value)} style={ccInputStyle}>
            <option value="">DD</option>
            {DAYS.map(d => <option key={d} value={d}>{String(d).padStart(2,"0")}</option>)}
          </select>
          <select id={`${idp}-month`} aria-label={`${title} month of birth`} value={data.month} onChange={e => up("month", e.target.value)} style={ccInputStyle}>
            <option value="">MM</option>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select id={`${idp}-year`} aria-label={`${title} year of birth`} value={data.year} onChange={e => up("year", e.target.value)} style={ccInputStyle}>
            <option value="">YYYY</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

const LOADING_STEPS = ["Finding both Sun signs", "Comparing the elements", "Comparing the signs' aspect"];

function LoadingScreen() {
  return <FullScreenLoader title="Comparing Your Signs" description="Finding both Sun signs and comparing them…" steps={LOADING_STEPS} testId="compatibility-loader" />;
}

function ZodiacPortrait({ zodiac, color }: { zodiac: string; color: string }) {
  return (
    <div className="cc-portrait">
      <div style={{position:"absolute", inset:0, borderRadius:"50%", background:`radial-gradient(circle, ${color}12, transparent 65%)`}}></div>
      <img src={ZODIAC_IMAGES[zodiac]} alt={`${zodiac} symbol`} style={{position:"relative", width:"96%", height:"96%", objectFit:"contain", filter:`drop-shadow(0 0 14px ${color}33)`}}/>
    </div>
  );
}

type Result = { p1: Person & { zodiac: string }; p2: Person & { zodiac: string } };

function Results({ result, onReset }: { result: Result; onReset: () => void }) {
  const { p1, p2 } = result;
  const c = comparePair(p1.zodiac, p2.zodiac);
  const info1 = zodiacSigns.find(z => z.name === p1.zodiac);
  const info2 = zodiacSigns.find(z => z.name === p2.zodiac);

  const cardStyle: CSSProperties = { background:"#FBF5EC", border:"1px solid rgba(89,34,9,0.2)", borderRadius:16, padding:28 };
  const sectionTitle: CSSProperties = { fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:"clamp(20px,4vw,26px)", color:"#301607", fontWeight:700, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:28 };
  const label: CSSProperties = { color:"#6B4A37", fontWeight:700, fontSize:13, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 };
  const pill = (good: boolean): CSSProperties => ({ display:"inline-block", padding:"6px 16px", borderRadius:20, fontSize:14, fontWeight:700, border:`1px solid ${good ? "rgba(47,107,58,0.5)" : "rgba(89,34,9,0.5)"}`, color: good ? "#2F6B3A" : "#9B2C1D", background: good ? "rgba(47,107,58,0.08)" : "rgba(89,34,9,0.08)" });

  return (
    <div data-testid="cc-results" style={{maxWidth:1100, margin:"0 auto", padding:"20px 20px 100px", color:"#301607", fontFamily:"'DM Sans', system-ui, sans-serif"}}>
      <style>{formCss}</style>
      <div style={{textAlign:"center", marginBottom:20, paddingTop:20}}>
        <h1 style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:"clamp(26px,5vw,48px)", color:"#301607", fontWeight:700, letterSpacing:"0.04em", wordBreak:"break-word"}}>
          {p1.name} <span style={{color:"#592209"}}>✦</span> {p2.name}
        </h1>
        <div style={{color:"#592209", fontWeight:600, fontSize:15, letterSpacing:"0.05em", textTransform:"uppercase", marginTop:10}}>
          {FEATURES.compatibility.name} · Sun Sign Compatibility · {p1.zodiac} &amp; {p2.zodiac}
        </div>
      </div>

      <div className="cc-hero">
        <ZodiacPortrait zodiac={p1.zodiac} color="#592209"/>
        <div aria-hidden="true" style={{fontSize:32, color:"#592209"}}>✦</div>
        <ZodiacPortrait zodiac={p2.zodiac} color="#E58A45"/>
      </div>

      <div className="r-note" style={{...cardStyle, marginBottom:40, borderColor:"rgba(89,34,9,0.35)"}}>
        <div style={{...label, color:"#592209"}}>How this comparison was made</div>
        <p style={{fontSize:16, lineHeight:1.7, color:"#4A2E1F"}}>
          Each person's Sun sign comes from their birth date. The Seva then compares the two signs' elements and the traditional aspect between them. It uses fixed written text, no AI, and it does not give a score or percentage, because no recognised formula turns two Sun signs into a single number. Names are shown only for display and do not affect the result.
        </p>
      </div>

      <div className="cc-two">
        {[{p:p1, i:info1}, {p:p2, i:info2}].map(({p,i}) => (
          <div key={p.name + p.zodiac} style={cardStyle}>
            <div style={label}>{p.name}</div>
            <div style={{color:"#301607", fontWeight:800, fontSize:24, marginBottom:6}}>{p.zodiac}</div>
            {i && <div style={{color:"#6B4A37", fontSize:15, lineHeight:1.6}}>{i.dates} · {i.element} · {i.traits.slice(0,3).join(", ")}</div>}
          </div>
        ))}
      </div>

      <div style={{marginBottom:40}}>
        <div style={sectionTitle}>The Sun Sign Pairing</div>
        <div className="cc-two" style={{marginBottom:0}}>
          <div data-testid="cc-aspect" style={cardStyle}>
            <div style={label}>Aspect between the signs</div>
            <div style={{color:"#301607", fontWeight:800, fontSize:22, marginBottom:10}}>{c.aspect.name}</div>
            <div style={{marginBottom:14}}><span style={pill(["Flowing","Supportive","Mirror"].includes(c.aspect.tone))}>{c.aspect.tone}</span></div>
            <p style={{fontSize:16, lineHeight:1.7, color:"#4A2E1F"}}>{c.aspect.text}</p>
          </div>
          <div data-testid="cc-elements" style={cardStyle}>
            <div style={label}>Element pairing</div>
            <div style={{color:"#301607", fontWeight:800, fontSize:22, marginBottom:10}}>{c.e1 === c.e2 ? `Two ${c.e1} signs` : `${c.e1} with ${c.e2}`}</div>
            <div style={{marginBottom:14}}><span style={pill(c.harmonious)}>{c.harmonious ? "Traditionally harmonious" : "Traditionally contrasting"}</span></div>
            <p style={{fontSize:16, lineHeight:1.7, color:"#4A2E1F"}}>{c.elementNote}</p>
          </div>
        </div>
      </div>

      <div style={{marginBottom:40}}>
        <div style={sectionTitle}>Questions to Talk About Together</div>
        <div style={cardStyle}>
          <p style={{fontSize:14, color:"#6B4A37", marginBottom:14}}>These conversation starters are the same for every pair. They are prompts for you both, not part of the astrological result.</p>
          <ul style={{paddingLeft:20, display:"grid", gap:10, fontSize:16, lineHeight:1.6, color:"#301607"}}>
            {CONVERSATION_STARTERS.map(q => <li key={q}>{q}</li>)}
          </ul>
        </div>
      </div>

      <p style={{maxWidth:680, margin:"0 auto 28px", textAlign:"center", fontSize:14, lineHeight:1.7, fontStyle:"italic", color:"#6B4A37"}}>
        Sun sign compatibility is a traditional idea for personal interest and reflection. It does not predict whether a relationship will succeed, and people with any pairing can have a good relationship.
      </p>
      <button onClick={onReset} style={{display:"block", margin:"0 auto", padding:"16px 44px", background:"#592209", border:"none", borderRadius:40, color:"#F5E9D6", fontWeight:700, fontSize:16, cursor:"pointer"}}>
        Compare Another Pair ✦
      </button>
    </div>
  );
}

function checkPerson(p: Person, who: string): string | null {
  if (!p.name.trim() || !p.day || !p.month || !p.year) return `${who}: please enter a name and a complete date of birth.`;
  const day = +p.day, month = +p.month, year = +p.year;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return `${who}: that date of birth doesn't exist. Please check the day, month and year.`;
  if (dt > new Date()) return `${who}: the date of birth can't be in the future.`;
  return null;
}

export default function App() {
  useFeatureTitle(FEATURES.compatibility);
  const [p1,setP1] = useState<Person>(empty());
  const [p2,setP2] = useState<Person>(empty());
  const [phase,setPhase] = useState("form");
  const [result,setResult] = useState<Result | null>(null);
  const [error,setError] = useState("");
  const runRef = useRef(0);

  // Scroll offset carries over across phase changes, so reset it when the view changes.
  useEffect(() => { window.scrollTo(0, 0); }, [phase]);

  // Back button returns to form from loading/results phases
  useBackOverride(
    phase !== "form" ? () => { runRef.current++; setPhase("form"); setResult(null); setError(""); } : null,
    [phase],
  );

  const compute = useCallback(async () => {
    if (phase !== "form") return; // ignore double submits
    if (!requireSignIn()) return; // account required to generate a reading
    setError("");
    const problem = checkPerson(p1, "Person 1") || checkPerson(p2, "Person 2");
    if (problem) { setError(problem); return; }
    const run = ++runRef.current;
    setPhase("loading");
    const z1 = getZodiac(+p1.day, +p1.month), z2 = getZodiac(+p2.day, +p2.month);
    // Short pause so the progress steps can be read; the comparison itself is computed instantly.
    await new Promise(r => setTimeout(r, 1300));
    if (run !== runRef.current) return; // user went back while loading
    setResult({ p1: { ...p1, name: p1.name.trim(), zodiac: z1 }, p2: { ...p2, name: p2.name.trim(), zodiac: z2 } });
    setPhase("results");
  },[p1,p2,phase]);

  return (
    <div className="universe-app">
      <Starfield/>
      <div className="nebula-blob" style={{width:600,height:600,top:"-200px",left:"-200px",background:"radial-gradient(circle,rgba(89,34,9,0.15),transparent 70%)",animationDuration:"18s"}}/>
      <div className="nebula-blob" style={{width:500,height:500,bottom:"10%",right:"-150px",background:"radial-gradient(circle,rgba(89,34,9,0.12),transparent 70%)",animationDuration:"22s",animationDelay:"3s"}}/>
      <div className="nebula-blob" style={{width:400,height:400,top:"40%",left:"30%",background:"radial-gradient(circle,rgba(89,34,9,0.07),transparent 70%)",animationDuration:"25s",animationDelay:"6s"}}/>
      {phase==="loading" && <LoadingScreen/>}
      <div className="content" style={{display:phase==="loading"?"none":"block"}}>
        {phase==="form" && (
          <>
            <style>{formCss}</style>
            <div style={{textAlign:"center", padding:"60px 20px 40px"}}>
              <div style={{color:"#301607", fontStyle:"italic", fontSize:15, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:24}}>
                <span style={{color:"#592209"}}>✦</span> {FEATURES.compatibility.name} <span style={{color:"#592209"}}>✦</span>
              </div>
              <h1 style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:"clamp(28px,5vw,48px)", fontWeight:700, color:"#301607", letterSpacing:"0.05em", textTransform:"uppercase", lineHeight:1.25, marginBottom:20}}>
                {FEATURES.compatibility.name}<br/><span style={{color:"#592209"}}>Sun Sign Compatibility</span>
              </h1>
              <p style={{color:"#301607", fontStyle:"italic", fontSize:18, maxWidth:620, margin:"0 auto 8px"}}>{FEATURES.compatibility.subtitle}</p>
              <p style={{color:"#301607", fontStyle:"italic", fontSize:16, maxWidth:560, margin:"0 auto"}}>This Seva compares the two Western (tropical) Sun signs only. It is not Ashtakoota Guna Milan, which uses both Moon signs and Nakshatras. Enter two birth dates to compare.</p>
            </div>
            <div style={{maxWidth:1000, margin:"0 auto", padding:"20px 24px 80px"}}>
              {error && <div role="alert" style={{background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"12px 16px", color:"#9B2C1D", fontSize:14, marginBottom:24, textAlign:"center"}}>⚠ {error}</div>}
              <div className="cc-forms">
                <PersonForm idp="cc1" title="Person 1" accentColor="#60a5fa" data={p1} onChange={setP1}/>
                <PersonForm idp="cc2" title="Person 2" accentColor="#592209" data={p2} onChange={setP2}/>
              </div>
              <button
                onClick={compute}
                style={{display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", maxWidth:420, margin:"0 auto", padding:"18px", background:"#592209", border:"none", borderRadius:40, color:"#F5E9D6", fontWeight:800, fontSize:17, letterSpacing:"0.05em", textTransform:"uppercase", cursor:"pointer"}}
              >
                Compare Signs <ArrowRight size={18}/>
              </button>
            </div>
          </>
        )}
        {phase==="results" && result && (
          <Results result={result} onReset={()=>{setPhase("form");setResult(null);setP1(empty());setP2(empty());}}/>
        )}
        {(phase==="form" || phase==="results") && <CompatibilityEducation/>}
      </div>
    </div>
  );
}
