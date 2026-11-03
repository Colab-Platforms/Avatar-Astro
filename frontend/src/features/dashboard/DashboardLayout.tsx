import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpenText,
  Bookmark,
  CalendarCheck,
  CalendarHeart,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  MessageCircleHeart,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Your space",
    items: [
      { to: "/dashboard", label: "Overview", icon: Home, end: true },
      { to: "/dashboard/readings", label: "My Readings", icon: BookOpenText },
      { to: "/dashboard/activity", label: "My Activity", icon: CalendarHeart },
      { to: "/dashboard/saved", label: "Saved", icon: Bookmark },
      { to: "/dashboard/conversations", label: "My Conversations", icon: MessageCircleHeart },
    ],
  },
  {
    label: "Bookings & orders",
    items: [
      { to: "/dashboard/bookings", label: "My Bookings", icon: CalendarCheck },
      { to: "/dashboard/orders", label: "My Orders", icon: PackageOpen },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/dashboard/profile", label: "Profile & Settings", icon: UserCog }],
  },
];

const TITLE_BY_PATH: Record<string, string> = {
  "/dashboard": "Dashboard Overview",
  "/dashboard/readings": "My Readings",
  "/dashboard/activity": "My Activity",
  "/dashboard/saved": "Saved Items",
  "/dashboard/conversations": "My Conversations",
  "/dashboard/bookings": "My Bookings",
  "/dashboard/orders": "My Orders",
  "/dashboard/profile": "Profile & Settings",
};

function getDashboardTitle(pathname: string): string {
  if (TITLE_BY_PATH[pathname]) return TITLE_BY_PATH[pathname];
  if (pathname.startsWith("/dashboard/readings/")) return "Reading Details";
  if (pathname.startsWith("/dashboard/conversations/")) return "Conversation Details";
  return "Dashboard";
}

const KEY = "mb-dashboard-sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};
const saveCollapsed = (v: boolean) => {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* private mode */
  }
};

function Initials({ name, photo, size = "md" }: { name: string; photo?: string | null; size?: "sm" | "md" }) {
  const t = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "M";
  const sizeCls = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-xs";
  if (photo) {
    return <img src={photo} alt="" aria-hidden="true" className={cn("shrink-0 rounded-lg object-cover", sizeCls)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] font-semibold text-[#F3E8D4]",
        sizeCls
      )}
    >
      {t}
    </span>
  );
}

export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user) as { firstName?: string; lastName?: string; email?: string; profileImage?: string | null } | null;
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Account";
  const title = useMemo(() => getDashboardTitle(location.pathname), [location.pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      saveCollapsed(next);
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5] text-[#2A1A10]">
      {/* Desktop Sidebar (Industry standard left full-height rail) */}
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col border-r border-[#E9DDC9] bg-[#FFFDF8] transition-[width] duration-200 ease-in-out lg:flex",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-[#E9DDC9] px-4",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          {collapsed ? (
            <Link to="/" className="flex items-center justify-center" title="MyBhagya - Go to website homepage">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">
                MB
              </span>
            </Link>
          ) : (
            <Link to="/" className="flex min-w-0 items-center gap-2.5" title="Go to website homepage">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">
                MB
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-[#2A1A10]">MyBhagya</p>
                <p className="truncate text-[0.68rem] text-[#8C7A6B]">Customer dashboard</p>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Dashboard sections" className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          {GROUPS.map((g) => (
            <div key={g.label}>
              {!collapsed ? (
                <p className="px-3 pb-1.5 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#A8803A]">
                  {g.label}
                </p>
              ) : (
                <span aria-hidden="true" className="mx-2 my-2 block border-t border-[#EFE4D0] first:hidden" />
              )}
              <ul className="space-y-1">
                {g.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex items-center rounded-xl text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]",
                          collapsed ? "h-10 w-full justify-center px-0" : "gap-3 px-3 py-2",
                          isActive
                            ? "bg-[#F3E8D4] font-semibold text-[#803003]"
                            : "text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-[#803003]" : "text-[#8C7A6B] group-hover:text-[#2A1A10]"
                            )}
                            aria-hidden="true"
                          />
                          {!collapsed && <span className="truncate">{label}</span>}
                          {collapsed && <span className="sr-only">{label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User Card & Logout Footer */}
        <div className="border-t border-[#E9DDC9] p-3">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <Initials name={name} photo={user?.profileImage} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#2A1A10]">{name}</p>
                  {user?.email && <p className="truncate text-xs text-[#8C7A6B]">{user.email}</p>}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2.5 rounded-lg px-2.5 text-xs font-medium text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-[#E9DDC9] bg-white text-[#2A1A10]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold">Confirm logout</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#6E5D4E]">
                      Are you sure you want to log out of your dashboard?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#E0D2BA] bg-white text-[#2A1A10] hover:bg-[#F6EEDF]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-[#803003] text-white hover:bg-[#6B2802]">
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div title={name}>
                <Initials name={name} photo={user?.profileImage} />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    title="Log out"
                    aria-label="Log out"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5A493C] transition-colors hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-[#E9DDC9] bg-white text-[#2A1A10]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold">Confirm logout</AlertDialogTitle>
                    <AlertDialogDescription className="text-[#6E5D4E]">
                      Are you sure you want to log out of your dashboard?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-[#E0D2BA] bg-white text-[#2A1A10] hover:bg-[#F6EEDF]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-[#803003] text-white hover:bg-[#6B2802]">
                      Log out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer (Slide-over) */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-[#E9DDC9] bg-[#FFFDF8] shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-[#E9DDC9] px-4">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3A1C0C] text-xs font-semibold text-[#F3E8D4]">
                MB
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-[#2A1A10]">MyBhagya</p>
                <p className="text-[0.68rem] text-[#8C7A6B]">Customer dashboard</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5A493C] hover:bg-[#F6EEDF]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <p className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#A8803A]">
                  {g.label}
                </p>
                <ul className="space-y-1">
                  {g.items.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-[#F3E8D4] font-semibold text-[#803003]"
                              : "text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-[#E9DDC9] p-4">
            <div className="mb-3 flex items-center gap-3">
              <Initials name={name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2A1A10]">{name}</p>
                {user?.email && <p className="truncate text-xs text-[#8C7A6B]">{user.email}</p>}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 rounded-xl px-3 text-[#5A493C] hover:bg-[#F6EEDF] hover:text-[#2A1A10]"
            >
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </aside>
      </div>

      {/* Main Content Column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#E9DDC9] bg-[#FFFDF8]/90 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#2A1A10] hover:bg-[#F6EEDF] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#5A493C] transition-colors hover:bg-[#F6EEDF] hover:text-[#2A1A10] lg:flex"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <div className="hidden h-4 w-px bg-[#E9DDC9] sm:block" />

            {/* Breadcrumb / Title */}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-[#2A1A10] sm:text-base">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs sm:gap-4 sm:text-sm">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-[#6E5D4E] transition-colors hover:text-[#803003]"
              title="Return to public website"
            >
              <span>View site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <div className="hidden h-4 w-px bg-[#E9DDC9] sm:block" />

            <Link
              to="/dashboard/profile"
              className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-[#F6EEDF]"
              title="Profile settings"
            >
              <Initials name={name} photo={user?.profileImage} size="sm" />
              <span className="hidden max-w-[10rem] truncate font-medium text-[#2A1A10] sm:inline-block">
                {name}
              </span>
            </Link>
          </div>
        </header>

        {/* Scrollable Main Dashboard Area */}
        <main id="dashboard-main" className="flex-1 overflow-y-auto bg-[#FAF8F5] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
