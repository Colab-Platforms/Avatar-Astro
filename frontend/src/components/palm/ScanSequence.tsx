import { useEffect, useMemo, useRef, useState } from "react";
import type { PalmAnalysisResult } from "@/lib/palmAnalysis";

// ─── Phase timeline ────────────────────────────────────────────────────────
// The underlying detection (MediaPipe hand landmarks + measured proportions)
// already finished before this component mounts. This is a short choreographed
// reveal of those real landmarks. It does not trace palm lines: the tool does
// not detect lines, so none are drawn and no step claims to read them.
interface Phase { key: string; duration: number; message: string }
const PHASES: Phase[] = [
  { key: "detect", duration: 600, message: "Detecting your hand..." },
  { key: "edges", duration: 550, message: "Locating the palm outline..." },
  { key: "mesh", duration: 450, message: "Mapping hand landmarks..." },
  { key: "life", duration: 650, message: "Measuring finger lengths..." },
  { key: "heart", duration: 550, message: "Measuring palm width and length..." },
  { key: "head", duration: 500, message: "Measuring thumb angle..." },
  { key: "fate", duration: 450, message: "Checking left or right hand..." },
  { key: "minor", duration: 400, message: "Classifying hand shape..." },
  { key: "mounts", duration: 450, message: "Preparing your hand-shape reading..." },
  { key: "final", duration: 500, message: "Preparing your hand-shape reading..." },
  { key: "future", duration: 550, message: "Almost ready..." },
  { key: "ready", duration: 400, message: "Ready" },
];
const CUM: number[] = (() => {
  let acc = 0;
  return PHASES.map((p) => { const start = acc; acc += p.duration; return start; });
})();
const TOTAL_MS = CUM[CUM.length - 1] + PHASES[PHASES.length - 1].duration;

interface MeshPoint { x: number; y: number }
interface MeshEdge { a: MeshPoint; b: MeshPoint }

function buildMesh(landmarkPoints: { x: number; y: number }[]): { points: MeshPoint[]; edges: MeshEdge[] } {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarkPoints) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  const points: MeshPoint[] = [];
  const COUNT = 130;
  for (let i = 0; i < COUNT; i++) {
    points.push({ x: minX + Math.random() * (maxX - minX), y: minY + Math.random() * (maxY - minY) });
  }
  // include the real landmarks so the mesh visibly anchors to true detection points
  points.push(...landmarkPoints);

  const edges: MeshEdge[] = [];
  const maxDist = Math.hypot(maxX - minX, maxY - minY) * 0.09;
  for (let i = 0; i < points.length; i++) {
    let linked = 0;
    for (let j = i + 1; j < points.length && linked < 2; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < maxDist) { edges.push({ a: points[i], b: points[j] }); linked++; }
    }
  }
  return { points, edges };
}

function palmCenter(landmarkPoints: { x: number; y: number }[]) {
  const key = [0, 5, 9, 13, 17]; // wrist + 4 MCPs
  const pts = key.map((i) => landmarkPoints[i]);
  return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
}

interface ScanSequenceProps {
  imageUrl: string;
  result: PalmAnalysisResult;
  onComplete: () => void;
}

export function ScanSequence({ imageUrl, result, onComplete }: ScanSequenceProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const completedRef = useRef(false);
  const mesh = useMemo(() => buildMesh(result.landmarkPoints), [result.landmarkPoints]);
  const center = useMemo(() => palmCenter(result.landmarkPoints), [result.landmarkPoints]);
  const particles = useMemo(
    () => Array.from({ length: 22 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, d: 3 + Math.random() * 4, delay: Math.random() * 4 })),
    [],
  );

  useEffect(() => {
    const timers: number[] = [];
    PHASES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setPhaseIndex(i), CUM[i]));
    });
    timers.push(window.setTimeout(() => { if (!completedRef.current) { completedRef.current = true; onComplete(); } }, TOTAL_MS));
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meshVisibleUntil = CUM[7]; // fades out through the "minor" phase
  const beamActiveUntil = CUM[2];
  const sacredGeoStart = CUM[9];
  // Mesh/boundary/landmarks mount conditionally at their phase boundary, so their
  // CSS animation-delay must be relative to that mount time, not to ScanSequence's
  // own mount (t=0) — otherwise the delay double-counts the time already elapsed.
  const meshFadeOutDelay = (meshVisibleUntil - CUM[1]) / 1000;
  const landmarksFadeOutDelay = meshVisibleUntil - CUM[2];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 20, overflow: "hidden" }}>
      <style>{`
        @keyframes ss-beam-sweep{0%{top:-4%}100%{top:104%}}
        @keyframes ss-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes ss-fade-out{from{opacity:1}to{opacity:0}}
        @keyframes ss-pulse-dot{0%,100%{opacity:0.35;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}
        @keyframes ss-mount-pulse{0%{stroke-opacity:0.9;r:1.2}100%{stroke-opacity:0;r:6}}
        @keyframes ss-grid-drift{0%{background-position:0 0}100%{background-position:0 40px}}
        @keyframes ss-particle-drift{0%,100%{transform:translateY(0);opacity:0.15}50%{transform:translateY(-14px);opacity:0.55}}
        @keyframes ss-text-swap{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .ss-mesh{animation:ss-fade-in 0.4s ease forwards, ss-fade-out 0.5s ease forwards ${meshFadeOutDelay}s}
        .ss-boundary{stroke-dasharray:400;stroke-dashoffset:400;animation:ss-draw-boundary ${PHASES[1].duration}ms ease forwards}
        @keyframes ss-draw-boundary{to{stroke-dashoffset:0}}
        .ss-sacred{opacity:0;animation:ss-fade-in 0.6s ease forwards ${sacredGeoStart}ms, ss-fade-out 0.5s ease forwards ${sacredGeoStart + 700}ms}
        .ss-landmarks{opacity:0;animation:ss-fade-in 0.4s ease forwards, ss-fade-out 0.5s ease forwards ${landmarksFadeOutDelay}ms}
      `}</style>

      {/* Base image */}
      <img src={imageUrl} alt="Palm being analyzed" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

      {/* Holographic grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(79,143,240,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(79,143,240,0.10) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        animation: "ss-grid-drift 6s linear infinite",
        opacity: phaseIndex < 8 ? 0.6 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: "none",
      }} />

      {/* Light particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${p.y}%`, width: p.d, height: p.d, borderRadius: "50%",
            background: "#7fc4ff", boxShadow: "0 0 6px #7fc4ff", opacity: 0.3,
            animation: `ss-particle-drift ${4 + p.d}s ease-in-out ${p.delay}s infinite`,
          }} />
        ))}
      </div>

      {/* Blue scanner beam */}
      {phaseIndex <= 1 && (
        <div style={{
          position: "absolute", left: 0, right: 0, height: "18%",
          background: "linear-gradient(180deg, transparent, rgba(79,168,240,0.28), rgba(120,200,255,0.5), rgba(79,168,240,0.28), transparent)",
          animation: `ss-beam-sweep ${beamActiveUntil}ms ease-in-out`,
          filter: "blur(1px)",
          pointerEvents: "none",
        }} />
      )}

      {/* Main SVG overlay — mesh, boundary, lines, landmarks, mounts, sacred geometry */}
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        {/* Tracking mesh */}
        {phaseIndex >= 1 && (
          <g className="ss-mesh">
            {mesh.edges.map((e, i) => (
              <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="#7fc4ff" strokeWidth={0.0009} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />
            ))}
            {mesh.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={0.0022} fill="#bfe3ff" opacity={0.5} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}

        {/* Palm boundary edge detection */}
        {phaseIndex >= 1 && (
          <polygon
            className="ss-boundary"
            points={result.palmBoundary.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="#7fc4ff" strokeWidth={2} vectorEffect="non-scaling-stroke"
            style={{ filter: "drop-shadow(0 0 3px #7fc4ff)" }}
          />
        )}

        {/* Real detected landmark markers */}
        {phaseIndex >= 2 && (
          <g className="ss-landmarks">
            {result.landmarkPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={0.007} fill="#fff6df" style={{ filter: "drop-shadow(0 0 3px #ffd98a)", animation: `ss-pulse-dot 1.6s ease-in-out ${i * 0.03}s infinite` }} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}

        {/* Sacred geometry */}
        <g className="ss-sacred" style={{ transformOrigin: `${center.x}px ${center.y}px` }}>
          {[0.02, 0.035, 0.05].map((r, i) => (
            <circle key={i} cx={center.x} cy={center.y} r={r} fill="none" stroke="#e8b23f" strokeWidth={0.5} strokeOpacity={0.55} vectorEffect="non-scaling-stroke" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => {
            const ang = (i / 8) * Math.PI * 2;
            const x2 = center.x + Math.cos(ang) * 0.05;
            const y2 = center.y + Math.sin(ang) * 0.05;
            return <line key={i} x1={center.x} y1={center.y} x2={x2} y2={y2} stroke="#e8b23f" strokeWidth={0.4} strokeOpacity={0.4} vectorEffect="non-scaling-stroke" />;
          })}
        </g>
      </svg>

      {/* Status + progress */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 20px 20px", background: "linear-gradient(180deg, transparent, rgba(6,4,14,0.85) 55%)" }}>
        <div key={phaseIndex} style={{ color: "#BC6A4D", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10, animation: "ss-text-swap 0.35s ease" }}>
          {PHASES[phaseIndex].message}
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((CUM[phaseIndex] + PHASES[phaseIndex].duration) / TOTAL_MS) * 100}%`, background: "linear-gradient(90deg,#BC6A4D,#e8b23f)", borderRadius: 4, boxShadow: "0 0 10px rgba(232,178,63,0.6)", transition: "width 0.4s ease" }} />
        </div>
      </div>
    </div>
  );
}
