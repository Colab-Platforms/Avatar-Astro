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

/**
 * Container for the catalogue editors (Puja, Chadhawa, Shop). They use the shared theme tokens (text-foreground,
 * bg-card, border-border...), which the admin layout maps to the admin light palette. It must stay a LIGHT surface:
 * a dark wrapper here makes their dark text unreadable.
 */
export function LegacyShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl rounded-xl border border-[#E8E3DC] bg-white p-4 text-[#1F1B16] shadow-[0_1px_2px_rgba(31,27,22,0.04)] sm:p-6">{children}</div>;
}
