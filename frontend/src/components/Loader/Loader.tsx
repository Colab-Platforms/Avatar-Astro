import OrbitalLoader from "./OrbitalLoader";

const Loader = () => (
  <div className="orbital-fullscreen" role="status" aria-label="Loading">
    <OrbitalLoader size={220} />
  </div>
);

export default Loader;
