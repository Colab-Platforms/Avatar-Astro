import "./Loader.css";

interface OrbitalLoaderProps {
  /** Optional staged captions; the highlight loops purely in CSS and never gates the real work. */
  steps?: string[];
  size?: number;
  className?: string;
}

/**
 * Concentric orbital rings around a glowing core, planets travelling their orbits.
 * Presentation only — mount it while real work is running and unmount when it settles.
 */
const OrbitalLoader = ({ steps, size = 280, className = "" }: OrbitalLoaderProps) => (
  <div className={`orbital-loader ${className}`}>
    <div className="orbital-stage" style={{ width: `min(${size}px, 72vw)`, height: `min(${size}px, 72vw)` }} aria-hidden="true">
      <span className="orbital-ring orbital-ring-1" />
      <span className="orbital-ring orbital-ring-2" />
      <span className="orbital-ring orbital-ring-3" />
      <span className="orbital-track orbital-track-1"><i className="orbital-planet orbital-planet-1" /></span>
      <span className="orbital-track orbital-track-2"><i className="orbital-planet orbital-planet-2" /></span>
      <span className="orbital-track orbital-track-3"><i className="orbital-planet orbital-planet-3" /></span>
      <span className="orbital-core" />
    </div>
    {steps && steps.length > 0 && (
      <ul className="orbital-steps">
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

export default OrbitalLoader;
