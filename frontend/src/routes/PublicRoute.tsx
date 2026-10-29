import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useAuthHydrated } from "@/features/auth/hooks/useAuthHydrated";
import { getPostAuthPath } from "@/features/auth/utils/postAuthRedirect";

function AuthSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF5EC]">
      <Loader2 className="h-7 w-7 animate-spin text-[#592209]" />
    </div>
  );
}

/** Prevents logged-in users from seeing login/register/forgot flows. */
export function PublicRoute() {
  const ready = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!ready) return <AuthSpinner />;

  if (isAuthenticated) {
    return <Navigate to={getPostAuthPath(user)} replace />;
  }

  return <Outlet />;
}
