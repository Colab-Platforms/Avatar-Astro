import { useId } from "react";
import type { GemstoneInfo } from "./types";

export const GemIllustration = ({ stone, size = 120 }: { stone: GemstoneInfo; size?: number | string }) => {
  const uid = useId().replace(/:/g, "");
  return (
    <svg role="img" aria-label={`${stone.name} illustration`} width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={stone.colour} />
          <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <polygon points="30,38 90,38 108,58 60,108 12,58" fill={stone.colour} stroke="#d4a64a" strokeWidth="2" />
      <polygon points="30,38 90,38 108,58 60,108 12,58" fill={`url(#${uid}-g)`} opacity="0.7" />
      <polygon points="30,38 60,58 12,58" fill="#ffffff" opacity="0.22" />
      <polygon points="90,38 60,58 108,58" fill="#000000" opacity="0.14" />
      <polygon points="60,58 108,58 60,108" fill="#000000" opacity="0.22" />
      <polygon points="12,58 60,58 60,108" fill="#ffffff" opacity="0.08" />
      <polygon points="30,38 60,14 90,38" fill={stone.colour} stroke="#d4a64a" strokeWidth="2" opacity="0.9" />
      <polygon points="30,38 60,14 60,38" fill="#ffffff" opacity="0.2" />
    </svg>
  );
};

const Ring = ({ r, dash, className }: { r: number; dash?: string; className: string }) => (
  <svg viewBox="0 0 200 200" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden="true">
    <circle cx="100" cy="100" r={r} fill="none" stroke="#d4a64a" strokeOpacity="0.55" strokeWidth="1" strokeDasharray={dash} />
    {/* a few small jewels on the ring, evenly spaced */}
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3;
      return <circle key={i} cx={100 + Math.cos(a) * r} cy={100 + Math.sin(a) * r} r="2.2" fill="#f0d58a" />;
    })}
  </svg>
);

const STARS: [number, number, number][] = [
  [8, 22, 2], [90, 14, 2], [14, 78, 1.5], [86, 80, 2], [50, 4, 1.5], [52, 96, 1.5],
];

/**
 * The gemstone on a slowly turning gold halo with a soft glow. Pure CSS motion
 * (transform/opacity only), switched off for reduced-motion users.
 */
const GemStage = ({ stone }: { stone: GemstoneInfo }) => (
  <div className="relative mx-auto aspect-square w-full max-w-[200px] min-[420px]:max-w-[240px] md:max-w-[300px] lg:max-w-[340px]">
    <div
      className="ratna-glow absolute inset-[14%] rounded-full blur-2xl"
      style={{ background: `radial-gradient(circle, ${stone.colour}aa 0%, rgba(212,166,74,0.25) 55%, transparent 75%)` }}
      aria-hidden="true"
    />
    <Ring r={96} className="ratna-ring" />
    <Ring r={78} dash="2 5" className="ratna-ring ratna-ring-rev" />
    <div
      className="absolute inset-[26%] rounded-full border border-[#d4a64a]/40"
      style={{ boxShadow: "0 0 40px rgba(212,166,74,0.25) inset" }}
      aria-hidden="true"
    />
    <div className="absolute inset-[29%] flex items-center justify-center">
      <div className="ratna-float h-full w-full" style={{ filter: `drop-shadow(0 0 18px ${stone.colour}99)` }}>
        <GemIllustration stone={stone} size="100%" />
      </div>
    </div>
    {STARS.map(([x, y, s], i) => (
      <span
        key={i}
        aria-hidden="true"
        className="ratna-star absolute rounded-full bg-[#f5e4b0]"
        style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${i * 0.6}s` }}
      />
    ))}
  </div>
);

export default GemStage;
