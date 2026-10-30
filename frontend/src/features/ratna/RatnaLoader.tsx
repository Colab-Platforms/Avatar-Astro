import { useEffect } from "react";
import OrbitalLoader from "@/components/Loader/OrbitalLoader";

const STEPS = [
  "Mapping planetary positions",
  "Reading your birth chart",
  "Matching Ratna associations",
  "Preparing your guidance",
];

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
      className="ratna-loader fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#FBF5EC] px-6 text-center"
      data-testid="ratna-loader"
    >
      <OrbitalLoader size={300} />

      <div role="status" aria-live="polite" className="mt-9">
        <h2 className="font-home-serif text-2xl font-semibold tracking-wide text-[#592209] sm:text-3xl">
          Reading Your Birth Chart
        </h2>
        <p className="mt-3 max-w-md text-base text-[#6B4A37]">
          Calculating your Ratna associations and traditional guidance…
        </p>
      </div>
      <ul className="orbital-steps" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li key={s} className="orbital-step" style={{ animationDelay: `${i * 1.6}s`, animationDuration: `${STEPS.length * 1.6}s` }}>
            <span className="orbital-step-dot" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RatnaLoader;
