import { useState, useEffect, useRef } from "react";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import FeatureFaq from "@/components/FeatureFaq";
import { requireSignIn } from "@/lib/authedFetch";
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { Link } from "react-router-dom";
import FeatureIntro from "@/components/FeatureIntro";
import { useFeatureFlags } from "@/lib/featureFlags";
import { fetchKarmaReading, KarmaReadingError, MIN_SITUATION_CHARS, MAX_SITUATION_CHARS, type KarmaReading } from "@/lib/karmaReading";



const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
.iv-app{min-height:100vh;background:#FBF5EC;color:#301607;font-family:'DM Sans', system-ui, sans-serif;overflow-x:hidden;position:relative;}

/* ── STARFIELD ── */
.iv-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}

/* ── PAGE ── */
.iv-page{position:relative;z-index:1;}
.iv-container{width:100%;max-width:1440px;margin:0 auto;padding:0 48px;}
@media(max-width:768px){.iv-container{padding:0 20px;}}

/* ── HERO ── */
.iv-hero{padding:100px 48px 80px;text-align:center;}
@media(max-width:768px){.iv-hero{padding:80px 20px 60px;}}
.iv-hero-eyebrow{font-family:'DM Sans', system-ui, sans-serif;font-size:14px;letter-spacing:7px;color:#592209;text-transform:uppercase;margin-bottom:22px;}
.iv-hero-om{font-size:60px;display:block;margin-bottom:22px;filter:drop-shadow(0 0 28px rgba(89,34,9,.65));}
.iv-hero-title{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(48px,8vw,80px);font-weight:900;line-height:1.0;margin-bottom:18px;background:linear-gradient(135deg,#592209 0%,#592209 50%,#592209 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:2px;}
.iv-hero-tagline{font-family:'DM Sans', system-ui, sans-serif;font-size:14px;letter-spacing:6px;color:#301607;text-transform:uppercase;margin-bottom:26px;}
.iv-hero-sub{color:#301607;font-style:italic;font-size:21px;line-height:1.8;max-width:640px;margin:0 auto 44px;}
.iv-karma-strip{display:flex;justify-content:center;gap:56px;flex-wrap:wrap;}
.iv-ks-item{text-align:center;}
.iv-ks-val{font-family:'DM Sans', system-ui, sans-serif;font-size:36px;color:#592209;line-height:1;}
.iv-ks-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:3px;color:rgba(48,22,7,1);text-transform:uppercase;margin-top:7px;}

/* ── NAV GRID ── */
.iv-nav-section{padding:0 48px 80px;}
@media(max-width:768px){.iv-nav-section{padding:0 20px 60px;}}
.iv-nav-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;max-width:1440px;margin:0 auto;}
@media(max-width:1100px){.iv-nav-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:540px){.iv-nav-grid{grid-template-columns:1fr;}}
.iv-nav-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:22px;padding:34px 28px;text-decoration:none;transition:all .35s;position:relative;overflow:hidden;display:block;}
.iv-nav-card:hover{transform:translateY(-6px);box-shadow:0 24px 64px rgba(89,34,9,0.2);}
.iv-nav-card.gold:hover{border-color:rgba(89,34,9,.5);background:rgba(89,34,9,.05);}
.iv-nav-card.purple:hover{border-color:rgba(89,34,9,.45);background:rgba(89,34,9,.05);}
.iv-nav-card.cyan:hover{border-color:rgba(89,34,9,.4);background:rgba(89,34,9,.04);}
.iv-nav-card.rose:hover{border-color:rgba(89,34,9,.4);background:rgba(89,34,9,.04);}
.iv-nc-icon{font-size:40px;margin-bottom:18px;display:block;}
.iv-nc-tag{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px;}
.gold .iv-nc-tag{color:#301607;}
.purple .iv-nc-tag{color:rgba(48,22,7,1);}
.cyan .iv-nc-tag{color:rgba(48,22,7,1);}
.rose .iv-nc-tag{color:rgba(48,22,7,1);}
.iv-nc-name{font-family:'DM Sans', system-ui, sans-serif;font-size:23px;color:#301607;margin-bottom:12px;}
.iv-nc-desc{font-size:17px;color:rgba(48,22,7,1);line-height:1.68;font-style:italic;}
.iv-nc-arrow{position:absolute;top:28px;right:28px;color:rgba(48,22,7,0.75);font-size:22px;transition:transform .3s,color .3s;}
.iv-nav-card:hover .iv-nc-arrow{transform:translateX(5px);color:#592209;}

/* ── DIAGNOSIS SECTION ── */
.iv-diag-section{background:#FBF5EC;border-top:1px solid rgba(89,34,9,.12);border-bottom:1px solid rgba(89,34,9,.12);padding:80px 48px;}
@media(max-width:768px){.iv-diag-section{padding:60px 20px;}}
.iv-diag-inner{max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:start;}
@media(max-width:960px){.iv-diag-inner{grid-template-columns:1fr;gap:44px;}}

.iv-diag-heading{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(32px,4.5vw,50px);color:#592209;line-height:1.15;margin-bottom:18px;}
.iv-diag-sub{font-size:20px;color:rgba(48,22,7,0.93);font-style:italic;line-height:1.78;margin-bottom:36px;}
.iv-diag-hints{display:flex;flex-direction:column;gap:14px;}

/* CLICKABLE hint cards */
.iv-hint{display:flex;align-items:center;gap:16px;padding:18px 22px;background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:16px;cursor:pointer;transition:all .3s;}
.iv-hint:hover{background:rgba(89,34,9,.1);border-color:rgba(89,34,9,.45);transform:translateX(6px);}
.iv-hint-icon{font-size:24px;flex-shrink:0;}
.iv-hint-txt{font-size:18px;color:#301607;line-height:1.55;}
.iv-hint:hover .iv-hint-txt{color:#301607;}

/* Input card */
.iv-input-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:24px;padding:38px;}
.iv-voice-row{display:flex;gap:12px;margin-bottom:20px;align-items:center;}
.iv-voice-btn{background:rgba(89,34,9,.09);border:1px solid rgba(89,34,9,.28);border-radius:10px;padding:11px 20px;color:#592209;font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:2px;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;}
.iv-voice-btn:hover{background:rgba(89,34,9,0.08);}
.iv-voice-btn.listening{background:rgba(89,34,9,.14);border-color:rgba(89,34,9,.45);color:#592209;animation:pulse-anim 1s ease-in-out infinite;}
@keyframes pulse-anim{0%,100%{opacity:1;}50%{opacity:.4;}}
.iv-char{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;color:#301607;margin-left:auto;}
.iv-textarea{width:100%;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.1);border-radius:16px;padding:22px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:21px;line-height:1.75;resize:vertical;min-height:170px;outline:none;transition:border .3s;}
.iv-textarea:focus{border-color:#592209;box-shadow:0 0 0 3px rgba(89,34,9,.12);}
.iv-textarea::placeholder{color:#301607;font-style:italic;}
.iv-submit-btn{width:100%;background:#592209;color:#F5E9D6;border:none;border-radius:14px;padding:20px;font-family:'DM Sans', system-ui, sans-serif;font-size:15px;letter-spacing:4px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:20px;}
.iv-submit-btn:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 14px 44px rgba(89,34,9,.45);}
.iv-submit-btn:disabled{opacity:.55;cursor:not-allowed;}
.iv-loading{text-align:center;padding:52px 0;}
.iv-loader{width:58px;height:58px;border:2px solid rgba(89,34,9,.15);border-top-color:#592209;border-radius:50%;animation:iv-spin 1s linear infinite;margin:0 auto 20px;}
@keyframes iv-spin{to{transform:rotate(360deg);}}
.iv-loading-text{font-family:'DM Sans', system-ui, sans-serif;font-size:14px;letter-spacing:4px;color:#301607;text-transform:uppercase;}
.iv-err{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.25);border-radius:12px;padding:16px;color:#592209;font-family:'DM Sans', system-ui, sans-serif;font-size:14px;text-align:center;margin-top:18px;}

/* ── REPORT ── */
.iv-report-wrap{background:#FBF5EC;border-top:1px solid rgba(89,34,9,.14);}
.iv-report{max-width:1440px;margin:0 auto;padding:80px 48px 110px;}
@media(max-width:768px){.iv-report{padding:50px 20px 80px;}}
.iv-report-anim{animation:report-in .9s ease-out;}
@keyframes report-in{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}

/* Report header */
.iv-report-hdr{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:18px;margin-bottom:52px;padding-bottom:32px;border-bottom:1px solid rgba(89,34,9,.15);}
.iv-report-title{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(30px,4vw,44px);color:#592209;}
.iv-report-title span{display:block;font-size:16px;font-family:'DM Sans', system-ui, sans-serif;letter-spacing:3px;color:#301607;text-transform:uppercase;margin-top:8px;font-weight:400;}
.iv-report-badges{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.iv-badge{display:inline-flex;align-items:center;border-radius:50px;padding:7px 20px;font-family:'DM Sans', system-ui, sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
.iv-badge.karma-type{background:rgba(89,34,9,.13);border:1px solid rgba(89,34,9,.38);color:#592209;}
.iv-badge.sev-gentle{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.3);color:#592209;}
.iv-badge.sev-significant{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.32);color:#592209;}
.iv-badge.sev-deep{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.32);color:#592209;}
.iv-badge.sev-breakthrough{background:rgba(89,34,9,.12);border:1px solid rgba(89,34,9,.42);color:#592209;}

/* Grid layouts */
.iv-row{display:grid;gap:22px;margin-bottom:22px;}
.iv-row-2{grid-template-columns:1fr 1fr;}
.iv-row-3{grid-template-columns:1fr 1fr 1fr;}
@media(max-width:900px){.iv-row-2,.iv-row-3{grid-template-columns:1fr;}}

/* Cards */
.iv-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:22px;padding:32px 34px;}
.iv-card.gold-card{background:rgba(89,34,9,.04);border-color:rgba(89,34,9,.22);}
.iv-card.purple-card{background:rgba(89,34,9,.05);border-color:rgba(89,34,9,.22);}
.iv-card.cyan-card{background:rgba(89,34,9,.04);border-color:rgba(89,34,9,.2);}
.iv-card.dark-card{background:#FBF5EC;border-color:rgba(89,34,9,0.2);}
.iv-card-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:4px;color:#301607;text-transform:uppercase;margin-bottom:20px;display:block;}
.iv-card-title{font-family:'DM Sans', system-ui, sans-serif;font-size:24px;color:#592209;margin-bottom:10px;}
.iv-card-body{font-size:19px;line-height:1.8;color:rgba(48,22,7,1);}
.iv-card-body.italic{font-style:italic;}
.iv-card-body.gold{color:#592209;}

/* Karma Snapshot */
.iv-snap-scores{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;}
.iv-score-item{}
.iv-score-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:2px;color:rgba(48,22,7,1);text-transform:uppercase;margin-bottom:9px;}
.iv-score-track{background:rgba(89,34,9,0.2);border-radius:50px;height:9px;overflow:hidden;margin-bottom:5px;}
.iv-score-fill{height:100%;border-radius:50px;}
.iv-score-pct{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;color:#301607;text-align:right;}
.iv-debt-row{display:flex;align-items:center;justify-content:space-between;padding:15px 20px;background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:14px;}
.iv-debt-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:2px;color:#301607;text-transform:uppercase;}
.iv-debt-val{font-family:'DM Sans', system-ui, sans-serif;font-size:14px;font-weight:700;letter-spacing:2px;}
.debt-Low{color:#592209;}
.debt-Medium{color:#592209;}
.debt-High{color:#592209;}
.iv-cycle{display:inline-block;background:rgba(89,34,9,.13);border:1px solid rgba(89,34,9,.32);border-radius:50px;padding:7px 18px;font-family:'DM Sans', system-ui, sans-serif;font-size:12px;letter-spacing:2px;color:#592209;margin-top:16px;}

/* Timeline */
.iv-tl{display:flex;flex-direction:column;}
.iv-tl-item{display:flex;gap:20px;position:relative;}
.iv-tl-line{position:absolute;left:19px;top:44px;bottom:0;width:1px;background:linear-gradient(to bottom,rgba(89,34,9,0.08),transparent);}
.iv-tl-dot{width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(89,34,9,.45);background:rgba(89,34,9,.08);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;margin-top:3px;}
.iv-tl-body{flex:1;padding-bottom:30px;}
.iv-tl-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:3px;color:#301607;text-transform:uppercase;margin-bottom:9px;}
.iv-tl-txt{font-size:19px;line-height:1.78;color:#301607;}

/* Soul lessons */
.iv-lessons{display:flex;flex-direction:column;gap:15px;}
.iv-lesson{display:flex;gap:22px;align-items:flex-start;padding:22px 26px;background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:16px;transition:border .3s;}
.iv-lesson:hover{border-color:rgba(89,34,9,.3);}
.iv-lesson-num{font-family:'DM Sans', system-ui, sans-serif;font-size:32px;color:rgba(48,22,7,0.75);flex-shrink:0;line-height:1;min-width:44px;}
.iv-lesson-txt{font-size:19px;line-height:1.75;color:#301607;padding-top:5px;}

/* Remedies */
.iv-rem-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;}
.iv-rem-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:18px;padding:26px 22px;transition:all .3s;}
.iv-rem-card:hover{border-color:rgba(89,34,9,.35);transform:translateY(-4px);background:rgba(89,34,9,.04);}
.iv-rem-icon{font-size:32px;margin-bottom:14px;display:block;}
.iv-rem-type{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:2px;color:#301607;text-transform:uppercase;margin-bottom:8px;}
.iv-rem-txt{font-size:18px;line-height:1.68;color:#301607;}

/* Weekly plan */
.iv-week{display:flex;flex-direction:column;gap:13px;}
.iv-week-item{display:flex;align-items:flex-start;gap:16px;padding:17px 22px;background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:14px;}
.iv-week-check{width:24px;height:24px;border-radius:50%;border:1px solid rgba(89,34,9,.38);background:rgba(89,34,9,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#592209;font-size:12px;margin-top:3px;}
.iv-week-txt{font-size:19px;line-height:1.65;color:#301607;}

/* Planets */
.iv-planets{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:15px;}
.iv-planet-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:18px;padding:24px 20px;text-align:center;}
.iv-planet-name{font-family:'DM Sans', system-ui, sans-serif;font-size:20px;color:#301607;margin-bottom:10px;}
.iv-planet-inf{font-family:'DM Sans', system-ui, sans-serif;font-size:12px;letter-spacing:2px;border-radius:50px;padding:5px 16px;margin:0 auto 12px;display:inline-block;}
.inf-Strong{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.32);color:#592209;}
.inf-Moderate{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.3);color:#592209;}
.inf-Challenging{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.3);color:#592209;}
.iv-planet-note{font-size:16px;color:#301607;line-height:1.62;font-style:italic;}

/* Sacred quote */
.iv-quote{background:linear-gradient(135deg,rgba(89,34,9,.08),rgba(89,34,9,.07));border:1px solid rgba(89,34,9,.2);border-radius:24px;padding:56px 52px;text-align:center;position:relative;overflow:hidden;margin-bottom:22px;}
@media(max-width:768px){.iv-quote{padding:40px 28px;}}
.iv-quote-deco{position:absolute;font-family:serif;font-size:160px;color:rgba(48,22,7,0.75);line-height:1;user-select:none;}
.iv-quote-deco.l{left:12px;top:-10px;}
.iv-quote-deco.r{right:12px;bottom:-30px;}
.iv-quote-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;letter-spacing:5px;color:rgba(48,22,7,1);text-transform:uppercase;margin-bottom:24px;}
.iv-quote-txt{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(20px,3vw,32px);color:#592209;line-height:1.65;position:relative;z-index:1;}

/* Reset */
.iv-reset-btn{width:100%;background:transparent;border:1px solid rgba(89,34,9,.28);border-radius:14px;padding:18px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:14px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
.iv-reset-btn:hover{background:rgba(89,34,9,.08);color:#592209;border-color:rgba(89,34,9,.5);}
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechCtor = new () => any;
type SpeechWindow = { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };

const NAV_CARDS = [
  { icon:"🧘", name:FEATURES.guru.name, tag:"Pandit Intelligence", desc:FEATURES.guru.subtitle, path:"/inner-voice/chat", color:"gold" },
  { icon:"⚡", name:FEATURES.karmaScore.name, tag:"Daily Practice Tracker", desc:FEATURES.karmaScore.subtitle, path:"/inner-voice/dashboard", color:"purple" },
  { icon:"🧭", name:FEATURES.futurePath.name, tag:"Interpretive Astrology", desc:FEATURES.futurePath.subtitle, path:"/inner-voice/future-path", color:"rose" },
  { icon:"🕉", name:FEATURES.shloka.name, tag:"Vedic Wisdom", desc:FEATURES.shloka.subtitle, path:"/inner-voice/wisdom", color:"cyan" },
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
        grad.addColorStop(0, `rgba(89,34,9,0)`);
        grad.addColorStop(0.6, `rgba(89,34,9,${s.life * 0.5})`);
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

const NEXT_STEPS = [
  { icon:"🧘", name:`Ask ${FEATURES.guru.name}`, desc:"Talk through a specific question.", path:"/inner-voice/chat" },
  { icon:"⚡", name:`Track your ${FEATURES.karmaScore.name}`, desc:"Log daily actions and watch your progress.", path:"/inner-voice/dashboard" },
  { icon:"🕉", name:`Read a ${FEATURES.shloka.name}`, desc:"Find a verse to reflect on.", path:"/inner-voice/wisdom" },
];

function ReportView({ result, onReset }: { result: KarmaReading; onReset: () => void }) {
  const { isPathDisabled } = useFeatureFlags();
  return (
    <div className="iv-report iv-report-anim">
      <div className="iv-report-hdr">
        <div className="iv-report-title">
          Your Karma Reflection
          <span>{FEATURES.karma.name} · An AI-generated interpretation for reflection</span>
        </div>
        <div className="iv-report-badges">
          {result.lifeDomain && <span className="iv-badge" style={{background:"rgba(89,34,9,.08)",border:"1px solid rgba(89,34,9,.25)",color:"#592209"}}>{result.lifeDomain}</span>}
        </div>
      </div>

      <div className="iv-row iv-row-2">
        <div className="iv-card gold-card">
          <span className="iv-card-lbl">Your Reading</span>
          <div className="iv-card-body">{result.overview}</div>
        </div>
        <div className="iv-card cyan-card">
          <span className="iv-card-lbl">What It Means</span>
          <div className="iv-card-body italic">{result.meaning}</div>
        </div>
      </div>

      {result.insights.length > 0 && (
        <div className="iv-card" style={{marginBottom:22}}>
          <span className="iv-card-lbl">Key Insights</span>
          <div className="iv-lessons">
            {result.insights.map((it, i) => (
              <div key={i} className="iv-lesson">
                <div className="iv-lesson-num">0{i+1}</div>
                <div className="iv-lesson-txt"><strong style={{display:"block",color:"#D9895F",marginBottom:4}}>{it.title}</strong>{it.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.soulLesson && (
        <div className="iv-card purple-card" style={{marginBottom:22}}>
          <span className="iv-card-lbl">What You May Be Learning</span>
          <div className="iv-card-body">{result.soulLesson}</div>
        </div>
      )}

      <div className="iv-card dark-card" style={{marginBottom:22}}>
        <span className="iv-card-lbl">Practical Guidance</span>
        <div className="iv-week">
          {result.guidance.map((g, i) => (
            <div key={i} className="iv-week-item">
              <div className="iv-week-check">✓</div>
              <div className="iv-week-txt">{g}</div>
            </div>
          ))}
        </div>
        {result.practice && <div className="iv-card-body" style={{marginTop:22,fontSize:17}}><strong style={{color:"#D9895F"}}>Optional practice: </strong>{result.practice}</div>}
      </div>

      {result.reflectionQuestion && (
        <div className="iv-card" style={{marginBottom:22}}>
          <span className="iv-card-lbl">Question to Reflect On</span>
          <div className="iv-card-body italic gold">{result.reflectionQuestion}</div>
        </div>
      )}

      {result.affirmation && (
        <div className="iv-quote">
          <span className="iv-quote-deco l">"</span>
          <span className="iv-quote-deco r">"</span>
          <div className="iv-quote-lbl">Affirmation</div>
          <div className="iv-quote-txt">"{result.affirmation}"</div>
        </div>
      )}

      <div className="iv-card" style={{marginBottom:22}}>
        <span className="iv-card-lbl">Next Steps</span>
        <div className="iv-planets">
          {NEXT_STEPS.filter(n => !isPathDisabled(n.path, true)).map(n => (
            <Link key={n.path} to={n.path} className="iv-planet-card" style={{textDecoration:"none"}}>
              <div className="iv-planet-name">{n.icon} {n.name}</div>
              <div className="iv-planet-note">{n.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <p style={{fontSize:13,color:"rgba(255,255,255,.6)",textAlign:"center",marginBottom:22,lineHeight:1.6}}>
        This is a reflective, AI-generated interpretation, not a prediction, diagnosis or professional advice. For health, financial or emotional difficulty, please also speak to a qualified professional or someone you trust.
      </p>
      <button className="iv-reset-btn" onClick={onReset}>↩ New Reading</button>
    </div>
  );
}

export default function InnerVoice() {
  useFeatureTitle(FEATURES.karma);
  const { isPathDisabled } = useFeatureFlags();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KarmaReading | null>(null);
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
  const latestScore = karmaHistory[0]?.composite ?? null;

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

  const diagnose = async (): Promise<void> => {
    if (loading || text.trim().length < MIN_SITUATION_CHARS) return;
    if (!requireSignIn(() => { void diagnose(); })) return; // signed out: ask first, keep what was typed
    setLoading(true); setError(""); setResult(null);
    try {
      setResult(await fetchKarmaReading(text));
    } catch (e) {
      console.error("[Know Your Karma] request failed:", e);
      setError(e instanceof KarmaReadingError ? e.message : "Could not create your reading right now. Please try again in a moment.");
    } finally { setLoading(false); }
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
          {latestScore !== null && (
            <div className="iv-karma-strip">
              <div className="iv-ks-item"><div className="iv-ks-val">{latestScore}</div><div className="iv-ks-lbl">{FEATURES.karmaScore.name}</div></div>
              <div className="iv-ks-item"><div className="iv-ks-val">{karmaHistory.length}</div><div className="iv-ks-lbl">Days Saved</div></div>
            </div>
          )}
        </div>

        {/* Nav grid */}
        <div className="iv-nav-section">
          <div className="iv-nav-grid">
            {NAV_CARDS.filter(c => !isPathDisabled(c.path, true)).map(c => (
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
                <h2 className="iv-diag-heading">{FEATURES.karma.name}</h2>
                <p className="iv-diag-sub" style={{ maxWidth: 560, margin: "0 auto 16px", color: "rgba(48,22,7,0.78)", lineHeight: 1.6 }}>{FEATURES.karma.subtitle}</p>
                <p className="iv-diag-sub" style={{ maxWidth: 560, margin: "0 auto 16px", color: "rgba(48,22,7,0.78)", lineHeight: 1.6 }}>Share your situation in any language — Hindi, English, or Hinglish. You will receive a reflective reading with practical guidance.</p>
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
                    <span className="iv-char">{text.length} / {MAX_SITUATION_CHARS}</span>
                  </div>
                  <textarea
                    className="iv-textarea"
                    placeholder="Apni situation batayein... What is weighing on your heart right now? Be honest and specific."
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_SITUATION_CHARS))}
                  />
                  {loading ? (
                    <FullScreenLoader title="Preparing Your Karma Reflection" description="Reflecting on the situation you shared…" steps={["Reading your situation", "Finding the karmic pattern", "Preparing your reflection"]} testId="karma-loader" />
                  ) : (
                    <button className="iv-submit-btn" onClick={diagnose} disabled={text.trim().length < MIN_SITUATION_CHARS}>
                      ॐ &nbsp; Know My Karma
                    </button>
                  )}
                  {!loading && text.trim().length > 0 && text.trim().length < MIN_SITUATION_CHARS && <div className="iv-char" style={{marginTop:10}}>Please write a little more (at least {MIN_SITUATION_CHARS} characters).</div>}
                  {error && <div className="iv-err" role="alert">⚠ {error} <button onClick={diagnose} style={{marginLeft:8,textDecoration:"underline",background:"none",border:0,color:"inherit",cursor:"pointer"}}>Try again</button></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report */}
        {result && (
          <div className="iv-report-wrap">
            <div className="iv-container">
              <ReportView result={result} onReset={() => { setResult(null); setText(""); setError(""); }} />
              <AskDivyaSection feature="karma" context={`Area of life: ${result.lifeDomain}. Reading: ${result.overview} Soul lesson: ${result.soulLesson} Suggested practice: ${result.practice}`} />
            </div>
          </div>
        )}
        <FeatureFaq feature="karma" />
      </div>
    </div>
  );
}