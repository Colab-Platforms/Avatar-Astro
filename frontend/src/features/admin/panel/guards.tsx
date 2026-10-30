import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useMainAdmin } from "./api";
import { ErrorState, Loading } from "./ui";

/**
 * UX guard for main-admin pages. The real enforcement is the backend: every
 * /api/admin panel endpoint re-checks the account in the database, so hiding
 * this wrapper (or editing local storage) gains nothing.
 */
export function MainOnly({ children }: { children: ReactNode }) {
  const { isMain, denied, isLoading, error } = useMainAdmin();
  if (isLoading) return <Loading label="Checking access…" />;
  if (error) return <ErrorState message="Could not verify your access. Please reload." />;
  if (denied || !isMain) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-[#E8E3DC] bg-white p-8 text-center" role="alert">
        <ShieldAlert className="h-8 w-8 text-[#803003]" />
        <h2 className="text-xl font-semibold text-[#1F1B16]">Main admin only</h2>
        <p className="text-sm text-[#4A423A]">This section is restricted to the main administrator account.</p>
        <Link to="/admin" className="text-sm text-[#803003] underline">Back to overview</Link>
      </div>
    );
  }
  return <>{children}</>;
}

/** The older catalogue editors were built for a dark theme; keep them readable on the cream shell. */
export function LegacyShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl rounded-2xl bg-[#081426] p-4 text-white shadow-md sm:p-6">{children}</div>;
}
