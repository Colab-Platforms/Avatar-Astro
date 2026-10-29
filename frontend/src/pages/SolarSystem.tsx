import { useEffect } from "react";
import { Link } from "react-router-dom";

// The explorer is a separate app (see /solar-system-app) with its own Auth0 login. Auth0's login page
// refuses to render inside a frame, so the app cannot be embedded in an iframe: we open it as a
// normal full page instead. In development it defaults to the local server; in production it must
// be configured, because localhost would point at the visitor's own computer.
const SOLAR_SYSTEM_URL: string = import.meta.env.VITE_SOLAR_SYSTEM_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");

export default function SolarSystem() {
  useEffect(() => {
    document.title = "3D Solar System Explorer | Spiritual AI";
    // replace(), not assign(): this route is swapped out of history, so the browser Back button
    // returns to the page the visitor came from instead of bouncing back here.
    if (SOLAR_SYSTEM_URL) window.location.replace(SOLAR_SYSTEM_URL);
    return () => {
      document.title = "Spiritual AI";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white" role="status">
      {SOLAR_SYSTEM_URL ? (
        <>
          <h1 className="font-display text-2xl tracking-wider">Opening the Solar System…</h1>
          <p className="max-w-md text-white/70">
            If nothing happens, <a className="underline" href={SOLAR_SYSTEM_URL}>open it here</a>.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl tracking-wider">Solar System Explorer is unavailable</h1>
          <p className="max-w-md text-white/70">This experience is temporarily offline. Please check back soon.</p>
        </>
      )}
      <Link to="/" className="mt-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm uppercase tracking-widest hover:bg-white/10">
        Back to home
      </Link>
    </div>
  );
}
