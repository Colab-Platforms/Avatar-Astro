import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Activity, Sparkles, MessageCircleHeart, Flame, Store, FileText, CreditCard,
  Plug, BarChart3, ScrollText, LogOut, X, Lock, ShieldCheck, Library, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/store/authStore";
import { useMainAdmin } from "../panel/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface NavDef { to: string; label: string; icon: typeof Users; end?: boolean; mainOnly?: boolean }

const OVERVIEW: NavDef[] = [{ to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, mainOnly: true }];

const CUSTOMER_MGMT: NavDef[] = [
  { to: "/admin/customers", label: "Customers", icon: Users, mainOnly: true },
  { to: "/admin/activity", label: "Customer activity", icon: Activity, mainOnly: true },
  { to: "/admin/customer-library", label: "Customer readings / library", icon: Library, mainOnly: true },
];

const ADMINISTRATION: NavDef[] = [
  { to: "/admin/admins", label: "Admin management", icon: ShieldCheck, mainOnly: true },
  { to: "/admin/settings?scope=admin", label: "Admin activity / audit", icon: History, mainOnly: true },
];

const NAV: NavDef[] = [
  { to: "/admin/reports", label: "Reports", icon: BarChart3, mainOnly: true },
  { to: "/admin/tools", label: "Astrology tools", icon: Sparkles, mainOnly: true },
  { to: "/admin/inner-voice", label: "Inner Voice", icon: MessageCircleHeart, mainOnly: true },
  { to: "/admin/devotion", label: "Devotion & Live", icon: Flame, mainOnly: true },
  { to: "/admin/shop-orders", label: "Shop & Orders", icon: Store, mainOnly: true },
  { to: "/admin/content", label: "Content & banners", icon: FileText, mainOnly: true },
  { to: "/admin/payments", label: "Payments & plans", icon: CreditCard, mainOnly: true },
  { to: "/admin/integrations", label: "AI & integrations", icon: Plug, mainOnly: true },
  { to: "/admin/settings", label: "Settings & audit", icon: ScrollText, mainOnly: true },
];

const CATALOGUE: NavDef[] = [
  { to: "/admin/puja", label: "Puja catalogue", icon: Flame, mainOnly: true },
  { to: "/admin/chadhawa", label: "Chadhawa catalogue", icon: Flame, mainOnly: true },
  { to: "/admin/shop/categories", label: "Shop categories", icon: Store, mainOnly: true },
  { to: "/admin/shop/products", label: "Shop products", icon: Store, mainOnly: true },
];

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#803003]",
    isActive ? "bg-[#F4EEE6] font-semibold text-[#803003]" : "text-[#4A423A] hover:bg-[#F7F4EF] hover:text-[#1F1B16]",
  );

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const loc = useLocation();
  const { isMain, isLoading } = useMainAdmin();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Admin";

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login", { replace: true });
  };

  const renderItem = ({ to, label, icon: Icon, end, mainOnly }: NavDef) => {
    if (mainOnly && !isMain) {
      // Hint only: the API refuses these calls for anyone but the main admin.
      return isLoading ? null : (
        <div key={to} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#B8AFA4]" title="Main admin only">
          <Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span><Lock className="h-3.5 w-3.5" />
        </div>
      );
    }
    return (
      <NavLink key={to} to={to} end={end || to.includes("?")} onClick={onMobileClose} className={({ isActive }) => linkClass({ isActive: to.includes("?") ? loc.pathname + loc.search === to : isActive })}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </NavLink>
    );
  };

  const content = (showClose: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#E8E3DC] px-5 py-4">
        <div>
          <p className="text-base font-semibold tracking-tight text-[#1F1B16]">MyBhagya</p>
          <p className="text-xs text-[#6B6259]">Admin panel</p>
        </div>
        {showClose && (
          <Button type="button" variant="ghost" size="icon" className="text-[#1F1B16] hover:bg-[#F7F4EF] lg:hidden" onClick={onMobileClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav aria-label="Admin sections" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {OVERVIEW.map(renderItem)}
        <p className="px-3 pb-1 pt-4 text-xs font-medium text-[#9A9086]">Customer management</p>
        {CUSTOMER_MGMT.map(renderItem)}
        <p className="px-3 pb-1 pt-4 text-xs font-medium text-[#9A9086]">Administration</p>
        {ADMINISTRATION.map(renderItem)}
        <p className="px-3 pb-1 pt-4 text-xs font-medium text-[#9A9086]">Platform</p>
        {NAV.map(renderItem)}
        <p className="px-3 pb-1 pt-4 text-xs font-medium text-[#9A9086]">Catalogue editors</p>
        {CATALOGUE.map(renderItem)}
      </nav>

      <div className="border-t border-[#E8E3DC] px-4 py-4">
        <div className="mb-3 truncate px-1">
          <p className="truncate text-sm font-medium text-[#1F1B16]">{displayName}</p>
          {user?.email && <p className="truncate text-xs text-[#6B6259]">{user.email}</p>}
          <p className="mt-1 text-xs font-medium text-[#803003]">{isMain ? "Main admin" : isLoading ? "Checking access…" : "No admin access"}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-start gap-3 px-3 text-[#4A423A] hover:bg-[#F7F4EF] hover:text-[#1F1B16]" disabled={logoutMutation.isPending}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </AlertDialogTrigger>
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
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r border-[#E8E3DC] bg-white lg:block">{content(false)}</aside>
      <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} onClick={onMobileClose} aria-hidden="true" />
        <aside className={cn("absolute left-0 top-0 h-full w-64 border-r border-[#E8E3DC] bg-white transition-transform duration-200", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          {content(true)}
        </aside>
      </div>
    </>
  );
}
