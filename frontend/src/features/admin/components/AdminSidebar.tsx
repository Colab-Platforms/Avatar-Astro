import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Lock, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/store/authStore";
import { useMainAdmin, usePanel } from "../panel/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NAV_GROUPS, groupOfPath, isNavActive, type NavBadge, type NavItem } from "./adminNav";

const COLLAPSED_KEY = "admin_sidebar_collapsed";
const CLOSED_GROUPS_KEY = "admin_sidebar_closed_groups";

// Storage can be blocked (private windows, site settings); the sidebar must work without it.
const readStored = (key: string): string | null => { try { return window.localStorage.getItem(key); } catch { return null; } };
const writeStored = (key: string, value: string) => { try { window.localStorage.setItem(key, value); } catch { /* not persisted */ } };

/** Folded until the admin opens them (or visits one of their pages): the two catalogue-style groups, so the core menu fits on one screen. */
const DEFAULT_CLOSED_GROUPS = ["astrologers", "devotion"];

function readClosedGroups(): string[] {
  try {
    const stored = readStored(CLOSED_GROUPS_KEY);
    if (stored === null) return DEFAULT_CLOSED_GROUPS;
    const v = JSON.parse(stored);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return DEFAULT_CLOSED_GROUPS; }
}

/** Live match of a CSS media query; `fallback` is used where matchMedia does not exist (tests, very old browsers). */
function useMediaQuery(query: string, fallback: boolean): boolean {
  const get = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** A small count next to an item; in the icon-only rail it sits on the icon's corner. */
function CountBadge({ count, collapsed }: { count: number; collapsed: boolean }) {
  const text = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count} need attention`}
      className={cn(
        "inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-[#E58A45] px-1 text-[10px] font-bold leading-4 text-[#33251D]",
        collapsed && "absolute -right-0.5 -top-0.5 ring-2 ring-[#F5E9D6]",
      )}
    >
      {text}
    </span>
  );
}

const itemBase = "group relative flex items-center rounded-md text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#803003]";

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const loc = useLocation();
  const { isMain, isLoading } = useMainAdmin();

  const isMobile = useMediaQuery("(max-width: 767px)", false);
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const [userCollapsed, setUserCollapsed] = useState(() => readStored(COLLAPSED_KEY) === "1");
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);
  // Tablet widths always get the icon-only rail; desktop follows the toggle; the mobile drawer is always the full menu.
  const collapsed = !isMobile && (!isDesktop || userCollapsed);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Admin";
  const initials = displayName.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "A";
  const roleLabel = isMain ? "Main admin" : isLoading ? "Checking access…" : "No admin access";

  // Counts only where the app already has them: pending chat escalations and stuck billing holds. Never fetched for non-main admins.
  const escalations = usePanel<{ counts?: { PENDING?: number } }>("/chat-escalations?status=PENDING", { enabled: isMain, refetchInterval: 60_000, retry: false });
  const billing = usePanel<{ toolExecutions?: unknown[]; reservations?: unknown[] }>("/billing-failures", { enabled: isMain, refetchInterval: 60_000, retry: false });
  const counts: Record<NavBadge, number> = {
    chatEscalations: escalations.data?.counts?.PENDING ?? 0,
    billingFailures: (billing.data?.toolExecutions?.length ?? 0) + (billing.data?.reservations?.length ?? 0),
  };

  const toggleCollapsed = () => setUserCollapsed((c) => { writeStored(COLLAPSED_KEY, c ? "0" : "1"); return !c; });
  const toggleGroup = (id: string) => setClosedGroups((cur) => {
    const next = cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id];
    writeStored(CLOSED_GROUPS_KEY, JSON.stringify(next));
    return next;
  });

  // Opening a page opens its group, so the active item is never hidden inside a folded section.
  const activeGroupId = groupOfPath(loc.pathname, loc.search)?.id;
  useEffect(() => {
    if (activeGroupId) setClosedGroups((cur) => (cur.includes(activeGroupId) ? cur.filter((g) => g !== activeGroupId) : cur));
  }, [activeGroupId]);

  // The drawer closes with Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onMobileClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onMobileClose]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login", { replace: true });
  };

  const withTip = useCallback((node: React.ReactElement, tip: React.ReactNode, on: boolean) => (on ? (
    <Tooltip>
      <TooltipTrigger asChild>{node}</TooltipTrigger>
      <TooltipContent side="right" className="border-[#E3D2B4] bg-[#33251D] text-xs text-[#FFF6E6]">{tip}</TooltipContent>
    </Tooltip>
  ) : node), []);

  const renderItem = (item: NavItem, rail: boolean) => {
    const { to, label, icon: Icon, badge, mainOnly } = item;
    const padding = rail ? "mx-auto h-9 w-9 justify-center" : "gap-2.5 px-2.5 py-[7px]";

    if (mainOnly && !isMain) {
      // Hint only: the API refuses these calls for anyone but the main admin.
      if (isLoading) return null;
      return (
        <li key={to}>
          {withTip(
            <div className={cn(itemBase, padding, "cursor-not-allowed text-[#33251D]/40")} aria-disabled="true" title={rail ? undefined : "Main admin only"}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!rail && <><span className="flex-1 truncate">{label}</span><Lock className="h-3 w-3" aria-hidden="true" /></>}
              {rail && <span className="sr-only">{label} (main admin only)</span>}
            </div>,
            <>{label} · Main admin only</>,
            rail,
          )}
        </li>
      );
    }

    const active = isNavActive(item, loc.pathname, loc.search);
    const count = badge ? counts[badge] : 0;
    return (
      <li key={to}>
        {withTip(
          <Link
            to={to}
            onClick={onMobileClose}
            aria-current={active ? "page" : undefined}
            aria-label={rail ? label : undefined}
            className={cn(itemBase, padding, active ? "bg-[#803003] font-semibold text-[#FFF6E6] shadow-sm" : "text-[#33251D] hover:bg-[#803003]/10")}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#FFD9A8]" : "text-[#803003]/80")} aria-hidden="true" />
            {!rail && <span className="flex-1 truncate">{label}</span>}
            {count > 0 && <CountBadge count={count} collapsed={rail} />}
          </Link>,
          <>{label}{count > 0 ? ` · ${count} need attention` : ""}</>,
          rail,
        )}
      </li>
    );
  };

  const panel = (rail: boolean, drawer: boolean) => (
    <TooltipProvider delayDuration={120}>
      <div className="flex h-full min-h-0 flex-col text-[#33251D]">
        {/* Brand + collapse toggle */}
        <div className={cn("flex shrink-0 items-center border-b border-[#E3D2B4] py-3", rail ? "flex-col gap-2 px-0" : "justify-between px-3.5")}>
          <Link to="/admin" onClick={onMobileClose} className="flex items-center gap-2 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]" aria-label="Bhagya admin overview">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#803003] text-sm font-bold text-[#FFF6E6]">B</span>
            {!rail && (
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold tracking-tight">Bhagya</span>
                <span className="block text-[11px] text-[#7A6A58]">Admin panel</span>
              </span>
            )}
          </Link>
          {drawer ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#33251D] hover:bg-[#803003]/10" onClick={onMobileClose} aria-label="Close menu">
              <X className="h-5 w-5" />
            </Button>
          ) : isDesktop ? (
            withTip(
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[#33251D] hover:bg-[#803003]/10" onClick={toggleCollapsed} aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!rail}>
                {rail ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>,
              "Expand sidebar",
              rail,
            )
          ) : null}
        </div>

        {/* Navigation */}
        <nav aria-label="Admin sections" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          {NAV_GROUPS.map((group, gi) => {
            const single = group.items.length === 1;
            const closed = !rail && !single && closedGroups.includes(group.id);
            return (
              <section key={group.id} aria-label={group.label} className={cn(gi > 0 && (rail ? "mt-2 border-t border-[#E3D2B4] pt-2" : "mt-2.5"))}>
                {!rail && !single && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!closed}
                    className="flex w-full items-center justify-between rounded px-2.5 pb-1 pt-1 text-[10.5px] font-semibold text-[#803003]/75 hover:text-[#803003] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]"
                  >
                    <span>{group.label.toUpperCase()}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", closed && "-rotate-90")} aria-hidden="true" />
                  </button>
                )}
                {!closed && <ul className="space-y-0.5">{group.items.map((i) => renderItem(i, rail))}</ul>}
              </section>
            );
          })}
        </nav>

        {/* Profile + logout stay fixed at the bottom */}
        <div className={cn("shrink-0 border-t border-[#E3D2B4] py-3", rail ? "flex flex-col items-center gap-2 px-0" : "px-3")}>
          {rail ? (
            withTip(
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#803003] text-xs font-semibold text-[#FFF6E6]" aria-label={`${displayName}, ${roleLabel}`}>{initials}</span>,
              <><span className="block font-medium">{displayName}</span><span className="block opacity-80">{roleLabel}</span></>,
              true,
            )
          ) : (
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#803003] text-xs font-semibold text-[#FFF6E6]" aria-hidden="true">{initials}</span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-medium">{displayName}</p>
                {user?.email && <p className="truncate text-[11px] text-[#7A6A58]">{user.email}</p>}
                <p className="text-[11px] font-medium text-[#803003]">{roleLabel}</p>
              </div>
            </div>
          )}
          <AlertDialog>
            {withTip(
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn("text-[13px] text-[#33251D] hover:bg-[#803003]/10 hover:text-[#33251D]", rail ? "h-9 w-9 p-0" : "h-9 w-full justify-start gap-2.5 px-2.5")}
                  disabled={logoutMutation.isPending}
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4 text-[#803003]/80" />{!rail && "Logout"}
                </Button>
              </AlertDialogTrigger>,
              "Logout",
              rail,
            )}
            <AlertDialogContent className="border-[#E8E3DC] bg-white text-[#1F1B16]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-semibold">Confirm logout</AlertDialogTitle>
                <AlertDialogDescription className="text-[#6B6259]">Are you sure you want to log out of the admin panel?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#DDD6CC] bg-white text-[#1F1B16] hover:bg-[#F7F4EF]">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-[#803003] text-white hover:bg-[#6B2802]">Logout</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </TooltipProvider>
  );

  // Phones: a slide-out drawer over an overlay. Tablets and desktops: a rail in the page flow, so the content resizes with it.
  if (isMobile) {
    return (
      <div className={cn("fixed inset-0 z-50", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} onClick={onMobileClose} aria-hidden="true" />
        <aside
          aria-label="Admin navigation"
          className={cn("absolute left-0 top-0 h-full w-[17rem] max-w-[85vw] border-r border-[#E3D2B4] bg-[#F5E9D6] shadow-xl transition-[transform,visibility] duration-200", mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full")}
        >
          {panel(false, true)}
        </aside>
      </div>
    );
  }
  return (
    <aside
      aria-label="Admin navigation"
      className={cn("h-screen shrink-0 border-r border-[#E3D2B4] bg-[#F5E9D6] transition-[width] duration-200", collapsed ? "w-[60px]" : "w-60")}
    >
      {panel(collapsed, false)}
    </aside>
  );
}
