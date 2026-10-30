import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRoute } from "./AdminRoute";
import { useAuthStore } from "@/store/authStore";

vi.mock("@/features/auth/hooks/useAuthHydrated", () => ({ useAuthHydrated: () => true }));

const userWith = (...roles: string[]) =>
  ({ id: "u1", email: "x@example.com", userRoleMappings: roles.map((name) => ({ role: { name } })) }) as never;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/login" element={<div>login</div>} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>admin panel</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const signIn = (user: never) => useAuthStore.setState({ user, isAuthenticated: true, accessToken: "t", refreshToken: "r" });

describe("AdminRoute", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, accessToken: null, refreshToken: null });
  });

  it("sends signed-out visitors to login", () => {
    renderAt("/admin");
    expect(screen.getByText("login")).toBeTruthy();
  });

  it("sends a normal USER home", () => {
    signIn(userWith("USER"));
    renderAt("/admin");
    expect(screen.getByText("home")).toBeTruthy();
  });

  it("sends the legacy ADMIN role home", () => {
    signIn(userWith("ADMIN"));
    renderAt("/admin");
    expect(screen.getByText("home")).toBeTruthy();
  });

  it("lets SUPERADMIN in", () => {
    signIn(userWith("USER", "SUPERADMIN"));
    renderAt("/admin");
    expect(screen.getByText("admin panel")).toBeTruthy();
  });
});
