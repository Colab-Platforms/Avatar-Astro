import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// The API is MOCKED (authRequest). These tests cover what each page asks for, shows, and what its actions send.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({ authRequest: (...a: unknown[]) => authRequest(...a), AuthApiError: class extends Error {}, AUTH_API_BASE_URL: "http://t/api" }));
vi.mock("@/lib/featureFlags", () => ({ useFeatureFlags: () => ({ status: "ready", disabled: [], isPathDisabled: () => false }) }));
vi.mock("@/store/authStore", () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { firstName: "Asha", role: "USER" } }) }));

import { Overview, MyReadings, ReadingDetail, Saved, MyActivity, Conversations, ConversationDetail, MyBookings } from "./pages";

const reading = (o: object = {}) => ({ id: "r1", feature: "tarot", featureLabel: "Tarot", title: "Karma tarot reading", summary: "A calm theme of letting go.", isSaved: false, savedAt: null, provider: "openrouter", model: "m", createdAt: "2026-10-30T10:00:00.000Z", ...o });
const overview = (o: object = {}) => ({
  stats: { readings: 2, savedReadings: 1, featuresExplored: 2, conversations: 1, lastActiveAt: "2026-10-30T10:00:00.000Z" },
  continue: { reading: reading(), conversation: { id: "c1", feature: "ai-guru", featureLabel: "AI Guru", title: "Career worries", preview: "p", lastMessageAt: "2026-10-30T11:00:00.000Z" }, lastFeature: { key: "tarot", label: "Tarot" } },
  recentReadings: [reading()],
  recentActivity: [{ id: "p_1", at: "2026-10-30T10:00:00.000Z", kind: "reading.generated", label: "Reading generated", feature: "tarot", featureLabel: "Tarot", title: "Karma tarot reading", status: "success", link: { type: "reading", id: "r1" } }],
  ...o,
});

function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
const mount = (ui: React.ReactNode, path = "/") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/readings/:id" element={<><ReadingDetail /><Where /></>} />
          <Route path="/dashboard/conversations/:id" element={<><ConversationDetail /><Where /></>} />
          <Route path="*" element={<>{ui}<Where /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};
const urls = () => authRequest.mock.calls.map((c) => String(c[0]));

beforeEach(() => { authRequest.mockReset(); });

describe("Overview", () => {
  it("shows real numbers, continue links and recent items; nothing hardcoded", async () => {
    authRequest.mockResolvedValue(overview());
    mount(<Overview />);
    await screen.findByText(/Namaste, Asha/);
    expect(screen.getByText("Readings generated").previousSibling).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Latest reading/ })).toHaveAttribute("href", "/dashboard/readings/r1");
    expect(screen.getByRole("link", { name: /Latest conversation/ })).toHaveAttribute("href", "/dashboard/conversations/c1");
    expect(screen.getByRole("link", { name: /Last used feature/ })).toHaveAttribute("href", "/tarot");
    expect(urls()).toEqual(["/me/overview"]);
  });
  it("welcomes a brand-new user with an empty state and real feature links", async () => {
    authRequest.mockResolvedValue(overview({ stats: { readings: 0, savedReadings: 0, featuresExplored: 0, conversations: 0, lastActiveAt: null }, continue: { reading: null, conversation: null, lastFeature: null }, recentReadings: [], recentActivity: [] }));
    mount(<Overview />);
    await screen.findByText("Your journey begins here");
    expect(screen.getByRole("link", { name: "Tarot reading" })).toHaveAttribute("href", "/tarot");
    expect(screen.queryByText("Continue where you left off")).toBeNull();
  });
  it("shows an error with retry", async () => {
    authRequest.mockRejectedValue(new Error("boom"));
    mount(<Overview />);
    await screen.findByRole("alert", undefined, { timeout: 4000 });
  });
});

describe("My Readings / Saved", () => {
  it("lists readings, sends filters, and saving calls the save endpoint for that reading only", async () => {
    authRequest.mockImplementation(async (u: string) => (u.startsWith("/me/readings") && !u.includes("/save") ? { items: [reading()], page: 1, pageSize: 12, total: 1, totalPages: 1, features: [{ value: "tarot", label: "Tarot" }] } : {}));
    mount(<MyReadings />, "/?feature=tarot&from=2026-10-01");
    await screen.findByText("Karma tarot reading");
    expect(urls().some((u) => u.includes("feature=tarot") && u.includes("from=2026-10-01") && !u.includes("saved"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Save "Karma tarot reading"/ }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/me/readings/r1/save", { method: "POST", body: { saved: true } }));
    expect(screen.getByRole("link", { name: "View reading" })).toHaveAttribute("href", "/dashboard/readings/r1");
  });
  it("Saved asks only for saved readings and has its own empty state", async () => {
    authRequest.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0, totalPages: 1, features: [] });
    mount(<Saved />);
    await screen.findByText("Nothing saved yet");
    expect(urls().some((u) => u.includes("saved=true"))).toBe(true);
  });
  it("empty and filtered-empty states differ", async () => {
    authRequest.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0, totalPages: 1, features: [] });
    const a = mount(<MyReadings />);
    await screen.findByText("No readings yet");
    a.unmount();
    mount(<MyReadings />, "/?feature=tarot");
    await screen.findByText("No readings match");
  });
});

describe("Reading detail", () => {
  it("shows the stored original output and makes no generation request", async () => {
    authRequest.mockResolvedValue({ ...reading(), output: { currentKarmaTheme: "Letting go of old patterns", cardInsights: [{ position: "Current Karma", card: "The Fool", insight: "A new start" }] }, updatedAt: "2026-10-30T10:00:00.000Z" });
    mount(<div />, "/dashboard/readings/r1");
    const out = await screen.findByTestId("reading-output");
    expect(within(out).getByText("Letting go of old patterns")).toBeInTheDocument();
    expect(within(out).getByText("A new start")).toBeInTheDocument();
    expect(screen.getByText(/not regenerated when you open it/)).toBeInTheDocument();
    expect(urls()).toEqual(["/me/readings/r1"]);
  });
  it("delete asks for confirmation, then deletes and returns to the library", async () => {
    authRequest.mockImplementation(async (_u: string, o?: { method?: string }) => (o?.method === "DELETE" ? { deleted: true } : { ...reading(), output: { summary: "kept text here for the test" }, updatedAt: "x" }));
    mount(<div />, "/dashboard/readings/r1");
    fireEvent.click(await screen.findByRole("button", { name: /Delete/ }));
    const dlg = await screen.findByRole("alertdialog");
    expect(authRequest).not.toHaveBeenCalledWith("/me/readings/r1", { method: "DELETE" });
    fireEvent.click(within(dlg).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/me/readings/r1", { method: "DELETE" }));
  });
  it("a missing or someone else's reading shows a not-found error and no content", async () => {
    authRequest.mockRejectedValue(new Error("Reading not found"));
    mount(<div />, "/dashboard/readings/zzz");
    await screen.findByText("Reading not found");
    expect(screen.queryByTestId("reading-output")).toBeNull();
  });
});

describe("Activity", () => {
  it("shows events with links to their readings, sends filters, and pages with a cursor", async () => {
    authRequest.mockImplementation(async (u: string) => (u.includes("before=") ? { items: [], nextBefore: null, kinds: [] } : { items: overview().recentActivity, nextBefore: "2026-10-30T09:00:00.000Z", kinds: [{ value: "reading.generated", label: "Reading generated" }] }));
    mount(<MyActivity />, "/?kind=reading.generated&feature=tarot");
    const row = await screen.findByRole("link", { name: /Reading generated/ });
    expect(row).toHaveAttribute("href", "/dashboard/readings/r1");
    expect(urls()[0]).toContain("kind=reading.generated");
    expect(urls()[0]).toContain("feature=tarot");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(urls().some((u) => u.includes("before=2026-10-30T09%3A00%3A00.000Z"))).toBe(true));
  });
});

describe("Conversations", () => {
  it("lists, opens messages in order, offers Continue for AI Guru, and deletes after confirmation", async () => {
    const conv = { id: "c1", feature: "ai-guru", featureLabel: "AI Guru", title: "Career worries", createdAt: "2026-10-30T10:00:00.000Z", lastMessageAt: "2026-10-30T11:00:00.000Z", messages: [{ id: "m1", role: "user", content: "I feel stuck", createdAt: "x" }, { id: "m2", role: "assistant", content: "Tell me more", createdAt: "y" }] };
    authRequest.mockImplementation(async (u: string, o?: { method?: string }) =>
      o?.method === "DELETE" ? { deleted: true } : u === "/me/conversations/c1" ? conv : { items: [{ id: "c1", feature: "ai-guru", featureLabel: "AI Guru", title: "Career worries", preview: "Tell me more", createdAt: "2026-10-30T10:00:00.000Z", lastMessageAt: "2026-10-30T11:00:00.000Z", messageCount: 2 }], page: 1, pageSize: 12, total: 1, totalPages: 1 });
    const a = mount(<Conversations />);
    expect(await screen.findByRole("link", { name: /Career worries/ })).toHaveAttribute("href", "/dashboard/conversations/c1");
    a.unmount();
    mount(<div />, "/dashboard/conversations/c1");
    const msgs = await screen.findByRole("list", { name: "Messages" });
    expect(within(msgs).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["You: I feel stuck", "Guide: Tell me more"]);
    expect(screen.getByRole("link", { name: "Continue this conversation" })).toHaveAttribute("href", "/inner-voice/chat?conversation=c1");
    fireEvent.click(screen.getByRole("button", { name: /Delete/ }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(authRequest).toHaveBeenCalledWith("/me/conversations/c1", { method: "DELETE" }));
  });
});

describe("Bookings", () => {
  it("states plainly that no such records exist; nothing invented", async () => {
    authRequest.mockResolvedValue({ configured: false, items: [], reason: "Puja and Darshan bookings are not part of the site yet: no booking records exist." });
    mount(<MyBookings />);
    await screen.findByText(/not part of the site yet/);
    expect(screen.queryByRole("table")).toBeNull();
  });
});
