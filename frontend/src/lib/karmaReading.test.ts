import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
import { aiChat } from "@/lib/aiClient";
import { askKarma, buildKarmaPrompt, parseKarmaAnswer } from "./karmaReading";
import { calendarFacts, namesOtherCalendarFacts, parseCalendar, type TodayCalendar } from "./karmaCalendar";

// All provider responses in this file are MOCKED; no live AI call is made.
const calendar: TodayCalendar = {
  date: "2026-11-02", place: "New Delhi, India", timezone: "Asia/Kolkata", reckonedAtLocal: "2026-11-02 17:46",
  vara: "Monday", paksha: "Krishna", masa: "Ashvina",
  tithi: { name: "Navami", numberInPaksha: 9, endsAtLocal: "Tue, 3 Nov 2026, 11:55" },
  nakshatra: { name: "Ashlesha", pada: 3 }, yoga: "Shukla", karana: "Taitila", sunrise: "06:33", sunset: "17:35", festivals: null, notes: [],
};
const good = { meaning: "Today is a dark-moon day, the ninth day. It is a time to slow down.", thought: "Small habits shape how we feel.", action: "Say thank you to one person today.", remember: "You can begin again any time." };

describe("calendar facts", () => {
  it("lists only the facts that exist", () => {
    expect(calendarFacts(calendar).map((f) => f.label)).toEqual(["Tithi", "Paksha", "Nakshatra", "Day", "Month", "Yoga", "Karana"]);
    expect(calendarFacts({ ...calendar, yoga: "", karana: "", masa: "" }).map((f) => f.label)).toEqual(["Tithi", "Paksha", "Nakshatra", "Day"]);
  });
  it("accepts only a complete server reply", () => {
    expect(parseCalendar(calendar)).not.toBeNull();
    expect(parseCalendar({})).toBeNull();
    expect(parseCalendar({ ...calendar, paksha: "Bright" })).toBeNull();
    expect(parseCalendar({ ...calendar, tithi: { ...calendar.tithi, numberInPaksha: 22 } })).toBeNull();
    expect(parseCalendar({ ...calendar, nakshatra: { name: "", pada: 1 } })).toBeNull();
  });
  it("spots a tithi or nakshatra that is not today's", () => {
    expect(namesOtherCalendarFacts("Today is Navami, a calm day.", calendar)).toBe(false);
    expect(namesOtherCalendarFacts("The Moon is in Ashlesha.", calendar)).toBe(false);
    expect(namesOtherCalendarFacts("Today is Ekadashi, keep a fast.", calendar)).toBe(true);
    expect(namesOtherCalendarFacts("The Moon is in Rohini.", calendar)).toBe(true);
    expect(namesOtherCalendarFacts("Be kind today.", calendar)).toBe(false);
  });
});

describe("prompt", () => {
  it("hands the verified facts to the model and forbids adding others", () => {
    const p = buildKarmaPrompt(calendar);
    expect(p).toContain("- Tithi: Navami");
    expect(p).toContain("- Nakshatra: Ashlesha");
    expect(p).toContain("verified");
    expect(p).toMatch(/Never name a tithi, nakshatra, yoga, karana, month or festival other than the verified ones/);
    expect(p).toMatch(/child can understand/);
  });
  it("says so, and forbids calendar talk, when no calendar is available", () => {
    const p = buildKarmaPrompt(null);
    expect(p).toContain("not available right now");
    expect(p).not.toContain("- Tithi:");
    expect(p).toMatch(/Do not mention any tithi/);
  });
});

describe("parseKarmaAnswer", () => {
  it("parses clean JSON, code fences and surrounding prose", () => {
    expect(parseKarmaAnswer(JSON.stringify(good), calendar)).toEqual(good);
    expect(parseKarmaAnswer("Here:\n```json\n" + JSON.stringify(good) + "\n```", calendar)).not.toBeNull();
  });
  it("needs a thought and an action", () => {
    expect(parseKarmaAnswer("not json", calendar)).toBeNull();
    expect(parseKarmaAnswer(JSON.stringify({ ...good, action: "" }), calendar)).toBeNull();
    expect(parseKarmaAnswer(JSON.stringify({ ...good, thought: "" }), calendar)).toBeNull();
  });
  it("drops the calendar meaning when there was no calendar, and keeps short fields short", () => {
    const r = parseKarmaAnswer(JSON.stringify({ ...good, thought: "x".repeat(900) }), null)!;
    expect(r.meaning).toBe("");
    expect(r.thought.length).toBeLessThanOrEqual(320);
  });
  it("refuses an answer that names a calendar fact the calendar did not give", () => {
    expect(parseKarmaAnswer(JSON.stringify({ ...good, meaning: "Today is Ekadashi." }), calendar)).toBeNull();
    expect(parseKarmaAnswer(JSON.stringify({ ...good, thought: "Purnima is near." }), null)).toBeNull();
  });
  it("does not carry unknown fields through", () => {
    expect(parseKarmaAnswer(JSON.stringify({ ...good, score: 99, prediction: "wealth" }), calendar)).not.toHaveProperty("prediction");
  });
});

describe("askKarma", () => {
  beforeEach(() => { vi.mocked(aiChat).mockReset(); }); // braces: a returned function would be run as a cleanup hook
  const ok = (content: string) => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }));

  it("sends the verified calendar in the system message and returns the short answer", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(good)));
    expect(await askKarma("What should I focus on today?", calendar)).toEqual(good);
    const body = vi.mocked(aiChat).mock.calls[0][0];
    expect(body.library).toEqual({ feature: "karma" });
    expect(body.messages[0].content).toContain("- Tithi: Navami");
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "What should I focus on today?" });
  });
  it("includes at most the last two exchanges as context", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(good)));
    const turns = [1, 2, 3].map((n) => ({ question: "q" + n, answer: good }));
    await askKarma("next", calendar, turns);
    const msgs = vi.mocked(aiChat).mock.calls[0][0].messages;
    expect(msgs.map((m) => m.content).filter((c) => /^q\d$/.test(c))).toEqual(["q2", "q3"]);
  });
  it("maps provider failure, rate limit and bad output to safe messages", async () => {
    vi.mocked(aiChat).mockImplementation(() => Promise.resolve(new Response("{}", { status: 502 })));
    await expect(askKarma("hello there", calendar)).rejects.toThrow(/not available/);
    vi.mocked(aiChat).mockImplementation(() => Promise.resolve(new Response("{}", { status: 429 })));
    await expect(askKarma("hello there", calendar)).rejects.toThrow(/Too many/);
    vi.mocked(aiChat).mockImplementation(() => ok("not json"));
    await expect(askKarma("hello there", calendar)).rejects.toThrow(/didn't come out right/);
  });

  it("a network failure becomes a friendly message", async () => {
    vi.mocked(aiChat).mockImplementation(() => { throw new TypeError("network"); });
    await expect(askKarma("hello there", calendar)).rejects.toThrow(/couldn.t reach the guide/);
  });
});
