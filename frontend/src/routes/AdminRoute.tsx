import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useAuthHydrated } from "@/features/auth/hooks/useAuthHydrated";
import { isAdminUser } from "@/features/admin/utils/roles";
import Loader from "@/components/Loader/Loader";

function AuthSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC]">
      <Loader />
    </div>
  );
}

/**
 * Requires an authenticated ADMIN / SUPERADMIN session.
 * Unauthenticated users go to login; other users go home.
 */
export function AdminRoute() {
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

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
