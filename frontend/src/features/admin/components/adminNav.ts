import {
  LayoutDashboard, Users, Activity, Sparkles, MessageCircleHeart, MessageCircleWarning, Flame, Store, FileText, CreditCard,
  Plug, BarChart3, ScrollText, ShieldCheck, Library, History, AudioLines, UserCog, ClipboardList, Settings, BookOpen,
  Coins, AlertTriangle, Landmark, Package, Tags, Boxes,
  type LucideIcon,
} from "lucide-react";

/** Live counts the sidebar can show next to an item (see AdminSidebar). */
export type NavBadge = "chatEscalations" | "billingFailures";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Active only on this exact path (default: this path and anything below it). */
  end?: boolean;
  badge?: NavBadge;
  /** Every admin page is main-admin only; the API enforces it, the sidebar only hints it. */
  mainOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * The whole admin navigation, in one place. Every route that used to be in the sidebar is still here: the groups are new,
 * the destinations and the main-admin restriction are unchanged.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, mainOnly: true }],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users, mainOnly: true },
      { to: "/admin/activity", label: "Customer Activity", icon: Activity, mainOnly: true },
      { to: "/admin/customer-library", label: "Readings & Library", icon: Library, mainOnly: true },
      { to: "/admin/chat-escalations", label: "Chat Escalations", icon: MessageCircleWarning, badge: "chatEscalations", mainOnly: true },
    ],
  },
  {
    id: "astrology",
    label: "Astrology & Tools",
    items: [
      { to: "/admin/tools", label: "Astrology Tools", icon: Sparkles, mainOnly: true },
      { to: "/admin/tool-pricing", label: "Tool Pricing", icon: Coins, mainOnly: true },
      { to: "/admin/astrology-audio", label: "Astrology Audio", icon: AudioLines, mainOnly: true },
      { to: "/admin/inner-voice", label: "Inner Voice", icon: MessageCircleHeart, mainOnly: true },
    ],
  },
  {
    id: "astrologers",
    label: "Astrologers",
    items: [
      { to: "/admin/astrologers", label: "Astrologers", icon: UserCog, end: true, mainOnly: true },
      { to: "/admin/astrologers/applications", label: "Applications", icon: ClipboardList, mainOnly: true },
      { to: "/admin/astrologers/settings", label: "Astrologer Settings", icon: Settings, mainOnly: true },
    ],
  },
  {
    id: "devotion",
    label: "Devotion & Shop",
    items: [
      { to: "/admin/devotion", label: "Devotion & Live", icon: Flame, mainOnly: true },
      { to: "/admin/puja", label: "Puja Catalogue", icon: Landmark, mainOnly: true },
      { to: "/admin/chadhawa", label: "Chadhawa Catalogue", icon: Package, mainOnly: true },
      { to: "/admin/devotion-library", label: "Books & Mantras", icon: BookOpen, mainOnly: true },
      { to: "/admin/shop-orders", label: "Shop & Orders", icon: Store, mainOnly: true },
      { to: "/admin/shop/categories", label: "Shop Categories", icon: Tags, mainOnly: true },
      { to: "/admin/shop/products", label: "Shop Products", icon: Boxes, mainOnly: true },
      { to: "/admin/content", label: "Content & Banners", icon: FileText, mainOnly: true },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { to: "/admin/admins", label: "Admin Management", icon: ShieldCheck, mainOnly: true },
      { to: "/admin/settings?scope=admin", label: "Activity & Audit", icon: History, mainOnly: true },
      { to: "/admin/reports", label: "Reports", icon: BarChart3, mainOnly: true },
      { to: "/admin/billing-failures", label: "Billing Failures", icon: AlertTriangle, badge: "billingFailures", mainOnly: true },
      { to: "/admin/payments", label: "Payments & Plans", icon: CreditCard, mainOnly: true },
      { to: "/admin/integrations", label: "Integrations", icon: Plug, mainOnly: true },
      { to: "/admin/settings", label: "Settings", icon: ScrollText, mainOnly: true },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Is `item` the page being shown? A link with a query string ("Activity & Audit" is /admin/settings?scope=admin) matches only
 * when that query is present, and "Settings" (the same path without it) matches only when it is not, so the two never light up together.
 */
export function isNavActive(item: NavItem, pathname: string, search: string): boolean {
  const [path, query] = item.to.split("?");
  if (query) {
    const want = new URLSearchParams(query);
    const have = new URLSearchParams(search);
    return pathname === path && [...want].every(([k, v]) => have.get(k) === v);
  }
  if (pathname === "/admin/settings" && path === "/admin/settings") return new URLSearchParams(search).get("scope") !== "admin";
  if (item.end) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The group that holds the page being shown, so it can be opened automatically. */
export function groupOfPath(pathname: string, search: string): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.items.some((i) => isNavActive(i, pathname, search)));
}
