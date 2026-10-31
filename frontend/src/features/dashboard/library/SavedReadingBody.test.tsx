import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Opening a saved reading must never call a provider or the network for the reading itself.
const authRequest = vi.fn();
vi.mock("@/lib/authClient", () => ({ authRequest: (...a: unknown[]) => authRequest(...a), AuthApiError: class extends Error {}, AUTH_API_BASE_URL: "http://test/api" }));
const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ data: { gemstones: [], jewellery: [], chartLinked: [], complementary: [] } }), { status: 200 }));
vi.stubGlobal("fetch", fetchSpy);

import { SavedReadingBody, rendererKey, isRatnaOutput } from "./SavedReadingBody";
import gemstone from "./__fixtures__/gemstone-saved.json";

const mount = (feature: string, output: unknown) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><SavedReadingBody feature={feature} output={output} /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("Saved Ratna Jyotish reading (real calculator output)", () => {
  it("is recognised and rendered by the Ratna result view with the original content", async () => {
    expect(isRatnaOutput(gemstone)).toBe(true);
    expect(rendererKey("gemstone", gemstone)).toBe("gemstone");
    mount("gemstone", gemstone);
    const out = await screen.findByTestId("reading-output");
    // primary recommendation
    expect(await screen.findByTestId("recommended-stone")).toHaveTextContent(/Diamond or White Sapphire/);
    expect(out).toHaveTextContent("हीरा");
    expect(out).toHaveTextContent(/Venus/);
    expect(out).toHaveTextContent(/Friday/);
    // traditional associations and customs, presented as tradition
    expect(out).toHaveTextContent(/Harmony and relationships/);
    expect(out).toHaveTextContent(/Platinum or silver/);
    expect(out).toHaveTextContent(/Middle or ring finger/);
    expect(out).toHaveTextContent(/not a personalised prescription|traditional/i);
    // birth details and panchang
    expect(out).toHaveTextContent("Asha Rao");
    expect(out).toHaveTextContent(/Pune/);
    expect(out).toHaveTextContent(/Shatabhisha/);
    expect(out).toHaveTextContent(/Saptami/);
    expect(out).toHaveTextContent(/Jyeshtha/);
    expect(out).toHaveTextContent(/2047/);
    // limitations are preserved
    expect(out).toHaveTextContent(/Birth time unknown/i);
    expect(out).toHaveTextContent(/less specific than a full birth-chart reading/);
  });

  it("keeps the technical details, collapsed, with the audit data inside", async () => {
    mount("gemstone", gemstone);
    const summary = await screen.findByText("Technical details");
    const details = summary.closest("details")!;
    expect(details).not.toHaveAttribute("open");
    for (const label of ["Audit metadata", "Ayanamsa", "Ephemeris engine", "Calculation factors (primary stone)", "Explanation source", "Stable signs"]) {
      expect(within(details).getAllByText(label, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(details).toHaveTextContent(/Latitude/i);
    expect(details).toHaveTextContent(/Longitude/i);
  });

  it("shows no raw JSON anywhere and never writes or regenerates", async () => {
    mount("gemstone", gemstone);
    const out = await screen.findByTestId("reading-output");
    await waitFor(() => expect(within(out).getByTestId("recommended-stone")).toBeInTheDocument());
    expect(out.textContent).not.toMatch(/[{}]\s*"|":\s*[{["]|\[object Object\]/);
    // The only requests are read-only catalogue lookups for the shop section; nothing is POSTed, PATCHed or regenerated.
    for (const call of authRequest.mock.calls) expect(String((call[1] as { method?: string } | undefined)?.method ?? "GET").toUpperCase()).toBe("GET");
    expect(authRequest.mock.calls.every((c) => !/gemstone-calculator\/calculate|\/ai\/|interpretation|tarot\/reading/.test(String(c[0])))).toBe(true);
    for (const call of fetchSpy.mock.calls as unknown as [string, RequestInit?][]) expect((call[1]?.method ?? "GET").toUpperCase()).toBe("GET");
  });

  it("falls back to the structured view (never half-rendered) for a Ratna result from an older build", () => {
    const legacy = { status: "complete", method: { name: "x" } };
    expect(isRatnaOutput(legacy)).toBe(false);
    expect(rendererKey("gemstone", legacy)).toBe("structured");
  });
});

describe("Saved Tarot reading", () => {
  const timeline = {
    currentLifeStage: "A phase of consolidation.", overallMessage: "Trust the slow build.", mainOpportunity: "A patient collaboration.",
    timelineNarrative: [{ position: "Past", card: "The Star", insight: "Hope returns." }, { position: "Present", card: "Two of Cups", insight: "A partnership forms." }],
    extraField: "Kept even though no layout names it",
  };
  it("shows the spread with positions and cards, the guidance, and any extra field", () => {
    expect(rendererKey("tarot", timeline)).toBe("tarot");
    mount("tarot", timeline);
    const spread = screen.getByRole("region", { name: "Your spread" });
    expect(within(spread).getByText("The Star")).toBeInTheDocument();
    expect(within(spread).getByText("Past")).toBeInTheDocument();
    expect(within(spread).getByText("Hope returns.")).toBeInTheDocument();
    expect(screen.getByText("Current life stage")).toBeInTheDocument();
    expect(screen.getByText("Main opportunity")).toBeInTheDocument();
    expect(screen.getByText("Kept even though no layout names it")).toBeInTheDocument();
  });
  it("renders the karma mode too", () => {
    mount("tarot", { cardInsights: [{ position: "Current Karma", card: "Death", insight: "An ending." }], rootCause: "Attachment.", lifeAreasAffected: ["Work", "Home"], positiveAffirmation: "I release." });
    expect(screen.getByText("Death")).toBeInTheDocument();
    expect(screen.getByText("Root cause")).toBeInTheDocument();
    expect(screen.getByText("Work")).toBeInTheDocument();
    expect(screen.getByText("Positive affirmation")).toBeInTheDocument();
  });
});

describe("Readings without a dedicated renderer", () => {
  it("get a readable structured document: facts, prose and lists, with technical fields collapsed", () => {
    const out = { sign: "Leo", date: "2026-10-31", horoscope: "A steady day.\n\nAvoid rushing money choices.", lucky: ["Red", "7"], meta: { provider: "x", model: "y" } };
    expect(rendererKey("horoscope", out)).toBe("structured");
    mount("horoscope", out);
    const root = screen.getByTestId("reading-output");
    expect(within(root).getByText("At a glance")).toBeInTheDocument();
    expect(within(root).getByText("Leo")).toBeInTheDocument();
    expect(within(root).getByText(/Avoid rushing money choices/)).toBeInTheDocument();
    expect(within(root).getByText("Red")).toBeInTheDocument();
    const tech = within(root).getByText("Technical details").closest("details")!;
    expect(tech).not.toHaveAttribute("open");
    expect(tech).toHaveTextContent(/Provider/);
    expect(root.textContent).not.toMatch(/[{}]\s*"|":\s*[{["]|\[object Object\]/);
  });
  it("handles deeply nested objects and arrays of objects without printing JSON", () => {
    mount("compatibility", { analysis: { score: 82, sections: [{ title: "Love", body: "Warm." }, { title: "Work", body: "Steady." }] } });
    const root = screen.getByTestId("reading-output");
    expect(root).toHaveTextContent("Love");
    expect(root).toHaveTextContent("Steady.");
    expect(root.textContent).not.toMatch(/[{}]\s*"|\[object Object\]/);
  });
  it("says so honestly when there is nothing to show", () => {
    mount("karma", {});
    expect(screen.getByText(/no displayable content/)).toBeInTheDocument();
  });
});
