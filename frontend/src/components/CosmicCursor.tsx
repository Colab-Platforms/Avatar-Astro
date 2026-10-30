import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string; type: string;
}
interface ClickBurst {
  id: number; x: number; y: number; startTime: number;
}

// ─── Day-based cursor theme ───────────────────────────────────────────────────
const DAY_THEMES = [
  { name: "Sun",     glow: "#FFD700", ring: "#FFA500", particle: "#FFE55C", symbol: "☀️" }, // 0 Sun
  { name: "Moon",    glow: "#C0C0FF", ring: "#8888DD", particle: "#DDDEFF", symbol: "🌙" }, // 1 Mon
  { name: "Mars",    glow: "#FF4422", ring: "#CC2200", particle: "#FF7755", symbol: "♂" },  // 2 Tue
  { name: "Mercury", glow: "#C9A84C", ring: "#A07830", particle: "#F0D080", symbol: "☿" }, // 3 Wed
  { name: "Jupiter", glow: "#FFB347", ring: "#CC8800", particle: "#FFD080", symbol: "♃" }, // 4 Thu
  { name: "Venus",   glow: "#FFB6C1", ring: "#DD8899", particle: "#FFCCD5", symbol: "♀" }, // 5 Fri
  { name: "Saturn",  glow: "#B8A898", ring: "#8A7A6A", particle: "#DDD0C0", symbol: "♄" }, // 6 Sat
];

const theme = DAY_THEMES[new Date().getDay()];

// ─── Zodiac symbols for hover morphing ───────────────────────────────────────
const ZODIAC_SYMBOLS: Record<string, string> = {
  aries:"♈",taurus:"♉",gemini:"♊",cancer:"♋",leo:"♌",virgo:"♍",
  libra:"♎",scorpio:"♏",sagittarius:"♐",capricorn:"♑",aquarius:"♒",pisces:"♓",
};

let particleId = 0;

export default function CosmicCursor() {
  const outerRef  = useRef<HTMLDivElement>(null);
  const innerRef  = useRef<HTMLDivElement>(null);
  const trailRef  = useRef<HTMLCanvasElement>(null);
  const burstRef  = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  const mouse     = useRef({ x: -200, y: -200 });
  const outer     = useRef({ x: -200, y: -200 });
  const particles = useRef<Particle[]>([]);
  const bursts    = useRef<ClickBurst[]>([]);
  const lastMove  = useRef(Date.now());
  const energy    = useRef(0);
  const constellationActive = useRef(false);
  const constellationTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [hoverType, setHoverType] = useState<"default"|"button"|"zodiac"|"planet"|"card"|"input">("default");
  const [zodiacSymbol, setZodiacSymbol] = useState("");
  const [constellationMode, setConstellationMode] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(0);

  // ─── Spawn trail particle ─────────────────────────────────────────────────
  const spawnParticle = useCallback(() => {
    const spread = 12;
    const colors = [theme.particle, theme.glow, "#ffffff", "#C9A84C", "#fffbe0"];
    for (let i = 0; i < 2; i++) {
      particles.current.push({
        id: particleId++,
        x: mouse.current.x + (Math.random()-0.5)*spread,
        y: mouse.current.y + (Math.random()-0.5)*spread,
        vx: (Math.random()-0.5)*1.8,
        vy: (Math.random()-0.5)*1.8 - 0.5,
        life: 1,
        maxLife: 0.4 + Math.random()*0.5,
        size: 1.5 + Math.random()*3,
        color: colors[Math.floor(Math.random()*colors.length)],
        type: Math.random() > 0.7 ? "star" : "dot",
      });
    }
    if (particles.current.length > 120) particles.current.splice(0, 20);
  }, []);

  // ─── Click burst ──────────────────────────────────────────────────────────
  const spawnBurst = useCallback((x: number, y: number) => {
    const count = 22;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4;
      particles.current.push({
        id: particleId++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random()*0.4,
        size: 2 + Math.random()*4,
        color: [theme.glow, theme.particle, "#301607", "#FFD700"][Math.floor(Math.random()*4)],
        type: Math.random() > 0.4 ? "star" : "dot",
      });
    }
    bursts.current.push({ id: particleId++, x, y, startTime: performance.now() });
    if (bursts.current.length > 5) bursts.current.splice(0, 1);
  }, []);

  // ─── Draw star shape ──────────────────────────────────────────────────────
  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const ai = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
      else ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
      ctx.lineTo(x + Math.cos(ai)*(r*0.4), y + Math.sin(ai)*(r*0.4));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ─── Main animation loop ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = trailRef.current!;
    const bCanvas = burstRef.current!;
    const ctx = canvas.getContext("2d")!;
    const bCtx = bCanvas.getContext("2d")!;

    function resize() {
      canvas.width = bCanvas.width = window.innerWidth;
      canvas.height = bCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    let frameCount = 0;
    function loop() {
      animRef.current = requestAnimationFrame(loop);
      frameCount++;

      // ── smooth outer cursor lag ──
      const lag = constellationActive.current ? 0.06 : 0.12;
      outer.current.x += (mouse.current.x - outer.current.x) * lag;
      outer.current.y += (mouse.current.y - outer.current.y) * lag;

      // ── DOM cursor positions ──
      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${outer.current.x}px, ${outer.current.y}px)`;
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${mouse.current.x}px, ${mouse.current.y}px)`;
      }

      // ── spawn trail every 2 frames ──
      if (frameCount % 2 === 0) spawnParticle();

      // ── energy decay ──
      energy.current = Math.max(0, energy.current - 0.3);

      // ── trail canvas ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      particles.current = particles.current.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= 0.025;
        if (p.life <= 0) return false;
        const alpha = Math.max(0, p.life);
        if (p.type === "star") {
          drawStar(ctx, p.x, p.y, p.size, p.color, alpha * 0.9);
        } else {
          ctx.save();
          ctx.globalAlpha = alpha * 0.85;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size/2, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }
        return true;
      });

      // ── burst ripples ──
      bCtx.clearRect(0, 0, bCanvas.width, bCanvas.height);
      bursts.current = bursts.current.filter(b => {
        const elapsed = (now - b.startTime) / 1000;
        if (elapsed > 0.5) return false;
        const t = elapsed / 0.5;
        const r = t * 80;
        bCtx.save();
        bCtx.globalAlpha = (1-t) * 0.6;
        bCtx.strokeStyle = theme.glow;
        bCtx.lineWidth = 2;
        bCtx.shadowBlur = 12;
        bCtx.shadowColor = theme.glow;
        bCtx.beginPath();
        bCtx.arc(b.x, b.y, r, 0, Math.PI*2);
        bCtx.stroke();
        bCtx.globalAlpha = (1-t) * 0.25;
        bCtx.beginPath();
        bCtx.arc(b.x, b.y, r*0.55, 0, Math.PI*2);
        bCtx.stroke();
        bCtx.restore();
        return true;
      });

      // ── constellation stars — unique shape per day ──
      if (constellationActive.current) {
        const t2 = performance.now() / 1000;
        const cx2 = outer.current.x, cy2 = outer.current.y;

        // Each day has its own star-pattern (points relative to cursor center)
        // and its own line-connection map
        const DAY_CONSTELLATIONS = [
          // 0 Sun — 8-point radial starburst
          {
            pts: Array.from({length:8},(_,i)=>{
              const a=(i/8)*Math.PI*2; const r=i%2===0?65:35;
              return {dx:Math.cos(a)*r, dy:Math.sin(a)*r, size:i%2===0?3.5:2};
            }),
            lines:[[0,2],[2,4],[4,6],[6,0],[1,3],[3,5],[5,7],[7,1],[0,4],[2,6]],
          },
          // 1 Moon — crescent arc of 6 stars
          {
            pts: [
              {dx:-50,dy:0,size:2},{dx:-35,dy:-35,size:3},{dx:0,dy:-55,size:3.5},
              {dx:35,dy:-35,size:3},{dx:50,dy:0,size:2},{dx:20,dy:30,size:2.5},
            ],
            lines:[[0,1],[1,2],[2,3],[3,4],[4,5]],
          },
          // 2 Mars — arrow/spear pointing up (war symbol)
          {
            pts: [
              {dx:0,dy:-65,size:4},{dx:-20,dy:-40,size:2.5},{dx:20,dy:-40,size:2.5},
              {dx:0,dy:-20,size:2},{dx:0,dy:20,size:2.5},{dx:-30,dy:50,size:2},
              {dx:30,dy:50,size:2},
            ],
            lines:[[0,1],[0,2],[1,3],[2,3],[3,4],[4,5],[4,6]],
          },
          // 3 Mercury — winged staff / caduceus shape
          {
            pts: [
              {dx:0,dy:-60,size:3.5},{dx:-25,dy:-35,size:2.5},{dx:25,dy:-35,size:2.5},
              {dx:0,dy:-10,size:2},{dx:-30,dy:15,size:2.5},{dx:30,dy:15,size:2.5},
              {dx:0,dy:50,size:3},
            ],
            lines:[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6]],
          },
          // 4 Jupiter — large cross with 4 extended arms + corner stars
          {
            pts: [
              {dx:0,dy:-65,size:4},{dx:65,dy:0,size:4},{dx:0,dy:65,size:4},{dx:-65,dy:0,size:4},
              {dx:0,dy:0,size:3},{dx:-40,dy:-40,size:2},{dx:40,dy:-40,size:2},
              {dx:40,dy:40,size:2},{dx:-40,dy:40,size:2},
            ],
            lines:[[0,4],[1,4],[2,4],[3,4],[5,0],[5,3],[6,0],[6,1],[7,1],[7,2],[8,2],[8,3]],
          },
          // 5 Venus — 5-pointed star (pentagram) with outer ring
          {
            pts: Array.from({length:10},(_,i)=>{
              const a=(i/10)*Math.PI*2 - Math.PI/2;
              const r = i%2===0 ? 60 : 25;
              return {dx:Math.cos(a)*r, dy:Math.sin(a)*r, size:i%2===0?3.5:2};
            }),
            lines:[[0,2],[2,4],[4,6],[6,8],[8,0],[1,3],[3,5],[5,7],[7,9],[9,1]],
          },
          // 6 Saturn — hexagon (6-pointed star / Star of David shape)
          {
            pts: Array.from({length:12},(_,i)=>{
              const a=(i/12)*Math.PI*2;
              const r = i%2===0 ? 60 : 30;
              return {dx:Math.cos(a)*r, dy:Math.sin(a)*r, size:i%2===0?3:2};
            }),
            lines:[[0,2],[2,4],[4,0],[6,8],[8,10],[10,6],[1,7],[3,9],[5,11]],
          },
        ];

        const day = new Date().getDay();
        const con = DAY_CONSTELLATIONS[day];
        const pulse = 0.85 + Math.sin(t2 * 1.8) * 0.15; // gentle breathing

        ctx.save();

        // Draw connection lines first (behind stars)
        ctx.shadowBlur = 6;
        ctx.shadowColor = theme.glow;
        ctx.strokeStyle = theme.glow;
        ctx.lineWidth = 0.8;
        con.lines.forEach(([a, b]) => {
          const pa = con.pts[a], pb = con.pts[b];
          ctx.globalAlpha = 0.2 * pulse;
          ctx.beginPath();
          ctx.moveTo(cx2+pa.dx, cy2+pa.dy);
          ctx.lineTo(cx2+pb.dx, cy2+pb.dy);
          ctx.stroke();
        });

        // Draw each star point as a proper 4-point star shape
        con.pts.forEach((s) => {
          const sx = cx2+s.dx, sy = cy2+s.dy;
          const r = s.size * pulse;

          // 4-point star (cross + diagonal)
          ctx.globalAlpha = 0.9 * pulse;
          ctx.fillStyle = theme.particle;
          ctx.shadowBlur = 10;
          ctx.shadowColor = theme.glow;

          ctx.beginPath();
          // outer 4 points
          const arms = 4;
          for (let i = 0; i < arms * 2; i++) {
            const angle = (i / (arms * 2)) * Math.PI * 2 - Math.PI / arms;
            const rad = i % 2 === 0 ? r * 2.8 : r * 0.6;
            if (i === 0) ctx.moveTo(sx + Math.cos(angle)*rad, sy + Math.sin(angle)*rad);
            else ctx.lineTo(sx + Math.cos(angle)*rad, sy + Math.sin(angle)*rad);
          }
          ctx.closePath();
          ctx.fill();

          // bright center dot
          ctx.globalAlpha = 1 * pulse;
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 14;
          ctx.shadowColor = "#ffffff";
          ctx.beginPath();
          ctx.arc(sx, sy, r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }
    }
    loop();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [spawnParticle]);

  // ─── Mouse events ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      lastMove.current = Date.now();
      energy.current = Math.min(100, energy.current + 1.5);
      setEnergyLevel(Math.round(energy.current));

      // reset constellation timer
      if (constellationTimer.current) clearTimeout(constellationTimer.current);
      constellationActive.current = false;
      setConstellationMode(false);
      constellationTimer.current = setTimeout(() => {
        constellationActive.current = true;
        setConstellationMode(true);
      }, 2000);

      // detect what we're hovering
      const el = e.target as HTMLElement;
      const isInput = el.closest("input,textarea,select,[contenteditable],[role=searchbox],[role=combobox]");
      const isBtn = el.closest("button,a,[role=button]");
      const isZodiac = el.closest("[data-zodiac]");
      const isPlanet = el.closest("[data-planet]");
      const isCard = el.closest("[data-card],.zodiac-card,.horo-card");

      if (isInput) {
        setHoverType("input");
        setZodiacSymbol("");
      } else if (isZodiac) {
        const sign = (isZodiac as HTMLElement).dataset.zodiac || "";
        setZodiacSymbol(ZODIAC_SYMBOLS[sign.toLowerCase()] || "✨");
        setHoverType("zodiac");
      } else if (isPlanet) {
        setHoverType("planet");
        setZodiacSymbol("");
      } else if (isBtn) {
        setHoverType("button");
        setZodiacSymbol("");
      } else if (isCard) {
        setHoverType("card");
        setZodiacSymbol("");
      } else {
        setHoverType("default");
        setZodiacSymbol("");
      }
    }

    function onClick(e: MouseEvent) {
      spawnBurst(e.clientX, e.clientY);
      energy.current = Math.min(100, energy.current + 20);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick);
    document.body.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick);
      document.body.style.cursor = "";
      if (constellationTimer.current) clearTimeout(constellationTimer.current);
    };
  }, [spawnBurst]);

  // ─── Cursor sizes by state ────────────────────────────────────────────────
  const cursorHidden = hoverType === "input";
  const outerSize = hoverType === "button" ? 56 : hoverType === "zodiac" ? 52 : hoverType === "card" ? 48 : 38;
  const innerSize = hoverType === "button" ? 10 : 7;
  const energyBrightness = 1 + (energyLevel / 100) * 0.8;

  return (
    <>
      <style>{`
        * { cursor: none !important; }
        input, textarea, select, [contenteditable], [role="searchbox"], [role="combobox"] {
          cursor: text !important;
        }

        @keyframes inner-spin {
          from { transform: translate(-50%,-50%) rotate(0deg); }
          to   { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes zodiac-pop {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity:0; }
          60%  { transform: translate(-50%,-50%) scale(1.15); }
          100% { transform: translate(-50%,-50%) scale(1); opacity:1; }
        }
        @keyframes energy-pulse {
          0%,100% { box-shadow: 0 0 8px 2px var(--cur-glow); }
          50%     { box-shadow: 0 0 22px 6px var(--cur-glow); }
        }

        .cosmic-outer {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 999999;
          will-change: transform;
          margin-left: 0; margin-top: 0;
        }
        .cosmic-inner {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 999999;
          will-change: transform;
        }
        .cosmic-trail-canvas {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 999990;
          width: 100vw; height: 100vh;
        }
        .cosmic-burst-canvas {
          position: fixed;
          top: 0; left: 0;
          pointer-events: none;
          z-index: 999995;
          width: 100vw; height: 100vh;
        }
        .energy-hud {
          position: fixed;
          bottom: 24px; right: 24px;
          pointer-events: none;
          z-index: 999998;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .energy-label {
          font-size: 10px;
          letter-spacing: 0.18em;
          color: #592209;
          font-family: monospace;
          text-transform: uppercase;
        }
        .energy-bar-bg {
          width: 80px;
          height: 4px;
          background: rgba(89,34,9,0.05);
          border-radius: 4px;
          overflow: hidden;
        }
        .energy-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #E58A45, #E58A45);
          border-radius: 4px;
          box-shadow: 0 0 8px #E58A45;
          transition: width 0.1s linear;
        }
        .theme-badge {
          font-size: 11px;
          color: #592209;
          font-family: monospace;
          letter-spacing: 0.12em;
        }
      `}</style>

      {/* Trail canvas */}
      <canvas ref={trailRef} className="cosmic-trail-canvas"/>

      {/* Burst/ripple canvas */}
      <canvas ref={burstRef} className="cosmic-burst-canvas"/>

      {/* Outer ring */}
      <div
        ref={outerRef}
        className="cosmic-outer"
        style={{
          opacity: cursorHidden ? 0 : 1,
          // @ts-ignore
          "--cur-glow": theme.glow,
          width: outerSize,
          height: outerSize,
          marginLeft: -outerSize/2,
          marginTop: -outerSize/2,
        } as React.CSSProperties}
      >

        {/* Zodiac symbol overlay */}
        {hoverType === "zodiac" && zodiacSymbol && (
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: outerSize * 0.55,
            lineHeight: 1,
            animation: "zodiac-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
            filter: `drop-shadow(0 0 6px ${theme.glow})`,
            color: theme.glow,
          }}>
            {zodiacSymbol}
          </div>
        )}

        {/* Constellation label */}
        {constellationMode && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9, color: `${theme.glow}99`, whiteSpace: "nowrap",
            letterSpacing: "0.15em", fontFamily: "monospace",
            textTransform: "uppercase",
          }}>
            ✦ {theme.name} constellation
          </div>
        )}
      </div>

      {/* Inner core */}
      <div
        ref={innerRef}
        className="cosmic-inner"
        style={{
          opacity: cursorHidden ? 0 : 1,
          width: innerSize,
          height: innerSize,
          marginLeft: -innerSize/2,
          marginTop: -innerSize/2,
        }}
      >
        <div style={{
          width: "100%", height: "100%",
          position: "absolute", top: "50%", left: "50%",
          borderRadius: hoverType === "zodiac" ? "2px" : "50%",
          background: `radial-gradient(circle, #fff 0%, ${theme.glow} 60%, ${theme.ring} 100%)`,
          boxShadow: `0 0 ${6 + energyLevel * 0.1}px #fff, 0 0 ${12 + energyLevel * 0.2}px ${theme.glow}`,
          transform: "translate(-50%,-50%)",
          animation: "energy-pulse 1.5s ease-in-out infinite",
          filter: `brightness(${energyBrightness})`,
          transition: "width 0.15s, height 0.15s, border-radius 0.2s",
        }}/>
      </div>

      {/* Energy HUD */}
      <div className="energy-hud">
        <div className="theme-badge">{theme.symbol} {theme.name} day</div>
        <div className="energy-label">Cosmic Energy</div>
        <div className="energy-bar-bg">
          <div className="energy-bar-fill" style={{width:`${energyLevel}%`}}/>
        </div>
      </div>
    </>
  );
}