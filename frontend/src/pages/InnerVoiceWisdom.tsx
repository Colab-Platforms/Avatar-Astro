import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import FeatureFaq from "@/components/FeatureFaq";
import FullScreenLoader from "@/components/Loader/FullScreenLoader";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { Link } from "react-router-dom";
import { BookOpen, Bookmark, Check, Compass, Copy, Leaf, Lightbulb, Link2, RotateCcw, Sparkles, type LucideIcon } from "lucide-react";
import LotusOm from "@/components/ai-guru/LotusOm";
import { useAuthStore } from "@/store/authStore";
import { requireSignIn } from "@/lib/authedFetch";
import { fetchWisdom as requestWisdom, ShlokaError, shareText, MAX_SITUATION_CHARS } from "@/lib/shlokaWisdom";



const CSS = `
*{box-sizing:border-box;}
.ivw-app{min-height:100vh;background:linear-gradient(180deg,#FBF5EC 0%,#FAF1E1 55%,#F4E2C0 100%);color:#301607;font-family:'DM Sans', system-ui, sans-serif;overflow-x:hidden;position:relative;}
.ivw-stars{position:fixed;inset:0;pointer-events:none;z-index:0;}
.ivw-star{position:absolute;border-radius:50%;background:rgba(89,34,9,0.25);animation:twk var(--d,3s) ease-in-out infinite var(--dl,0s);opacity:var(--op,.4);}
@keyframes twk{0%,100%{opacity:var(--op);transform:scale(1);}50%{opacity:.05;transform:scale(.2);}}
.ivw-nb{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;}
.ivw-wrap{position:relative;max-width:1180px;margin:0 auto;padding:78px 32px 100px;}
@media(max-width:600px){.ivw-wrap{padding:72px 16px 90px;}}
.ivw-formwrap{max-width:860px;margin:0 auto;}
.ivw-faq{max-width:760px;margin:36px auto 0;}
.ivw-deco{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.ivw-glow{position:absolute;border-radius:50%;filter:blur(64px);}
.ivw-ring{position:absolute;border-radius:50%;border:1px solid rgba(184,137,43,.2);}

/* Back */
.ivw-back{display:inline-flex;align-items:center;gap:6px;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:#592209;text-transform:uppercase;text-decoration:none;margin-bottom:32px;transition:color .3s;}
.ivw-back:hover{color:#592209;}

/* Header */
.ivw-hdr{text-align:center;margin-bottom:40px;}
.ivw-eyebrow{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:5px;color:#592209;text-transform:uppercase;margin-bottom:14px;}
.ivw-h1{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(24px,6vw,56px);color:#592209;line-height:1.1;margin-bottom:14px;text-shadow:0 0 60px rgba(89,34,9,.4);}
.ivw-hsub{color:rgba(48,22,7,0.8);font-style:italic;font-size:16px;line-height:1.7;}

/* Scripture pills */
.ivw-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:28px;}
.ivw-pill{background:#FFFBF3;border:1px solid rgba(184,137,43,.45);border-radius:50px;padding:8px 20px;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:rgba(48,22,7,0.75);text-transform:uppercase;cursor:pointer;transition:all .3s;}
.ivw-pill:hover{border-color:#B8892B;background:#FFF3D6;}
.ivw-pill.on{background:linear-gradient(90deg,#592209,#7A3515);border-color:#592209;color:#FBF1DC;}

/* Form card */
.ivw-form{background:linear-gradient(165deg,#FFFBF3 0%,#F8EBD6 100%);border:1px solid rgba(184,137,43,.45);border-radius:28px;padding:32px;box-shadow:0 24px 54px -32px rgba(89,34,9,.5),inset 0 0 0 6px rgba(255,251,243,.9),inset 0 0 0 7px rgba(229,138,69,.2);}
.ivw-flabel{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;color:#592209;text-transform:uppercase;display:block;margin-bottom:12px;}
.ivw-ta{width:100%;background:#fff;border:1px solid rgba(89,34,9,.2);border-radius:14px;padding:18px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:16px;line-height:1.7;resize:vertical;min-height:130px;outline:none;transition:border .3s;margin-bottom:20px;}
.ivw-ta:focus{border-color:#B8892B;box-shadow:0 0 0 3px rgba(184,137,43,.25);}
.ivw-ta::placeholder{color:rgba(48,22,7,.6);font-size:14px;}

/* Quick prompts */
.ivw-qps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;}
.ivw-qp{background:#FFFBF3;border:1px solid rgba(184,137,43,.5);border-radius:50px;padding:8px 16px;font-family:'DM Sans', system-ui, sans-serif;font-style:italic;font-size:15px;color:#4A2E1F;cursor:pointer;transition:all .3s;}
.ivw-qp:hover{background:#FFF3D6;color:#301607;border-color:#B8892B;transform:translateY(-1px);}

.ivw-btn{width:100%;background:linear-gradient(90deg,#592209,#7A3515);box-shadow:0 12px 26px -14px rgba(89,34,9,.7);font-size:11px;color:#F5E9D6;border:none;border-radius:14px;padding:18px;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;}
.ivw-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 40px rgba(89,34,9,.4);}
.ivw-btn:disabled{opacity:.55;cursor:not-allowed;}
.ivw-err{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.25);border-radius:12px;padding:16px;color:#592209;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;text-align:center;margin-top:16px;}

/* Loading */
.ivw-loader-wrap{text-align:center;padding:50px 0;}
.ivw-spin{width:56px;height:56px;border:2px solid rgba(89,34,9,.15);border-top-color:#592209;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 18px;}
@keyframes spin{to{transform:rotate(360deg);}}
.ivw-ltxt{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:3px;color:#592209;text-transform:uppercase;}

/* Result */
.ivw-result{animation:fadein .8s ease-out;}
@keyframes fadein{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}

/* Source header */
.ivw-src-row{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;margin-bottom:28px;text-align:center;}
.ivw-src-badge{display:inline-block;background:rgba(89,34,9,.14);border:1px solid rgba(89,34,9,.4);border-radius:50px;padding:8px 24px;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:3px;color:#592209;text-transform:uppercase;}
.ivw-src-chapter{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;color:#301607;letter-spacing:2px;}

/* Shloka display */
.ivw-shloka{background:linear-gradient(165deg,#FFFBF3 0%,#F8EBD6 100%);border:1px solid rgba(229,138,69,.55);border-radius:26px;padding:44px 36px 36px;text-align:center;margin-bottom:22px;position:relative;box-shadow:0 18px 50px -24px rgba(89,34,9,.35),inset 0 0 0 6px rgba(255,251,243,.9),inset 0 0 0 7px rgba(229,138,69,.25);}
.ivw-shloka-om{display:flex;justify-content:center;margin:-8px 0 18px;opacity:.95;}
.ivw-shloka-deco{position:absolute;font-family:'DM Sans', system-ui, sans-serif;font-size:22px;color:#E58A45;}
.ivw-shloka-deco.tl{top:20px;left:28px;}
.ivw-shloka-deco.br{bottom:20px;right:28px;}
.ivw-dev{font-size:clamp(20px,3.6vw,30px);line-height:2;color:#592209;margin-bottom:18px;font-weight:500;letter-spacing:.6px;}
.ivw-roman{font-style:italic;font-size:clamp(14px,1.9vw,18px);line-height:1.9;color:#6B4A37;margin:0 auto;max-width:640px;}
.ivw-wbw-divider{display:flex;align-items:center;gap:12px;margin:22px auto 14px;max-width:260px;color:#E58A45;}
.ivw-wbw-divider::before,.ivw-wbw-divider::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(229,138,69,.7),transparent);}
.ivw-wbw-lbl{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#6B4A37;margin-bottom:8px;}
.ivw-wbw{font-family:'DM Sans', system-ui, sans-serif;font-size:13px;color:#4A2E1F;line-height:1.9;max-width:660px;margin:0 auto;}

/* Info sections: small boxes side by side */
.ivw-sections{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px;margin-bottom:22px;}
.ivw-sections>.ivw-sec{grid-column:span 2;}
/* a short last row stretches to fill the width instead of leaving a gap */
.ivw-sections>.ivw-sec:last-child:nth-child(3n+1){grid-column:span 6;}
.ivw-sections>.ivw-sec:nth-last-child(2):nth-child(3n+1),.ivw-sections>.ivw-sec:last-child:nth-child(3n+2){grid-column:span 3;}
@media (max-width:900px){
  .ivw-sections{grid-template-columns:repeat(2,minmax(0,1fr));}
  .ivw-sections>.ivw-sec,.ivw-sections>.ivw-sec:nth-last-child(2):nth-child(3n+1),.ivw-sections>.ivw-sec:last-child:nth-child(3n+2){grid-column:auto;}
  .ivw-sections>.ivw-sec:last-child:nth-child(odd){grid-column:1/-1;}
}
.ivw-shloka{max-width:1000px;margin-left:auto;margin-right:auto;}
.ivw-mantra{max-width:780px;margin-left:auto;margin-right:auto;}
.ivw-btns{justify-content:center;}
@media (max-width:640px){.ivw-sections{grid-template-columns:1fr;}.ivw-sections>.ivw-sec:last-child:nth-child(odd){grid-column:auto;}}


.ivw-sec{--tint:#F5E9D6;--accent:#592209;position:relative;border-radius:20px;padding:22px 22px 24px;background:var(--tint);border:1px solid rgba(229,138,69,.38);box-shadow:0 8px 24px -18px rgba(89,34,9,.45);transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;}
.ivw-sec::before{content:"";position:absolute;left:22px;right:22px;top:0;height:3px;border-radius:0 0 4px 4px;background:var(--accent);opacity:.55;}
.ivw-sec:hover{transform:translateY(-3px);border-color:rgba(229,138,69,.8);box-shadow:0 16px 32px -18px rgba(89,34,9,.5);}
.ivw-sec.meaning{--tint:#F8EBD2;--accent:#B9722F;}
.ivw-sec.application{--tint:#E8F0E1;--accent:#4F7A45;}
.ivw-sec.wisdom{--tint:#ECE6F5;--accent:#6B58A6;}
.ivw-sec.action{--tint:#F7E4DC;--accent:#B5502F;}
.ivw-sec.reflect{--tint:#F9E7E9;--accent:#A8455A;}
.ivw-sec.related{--tint:#EFE9E2;--accent:#6B4A37;}

.ivw-sec-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.ivw-sec-icon{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:none;border-radius:50%;background:rgba(255,251,243,.85);color:var(--accent);box-shadow:inset 0 0 0 1px rgba(89,34,9,.12);}
.ivw-sec-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;line-height:1.35;color:var(--accent);}

.ivw-sec-text{font-size:clamp(14px,1.5vw,16px);line-height:1.75;color:#301607;}
.ivw-sec-text.gold{color:#4A2E1F;}
.ivw-sec-text.italic{font-style:italic;}
.ivw-sec-text.small{font-size:14px;font-style:italic;color:#4A2E1F;}

/* Mantra box */
.ivw-mantra{background:linear-gradient(135deg,#592209 0%,#7A3513 100%);border-radius:22px;padding:28px 26px;text-align:center;margin-bottom:22px;color:#F5E9D6;box-shadow:0 18px 40px -22px rgba(89,34,9,.7);position:relative;overflow:hidden;}
.ivw-mantra::after{content:"";position:absolute;inset:8px;border:1px solid rgba(229,138,69,.45);border-radius:16px;pointer-events:none;}
.ivw-mantra-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:3px;color:#F2B77F;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;}
.ivw-mantra-txt{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(16px,2.6vw,24px);color:#FBF5EC;letter-spacing:2px;line-height:1.7;margin-bottom:8px;}
.ivw-mantra-count{font-family:'DM Sans', system-ui, sans-serif;font-size:12px;color:#F2B77F;}

/* Buttons */
.ivw-btns{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;}
.ivw-save,.ivw-again{flex:1 1 150px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:14px;padding:15px 16px;font-family:'DM Sans', system-ui, sans-serif;font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;cursor:pointer;transition:transform .2s,background .2s,box-shadow .2s;}
.ivw-save{background:#592209;border:1px solid #592209;color:#F5E9D6;}
.ivw-save:hover{transform:translateY(-2px);box-shadow:0 12px 26px -14px rgba(89,34,9,.7);}
.ivw-again{background:#FFFBF3;border:1px solid rgba(89,34,9,.3);color:#592209;}
.ivw-again:hover{transform:translateY(-2px);background:#F5E9D6;}

/* Saved */
.ivw-saved-hdr{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:3px;color:#301607;text-transform:uppercase;margin:32px 0 14px;}
.ivw-saved-card{background:#FFFBF3;border:1px solid rgba(184,137,43,.4);box-shadow:0 8px 22px -18px rgba(89,34,9,.5);border-radius:16px;padding:16px 20px;margin-bottom:10px;cursor:pointer;transition:border .3s;}
.ivw-saved-card:hover{border-color:rgba(89,34,9,.25);}
.ivw-saved-src{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:#592209;margin-bottom:5px;}
.ivw-saved-prev{font-size:15px;color:#301607;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`;

// The English text is the value the app already used; the shown text comes from the dictionary (keys in the second column).
const SCRIPTURES = ["Bhagavad Gita","Upanishads"];
const SCRIPTURE_KEYS: Record<string, string> = { "Bhagavad Gita": "gita", "Upanishads": "upanishads" };
const QUICK_PROMPTS = [
  "I keep failing despite working hard",
  "My relationship is breaking apart",
  "I can't control my anger",
  "I feel lost and have no purpose",
  "I fear death and the unknown",
  "I'm jealous of others' success",
  "How do I find inner peace?",
  "I feel God has abandoned me",
];

function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W=window.innerWidth, H=window.innerHeight; canvas.width=W; canvas.height=H;
    const stars = Array.from({length:180},()=>({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.4+0.2, opacity:Math.random()*0.5+0.1, speed:Math.random()*0.001+0.0005, phase:Math.random()*Math.PI*2 }));
    const shoots=[]; const spawnShoot=()=>shoots.push({ x:Math.random()*W*0.8, y:Math.random()*H*0.4, len:Math.random()*160+80, speed:Math.random()*3+2, angle:Math.PI/5+Math.random()*0.3, life:1 });
    let t=0,shootTimer=0,raf;
    const frame=()=>{ ctx.clearRect(0,0,W,H); t+=0.016; shootTimer+=0.016;
      if(shootTimer>3.5+Math.random()*3){spawnShoot();shootTimer=0;}
      stars.forEach(s=>{ const op=s.opacity*(0.6+0.4*Math.sin(t*s.speed*60+s.phase)); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${op})`; ctx.fill(); });
      for(let i=shoots.length-1;i>=0;i--){ const s=shoots[i]; s.x+=Math.cos(s.angle)*s.speed; s.y+=Math.sin(s.angle)*s.speed; s.life-=0.008; if(s.life<=0){shoots.splice(i,1);continue;} const tx=s.x-Math.cos(s.angle)*s.len,ty=s.y-Math.sin(s.angle)*s.len; const g=ctx.createLinearGradient(tx,ty,s.x,s.y); g.addColorStop(0,`rgba(89,34,9,0)`); g.addColorStop(0.6,`rgba(89,34,9,${s.life*0.5})`); g.addColorStop(1,`rgba(255,255,255,${s.life*0.9})`); ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(s.x,s.y); ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x,s.y,2.5,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${s.life*0.8})`; ctx.fill(); }
      raf=requestAnimationFrame(frame); };
    raf=requestAnimationFrame(frame);
    const resize=()=>{W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;};
    window.addEventListener("resize",resize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}} />;
}

interface FieldProps {
  icon: LucideIcon;
  label: string;
  text?: string;
  textClass?: string;
}

/** One small themed box: an icon chip and label, then the text. Renders nothing without text. */
function Field({ icon: Icon, label, text, textClass }: FieldProps) {
  if (!text) return null;
  return (
    <>
      <div className="ivw-sec-head">
        <span className="ivw-sec-icon"><Icon size={17} aria-hidden="true" /></span>
        <span className="ivw-sec-lbl">{label}</span>
      </div>
      <div className={`ivw-sec-text ${textClass || ""}`}>{text}</div>
    </>
  );
}

export default function InnerVoiceWisdom() {
  useFeatureTitle(FEATURES.shloka);
  const { t } = useTranslation();
  const featName = t("features.sacred-shloka.name", { defaultValue: FEATURES.shloka.name });
  const scriptureName = (s: string): string => t(`innerVoice.wisdom.scripture.${SCRIPTURE_KEYS[s] ?? "unknown"}`, { defaultValue: s });
  const quickPrompt = (i: number): string => t(`innerVoice.wisdom.quick.${i}`, { defaultValue: QUICK_PROMPTS[i] });
  const [situation, setSituation] = useState("");
  const [scripture, setScripture] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savedShlokas, setSavedShlokas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("iv_shlokas") || "[]"); } catch { return []; }
  });
  const [viewingSaved, setViewingSaved] = useState(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  const fetchWisdom = async (sit?: string): Promise<void> => {
    const q = (sit || situation).trim();
    if (!q) return;
    if (sit) setSituation(sit);
    if (!requireSignIn(() => { void fetchWisdom(sit); })) return; // signed out: ask first, keep what was typed
    setLoading(true); setError(""); setResult(null); setViewingSaved(null);
    try {
      setResult(await requestWisdom(q, scripture));
    } catch(e) {
      console.error("[Sacred Shloka] request failed:", e);
      setError(e instanceof ShlokaError ? e.message : t("innerVoice.wisdom.errors.failed"));
    } finally {
      setLoading(false);
    }
  };

  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const saveShloka = () => {
    if (!result) return;
    if (!requireSignIn()) return;
    const entry = { id: Date.now(), source: result.source, chapter: result.chapter, situation: situation.slice(0,80), result };
    const updated = [entry, ...savedShlokas].slice(0, 20);
    setSavedShlokas(updated);
    localStorage.setItem("iv_shlokas", JSON.stringify(updated));
  };

  const [copied, setCopied] = useState(false);
  const display = viewingSaved?.result || result;
  const copyShloka = async () => {
    if (!display) return;
    try { await navigator.clipboard.writeText(shareText(display)); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError(t("innerVoice.wisdom.errors.copy")); }
  };

  return (
    <div className="ivw-app">
      <style>{CSS}</style>
      <StarCanvas />
      {/* Soft light and rings in the corners; purely decorative. */}
      <div className="ivw-deco" aria-hidden="true">
        <div className="ivw-glow" style={{ left: -160, top: -120, width: 440, height: 440, background: "rgba(233,196,106,.32)" }} />
        <div className="ivw-glow" style={{ right: -160, top: 40, width: 420, height: 420, background: "rgba(217,137,95,.22)" }} />
        <div className="ivw-glow" style={{ left: -140, bottom: -160, width: 460, height: 460, background: "rgba(217,137,95,.2)" }} />
        <div className="ivw-glow" style={{ right: -140, bottom: -140, width: 460, height: 460, background: "rgba(233,196,106,.32)" }} />
        {[0, 1, 2].map((i) => (<div key={"l" + i} className="ivw-ring" style={{ left: -110 - i * 45, top: 260 - i * 45, width: 220 + i * 90, height: 220 + i * 90 }} />))}
        {[0, 1, 2].map((i) => (<div key={"r" + i} className="ivw-ring" style={{ right: -110 - i * 45, bottom: 220 - i * 45, width: 220 + i * 90, height: 220 + i * 90 }} />))}
      </div>
      <div className="ivw-wrap">

        <div className="ivw-hdr">
          {/* The logo's own peach background and edge marks are faded out with a soft mask so only the lotus shows. */}
          <img
            src="/images/tools/divya-shloka-logo.png"
            alt=""
            aria-hidden="true"
            width={285}
            height={197}
            className="mx-auto mb-3 h-24 w-auto select-none mix-blend-multiply sm:h-28"
            style={{ WebkitMaskImage: "radial-gradient(ellipse 62% 60% at 50% 52%, #000 62%, transparent 100%)", maskImage: "radial-gradient(ellipse 62% 60% at 50% 52%, #000 62%, transparent 100%)" }}
            draggable={false}
          />
          <div className="ivw-eyebrow">{t("innerVoice.wisdom.eyebrow")}</div>
          <h1 className="ivw-h1">{featName}</h1>
          {/* A quote in place of the plain subtitle. The catalog subtitle itself (used elsewhere) is not changed. */}
          <blockquote data-testid="ivw-quote" className="relative mx-auto mt-5 max-w-xl px-6 sm:px-10">
            <span aria-hidden="true" className="absolute -top-3 left-0 select-none font-serif text-6xl leading-none text-[#B8892B]/45">“</span>
            <p className="font-serif text-xl italic leading-relaxed text-[#592209] sm:text-2xl">
              {t("innerVoice.wisdom.quote")}
            </p>
            <span aria-hidden="true" className="absolute -bottom-7 right-0 select-none font-serif text-6xl leading-none text-[#B8892B]/45">”</span>
            <footer className="mt-4 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-[#8A6414]">
              <span aria-hidden="true" className="h-px w-8 bg-[#B8892B]/50" />
              {t("innerVoice.wisdom.quoteFooter")}
              <span aria-hidden="true" className="h-px w-8 bg-[#B8892B]/50" />
            </footer>
          </blockquote>
        </div>

        {!display ? (
          <div className="ivw-formwrap">
            {/* Scripture filter */}
            <div className="ivw-pills">
              <div className={`ivw-pill${scripture===""?" on":""}`} onClick={()=>setScripture("")}>{t("innerVoice.wisdom.anyScripture")}</div>
              {SCRIPTURES.map(s=>(
                <div key={s} className={`ivw-pill${scripture===s?" on":""}`} onClick={()=>setScripture(s)}>{scriptureName(s)}</div>
              ))}
            </div>

            <div className="ivw-form">
              <label className="ivw-flabel">{t("innerVoice.wisdom.question")}</label>
              <textarea
                className="ivw-ta"
                placeholder={t("innerVoice.wisdom.placeholder")}
                value={situation}
                maxLength={MAX_SITUATION_CHARS}
                onChange={e=>setSituation(e.target.value.slice(0, MAX_SITUATION_CHARS))}
              />

              <label className="ivw-flabel">{t("innerVoice.wisdom.quickLabel")}</label>
              <div className="ivw-qps">
                {QUICK_PROMPTS.map((p,i)=>(
                  <button key={p} className="ivw-qp" onClick={()=>fetchWisdom(quickPrompt(i))}>{quickPrompt(i)}</button>
                ))}
              </div>

              {loading ? (
                <FullScreenLoader title={t("innerVoice.wisdom.loader.title")} description={t("innerVoice.wisdom.loader.description")} steps={[t("innerVoice.wisdom.loader.step1"), t("innerVoice.wisdom.loader.step2"), t("innerVoice.wisdom.loader.step3")]} testId="shloka-loader" />
              ) : (
                <button className="ivw-btn" onClick={()=>fetchWisdom()} disabled={situation.trim().length < 8}>
                  🕉 &nbsp; {t("innerVoice.wisdom.receive")}
                </button>
              )}
              {error && <div className="ivw-err">⚠ {error}</div>}
            </div>

            {/* Saved shlokas */}
            {signedIn && savedShlokas.length > 0 && (
              <>
                <div className="ivw-saved-hdr">📿 {t("innerVoice.wisdom.savedTitle", { count: savedShlokas.length })}</div>
                {savedShlokas.map(s=>(
                  <div key={s.id} className="ivw-saved-card" onClick={()=>setViewingSaved(s)}>
                    <div className="ivw-saved-src">{s.source} · {s.chapter}</div>
                    <div className="ivw-saved-prev">{s.situation}...</div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="ivw-result">

            {/* Source header */}
            <div className="ivw-src-row">
              <span className="ivw-src-badge">{display.source || t("innerVoice.wisdom.defaultSource")}</span>
              {display.chapter && <span className="ivw-src-chapter">{display.chapter}</span>}
            </div>

            {display.context && <p style={{textAlign:"center",fontSize:15,color:"#4A2E1F",margin:"0 auto 18px",maxWidth:620,lineHeight:1.7}}>{display.context}</p>}

            {/* The Shloka */}
            <div className="ivw-shloka">
              <span className="ivw-shloka-deco tl">॥</span>
              <span className="ivw-shloka-deco br">॥</span>
              <div className="ivw-shloka-om"><LotusOm size={46} /></div>
              {display.devanagari && <div className="ivw-dev">{display.devanagari}</div>}
              {display.transliteration && <div className="ivw-roman">{display.transliteration}</div>}
              {display.wordByWord && (
                <>
                  <div className="ivw-wbw-divider"><Sparkles size={14} aria-hidden="true" /></div>
                  <div className="ivw-wbw-lbl">{t("innerVoice.wisdom.wordByWord")}</div>
                  <div className="ivw-wbw">{display.wordByWord}</div>
                </>
              )}
            </div>

            {/* Content sections: small boxes side by side */}
            <div className="ivw-sections">
              {display.meaning && <div className="ivw-sec meaning"><Field icon={BookOpen} label={t("innerVoice.wisdom.sections.meaning")} text={display.meaning} textClass="gold" /></div>}
              {display.application && <div className="ivw-sec application"><Field icon={Compass} label={t("innerVoice.wisdom.sections.application")} text={display.application} /></div>}
              {display.deeperWisdom && <div className="ivw-sec wisdom"><Field icon={Sparkles} label={t("innerVoice.wisdom.sections.deeper")} text={display.deeperWisdom} textClass="italic" /></div>}
              {display.action && <div className="ivw-sec action"><Field icon={Leaf} label={t("innerVoice.wisdom.sections.action")} text={display.action} /></div>}
              {display.reflectionQuestion && <div className="ivw-sec reflect"><Field icon={Lightbulb} label={t("innerVoice.wisdom.sections.reflect")} text={display.reflectionQuestion} textClass="italic" /></div>}
              {display.relatedVerse && <div className="ivw-sec related"><Field icon={Link2} label={t("innerVoice.wisdom.sections.related")} text={display.relatedVerse} textClass="small" /></div>}
            </div>

            {/* Mantra */}
            {display.mantra && (
              <div className="ivw-mantra">
                <span className="ivw-mantra-lbl"><LotusOm size={20} /> {t("innerVoice.wisdom.mantra")}</span>
                <div className="ivw-mantra-txt">"{display.mantra}"</div>
                {display.mantraCount && <div className="ivw-mantra-count">{display.mantraCount}</div>}
              </div>
            )}

            <p style={{textAlign:"center",fontSize:13,fontStyle:"italic",color:"#6B4A37",margin:"4px 0 16px"}}>
              {display.verified
                ? t("innerVoice.wisdom.verified")
                : t("innerVoice.wisdom.unverified")}
            </p>

            <div className="ivw-btns">
              <button className="ivw-save" onClick={saveShloka}><Bookmark size={15} aria-hidden="true" /> {t("innerVoice.wisdom.save")}</button>
              <button className="ivw-again" onClick={copyShloka}>{copied ? <><Check size={15} aria-hidden="true" /> {t("innerVoice.wisdom.copied")}</> : <><Copy size={15} aria-hidden="true" /> {t("innerVoice.wisdom.copy")}</>}</button>
              <button className="ivw-again" onClick={()=>{ setResult(null); setViewingSaved(null); setSituation(""); }}>
                <RotateCcw size={15} aria-hidden="true" /> {t("innerVoice.wisdom.again")}
              </button>
            </div>

          </div>
        )}
        <div className="ivw-faq"><FeatureFaq feature="shloka" /></div>
      </div>
    </div>
  );
}