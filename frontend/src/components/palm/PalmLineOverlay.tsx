import { useMemo, useState } from "react";
import type { PalmAnalysisResult, PalmLineId } from "@/lib/palmAnalysis";

const MEANING: Record<PalmLineId, string> = {
  heart: "You form deep emotional connections and value loyalty above all.",
  head: "You balance sharp analytical thinking with real creative insight.",
  life: "Your vitality and adaptability carry you steadily through change.",
  fate: "A clear inner sense of purpose guides your path forward.",
  sun: "Natural charisma and creativity draw recognition your way.",
};

function lengthLabel(rank: number, total: number): string {
  if (rank === 0) return "Short";
  if (rank === total - 1) return "Long";
  return "Medium";
}

function curvatureLabel(ratio: number): string {
  if (ratio < 1.06) return "Straight";
  if (ratio < 1.18) return "Gently Curved";
  return "Deeply Curved";
}

interface PalmLineOverlayProps {
  imageUrl: string;
  analysis: PalmAnalysisResult;
}

export function PalmLineOverlay({ imageUrl, analysis }: PalmLineOverlayProps) {
  const [active, setActive] = useState<PalmLineId | null>(null);

  const lineIds = useMemo(() => Object.keys(analysis.lines) as PalmLineId[], [analysis.lines]);
  const lengthRanks = useMemo(() => {
    const sorted = [...lineIds].sort((a, b) => analysis.lines[a].length - analysis.lines[b].length);
    const ranks: Record<string, number> = {};
    sorted.forEach((id, i) => { ranks[id] = i; });
    return ranks;
  }, [lineIds, analysis.lines]);

  const activeLine = active ? analysis.lines[active] : null;
  const activeMetrics = activeLine
    ? {
      length: lengthLabel(lengthRanks[activeLine.id], lineIds.length),
      curvature: curvatureLabel(activeLine.length / Math.max(activeLine.straightLength, 0.001)),
      strength: Math.round(clamp01(0.5 + (activeLine.length / Math.max(activeLine.straightLength, 0.001) - 1) * 1.5 + (lengthRanks[activeLine.id] / Math.max(lineIds.length - 1, 1)) * 0.3) * 100),
    }
    : null;

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: "#FBF5EC" }}>
      <img src={imageUrl} alt="Your analyzed palm" style={{ width: "100%", display: "block" }} />

      <svg
        viewBox="0 0 1 1" preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {lineIds.map((id) => {
          const line = analysis.lines[id];
          const isActive = active === id;
          const isDimmed = active !== null && !isActive;
          return (
            <path
              key={id}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={isActive ? 3.2 : 2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive((cur) => (cur === id ? null : cur))}
              onClick={() => setActive((cur) => (cur === id ? null : id))}
              style={{
                cursor: "pointer",
                pointerEvents: "stroke",
                opacity: isDimmed ? 0.28 : 1,
                filter: `drop-shadow(0 0 ${isActive ? 6 : 3}px ${line.color})`,
                transition: "opacity 0.3s ease, stroke-width 0.25s ease, filter 0.25s ease",
              }}
            />
          );
        })}
        {/* Wider invisible hit-area so thin lines are easy to hover/tap */}
        {lineIds.map((id) => (
          <path
            key={`${id}-hit`}
            d={analysis.lines[id].path}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            vectorEffect="non-scaling-stroke"
            onMouseEnter={() => setActive(id)}
            onMouseLeave={() => setActive((cur) => (cur === id ? null : cur))}
            onClick={() => setActive((cur) => (cur === id ? null : id))}
            style={{ cursor: "pointer", pointerEvents: "stroke" }}
          />
        ))}
      </svg>

      {/* Legend / line picker */}
      <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", flexWrap: "wrap", gap: 6, maxWidth: "calc(100% - 20px)" }}>
        {lineIds.map((id) => {
          const line = analysis.lines[id];
          return (
            <button
              key={id}
              onClick={() => setActive((cur) => (cur === id ? null : id))}
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive((cur) => (cur === id ? null : cur))}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: active === id ? `${line.color}26` : "rgba(0,0,0,0.55)",
                border: `1px solid ${active === id ? line.color : "rgba(255,255,255,0.14)"}`,
                borderRadius: 20, padding: "4px 10px", cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ width: 10, height: 3, borderRadius: 2, background: line.color, boxShadow: `0 0 6px ${line.color}` }} />
              <span style={{ fontSize: 11, color: active === id ? line.color : "rgba(255,255,255,0.7)", fontWeight: 700 }}>{line.label}</span>
            </button>
          );
        })}
      </div>

      {/* Floating info card */}
      {activeLine && activeMetrics && (
        <div style={{
          position: "absolute", top: 14, right: 14, maxWidth: 240,
          background: "#FBF5EC", border: `1px solid ${activeLine.color}55`,
          borderRadius: 14, padding: "14px 16px",
          boxShadow: `0 0 24px ${activeLine.color}33`,
          animation: "pl-card-in 0.25s ease",
        }}>
          <style>{`@keyframes pl-card-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{ color: activeLine.color, fontWeight: 800, fontSize: 15, marginBottom: 10, textShadow: `0 0 8px ${activeLine.color}` }}>
            {activeLine.label}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {[["Strength", `${activeMetrics.strength}%`], ["Length", activeMetrics.length], ["Curvature", activeMetrics.curvature]].map(([k, v]) => (
              <div key={k} style={{ background: `${activeLine.color}15`, border: `1px solid ${activeLine.color}35`, borderRadius: 8, padding: "4px 8px" }}>
                <div style={{ fontSize: 9, color: `${activeLine.color}cc`, letterSpacing: "0.1em", textTransform: "uppercase" }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: activeLine.color }}>{v}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(48,22,7,0.85)" }}>{MEANING[activeLine.id]}</p>
        </div>
      )}

      {!activeLine && (
        <div style={{
          position: "absolute", top: 14, left: 14, fontSize: 11, color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.08em", background: "rgba(89,34,9,0.07)", borderRadius: 20, padding: "5px 12px",
        }}>
          ✦ Hover or tap a line ✦
        </div>
      )}
    </div>
  );
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
