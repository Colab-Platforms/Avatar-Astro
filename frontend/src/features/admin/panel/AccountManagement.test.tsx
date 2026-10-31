import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED. These tests check what the pages send and show; the real rules (roles, last SUPERADMIN, revocation)
// are enforced and tested on the backend (npm run test:accounts) and in the browser run.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({
  authRequest: (...a: unknown[]) => authRequest(...a),
  AuthApiError: class extends Error { status = 0; },
  AUTH_API_BASE_URL: "http://test/api",
}));
vi.mock("@/lib/authedFetch", () => ({ authedFetch: vi.fn() }));
vi.mock("@/store/authStore", () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { id: "self", email: "me@x.com" } }) }));

import AdminsPage from "./pages/AdminsPage";
import UsersPage from "./pages/UsersPage";
import { DeleteDialog, passwordProblem } from "./accounts/AccountDialogs";

const admin = (over: object = {}) => ({
  id: "a1", firstName: "Ada", lastName: "Min", email: "ada@x.com", phoneNo: null, authProvider: "LOCAL", isEmailVerified: true, isPhoneVerified: false,
  isActive: true, createdAt: "2026-10-01T10:00:00.000Z", role: "ADMIN", lastActiveAt: null, lastLoginAt: null, ...over,
});
const stats = { total: 2, active: 1, deactivated: 1, superAdmins: 1 };

function mount(ui: React.ReactNode, path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}><Routes><Route path="*" element={ui} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
}
const calls = () => authRequest.mock.calls.map((c) => [String(c[0]), c[1]] as const);

beforeEach(() => { authRequest.mockReset(); });

describe("Admin Management page", () => {
  beforeEach(() => {
    authRequest.mockImplementation(async (url: string) => {
      if (url.startsWith("/admin/admins")) return { items: [admin(), admin({ id: "self", email: "me@x.com", firstName: "Me", role: "SUPERADMIN" }), admin({ id: "a3", email: "off@x.com", isActive: false })], page: 1, pageSize: 15, total: 3, totalPages: 1, stats };
      return { mainAdmin: true };
    });
  });

  it("shows real statistics, only administrator rows, and no self-deactivation action", async () => {
    mount(<AdminsPage />, "/admin/admins?role=ADMIN&status=active");
    await screen.findByText("ada@x.com");
    const req = calls().find(([u]) => u.startsWith("/admin/admins?"))![0];
    expect(Object.fromEntries(new URLSearchParams(req.split("?")[1]))).toMatchObject({ role: "ADMIN", status: "active", page: "1" });
    expect(screen.getByText("Total administrators").parentElement!.nextElementSibling!.textContent).toBe("2");
    expect(screen.getByText("SUPERADMIN accounts").parentElement!.nextElementSibling!.textContent).toBe("1");
    const meRow = screen.getByText("me@x.com").closest("tr")!;
    expect(within(meRow).queryByRole("button", { name: "Deactivate" })).toBeNull();
    const adaRow = screen.getByText("ada@x.com").closest("tr")!;
    expect(within(adaRow).getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(within(screen.getByText("off@x.com").closest("tr")!).getByRole("button", { name: "Reactivate" })).toBeInTheDocument();
  });

  it("creating an administrator validates the password locally and sends the role chosen in the form", async () => {
    mount(<AdminsPage />, "/admin/admins");
    await screen.findByText("ada@x.com");
    fireEvent.click(screen.getByRole("button", { name: "Create administrator" }));
    const dlg = await screen.findByRole("dialog");
    const type = (label: RegExp | string, value: string) => fireEvent.change(within(dlg).getByLabelText(label), { target: { value } });
    type("First name", "New"); type("Last name", "Admin"); type("Email", "new@x.com");
    type(/Initial password/, "weakpass"); type("Confirm password", "weakpass");
    fireEvent.click(within(dlg).getByRole("button", { name: "Create administrator" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent(/uppercase/i);
    expect(calls().some(([, o]) => (o as { method?: string } | undefined)?.method === "POST")).toBe(false);

    type(/Initial password/, "Strong#Pass1"); type("Confirm password", "Different#Pass1");
    fireEvent.click(within(dlg).getByRole("button", { name: "Create administrator" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent(/do not match/i);

    type("Confirm password", "Strong#Pass1"); type("Role", "SUPERADMIN");
    authRequest.mockImplementationOnce(async () => ({ id: "n1" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Create administrator" }));
    await waitFor(() => expect(calls().some(([u, o]) => u === "/admin/admins" && (o as { method?: string })?.method === "POST")).toBe(true));
    const post = calls().find(([u, o]) => u === "/admin/admins" && (o as { method?: string })?.method === "POST")![1] as { body: Record<string, string> };
    expect(post.body).toMatchObject({ email: "new@x.com", role: "SUPERADMIN", password: "Strong#Pass1", confirmPassword: "Strong#Pass1" });
  });
});

describe("Customers page: create customer", () => {
  it("never sends a role, and says the customer verifies their email", async () => {
    authRequest.mockImplementation(async (url: string) => (url.startsWith("/admin/customers") ? { items: [], page: 1, pageSize: 15, total: 0, totalPages: 1 } : { mainAdmin: true }));
    mount(<UsersPage />, "/admin/customers");
    await screen.findByText("No customers yet");
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByDisplayValue("USER (customer)")).toBeDisabled();
    const type = (label: RegExp | string, value: string) => fireEvent.change(within(dlg).getByLabelText(label), { target: { value } });
    type("First name", "Cu"); type("Last name", "Stomer"); type("Email", "c@x.com"); type(/^Password/, "Strong#Pass1"); type("Confirm password", "Strong#Pass1");
    authRequest.mockImplementationOnce(async () => ({ id: "c1" }));
    fireEvent.click(within(dlg).getByRole("button", { name: "Create customer" }));
    await waitFor(() => expect(calls().some(([u, o]) => u === "/admin/customers" && (o as { method?: string })?.method === "POST")).toBe(true));
    const body = (calls().find(([u, o]) => u === "/admin/customers" && (o as { method?: string })?.method === "POST")![1] as { body: Record<string, unknown> }).body;
    expect(body.role).toBeUndefined();
    expect(body).toMatchObject({ email: "c@x.com", status: "active" });
    expect(await screen.findByRole("status")).toHaveTextContent(/verify their email/i);
  });
});

describe("Delete dialog", () => {
  it("stays disabled until the exact email is typed and explains the consequences", () => {
    const acct = { id: "x", email: "gone@x.com", firstName: "G", lastName: "One", phoneNo: null, isActive: true, role: "USER" };
    mount(<DeleteDialog kind="customer" account={acct} open onClose={() => {}} onDone={() => {}} />, "/");
    const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText(/permanently deleted/i)).toBeInTheDocument();
    expect(within(dlg).getByText(/audit history/i)).toBeInTheDocument();
    const btn = within(dlg).getByRole("button", { name: "Delete customer" });
    expect(btn).toBeDisabled();
    fireEvent.change(within(dlg).getByLabelText(/Type gone@x.com/), { target: { value: "other@x.com" } });
    expect(btn).toBeDisabled();
    fireEvent.change(within(dlg).getByLabelText(/Type gone@x.com/), { target: { value: "GONE@x.com" } });
    expect(btn).toBeEnabled();
  });
});

describe("passwordProblem", () => {
  it("mirrors the server rule", () => {
    expect(passwordProblem("short")).toMatch(/8/);
    expect(passwordProblem("alllowercase1")).toMatch(/uppercase/);
    expect(passwordProblem("NoDigitsHere")).toMatch(/number/);
    expect(passwordProblem("Good#Pass1")).toBeNull();
  });
});
