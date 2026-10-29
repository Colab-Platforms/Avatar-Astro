import React, { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TarotMode {
  id: string;
  name: string;
  trademark: boolean;
  theme: "gold" | "purple";
  description: string;
  tags: string[];
  icon: "moon" | "eye";
}

interface TarotLandingSceneProps {
  onModeSelect: (mode: string) => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// NOTE: tag labels intentionally mirror TIMELINE_POSITIONS / KARMA_POSITIONS in
// TarotExperience.tsx so the selection card stays consistent with the reading flow.
const TAROT_MODES: TarotMode[] = [
  {
    id: "life-timeline",
    name: "Life Timeline Tarot",
    trademark: true,
    theme: "gold",
    description:
      "A deeper look into the energy surrounding your past, present and future. Five sacred cards reveal where you are, what is shifting, and what may be unfolding next.",
    tags: ["Past Energy", "Current Energy", "Hidden Influence", "Next 6 Months", "Future Potential"],
    icon: "moon",
  },
  {
    id: "karma-mirror",
    name: "Karma Mirror",
    trademark: true,
    theme: "purple",
    description:
      "Not future prediction – soul reflection. Three cards reveal karmic patterns, hidden blockages and your healing path forward, so you can move on with more confidence.",
    tags: ["Current Karma", "Hidden Blockage", "Healing Path"],
    icon: "eye",
  },
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
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
};

/** A handful of soft, slow-drifting glow particles for ambient depth */
const FloatingParticles: React.FC = () => (
  <>
    <div
      className="tarot-particle tarot-anim-drift"
      style={{ width: 160, height: 160, left: "8%", top: "18%", background: "rgba(89,34,9,0.08)", animationDelay: "0s" }}
    />
    <div
      className="tarot-particle tarot-anim-drift"
      style={{ width: 200, height: 200, right: "10%", top: "10%", background: "rgba(89,34,9,0.09)", animationDelay: "2.5s" }}
    />
    <div
      className="tarot-particle tarot-anim-drift"
      style={{ width: 140, height: 140, left: "18%", bottom: "8%", background: "rgba(89,34,9,0.07)", animationDelay: "5s" }}
    />
    <div
      className="tarot-particle tarot-anim-drift"
      style={{ width: 130, height: 130, right: "16%", bottom: "12%", background: "rgba(89,34,9,0.08)", animationDelay: "1.2s" }}
    />
  </>
);

/** Shared delicate line-art medallion frame: axis pins, dashed ring, ticks. */
const MedallionFrame: React.FC<{ color: string; bg: string; children?: React.ReactNode }> = ({
  color,
  bg,
  children,
}) => (
  <svg viewBox="0 0 120 190" style={{ width: "100%", height: "100%", maxWidth: 108 }}>
    {/* top axis pin */}
    <line x1="60" y1="2" x2="60" y2="27" stroke={color} strokeWidth="1" strokeOpacity="0.55" />
    <polygon points="60,0 63.5,7 60,14 56.5,7" fill={color} opacity="0.8" />

    {/* bottom axis pin */}
    <line x1="60" y1="163" x2="60" y2="188" stroke={color} strokeWidth="1" strokeOpacity="0.55" />
    <polygon points="60,190 63.5,183 60,176 56.5,183" fill={color} opacity="0.8" />

    {/* outer dashed ring */}
    <circle cx="60" cy="95" r="52" stroke={color} strokeWidth="0.7" strokeOpacity="0.25" strokeDasharray="2 5" fill="none" />

    {/* main ring */}
    <circle cx="60" cy="95" r="44" stroke={color} strokeWidth="1" strokeOpacity="0.55" fill="rgba(89,34,9,0.05)" />

    {/* tick marks */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const r1 = 44;
      const r2 = i % 3 === 0 ? 37 : 40;
      const x1 = 60 + r1 * Math.sin(angle);
      const y1 = 95 - r1 * Math.cos(angle);
      const x2 = 60 + r2 * Math.sin(angle);
      const y2 = 95 - r2 * Math.cos(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.6" strokeOpacity="0.3" />;
    })}

    {children}
  </svg>
);

/** Crescent moon glyph (Life Timeline Tarot) */
const MoonGlyph: React.FC<{ color: string; bg: string }> = ({ color, bg }) => (
  <g>
    <circle cx="60" cy="95" r="6" fill={color} opacity="0.9" />
    <circle cx="60" cy="95" r="15" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.7" />
    <circle cx="66" cy="90" r="12" fill={bg} />
  </g>
);

/** Eye + crescent glyph (Karma Mirror) */
const EyeGlyph: React.FC<{ color: string; bg: string }> = ({ color, bg }) => (
  <g>
    <path d="M42,84 Q60,70 78,84 Q60,98 42,84 Z" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.7" />
    <circle cx="60" cy="84" r="3.2" fill={color} opacity="0.85" />
    <circle cx="60" cy="110" r="8" fill="none" stroke={color} strokeWidth="0.9" strokeOpacity="0.6" />
    <circle cx="63.5" cy="107" r="6.4" fill={bg} />
  </g>
);

/** Small L-shaped corner bracket with a star tip, rotated per corner */
const CornerOrnament: React.FC<{ corner: "tl" | "tr" | "bl" | "br"; color: string }> = ({ corner, color }) => {
  const style: React.CSSProperties = { position: "absolute", pointerEvents: "none" };
  if (corner === "tl") Object.assign(style, { top: 8, left: 8 });
  if (corner === "tr") Object.assign(style, { top: 8, right: 8, transform: "scaleX(-1)" });
  if (corner === "bl") Object.assign(style, { bottom: 8, left: 8, transform: "scaleY(-1)" });
  if (corner === "br") Object.assign(style, { bottom: 8, right: 8, transform: "scale(-1,-1)" });

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="tarot-corner" style={style}>
      <path d="M1,9 L1,3 Q1,1 3,1 L9,1" stroke={color} strokeWidth="1" strokeOpacity="0.6" fill="none" />
      <circle cx="1" cy="1" r="1.3" fill={color} opacity="0.85" />
    </svg>
  );
};

/** Diamond separator */
const DiamondSeparator: React.FC<{ color?: string; size?: number; glow?: boolean }> = ({
  color = "var(--tarot-gold)",
  size = 8,
  glow = false,
}) => (
  <span
    className={`tarot-diamond${glow ? " tarot-diamond--glow" : ""}`}
    style={{ color, fontSize: size }}
  >
    ✦
  </span>
);

/** Pill tag badge */
const PillTag: React.FC<{ label: string; theme: "gold" | "purple" }> = ({ label, theme }) => (
  <span className={`tarot-pill tarot-pill--${theme}`}>{label}</span>
);

/** Mode card */
const ModeCard: React.FC<{
  mode: TarotMode;
  onSelect: (id: string) => void;
  animDelay: number;
}> = ({ mode, onSelect, animDelay }) => {
  const [hovered, setHovered] = useState(false);
  const isGold = mode.theme === "gold";
  const accent = isGold ? "var(--tarot-gold)" : "var(--tarot-purple)";
  const cardBg = "#0a0e1c";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(mode.id)}
      className={`tarot-mode-card tarot-mode-card--${mode.theme} tarot-anim-slide-up`}
      style={{ animationDelay: `${animDelay}s` }}
    >
      <CornerOrnament corner="tl" color={accent} />
      <CornerOrnament corner="tr" color={accent} />
      <CornerOrnament corner="bl" color={accent} />
      <CornerOrnament corner="br" color={accent} />

      {/* Illustration */}
      <div className="tarot-card-illustration">
        <MedallionFrame color={accent} bg={cardBg}>
          {isGold ? <MoonGlyph color={accent} bg={cardBg} /> : <EyeGlyph color={accent} bg={cardBg} />}
        </MedallionFrame>
      </div>

      {/* Content */}
      <div className="tarot-card-content">
        <h2 className={`tarot-card-title tarot-card-title--${mode.theme}`}>
          {mode.name}
          {mode.trademark && <span style={{ fontSize: 15, verticalAlign: "super" }}>™</span>}
        </h2>

        <p className="tarot-card-body">{mode.description}</p>

        <div className="tarot-tags">
          {mode.tags.map((tag) => (
            <PillTag key={tag} label={tag} theme={mode.theme} />
          ))}
        </div>

        <div
          className={`tarot-cta tarot-cta--${mode.theme}`}
          style={{ marginTop: "auto", opacity: hovered ? 1 : 0.8 }}
        >
          <span>Begin Reading</span>
          <span className="arrow" style={{ transform: hovered ? "translateX(4px)" : "translateX(0)" }}>
            →
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const TarotLandingScene: React.FC<TarotLandingSceneProps> = ({ onModeSelect }) => {
  return (
    <div className="tarot-landing-root">
      <StarField />
      <FloatingParticles />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Eyebrow */}
        <div
          className="tarot-anim-fade"
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, animationDelay: "0.05s" }}
        >
          <div className="tarot-divider-line tarot-divider-line--gold-right" style={{ flex: "none", width: 40 }} />
          <span className="tarot-eyebrow">Select Your Intuitive Path</span>
          <div className="tarot-divider-line tarot-divider-line--gold-left" style={{ flex: "none", width: 40 }} />
        </div>

        {/* Main headline */}
        <h1 className="tarot-headline tarot-anim-slide-up" style={{ animationDelay: "0.15s", marginBottom: 44 }}>
          <span className="tarot-headline-line1">What Are You Seeking</span>
          <span className="tarot-headline-line2">Clarity On Today?</span>
        </h1>

        {/* Mode cards */}
        <div className="tarot-mode-grid">
          {TAROT_MODES.map((mode, i) => (
            <ModeCard key={mode.id} mode={mode} onSelect={onModeSelect} animDelay={0.3 + i * 0.12} />
          ))}
        </div>

        {/* Footer */}
        <div
          className="tarot-anim-fade"
          style={{
            marginTop: 22,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            animationDelay: "0.7s",
          }}
        >
          <DiamondSeparator size={9} />
          <span className="tarot-footer-label">Pick a Card. Find Your Clarity. Move Forward.</span>
          <DiamondSeparator size={9} />
        </div>
      </div>
    </div>
  );
};

export { TarotLandingScene };
export default TarotLandingScene;
