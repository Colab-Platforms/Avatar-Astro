import { useEffect } from "react";
import OrbitalLoader from "./OrbitalLoader";

interface FullScreenLoaderProps {
  /** Heading shown under the orbital animation. */
  title: string;
  /** Optional line under the heading. */
  description?: string;
  /** Optional staged captions; they loop in CSS and never gate the real work. */
  steps?: string[];
  testId?: string;
}

/**
 * The one full-viewport loader used by every feature while a real request or calculation runs.
 * Same orbital animation, palette and layout as the Ratna Jyotish loader.
 */
const FullScreenLoader = ({ title, description, steps, testId = "feature-loader" }: FullScreenLoaderProps) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#FBF5EC] px-6 text-center"
      data-testid={testId}
    >
      <OrbitalLoader size={300} />
      <div role="status" aria-live="polite" className="mt-9">
        <h2 className="font-home-serif text-2xl font-semibold tracking-wide text-[#592209] sm:text-3xl">{title}</h2>
        {description && <p className="mt-3 max-w-md text-base text-[#6B4A37]">{description}</p>}
      </div>
      {steps && steps.length > 0 && (
        <ul className="orbital-steps" aria-hidden="true">
          {steps.map((s, i) => (
            <li key={s} className="orbital-step" style={{ animationDelay: `${i * 1.6}s`, animationDuration: `${steps.length * 1.6}s` }}>
              <span className="orbital-step-dot" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FullScreenLoader;
