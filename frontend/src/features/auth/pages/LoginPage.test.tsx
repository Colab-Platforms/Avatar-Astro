import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "./LoginPage";
import { authApi } from "../api/authApi";
import { AuthApiError } from "@/lib/authClient";
import { useAuthStore } from "@/store/authStore";

vi.mock("../api/authApi", () => ({ authApi: { login: vi.fn(), googleLogin: vi.fn() } }));
// Google's own button is replaced by one that hands a (fake) credential to the page, exactly as Google's script would.
vi.mock("../components/GoogleAuthButton", () => ({
  GoogleAuthButton: ({ onCredential }: { onCredential: (t: string) => void }) => <button type="button" onClick={() => onCredential("id-token")}>Google</button>,
}));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const api = vi.mocked(authApi);
// A user who has never filled in astrology details: none of those fields exist on the login payload.
const user = { id: "u1", firstName: "Asha", lastName: "Rao", email: "asha@example.test", profileCompleted: true, userRoleMappings: [{ role: { name: "USER" } }] };
const session = { user, accessToken: "a", refreshToken: "r" };

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
const fill = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
};
const signIn = () => fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

let unhandled: unknown[] = [];
const onUnhandled = (e: unknown) => { unhandled.push(e); };

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  unhandled = [];
  process.on("unhandledRejection", onUnhandled);
});
afterEach(() => { process.off("unhandledRejection", onUnhandled); });

describe("login form validation", () => {
  it("empty submit shows both messages and sends nothing", async () => {
    renderPage();
    signIn();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("an invalid email is rejected before any request", async () => {
    renderPage();
    fill("not-an-email", "secret123");
    signIn();
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it("messages disappear as soon as valid input is typed", async () => {
    renderPage();
    signIn();
    await screen.findByText("Password is required");
    fill("asha@example.test", "secret123");
    await waitFor(() => expect(screen.queryByText("Password is required")).toBeNull());
    expect(screen.queryByText("Email is required")).toBeNull();
    expect(screen.queryByText("Enter a valid email")).toBeNull();
  });
});

describe("signing in", () => {
  it("success stores the session and goes home, even though no astrology profile exists yet", async () => {
    api.login.mockResolvedValue(session as never);
    renderPage();
    fill("  Asha@Example.test ", "secret123");
    signIn();
    expect(await screen.findByText("home page")).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith({ email: "asha@example.test", password: "secret123" }); // trimmed + lower-cased
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("shows the loading label and blocks a second submit while the request runs", async () => {
    let finish!: (v: unknown) => void;
    api.login.mockReturnValue(new Promise((r) => (finish = r)) as never);
    renderPage();
    fill("asha@example.test", "secret123");
    signIn();
    expect(await screen.findByRole("button", { name: /signing in/i })).toBeDisabled();
    finish(session);
    expect(await screen.findByText("home page")).toBeInTheDocument();
  });

  it("wrong credentials show the server's friendly message, keep the user on the page, and leave no uncaught error", async () => {
    api.login.mockRejectedValue(new AuthApiError("Invalid email or password", 401));
    renderPage();
    fill("asha@example.test", "wrong-password");
    signIn();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid email or password"));
    expect(screen.queryByText("home page")).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(unhandled).toEqual([]);
  });

  it("a server failure shows a readable message, not a database error", async () => {
    api.login.mockRejectedValue(new AuthApiError("Something went wrong. Please try again.", 500));
    renderPage();
    fill("asha@example.test", "secret123");
    signIn();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(screen.queryByText(/prisma|column|invocation/i)).toBeNull();
  });
});

describe("Google sign-in", () => {
  it("a successful Google credential signs the user in", async () => {
    api.googleLogin.mockResolvedValue(session as never);
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    expect(await screen.findByText("home page")).toBeInTheDocument();
    expect(api.googleLogin).toHaveBeenCalledWith({ idToken: "id-token" });
  });

  it("a rejected Google sign-in tells the user why, and does not throw into Google's callback", async () => {
    api.googleLogin.mockRejectedValue(new AuthApiError("Google sign-in could not be verified.", 401));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Google sign-in could not be verified."));
    expect(screen.queryByText("home page")).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(unhandled).toEqual([]);
  });
});
