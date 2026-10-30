import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { MainOnly } from "../panel/guards";

const TITLE_BY_PATH: Record<string, string> = {
  "/admin": "Overview",
  "/admin/users": "Users",
  "/admin/activity": "Customer activity",
  "/admin/tools": "Astrology tools",
  "/admin/inner-voice": "Inner Voice",
  "/admin/devotion": "Devotion & Live",
  "/admin/shop-orders": "Shop & Orders",
  "/admin/content": "Content & banners",
  "/admin/payments": "Payments & plans",
  "/admin/integrations": "AI & integrations",
  "/admin/reports": "Reports",
  "/admin/settings": "Settings & audit",
  "/admin/puja": "Puja",
  "/admin/chadhawa": "Chadhawa",
  "/admin/shop/categories": "Shop categories",
  "/admin/shop/products": "Shop products",
};

const FONT_HREF = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

/**
 * Admin-only typography. The public site uses decorative display fonts; the admin panel is a working tool, so
 * everything inside `.admin-ui` uses Inter at normal case. Scoped, so the public site is untouched.
 */
const ADMIN_CSS = `
.admin-ui, .admin-ui *:not(code):not(pre):not(.font-mono) { font-family: "Inter", ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif !important; text-transform: none !important; letter-spacing: normal; }
.admin-ui { -webkit-font-smoothing: antialiased; font-size: 14.5px; }
.admin-ui h1, .admin-ui h2, .admin-ui h3, .admin-ui h4 { letter-spacing: -0.01em !important; }
.admin-ui .font-mono, .admin-ui code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important; }
.admin-ui table { font-variant-numeric: tabular-nums; }
`;

export function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = useMemo(() => TITLE_BY_PATH[location.pathname] ?? "Admin", [location.pathname]);

  // Load Inter only for the admin area (the public site never requests it).
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <div className="admin-ui flex h-screen overflow-hidden bg-[#FAF8F5] text-[#1F1B16]">
      <style>{ADMIN_CSS}</style>
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <AdminHeader title={title} onMenuClick={() => setMobileOpen(true)} />
        <main id="admin-main" className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Every admin screen (including the puja / chadhawa / shop editors) is main-admin only; the API enforces it too. */}
          <MainOnly>
            <Outlet />
          </MainOnly>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
