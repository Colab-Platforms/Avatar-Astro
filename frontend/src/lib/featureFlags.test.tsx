import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { featureForPath, useFeatureFlags, __resetFeatureFlags } from "./featureFlags";
import FeatureRouteGuard from "@/components/FeatureRouteGuard";

// The network is MOCKED; these tests cover how the UI reacts to the public config.
const config = (disabledFeatures: string[]) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { disabledFeatures } }) });

beforeEach(() => {
  __resetFeatureFlags();
  vi.unstubAllGlobals();
});

describe("featureForPath", () => {
  it("maps tool pages (and their sub-routes) to backend features", () => {
    expect(featureForPath("/tarot")).toBe("tarot");
    expect(featureForPath("/ratna-jyotish/result")).toBe("gemstone");
    expect(featureForPath("/name-destiny-report")).toBe("name-analysis");
    expect(featureForPath("/inner-voice/chat")).toBe("ai-chat");
    expect(featureForPath("/inner-voice/future-path")).toBe("inner-voice");
    expect(featureForPath("/zodiac")).toBe("zodiac");
    expect(featureForPath("/zodiac/aries")).toBe("zodiac");
    expect(featureForPath("/gemstone-calculator")).toBe("gemstone");
  });
  it("never gates unrelated pages, the Inner Voice hub page itself, or Karma Score", () => {
    for (const p of ["/", "/blog", "/contact", "/puja", "/shop", "/avatar-live/darshan", "/inner-voice", "/inner-voice/dashboard", "/tarotx", "/dashboard"]) {
      expect(featureForPath(p), p).toBeNull();
    }
  });
  it("treats the hub link as the Know Your Karma link only when asked", () => {
    expect(featureForPath("/inner-voice", true)).toBe("ai-chat");
    expect(featureForPath("/inner-voice/dashboard", true)).toBeNull();
  });
});

describe("useFeatureFlags", () => {
  it("reports which paths are disabled", async () => {
    vi.stubGlobal("fetch", config(["tarot"]));
    const { result } = renderHook(() => useFeatureFlags());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.isPathDisabled("/tarot")).toBe(true);
    expect(result.current.isPathDisabled("/birth-chart")).toBe(false);
  });
  it("fails open when the config request fails: nothing is hidden", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const { result } = renderHook(() => useFeatureFlags());
    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.isPathDisabled("/tarot")).toBe(false);
  });
  it("ignores malformed config payloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { disabledFeatures: "tarot" } }) }));
    const { result } = renderHook(() => useFeatureFlags());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.disabled).toEqual([]);
  });
});

describe("refresh on returning to the tab", () => {
  it("re-checks the switches when the window regains focus after the throttle, without polling", async () => {
    const fetchMock = config(["tarot"]);
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useFeatureFlags());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("focus")); // inside the throttle window: no new request
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const realNow = Date.now;
    Date.now = () => realNow() + 31_000;
    try {
      window.dispatchEvent(new Event("focus"));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    } finally {
      Date.now = realNow;
    }
  });
});

describe("FeatureRouteGuard", () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <FeatureRouteGuard>
          <Routes>
            <Route path="*" element={<p>PAGE CONTENT</p>} />
          </Routes>
        </FeatureRouteGuard>
      </MemoryRouter>,
    );

  it("blocks a direct visit to a disabled tool with a clear notice", async () => {
    vi.stubGlobal("fetch", config(["tarot"]));
    renderAt("/tarot");
    await screen.findByText("Temporarily unavailable");
    expect(screen.queryByText("PAGE CONTENT")).toBeNull();
  });
  it("leaves enabled tools and unrelated pages alone", async () => {
    vi.stubGlobal("fetch", config(["tarot"]));
    renderAt("/birth-chart");
    await screen.findByText("PAGE CONTENT");
    expect(screen.queryByText("Temporarily unavailable")).toBeNull();
  });
  it("never blocks non-tool pages even when everything is disabled", async () => {
    vi.stubGlobal("fetch", config(["tarot", "ai-chat", "inner-voice", "interpretation"]));
    renderAt("/blog");
    await screen.findByText("PAGE CONTENT");
  });
  it("renders the tool normally if the config cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    renderAt("/tarot");
    await screen.findByText("PAGE CONTENT");
  });
});
