import { useEffect, useRef, useState } from "react";

// ── Real NASA-style planet image URLs (public domain) ───────────────────────
const PLANET_IMAGES = {
  mercury: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/240px-Mercury_in_true_color.jpg",
  venus:   "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/240px-Venus-real_color.jpg",
  earth:   "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/240px-The_Earth_seen_from_Apollo_17.jpg",
  mars:    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/240px-OSIRIS_Mars_true_color.jpg",
  jupiter: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/240px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
  saturn:  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/240px-Saturn_during_Equinox.jpg",
  uranus:  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/240px-Uranus2.jpg",
};

// ── 7 Planets data ────────────────────────────────────────────────────────────
const PLANETS = [
  {
    id: "mercury", name: "Mercury", symbol: "☿",
    size: 7,
    orbitRx: 90,  orbitRy: 27,
    speed: 0.0055, startAngle: 0.3,
    signs: ["Gemini", "Virgo"],
    description: "Planet of communication, intellect & quick thinking",
    glowColor: "#b0b0b0",
  },
  {
    id: "venus", name: "Venus", symbol: "♀",
    size: 11,
    orbitRx: 140, orbitRy: 42,
    speed: 0.004, startAngle: 1.8,
    signs: ["Taurus", "Libra"],
    description: "Planet of love, beauty, harmony & attraction",
    glowColor: "#e8c46a",
  },
  {
    id: "earth", name: "Earth", symbol: "🜨",
    size: 12,
    orbitRx: 195, orbitRy: 58,
    speed: 0.003, startAngle: 0.9,
    signs: ["All Signs"],
    description: "Our home — the bridge between cosmos and consciousness",
    glowColor: "#4a9eff",
  },
  {
    id: "mars", name: "Mars", symbol: "♂",
    size: 9,
    orbitRx: 252, orbitRy: 75,
    speed: 0.0024, startAngle: 2.5,
    signs: ["Aries", "Scorpio"],
    description: "Planet of energy, action, passion & drive",
    glowColor: "#e05c3a",
  },
  {
    id: "jupiter", name: "Jupiter", symbol: "♃",
    size: 22,
    orbitRx: 318, orbitRy: 95,
    speed: 0.0017, startAngle: 3.7,
    signs: ["Sagittarius", "Pisces"],
    description: "Planet of expansion, wisdom, luck & abundance",
    glowColor: "#c8924a",
  },
  {
    id: "saturn", name: "Saturn", symbol: "♄",
    size: 18,
    orbitRx: 390, orbitRy: 117,
    speed: 0.0012, startAngle: 4.1,
    signs: ["Capricorn", "Aquarius"],
    description: "Planet of discipline, karma, time & life lessons",
    glowColor: "#c8a84b",
    hasRing: true,
  },
  {
    id: "uranus", name: "Uranus", symbol: "♅",
    size: 14,
    orbitRx: 468, orbitRy: 140,
    speed: 0.0008, startAngle: 5.5,
    signs: ["Aquarius"],
    description: "Planet of revolution, innovation & sudden change",
    glowColor: "#5bf0e8",
  },
];

// ── Preload images ────────────────────────────────────────────────────────────
const imageCache = {};
function loadImage(id, url) {
  if (imageCache[id]) return imageCache[id];
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  imageCache[id] = img;
  return img;
}

// ── Planet Modal ──────────────────────────────────────────────────────────────
function PlanetModal({ planet, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const img = imageCache[planet.id];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
        animation: "mfadeIn .25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg,rgba(8,12,35,0.98),rgba(4,6,20,0.98))",
          border: `1px solid ${planet.glowColor}44`,
          borderRadius: 22,
          padding: "36px 40px",
          maxWidth: 420, width: "90vw",
          boxShadow: `0 0 80px ${planet.glowColor}30, 0 30px 80px rgba(0,0,0,0.9)`,
          animation: "mslideUp .3s ease",
          position: "relative", textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position:"absolute",top:14,right:18,
            background:"none",border:"none",
            color:"rgba(255,255,255,0.35)",fontSize:22,
            cursor:"pointer",lineHeight:1,
          }}
        >✕</button>

        {/* Planet image */}
        <div style={{
          width:90, height:90, borderRadius:"50%",
          overflow:"hidden", margin:"0 auto 18px",
          boxShadow:`0 0 30px ${planet.glowColor}80, 0 0 70px ${planet.glowColor}30`,
          border:`2px solid ${planet.glowColor}50`,
          position:"relative",
        }}>
          {img && img.complete ? (
            <img
              src={img.src} alt={planet.name}
              style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }}
            />
          ) : (
            <div style={{
              width:"100%",height:"100%",
              background:`radial-gradient(circle at 35% 35%, ${planet.glowColor}cc, ${planet.glowColor}44)`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:30, color:"rgba(255,255,255,0.7)",
            }}>{planet.symbol}</div>
          )}
          {planet.hasRing && (
            <div style={{
              position:"absolute",top:"50%",left:"50%",
              transform:"translate(-50%,-50%) rotateX(70deg)",
              width:130,height:130,borderRadius:"50%",
              border:`3px solid ${planet.glowColor}60`,
              pointerEvents:"none",
            }}/>
          )}
        </div>

        <h2 style={{
          fontFamily:"Cinzel, Georgia, serif",
          fontSize:22, color:planet.glowColor,
          margin:"0 0 6px",
          textShadow:`0 0 20px ${planet.glowColor}80`,
        }}>{planet.name}</h2>

        <div style={{
          fontSize:11,color:"rgba(255,255,255,0.3)",
          fontFamily:"'DM Sans', system-ui, sans-serif",
          letterSpacing:3,marginBottom:18,
        }}>PLANETARY ENERGY</div>

        <p style={{
          fontSize:15,color:"rgba(255,255,255,0.75)",
          lineHeight:1.75,fontStyle:"italic",
          fontFamily:"'DM Sans', system-ui, sans-serif",
          marginBottom:22,
        }}>{planet.description}</p>

        <div style={{
          borderTop:`1px solid ${planet.glowColor}25`,
          paddingTop:16,marginBottom:22,
        }}>
          <div style={{
            fontSize:9,color:"rgba(255,255,255,0.28)",
            fontFamily:"'DM Sans', system-ui, sans-serif",
            letterSpacing:3,marginBottom:10,
            textTransform:"uppercase",
          }}>Rules These Signs</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {planet.signs.map(s => (
              <span key={s} style={{
                padding:"5px 16px",
                border:`1px solid ${planet.glowColor}50`,
                borderRadius:50,fontSize:13,
                color:planet.glowColor,
                fontFamily:"'DM Sans', system-ui, sans-serif",
                background:`${planet.glowColor}12`,
              }}>{s}</span>
            ))}
          </div>
        </div>

        <button
          onClick={() => { window.location.href="/astrology-tools"; }}
          style={{
            padding:"12px 36px",
            background:`linear-gradient(135deg,${planet.glowColor}cc,${planet.glowColor}66)`,
            border:"none",borderRadius:50,
            color:"#000",fontFamily:"Cinzel, Georgia, serif",
            fontSize:11,letterSpacing:2,cursor:"pointer",fontWeight:700,
            boxShadow:`0 4px 24px ${planet.glowColor}50`,
            transition:"transform .2s,box-shadow .2s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";}}
        >EXPLORE {planet.name.toUpperCase()}</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SolarSystem() {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    angles: Object.fromEntries(PLANETS.map(p => [p.id, p.startAngle])),
    tiltX: 0, tiltY: 0,
    targetTiltX: 0, targetTiltY: 0,
    raf: null,
    positions: {},
    imagesLoaded: false,
  });
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [hovered, setHovered] = useState(null);

  // Preload all planet images
  useEffect(() => {
    PLANETS.forEach(p => {
      if (PLANET_IMAGES[p.id]) loadImage(p.id, PLANET_IMAGES[p.id]);
    });
    // Force re-renders as images load
    const timer = setInterval(() => {
      const allLoaded = PLANETS.every(p => {
        const img = imageCache[p.id];
        return img && img.complete;
      });
      if (allLoaded) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // ── Canvas draw loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const state = stateRef.current;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create circular clip paths for planets
    const drawPlanetWithImage = (ctx, planet, x, y) => {
      const r = planet.size;
      const img = imageCache[planet.id];

      ctx.save();
      ctx.translate(x, y);

      // Glow
      const glow = ctx.createRadialGradient(0,0,0,0,0,r*3);
      glow.addColorStop(0, planet.glowColor + "55");
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(0,0,r*3,0,Math.PI*2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Saturn ring behind planet
      if (planet.hasRing) {
        ctx.save();
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, r*2.4, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(200,168,75,0.6)";
        ctx.lineWidth = r * 0.5 / 0.3;
        ctx.stroke();
        // Outer ring
        ctx.beginPath();
        ctx.arc(0, 0, r*2.8, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(180,148,55,0.3)";
        ctx.lineWidth = r * 0.25 / 0.3;
        ctx.stroke();
        ctx.restore();
      }

      // Planet circle clip
      ctx.save();
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.clip();

      if (img && img.complete && img.naturalWidth > 0) {
        // Draw real image
        ctx.drawImage(img, -r, -r, r*2, r*2);
        // Subtle dark edge vignette
        const edge = ctx.createRadialGradient(0,0,r*0.5,0,0,r);
        edge.addColorStop(0,"transparent");
        edge.addColorStop(1,"rgba(0,0,0,0.4)");
        ctx.fillStyle = edge;
        ctx.beginPath();
        ctx.arc(0,0,r,0,Math.PI*2);
        ctx.fill();
      } else {
        // Fallback gradient ball
        const fb = ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.1,0,0,r);
        fb.addColorStop(0, planet.glowColor + "ff");
        fb.addColorStop(1, planet.glowColor + "44");
        ctx.fillStyle = fb;
        ctx.fillRect(-r,-r,r*2,r*2);
      }
      ctx.restore();

      // Specular highlight
      const spec = ctx.createRadialGradient(-r*0.28,-r*0.28,0,-r*0.28,-r*0.28,r*0.6);
      spec.addColorStop(0,"rgba(255,255,255,0.28)");
      spec.addColorStop(1,"transparent");
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fillStyle = spec;
      ctx.fill();

      // Hover ring
      if (hovered === planet.id) {
        ctx.beginPath();
        ctx.arc(0,0,r+5,0,Math.PI*2);
        ctx.strokeStyle = planet.glowColor + "dd";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Name tag
        ctx.fillStyle = "#fff";
        ctx.font = `bold 11px 'DM Sans', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 6;
        ctx.fillText(planet.name, 0, -r - 10);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    };

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0,0,W,H);

      // Smooth tilt
      state.tiltX += (state.targetTiltX - state.tiltX) * 0.055;
      state.tiltY += (state.targetTiltY - state.tiltY) * 0.055;

      const cx = W / 2;
      const cy = H / 2;

      // Tilt affects how squished the ellipses look
      const tF = 1 + state.tiltX * 0.10;
      const sX = state.tiltY * 18;
      const sY = state.tiltX * 10;

      ctx.save();
      ctx.translate(cx + sX, cy + sY);

      // ── Draw 7 orbital rings ─────────────────────────────────────────────
      PLANETS.forEach((planet, i) => {
        const rx = planet.orbitRx;
        const ry = planet.orbitRy * tF;

        // Orbit glow (very subtle)
        ctx.beginPath();
        ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
        ctx.strokeStyle = `rgba(212,175,55,${i === 0 ? 0.25 : 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([5,10]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Draw Sun ──────────────────────────────────────────────────────────
      // Corona layers
      [[90,0.04],[65,0.07],[45,0.13],[30,0.0]].forEach(([r,a]) => {
        if (a > 0) {
          const cg = ctx.createRadialGradient(0,0,0,0,0,r);
          cg.addColorStop(0,`rgba(255,180,0,${a})`);
          cg.addColorStop(1,"transparent");
          ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
          ctx.fillStyle=cg; ctx.fill();
        }
      });
      // Sun body
      const sunG = ctx.createRadialGradient(-9,-9,2,0,0,30);
      sunG.addColorStop(0,"#fff8d0");
      sunG.addColorStop(0.25,"#ffdd00");
      sunG.addColorStop(0.6,"#ff9900");
      sunG.addColorStop(1,"#cc3300");
      ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2);
      ctx.fillStyle=sunG; ctx.fill();
      // Sun glint
      const sg2 = ctx.createRadialGradient(-9,-9,0,-9,-9,16);
      sg2.addColorStop(0,"rgba(255,255,255,0.35)");
      sg2.addColorStop(1,"transparent");
      ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2);
      ctx.fillStyle=sg2; ctx.fill();

      // ── Draw Planets ──────────────────────────────────────────────────────
      const positions = {};
      PLANETS.forEach(planet => {
        state.angles[planet.id] += planet.speed;
        const angle = state.angles[planet.id];
        const rx = planet.orbitRx;
        const ry = planet.orbitRy * tF;
        const px = Math.cos(angle) * rx;
        const py = Math.sin(angle) * ry;

        positions[planet.id] = {
          x: cx + sX + px,
          y: cy + sY + py,
          r: planet.size + 8,
        };

        drawPlanetWithImage(ctx, planet, px, py);
      });

      ctx.restore();
      state.positions = positions;
      state.raf = requestAnimationFrame(draw);
    };

    state.raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener("resize", resize);
    };
  }, [hovered]);

  // ── Mouse move ─────────────────────────────────────────────────────────────
  const onMouseMove = (e) => {
    const state = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    state.targetTiltY = mx * 2.2;
    state.targetTiltX = my * 2.2;

    // Hit test planets
    let hit = null;
    for (const p of PLANETS) {
      const pos = state.positions[p.id];
      if (!pos) continue;
      const dx = e.clientX - rect.left - pos.x;
      const dy = e.clientY - rect.top - pos.y;
      if (dx*dx + dy*dy < pos.r * pos.r) { hit = p.id; break; }
    }
    setHovered(hit);
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? "pointer" : "default";
  };

  const onMouseLeave = () => {
    stateRef.current.targetTiltX = 0;
    stateRef.current.targetTiltY = 0;
    setHovered(null);
  };

  const onClick = (e) => {
    const state = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    for (const p of PLANETS) {
      const pos = state.positions[p.id];
      if (!pos) continue;
      const dx = e.clientX - rect.left - pos.x;
      const dy = e.clientY - rect.top - pos.y;
      if (dx*dx + dy*dy < pos.r * pos.r) {
        setSelectedPlanet(p);
        return;
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes mfadeIn { from{opacity:0}to{opacity:1} }
        @keyframes mslideUp { from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Canvas fills its parent — make sure parent has a dark bg */}
      <canvas
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{ width:"100%", height:"100%", display:"block", background:"transparent" }}
      />

      {selectedPlanet && (
        <PlanetModal
          planet={selectedPlanet}
          onClose={() => setSelectedPlanet(null)}
        />
      )}
    </>
  );
}