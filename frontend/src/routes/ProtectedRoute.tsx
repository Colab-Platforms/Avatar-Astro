import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthHydrated } from "@/features/auth/hooks/useAuthHydrated";

function AuthSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC]">
      <Loader2 className="h-7 w-7 animate-spin text-[#592209]" />
    </div>
  );
}

/** Requires a valid session. Redirects to /login otherwise. */
export function ProtectedRoute() {
  const location = useLocation();
  const ready = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!ready) return <AuthSpinner />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}

/**
 * Requires authentication AND a completed profile.
 * Incomplete Google profiles are sent to /google-onboarding.
 */
export function CompletedProfileRoute() {
  const location = useLocation();
  const ready = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!ready) return <AuthSpinner />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (user && user.profileCompleted === false) {
    return <Navigate to="/google-onboarding" replace />;
  }

  return <Outlet />;
}

/** Authenticated users who still need to finish Google onboarding. */
export function GoogleOnboardingRoute() {
  const ready = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!ready) return <AuthSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.profileCompleted) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
