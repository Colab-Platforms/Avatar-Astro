import { useEffect } from "react";
import RatnaEmblem from "./RatnaEmblem";

const STARS = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 1 + (i % 3),
  delay: (i % 7) * 0.4,
}));

/**
 * Full-viewport loader shown while the real calculation request is running.
 * No fake percentage or countdown: it stays until the request settles.
 */
const RatnaLoader = () => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="ratna-loader fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#050d1f] px-6 text-center"
      data-testid="ratna-loader"
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="ratna-star absolute rounded-full bg-[#f5e4b0]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}

      <div className="relative flex h-[min(70vw,320px)] w-[min(70vw,320px)] items-center justify-center" aria-hidden="true">
        <span className="ratna-ring absolute inset-0 rounded-full border border-[#d4a64a]/60" />
        <span className="ratna-ring ratna-ring-rev absolute inset-[11%] rounded-full border border-dashed border-[#d4a64a]/50" />
        <span className="ratna-ring absolute inset-[22%] rounded-full border border-[#d4a64a]/40" />
        <span className="ratna-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2b705] shadow-[0_0_12px_#f2b705]" />
        </span>
        <span className="ratna-orbit ratna-ring-rev absolute inset-[11%]">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7fb0ff] shadow-[0_0_10px_#7fb0ff]" />
        </span>
        <div className="ratna-pulse">
          <RatnaEmblem size={120} />
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-10">
        <h2 className="font-astra text-2xl tracking-wide text-[#f0d58a] sm:text-3xl">
          Reading Your Birth Chart
        </h2>
        <p className="mt-3 max-w-md text-base text-slate-300">
          Calculating your gemstone associations and traditional guidance…
        </p>
      </div>
    </div>
  );
};

export default RatnaLoader;
