import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

const TITLE_BY_PATH: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/puja": "Puja",
  "/admin/chadhawa": "Chadhawa",
  "/admin/shop": "Shop",
};

export function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => {
    return TITLE_BY_PATH[location.pathname] ?? "Admin";
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBF5EC] text-foreground">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col h-full">
        <AdminHeader title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
