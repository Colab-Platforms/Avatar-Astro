import RatnaImage from "./RatnaImage";
import type { GemstoneInfo } from "./types";

export { GemIllustration } from "./GemIllustration";

const Ring = ({ r, dash, className }: { r: number; dash?: string; className: string }) => (
  <svg viewBox="0 0 200 200" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden="true">
    <circle cx="100" cy="100" r={r} fill="none" stroke="#B9722F" strokeOpacity="0.5" strokeWidth="1" strokeDasharray={dash} />
    {/* a few small jewels on the ring, evenly spaced */}
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3;
      return <circle key={i} cx={100 + Math.cos(a) * r} cy={100 + Math.sin(a) * r} r="2.2" fill="#E58A45" />;
    })}
  </svg>
);

/**
 * The Ratna photograph in a round frame on a slowly turning gold halo.
 * Pure CSS motion (transform only), switched off for reduced-motion users.
 */
const GemStage = ({ stone }: { stone: GemstoneInfo }) => (
  <div className="relative mx-auto aspect-square w-full max-w-[220px] min-[420px]:max-w-[260px] md:max-w-[320px] lg:max-w-[360px]">
    <Ring r={96} className="ratna-ring" />
    <Ring r={80} dash="2 5" className="ratna-ring ratna-ring-rev" />
    <div className="absolute inset-[15%] overflow-hidden rounded-full border-[3px] border-[#592209]/70 bg-[#F5E9D6] shadow-[0_10px_30px_rgba(89,34,9,0.28)]">
      <RatnaImage stone={stone} priority className="h-full w-full" />
    </div>
  </div>
);

export default GemStage;
