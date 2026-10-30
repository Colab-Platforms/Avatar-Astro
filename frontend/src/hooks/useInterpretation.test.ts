import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAIDailyHoroscope } from "./useInterpretation";

// The network is MOCKED. Regression: the hook's own callback is named `fetch`; it used to call itself instead of the browser's fetch.
afterEach(() => vi.unstubAllGlobals());

describe("useAIDailyHoroscope", () => {
  it("requests the horoscope for the sign through the browser fetch, exactly once, and stores the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { summary: "A calm day." } }) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAIDailyHoroscope("aries"));
    await act(async () => { await result.current.fetch(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/interpretation\/horoscope\/aries$/);
    expect(result.current.data).toEqual({ summary: "A calm day." });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("reports the server failure instead of looping", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAIDailyHoroscope("leo"));
    await act(async () => { await result.current.fetch().catch(() => {}); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe("Failed to generate horoscope");
    expect(result.current.data).toBeNull();
  });

  it("does nothing without a sign", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAIDailyHoroscope(""));
    await act(async () => { await result.current.fetch(); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
