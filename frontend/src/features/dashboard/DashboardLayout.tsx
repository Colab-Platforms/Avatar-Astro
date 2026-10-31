import { NavLink, Outlet } from "react-router-dom";
import { Home, BookOpenText, CalendarHeart, Bookmark, MessageCircleHeart, CalendarCheck, PackageOpen, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: Home, end: true },
  { to: "/dashboard/readings", label: "My Readings", icon: BookOpenText },
  { to: "/dashboard/activity", label: "My Activity", icon: CalendarHeart },
  { to: "/dashboard/saved", label: "Saved", icon: Bookmark },
  { to: "/dashboard/conversations", label: "My Conversations", icon: MessageCircleHeart },
  { to: "/dashboard/bookings", label: "My Bookings", icon: CalendarCheck },
  { to: "/dashboard/orders", label: "My Orders", icon: PackageOpen },
  { to: "/dashboard/profile", label: "Profile & Settings", icon: UserCog },
] as const;

export default function DashboardLayout() {
  return (
    <div className="relative z-10 min-h-screen bg-[#F5E9D6] pb-16 pt-24 text-[#301607]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:px-6">
        <nav aria-label="Dashboard sections" className="md:w-60 md:shrink-0">
          <ul className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] md:flex-col md:overflow-visible md:pb-0">
            {NAV.map(({ to, label, icon: Icon, ...rest }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={"end" in rest}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E58A45]",
                      isActive ? "bg-[#803003] font-medium text-white shadow-sm" : "bg-[#FBF5EC] text-[#301607] hover:bg-[#B8893B]/20",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div id="dashboard-main" className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
