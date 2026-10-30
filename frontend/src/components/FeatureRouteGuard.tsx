import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authRequest } from "@/lib/authClient";
import { Loader2, Wrench } from "lucide-react";
import { featureForPath, useFeatureFlags } from "@/lib/featureFlags";

/**
 * Direct visits to a tool the admin switched off get a clear notice instead of a
 * page that fails. Only tool routes are ever gated; every other page renders as before.
 * While the config is first loading, a gated tool path shows a brief spinner; if the
 * config cannot be loaded the page renders normally (the API still enforces the switch).
 */
const recentlyOpened = new Map<string, number>();
const REOPEN_AFTER_MS = 30_000;

export default function FeatureRouteGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { status, isPathDisabled } = useFeatureFlags(pathname);
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const feature = featureForPath(pathname);
  const available = feature !== null && (status === "ready" || status === "failed") && !isPathDisabled(pathname);

  // Customer activity: a signed-in visitor opened a tool page. Recorded as "opened" only (not "used"), once per
  // 30 s per page, silently (tracking must never get in the way), and attributed server-side to the token's user.
  useEffect(() => {
    if (!signedIn || !available || !feature) return;
    const last = recentlyOpened.get(feature) ?? 0;
    if (Date.now() - last < REOPEN_AFTER_MS) return;
    recentlyOpened.set(feature, Date.now());
    authRequest("/me/activity", { method: "POST", body: { feature, event: "opened" } }).catch(() => {});
  }, [signedIn, available, feature]);

  if (featureForPath(pathname) === null) return <>{children}</>;

  if (status === "idle" || status === "loading") {
    return (
      <div role="status" className="flex min-h-[60vh] items-center justify-center text-[#301607]/70">
        <Loader2 className="h-6 w-6 animate-spin text-[#803003]" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (isPathDisabled(pathname)) {
    return (
      <div className="relative z-10 flex min-h-[70vh] items-center justify-center px-4 pt-24">
        <div role="alert" className="max-w-md rounded-2xl border border-[#803003]/20 bg-[#F5E9D6] p-8 text-center text-[#301607] shadow-lg">
          <Wrench className="mx-auto mb-3 h-8 w-8 text-[#803003]" />
          <h1 className="font-display text-2xl tracking-wide">Temporarily unavailable</h1>
          <p className="mt-2 text-sm text-[#301607]/75">This Seva is switched off for now. Please check back soon, or explore something else.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
            <Link to="/" className="rounded-lg bg-[#803003] px-4 py-2 font-medium text-white hover:bg-[#803003]/90">Back to home</Link>
            <Link to="/inner-voice/dashboard" className="rounded-lg border border-[#803003]/30 px-4 py-2 hover:bg-[#E58A45]/20">Karma Score</Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
