import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useDailyChatLimitStore } from "@/store/dailyChatLimitStore";
import type { DailyChatSession } from "@/lib/dailyChatLimit";

const NOW = new Date("2026-11-02T10:00:00.000Z");
const session = (over: Partial<DailyChatSession> = {}): DailyChatSession => ({
  status: "ACTIVE", allowed: true, remainingSeconds: 120,
  startedAt: new Date(NOW.getTime() - 180_000).toISOString(), expiresAt: new Date(NOW.getTime() + 120_000).toISOString(),
  nextAvailableAt: null, serverNow: NOW.toISOString(), ...over,
});
const s = () => useDailyChatLimitStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  useDailyChatLimitStore.setState({ status: "LOADING", startedAt: null, expiresAt: null, nextAvailableAt: null, remainingSeconds: 0, clockSkewMs: 0 });
});
afterEach(() => vi.useRealTimers());

describe("dailyChatLimitStore countdown", () => {
  it("restores the remaining time from the expiry timestamp", () => {
    s().setSession(session());
    expect(s().status).toBe("ACTIVE");
    expect(s().remainingSeconds).toBe(120);
  });

  it("keeps counting down and never goes negative, flipping to EXPIRED at expiry", () => {
    s().setSession(session());
    vi.setSystemTime(NOW.getTime() + 30_000); s().tick();
    expect(s().remainingSeconds).toBe(90);
    vi.setSystemTime(NOW.getTime() + 500_000); s().tick();
    expect(s().remainingSeconds).toBe(0);
    expect(s().status).toBe("EXPIRED");
  });

  it("a refresh (a new setSession later) continues from real elapsed time, not from the start", () => {
    s().setSession(session());
    vi.setSystemTime(NOW.getTime() + 45_000);
    s().setSession(session({ remainingSeconds: 75, serverNow: new Date(NOW.getTime() + 45_000).toISOString() }));
    expect(s().remainingSeconds).toBe(75);
  });

  it("ignores a stale remainingSeconds number: the expiry timestamp wins", () => {
    s().setSession(session({ remainingSeconds: 300 }));
    expect(s().remainingSeconds).toBe(120);
  });

  it("is not thrown off by a wrong browser clock", () => {
    // Browser clock is 10 minutes ahead of the server.
    vi.setSystemTime(NOW.getTime() + 600_000);
    s().setSession(session());
    expect(s().status).toBe("ACTIVE");
    expect(s().remainingSeconds).toBe(120);
    vi.setSystemTime(NOW.getTime() + 600_000 + 20_000); s().tick();
    expect(s().remainingSeconds).toBe(100);
  });

  it("tick can never increase the displayed time", () => {
    s().setSession(session());
    useDailyChatLimitStore.setState({ remainingSeconds: 50 });
    vi.setSystemTime(NOW.getTime() + 1_000); s().tick();
    expect(s().remainingSeconds).toBe(50);
  });

  it("an expired session stays at zero and is not reactivated by a sync", () => {
    s().setSession(session({ status: "EXPIRED", allowed: false, remainingSeconds: 0, expiresAt: new Date(NOW.getTime() - 1000).toISOString(), nextAvailableAt: "2026-11-02T18:30:00.000Z" }));
    expect(s().status).toBe("EXPIRED");
    expect(s().remainingSeconds).toBe(0);
    s().tick();
    expect(s().status).toBe("EXPIRED");
  });

  it("an ACTIVE payload whose expiry already passed is treated as expired", () => {
    s().setSession(session({ expiresAt: new Date(NOW.getTime() - 1000).toISOString(), remainingSeconds: 5 }));
    expect(s().status).toBe("EXPIRED");
    expect(s().remainingSeconds).toBe(0);
  });
});
