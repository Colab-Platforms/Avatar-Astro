import { describe, expect, it } from "vitest";
import { sunSignForDate } from "./sunSign";

describe("sunSignForDate", () => {
  it("finds the sign for ordinary dates", () => {
    expect(sunSignForDate("1990-05-17")).toBe("Taurus");
    expect(sunSignForDate("1985-08-01")).toBe("Leo");
    expect(sunSignForDate("2000-11-30")).toBe("Sagittarius");
  });
  it("handles every cusp day on both sides", () => {
    expect(sunSignForDate("1990-03-20")).toBe("Pisces");
    expect(sunSignForDate("1990-03-21")).toBe("Aries");
    expect(sunSignForDate("1990-04-19")).toBe("Aries");
    expect(sunSignForDate("1990-04-20")).toBe("Taurus");
    expect(sunSignForDate("1990-12-21")).toBe("Sagittarius");
    expect(sunSignForDate("1990-12-22")).toBe("Capricorn");
  });
  it("Capricorn wraps over the new year", () => {
    expect(sunSignForDate("1990-12-31")).toBe("Capricorn");
    expect(sunSignForDate("1991-01-01")).toBe("Capricorn");
    expect(sunSignForDate("1991-01-19")).toBe("Capricorn");
    expect(sunSignForDate("1991-01-20")).toBe("Aquarius");
  });
  it("every day of a leap year maps to a sign", () => {
    for (let d = 0; d < 366; d++) {
      const dt = new Date(Date.UTC(2000, 0, 1 + d)).toISOString().slice(0, 10);
      expect(sunSignForDate(dt), dt).not.toBeNull();
    }
  });
  it("nothing is guessed for missing or malformed dates", () => {
    expect(sunSignForDate(null)).toBeNull();
    expect(sunSignForDate("")).toBeNull();
    expect(sunSignForDate("17/05/1990")).toBeNull();
  });
});
