import { describe, it, expect } from "vitest";
import { guruTiming, SEARCH_STATUSES, statusAt, typingDelayMs } from "./guruTiming";

describe("typing delay", () => {
  it("is about 1-2 s for a short message, 2-3 s for a medium one and 3-5 s for a long one", () => {
    const short = typingDelayMs("Hello, I need help");
    const medium = typingDelayMs("x".repeat(100));
    const long = typingDelayMs("x".repeat(180));
    expect(short).toBeGreaterThanOrEqual(1000);
    expect(short).toBeLessThanOrEqual(2000);
    expect(medium).toBeGreaterThan(2000);
    expect(medium).toBeLessThanOrEqual(3000);
    expect(long).toBeGreaterThan(3000);
    expect(long).toBeLessThanOrEqual(5000);
  });
  it("never goes below the minimum or above the cap", () => {
    expect(typingDelayMs("")).toBe(guruTiming.typingMinMs);
    expect(typingDelayMs("x".repeat(5000))).toBe(guruTiming.typingMaxMs);
  });
  it("grows with the message and can be configured", () => {
    expect(typingDelayMs("x".repeat(80))).toBeGreaterThan(typingDelayMs("x".repeat(20)));
    expect(typingDelayMs("x".repeat(50), { typingMinMs: 0, typingPerCharMs: 0, typingMaxMs: 0 })).toBe(0);
  });
});

describe("search status text", () => {
  it("changes in order and stays on the last line if the search runs long", () => {
    expect(statusAt(0)).toBe(SEARCH_STATUSES[0]);
    expect(statusAt(guruTiming.statusEveryMs + 1)).toBe(SEARCH_STATUSES[1]);
    expect(statusAt(guruTiming.statusEveryMs * 2 + 1)).toBe(SEARCH_STATUSES[2]);
    expect(statusAt(60_000)).toBe(SEARCH_STATUSES[2]);
  });
});
