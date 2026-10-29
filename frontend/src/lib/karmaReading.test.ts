import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
import { aiChat } from "@/lib/aiClient";
import { parseKarmaReading, fetchKarmaReading } from "./karmaReading";

// All provider responses in this file are MOCKED; no live AI call is made.
const good = {
  lifeDomain: "Career",
  overview: "You feel stuck at work.",
  meaning: "Repeated habits shape outcomes.",
  insights: [{ title: "Habits", text: "Small daily actions matter." }, { title: "", text: "dropped" }],
  soulLesson: "Patience.",
  guidance: ["Talk to your manager", "Update your CV"],
  practice: "Om Namah Shivaya x 11",
  reflectionQuestion: "What would change if you acted first?",
  affirmation: "I act with clarity.",
};

describe("parseKarmaReading", () => {
  it("parses clean JSON and drops incomplete insights", () => {
    const r = parseKarmaReading(JSON.stringify(good))!;
    expect(r.overview).toBe(good.overview);
    expect(r.insights).toHaveLength(1);
    expect(r.guidance).toHaveLength(2);
  });
  it("tolerates code fences and surrounding prose", () => {
    expect(parseKarmaReading("Here you go:\n```json\n" + JSON.stringify(good) + "\n```")).not.toBeNull();
  });
  it("returns null for malformed or incomplete output", () => {
    expect(parseKarmaReading("not json")).toBeNull();
    expect(parseKarmaReading("{}")).toBeNull();
    expect(parseKarmaReading(JSON.stringify({ ...good, guidance: [] }))).toBeNull();
  });
  it("does not carry fabricated score fields through", () => {
    const r = parseKarmaReading(JSON.stringify({ ...good, karmaScores: { spiritual: 72 }, rootPlanet: "Saturn" })) as object;
    expect(r).not.toHaveProperty("karmaScores");
    expect(r).not.toHaveProperty("rootPlanet");
  });
});

describe("fetchKarmaReading", () => {
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
  beforeEach(() => vi.mocked(aiChat).mockReset());

  it("returns a reading on success", async () => {
    vi.mocked(aiChat).mockResolvedValue(reply(200, { choices: [{ message: { content: JSON.stringify(good) } }] }));
    expect((await fetchKarmaReading("I am stuck in my job")).lifeDomain).toBe("Career");
  });
  it("maps provider failure, rate limit and bad output to safe messages", async () => {
    vi.mocked(aiChat).mockResolvedValue(reply(502, { error: { message: "upstream stack trace" } }));
    await expect(fetchKarmaReading("x".repeat(20))).rejects.toThrow(/unavailable/);
    vi.mocked(aiChat).mockResolvedValue(reply(429, {}));
    await expect(fetchKarmaReading("x".repeat(20))).rejects.toThrow(/Too many/);
    vi.mocked(aiChat).mockResolvedValue(reply(200, { choices: [{ message: { content: "garbage" } }] }));
    await expect(fetchKarmaReading("x".repeat(20))).rejects.toThrow(/incomplete/);
  });
});
