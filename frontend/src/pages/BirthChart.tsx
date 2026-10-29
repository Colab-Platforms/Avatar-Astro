// import { useState, useEffect, useRef, useCallback } from "react";
// import { useBackOverride } from "../context/NavigationContext";

// // ── Google Fonts ─────────────────────────────────────────────────────────────
// 
// // ── CSS ───────────────────────────────────────────────────────────────────────
// const css = `
// :root {
//   --void:#03010a; --deep:#07030f; --glass:rgba(89,34,9,0.05);
//   --gb:rgba(89,34,9,0.05); --gold:#592209; --gold2:#D9895F;
//   --pur:#592209; --pink:#592209; --cyan:#592209; --green:#592209;
//   --fd:'DM Sans', system-ui, sans-serif; --fb:'DM Sans', system-ui, sans-serif; --fm:'DM Sans', system-ui, sans-serif;
// }
// *{box-sizing:border-box;margin:0;padding:0;}
// .bc-app{min-height:100vh;background:var(--void);color:#301607;font-family:var(--fb);font-size:17px;overflow-x:hidden;position:relative;}

// /* Stars */
// .sf{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;}
// .st{position:absolute;border-radius:50%;background:rgba(89,34,9,0.25);animation:twk var(--d) ease-in-out infinite;animation-delay:var(--dl);opacity:var(--op);}
// @keyframes twk{0%,100%{opacity:var(--op);transform:scale(1);}50%{opacity:.05;transform:scale(.4);}}

// /* Nebula */
// .nb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0;animation:drft var(--nd,20s) ease-in-out infinite alternate;}
// @keyframes drft{from{transform:translate(0,0) scale(1);}to{transform:translate(30px,25px) scale(1.08);}}

// .content{position:relative;z-index:1;}

// /* ── FORM ── */
// .form-wrap{max-width:600px;margin:0 auto;padding:60px 20px 80px;}
// .form-head{text-align:center;margin-bottom:48px;}
// .form-tag{font-family:var(--fm);font-size:10px;letter-spacing:6px;color:var(--cyan);text-transform:uppercase;margin-bottom:14px;}
// .form-h1{font-family:var(--fd);font-size:clamp(20px,4vw,40px);font-weight:900;color:var(--gold);line-height:1.2;margin-bottom:10px;text-shadow:0 0 40px rgba(89,34,9,.4);}
// .form-sub{color:#592209;font-style:italic;font-size:16px;}

// .f-card{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:32px 28px;backdrop-filter:blur(16px);}
// .f-field{margin-bottom:20px;}
// .f-label{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:#592209;text-transform:uppercase;display:block;margin-bottom:8px;}
// .f-input{width:100%;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.05);border-radius:10px;padding:13px 16px;color:#301607;font-family:var(--fb);font-size:16px;outline:none;transition:border .3s,box-shadow .3s;}
// .f-input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(89,34,9,.12);}
// .f-input::placeholder{color:rgba(48,22,7,0.75);}
// .f-input option{background:#FBF5EC;}
// .drow{display:grid;grid-template-columns:2fr 2fr 3fr;gap:8px;}
// .trow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
// .f-hint{font-size:13px;color:rgba(48,22,7,0.75);margin-top:5px;font-style:italic;}

// /* Name input */
// .name-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
// @media(max-width:500px){.name-row,.drow,.trow{grid-template-columns:1fr;}}

// /* Place autocomplete */
// .pl-wrap{position:relative;}
// .pl-drop{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#FBF5EC;border:1px solid rgba(89,34,9,.4);border-radius:10px;z-index:100;overflow:hidden;box-shadow:0 20px 60px rgba(89,34,9,0.2);}
// .pl-item{padding:10px 14px;cursor:pointer;font-size:15px;transition:background .2s;border-bottom:1px solid rgba(89,34,9,0.2);}
// .pl-item:hover{background:rgba(89,34,9,0.08);}
// .pl-item small{display:block;font-size:11px;color:#592209;margin-top:2px;font-family:var(--fm);}

// /* Generate btn */
// .gen-btn{width:100%;margin-top:8px;padding:18px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:12px;color:#F5E9D6;font-family:var(--fd);font-size:13px;letter-spacing:2px;font-weight:700;cursor:pointer;text-transform:uppercase;transition:transform .2s,box-shadow .3s;position:relative;overflow:hidden;}
// .gen-btn:hover{transform:translateY(-2px);box-shadow:0 20px 60px rgba(89,34,9,.35);}
// .gen-btn:active{transform:translateY(0);}
// .err-box{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.3);border-radius:10px;padding:12px 16px;color:#592209;font-family:var(--fm);font-size:12px;letter-spacing:1px;margin-bottom:16px;text-align:center;}

// /* ── LOADING ── */
// .load-screen{position:fixed;inset:0;background:var(--void);z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;}
// .load-cosmos{width:200px;height:200px;position:relative;}
// .orb{position:absolute;border-radius:50%;border:1.5px solid transparent;animation:spin linear infinite;}
// .orb:nth-child(1){inset:0;border-color:rgba(89,34,9,.5);animation-duration:5s;}
// .orb:nth-child(2){inset:24px;border-color:rgba(89,34,9,.5);animation-duration:3.5s;animation-direction:reverse;}
// .orb:nth-child(3){inset:48px;border-color:rgba(89,34,9,.5);animation-duration:6s;}
// .orb:nth-child(4){inset:70px;border-color:rgba(89,34,9,.4);animation-duration:4s;animation-direction:reverse;}
// .orb-dot{position:absolute;width:8px;height:8px;border-radius:50%;top:-4px;left:50%;transform:translateX(-50%);}
// @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
// .orb-core{position:absolute;inset:80px;border-radius:50%;background:radial-gradient(circle,var(--gold),var(--pink));display:flex;align-items:center;justify-content:center;font-size:22px;animation:pglow 2s ease-in-out infinite;}
// @keyframes pglow{0%,100%{box-shadow:0 0 20px rgba(89,34,9,.5);}50%{box-shadow:0 0 60px rgba(89,34,9,.8),0 0 100px rgba(89,34,9,.4);}}
// .load-steps{display:flex;flex-direction:column;gap:10px;text-align:center;}
// .load-step{font-family:var(--fm);font-size:11px;letter-spacing:2px;color:rgba(48,22,7,0.75);transition:color .5s;display:flex;align-items:center;gap:10px;justify-content:center;}
// .load-step.active{color:var(--cyan);text-shadow:0 0 20px var(--cyan);}
// .load-step.done{color:var(--gold);}
// .ls-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
// .load-name{font-family:var(--fd);font-size:clamp(14px,3vw,24px);color:var(--gold);text-align:center;opacity:.7;letter-spacing:2px;}

// /* ── RESULTS ── */
// .results{max-width:1000px;margin:0 auto;padding:20px 20px 100px;}

// /* Section heading */
// .s-head{font-family:var(--fd);font-size:11px;letter-spacing:4px;color:var(--cyan);text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:12px;}
// .s-head::after{content:'';flex:1;height:1px;background:linear-gradient(to right,rgba(89,34,9,0.08),transparent);}
// .s-space{margin-bottom:48px;}

// /* Life purpose reveal */
// .purpose-hero{text-align:center;padding:60px 20px;background:radial-gradient(ellipse at center,rgba(89,34,9,.08) 0%,transparent 70%);border-radius:24px;border:1px solid rgba(89,34,9,.12);margin-bottom:48px;}
// .purpose-tag{font-family:var(--fm);font-size:10px;letter-spacing:5px;color:var(--gold);text-transform:uppercase;margin-bottom:20px;}
// .purpose-statement{font-family:var(--fd);font-size:clamp(16px,2.5vw,26px);color:#301607;line-height:1.5;max-width:600px;margin:0 auto;text-shadow:0 0 40px rgba(89,34,9,.3);}

// /* Soul archetype cards */
// .arch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:48px;}
// .arch-card{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px 14px;text-align:center;backdrop-filter:blur(12px);transition:transform .2s,border-color .3s,box-shadow .3s;cursor:default;animation:fadeUp .6s ease both;}
// .arch-card:hover{transform:translateY(-6px);border-color:rgba(89,34,9,.4);box-shadow:0 20px 50px rgba(89,34,9,.15);}
// @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
// .arch-icon{font-size:32px;margin-bottom:10px;}
// .arch-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--gold);}
// .arch-desc{font-size:12px;color:#592209;margin-top:5px;font-style:italic;}

// /* Cosmic DNA */
// .dna-wrap{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:28px;backdrop-filter:blur(12px);margin-bottom:48px;}
// .dna-row{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
// .dna-label{font-family:var(--fm);font-size:11px;letter-spacing:2px;color:#592209;width:110px;flex-shrink:0;text-transform:uppercase;}
// .dna-bar{flex:1;height:8px;background:rgba(89,34,9,0.2);border-radius:4px;overflow:hidden;}
// .dna-fill{height:100%;border-radius:4px;background:var(--bc,linear-gradient(to right,var(--pur),var(--cyan)));transition:width 2s cubic-bezier(.4,0,.2,1);width:0;}
// .dna-fill.go{width:var(--tw,0%);}
// .dna-val{font-family:var(--fm);font-size:13px;font-weight:700;color:var(--gold);width:40px;text-align:right;}

// /* Cards grid */
// .cards-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:48px;}
// .cards-3{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-bottom:48px;}
// @media(max-width:600px){.cards-2{grid-template-columns:1fr;}}
// .r-card{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:22px;backdrop-filter:blur(12px);transition:transform .2s,border-color .3s;}
// .r-card:hover{transform:translateY(-3px);border-color:rgba(89,34,9,0.2);}
// .r-card-icon{font-size:26px;margin-bottom:10px;}
// .r-card-title{font-family:var(--fd);font-size:11px;letter-spacing:2px;color:var(--gold);margin-bottom:8px;text-transform:uppercase;}
// .r-card-val{font-size:20px;color:#301607;font-weight:600;margin-bottom:6px;}
// .r-card-desc{font-size:14px;color:#592209;font-style:italic;line-height:1.5;}

// /* Superpowers */
// .powers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:48px;}
// .power-card{background:linear-gradient(135deg,rgba(89,34,9,.07),rgba(89,34,9,.06));border:1px solid rgba(89,34,9,.18);border-radius:14px;padding:18px;animation:fadeUp .5s ease both;transition:transform .2s;}
// .power-card:hover{transform:translateY(-4px);}
// .power-icon{font-size:24px;margin-bottom:8px;}
// .power-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--green);margin-bottom:5px;}
// .power-desc{font-size:13px;color:#592209;font-style:italic;}

// /* Shadow side */
// .shadow-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:48px;}
// .shadow-card{background:linear-gradient(135deg,rgba(89,34,9,.07),rgba(89,34,9,.05));border:1px solid rgba(89,34,9,.2);border-radius:14px;padding:18px;transition:transform .2s;}
// .shadow-card:hover{transform:translateY(-4px);}
// .shadow-icon{font-size:22px;margin-bottom:8px;}
// .shadow-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:#592209;margin-bottom:4px;}
// .shadow-tip{font-size:13px;color:#592209;font-style:italic;}

// /* Timeline */
// .tl-wrap{position:relative;padding:10px 0 10px 32px;margin-bottom:48px;}
// .tl-wrap::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--gold),var(--pink),var(--cyan));}
// .tl-item{position:relative;margin-bottom:24px;padding-left:18px;}
// .tl-dot2{position:absolute;left:-26px;top:8px;width:14px;height:14px;border-radius:50%;background:var(--dc,var(--gold));border:2px solid var(--void);box-shadow:0 0 14px var(--dc,var(--gold));}
// .tl-phase{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:var(--dc,var(--gold));text-transform:uppercase;margin-bottom:4px;}
// .tl-range{font-family:var(--fd);font-size:14px;color:#301607;margin-bottom:3px;}
// .tl-desc{font-size:14px;color:#592209;font-style:italic;line-height:1.5;}

// /* Planet dashboard */
// .planet-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;margin-bottom:20px;}
// .p-item{background:var(--glass);border:1px solid var(--gb);border-radius:14px;padding:16px 10px;text-align:center;cursor:pointer;transition:transform .2s,border-color .3s,box-shadow .3s;}
// .p-item:hover,.p-item.sel{transform:translateY(-4px);border-color:var(--gold);box-shadow:0 0 30px rgba(89,34,9,.2);}
// .p-sym{font-size:30px;margin-bottom:6px;}
// .p-name{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:5px;}
// .p-score{font-family:var(--fd);font-size:15px;color:var(--gold);}
// .p-panel{background:linear-gradient(135deg,rgba(89,34,9,.1),rgba(89,34,9,.06));border:1px solid rgba(89,34,9,.25);border-radius:16px;padding:24px;margin-bottom:48px;animation:fadeUp .4s ease;}
// .p-panel-title{font-family:var(--fd);font-size:16px;color:var(--gold);margin-bottom:6px;}
// .p-panel-sub{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:var(--cyan);text-transform:uppercase;margin-bottom:14px;}
// .p-panel-body{font-size:15px;color:#592209;line-height:1.7;font-style:italic;}
// .p-traits{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
// .p-trait{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.2);border-radius:20px;padding:5px 14px;font-family:var(--fm);font-size:10px;letter-spacing:1px;color:var(--gold);}

// /* Aura */
// .aura-wrap{text-align:center;padding:40px 20px;margin-bottom:48px;}
// .aura-glow{width:160px;height:160px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:50px;animation:aura-pulse 3s ease-in-out infinite;}
// @keyframes aura-pulse{0%,100%{box-shadow:0 0 40px var(--ac,rgba(89,34,9,.5)),0 0 80px var(--ac,rgba(89,34,9,.25));}50%{box-shadow:0 0 80px var(--ac,rgba(89,34,9,.8)),0 0 160px var(--ac,rgba(89,34,9,.4));}}
// .aura-name{font-family:var(--fd);font-size:22px;color:var(--gold);margin-bottom:8px;}
// .aura-meaning{font-size:16px;color:#592209;font-style:italic;}

// /* Lucky system */
// .lucky-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:48px;}
// .lucky-item{background:var(--glass);border:1px solid var(--gb);border-radius:14px;padding:18px 12px;text-align:center;transition:transform .2s;}
// .lucky-item:hover{transform:translateY(-3px);}
// .lucky-icon{font-size:26px;margin-bottom:8px;}
// .lucky-type{font-family:var(--fm);font-size:9px;letter-spacing:3px;color:#592209;text-transform:uppercase;margin-bottom:5px;}
// .lucky-val{font-family:var(--fd);font-size:15px;color:var(--gold);}

// /* Gauge */
// .gauge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:48px;}
// .gauge-item{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px;text-align:center;backdrop-filter:blur(8px);}
// .gauge-svg{width:100px;height:100px;display:block;margin:0 auto 10px;transform:rotate(-90deg);}
// .gauge-track{fill:none;stroke:rgba(89,34,9,0.05);stroke-width:8;}
// .gauge-fill{fill:none;stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset 2s cubic-bezier(.4,0,.2,1);}
// .gauge-inner{display:grid;place-items:center;}
// .gauge-svg-wrap{display:grid;place-items:center;width:100px;height:100px;margin:0 auto 10px;}
// .gauge-svg2{width:100px;height:100px;transform:rotate(-90deg);grid-area:1/1;}
// .gauge-num{grid-area:1/1;font-family:var(--fd);font-size:20px;color:var(--gold);font-weight:700;}
// .gauge-label{font-family:var(--fm);font-size:10px;letter-spacing:2px;color:#592209;text-transform:uppercase;}

// /* Power years */
// .pyears-wrap{margin-bottom:48px;}
// .py-item{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid rgba(89,34,9,0.2);}
// .py-year{font-family:var(--fd);font-size:18px;color:var(--gold);width:60px;flex-shrink:0;}
// .py-stars{flex:1;}
// .py-desc{font-size:14px;color:#592209;font-style:italic;width:220px;text-align:right;}

// /* Forecast */
// .forecast-tabs{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
// .f-tab{padding:8px 18px;border-radius:20px;font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border:1px solid rgba(89,34,9,0.1);background:transparent;color:#592209;transition:all .3s;}
// .f-tab.active{background:linear-gradient(135deg,var(--pur),var(--pink));border-color:transparent;color:#F5E9D6;box-shadow:0 0 20px rgba(89,34,9,.3);}
// .forecast-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:48px;}
// @media(max-width:600px){.forecast-grid{grid-template-columns:repeat(2,1fr);}}
// .fc-item{background:var(--glass);border:1px solid var(--gb);border-radius:12px;padding:14px 10px;text-align:center;}
// .fc-icon{font-size:22px;margin-bottom:6px;}
// .fc-type{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:6px;}
// .fc-bar{height:5px;background:rgba(89,34,9,0.2);border-radius:3px;overflow:hidden;margin-bottom:7px;}
// .fc-bfill{height:100%;border-radius:3px;transition:width 1.6s cubic-bezier(.4,0,.2,1);width:0;}
// .fc-bfill.go{width:var(--fw,0%);}
// .fc-val{font-family:var(--fd);font-size:15px;font-weight:700;color:var(--fcolor,var(--gold));}

// /* AI Chat */
// .chat-wrap{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:24px;margin-bottom:48px;backdrop-filter:blur(12px);}
// .chat-msgs{max-height:320px;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;}
// .chat-msgs::-webkit-scrollbar{width:4px;}
// .chat-msgs::-webkit-scrollbar-thumb{background:rgba(89,34,9,.4);border-radius:2px;}
// .chat-msg{padding:12px 16px;border-radius:12px;font-size:15px;line-height:1.6;max-width:85%;}
// .chat-msg.user{background:linear-gradient(135deg,rgba(89,34,9,.25),rgba(89,34,9,.15));border:1px solid rgba(89,34,9,.2);align-self:flex-end;font-style:italic;}
// .chat-msg.ai{background:rgba(89,34,9,.07);border:1px solid rgba(89,34,9,.15);align-self:flex-start;color:#592209;}
// .chat-msg.loading{color:#592209;font-style:italic;font-size:14px;}
// .chat-row{display:flex;gap:10px;}
// .chat-input{flex:1;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.05);border-radius:10px;padding:12px 16px;color:#301607;font-family:var(--fb);font-size:15px;outline:none;transition:border .3s;}
// .chat-input:focus{border-color:var(--gold);}
// .chat-send{padding:12px 20px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;color:#F5E9D6;font-family:var(--fd);font-size:11px;letter-spacing:1px;cursor:pointer;transition:transform .2s;white-space:nowrap;}
// .chat-send:hover{transform:translateY(-1px);}
// .chat-send:disabled{opacity:.5;cursor:not-allowed;}
// .chat-qs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
// .chat-q{padding:6px 14px;background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.2);border-radius:20px;font-size:13px;color:#592209;cursor:pointer;transition:all .2s;font-style:italic;}
// .chat-q:hover{background:rgba(89,34,9,.2);color:#301607;}

// /* Universe scoreboard */
// .scoreboard{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:48px;}
// .sb-item{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px;text-align:center;backdrop-filter:blur(8px);}
// .sb-icon{font-size:24px;margin-bottom:10px;}
// .sb-label{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:8px;}
// .sb-score{font-family:var(--fd);font-size:26px;color:var(--gold);}

// /* WOW finale */
// .wow-wrap{text-align:center;padding:60px 20px;background:radial-gradient(ellipse at center,rgba(89,34,9,.06),transparent 70%);border-radius:24px;border:1px solid rgba(89,34,9,.1);margin-bottom:48px;}
// .wow-title{font-family:var(--fd);font-size:clamp(18px,3vw,32px);color:var(--gold);margin-bottom:8px;text-shadow:0 0 40px rgba(89,34,9,.4);}
// .wow-sub{font-family:var(--fm);font-size:10px;letter-spacing:5px;color:#592209;text-transform:uppercase;margin-bottom:40px;}
// .wow-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:left;}
// @media(max-width:600px){.wow-cols{grid-template-columns:1fr;}}
// .wow-col-title{font-family:var(--fm);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;}
// .wow-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:14px;color:#592209;font-style:italic;}

// /* Reset */
// .reset-btn{display:block;margin:0 auto;padding:14px 40px;background:transparent;border:1px solid rgba(89,34,9,0.1);border-radius:50px;color:#592209;font-family:var(--fm);font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
// .reset-btn:hover{border-color:var(--gold);color:var(--gold);box-shadow:0 0 30px rgba(89,34,9,.15);}

// /* Couple header */
// .r-header{text-align:center;padding:50px 20px 40px;}
// .r-name{font-family:var(--fd);font-size:clamp(18px,3vw,32px);background:linear-gradient(135deg,var(--gold),var(--gold2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;}
// .r-sub{font-family:var(--fm);font-size:10px;letter-spacing:4px;color:rgba(48,22,7,0.75);text-transform:uppercase;}

// /* Shareable card */
// .share-card{background:#F5E9D6;border:1px solid rgba(89,34,9,.25);border-radius:20px;padding:32px;text-align:center;margin-bottom:48px;position:relative;overflow:hidden;}
// .share-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(89,34,9,0.08),transparent 60%);pointer-events:none;}
// .share-title{font-family:var(--fd);font-size:11px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;margin-bottom:20px;}
// .share-inner{display:inline-block;background:linear-gradient(135deg,rgba(89,34,9,.06),rgba(89,34,9,.06));border:1px solid rgba(89,34,9,.15);border-radius:16px;padding:24px 32px;margin-bottom:20px;}
// .share-sname{font-family:var(--fd);font-size:20px;color:#301607;margin-bottom:4px;}
// .share-zodiac{font-family:var(--fm);font-size:11px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:14px;}
// .share-tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
// .share-tag{background:rgba(89,34,9,.12);border:1px solid rgba(89,34,9,.2);border-radius:20px;padding:4px 14px;font-family:var(--fm);font-size:10px;color:var(--gold);}
// .share-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
// .share-btn{padding:10px 20px;border-radius:20px;font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:transform .2s;border:none;color:#301607;}
// .share-btn:hover{transform:translateY(-2px);}
// `;

// const styleEl = document.createElement("style");
// styleEl.textContent = css;
// document.head.appendChild(styleEl);

// // ── Data helpers ─────────────────────────────────────────────────────────────
// const DAYS   = Array.from({length:31},(_,i)=>i+1);
// const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const YEARS  = Array.from({length:120},(_,i)=>new Date().getFullYear()-i);
// const HOURS  = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
// const MINS   = ["00","05","10","15","20","25","30","35","40","45","50","55"];

// function getZodiac(d,m){
//   const s=[["Capricorn",1,19],["Aquarius",2,18],["Pisces",3,20],["Aries",4,19],["Taurus",5,20],["Gemini",6,20],["Cancer",7,22],["Leo",8,22],["Virgo",9,22],["Libra",10,22],["Scorpio",11,21],["Sagittarius",12,21],["Capricorn",12,31]];
//   for(const[z,mo,dy]of s)if(m<mo||(m===mo&&d<=dy))return z;
//   return "Capricorn";
// }
// function getLP(dob){
//   let s=dob.replace(/-/g,"").split("").map(Number).reduce((a,b)=>a+b,0);
//   while(s>9&&s!==11&&s!==22)s=String(s).split("").map(Number).reduce((a,b)=>a+b,0);
//   return s;
// }
// function hash(str){return str.split("").reduce((a,c)=>(a*31+c.charCodeAt(0))&0xffff,0);}
// function dv(base,seed,lo=55,hi=98){const h=hash(seed);return Math.min(hi,Math.max(lo,base+(h%22)-11));}

// const ZODIAC_SYMBOLS={Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓"};
// const PLANET_INFO={
//   "☀️Sun":  {name:"Sun",  desc:"Your core identity, ego, and life force energy.",  traits:["Vitality","Self-Expression","Leadership","Confidence"]},
//   "🌙Moon":  {name:"Moon", desc:"Your emotional world, instincts, and subconscious patterns.", traits:["Intuition","Emotions","Nurturing","Memory"]},
//   "☿Mercury":{name:"Mercury",desc:"How you think, communicate, and process information.",traits:["Communication","Logic","Wit","Adaptability"]},
//   "♀Venus":  {name:"Venus",desc:"Your love language, aesthetic sense, and attraction style.",traits:["Love","Beauty","Harmony","Values"]},
//   "♂Mars":   {name:"Mars", desc:"Your drive, ambition, and how you pursue desires.",traits:["Energy","Passion","Courage","Initiative"]},
//   "♃Jupiter":{name:"Jupiter",desc:"Where you find growth, luck, and expansion in life.",traits:["Wisdom","Optimism","Abundance","Growth"]},
//   "♄Saturn": {name:"Saturn",desc:"Life lessons, discipline, and long-term karmic structure.",traits:["Discipline","Karma","Responsibility","Mastery"]},
//   "⬆Rising": {name:"Rising",desc:"Your outer personality and how the world first perceives you.",traits:["Appearance","First Impression","Social Mask","Persona"]},
// };

// const ARCHETYPES=[
//   {icon:"🦅",name:"Explorer",   desc:"Born to discover"},
//   {icon:"🎨",name:"Creator",    desc:"Born to build"},
//   {icon:"👑",name:"Leader",     desc:"Born to inspire"},
//   {icon:"💊",name:"Healer",     desc:"Born to heal"},
//   {icon:"🔭",name:"Visionary",  desc:"Born to envision"},
//   {icon:"🛡",name:"Guardian",   desc:"Born to protect"},
// ];

// const SPIRIT_ANIMALS={
//   Aries:"🦁 Lion",Taurus:"🐂 Bull",Gemini:"🦋 Butterfly",Cancer:"🦀 Crab",
//   Leo:"🦁 Lion",Virgo:"🐺 Wolf",Libra:"🦢 Swan",Scorpio:"🦅 Eagle",
//   Sagittarius:"🐎 Horse",Capricorn:"🐐 Mountain Goat",Aquarius:"🦅 Eagle",Pisces:"🐬 Dolphin"
// };

// const AURA_COLORS={
//   Aries:{color:"#9B2C1D",name:"Red Aura",   meaning:"Power, passion, and unstoppable energy"},
//   Taurus:{color:"#2F6B3A",name:"Green Aura", meaning:"Abundance, grounding, and natural wealth"},
//   Gemini:{color:"#301607",name:"Yellow Aura",meaning:"Intellect, creativity, and bright communication"},
//   Cancer:{color:"#592209",name:"Blue Aura",  meaning:"Empathy, intuition, and deep emotional wisdom"},
//   Leo:{color:"#592209",   name:"Golden Aura",meaning:"Leadership, abundance, and radiant confidence"},
//   Virgo:{color:"#6B4A37", name:"Emerald Aura",meaning:"Healing, precision, and natural intelligence"},
//   Libra:{color:"#592209", name:"Pink Aura",  meaning:"Love, harmony, and beautiful balance"},
//   Scorpio:{color:"#592209",name:"Violet Aura",meaning:"Mystery, transformation, and spiritual power"},
//   Sagittarius:{color:"#592209",name:"Orange Aura",meaning:"Freedom, adventure, and inspiring wisdom"},
//   Capricorn:{color:"#888888",name:"Silver Aura",meaning:"Discipline, ambition, and timeless mastery"},
//   Aquarius:{color:"#6B4A37",name:"Electric Blue Aura",meaning:"Innovation, humanity, and cosmic vision"},
//   Pisces:{color:"#592209",  name:"Lavender Aura",meaning:"Spirituality, compassion, and dream wisdom"},
// };

// // Nominatim place search
// async function searchPlaces(q){
//   if(!q||q.length<2)return[];
//   const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&addressdetails=1`,{headers:{"Accept-Language":"en","User-Agent":"SpiritualAI/1.0"}});
//   const d=await r.json();
//   return d.map(x=>({display:x.display_name.split(",").slice(0,3).join(", "),city:x.address?.city||x.address?.town||x.address?.village||x.name,state:x.address?.state||"",country:x.address?.country||"",lat:parseFloat(x.lat),lon:parseFloat(x.lon)}));
// }

// // Backend AI call
// async function fetchBirthChartAI(payload){
//   const r=await fetch("/api/birthchart/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
//   if(!r.ok)throw new Error("Backend error");
//   return r.json();
// }

// // ── Starfield ─────────────────────────────────────────────────────────────────
// function Starfield(){
//   const stars=Array.from({length:140},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:Math.random()*2+.4,d:(Math.random()*4+2).toFixed(1),dl:(Math.random()*6).toFixed(2),op:(Math.random()*.6+.2).toFixed(2)}));
//   return <div className="sf">{stars.map(s=><div key={s.id} className="st" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.sz,height:s.sz,"--d":`${s.d}s`,"--dl":`${s.dl}s`,"--op":s.op}}/>)}</div>;
// }

// // ── DNA bar ───────────────────────────────────────────────────────────────────
// function DnaBar({label,value,color,icon}){
//   const ref=useRef(null);
//   useEffect(()=>{const el=ref.current;if(!el)return;setTimeout(()=>el.classList.add("go"),200);},[]);
//   return(
//     <div className="dna-row">
//       <div className="dna-label">{icon} {label}</div>
//       <div className="dna-bar"><div ref={ref} className="dna-fill" style={{"--tw":`${value}%`,"--bc":color}}/></div>
//       <div className="dna-val">{value}%</div>
//     </div>
//   );
// }

// // ── Gauge circle - CSS grid stacking so % is always visible ──────────────────
// function Gauge({label,icon,value,color}){
//   const r=38,circ=2*Math.PI*r;
//   const [off,setOff]=useState(circ);
//   useEffect(()=>{setTimeout(()=>setOff(circ-(value/100)*circ),300);},[value,circ]);
//   return(
//     <div className="gauge-item">
//       <div style={{display:"grid",placeItems:"center",width:100,height:100,margin:"0 auto 10px"}}>
//         <svg style={{gridArea:"1/1",width:100,height:100,transform:"rotate(-90deg)"}} viewBox="0 0 100 100">
//           <circle fill="none" stroke="rgba(89,34,9,0.05)" strokeWidth="8" cx="50" cy="50" r={r}/>
//           <circle fill="none" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r={r}
//             stroke={color||"var(--gold)"}
//             strokeDasharray={circ}
//             strokeDashoffset={off}
//             style={{transition:"stroke-dashoffset 2s cubic-bezier(.4,0,.2,1)"}}/>
//         </svg>
//         <div style={{gridArea:"1/1",fontFamily:"var(--fd)",fontSize:19,fontWeight:700,color:"#592209",textAlign:"center",pointerEvents:"none"}}>
//           {value}%
//         </div>
//       </div>
//       <div className="gauge-label">{icon} {label}</div>
//     </div>
//   );
// }

// // ── Place input ───────────────────────────────────────────────────────────────
// function PlaceInput({value,onChange}){
//   const [q,setQ]=useState(value?.display||"");
//   const [res,setRes]=useState([]);
//   const [open,setOpen]=useState(false);
//   const t=useRef(null);
//   const handleChange=e=>{
//     const v=e.target.value; setQ(v);
//     clearTimeout(t.current);
//     if(v.length<2){setRes([]);return;}
//     t.current=setTimeout(async()=>{const r=await searchPlaces(v);setRes(r);setOpen(r.length>0);},400);
//   };
//   const pick=r=>{setQ(r.display);onChange(r);setOpen(false);};
//   return(
//     <div className="pl-wrap">
//       <input className="f-input" value={q} onChange={handleChange} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder="Type city name…"/>
//       {open&&<div className="pl-drop">{res.map((r,i)=><div key={i} className="pl-item" onMouseDown={()=>pick(r)}>{r.display}<small>{r.lat?.toFixed(4)}, {r.lon?.toFixed(4)}</small></div>)}</div>}
//     </div>
//   );
// }

// // ── Loading ───────────────────────────────────────────────────────────────────
// const LSTEPS=["Reading Cosmic Coordinates","Locating Birth Star Alignment","Mapping Planetary Positions","Calculating Soul Blueprint","Revealing Destiny Pattern","Unlocking Hidden Traits","Generating Cosmic Identity","Universe Report Ready"];
// function Loading({name}){
//   const [step,setStep]=useState(0);
//   useEffect(()=>{const t=setInterval(()=>setStep(s=>Math.min(s+1,LSTEPS.length-1)),700);return()=>clearInterval(t);},[]);
//   return(
//     <div className="load-screen">
//       <div className="load-name">✦ {name} ✦</div>
//       <div className="load-cosmos">
//         <div className="orb"><div className="orb-dot" style={{background:"var(--gold)"}}/></div>
//         <div className="orb"><div className="orb-dot" style={{background:"var(--pink)"}}/></div>
//         <div className="orb"><div className="orb-dot" style={{background:"var(--cyan)"}}/></div>
//         <div className="orb"><div className="orb-dot" style={{background:"var(--pur)"}}/></div>
//         <div className="orb-core">✨</div>
//       </div>
//       <div className="load-steps">{LSTEPS.map((s,i)=><div key={s} className={`load-step ${i===step?"active":i<step?"done":""}`}><div className="ls-dot"/><span>✨ {s}</span></div>)}</div>
//     </div>
//   );
// }

// // ── Personalized fallback answers keyed by zodiac + question topic ───────────
// function getPersonalFallback(question, chartData){
//   const q = question.toLowerCase();
//   const z = chartData.zodiac || "Leo";
//   const n = chartData.name || "you";
//   const lp = chartData.lifePath || 7;

//   // Career by zodiac
//   const careerMap = {
//     Aries:      `${n}, your Aries fire drives you toward leadership roles. Entrepreneurship, athletics management, emergency services, or any path requiring bold decision-making suits you perfectly. Life Path ${lp} amplifies your ability to start ventures others fear to begin.`,
//     Taurus:     `${n}, your Taurus nature thrives in finance, real estate, architecture, music, or luxury brands. You build wealth slowly and surely — your Life Path ${lp} energy rewards patience with extraordinary long-term returns.`,
//     Gemini:     `${n}, your Gemini mind excels in communication-heavy careers — journalism, marketing, teaching, software development, or content creation. Life Path ${lp} gives you the adaptability to master multiple disciplines simultaneously.`,
//     Cancer:     `${n}, your Cancer sensitivity makes you extraordinary in psychology, healthcare, hospitality, real estate, or any role involving deep human care. Life Path ${lp} positions you to build things that nurture others.`,
//     Leo:        `${n}, your Leo energy was born for the spotlight — entertainment, leadership, brand building, politics, or any stage where your confidence inspires others. Life Path ${lp} amplifies your natural magnetism.`,
//     Virgo:      `${n}, your Virgo precision excels in data science, medicine, research, editing, nutrition, or any field demanding mastery of detail. Life Path ${lp} gives your analytical mind an extraordinary edge.`,
//     Libra:      `${n}, your Libra energy thrives in law, diplomacy, design, fashion, psychology, or any field requiring refined judgment. Life Path ${lp} draws you toward roles where you create balance and beauty.`,
//     Scorpio:    `${n}, your Scorpio intensity suits investigation, psychology, surgery, finance, research, or any path requiring penetrating insight. Life Path ${lp} gives you the focus to uncover what others cannot see.`,
//     Sagittarius:`${n}, your Sagittarius spirit thrives in travel, philosophy, publishing, higher education, international business, or entrepreneurship. Life Path ${lp} keeps expanding your world in ways that feel like destiny.`,
//     Capricorn:  `${n}, your Capricorn ambition is built for executive roles, engineering, finance, government, or long-term enterprise building. Life Path ${lp} rewards your discipline with authority and legacy.`,
//     Aquarius:   `${n}, your Aquarius vision belongs in technology, social innovation, science, humanitarian work, or startup culture. Life Path ${lp} positions you as someone who changes systems, not just works within them.`,
//     Pisces:     `${n}, your Pisces imagination flourishes in art, music, healing, spirituality, film, or any path where intuition leads. Life Path ${lp} connects your inner world to a higher creative purpose.`,
//   };

//   const loveMap = {
//     Aries:      `${n}, your Aries heart loves passionately and fully — but you need a partner who matches your intensity without being overwhelmed by it. Love often arrives unexpectedly through competitive or adventurous encounters. Your next significant romantic chapter activates when you stop seeking and start thriving.`,
//     Taurus:     `${n}, your Taurus soul craves deep, loyal, sensual connection. You take time to trust, but once you do, you love for life. A grounded, affectionate partner who values stability will complete your world. Venus in your chart suggests love blooms in familiar, comfortable environments.`,
//     Gemini:     `${n}, your Gemini spirit needs a partner who stimulates your mind as much as your heart. Intellectual chemistry is your love language. You may find deep love through conversation, shared ideas, or unexpected friendships that evolve beautifully.`,
//     Cancer:     `${n}, your Cancer heart gives everything — sometimes too much. You are learning to receive love as generously as you give it. Your ideal partner understands your emotional depth and provides the safe harbor your soul has always needed.`,
//     Leo:        `${n}, your Leo heart demands to be seen, celebrated, and adored — and you give that back tenfold. You attract admirers easily, but deep love comes when someone matches your loyalty, not just your light.`,
//     Virgo:      `${n}, your Virgo love is devoted, thoughtful, and quietly profound. You show love through acts of service and careful attention. Your partner needs to recognize and cherish these subtle expressions to unlock the fullness of your heart.`,
//     Libra:      `${n}, your Libra soul was literally made for partnership. You are at your best when deeply loved and you give extraordinary beauty back. Venus, your ruler, promises a connection of rare elegance and mutual devotion is either present or approaching.`,
//     Scorpio:    `${n}, your Scorpio love is all-or-nothing — no shallow connections satisfy you. You sense your partner's soul before you know their name. When you find your equal in depth, the bond is unbreakable and transformative for both of you.`,
//     Sagittarius:`${n}, your Sagittarius heart loves freely and needs a partner who is a companion, not a cage. Love that expands your world — through travel, philosophy, shared adventures — is the only love that truly sustains you.`,
//     Capricorn:  `${n}, your Capricorn heart is deeply loyal but cautious with vulnerability. You love through commitment and acts of security. Your ideal partner respects your ambition and doesn't compete with your drive — they celebrate it.`,
//     Aquarius:   `${n}, your Aquarius heart needs intellectual and spiritual connection above all. You love unconventionally, deeply, and often unexpectedly. Your ideal partner is your best friend first — someone who accepts every dimension of your singular soul.`,
//     Pisces:     `${n}, your Pisces heart loves with a depth that borders on spiritual. You feel your partner's emotions as your own. Learning to protect your sensitive energy while staying open is your love journey. Your soulmate resonates at your exact frequency.`,
//   };

//   const wealthMap = {
//     Aries:"Your wealth comes through bold initiative and first-mover advantage. You are wired to spot opportunities before the crowd. The key: channel your impulsive energy into one focused financial direction and let compounding do what your energy cannot — be patient.",
//     Taurus:"Your wealth is built through consistency, property, and long-term investments. You have a natural instinct for value. Start early, invest in tangibles, and trust that your steady pace will out-earn those who sprint and crash.",
//     Gemini:"Your wealth potential is highest in communication, media, or multi-income streams. Your adaptability is your financial superpower — you can pivot quickly when markets shift. Avoid spreading too thin; depth in one area creates more wealth than breadth in many.",
//     Cancer:"Your wealth often comes through real estate, family business, or caring-based enterprises. You build financial security instinctively but must overcome the fear of charging what you're truly worth.",
//     Leo:"Your wealth comes through personal brand, performance, and leadership. People pay premium prices for your charisma and confidence. Build platforms, not just jobs. You are meant to be the face of something extraordinary.",
//     Virgo:"Your wealth is built through mastery, systems, and impeccable execution. You earn through reputation and expertise. Investing in your own skills and building efficient income systems will generate significant long-term wealth.",
//     Libra:"Your wealth flows through partnerships, aesthetics, and high-end markets. You have an eye for value that others miss. Business partnerships and creative ventures aligned with beauty and harmony are your most natural wealth channels.",
//     Scorpio:"Your wealth comes through deep research, strategic investment, and transformational work. You have an instinct for where value is hidden. Financial power grows when you combine your investigative nature with long-term compounding strategies.",
//     Sagittarius:"Your wealth comes through expansion — international ventures, publishing, teaching, or entrepreneurship at scale. Your optimism attracts opportunities, but building financial systems around your freedom-loving nature is the key to lasting abundance.",
//     Capricorn:"Your wealth is almost inevitable given enough time. You are wired for long-term financial mastery. Real estate, equities, and strategic career advancement will build a legacy that outlasts you. Start now — time is your greatest asset.",
//     Aquarius:"Your wealth comes through innovation and disruption. You see solutions others don't — and the market rewards that vision generously. Technology, social enterprises, and intellectual property are your highest-return wealth channels.",
//     Pisces:"Your wealth comes through creative work, intuitive investments, and often unexpected sources. Trust your instincts about opportunities others dismiss as too unconventional. Your imagination is literally monetizable — many Pisces build wealth through art, healing, or spiritual work.",
//   };

//   const purposeMap = {
//     Aries:      `${n}, you were born to ignite. Your purpose is to courageously begin what others are afraid to start, and to inspire through your relentless belief that obstacles are just starting points. Life Path ${lp} confirms your soul mission is one of pioneering and activation.`,
//     Taurus:     `${n}, you were born to build. Your purpose is to create lasting beauty, stability, and abundance — not just for yourself, but as a model for others. Life Path ${lp} anchors you to a mission of turning vision into permanent reality.`,
//     Gemini:     `${n}, you were born to connect and communicate. Your purpose is to bridge worlds, synthesize ideas, and translate complex truths into understanding. Life Path ${lp} amplifies your mission as a messenger between different dimensions of human experience.`,
//     Cancer:     `${n}, you were born to nurture and protect. Your purpose is to create emotional safety for others — through your home, your work, or your presence. Life Path ${lp} confirms that your deepest power is your ability to make others feel truly seen.`,
//     Leo:        `${n}, you were born to inspire. Your purpose is to shine so brightly that others find permission to do the same. Life Path ${lp} places you in a lifelong mission of leadership, creative expression, and generosity of spirit.`,
//     Virgo:      `${n}, you were born to perfect and heal. Your purpose is to bring order, health, and precision to a chaotic world. Life Path ${lp} confirms your soul mission is one of devoted service — making things measurably better.`,
//     Libra:      `${n}, you were born to harmonize. Your purpose is to bring beauty, fairness, and balance into every relationship and environment you touch. Life Path ${lp} confirms you are a cosmic bridge-builder, here to help humanity meet in the middle.`,
//     Scorpio:    `${n}, you were born to transform. Your purpose is to descend into the depths, face what others fear, and emerge with truths that change lives. Life Path ${lp} marks you as a powerful catalyst for collective evolution.`,
//     Sagittarius:`${n}, you were born to expand. Your purpose is to seek truth at the edge of the known world and bring back wisdom that sets others free. Life Path ${lp} confirms a soul mission of teaching, exploration, and spiritual liberation.`,
//     Capricorn:  `${n}, you were born to master and lead. Your purpose is to build structures that endure beyond your lifetime — institutions, families, legacies. Life Path ${lp} confirms your soul's mission is one of disciplined greatness.`,
//     Aquarius:   `${n}, you were born to revolutionize. Your purpose is to see the future others cannot imagine and build the bridges that get humanity there. Life Path ${lp} marks you as a visionary whose most important work serves all of humanity.`,
//     Pisces:     `${n}, you were born to transcend. Your purpose is to dissolve boundaries between the seen and unseen, healing and inspiring through art, compassion, and spiritual depth. Life Path ${lp} confirms your soul is here to remind humanity of the sacred.`,
//   };

//   const hiddenMap = {
//     Aries:      `${n}, your most hidden gift is your extraordinary ability to read danger and opportunity simultaneously — a survival intelligence most people never develop. You also possess an unusual capacity for physical and emotional regeneration; you bounce back faster than anyone around you realizes.`,
//     Taurus:     `${n}, your most hidden gift is your magnetic ability to create beauty from nothing — not just visually, but in atmosphere, comfort, and emotional environments that make people feel mysteriously at ease. You also have an uncanny financial intuition that activates when you trust it.`,
//     Gemini:     `${n}, your most hidden gift is your ability to hold multiple contradictory truths simultaneously without needing to resolve them — a rare cognitive flexibility that makes you extraordinary at mediation, strategy, and creative problem-solving.`,
//     Cancer:     `${n}, your most hidden gift is your psychic-level emotional intelligence — you often know what someone needs before they can articulate it themselves. This makes you a natural healer and an unusually powerful leader when you trust this gift.`,
//     Leo:        `${n}, your most hidden gift is your extraordinary capacity for genuine generosity — not the performative kind, but a deep, instinctive desire to elevate everyone in your orbit. When channeled intentionally, this transforms you from a star into a movement.`,
//     Virgo:      `${n}, your most hidden gift is your ability to see the precise intervention point in any broken system — whether a business process, a relationship dynamic, or a health challenge. You are a natural diagnostician of life.`,
//     Libra:      `${n}, your most hidden gift is your ability to understand multiple perspectives so completely that you can design outcomes everyone agrees to. This makes you a natural architect of consensus — and a quietly powerful negotiator.`,
//     Scorpio:    `${n}, your most hidden gift is your ability to sense the truth beneath the surface of any situation before any evidence appears. This makes you extraordinary at timing — you move when the moment is right in ways others cannot explain.`,
//     Sagittarius:`${n}, your most hidden gift is your ability to transmit hope. In your presence, people begin to believe in their own possibilities again. This is not charm — it is a genuine energetic transmission that you carry as a birthright.`,
//     Capricorn:  `${n}, your most hidden gift is your extraordinary capacity for strategic patience — you can hold a 10-year vision with the same emotional intensity others hold a 10-minute goal. This makes you nearly unstoppable when you commit.`,
//     Aquarius:   `${n}, your most hidden gift is your ability to detach emotionally from a problem far enough to see its true architecture. This makes you the person who solves what everyone else gave up on — often with elegant simplicity.`,
//     Pisces:     `${n}, your most hidden gift is your ability to access creative and spiritual states that most people only experience accidentally. Your dream life, your intuitions, and your creative impulses are direct transmissions — learn to record them before they fade.`,
//   };

//   // Route by keyword in question
//   if(q.includes("career")||q.includes("job")||q.includes("work")||q.includes("business")||q.includes("profession"))
//     return careerMap[z] || careerMap.Leo;
//   if(q.includes("love")||q.includes("partner")||q.includes("relationship")||q.includes("soulmate")||q.includes("marriage")||q.includes("romantic"))
//     return loveMap[z] || loveMap.Leo;
//   if(q.includes("money")||q.includes("wealth")||q.includes("rich")||q.includes("financial")||q.includes("income")||q.includes("invest"))
//     return (wealthMap[z] || wealthMap.Leo).replace(/^Your/,`${n}, your`);
//   if(q.includes("purpose")||q.includes("born")||q.includes("mission")||q.includes("destiny")||q.includes("why"))
//     return purposeMap[z] || purposeMap.Leo;
//   if(q.includes("gift")||q.includes("talent")||q.includes("hidden")||q.includes("power")||q.includes("strength")||q.includes("ability"))
//     return hiddenMap[z] || hiddenMap.Leo;
//   if(q.includes("health")||q.includes("body")||q.includes("wellness")||q.includes("energy"))
//     return `${n}, your ${z} chart points to your greatest physical vulnerability as also your greatest teacher. Focus on the mind-body connection — your emotional state directly governs your physical health more than most signs. Regular grounding practices, time in nature, and consistent sleep will unlock energy levels that feel almost supernatural.`;
//   if(q.includes("friend")||q.includes("social")||q.includes("people"))
//     return `${n}, as a ${z}, you need a small circle of profound connections rather than a large network of surface ones. Your energy is too rare to distribute widely. The people who truly know you are your greatest asset — and recognizing those who drain you without giving back is one of your most important life skills.`;
//   if(q.includes("spiritual")||q.includes("soul")||q.includes("karma")||q.includes("past life"))
//     return `${n}, your ${z} soul has walked many lifetimes accumulating the gifts you carry now. The spiritual practice most aligned with your chart is one of inner listening — meditation, journaling, or time in nature where you can hear the subtle guidance that your busy mind often drowns out. Life Path ${lp} indicates your spiritual evolution is accelerating in this lifetime.`;

//   // Generic but personalized to name + zodiac + life path
//   return `${n}, as a ${z} with Life Path ${lp}, the stars have encoded a very specific answer to your question within your chart. The short answer: trust the part of you that already knows. Your ${z} intuition is extraordinarily accurate when not filtered through fear. The universe is not withholding the answer — it is waiting for you to stop seeking external confirmation of what you already feel is true.`;
// }

// // ── AI Chat component ─────────────────────────────────────────────────────────
// const PRESET_QS=["What career suits me?","What are my hidden gifts?","Why do I struggle in relationships?","What is my life purpose?","How can I improve my wealth?"];
// function AIChat({chartData}){
//   const [msgs,setMsgs]=useState([{role:"ai",text:`Welcome, ${chartData.name}. I am your personal cosmic guide, attuned to your ${chartData.zodiac} chart and Life Path ${chartData.lifePath}. Ask me anything — every answer is specific to you.`}]);
//   const [input,setInput]=useState("");
//   const [loading,setLoading]=useState(false);
//   const endRef=useRef(null);
//   useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

//   const send=async(q)=>{
//     const question=q||input.trim();
//     if(!question||loading)return;
//     setInput("");
//     setMsgs(m=>[...m,{role:"user",text:question},{role:"ai",text:"✨ Consulting the stars for you, "+chartData.name+"…",loading:true}]);
//     setLoading(true);
//     try{
//       const r=await fetch("/api/birthchart/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question,chartData})});
//       if(!r.ok)throw new Error("backend");
//       const d=await r.json();
//       if(!d.answer)throw new Error("empty");
//       setMsgs(m=>[...m.slice(0,-1),{role:"ai",text:d.answer}]);
//     }catch{
//       // Personalized local fallback — different answer per zodiac + question
//       const fallback = getPersonalFallback(question, chartData);
//       setMsgs(m=>[...m.slice(0,-1),{role:"ai",text:fallback}]);
//     }
//     setLoading(false);
//   };

//   return(
//     <div className="chat-wrap">
//       <div className="chat-qs">{PRESET_QS.map(q=><div key={q} className="chat-q" onClick={()=>!loading&&send(q)}>"{q}"</div>)}</div>
//       <div className="chat-msgs">
//         {msgs.map((m,i)=><div key={i} className={`chat-msg ${m.role} ${m.loading?"loading":""}`}>{m.text}</div>)}
//         <div ref={endRef}/>
//       </div>
//       <div className="chat-row">
//         <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!loading&&send()} placeholder={`Ask ${chartData.name}'s birth chart anything…`}/>
//         <button className="chat-send" onClick={()=>send()} disabled={loading||!input.trim()}>✦ Ask</button>
//       </div>
//     </div>
//   );
// }

// // ── Animated ForecastBar ─────────────────────────────────────────────────────
// function ForecastItem({icon,type,val,color}){
//   const ref=useRef(null);
//   useEffect(()=>{const el=ref.current;if(!el)return;setTimeout(()=>el.classList.add("go"),150);},[val]);
//   return(
//     <div className="fc-item">
//       <div className="fc-icon">{icon}</div>
//       <div className="fc-type">{type}</div>
//       <div className="fc-bar">
//         <div ref={ref} className="fc-bfill" style={{"--fw":`${val}%`,background:color,"--fcolor":color}}/>
//       </div>
//       <div className="fc-val" style={{color}}>{val}%</div>
//     </div>
//   );
// }

// // ── Results ───────────────────────────────────────────────────────────────────
// function Results({data,onReset}){
//   const {name,zodiac,lifePath,dob,report} = data;
//   const h = hash(name+dob);
//   const base = 62+(h%30);
//   const aura = AURA_COLORS[zodiac]||AURA_COLORS.Leo;
//   const sym = ZODIAC_SYMBOLS[zodiac]||"⭐";
//   const spirit = SPIRIT_ANIMALS[zodiac]||"🦅 Eagle";
//   const [selPlanet,setSelPlanet]=useState(null);
//   const [fcTab,setFcTab]=useState("30days");

//   const DNA=[
//     {icon:"🧠",label:"Mind",     value:dv(base,name+"mind"),   color:"linear-gradient(to right,#592209,#592209)"},
//     {icon:"❤️",label:"Heart",    value:dv(base,name+"heart"),  color:"linear-gradient(to right,#592209,#592209)"},
//     {icon:"🔥",label:"Energy",   value:dv(base,name+"energy"), color:"linear-gradient(to right,#592209,#592209)"},
//     {icon:"💰",label:"Wealth",   value:dv(base,name+"wealth"), color:"linear-gradient(to right,#592209,#592209)"},
//     {icon:"🌙",label:"Spirit",   value:dv(base,name+"spirit"), color:"linear-gradient(to right,#592209,#592209)"},
//     {icon:"⚡",label:"Ambition", value:dv(base,name+"ambit"),  color:"linear-gradient(to right,#592209,#592209)"},
//   ];

//   const PLANETS=Object.entries(PLANET_INFO).map(([k,v])=>({key:k,score:dv(base,name+v.name),info:v}));

//   const POWER_YEARS=[
//     {year:2027,stars:2,desc:"Career expansion begins"},
//     {year:2028,stars:3,desc:"Major relationship shift"},
//     {year:2030,stars:4,desc:"Financial breakthrough"},
//     {year:2031,stars:5,desc:"Peak life potential"},
//     {year:2034,stars:3,desc:"Spiritual awakening"},
//     {year:2036,stars:4,desc:"Legacy creation phase"},
//   ];

//   const LUCKY={
//     color:{icon:"🎨",type:"Lucky Color",    val:["Royal Gold","Electric Blue","Deep Violet","Emerald Green","Crimson Rose"][h%5]},
//     number:{icon:"🔢",type:"Lucky Number",  val:[3,7,11,13,22,33][h%6]},
//     gem:{icon:"💎",type:"Lucky Gem",        val:["Amethyst","Citrine","Moonstone","Sapphire","Ruby","Emerald"][h%6]},
//     day:{icon:"📅",type:"Lucky Day",        val:["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][h%7]},
//     dir:{icon:"🌍",type:"Lucky Direction",  val:["North","South","East","West","Northeast"][h%5]},
//   };

//   const fcData={
//     "30days":[
//       {icon:"❤️",type:"Love",  val:dv(base,name+"l30"),  color:"#592209"},
//       {icon:"💼",type:"Career",val:dv(base,name+"c30"),  color:"var(--gold)"},
//       {icon:"💰",type:"Money", val:dv(base,name+"m30"),  color:"#592209"},
//       {icon:"🏥",type:"Health",val:dv(base,name+"h30"),  color:"#592209"},
//       {icon:"🌱",type:"Growth",val:dv(base,name+"g30"),  color:"#592209"},
//     ],
//     "6months":[
//       {icon:"❤️",type:"Love",  val:dv(base,name+"l6m"),  color:"#592209"},
//       {icon:"💼",type:"Career",val:dv(base,name+"c6m"),  color:"var(--gold)"},
//       {icon:"💰",type:"Money", val:dv(base,name+"m6m"),  color:"#592209"},
//       {icon:"🏥",type:"Health",val:dv(base,name+"h6m"),  color:"#592209"},
//       {icon:"🌱",type:"Growth",val:dv(base,name+"g6m"),  color:"#592209"},
//     ],
//     "1year":[
//       {icon:"❤️",type:"Love",  val:dv(base,name+"l1y"),  color:"#592209"},
//       {icon:"💼",type:"Career",val:dv(base,name+"c1y"),  color:"var(--gold)"},
//       {icon:"💰",type:"Money", val:dv(base,name+"m1y"),  color:"#592209"},
//       {icon:"🏥",type:"Health",val:dv(base,name+"h1y"),  color:"#592209"},
//       {icon:"🌱",type:"Growth",val:dv(base,name+"g1y"),  color:"#592209"},
//     ],
//   };

//   const TL_PHASES=[
//     {phase:"Childhood",range:"0 – 12",c:"#592209",opp:"Foundation of sensitivity and natural curiosity were established. Your early environment shaped your emotional blueprint."},
//     {phase:"Teenage Years",range:"13 – 19",c:"#592209",opp:"Identity formation and first awakenings of your core gifts. Creative energy peaked during this period."},
//     {phase:"20s",range:"20 – 29",c:"#592209",opp:"Exploration and self-discovery. Multiple doors open — this is the decade of possibility and rapid growth."},
//     {phase:"30s",range:"30 – 39",c:"#592209",opp:"Power decade. Career expansion and deep relationship bonds form the foundation of your legacy."},
//     {phase:"40s",range:"40 – 49",c:"#592209",opp:"Mastery phase. Your accumulated wisdom transforms into leadership and influence at scale."},
//     {phase:"50+",range:"50 and beyond",c:"#ff8844",opp:"Legacy and spiritual depth. The universe rewards your journey with profound peace, wisdom, and abundance."},
//   ];

//   const p_report = report || {};

//   return(
//     <div className="results">
//       <div className="r-header">
//         <div className="r-name">{name} {sym}</div>
//         <div className="r-sub">{zodiac} · Life Path {lifePath} · Cosmic Identity Experience</div>
//       </div>

//       {/* Step 7: Life Purpose */}
//       <div className="purpose-hero">
//         <div className="purpose-tag">✦ Why Were You Born ✦</div>
//         <div className="purpose-statement">"{p_report.purpose||`You are here to inspire, transform, and illuminate the path for others. Your ${zodiac} energy carries a rare combination of vision and compassion that the world deeply needs.`}"</div>
//       </div>

//       {/* Step 3: Soul Archetypes */}
//       <div className="s-space">
//         <div className="s-head">✨ Soul Blueprint — Your Archetypes</div>
//         <div className="arch-grid">
//           {(p_report.archetypes||ARCHETYPES.slice(0,3)).map((a,i)=>(
//             <div key={i} className="arch-card" style={{animationDelay:`${i*0.1}s`}}>
//               <div className="arch-icon">{a.icon}</div>
//               <div className="arch-name">{a.name}</div>
//               <div className="arch-desc">{a.desc}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Step 4: Cosmic DNA */}
//       <div className="s-space">
//         <div className="s-head">🧬 Cosmic DNA Analysis</div>
//         <div className="dna-wrap">{DNA.map(d=><DnaBar key={d.label} {...d}/>)}</div>
//       </div>

//       {/* Step 19: Universe Scoreboard */}
//       <div className="s-space">
//         <div className="s-head">🏆 Universe Scoreboard</div>
//         <div className="scoreboard">
//           {[
//             {icon:"⭐",label:"Cosmic Potential",score:dv(base,name+"total")},
//             {icon:"❤️",label:"Love Energy",    score:dv(base,name+"le")},
//             {icon:"💰",label:"Money Energy",   score:dv(base,name+"me")},
//             {icon:"👑",label:"Leadership",     score:dv(base,name+"ld")},
//             {icon:"🌙",label:"Spiritual",      score:dv(base,name+"sp")},
//           ].map(s=><div key={s.label} className="sb-item"><div className="sb-icon">{s.icon}</div><div className="sb-label">{s.label}</div><div className="sb-score">{s.score}%</div></div>)}
//         </div>
//       </div>

//       {/* Step 9: Wealth & Success */}
//       <div className="s-space">
//         <div className="s-head">💰 Wealth & Success Blueprint</div>
//         <div className="gauge-grid">
//           {[
//             {icon:"💰",label:"Money",    value:dv(base,name+"mny"), color:"#592209"},
//             {icon:"📈",label:"Business", value:dv(base,name+"biz"), color:"var(--gold)"},
//             {icon:"👑",label:"Leadership",value:dv(base,name+"ldr"),color:"#592209"},
//             {icon:"🚀",label:"Career",   value:dv(base,name+"car"), color:"#592209"},
//           ].map(g=><Gauge key={g.label} {...g}/>)}
//         </div>
//       </div>

//       {/* Step 5: Hidden Superpowers */}
//       <div className="s-space">
//         <div className="s-head">✨ Hidden Superpowers</div>
//         <div className="powers-grid">
//           {(p_report.powers||[
//             {icon:"⚡",name:"Natural Leadership",   desc:"You command rooms without trying. People follow your energy instinctively."},
//             {icon:"🔮",name:"Strong Intuition",     desc:"Your gut feelings are rarely wrong. The universe speaks through your instincts."},
//             {icon:"📚",name:"Rapid Learning",       desc:"You absorb knowledge at extraordinary speed. New skills feel natural to you."},
//             {icon:"🗣",name:"Persuasive Voice",     desc:"Your words carry unusual weight. You move hearts and change minds effortlessly."},
//             {icon:"🎨",name:"Creative Intelligence",desc:"You see patterns and connections that others miss entirely."},
//           ]).map((p,i)=><div key={i} className="power-card" style={{animationDelay:`${i*.08}s`}}><div className="power-icon">{p.icon}</div><div className="power-name">{p.name}</div><div className="power-desc">{p.desc}</div></div>)}
//         </div>
//       </div>

//       {/* Step 6: Shadow Side */}
//       <div className="s-space">
//         <div className="s-head">⚠️ Challenges to Master</div>
//         <div className="shadow-grid">
//           {(p_report.shadows||[
//             {icon:"🌀",name:"Overthinking",  tip:"Practice grounding breathwork. The mind needs stillness as much as stimulation."},
//             {icon:"⏳",name:"Impatience",    tip:"Your vision is years ahead — slow down to bring others with you."},
//             {icon:"🛡",name:"Emotional Guard",tip:"Vulnerability is not weakness. It is the bridge to your deepest connections."},
//             {icon:"💔",name:"Perfectionism", tip:"Done is better than perfect. Release control and watch abundance flow."},
//           ]).map((s,i)=><div key={i} className="shadow-card"><div className="shadow-icon">{s.icon}</div><div className="shadow-name">{s.name}</div><div className="shadow-tip">{s.tip}</div></div>)}
//         </div>
//       </div>

//       {/* Step 10: Love Blueprint */}
//       <div className="s-space">
//         <div className="s-head">❤️ Love & Relationship Blueprint</div>
//         <div className="cards-3">
//           {[
//             {icon:"❤️",title:"Love Language",val:p_report.loveLanguage||"Words of Affirmation",desc:"You feel most loved when your efforts and feelings are verbally acknowledged and celebrated."},
//             {icon:"🤝",title:"Relationship Style",val:p_report.relStyle||"Deep Connector",desc:"You don't do surface-level. You seek profound emotional bonds built on trust and authenticity."},
//             {icon:"🔗",title:"Attachment Style",val:p_report.attachment||"Secure-Anxious",desc:"You love deeply and fully — sometimes needing reassurance that the bond is as strong as it feels."},
//             {icon:"💫",title:"Ideal Partner",val:p_report.idealPartner||"Intellectual Soul",desc:"You're drawn to minds that challenge you, hearts that match your depth, and spirits that are free."},
//             {icon:"🌙",title:"Emotional Needs",val:p_report.emotionalNeed||"Depth & Loyalty",desc:"Consistency, honesty, and the freedom to be fully yourself are your non-negotiables in love."},
//           ].map((c,i)=><div key={i} className="r-card"><div className="r-card-icon">{c.icon}</div><div className="r-card-title">{c.title}</div><div className="r-card-val">{c.val}</div><div className="r-card-desc">{c.desc}</div></div>)}
//         </div>
//       </div>

//       {/* Step 12: Planet Dashboard */}
//       <div className="s-space">
//         <div className="s-head">🪐 Planetary Influence Dashboard</div>
//         <div className="planet-grid">
//           {PLANETS.map(p=>(
//             <div key={p.key} className={`p-item ${selPlanet===p.key?"sel":""}`} onClick={()=>setSelPlanet(selPlanet===p.key?null:p.key)}>
//               <div className="p-sym">{p.key.split(/(?=[A-Z])/)[0]}</div>
//               <div className="p-name">{p.info.name}</div>
//               <div className="p-score">{p.score}%</div>
//             </div>
//           ))}
//         </div>
//         {selPlanet&&(()=>{const p=PLANET_INFO[selPlanet];return(<div className="p-panel"><div className="p-panel-sub">✦ Planetary Insight</div><div className="p-panel-title">{selPlanet} — {p.name} Energy</div><div className="p-panel-body">{p.desc} In your chart, {p.name} energy manifests as a powerful force that shapes {p.traits[0].toLowerCase()} and {p.traits[1].toLowerCase()} in your daily experience.</div><div className="p-traits">{p.traits.map(t=><span key={t} className="p-trait">{t}</span>)}</div></div>);})()}
//       </div>

//       {/* Step 13: Aura */}
//       <div className="s-space">
//         <div className="s-head">🌈 Cosmic Aura Analysis</div>
//         <div className="aura-wrap">
//           <div className="aura-glow" style={{"--ac":aura.color+"99",background:`radial-gradient(circle,${aura.color}33,${aura.color}11)`}}>
//             <span style={{fontSize:60}}>{sym}</span>
//           </div>
//           <div className="aura-name" style={{color:aura.color}}>{aura.name}</div>
//           <div className="aura-meaning">{aura.meaning}</div>
//         </div>
//       </div>

//       {/* Step 14: Spirit Animal */}
//       <div className="s-space">
//         <div className="s-head">🦅 Spirit Animal</div>
//         <div className="cards-2">
//           <div className="r-card" style={{textAlign:"center",padding:32}}>
//             <div style={{fontSize:64,marginBottom:12}}>{spirit.split(" ")[0]}</div>
//             <div className="r-card-title">{spirit.split(" ").slice(1).join(" ")}</div>
//             <div className="r-card-desc" style={{marginTop:10}}>Your spirit animal embodies your core essence — the primal energy the universe assigned to your soul at birth. Meditate on its qualities to unlock hidden strength.</div>
//           </div>
//           <div className="r-card">
//             <div className="r-card-title" style={{marginBottom:16}}>What This Means For You</div>
//             {(p_report.spiritMeaning||["Fierce independence and natural authority","Exceptional vision — you see what others cannot","Born to soar above limitations","Protector energy — others feel safe near you"]).map((m,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:10,fontSize:14,color:"rgba(48,22,7,0.72)",fontStyle:"italic"}}><span>✦</span><span>{m}</span></div>)}
//           </div>
//         </div>
//       </div>

//       {/* Step 15: Lucky System */}
//       <div className="s-space">
//         <div className="s-head">🎯 Personal Lucky System</div>
//         <div className="lucky-grid">
//           {Object.values(LUCKY).map(l=><div key={l.type} className="lucky-item"><div className="lucky-icon">{l.icon}</div><div className="lucky-type">{l.type}</div><div className="lucky-val">{l.val}</div></div>)}
//         </div>
//       </div>

//       {/* Step 8: Life Timeline */}
//       <div className="s-space">
//         <div className="s-head">📅 Timeline of Life</div>
//         <div className="tl-wrap">
//           {TL_PHASES.map((t,i)=>(
//             <div key={i} className="tl-item">
//               <div className="tl-dot2" style={{"--dc":t.c}}/>
//               <div className="tl-phase" style={{color:t.c}}>{t.phase}</div>
//               <div className="tl-range">Age {t.range}</div>
//               <div className="tl-desc">{t.opp}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Step 11: Power Years */}
//       <div className="s-space">
//         <div className="s-head">⭐ Your Power Years</div>
//         <div className="pyears-wrap">
//           {POWER_YEARS.map(y=>(
//             <div key={y.year} className="py-item">
//               <div className="py-year">{y.year}</div>
//               <div className="py-stars">{"⭐".repeat(y.stars)}</div>
//               <div className="py-desc">{y.desc}</div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Step 16: Future Energy Forecast */}
//       <div className="s-space">
//         <div className="s-head">🔮 Future Energy Forecast</div>
//         <div className="forecast-tabs">
//           {[["30days","Next 30 Days"],["6months","Next 6 Months"],["1year","Next Year"]].map(([k,l])=>(
//             <button key={k} className={`f-tab ${fcTab===k?"active":""}`} onClick={()=>setFcTab(k)}>{l}</button>
//           ))}
//         </div>
//         <div className="forecast-grid">
//           {fcData[fcTab].map(f=>(
//             <ForecastItem key={f.type+fcTab} icon={f.icon} type={f.type} val={f.val} color={f.color}/>
//           ))}
//         </div>
//       </div>

//       {/* Step 17: AI Life Coach */}
//       <div className="s-space">
//         <div className="s-head">🤖 Ask Your Birth Chart</div>
//         <AIChat chartData={{name,zodiac,lifePath}}/>
//       </div>

//       {/* Step 18: Shareable Card */}
//       <div className="s-space">
//         <div className="s-head">🌟 Your Cosmic Identity Card</div>
//         <div className="share-card">
//           <div className="share-title">✦ Share Your Cosmic Identity ✦</div>
//           <div className="share-inner">
//             <div style={{fontSize:40,marginBottom:8}}>{sym}</div>
//             <div className="share-sname">{name}</div>
//             <div className="share-zodiac">{zodiac} · Life Path {lifePath}</div>
//             <div className="share-tags">
//               <span className="share-tag">{aura.name}</span>
//               <span className="share-tag">{spirit}</span>
//               {(p_report.archetypes||ARCHETYPES.slice(0,2)).map(a=><span key={a.name} className="share-tag">{a.icon} {a.name}</span>)}
//             </div>
//           </div>
//           <div className="share-btns">
//             {[["🟢 WhatsApp","#25d366"],["📘 Facebook","#1877f2"],["🐦 X / Twitter","#1da1f2"],["📸 Instagram","#e1306c"]].map(([l,c])=>(
//               <button key={l} className="share-btn" style={{background:c}}>{l}</button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Step 20: WOW Finale */}
//       <div className="wow-wrap">
//         <div className="wow-title">✦ The Universe Has Spoken ✦</div>
//         <div className="wow-sub">Your Complete Cosmic Destiny</div>
//         <div className="wow-cols">
//           <div>
//             <div className="wow-col-title" style={{color:"var(--green)"}}>✅ Top 5 Things You Must Do</div>
//             {(p_report.mustDo||["Trust your intuition above all external advice","Build something that outlasts you — your legacy matters","Invest deeply in relationships, not just achievements","Embrace solitude as a source of power, not loneliness","Say yes to the uncomfortable path — it leads to your destiny"]).map((t,i)=>(
//               <div key={i} className="wow-item"><span style={{color:"var(--green)",flexShrink:0}}>✦</span><span>{t}</span></div>
//             ))}
//           </div>
//           <div>
//             <div className="wow-col-title" style={{color:"#592209"}}>⚠️ Top 5 Things To Avoid</div>
//             {(p_report.mustAvoid||["Dimming your light to make others comfortable","Waiting for the perfect moment — it never arrives","Letting fear of judgment silence your authentic voice","Pouring your energy into people who drain your spirit","Confusing busyness with purpose — they are not the same"]).map((t,i)=>(
//               <div key={i} className="wow-item"><span style={{color:"#592209",flexShrink:0}}>⚠</span><span>{t}</span></div>
//             ))}
//           </div>
//         </div>
//       </div>

//       <button className="reset-btn" onClick={onReset}>✦ New Reading</button>
//     </div>
//   );
// }

// // ── Form ──────────────────────────────────────────────────────────────────────
// const emptyForm=()=>({firstName:"",lastName:"",day:"",month:"",year:"",hour:"",min:"",ampm:"AM",place:null});

// export default function App(){
//   const [form,setForm]=useState(emptyForm());
//   const [phase,setPhase]=useState("form");
//   const [chartData,setChartData]=useState(null);
//   const [error,setError]=useState("");

//   // Back button returns to form from loading/results phases
//   useBackOverride(
//     phase !== "form" ? () => { setPhase("form"); setChartData(null); setError(""); } : null,
//     [phase],
//   );
//   const up=(k,v)=>setForm(f=>({...f,[k]:v}));

//   const generate=useCallback(async()=>{
//     setError("");
//     if(!form.firstName||!form.day||!form.month||!form.year){
//       setError("Please fill in your first name and date of birth.");
//       return;
//     }
//     setPhase("loading");
//     const name=[form.firstName,form.lastName].filter(Boolean).join(" ");
//     const zodiac=getZodiac(+form.day,+form.month);
//     const dob=`${form.year}-${String(form.month).padStart(2,"0")}-${String(form.day).padStart(2,"0")}`;
//     const lifePath=getLP(dob);

//     let report={};
//     try{
//       report=await fetchBirthChartAI({name,zodiac,lifePath,dob,place:form.place?.city});
//     }catch{/* use fallback data baked into Results */}

//     await new Promise(r=>setTimeout(r,5600));
//     setChartData({name,zodiac,lifePath,dob,place:form.place,report});
//     setPhase("results");
//   },[form]);

//   return(
//     <div className="bc-app">
//       <Starfield/>
//       <div className="nb" style={{width:700,height:700,top:"-250px",left:"-200px",background:"radial-gradient(circle,rgba(89,34,9,0.08),transparent 70%)","--nd":"20s"}}/>
//       <div className="nb" style={{width:500,height:500,bottom:"5%",right:"-100px",background:"radial-gradient(circle,rgba(89,34,9,0.08),transparent 70%)","--nd":"25s"}}/>
//       <div className="nb" style={{width:400,height:400,top:"40%",left:"35%",background:"radial-gradient(circle,rgba(89,34,9,0.06),transparent 70%)","--nd":"30s"}}/>

//       {phase==="loading"&&<Loading name={[form.firstName,form.lastName].filter(Boolean).join(" ")}/>}

//       <div className="content" style={{display:phase==="loading"?"none":"block"}}>
//         {phase==="form"&&(
//           <div className="form-wrap">
//             <div className="form-head">
//               <div className="form-tag">✦ Cosmic Identity Experience ✦</div>
//               <h1 className="form-h1">Your Birth Chart<br/>Awaits</h1>
//               <p className="form-sub">The universe has been waiting to reveal who you truly are</p>
//             </div>
//             <div className="f-card">
//               {error&&<div className="err-box">⚠ {error}</div>}
//               <div className="f-field">
//                 <label className="f-label">Your Name *</label>
//                 <div className="name-row">
//                   <input className="f-input" value={form.firstName} onChange={e=>up("firstName",e.target.value)} placeholder="First name"/>
//                   <input className="f-input" value={form.lastName}  onChange={e=>up("lastName", e.target.value)} placeholder="Last name"/>
//                 </div>
//               </div>
//               <div className="f-field">
//                 <label className="f-label">Date of Birth *</label>
//                 <div className="drow">
//                   <select className="f-input" value={form.day}   onChange={e=>up("day",  e.target.value)}>
//                     <option value="">DD</option>{DAYS.map(d=><option key={d} value={d}>{String(d).padStart(2,"0")}</option>)}
//                   </select>
//                   <select className="f-input" value={form.month} onChange={e=>up("month",e.target.value)}>
//                     <option value="">MM</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
//                   </select>
//                   <select className="f-input" value={form.year}  onChange={e=>up("year", e.target.value)}>
//                     <option value="">YYYY</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}
//                   </select>
//                 </div>
//               </div>
//               <div className="f-field">
//                 <label className="f-label">Time of Birth <span style={{opacity:.5}}>(optional)</span></label>
//                 <div className="trow">
//                   <select className="f-input" value={form.hour} onChange={e=>up("hour",e.target.value)}>
//                     <option value="">HH</option>{HOURS.map(h=><option key={h} value={h}>{h}</option>)}
//                   </select>
//                   <select className="f-input" value={form.min} onChange={e=>up("min",e.target.value)}>
//                     <option value="">MM</option>{MINS.map(m=><option key={m} value={m}>{m}</option>)}
//                   </select>
//                   <select className="f-input" value={form.ampm} onChange={e=>up("ampm",e.target.value)}>
//                     <option value="AM">AM</option><option value="PM">PM</option>
//                   </select>
//                 </div>
//                 <div className="f-hint">Leave blank if unknown — your reading will still be powerful</div>
//               </div>
//               <div className="f-field">
//                 <label className="f-label">Place of Birth <span style={{opacity:.5}}>(optional)</span></label>
//                 <PlaceInput value={form.place} onChange={v=>up("place",v)}/>
//               </div>
//               <button
//                className="gen-btn"
//                onClick={generate}
//                style={{
//                   background: "linear-gradient(135deg, #592209, #592209, #592209)",
//                   backgroundSize: "200% auto",
//                   color: "#F5E9D6",
//                   fontWeight: 800,
//                   fontSize: 16,
//                   letterSpacing: "0.1em",
//                   padding: "14px 36px",
//                   borderRadius: 30,
//                   border: "1px solid rgba(89,34,9,0.6)",
//                   cursor: "pointer",
//                   animation: "shimmer 2s linear infinite",
//                   boxShadow: "0 0 24px rgba(89,34,9,0.5), 0 0 48px rgba(89,34,9,0.2)",
//                 }}
//               >
//                 ✦ Reveal My Cosmic Identity ✦
//               </button>
//             </div>
//           </div>
//         )}
//         {phase==="results"&&chartData&&<Results data={chartData} onReset={()=>{setPhase("form");setChartData(null);setForm(emptyForm());}}/>}
//       </div>
//     </div>
//   );
// }







//komal vedya
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useBackOverride } from "../context/NavigationContext";
import { API_BASE_URL } from "@/lib/api";
import {
  Calendar, MapPin, Globe, Heart, Briefcase, DollarSign, Activity, Star,
  Target, Palette, Eye, RotateCcw, Hourglass, Shield, Compass,
  CheckCircle2, XCircle, MessageCircle, Facebook, Instagram, Download,
} from "lucide-react";
import explorerIcon from "@/assets/archetypes/explorer.png";
import creatorIcon from "@/assets/archetypes/creator.png";
import leaderIcon from "@/assets/archetypes/leader.png";
import loveInsightImg from "@/assets/insights/love.png";
import careerInsightImg from "@/assets/insights/career.png";
import moneyInsightImg from "@/assets/insights/money.png";
import healthInsightImg from "@/assets/insights/health.png";
import spiritualityInsightImg from "@/assets/insights/spirituality.png";
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

// ── Google Fonts ─────────────────────────────────────────────────────────────

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
:root {
  --void:#F5E9D6; --deep:#FBF5EC; --glass:rgba(89,34,9,0.05);
  --gb:rgba(89,34,9,0.05); --gold:#f5c518; --gold2:#ffaa00;
  --pur:#592209; --pink:#E58A45; --cyan:#461B07; --green:#2F6B3A;
  --fd:Cinzel, Georgia, serif; --fb:'DM Sans', system-ui, sans-serif; --fm:'DM Sans', system-ui, sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0;}
.bc-app{min-height:100vh;background:var(--void);color:#301607;font-family:var(--fb);font-size:17px;overflow-x:hidden;position:relative;}

/* Stars */
.sf{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;}
.st{position:absolute;border-radius:50%;background:rgba(89,34,9,0.25);animation:twk var(--d) ease-in-out infinite;animation-delay:var(--dl);opacity:var(--op);}
@keyframes twk{0%,100%{opacity:var(--op);transform:scale(1);}50%{opacity:.05;transform:scale(.4);}}

/* Nebula */
.nb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0;animation:drft var(--nd,20s) ease-in-out infinite alternate;}
@keyframes drft{from{transform:translate(0,0) scale(1);}to{transform:translate(30px,25px) scale(1.08);}}

.content{position:relative;z-index:1;}

/* ── FORM ── */
.form-wrap{max-width:600px;margin:0 auto;padding:60px 20px 80px;}
.form-head{text-align:center;margin-bottom:48px;}
.form-tag{font-family:var(--fm);font-size:10px;letter-spacing:6px;color:var(--cyan);text-transform:uppercase;margin-bottom:14px;}
.form-h1{font-family:var(--fd);font-size:clamp(20px,4vw,40px);font-weight:900;color:var(--gold);line-height:1.2;margin-bottom:10px;text-shadow:0 0 40px rgba(229,138,69,.4);}
.form-sub{color:#592209;font-style:italic;font-size:16px;}

.f-card{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:32px 28px;backdrop-filter:blur(16px);}
.f-field{margin-bottom:20px;}
.f-label{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:#592209;text-transform:uppercase;display:block;margin-bottom:8px;}
.f-input{width:100%;background:#FBF5EC;border:1px solid rgba(89,34,9,0.05);border-bottom:2px solid rgba(89,34,9,.5);border-radius:10px;padding:14px 18px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:16px;outline:none;transition:border .3s,box-shadow .3s;}
.f-input:focus{border-color:#592209;box-shadow:0 0 0 3px rgba(89,34,9,.15);}
.f-input::placeholder{color:rgba(48,22,7,0.72);}
.f-input option{background:#FBF5EC;}
.drow{display:grid;grid-template-columns:2fr 2fr 3fr;gap:8px;}
.trow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.f-hint{font-size:13px;color:rgba(48,22,7,0.75);margin-top:5px;font-style:italic;}

/* Name input */
.name-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:500px){.name-row,.drow,.trow{grid-template-columns:1fr;}}

/* Place autocomplete */
.pl-wrap{position:relative;}
.pl-drop{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#FBF5EC;border:1px solid rgba(89,34,9,.4);border-radius:10px;z-index:100;overflow:hidden;box-shadow:0 20px 60px rgba(89,34,9,0.2);}
.pl-item{padding:10px 14px;cursor:pointer;font-size:15px;transition:background .2s;border-bottom:1px solid rgba(89,34,9,0.2);}
.pl-item:hover{background:rgba(89,34,9,.2);}
.pl-item small{display:block;font-size:11px;color:#592209;margin-top:2px;font-family:var(--fm);}

/* Generate btn */
.gen-btn{width:100%;margin-top:8px;padding:18px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:12px;color:#F5E9D6;font-family:var(--fd);font-size:13px;letter-spacing:2px;font-weight:700;cursor:pointer;text-transform:uppercase;transition:transform .2s,box-shadow .3s;position:relative;overflow:hidden;}
.gen-btn:hover{transform:translateY(-2px);box-shadow:0 20px 60px rgba(229,138,69,.35);}
.gen-btn:active{transform:translateY(0);}
.err-box{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.3);border-radius:10px;padding:12px 16px;color:#592209;font-family:var(--fm);font-size:12px;letter-spacing:1px;margin-bottom:16px;text-align:center;}

/* ── LOADING ── */
.load-screen{position:fixed;inset:0;background:var(--void);z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:36px;}
.load-cosmos{width:240px;height:240px;position:relative;}
.orb{position:absolute;border-radius:50%;border:1.5px solid transparent;animation:spin linear infinite;}
.orb:nth-child(1){inset:0;   border-color:rgba(89,34,9,.8); box-shadow:0 0 8px rgba(89,34,9,.55),0 0 18px rgba(89,34,9,.3);animation-duration:22s;}
.orb:nth-child(2){inset:28px;border-color:rgba(89,34,9,.7);  box-shadow:0 0 8px rgba(89,34,9,.55),0 0 18px rgba(89,34,9,.3);animation-duration:15s;animation-direction:reverse;}
.orb:nth-child(3){inset:62px;border-color:rgba(89,34,9,.75);  box-shadow:0 0 8px rgba(89,34,9,.6), 0 0 18px rgba(89,34,9,.32);animation-duration:9s;}
.orb:nth-child(4){inset:98px;border-color:rgba(229,138,69,.7);   box-shadow:0 0 8px rgba(229,138,69,.55),0 0 18px rgba(229,138,69,.3);animation-duration:5s;animation-direction:reverse;}
.orb-dot{position:absolute;width:9px;height:9px;border-radius:50%;top:-4.5px;left:50%;transform:translateX(-50%);box-shadow:0 0 6px currentColor,0 0 14px currentColor,0 0 26px currentColor;}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
.orb-core{position:absolute;inset:106px;border-radius:50%;background:radial-gradient(circle at 36% 34%,#ffffff 0%,#fff6d0 14%,#E58A45 42%,#E58A45 72%,#E58A45 100%);animation:pglow 2s ease-in-out infinite;z-index:2;}
.orb-core::after{content:'';position:absolute;inset:-90%;border-radius:50%;background:linear-gradient(to right,transparent 0%,rgba(255,246,208,.85) 49.3%,rgba(255,246,208,.85) 50.7%,transparent 100%),linear-gradient(to bottom,transparent 0%,rgba(255,246,208,.85) 49.3%,rgba(255,246,208,.85) 50.7%,transparent 100%);mix-blend-mode:screen;-webkit-mask-image:radial-gradient(circle,black 12%,transparent 62%);mask-image:radial-gradient(circle,black 12%,transparent 62%);pointer-events:none;animation:flare-spin 24s linear infinite;}
@keyframes flare-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes pglow{0%,100%{box-shadow:0 0 8px 2px rgba(229,138,69,.6),0 0 20px 6px rgba(229,138,69,.35),0 0 44px 14px rgba(229,138,69,.18);opacity:.9;}50%{box-shadow:0 0 12px 3px rgba(229,138,69,.8),0 0 30px 10px rgba(229,138,69,.5),0 0 60px 20px rgba(229,138,69,.28);opacity:1;}}
.load-steps{display:flex;flex-direction:column;gap:10px;text-align:center;}
.load-step{font-family:var(--fm);font-size:11px;letter-spacing:2px;color:rgba(48,22,7,0.75);transition:color .5s;display:flex;align-items:center;gap:10px;justify-content:center;}
.load-step.active{color:var(--cyan);text-shadow:0 0 20px var(--cyan);}
.load-step.done{color:var(--gold);}
.ls-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;}
.load-name{font-family:var(--fd);font-size:clamp(14px,3vw,24px);color:var(--gold);text-align:center;opacity:.7;letter-spacing:2px;}

/* ── RESULTS ── */
.results{max-width:1000px;margin:0 auto;padding:20px 20px 100px;}

/* Section heading */
.s-head{font-family:var(--fd);font-size:11px;letter-spacing:4px;color:var(--cyan);text-transform:uppercase;margin-bottom:20px;display:flex;align-items:center;gap:12px;}
.s-head::after{content:'';flex:1;height:1px;background:linear-gradient(to right,rgba(89,34,9,.3),transparent);}
.s-space{margin-bottom:48px;}

/* Life purpose reveal */
.purpose-hero{text-align:center;padding:60px 20px;background:radial-gradient(ellipse at center,rgba(229,138,69,.08) 0%,transparent 70%);border-radius:24px;border:1px solid rgba(229,138,69,.12);margin-bottom:48px;}
.purpose-tag{font-family:var(--fm);font-size:10px;letter-spacing:5px;color:var(--gold);text-transform:uppercase;margin-bottom:20px;}
.purpose-statement{font-family:var(--fd);font-size:clamp(16px,2.5vw,26px);color:#301607;line-height:1.5;max-width:600px;margin:0 auto;text-shadow:0 0 40px rgba(229,138,69,.3);}

/* Soul archetype cards */
.arch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:48px;}
.arch-card{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px 14px;text-align:center;backdrop-filter:blur(12px);transition:transform .2s,border-color .3s,box-shadow .3s;cursor:default;animation:fadeUp .6s ease both;}
.arch-card:hover{transform:translateY(-6px);border-color:rgba(229,138,69,.4);box-shadow:0 20px 50px rgba(229,138,69,.15);}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.arch-icon{font-size:32px;margin-bottom:10px;}
.arch-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--gold);}
.arch-desc{font-size:12px;color:#592209;margin-top:5px;font-style:italic;}

/* Cosmic DNA */
.dna-wrap{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:28px;backdrop-filter:blur(12px);margin-bottom:48px;}
.dna-row{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
.dna-label{font-family:var(--fm);font-size:11px;letter-spacing:2px;color:#592209;width:110px;flex-shrink:0;text-transform:uppercase;}
.dna-bar{flex:1;height:8px;background:rgba(89,34,9,0.2);border-radius:4px;overflow:hidden;}
.dna-fill{height:100%;border-radius:4px;background:var(--bc,linear-gradient(to right,var(--pur),var(--cyan)));transition:width 2s cubic-bezier(.4,0,.2,1);width:0;}
.dna-fill.go{width:var(--tw,0%);}
.dna-val{font-family:var(--fm);font-size:13px;font-weight:700;color:var(--gold);width:40px;text-align:right;}

/* Cards grid */
.cards-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:48px;}
.cards-3{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-bottom:48px;}
@media(max-width:600px){.cards-2{grid-template-columns:1fr;}}
.r-card{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:22px;backdrop-filter:blur(12px);transition:transform .2s,border-color .3s;}
.r-card:hover{transform:translateY(-3px);border-color:rgba(89,34,9,0.2);}
.r-card-icon{font-size:26px;margin-bottom:10px;}
.r-card-title{font-family:var(--fd);font-size:11px;letter-spacing:2px;color:var(--gold);margin-bottom:8px;text-transform:uppercase;}
.r-card-val{font-size:20px;color:#301607;font-weight:600;margin-bottom:6px;}
.r-card-desc{font-size:14px;color:#592209;font-style:italic;line-height:1.5;}

/* Superpowers */
.powers-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:48px;}
.power-card{background:linear-gradient(135deg,rgba(229,138,69,.07),rgba(89,34,9,.06));border:1px solid rgba(229,138,69,.18);border-radius:14px;padding:18px;animation:fadeUp .5s ease both;transition:transform .2s;}
.power-card:hover{transform:translateY(-4px);}
.power-icon{font-size:24px;margin-bottom:8px;}
.power-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--green);margin-bottom:5px;}
.power-desc{font-size:13px;color:#592209;font-style:italic;}

/* Shadow side */
.shadow-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:48px;}
.shadow-card{background:linear-gradient(135deg,rgba(89,34,9,.07),rgba(89,34,9,.05));border:1px solid rgba(89,34,9,.2);border-radius:14px;padding:18px;transition:transform .2s;}
.shadow-card:hover{transform:translateY(-4px);}
.shadow-icon{font-size:22px;margin-bottom:8px;}
.shadow-name{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:#592209;margin-bottom:4px;}
.shadow-tip{font-size:13px;color:#592209;font-style:italic;}

/* Timeline */
.tl-wrap{position:relative;padding:10px 0 10px 32px;margin-bottom:48px;}
.tl-wrap::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:2px;background:linear-gradient(to bottom,var(--gold),var(--pink),var(--cyan));}
.tl-item{position:relative;margin-bottom:24px;padding-left:18px;}
.tl-dot2{position:absolute;left:-26px;top:8px;width:14px;height:14px;border-radius:50%;background:var(--dc,var(--gold));border:2px solid var(--void);box-shadow:0 0 14px var(--dc,var(--gold));}
.tl-phase{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:var(--dc,var(--gold));text-transform:uppercase;margin-bottom:4px;}
.tl-range{font-family:var(--fd);font-size:14px;color:#301607;margin-bottom:3px;}
.tl-desc{font-size:14px;color:#592209;font-style:italic;line-height:1.5;}

/* Planet dashboard */
.planet-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;margin-bottom:20px;}
.p-item{background:var(--glass);border:1px solid var(--gb);border-radius:14px;padding:16px 10px;text-align:center;cursor:pointer;transition:transform .2s,border-color .3s,box-shadow .3s;}
.p-item:hover,.p-item.sel{transform:translateY(-4px);border-color:var(--gold);box-shadow:0 0 30px rgba(229,138,69,.2);}
.p-sym{font-size:30px;margin-bottom:6px;}
.p-name{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:5px;}
.p-score{font-family:var(--fd);font-size:15px;color:var(--gold);}
.p-panel{background:linear-gradient(135deg,rgba(89,34,9,.1),rgba(89,34,9,.06));border:1px solid rgba(89,34,9,.25);border-radius:16px;padding:24px;margin-bottom:48px;animation:fadeUp .4s ease;}
.p-panel-title{font-family:var(--fd);font-size:16px;color:var(--gold);margin-bottom:6px;}
.p-panel-sub{font-family:var(--fm);font-size:10px;letter-spacing:3px;color:var(--cyan);text-transform:uppercase;margin-bottom:14px;}
.p-panel-body{font-size:15px;color:#592209;line-height:1.7;font-style:italic;}
.p-traits{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}
.p-trait{background:rgba(229,138,69,.1);border:1px solid rgba(229,138,69,.2);border-radius:20px;padding:5px 14px;font-family:var(--fm);font-size:10px;letter-spacing:1px;color:var(--gold);}

/* Aura */
.aura-wrap{text-align:center;padding:40px 20px;margin-bottom:48px;}
.aura-glow{width:160px;height:160px;border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:50px;animation:aura-pulse 3s ease-in-out infinite;}
@keyframes aura-pulse{0%,100%{box-shadow:0 0 40px var(--ac,rgba(229,138,69,.5)),0 0 80px var(--ac,rgba(229,138,69,.25));}50%{box-shadow:0 0 80px var(--ac,rgba(229,138,69,.8)),0 0 160px var(--ac,rgba(229,138,69,.4));}}
.aura-name{font-family:var(--fd);font-size:22px;color:var(--gold);margin-bottom:8px;}
.aura-meaning{font-size:16px;color:#592209;font-style:italic;}

/* Lucky system */
.lucky-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:48px;}
.lucky-item{background:var(--glass);border:1px solid var(--gb);border-radius:14px;padding:18px 12px;text-align:center;transition:transform .2s;}
.lucky-item:hover{transform:translateY(-3px);}
.lucky-icon{font-size:26px;margin-bottom:8px;}
.lucky-type{font-family:var(--fm);font-size:9px;letter-spacing:3px;color:#592209;text-transform:uppercase;margin-bottom:5px;}
.lucky-val{font-family:var(--fd);font-size:15px;color:var(--gold);}

/* Gauge */
.gauge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:48px;}
.gauge-item{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px;text-align:center;backdrop-filter:blur(8px);}
.gauge-svg{width:100px;height:100px;display:block;margin:0 auto 10px;transform:rotate(-90deg);}
.gauge-track{fill:none;stroke:rgba(89,34,9,0.05);stroke-width:8;}
.gauge-fill{fill:none;stroke-width:8;stroke-linecap:round;transition:stroke-dashoffset 2s cubic-bezier(.4,0,.2,1);}
.gauge-inner{display:grid;place-items:center;}
.gauge-svg-wrap{display:grid;place-items:center;width:100px;height:100px;margin:0 auto 10px;}
.gauge-svg2{width:100px;height:100px;transform:rotate(-90deg);grid-area:1/1;}
.gauge-num{grid-area:1/1;font-family:var(--fd);font-size:20px;color:var(--gold);font-weight:700;}
.gauge-label{font-family:var(--fm);font-size:10px;letter-spacing:2px;color:#592209;text-transform:uppercase;}

/* Power years */
.pyears-wrap{margin-bottom:48px;}
.py-item{display:flex;align-items:center;gap:16px;padding:12px 0;border-bottom:1px solid rgba(89,34,9,0.2);}
.py-year{font-family:var(--fd);font-size:18px;color:var(--gold);width:60px;flex-shrink:0;}
.py-stars{flex:1;}
.py-desc{font-size:14px;color:#592209;font-style:italic;width:220px;text-align:right;}

/* Forecast */
.forecast-tabs{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.f-tab{padding:8px 18px;border-radius:20px;font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border:1px solid rgba(89,34,9,0.1);background:transparent;color:#592209;transition:all .3s;}
.f-tab.active{background:linear-gradient(135deg,var(--pur),var(--pink));border-color:transparent;color:#F5E9D6;box-shadow:0 0 20px rgba(89,34,9,.3);}
.forecast-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:48px;}
@media(max-width:600px){.forecast-grid{grid-template-columns:repeat(2,1fr);}}
.fc-item{background:var(--glass);border:1px solid var(--gb);border-radius:12px;padding:14px 10px;text-align:center;}
.fc-icon{font-size:22px;margin-bottom:6px;}
.fc-type{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:6px;}
.fc-bar{height:5px;background:rgba(89,34,9,0.2);border-radius:3px;overflow:hidden;margin-bottom:7px;}
.fc-bfill{height:100%;border-radius:3px;transition:width 1.6s cubic-bezier(.4,0,.2,1);width:0;}
.fc-bfill.go{width:var(--fw,0%);}
.fc-val{font-family:var(--fd);font-size:15px;font-weight:700;color:var(--fcolor,var(--gold));}

/* AI Chat */
.chat-wrap{background:var(--glass);border:1px solid var(--gb);border-radius:20px;padding:24px;margin-bottom:48px;backdrop-filter:blur(12px);}
.chat-msgs{max-height:320px;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;}
.chat-msgs::-webkit-scrollbar{width:4px;}
.chat-msgs::-webkit-scrollbar-thumb{background:rgba(89,34,9,.4);border-radius:2px;}
.chat-msg{padding:12px 16px;border-radius:12px;font-size:15px;line-height:1.6;max-width:85%;}
.chat-msg.user{background:linear-gradient(135deg,rgba(89,34,9,.25),rgba(89,34,9,.15));border:1px solid rgba(89,34,9,.2);align-self:flex-end;font-style:italic;}
.chat-msg.ai{background:rgba(229,138,69,.07);border:1px solid rgba(229,138,69,.15);align-self:flex-start;color:#592209;}
.chat-msg.loading{color:#592209;font-style:italic;font-size:14px;}
.chat-row{display:flex;gap:10px;}
.chat-input{flex:1;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.05);border-radius:10px;padding:12px 16px;color:#301607;font-family:var(--fb);font-size:15px;outline:none;transition:border .3s;}
.chat-input:focus{border-color:var(--gold);}
.chat-send{padding:12px 20px;background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;color:#F5E9D6;font-family:var(--fd);font-size:11px;letter-spacing:1px;cursor:pointer;transition:transform .2s;white-space:nowrap;}
.chat-send:hover{transform:translateY(-1px);}
.chat-send:disabled{opacity:.5;cursor:not-allowed;}
.chat-qs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.chat-q{padding:6px 14px;background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.2);border-radius:20px;font-size:13px;color:#592209;cursor:pointer;transition:all .2s;font-style:italic;}
.chat-q:hover{background:rgba(89,34,9,.2);color:#301607;}

/* Universe scoreboard */
.scoreboard{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:48px;}
.sb-item{background:var(--glass);border:1px solid var(--gb);border-radius:16px;padding:20px;text-align:center;backdrop-filter:blur(8px);}
.sb-icon{font-size:24px;margin-bottom:10px;}
.sb-label{font-family:var(--fm);font-size:9px;letter-spacing:2px;color:#592209;text-transform:uppercase;margin-bottom:8px;}
.sb-score{font-family:var(--fd);font-size:26px;color:var(--gold);}

/* WOW finale */
.wow-wrap{text-align:center;padding:60px 20px;background:radial-gradient(ellipse at center,rgba(229,138,69,.06),transparent 70%);border-radius:24px;border:1px solid rgba(229,138,69,.1);margin-bottom:48px;}
.wow-title{font-family:var(--fd);font-size:clamp(18px,3vw,32px);color:var(--gold);margin-bottom:8px;text-shadow:0 0 40px rgba(229,138,69,.4);}
.wow-sub{font-family:var(--fm);font-size:10px;letter-spacing:5px;color:#592209;text-transform:uppercase;margin-bottom:40px;}
.wow-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:left;}
@media(max-width:600px){.wow-cols{grid-template-columns:1fr;}}
.wow-col-title{font-family:var(--fm);font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;}
.wow-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;font-size:14px;color:#592209;font-style:italic;}

/* Reset */
.reset-btn{display:block;margin:0 auto;padding:14px 40px;background:transparent;border:1px solid rgba(89,34,9,0.1);border-radius:50px;color:#592209;font-family:var(--fm);font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
.reset-btn:hover{border-color:var(--gold);color:var(--gold);box-shadow:0 0 30px rgba(229,138,69,.15);}

/* Couple header */
.r-header{text-align:center;padding:50px 20px 40px;}
.r-name{font-family:var(--fd);font-size:clamp(18px,3vw,32px);background:linear-gradient(135deg,var(--gold),var(--gold2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:6px;}
.r-sub{font-family:var(--fm);font-size:10px;letter-spacing:4px;color:rgba(48,22,7,0.75);text-transform:uppercase;}

/* Shareable card */
.share-card{background:#F5E9D6;border:1px solid rgba(229,138,69,.25);border-radius:20px;padding:32px;text-align:center;margin-bottom:48px;position:relative;overflow:hidden;}
.share-card::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(229,138,69,.08),transparent 60%);pointer-events:none;}
.share-title{font-family:var(--fd);font-size:11px;letter-spacing:4px;color:var(--gold);text-transform:uppercase;margin-bottom:20px;}
.share-inner{display:inline-block;background:linear-gradient(135deg,rgba(229,138,69,.06),rgba(89,34,9,.06));border:1px solid rgba(229,138,69,.15);border-radius:16px;padding:24px 32px;margin-bottom:20px;}
.share-sname{font-family:var(--fd);font-size:20px;color:#301607;margin-bottom:4px;}
.share-zodiac{font-family:var(--fm);font-size:11px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:14px;}
.share-tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
.share-tag{background:rgba(229,138,69,.12);border:1px solid rgba(229,138,69,.2);border-radius:20px;padding:4px 14px;font-family:var(--fm);font-size:10px;color:var(--gold);}
.share-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
.share-btn{padding:10px 20px;border-radius:20px;font-family:var(--fm);font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:transform .2s;border:none;color:#301607;}
.share-btn:hover{transform:translateY(-2px);}

/* Results page: gentle entrance + hover + a very subtle energy-badge glow pulse */
@keyframes rfade-up{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.r-sec{animation:rfade-up .6s ease-out both;}
.r-hcard{transition:transform .2s ease,border-color .2s ease;}
.r-hcard:hover{transform:translateY(-4px);border-color:rgba(89,34,9,0.45)!important;}
@keyframes energy-glow-pulse{0%,100%{opacity:0.98;}50%{opacity:1;filter:brightness(1.02);}}
.energy-badge{animation:energy-glow-pulse 3.5s ease-in-out infinite;}
`;

const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ── Data helpers ─────────────────────────────────────────────────────────────
const DAYS   = Array.from({length:31},(_,i)=>i+1);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS  = Array.from({length:120},(_,i)=>new Date().getFullYear()-i);
const HOURS  = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
const MINS   = ["00","05","10","15","20","25","30","35","40","45","50","55"];

function getZodiac(d,m){
  const s=[["Capricorn",1,19],["Aquarius",2,18],["Pisces",3,20],["Aries",4,19],["Taurus",5,20],["Gemini",6,20],["Cancer",7,22],["Leo",8,22],["Virgo",9,22],["Libra",10,22],["Scorpio",11,21],["Sagittarius",12,21],["Capricorn",12,31]];
  for(const[z,mo,dy]of s)if(m<mo||(m===mo&&d<=dy))return z;
  return "Capricorn";
}
function getLP(dob){
  let s=dob.replace(/-/g,"").split("").map(Number).reduce((a,b)=>a+b,0);
  while(s>9&&s!==11&&s!==22)s=String(s).split("").map(Number).reduce((a,b)=>a+b,0);
  return s;
}
function hash(str){return str.split("").reduce((a,c)=>(a*31+c.charCodeAt(0))&0xffff,0);}
function dv(base,seed,lo=55,hi=98){const h=hash(seed);return Math.min(hi,Math.max(lo,base+(h%22)-11));}

// Counts 0 → target once the element scrolls into view.
function useCountUpOnVisible(target:number,duration=1200){
  const [val,setVal]=useState(0);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    let intervalId:ReturnType<typeof setInterval>|null=null;
    const obs=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){
        obs.disconnect();
        let start=0;const step=target/(duration/16);
        intervalId=setInterval(()=>{start+=step;if(start>=target){setVal(target);if(intervalId)clearInterval(intervalId);}else setVal(Math.floor(start));},16);
      }
    },{threshold:0.35});
    obs.observe(el);
    return ()=>{obs.disconnect();if(intervalId)clearInterval(intervalId);};
  },[target,duration]);
  return [val,ref] as const;
}

// One Life Energy Map badge — count-up + a very subtle glow pulse, triggers on scroll into view.
function EnergyBadge({label,color,desc,Icon,value}){
  const [count,ref]=useCountUpOnVisible(value,1200);
  return(
    <div ref={ref} className="r-sec" style={{textAlign:"center"}}>
      <div className="energy-badge" style={{width:110,height:110,borderRadius:"50%",border:`2px solid ${color}`,boxShadow:`0 0 24px ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",background:"#FBF5EC"}}>
        <Icon size={32} color={color}/>
      </div>
      <div style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:26,fontWeight:800,color:"#301607"}}>{count}%</div>
      <div style={{color,fontWeight:700,fontSize:13,letterSpacing:"0.08em",marginBottom:10}}>{label}</div>
      <div style={{color:"rgba(48,22,7,0.8)",fontSize:13,lineHeight:1.5}}>{desc}</div>
    </div>
  );
}

const ZODIAC_SYMBOLS={Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓"};
const ZODIAC_IMAGES={Aries:zodiacAries,Taurus:zodiacTaurus,Gemini:zodiacGemini,Cancer:zodiacCancer,Leo:zodiacLeo,Virgo:zodiacVirgo,Libra:zodiacLibra,Scorpio:zodiacScorpio,Sagittarius:zodiacSagittarius,Capricorn:zodiacCapricorn,Aquarius:zodiacAquarius,Pisces:zodiacPisces};

const ARCHETYPES=[
  {icon:explorerIcon,name:"Explorer",tag:"Born to discover",detail:"You seek meaning, adventures, and new horizons."},
  {icon:creatorIcon, name:"Creator", tag:"Born to build",    detail:"You transform ideas into reality and leave a lasting impact."},
  {icon:leaderIcon,  name:"Leader",  tag:"Born to inspire",  detail:"You have a natural ability to guide, uplift, and empower."},
];

const ZODIAC_HERO_TRAITS={
  Aries:"boldness, energy, and pioneering spirit",Taurus:"steadiness, sensuality, and quiet determination",
  Gemini:"curiosity, wit, and effortless charm",Cancer:"warmth, intuition, and emotional depth",
  Leo:"warmth, presence, and creative power",Virgo:"precision, humility, and quiet mastery",
  Libra:"charm, balance, and a refined sense of beauty",Scorpio:"intensity, magnetism, and fearless depth",
  Sagittarius:"optimism, adventure, and expansive vision",Capricorn:"discipline, ambition, and enduring strength",
  Aquarius:"originality, vision, and independent thinking",Pisces:"imagination, compassion, and dreamy intuition",
};

const LIFE_PATH_TRAITS={
  1:"leadership, independence, and pioneering drive",2:"diplomacy, partnership, and gentle strength",
  3:"creativity, expression, and joyful communication",4:"structure, reliability, and the discipline to build lasting things",
  5:"freedom, adaptability, and a hunger for new experience",6:"nurturing, responsibility, and a devotion to home and community",
  7:"introspection, wisdom, and a search for deeper truth",8:"ambition, influence, and the ability to build something meaningful",
  9:"compassion, idealism, and a global, humanitarian outlook",11:"intuition, inspiration, and a heightened spiritual sensitivity",
  22:"vision paired with the discipline to make it real at scale",33:"selfless compassion and a rare gift for healing others",
};

// Nominatim place search
async function searchPlaces(q){
  if(!q||q.length<2)return[];
  const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&addressdetails=1`,{headers:{"Accept-Language":"en","User-Agent":"SpiritualAI/1.0"}});
  const d=await r.json();
  return d.map(x=>({display:x.display_name.split(",").slice(0,3).join(", "),city:x.address?.city||x.address?.town||x.address?.village||x.name,state:x.address?.state||"",country:x.address?.country||"",lat:parseFloat(x.lat),lon:parseFloat(x.lon)}));
}

// Backend AI call
async function fetchBirthChartAI(payload){
  const r=await fetch(`${API_BASE_URL}/birthchart/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error("Backend error");
  return r.json();
}

// ── Starfield ─────────────────────────────────────────────────────────────────
function Starfield(){
  const stars=Array.from({length:140},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:Math.random()*2+.4,d:(Math.random()*4+2).toFixed(1),dl:(Math.random()*6).toFixed(2),op:(Math.random()*.6+.2).toFixed(2)}));
  return <div className="sf">{stars.map(s=><div key={s.id} className="st" style={{left:`${s.x}%`,top:`${s.y}%`,width:s.sz,height:s.sz,"--d":`${s.d}s`,"--dl":`${s.dl}s`,"--op":s.op}}/>)}</div>;
}

// ── Place input ───────────────────────────────────────────────────────────────
function PlaceInput({value,onChange}){
  const [q,setQ]=useState(value?.display||"");
  const [res,setRes]=useState([]);
  const [open,setOpen]=useState(false);
  const t=useRef(null);
  const handleChange=e=>{
    const v=e.target.value; setQ(v);
    clearTimeout(t.current);
    if(v.length<2){setRes([]);return;}
    t.current=setTimeout(async()=>{const r=await searchPlaces(v);setRes(r);setOpen(r.length>0);},400);
  };
  const pick=r=>{setQ(r.display);onChange(r);setOpen(false);};
  return(
    <div className="pl-wrap">
      <input className="f-input" value={q} onChange={handleChange} onBlur={()=>setTimeout(()=>setOpen(false),200)} placeholder="Type city name…"/>
      {open&&<div className="pl-drop">{res.map((r,i)=><div key={i} className="pl-item" onMouseDown={()=>pick(r)}>{r.display}<small>{r.lat?.toFixed(4)}, {r.lon?.toFixed(4)}</small></div>)}</div>}
    </div>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
const LSTEPS=["Reading Cosmic Coordinates","Locating Birth Star Alignment","Mapping Planetary Positions","Calculating Soul Blueprint","Revealing Destiny Pattern","Unlocking Hidden Traits","Generating Cosmic Identity","Universe Report Ready"];
function Loading({name}){
  const [step,setStep]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setStep(s=>Math.min(s+1,LSTEPS.length-1)),700);return()=>clearInterval(t);},[]);
  return(
    <div className="load-screen">
      <div className="load-name">✦ {name} ✦</div>
      <div className="load-cosmos">
        <div className="orb"><div className="orb-dot" style={{background:"#592209",color:"#F5E9D6"}}/></div>
        <div className="orb"><div className="orb-dot" style={{background:"var(--pur)",color:"var(--pur)"}}/></div>
        <div className="orb"><div className="orb-dot" style={{background:"var(--cyan)",color:"var(--cyan)"}}/></div>
        <div className="orb"><div className="orb-dot" style={{background:"var(--green)",color:"var(--green)"}}/></div>
        <div className="orb-core"/>
      </div>
      <div className="load-steps">{LSTEPS.map((s,i)=><div key={s} className={`load-step ${i===step?"active":i<step?"done":""}`}><div className="ls-dot"/><span>✨ {s}</span></div>)}</div>
    </div>
  );
}

// ── Detailed Insights tab data (per-zodiac descriptions + generic advice/pattern) ──
const INSIGHT_TABS=[
  {key:"love",         label:"Love",         image:loveInsightImg,         color:"#9B2C1D"},
  {key:"career",       label:"Career",       image:careerInsightImg,       color:"#592209"},
  {key:"money",        label:"Money",        image:moneyInsightImg,        color:"#301607"},
  {key:"health",       label:"Health",       image:healthInsightImg,       color:"#592209"},
  {key:"spirituality", label:"Spirituality", image:spiritualityInsightImg, color:"#592209"},
];

const INSIGHT_EXTRA={
  love:{advice:"Choose partners who respect your depth and support your dreams.",pattern:"You seek depth, honesty, and real emotional connection.",focus:"Open your heart without fear.",growth:"Balance protecting yourself with staying vulnerable."},
  career:{advice:"Focus your energy on one path — mastery beats scattered effort.",pattern:"You thrive when your work aligns with your values.",focus:"Commit fully to one path before chasing the next.",growth:"Let others carry some of the weight too."},
  money:{advice:"Patient, values-aligned decisions build your most lasting wealth.",pattern:"You build wealth through patience and smart timing.",focus:"Track where your money actually goes.",growth:"Take calculated risks instead of only playing safe."},
  health:{advice:"Balance mind, body, and emotion — small daily rituals compound.",pattern:"Your body reflects your emotional state closely.",focus:"Prioritize rest as much as ambition.",growth:"Build small sustainable habits, not extreme resets."},
  spirituality:{advice:"Trust the quiet voice within; it already knows the way forward.",pattern:"You're drawn to meaning beyond the material.",focus:"Make space for stillness and reflection.",growth:"Trust intuition even without full proof."},
};

function getInsightText(category, zodiac, name, lifePath){
  const n=name||"You", lp=lifePath||7, z=zodiac||"Leo";
  const maps={
    career:{
      Aries:`${n}, your Aries fire drives you toward leadership roles. Entrepreneurship, athletics management, emergency services, or any path requiring bold decision-making suits you perfectly. Life Path ${lp} amplifies your ability to start ventures others fear to begin.`,
      Taurus:`${n}, your Taurus nature thrives in finance, real estate, architecture, music, or luxury brands. You build wealth slowly and surely — your Life Path ${lp} energy rewards patience with extraordinary long-term returns.`,
      Gemini:`${n}, your Gemini mind excels in communication-heavy careers — journalism, marketing, teaching, software development, or content creation. Life Path ${lp} gives you the adaptability to master multiple disciplines simultaneously.`,
      Cancer:`${n}, your Cancer sensitivity makes you extraordinary in psychology, healthcare, hospitality, real estate, or any role involving deep human care. Life Path ${lp} positions you to build things that nurture others.`,
      Leo:`${n}, your Leo energy was born for the spotlight — entertainment, leadership, brand building, politics, or any stage where your confidence inspires others. Life Path ${lp} amplifies your natural magnetism.`,
      Virgo:`${n}, your Virgo precision excels in data science, medicine, research, editing, nutrition, or any field demanding mastery of detail. Life Path ${lp} gives your analytical mind an extraordinary edge.`,
      Libra:`${n}, your Libra energy thrives in law, diplomacy, design, fashion, psychology, or any field requiring refined judgment. Life Path ${lp} draws you toward roles where you create balance and beauty.`,
      Scorpio:`${n}, your Scorpio intensity suits investigation, psychology, surgery, finance, research, or any path requiring penetrating insight. Life Path ${lp} gives you the focus to uncover what others cannot see.`,
      Sagittarius:`${n}, your Sagittarius spirit thrives in travel, philosophy, publishing, higher education, international business, or entrepreneurship. Life Path ${lp} keeps expanding your world in ways that feel like destiny.`,
      Capricorn:`${n}, your Capricorn ambition is built for executive roles, engineering, finance, government, or long-term enterprise building. Life Path ${lp} rewards your discipline with authority and legacy.`,
      Aquarius:`${n}, your Aquarius vision belongs in technology, social innovation, science, humanitarian work, or startup culture. Life Path ${lp} positions you as someone who changes systems, not just works within them.`,
      Pisces:`${n}, your Pisces imagination flourishes in art, music, healing, spirituality, film, or any path where intuition leads. Life Path ${lp} connects your inner world to a higher creative purpose.`,
    },
    love:{
      Aries:`${n}, your Aries heart loves passionately and fully — but you need a partner who matches your intensity without being overwhelmed by it. Love often arrives unexpectedly through competitive or adventurous encounters.`,
      Taurus:`${n}, your Taurus soul craves deep, loyal, sensual connection. You take time to trust, but once you do, you love for life. A grounded, affectionate partner who values stability will complete your world.`,
      Gemini:`${n}, your Gemini spirit needs a partner who stimulates your mind as much as your heart. Intellectual chemistry is your love language. You may find deep love through conversation and shared ideas.`,
      Cancer:`${n}, your Cancer heart gives everything — sometimes too much. You are learning to receive love as generously as you give it. Your ideal partner provides the safe harbor your soul has always needed.`,
      Leo:`${n}, your Leo heart demands to be seen, celebrated, and adored — and you give that back tenfold. You attract admirers easily, but deep love comes when someone matches your loyalty, not just your light.`,
      Virgo:`${n}, your Virgo love is devoted, thoughtful, and quietly profound. You show love through acts of service and careful attention — your partner needs to recognize these subtle expressions.`,
      Libra:`${n}, your Libra soul was literally made for partnership. You are at your best when deeply loved, and give extraordinary beauty back. A connection of rare elegance is either present or approaching.`,
      Scorpio:`${n}, your Scorpio love is all-or-nothing — no shallow connections satisfy you. You sense your partner's soul before you know their name. When you find your equal, the bond is unbreakable.`,
      Sagittarius:`${n}, your Sagittarius heart loves freely and needs a partner who is a companion, not a cage. Love that expands your world — through travel, philosophy, shared adventures — is what sustains you.`,
      Capricorn:`${n}, your Capricorn heart is deeply loyal but cautious with vulnerability. You love through commitment and acts of security. Your ideal partner respects your ambition and celebrates your drive.`,
      Aquarius:`${n}, your Aquarius heart needs intellectual and spiritual connection above all. You love unconventionally, deeply, and often unexpectedly. Your ideal partner is your best friend first.`,
      Pisces:`${n}, your Pisces heart loves with a depth that borders on spiritual. You feel your partner's emotions as your own. Protecting your sensitive energy while staying open is your love journey.`,
    },
    money:{
      Aries:`${n}, your wealth comes through bold initiative and first-mover advantage. You are wired to spot opportunities before the crowd — channel your energy into one focused direction and let compounding do the rest.`,
      Taurus:`${n}, your wealth is built through consistency, property, and long-term investments. Start early, invest in tangibles, and trust that your steady pace will out-earn those who sprint and crash.`,
      Gemini:`${n}, your wealth potential is highest in communication, media, or multi-income streams. Your adaptability is your financial superpower — but avoid spreading too thin across too many ideas.`,
      Cancer:`${n}, your wealth often comes through real estate, family business, or caring-based enterprises. You build financial security instinctively, but must overcome the fear of charging what you're worth.`,
      Leo:`${n}, your wealth comes through personal brand, performance, and leadership. People pay premium prices for your charisma and confidence — build platforms, not just jobs.`,
      Virgo:`${n}, your wealth is built through mastery, systems, and impeccable execution. Investing in your own skills and building efficient income systems generates significant long-term wealth.`,
      Libra:`${n}, your wealth flows through partnerships, aesthetics, and high-end markets. Business partnerships and creative ventures aligned with beauty and harmony are your most natural wealth channels.`,
      Scorpio:`${n}, your wealth comes through deep research, strategic investment, and transformational work. Financial power grows when you combine investigative instinct with long-term compounding.`,
      Sagittarius:`${n}, your wealth comes through expansion — international ventures, publishing, teaching, or entrepreneurship at scale. Building systems around your freedom-loving nature is key to lasting abundance.`,
      Capricorn:`${n}, your wealth is almost inevitable given enough time. Real estate, equities, and strategic career advancement build a legacy that outlasts you — start now, time is your greatest asset.`,
      Aquarius:`${n}, your wealth comes through innovation and disruption. You see solutions others don't, and the market rewards that vision — technology and intellectual property are your highest-return channels.`,
      Pisces:`${n}, your wealth comes through creative work, intuitive investments, and often unexpected sources. Your imagination is literally monetizable — many Pisces build wealth through art or healing work.`,
    },
    health:{
      Aries:`${n}, your competitive fire needs regular physical outlets — intense workouts, sports, or martial arts keep your energy balanced. Watch for impulsive injuries when you push too hard, too fast.`,
      Taurus:`${n}, your body craves comfort, good food, and steady rhythms. Build gentle, consistent movement into your life, and watch your tendency to indulge past the point of balance.`,
      Gemini:`${n}, your nervous system runs fast and restless. Breathing exercises, regular sleep, and reducing mental overstimulation protect you from anxiety and burnout more than any diet.`,
      Cancer:`${n}, your emotional world and physical health are deeply linked — stress shows up in your stomach and sleep first. Gentle self-care rituals and time near water restore you quickly.`,
      Leo:`${n}, your heart, quite literally, is your power center. Cardiovascular health and joyful movement keep your natural vitality burning bright without burning out.`,
      Virgo:`${n}, you are naturally attuned to your body's signals, sometimes to the point of worry. Trust routines over obsession — rest is as productive as any task on your list.`,
      Libra:`${n}, balance is your body's love language — in diet, sleep, and relationships alike. Gentle detox habits and calm environments serve you especially well.`,
      Scorpio:`${n}, your intensity runs deep, including physically. Regular release — through intense exercise, therapy, or creative expression — keeps buried tension from settling in.`,
      Sagittarius:`${n}, you feel best in motion — travel, sport, and open spaces keep your spirit and body aligned. Watch for restlessness turning into overexertion or skipped recovery.`,
      Capricorn:`${n}, discipline serves you well physically, but don't let ambition override rest. Pace yourself for the marathon, not the sprint, as you build your long-term legacy.`,
      Aquarius:`${n}, your energy runs on innovation and stimulation — circulation and nervous system health benefit from grounding practices that pull you out of your head.`,
      Pisces:`${n}, your sensitive system absorbs the energy around you, for better or worse. Time alone, water-based rest, and protecting your sleep are essential for you.`,
    },
    spirituality:{
      Aries:`${n}, you were born to ignite. Your purpose is to courageously begin what others are afraid to start. Life Path ${lp} confirms your soul mission is one of pioneering and activation.`,
      Taurus:`${n}, you were born to build. Your purpose is to create lasting beauty, stability, and abundance — not just for yourself, but as a model for others. Life Path ${lp} anchors this mission.`,
      Gemini:`${n}, you were born to connect and communicate. Your purpose is to bridge worlds and translate complex truths into understanding. Life Path ${lp} amplifies your role as a messenger.`,
      Cancer:`${n}, you were born to nurture and protect. Your purpose is to create emotional safety for others. Life Path ${lp} confirms your deepest power is making others feel truly seen.`,
      Leo:`${n}, you were born to inspire. Your purpose is to shine so brightly that others find permission to do the same. Life Path ${lp} places you in a mission of leadership and generosity.`,
      Virgo:`${n}, you were born to perfect and heal. Your purpose is to bring order, health, and precision to a chaotic world. Life Path ${lp} confirms a soul mission of devoted service.`,
      Libra:`${n}, you were born to harmonize. Your purpose is to bring beauty, fairness, and balance into every relationship you touch. Life Path ${lp} confirms you as a cosmic bridge-builder.`,
      Scorpio:`${n}, you were born to transform. Your purpose is to descend into the depths and emerge with truths that change lives. Life Path ${lp} marks you as a catalyst for evolution.`,
      Sagittarius:`${n}, you were born to expand. Your purpose is to seek truth at the edge of the known world. Life Path ${lp} confirms a soul mission of teaching and spiritual liberation.`,
      Capricorn:`${n}, you were born to master and lead. Your purpose is to build structures that endure beyond your lifetime. Life Path ${lp} confirms a mission of disciplined greatness.`,
      Aquarius:`${n}, you were born to revolutionize. Your purpose is to see the future others cannot imagine. Life Path ${lp} marks you as a visionary whose work serves all of humanity.`,
      Pisces:`${n}, you were born to transcend. Your purpose is to dissolve boundaries between the seen and unseen through art, compassion, and spiritual depth. Life Path ${lp} confirms this calling.`,
    },
  };
  const m=maps[category]||maps.career;
  return m[z]||m.Leo;
}

// ── Results ───────────────────────────────────────────────────────────────────
function Results({data,onReset}){
  const {name,zodiac,lifePath,dob,time,place}=data;
  const h=hash(name+dob);
  const base=62+(h%30);
  const sym=ZODIAC_SYMBOLS[zodiac]||"⭐";
  const zodiacImg=ZODIAC_IMAGES[zodiac];
  const [insightTab,setInsightTab]=useState("love");

  const [dy,dm,dd]=dob.split("-");
  const dobFormatted=`${dd} ${MONTHS[+dm-1]} ${dy}`;
  const heroDesc=`Your ${zodiac} energy brings ${ZODIAC_HERO_TRAITS[zodiac]||"a rare and powerful presence"}. Life Path ${lifePath} adds ${LIFE_PATH_TRAITS[lifePath]||"a unique blend of gifts that support your journey"}.`;

  const ENERGY_MAP=[
    {key:"love",   label:"LOVE",   icon:Heart,      color:"#9B2C1D", desc:"You love deeply, and your loyalty drives all."},
    {key:"career", label:"CAREER", icon:Briefcase,  color:"#301607", desc:"You're aligned with purpose and on the path."},
    {key:"money",  label:"MONEY",  icon:DollarSign, color:"#301607", desc:"Financial flow is strong when you stay value-aligned."},
    {key:"health", label:"HEALTH", icon:Activity,   color:"#592209", desc:"Focus on balance of mind, body, and emotions."},
    {key:"growth", label:"GROWTH", icon:Star,       color:"#592209", desc:"Your soul is evolving and expanding beautifully."},
  ].map(e=>({...e,value:dv(base,name+e.key)}));

  const STRENGTHS=[
    {icon:Target, name:"Natural Leadership",   desc:"You inspire trust and set the example."},
    {icon:Palette,name:"Creative Intelligence",desc:"Your ideas bring vision into real impact."},
    {icon:Eye,    name:"Strong Intuition",     desc:"You sense what others overlook or need."},
  ];
  const GROWTH_AREAS=[
    {icon:RotateCcw,name:"Overthinking",   desc:"Trust yourself more and release mental noise."},
    {icon:Hourglass,name:"Impatience",     desc:"Give things time. Grace is part of the journey."},
    {icon:Shield,   name:"Emotional Guard",desc:"Let in more love. Vulnerability is your strength."},
  ];

  const DO_MORE=["Trust your intuition","Lead with kindness","Create and express","Take inspired action"];
  const AVOID=["Settling for less","Overthinking decisions","Holding your true self","Ignoring inner voice"];

  const cardStyle={background:"#FBF5EC",border:"1px solid rgba(89,34,9,0.2)",borderRadius:16,padding:32};
  const sectionTitle:CSSProperties={fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:28,color:"#301607",fontWeight:700,textAlign:"center",textTransform:"uppercase",marginBottom:36,letterSpacing:"0.03em"};

  const activeTab=INSIGHT_TABS.find(t=>t.key===insightTab);
  const insightScore=dv(base,name+insightTab+"score");
  const insightText=getInsightText(insightTab,zodiac,name,lifePath);
  const insightExtra=INSIGHT_EXTRA[insightTab];

  return(
    <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 24px 100px",color:"#301607",fontFamily:"'DM Sans', system-ui, sans-serif"}}>

      {/* ── HERO ── */}
      <div className="r-sec" style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:60,alignItems:"center",marginBottom:80,paddingTop:20,animationDelay:"0.05s"}}>
        <div>
          <div style={{color:"rgba(48,22,7,0.75)",fontWeight:700,fontSize:15,letterSpacing:"0.15em",marginBottom:12}}>BIRTH CHART REPORT</div>
          <div style={{fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:"clamp(32px,5vw,52px)",color:"#301607",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:16,lineHeight:1.1}}>{name}</div>
          <div style={{color:"#592209",fontWeight:700,fontSize:18,marginBottom:24}}>{zodiac.toUpperCase()} SUN &nbsp;•&nbsp; LIFE PATH {lifePath}</div>
          <div style={{fontSize:18,fontStyle:"italic",lineHeight:1.7,color:"#301607",marginBottom:32}}>{heroDesc}</div>

          <div style={{display:"flex",gap:28,flexWrap:"nowrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(89,34,9,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Calendar size={20} color="#ff7e47"/></div>
              <div style={{whiteSpace:"nowrap"}}>
                <div style={{fontWeight:700,fontSize:15}}>Born {dobFormatted}</div>
                <div style={{fontSize:13,color:"#301607"}}>{time||"Time unknown"}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(89,34,9,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><MapPin size={20} color="#ff7e47"/></div>
              <div style={{whiteSpace:"nowrap"}}>
                <div style={{fontWeight:700,fontSize:15}}>{place?.city?`${place.city}${place.country?", "+place.country:""}`:"Location not provided"}</div>
                <div style={{fontSize:13,color:"#301607"}}>{place?.lat!=null?`${place.lat.toFixed(2)}° N, ${place.lon.toFixed(2)}° E`:"—"}</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(89,34,9,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Globe size={20} color="#ff7e47"/></div>
              <div style={{whiteSpace:"nowrap"}}>
                <div style={{fontWeight:700,fontSize:15}}>Tropical</div>
                <div style={{fontSize:13,color:"#301607"}}>Placidus Houses</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",minHeight:460}}>
          <div style={{position:"absolute",inset:"2%",borderRadius:"50%",background:"radial-gradient(circle,rgba(89,34,9,0.18),transparent 70%)",filter:"blur(20px)"}}></div>
          <img src={zodiacImg} alt={zodiac} style={{position:"relative",width:460,height:460,objectFit:"contain",filter:"drop-shadow(0 0 40px rgba(89,34,9,0.4))"}}/>
        </div>
      </div>

      {/* ── PERSONALITY TYPE ── */}
      <div className="r-sec" style={{marginBottom:80,animationDelay:"0.15s"}}>
        <div style={sectionTitle}>Your Personality Type</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24}}>
          {ARCHETYPES.map((a,i)=>(
            <div key={i} className="r-hcard" style={cardStyle}>
              <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(89,34,9,0.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                <img src={a.icon} alt={a.name} style={{width:52,height:52,objectFit:"contain"}}/>
              </div>
              <div style={{color:"#301607",fontWeight:800,fontSize:18,marginBottom:4}}>{a.name.toUpperCase()}</div>
              <div style={{color:"#592209",fontWeight:600,fontSize:14,marginBottom:16}}>{a.tag}</div>
              <div style={{color:"rgba(48,22,7,0.85)",fontSize:15,lineHeight:1.6}}>{a.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DETAILED INSIGHTS ── */}
      <div className="r-sec" style={{marginBottom:80,animationDelay:"0.25s"}}>
        <div style={sectionTitle}>Detailed Insights</div>
        <div style={{background:"#FBF5EC",border:"1px solid rgba(89,34,9,0.2)",borderRadius:20,padding:32}}>
          <div style={{display:"flex",gap:8,borderBottom:"1px solid rgba(89,34,9,0.2)",marginBottom:32,flexWrap:"wrap"}}>
            {INSIGHT_TABS.map(t=>(
              <button key={t.key} onClick={()=>setInsightTab(t.key)}
                style={{background:"none",border:"none",cursor:"pointer",padding:"12px 18px",fontSize:15,fontWeight:600,
                  color:insightTab===t.key?"#301607":"rgba(48,22,7,0.7)",
                  borderBottom:insightTab===t.key?`2px solid ${t.color}`:"2px solid transparent"}}>
                {t.label}
              </button>
            ))}
          </div>

          <div key={insightTab} className="r-sec" style={{display:"grid",gridTemplateColumns:"200px 1.6fr 1fr",gap:36,alignItems:"start",animationDuration:"0.35s"}}>
            <div style={{width:200,height:200,borderRadius:"50%",overflow:"hidden",border:`1px solid ${activeTab.color}44`,boxShadow:`0 0 30px ${activeTab.color}33`,flexShrink:0}}>
              <img src={activeTab.image} alt={activeTab.label} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>

            <div>
              <div style={{fontSize:26,fontWeight:800,color:"#301607",marginBottom:16}}>{activeTab.label} Energy: <span style={{color:activeTab.color}}>{insightScore}%</span></div>
              <div style={{fontSize:16,lineHeight:1.7,color:"#301607",marginBottom:24}}>{insightText}</div>
              <div style={{background:"rgba(89,34,9,0.06)",border:"1px solid rgba(89,34,9,0.25)",borderRadius:12,padding:"18px 20px"}}>
                <div style={{color:"#592209",fontWeight:700,fontSize:14,marginBottom:6,display:"flex",alignItems:"center",gap:8}}><Star size={16}/> KEY ADVICE</div>
                <div style={{fontSize:15,color:"#301607"}}>{insightExtra.advice}</div>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              {[{label:"Your Pattern",text:insightExtra.pattern,Icon:Heart},{label:"Focus",text:insightExtra.focus,Icon:Target},{label:"Growth",text:insightExtra.growth,Icon:Compass}].map(({label,text,Icon})=>(
                <div key={label} style={{display:"flex",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(89,34,9,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={16} color="#ff7e47"/></div>
                  <div>
                    <div style={{color:"#301607",fontWeight:700,fontSize:15,marginBottom:3}}>{label}</div>
                    <div style={{color:"#301607",fontSize:14,lineHeight:1.5}}>{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SHARE + FINAL GUIDANCE ── */}
      <div className="r-sec" style={{marginBottom:80,animationDelay:"0.35s"}}>
        <div style={sectionTitle}>Share Your Identity</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"stretch"}}>
          <div className="r-hcard" style={cardStyle}>
            <div style={{display:"flex",gap:20,marginBottom:24}}>
              <div style={{width:130,height:130,borderRadius:"50%",border:"2px solid #592209",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>
                <img src={zodiacImg} alt={zodiac} style={{width:98,height:98,objectFit:"contain"}}/>
              </div>
              <div>
                <div style={{color:"#301607",fontWeight:800,fontSize:20,marginBottom:4}}>{name.toUpperCase()}</div>
                <div style={{color:"#592209",fontWeight:600,fontSize:14,marginBottom:8}}>{zodiac.toUpperCase()} SUN • LIFE PATH {lifePath}</div>
                <div style={{color:"rgba(48,22,7,0.8)",fontSize:14,lineHeight:1.5}}>
                  Born to {ARCHETYPES.map(p=>(p.tag||"").replace(/^Born to /,"")).join(", ")} — here to Lead, Guide, and Make a Positive Impact.
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[{label:"WhatsApp",Icon:MessageCircle},{label:"Facebook",Icon:Facebook},{label:"Instagram",Icon:Instagram},{label:"Download Card",Icon:Download}].map(({label,Icon})=>(
                <button key={label} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(89,34,9,0.2)",border:"1px solid rgba(89,34,9,0.2)",borderRadius:10,padding:"10px 16px",color:"rgba(48,22,7,0.75)",fontSize:14,cursor:"pointer"}}>
                  <Icon size={16}/> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="r-hcard" style={cardStyle}>
            <div style={{color:"#301607",fontWeight:800,fontSize:18,marginBottom:20}}>FINAL GUIDANCE</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:24}}>
              <div>
                <div style={{color:"#301607",fontWeight:700,fontSize:13,letterSpacing:"0.05em",marginBottom:12}}>DO MORE OF THIS</div>
                {DO_MORE.map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:14,color:"#301607"}}><CheckCircle2 size={15} color="#4ade80"/> {t}</div>
                ))}
              </div>
              <div>
                <div style={{color:"#9B2C1D",fontWeight:700,fontSize:13,letterSpacing:"0.05em",marginBottom:12}}>AVOID THIS</div>
                {AVOID.map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:14,color:"#301607"}}><XCircle size={15} color="#f87171"/> {t}</div>
                ))}
              </div>
            </div>
            <button style={{width:"100%",padding:"16px",background:"#592209",border:"none",borderRadius:12,color:"#F5E9D6",fontWeight:700,fontSize:16,cursor:"pointer"}}>
              Embrace Your Cosmic Path ✦
            </button>
          </div>
        </div>
      </div>

      {/* ── LIFE ENERGY MAP ── */}
      <div style={{marginBottom:80}}>
        <div className="r-sec" style={{...sectionTitle,animationDelay:"0.45s"}}>Life Energy Map</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:20}}>
          {ENERGY_MAP.map(e=>(
            <EnergyBadge key={e.key} label={e.label} color={e.color} desc={e.desc} Icon={e.icon} value={e.value}/>
          ))}
        </div>
      </div>

      {/* ── HIDDEN SUPERPOWERS ── */}
      <div className="r-sec" style={{marginBottom:60,animationDelay:"0.55s"}}>
        <div style={sectionTitle}>Hidden Superpowers</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div className="r-hcard" style={cardStyle}>
            <div style={{color:"#301607",fontWeight:700,fontSize:13,letterSpacing:"0.08em",marginBottom:20}}>YOUR STRENGTHS</div>
            {STRENGTHS.map(s=>{const Icon=s.icon;return(
              <div key={s.name} style={{display:"flex",gap:14,marginBottom:20}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(89,34,9,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={18} color="#ff7e47"/></div>
                <div><div style={{color:"#301607",fontWeight:700,fontSize:15,marginBottom:3}}>{s.name}</div><div style={{color:"#301607",fontSize:14}}>{s.desc}</div></div>
              </div>
            );})}
          </div>
          <div className="r-hcard" style={cardStyle}>
            <div style={{color:"#301607",fontWeight:700,fontSize:13,letterSpacing:"0.08em",marginBottom:20}}>GROWTH AREAS</div>
            {GROWTH_AREAS.map(s=>{const Icon=s.icon;return(
              <div key={s.name} style={{display:"flex",gap:14,marginBottom:20}}>
                <div style={{width:40,height:40,borderRadius:10,background:"rgba(89,34,9,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={18} color="#ff7e47"/></div>
                <div><div style={{color:"#301607",fontWeight:700,fontSize:15,marginBottom:3}}>{s.name}</div><div style={{color:"#301607",fontSize:14}}>{s.desc}</div></div>
              </div>
            );})}
          </div>
        </div>
      </div>

      <button onClick={onReset} style={{display:"block",margin:"0 auto",padding:"14px 40px",background:"transparent",border:"1px solid rgba(89,34,9,0.2)",borderRadius:50,color:"#F5E9D6",fontSize:13,letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer"}}>
        ✦ New Reading
      </button>
    </div>
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────
const emptyForm=()=>({firstName:"",lastName:"",day:"",month:"",year:"",hour:"",min:"",ampm:"AM",place:null});

const bcInputStyle={
  width:"100%", background:"#FBF5EC", border:"1px solid rgba(89,34,9,0.2)",
  borderBottom:"2px solid rgba(89,34,9,0.5)", borderRadius:10, padding:"14px 18px",
  color:"#301607", fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:16, outline:"none",
};

function BcDivider(){
  return (
    <div style={{display:"flex", alignItems:"center", gap:12, margin:"22px 0"}}>
      <div style={{flex:1, height:1, background:"rgba(89,34,9,0.3)"}}></div>
      <span style={{color:"#592209", fontSize:14}}>✦</span>
      <div style={{flex:1, height:1, background:"rgba(89,34,9,0.3)"}}></div>
    </div>
  );
}

export default function App(){
  const [form,setForm]=useState(emptyForm());
  const [phase,setPhase]=useState("form");
  const [chartData,setChartData]=useState(null);
  const [error,setError]=useState("");

  // Scroll offset carries over across phase changes (nothing resets it), so
  // without this the loading/results views can open scrolled down wherever
  // the user had scrolled the (long) form to instead of at the top.
  useEffect(() => { window.scrollTo(0, 0); }, [phase]);

  // Back button returns to form from loading/results phases
  useBackOverride(
    phase !== "form" ? () => { setPhase("form"); setChartData(null); setError(""); } : null,
    [phase],
  );
  const up=(k,v)=>setForm(f=>({...f,[k]:v}));

  const generate=useCallback(async()=>{
    setError("");
    if(!form.firstName||!form.day||!form.month||!form.year){
      setError("Please fill in your first name and date of birth.");
      return;
    }
    setPhase("loading");
    const name=[form.firstName,form.lastName].filter(Boolean).join(" ");
    const zodiac=getZodiac(+form.day,+form.month);
    const dob=`${form.year}-${String(form.month).padStart(2,"0")}-${String(form.day).padStart(2,"0")}`;
    const lifePath=getLP(dob);
    const time=form.hour&&form.min?`${form.hour}:${form.min} ${form.ampm}`:"";

    let report={};
    try{
      report=await fetchBirthChartAI({name,zodiac,lifePath,dob,place:form.place?.city});
    }catch{/* use fallback data baked into Results */}

    await new Promise(r=>setTimeout(r,5600));
    setChartData({name,zodiac,lifePath,dob,time,place:form.place,report});
    setPhase("results");
  },[form]);

  return(
    <div className="bc-app">
      <Starfield/>
      <div className="nb" style={{width:700,height:700,top:"-250px",left:"-200px",background:"radial-gradient(circle,rgba(229,138,69,.1),transparent 70%)","--nd":"20s"}}/>
      <div className="nb" style={{width:500,height:500,bottom:"5%",right:"-100px",background:"radial-gradient(circle,rgba(89,34,9,.1),transparent 70%)","--nd":"25s"}}/>
      <div className="nb" style={{width:400,height:400,top:"40%",left:"35%",background:"radial-gradient(circle,rgba(89,34,9,.06),transparent 70%)","--nd":"30s"}}/>

      {phase==="loading"&&<Loading name={[form.firstName,form.lastName].filter(Boolean).join(" ")}/>}

      <div className="content" style={{display:phase==="loading"?"none":"block"}}>
        {phase==="form"&&(
          <div style={{maxWidth:700, margin:"0 auto", padding:"60px 24px 100px", fontFamily:"'DM Sans', system-ui, sans-serif"}}>
            <div style={{textAlign:"center", marginBottom:56}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:24}}>
                <div style={{width:80, height:1, background:"linear-gradient(90deg, transparent, rgba(89,34,9,0.6))"}}></div>
                <div style={{color:"#301607", fontStyle:"italic", fontSize:18, whiteSpace:"nowrap"}}>
                  <span style={{color:"#592209"}}>✦</span> Cosmic Identity Experience <span style={{color:"#592209"}}>✦</span>
                </div>
                <div style={{width:80, height:1, background:"linear-gradient(90deg, rgba(89,34,9,0.6), transparent)"}}></div>
              </div>
              <h1 style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize:"clamp(30px,5vw,48px)", fontWeight:700, color:"#301607", letterSpacing:"0.06em", textTransform:"uppercase", lineHeight:1.25, marginBottom:20}}>
                Your Birth<br/><span style={{color:"#592209"}}>Chart Awaits</span>
              </h1>
              <p style={{color:"#301607", fontStyle:"italic", fontSize:18}}>The stars remember the moment you arrived</p>
            </div>

            {error&&<div style={{background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:10, padding:"12px 16px", color:"#9B2C1D", fontSize:14, marginBottom:24, textAlign:"center"}}>⚠ {error}</div>}

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:8}}>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>First Name *</label>
                <input style={bcInputStyle} value={form.firstName} onChange={e=>up("firstName",e.target.value)} placeholder="e.g. Luna"/>
              </div>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Last Name *</label>
                <input style={bcInputStyle} value={form.lastName} onChange={e=>up("lastName", e.target.value)} placeholder="e.g. Starlight"/>
              </div>
            </div>

            <BcDivider/>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:8}}>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Day *</label>
                <select style={bcInputStyle} value={form.day} onChange={e=>up("day",e.target.value)}>
                  <option value="">DD</option>{DAYS.map(d=><option key={d} value={d}>{String(d).padStart(2,"0")}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Month *</label>
                <select style={bcInputStyle} value={form.month} onChange={e=>up("month",e.target.value)}>
                  <option value="">MM</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Year *</label>
                <select style={bcInputStyle} value={form.year} onChange={e=>up("year", e.target.value)}>
                  <option value="">YYYY</option>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <BcDivider/>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginBottom:10}}>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Hour</label>
                <select style={bcInputStyle} value={form.hour} onChange={e=>up("hour",e.target.value)}>
                  <option value="">HH</option>{HOURS.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Minute</label>
                <select style={bcInputStyle} value={form.min} onChange={e=>up("min",e.target.value)}>
                  <option value="">MM</option>{MINS.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Period</label>
                <select style={bcInputStyle} value={form.ampm} onChange={e=>up("ampm",e.target.value)}>
                  <option value="AM">AM</option><option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div style={{color:"#592209", fontStyle:"italic", fontSize:14, opacity:0.85, marginBottom:8}}>Leave blank if unknown - your reading will still be powerful</div>

            <BcDivider/>

            <div style={{marginBottom:40}}>
              <label style={{display:"block", color:"#592209", fontWeight:700, fontSize:15, marginBottom:10}}>Place of Birth <span style={{opacity:0.85, fontWeight:400}}>(Optional)</span></label>
              <PlaceInput value={form.place} onChange={v=>up("place",v)}/>
            </div>

            <button
              onClick={generate}
              style={{
                width:"100%", padding:"20px", background:"#592209", border:"none", borderRadius:40,
                color:"#F5E9D6", fontWeight:800, fontSize:18, letterSpacing:"0.05em", textTransform:"uppercase",
                cursor:"pointer", transition:"transform 0.2s ease, box-shadow 0.2s ease",
                boxShadow:"0 0 30px rgba(89,34,9,0.35)",
              }}
              onMouseOver={(e)=>{e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 0 40px rgba(255,126,71,0.5)";}}
              onMouseOut={(e)=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 0 30px rgba(255,126,71,0.35)";}}
            >
              ✦ Reveal My Cosmic Identity ✦
            </button>
          </div>
        )}
        {phase==="results"&&chartData&&<Results data={chartData} onReset={()=>{setPhase("form");setChartData(null);setForm(emptyForm());}}/>}
      </div>
    </div>
  );
}