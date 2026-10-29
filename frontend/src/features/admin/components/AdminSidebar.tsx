import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Flame,
  Flower2,
  Store,
  ChevronDown,
  Tags,
  ShoppingBag,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/features/auth/hooks/useAuthMutations";
import { useAuthStore } from "@/store/authStore";
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

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/puja", label: "Puja", icon: Flame, end: false },
  { to: "/admin/chadhawa", label: "Chadhawa", icon: Flower2, end: false },
] as const;

const shopChildren = [
  { to: "/admin/shop/categories", label: "Categories", icon: Tags },
  { to: "/admin/shop/products", label: "Products", icon: ShoppingBag },
] as const;

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({
  mobileOpen = false,
  onMobileClose,
}: AdminSidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const isShopRoute = location.pathname.startsWith("/admin/shop");
  const [shopExpanded, setShopExpanded] = useState(isShopRoute);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin";

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/login", { replace: true });
  };

  const renderSidebarContent = (showClose: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-primary/15 px-5 py-5">
        <div>
          <p className="font-display text-lg tracking-wide text-foreground">Astro</p>
          <p className="text-xs text-foreground/70">Admin Console</p>
        </div>
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-foreground/70 hover:bg-primary/10 hover:text-foreground lg:hidden"
            onClick={onMobileClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onMobileClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-[#592209]/15 text-foreground"
                  : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        <div>
          <button
            type="button"
            onClick={() => setShopExpanded((prev) => !prev)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
              isShopRoute
                ? "bg-[#592209]/15 text-foreground"
                : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
            )}
            aria-expanded={shopExpanded}
          >
            <Store className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Shop</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                shopExpanded && "rotate-180",
              )}
            />
          </button>

          {shopExpanded && (
            <div className="mt-1 space-y-1 pl-6">
              {shopChildren.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-[#592209]/15 text-foreground"
                        : "text-foreground/70 hover:bg-primary/10 hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="border-t border-primary/15 px-4 py-4">
        <div className="mb-3 truncate px-1">
          <p className="truncate text-sm text-foreground">{displayName}</p>
          {user?.email && (
            <p className="truncate text-xs text-foreground/70">{user.email}</p>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-3 px-3 text-foreground/70 hover:bg-primary/10 hover:text-foreground"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-primary/15 bg-[#FBF5EC] text-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-lg tracking-wide text-foreground">Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/70">
                Are you sure you want to log out of the admin console?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-primary/15 bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-[#592209] text-[#F5E9D6] hover:bg-[#592209]/80"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r border-primary/15 bg-[#FBF5EC] lg:block">
        {renderSidebarContent(false)}
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={onMobileClose}
          aria-hidden={!mobileOpen}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-64 border-r border-primary/15 bg-[#FBF5EC] transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>
    </>
  );
}
