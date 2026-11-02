import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, BookOpenText, CalendarHeart, Bookmark, MessageCircleHeart, CalendarCheck, PackageOpen, UserCog, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface Item { to: string; label: string; icon: LucideIcon; end?: boolean }
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
  { label: "Account", items: [{ to: "/dashboard/profile", label: "Profile & Settings", icon: UserCog }] },
];

const KEY = "mb-dashboard-sidebar-collapsed";
const readCollapsed = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
const saveCollapsed = (v: boolean) => { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode: keep the choice for this visit only */ } };

function Initials({ name }: { name: string }) {
  const t = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "M";
  return <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3A1C0C] font-home-serif text-sm font-semibold text-[#F3E8D4]">{t}</span>;
}

/**
 * Dashboard shell. Below `lg` the single nav becomes a horizontally scrollable pill bar; from `lg` it is a sticky sidebar that can
 * collapse to an icon rail (choice remembered in this browser). Same links, same order, same routes at every size.
 */
export default function DashboardLayout() {
  const user = useAuthStore((s) => s.user) as { firstName?: string; lastName?: string; email?: string } | null;
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // On the scrolling pill bar (below lg) keep the current section in view.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 1024px)").matches) el.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [pathname]);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Your account";
  const toggle = () => setCollapsed((c) => { saveCollapsed(!c); return !c; });

  return (
    <div className="relative z-10 min-h-screen bg-[#F7F1E6] bg-[radial-gradient(60rem_28rem_at_85%_-5%,rgba(184,137,59,0.10),transparent)] pb-20 pt-24 text-[#2A1A10] lg:pt-28">
      <div className={cn("mx-auto max-w-[1360px] px-4 sm:px-6 lg:grid lg:gap-8 lg:px-8 lg:transition-[grid-template-columns] lg:duration-200 motion-reduce:lg:transition-none", collapsed ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]" : "lg:grid-cols-[16.5rem_minmax(0,1fr)]")}>
        <aside className="mb-6 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
          <div className="lg:rounded-2xl lg:border lg:border-[#E9DDC9] lg:bg-[#FFFDF8] lg:p-3 lg:shadow-[0_1px_2px_rgba(58,28,12,0.04),0_10px_28px_-16px_rgba(58,28,12,0.12)]">
            <div className={cn("mb-3 hidden items-center gap-3 border-b border-[#EFE4D0] px-1.5 pb-3.5 pt-1 lg:flex", collapsed && "justify-center px-0")}>
              <Initials name={name} />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#2A1A10]">{name}</p>
                  {user?.email && <p className="truncate text-xs text-[#6E5D4E]">{user.email}</p>}
                </div>
              )}
            </div>

            <nav ref={navRef} aria-label="Dashboard sections">
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:space-y-4 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
                {GROUPS.map((g) => (
                  <li key={g.label} className="contents lg:block">
                    {!collapsed && <p className="mb-1.5 hidden px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#A8803A] lg:block">{g.label}</p>}
                    {collapsed && <span aria-hidden="true" className="mx-3 mb-2 hidden border-t border-[#EFE4D0] first:hidden lg:block" />}
                    <ul className="contents lg:block lg:space-y-0.5">
                      {g.items.map(({ to, label, icon: Icon, end }) => (
                        <li key={to} className="shrink-0">
                          <NavLink
                            to={to}
                            end={end}
                            title={collapsed ? label : undefined}
                            className={({ isActive }) =>
                              cn(
                                "group relative flex min-h-11 items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8803A]",
                                "lg:rounded-xl lg:border-transparent lg:px-3",
                                collapsed && "lg:justify-center lg:px-0",
                                isActive
                                  ? "border-[#3A1C0C] bg-[#3A1C0C] font-medium text-[#FBF3E4] lg:bg-[#F3E8D4] lg:text-[#2A1A10] lg:before:absolute lg:before:-left-3 lg:before:top-2 lg:before:bottom-2 lg:before:w-[3px] lg:before:rounded-full lg:before:bg-[#803003] lg:[&_svg]:text-[#803003]"
                                  : "border-[#E0D2BA] bg-white text-[#4A3A2C] hover:bg-[#F6EEDF] lg:bg-transparent lg:hover:bg-[#F8F1E4]",
                              )
                            }
                          >
                            <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden="true" />
                            <span className={cn(collapsed && "lg:sr-only")}>{label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>

            <button
              type="button"
              onClick={toggle}
              aria-pressed={collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn("mt-4 hidden min-h-10 w-full items-center gap-2.5 rounded-xl border-t border-[#EFE4D0] px-3 pt-3 text-xs font-medium text-[#6E5D4E] transition-colors hover:text-[#2A1A10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A8803A] lg:flex", collapsed && "justify-center px-0")}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <><PanelLeftClose className="h-4 w-4" aria-hidden="true" />Collapse</>}
            </button>
          </div>
        </aside>

        <div id="dashboard-main" className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
