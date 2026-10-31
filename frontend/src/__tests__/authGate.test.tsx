import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/features/auth/api/authApi", () => ({
  authApi: { login: vi.fn(), googleLogin: vi.fn() },
}));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({
  GoogleAuthButton: () => <button type="button">Google</button>,
}));
vi.mock("@/features/ratna/api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));
vi.mock("@/features/ratna/loaderTiming", () => ({ MIN_LOADER_MS: 0 }));
vi.mock("@/lib/authClient", async (orig) => ({ ...(await orig<object>()), refreshAccessToken: vi.fn() }));

import SignInPrompt from "@/components/SignInPrompt";
import { requireSignIn, useSignInPrompt } from "@/lib/authedFetch";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/features/auth/api/authApi";
import RatnaJyotish from "@/pages/RatnaJyotish";
import { ratnaApi } from "@/features/ratna/api";
import { complete, delhi, emptyShop, fillPersonalAndPanchang } from "@/features/ratna/__tests__/fixtures";

const signedOut = () => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
const session = { user: { id: "u1", firstName: "A", lastName: "B", email: "a@b.in" } as never, accessToken: "tok", refreshToken: "ref" };

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <SignInPrompt />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  signedOut();
  useSignInPrompt.setState({ open: false, pending: null });
});

describe("sign-in gate", () => {
  it("signed in: runs straight through, no dialog", () => {
    useAuthStore.setState({ ...session, isAuthenticated: true });
    const resume = vi.fn();
    mount();
    expect(requireSignIn(resume)).toBe(true);
    expect(resume).not.toHaveBeenCalled(); // the caller continues itself
    expect(screen.queryByTestId("signin-gate")).toBeNull();
  });

  it("signed out: opens the dialog with the unlock message, login and create-account, and runs nothing yet", () => {
    mount();
    const resume = vi.fn();
    act(() => {
      expect(requireSignIn(resume)).toBe(false);
    });
    const gate = screen.getByTestId("signin-gate");
    expect(gate).toHaveTextContent("Your cosmic insights are ready to be unlocked.");
    expect(gate).toHaveTextContent("log in or create an account to view your personalized results");
    expect(screen.getByRole("button", { name: "Continue to Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Account" })).toHaveAttribute("href", "/register");
    expect(resume).not.toHaveBeenCalled();
  });

  it("logging in from the dialog resumes the pending action exactly once", async () => {
    vi.mocked(authApi.login).mockResolvedValue(session as never);
    mount();
    const resume = vi.fn();
    act(() => void requireSignIn(resume));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.in" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Login" }));

    await waitFor(() => expect(resume).toHaveBeenCalledTimes(1));
    expect(authApi.login).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("signin-gate")).toBeNull();
    // Later session changes (token refresh, re-render) never run it again.
    act(() => useAuthStore.setState({ accessToken: "tok2" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("wrong credentials: stays open, shows no success, runs nothing", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid email or password"));
    mount();
    const resume = vi.fn();
    act(() => void requireSignIn(resume));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.in" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to Login" }));
    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    expect(screen.getByTestId("signin-gate")).toBeInTheDocument();
    expect(resume).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("validates the form before calling the server", async () => {
    mount();
    act(() => void requireSignIn(vi.fn()));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Login" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("closing the dialog drops the pending action: signing in later does not run it", async () => {
    mount();
    const resume = vi.fn();
    act(() => void requireSignIn(resume));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByTestId("signin-gate")).toBeNull();
    expect(useSignInPrompt.getState().pending).toBeNull();
    act(() => useAuthStore.setState({ ...session, isAuthenticated: true }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(resume).not.toHaveBeenCalled();
  });

  it("a second Generate while the dialog is open replaces the first: still only one run", async () => {
    mount();
    const first = vi.fn();
    const second = vi.fn();
    act(() => void requireSignIn(first));
    act(() => void requireSignIn(second));
    act(() => useAuthStore.setState({ ...session, isAuthenticated: true }));
    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
  });
});

describe("every result-generating feature is behind the gate, with resume", () => {
  const src = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
  const gated: [string, RegExp][] = [
    ["pages/TarotExperience.tsx", /requireSignIn\(\(\) => \{ void fetchReading/],
    ["pages/BirthChart.tsx", /requireSignIn\(\(\)=>\{void generate\(\);\}\)/],
    ["pages/CompatibilityChecker.tsx", /requireSignIn\(\(\) => \{ void compute\(\); \}\)/],
    ["pages/PalmReading.tsx", /requireSignIn\(\(\) => handleFile/],
    ["pages/RatnaJyotish.tsx", /requireSignIn\(\(\) => \{ void onSubmit/],
    ["pages/InnerVoice.tsx", /requireSignIn\(\(\) => \{ void diagnose\(\); \}\)/],
    ["pages/InnerVoiceChat.tsx", /requireSignIn\(\(\)=>\{void send\(/],
    ["pages/InnerVoiceWisdom.tsx", /requireSignIn\(\(\) => \{ void fetchWisdom/],
    ["pages/FutureLifePath.tsx", /requireSignIn\(\(\) => \{ void generate\(\); \}\)/],
    ["pages/NameDestinyReportPage.tsx", /requireSignIn\(\(\) => handleSubmit/],
  ];
  it.each(gated)("%s", (file, pattern) => {
    expect(src(file)).toMatch(pattern);
  });

  it("the Ratna and Janma Kundali calculations send the user's token (the server answers 401 without it)", () => {
    const ratna = src("features/ratna/api.ts");
    const calc = ratna.slice(ratna.indexOf("calculate("), ratna.indexOf("products("));
    expect(calc).toContain("/gemstone-calculator/calculate");
    expect(calc).not.toContain("skipAuth");
    expect(src("features/kundali/api.ts")).not.toContain("skipAuth");
  });
});

describe("a real feature: Ratna Jyotish", () => {
  it("signed out: Generate opens the gate, nothing is sent, every field is kept; after sign-in it runs once", async () => {
    sessionStorage.clear();
    vi.mocked(ratnaApi.searchLocations).mockResolvedValue([delhi]);
    vi.mocked(ratnaApi.products).mockResolvedValue(emptyShop);
    vi.mocked(ratnaApi.calculate).mockResolvedValue(complete);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/ratna-jyotish"]}>
          <SignInPrompt />
          <RatnaJyotish />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fillPersonalAndPanchang();
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));

    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    expect(await screen.findByTestId("signin-gate")).toBeInTheDocument();
    expect(ratnaApi.calculate).not.toHaveBeenCalled();
    // The form is untouched behind the dialog.
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Verma");
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-05-05");
    expect(screen.getByLabelText("Exact birth time")).toHaveValue("10:00");
    expect(screen.getByLabelText("Birthplace")).toHaveValue(delhi.label); // by label: the dialog hides the page from role queries

    act(() => useAuthStore.setState({ ...session, isAuthenticated: true }));
    await waitFor(() => expect(ratnaApi.calculate).toHaveBeenCalledTimes(1));
    expect(vi.mocked(ratnaApi.calculate).mock.calls[0][0]).toMatchObject({ fullName: "Asha Verma", dateOfBirth: "1990-05-05", timeOfBirth: "10:00" });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(ratnaApi.calculate).toHaveBeenCalledTimes(1);
  });

  it("closing the gate sends nothing and keeps the form for another try", async () => {
    sessionStorage.clear();
    vi.mocked(ratnaApi.searchLocations).mockResolvedValue([delhi]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SignInPrompt />
          <RatnaJyotish />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fillPersonalAndPanchang();
    fireEvent.change(screen.getByLabelText("Exact birth time"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Birthplace" }), { target: { value: "Delhi" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: delhi.label }));
    fireEvent.click(screen.getByRole("button", { name: "CALCULATE MY RATNA" }));
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(ratnaApi.calculate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Full name")).toHaveValue("Asha Verma");
    expect(screen.getByRole("button", { name: "CALCULATE MY RATNA" })).toBeEnabled();
  });
});
