import React, { useEffect, useRef, useState } from "react";
import { MAJOR_ARCANA } from "@/data/tarotData";
import TarotArt from "./TarotArt";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TarotMode {
  id: string;
  name: string;
  cardCount: number;
  intro: string;
  steps: { title: string; question: string }[];
  purpose: string;
  /** Major Arcana ids shown as the preview fan (real deck artwork). */
  preview: number[];
}

interface TarotLandingSceneProps {
  onModeSelect: (mode: string) => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// NOTE: step titles mirror TIMELINE_POSITIONS / KARMA_POSITIONS in TarotReadingResult.tsx so the
// selection page stays consistent with the reading flow.
const TAROT_MODES: TarotMode[] = [
  {
    id: "life-timeline",
    name: "Life Timeline Tarot",
    cardCount: 5,
    intro: "Understand your life's journey through five Tarot cards. Each card represents a different part of your journey:",
    steps: [
      { title: "Past Energy", question: "What experiences or patterns from your past are influencing you?" },
      { title: "Current Energy", question: "What is happening in your life right now?" },
      { title: "Hidden Influence", question: "What might be affecting your situation without you noticing?" },
      { title: "Next 6 Months", question: "What themes or challenges should you prepare for?" },
      { title: "Future Potential", question: "What opportunities or possibilities can you reflect on?" },
    ],
    purpose: "Helps you understand your current situation, reflect on past experiences and explore possible future directions.",
    preview: [0, 18, 19],
  },
  {
    id: "karma-mirror",
    name: "Karma Mirror",
    cardCount: 3,
    intro: "Explore repeated patterns in your life and understand what may be holding you back. Three Tarot cards help you reflect on:",
    steps: [
      { title: "Current Karma", question: "What recurring behaviour or life pattern are you experiencing?" },
      { title: "Hidden Blockage", question: "What fears, habits or beliefs might be stopping your progress?" },
      { title: "Healing Path", question: "What changes or positive actions can help you move forward?" },
    ],
    purpose: "Focuses on self-reflection, understanding repeated patterns and personal growth. It is not a future timeline prediction.",
    preview: [2, 11, 14],
  },
];

const COMPARISON: [string, string][] = [
  ["Five cards", "Three cards"],
  ["Past, present and future themes", "Current patterns and personal growth"],
  ["Understand your life journey", "Understand repeated challenges"],
  ["Explores the next six months", "Focuses on healing and self-awareness"],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated star field canvas — soft & sparse */
const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Star {
      x: number;
      y: number;
      r: number;
      alpha: number;
      speed: number;
      phase: number;
    }

    const stars: Star[] = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 0.7 + 0.15,
      alpha: Math.random() * 0.4 + 0.08,
      speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      stars.forEach((s) => {
        const twinkle = Math.sin(s.phase + frame * s.speed) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 235, 250, ${s.alpha * twinkle})`;
        ctx.fill();
      });
      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
};

/** Three overlapping cards drawn with the deck's own artwork */
const CardFan: React.FC<{ ids: number[] }> = ({ ids }) => (
  <div className="tls-fan" aria-hidden>
    {ids.map((id, i) => {
      const card = MAJOR_ARCANA[id];
      return (
        <div key={id} className={`tls-fan-card tls-fan-card--${i}`}>
          <TarotArt card={card} />
          <span className="tls-fan-name">{card.name}</span>
        </div>
      );
    })}
  </div>
);

const ModeCard: React.FC<{ mode: TarotMode; onSelect: (id: string) => void; animDelay: number; variant: "a" | "b" }> = ({ mode, onSelect, animDelay, variant }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <article
      className={`tls-card tls-card--${variant} tarot-anim-slide-up`}
      style={{ animationDelay: `${animDelay}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`tarot-mode-${mode.id}`}
    >
      <div className="tls-card-top">
        <CardFan ids={mode.preview} />
        <div className="tls-card-head">
          <span className="tls-badge">{mode.cardCount} cards</span>
          <h2>{mode.name}<sup>™</sup></h2>
        </div>
      </div>
      <p className="tls-intro">{mode.intro}</p>
      <ol className="tls-steps">
        {mode.steps.map((s, i) => (
          <li key={s.title}>
            <span className="tls-step-n">{i + 1}</span>
            <span><strong>{s.title}</strong><em> – {s.question}</em></span>
          </li>
        ))}
      </ol>
      <p className="tls-purpose"><strong>Purpose: </strong>{mode.purpose}</p>
      <button type="button" className="tls-cta" onClick={() => onSelect(mode.id)} aria-label={`Begin reading: ${mode.name}`}>
        <span>Begin Reading</span>
        <span className="arrow" style={{ transform: hovered ? "translateX(4px)" : "translateX(0)" }}>→</span>
      </button>
    </article>
  );
};

const Comparison: React.FC = () => (
  <section className="tls-compare tarot-anim-fade" style={{ animationDelay: "0.55s" }} aria-labelledby="tls-compare-h">
    <h2 id="tls-compare-h">Which reading is right for you?</h2>
    <div className="tls-table-wrap">
      <table>
        <thead>
          <tr><th scope="col">Life Timeline Tarot™</th><th scope="col">Karma Mirror™</th></tr>
        </thead>
        <tbody>
          {COMPARISON.map(([a, b]) => (
            <tr key={a}><td>{a}</td><td>{b}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
    <ul className="tls-reco">
      <li><strong>Choose Life Timeline Tarot</strong> if you want to explore your past, present and possible future.</li>
      <li><strong>Choose Karma Mirror</strong> if you want to understand repeated patterns and what you can change.</li>
    </ul>
  </section>
);

const LANDING_CSS = `
.tls-root{align-items:flex-start!important;overflow-x:clip}
.tls-inner{position:relative;z-index:1;width:100%;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;align-items:center}
.tls-sub{margin:0 0 clamp(24px,4vw,40px);max-width:560px;text-align:center;font-size:16px;line-height:1.65;color:#4A3022}
.tls-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,3vw,28px);width:100%;align-items:stretch}
.tls-card{display:flex;flex-direction:column;gap:14px;padding:clamp(20px,3vw,30px);border-radius:20px;background:#FBF5EC;border:1px solid rgba(89,34,9,.28);box-shadow:0 6px 22px rgba(48,22,7,.1);transition:transform .25s,box-shadow .25s}
.tls-card:hover{transform:translateY(-4px);box-shadow:0 14px 34px rgba(89,34,9,.2)}
.tls-card--a{border-top:5px solid #C9873A}
.tls-card--b{border-top:5px solid #592209;background:#F5E9D6}
.tls-card-top{display:flex;gap:18px;align-items:center}
.tls-fan{position:relative;flex:0 0 118px;height:124px}
.tls-fan-card{position:absolute;bottom:0;width:62px;aspect-ratio:2/3;border-radius:7px;overflow:hidden;border:1.5px solid #C9873A;background:#2A0F04;box-shadow:0 4px 12px rgba(48,22,7,.35);transition:transform .3s}
.tls-fan-card--0{left:0;transform:rotate(-9deg);transform-origin:bottom center}
.tls-fan-card--1{left:28px;z-index:1;bottom:4px}
.tls-fan-card--2{left:56px;transform:rotate(9deg);transform-origin:bottom center}
.tls-card:hover .tls-fan-card--0{transform:rotate(-14deg) translateX(-4px)}
.tls-card:hover .tls-fan-card--2{transform:rotate(14deg) translateX(4px)}
.tls-fan-name{position:absolute;left:0;right:0;bottom:0;padding:10px 2px 3px;text-align:center;font-size:7px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#F5E9D6;background:linear-gradient(to top,rgba(18,6,2,.95) 40%,transparent)}
.tls-badge{display:inline-block;margin-bottom:6px;padding:3px 12px;border-radius:999px;background:#592209;color:#F5E9D6;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.tls-card h2{margin:0;font-size:clamp(24px,3vw,30px);font-weight:700;line-height:1.15;color:#301607}
.tls-card h2 sup{font-size:.45em;margin-left:2px}
.tls-intro{margin:0;font-size:16px;line-height:1.65;color:#4A3022}
.tls-steps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:9px}
.tls-steps li{display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.5;color:#301607}
.tls-steps strong{color:#592209}
.tls-steps em{font-style:normal;color:#4A3022}
.tls-step-n{flex:0 0 26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(89,34,9,.12);color:#592209;font-size:13px;font-weight:700}
.tls-purpose{margin:2px 0 0;padding:12px 14px;border-radius:12px;background:rgba(89,34,9,.07);font-size:15px;line-height:1.55;color:#301607}
.tls-purpose strong{color:#592209}
.tls-cta{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;padding:13px 20px;border:0;border-radius:12px;background:#592209;color:#F5E9D6;font:700 15px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:background .2s,box-shadow .2s}
.tls-cta:hover{background:#461B07;box-shadow:0 8px 20px rgba(89,34,9,.3)}
.tls-cta:focus-visible{outline:3px solid #C9873A;outline-offset:3px}
.tls-cta .arrow{transition:transform .2s}
.tls-compare{width:100%;margin-top:clamp(28px,5vw,48px);padding:clamp(18px,3vw,28px);border-radius:20px;background:#FBF5EC;border:1px solid rgba(89,34,9,.28)}
.tls-compare h2{margin:0 0 16px;text-align:center;font-size:clamp(20px,3vw,26px);font-weight:700;color:#301607}
.tls-table-wrap{overflow-x:auto}
.tls-compare table{width:100%;border-collapse:separate;border-spacing:0;font-size:15.5px}
.tls-compare th{padding:12px 14px;text-align:left;font-weight:700;color:#F5E9D6;background:#592209}
.tls-compare th:first-child{border-top-left-radius:12px}.tls-compare th:last-child{border-top-right-radius:12px}
.tls-compare td{padding:12px 14px;vertical-align:top;color:#301607;border-bottom:1px solid rgba(89,34,9,.18);width:50%}
.tls-compare tbody tr:nth-child(even) td{background:rgba(89,34,9,.05)}
.tls-reco{margin:16px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tls-reco li{padding:12px 14px;border-radius:12px;background:#F5E9D6;border-left:4px solid #C9873A;font-size:15px;line-height:1.55;color:#301607}
.tls-foot{margin-top:clamp(22px,4vw,34px);text-align:center}
@media (max-width:820px){
  .tls-grid{grid-template-columns:1fr}
  .tls-reco{grid-template-columns:1fr}
}
@media (max-width:480px){
  .tls-card-top{flex-direction:column;align-items:flex-start}
  .tls-compare th,.tls-compare td{padding:10px;font-size:14px}
}
`;

// ─── Main Component ────────────────────────────────────────────────────────────
const TarotLandingScene: React.FC<TarotLandingSceneProps> = ({ onModeSelect }) => {
  return (
    <div className="tarot-landing-root tls-root">
      <StarField />
      <style>{LANDING_CSS}</style>

      <div className="tls-inner">
        <div className="tarot-anim-fade" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, animationDelay: "0.05s" }}>
          <div className="tarot-divider-line tarot-divider-line--gold-right" style={{ flex: "none", width: 40 }} />
          <span className="tarot-eyebrow">Select Your Intuitive Path</span>
          <div className="tarot-divider-line tarot-divider-line--gold-left" style={{ flex: "none", width: 40 }} />
        </div>

        <h1 className="tarot-headline tarot-anim-slide-up" style={{ animationDelay: "0.15s", marginBottom: 14 }}>
          <span className="tarot-headline-line1">What Are You Seeking</span>
          <span className="tarot-headline-line2">Clarity On Today?</span>
        </h1>
        <p className="tls-sub tarot-anim-fade" style={{ animationDelay: "0.25s" }}>Two readings, two different purposes. Pick the one that fits what is on your mind.</p>

        <div className="tls-grid">
          {TAROT_MODES.map((mode, i) => (
            <ModeCard key={mode.id} mode={mode} onSelect={onModeSelect} animDelay={0.3 + i * 0.12} variant={i === 0 ? "a" : "b"} />
          ))}
        </div>

        <Comparison />

        <p className="tarot-footer-label tarot-anim-fade tls-foot" style={{ animationDelay: "0.7s" }}>Pick a Card. Find Your Clarity. Move Forward.</p>
      </div>
    </div>
  );
};

export { TarotLandingScene };
export default TarotLandingScene;
