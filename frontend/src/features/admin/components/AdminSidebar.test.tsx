import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { ALL_NAV_ITEMS, NAV_GROUPS, groupOfPath, isNavActive } from "./adminNav";

const panel = vi.hoisted(() => ({ isMain: true, isLoading: false, data: {} as Record<string, unknown> }));
vi.mock("../panel/api", () => ({
  useMainAdmin: () => ({ isMain: panel.isMain, isLoading: panel.isLoading, denied: false, error: null }),
  usePanel: (path: string, opts?: { enabled?: boolean }) => ({ data: opts?.enabled === false ? undefined : panel.data[path] }),
}));
const logout = vi.hoisted(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }));
vi.mock("@/features/auth/hooks/useAuthMutations", () => ({ useLogoutMutation: () => logout }));
vi.mock("@/store/authStore", () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { firstName: "Asha", lastName: "Rao", email: "asha@example.com" } }),
}));

/** Every destination the sidebar had before the redesign (the old NAV, CUSTOMER_MGMT, ADMINISTRATION, ASTROLOGER_MGMT and CATALOGUE lists). */
const OLD_SIDEBAR_DESTINATIONS = [
  "/admin", "/admin/customers", "/admin/activity", "/admin/customer-library", "/admin/admins", "/admin/settings?scope=admin",
  "/admin/reports", "/admin/tools", "/admin/tool-pricing", "/admin/billing-failures", "/admin/astrology-audio", "/admin/inner-voice",
  "/admin/chat-escalations", "/admin/devotion", "/admin/shop-orders", "/admin/content", "/admin/payments", "/admin/integrations",
  "/admin/settings", "/admin/astrologers", "/admin/astrologers/applications", "/admin/astrologers/settings", "/admin/puja",
  "/admin/chadhawa", "/admin/shop/categories", "/admin/shop/products", "/admin/devotion-library",
];

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname}</p>; }
function mount(url = "/admin", props: { mobileOpen?: boolean; onMobileClose?: () => void } = {}) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={<><AdminSidebar {...props} /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
}
const activeLinks = () => screen.queryAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
const setViewport = (kind: "desktop" | "tablet" | "mobile") => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes("max-width: 767px") ? kind === "mobile" : q.includes("min-width: 1024px") ? kind === "desktop" : false,
    media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  panel.isMain = true; panel.isLoading = false; panel.data = {};
  logout.mutateAsync.mockClear();
  window.localStorage.clear();
  setViewport("desktop");
});
afterEach(() => cleanup());

describe("navigation config", () => {
  it("keeps every destination the old sidebar had, each exactly once", () => {
    const now = ALL_NAV_ITEMS.map((i) => i.to);
    for (const to of OLD_SIDEBAR_DESTINATIONS) expect(now, to).toContain(to);
    expect(new Set(now).size).toBe(now.length);
    expect(now.length).toBe(OLD_SIDEBAR_DESTINATIONS.length);
  });

  it("starts with the requested groups, in order", () => {
    const labels = NAV_GROUPS.map((g) => g.label);
    expect(labels.slice(0, 3)).toEqual(["Overview", "Customers", "Astrology & Tools"]);
    expect(labels).toContain("Administration");
    expect(NAV_GROUPS.find((g) => g.id === "customers")!.items.map((i) => i.label)).toEqual(["Customers", "Customer Activity", "Readings & Library", "Chat Escalations"]);
    expect(NAV_GROUPS.find((g) => g.id === "astrology")!.items.map((i) => i.label)).toEqual(["Astrology Tools", "Tool Pricing", "Astrology Audio", "Inner Voice"]);
    const admin = NAV_GROUPS.find((g) => g.id === "administration")!.items.map((i) => i.label);
    for (const l of ["Admin Management", "Activity & Audit", "Reports", "Billing Failures"]) expect(admin).toContain(l);
  });

  it("every item is still restricted to the main admin, as before", () => {
    expect(ALL_NAV_ITEMS.every((i) => i.mainOnly)).toBe(true);
  });

  it("detects the active page, including query-string items and nested pages", () => {
    const by = (to: string) => ALL_NAV_ITEMS.find((i) => i.to === to)!;
    expect(isNavActive(by("/admin"), "/admin", "")).toBe(true);
    expect(isNavActive(by("/admin"), "/admin/customers", "")).toBe(false);
    expect(isNavActive(by("/admin/customers"), "/admin/customers/abc123", "")).toBe(true);
    expect(isNavActive(by("/admin/settings?scope=admin"), "/admin/settings", "?scope=admin")).toBe(true);
    expect(isNavActive(by("/admin/settings"), "/admin/settings", "?scope=admin")).toBe(false);
    expect(isNavActive(by("/admin/settings"), "/admin/settings", "")).toBe(true);
    expect(isNavActive(by("/admin/settings?scope=admin"), "/admin/settings", "")).toBe(false);
    expect(isNavActive(by("/admin/astrologers"), "/admin/astrologers/applications", "")).toBe(false);
    expect(isNavActive(by("/admin/astrologers/applications"), "/admin/astrologers/applications/xyz", "")).toBe(true);
    expect(isNavActive(by("/admin/devotion"), "/admin/devotion-library", "")).toBe(false);
    expect(isNavActive(by("/admin/tools"), "/admin/tool-pricing", "")).toBe(false);
    expect(groupOfPath("/admin/billing-failures", "")?.id).toBe("administration");
  });
});

describe("AdminSidebar", () => {
  it("renders a link for every item and exactly one active page", () => {
    window.localStorage.setItem("admin_sidebar_closed_groups", "[]"); // nothing folded
    mount("/admin/customers/abc");
    for (const to of OLD_SIDEBAR_DESTINATIONS) {
      expect(document.querySelector(`a[href="${to}"]`), to).not.toBeNull();
    }
    const active = activeLinks();
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("Customers");
  });

  it("lights up only one of Settings / Activity & Audit", () => {
    mount("/admin/settings?scope=admin");
    expect(activeLinks().map((a) => a.textContent)).toEqual(["Activity & Audit"]);
    cleanup();
    mount("/admin/settings");
    expect(activeLinks().map((a) => a.textContent)).toEqual(["Settings"]);
  });

  it("shows the group headings in capitals and folds a group on click", () => {
    mount("/admin");
    for (const h of ["CUSTOMERS", "ASTROLOGY & TOOLS", "ADMINISTRATION"]) expect(screen.getByRole("button", { name: h })).toHaveAttribute("aria-expanded", "true");
    const customers = screen.getByRole("button", { name: "CUSTOMERS" });
    fireEvent.click(customers);
    expect(customers).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Customer Activity" })).toBeNull();
    fireEvent.click(customers);
    expect(screen.getByRole("link", { name: "Customer Activity" })).toBeInTheDocument();
  });

  it("folds the Astrologers and Devotion & Shop groups by default, and opens one when its page is shown", () => {
    mount("/admin");
    expect(screen.getByRole("button", { name: "ASTROLOGERS" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "DEVOTION & SHOP" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Applications" })).toBeNull();
    expect(screen.getByRole("link", { name: "Billing Failures" })).toBeInTheDocument(); // the core groups are open
    cleanup();
    mount("/admin/astrologers/applications");
    expect(screen.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  });

  it("opens the group of the page being shown even if it was folded", () => {
    window.localStorage.setItem("admin_sidebar_closed_groups", JSON.stringify(["administration"]));
    mount("/admin/billing-failures");
    expect(screen.getByRole("link", { name: /Billing Failures/ })).toHaveAttribute("aria-current", "page");
  });

  it("collapses to an icon-only rail, keeps labels for assistive tech, and remembers the choice", () => {
    const { unmount } = mount("/admin/customers");
    const aside = screen.getByRole("complementary", { name: "Admin navigation" });
    expect(aside.className).toContain("w-60");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(aside.className).toContain("w-[60px]");
    expect(screen.queryByText("Customer Activity")).toBeNull(); // no visible text label
    expect(screen.getByRole("link", { name: "Customer Activity" })).toBeInTheDocument(); // but still reachable by name
    expect(screen.getByRole("link", { name: "Customers" })).toHaveAttribute("aria-current", "page");
    expect(window.localStorage.getItem("admin_sidebar_collapsed")).toBe("1");
    unmount();
    mount("/admin/customers");
    expect(screen.getByRole("complementary", { name: "Admin navigation" }).className).toContain("w-[60px]");
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("complementary", { name: "Admin navigation" }).className).toContain("w-60");
    expect(screen.getByText("Customer Activity")).toBeInTheDocument();
  });

  it("is icon-only on tablet widths, with no toggle", () => {
    setViewport("tablet");
    mount("/admin");
    expect(screen.getByRole("complementary", { name: "Admin navigation" }).className).toContain("w-[60px]");
    expect(screen.queryByRole("button", { name: /sidebar/i })).toBeNull();
  });

  it("shows counts for pending chat escalations and stuck billing holds", () => {
    panel.data = {
      "/chat-escalations?status=PENDING": { counts: { PENDING: 3 } },
      "/billing-failures": { toolExecutions: [{}, {}], reservations: [{}] },
    };
    mount("/admin");
    expect(within(screen.getByRole("link", { name: /Chat Escalations/ })).getByLabelText("3 need attention")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: /Billing Failures/ })).getByLabelText("3 need attention")).toBeInTheDocument();
    expect(within(screen.getByRole("link", { name: "Customers" })).queryByLabelText(/need attention/)).toBeNull();
  });

  it("shows no badge when there is nothing to attend to", () => {
    panel.data = { "/chat-escalations?status=PENDING": { counts: { PENDING: 0 } }, "/billing-failures": { toolExecutions: [], reservations: [] } };
    mount("/admin");
    expect(screen.queryByLabelText(/need attention/)).toBeNull();
  });

  it("for anyone who is not the main admin, shows every item locked and linkable to none", () => {
    panel.isMain = false;
    window.localStorage.setItem("admin_sidebar_closed_groups", "[]");
    mount("/admin");
    expect(screen.queryAllByRole("link").filter((a) => (a.getAttribute("href") ?? "").startsWith("/admin/"))).toHaveLength(0);
    expect(document.querySelectorAll('[aria-disabled="true"]').length).toBe(ALL_NAV_ITEMS.length);
    expect(screen.getByText("No admin access")).toBeInTheDocument();
  });

  it("shows nothing locked while the access check is still loading", () => {
    panel.isMain = false; panel.isLoading = true;
    mount("/admin");
    expect(document.querySelectorAll('[aria-disabled="true"]').length).toBe(0);
    expect(screen.getByText("Checking access…")).toBeInTheDocument();
  });

  it("keeps the profile and logout at the bottom and logs out only after confirming", async () => {
    mount("/admin");
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Main admin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(logout.mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText("Confirm logout")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(logout.mutateAsync).toHaveBeenCalledTimes(1));
  });

  it("is a slide-out drawer on phones: closes from the X, the overlay and Escape, and when a link is chosen", () => {
    setViewport("mobile");
    const onClose = vi.fn();
    const { container } = mount("/admin", { mobileOpen: true, onMobileClose: onClose });
    const drawer = screen.getByRole("complementary", { name: "Admin navigation" });
    expect(drawer.className).toContain("translate-x-0");
    expect(screen.getByText("Customer Activity")).toBeInTheDocument(); // the drawer is always the full menu
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    fireEvent.click(container.querySelector('[aria-hidden="true"].bg-black\\/40')!);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("link", { name: "Reports" }));
    expect(onClose).toHaveBeenCalledTimes(4);
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/reports");
  });

  it("keeps a closed phone drawer off-screen and out of the tab order", () => {
    setViewport("mobile");
    mount("/admin", { mobileOpen: false });
    const drawer = screen.getByRole("complementary", { name: "Admin navigation", hidden: true });
    expect(drawer.className).toContain("-translate-x-full");
    expect(drawer.className).toContain("invisible");
  });

  it("does not crash when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    mount("/admin");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("complementary", { name: "Admin navigation" }).className).toContain("w-[60px]");
    spy.mockRestore(); set.mockRestore();
  });
});

