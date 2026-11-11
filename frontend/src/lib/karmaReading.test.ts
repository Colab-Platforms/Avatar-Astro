import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
import { aiChat } from "@/lib/aiClient";
import i18n from "@/i18n";
import { askKarma, buildKarmaPrompt, parseKarmaAnswer } from "./karmaReading";
import { calendarFacts, namesOtherCalendarFacts, parseCalendar, type TodayCalendar } from "./karmaCalendar";

// All provider responses in this file are MOCKED; no live AI call is made.
const calendar: TodayCalendar = {
  date: "2026-11-02", place: "New Delhi, India", timezone: "Asia/Kolkata", reckonedAtLocal: "2026-11-02 17:46",
  vara: "Monday", paksha: "Krishna", masa: "Ashvina",
  tithi: { name: "Navami", numberInPaksha: 9, endsAtLocal: "Tue, 3 Nov 2026, 11:55" },
  nakshatra: { name: "Ashlesha", pada: 3 }, yoga: "Shukla", karana: "Taitila", sunrise: "06:33", sunset: "17:35", festivals: null, notes: [],
};
const hiReply = { thought: "छोटी आदतें हमारे मन को शांत करती हैं।", action: "आज किसी एक व्यक्ति को धन्यवाद कहें।", remember: "आप फिर से शुरू कर सकते हैं।" };
const good = { thought: "Small habits shape how we feel.", action: "Say thank you to one person today.", remember: "You can begin again any time." };

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
    expect(p).toMatch(/Never name any tithi, nakshatra, yoga, karana, month, festival or weekday, and never say what any of them means/);
    expect(p).toMatch(/do NOT name any of it in your reply/);
    expect(p).toContain("dark half (the Moon grows smaller each night)"); // the one Moon idea it may use
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
  it("keeps each part short", () => {
    const r = parseKarmaAnswer(JSON.stringify({ ...good, thought: "x".repeat(900) }), null)!;
    expect(r.thought.length).toBeLessThanOrEqual(300);
  });
  it("refuses an answer that names any tithi, nakshatra or weekday (English, Hinglish or Hindi), even today's verified ones", () => {
    for (const thought of ["Today is Ekadashi.", "Purnima is near.", "Navami is a good day.", "The Moon is in Ashlesha.", "On Monday you may begin.", "Aaj Somvar hai."]) {
      expect(parseKarmaAnswer(JSON.stringify({ ...good, thought }), calendar), thought).toBeNull();
    }
    for (const thought of ["आज दशमी है।", "मघा नक्षत्र अच्छा है।", "सोमवार को शुरू करें।"]) {
      expect(parseKarmaAnswer(JSON.stringify({ thought, action: "आज किसी की मदद करें।", remember: "आप कर सकते हैं।" }), calendar, "hi"), thought).toBeNull();
    }
  });
  it("refuses scripture quotes and a figure that looks like a verse reference", () => {
    for (const thought of ["As the Gita says in Chapter 2, Verse 47, act well.", "See 2.47 for help.", "गीता में लिखा है।"]) {
      expect(parseKarmaAnswer(JSON.stringify({ ...good, thought }), calendar), thought).toBeNull();
    }
  });
  it("accepts only the chosen language (any of the ten), judged by isInLanguage", () => {
    const ta = { thought: "சிறிய பழக்கங்கள் மனதை அமைதிப்படுத்துகின்றன.", action: "இன்று ஒருவருக்கு நன்றி சொல்லுங்கள்.", remember: "நீங்கள் மீண்டும் தொடங்கலாம்." };
    expect(parseKarmaAnswer(JSON.stringify(hiReply), calendar, "hi")).toEqual(hiReply);
    expect(parseKarmaAnswer(JSON.stringify(ta), calendar, "ta")).toEqual(ta);
    expect(parseKarmaAnswer(JSON.stringify(hiReply), calendar, "en")).toBeNull(); // Devanagari when English was asked
    expect(parseKarmaAnswer(JSON.stringify(hiReply), calendar, "ta")).toBeNull(); // Hindi when Tamil was asked
    expect(parseKarmaAnswer(JSON.stringify(good), calendar, "hi")).toBeNull(); // English when Hindi was asked
    expect(parseKarmaAnswer(JSON.stringify(good), calendar, "ta")).toBeNull();
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
  it("asks once more when a reply fails the checks, and only then shows an error", async () => {
    let n = 0;
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(++n === 1 ? { ...good, thought: "Today is Ekadashi." } : good)));
    expect(await askKarma("What should I do?", calendar)).toEqual(good);
    expect(aiChat).toHaveBeenCalledTimes(2);
    vi.mocked(aiChat).mockClear();
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify({ ...good, thought: "Today is Ekadashi." })));
    await expect(askKarma("What should I do?", calendar)).rejects.toThrow(/didn't come out right/);
    expect(aiChat).toHaveBeenCalledTimes(2); // one retry, no more
  });

  it("the request carries the chosen language and the prompt asks for it", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(hiReply)));
    await askKarma("hello there", calendar, [], "hi");
    const body = vi.mocked(aiChat).mock.calls[0][0];
    expect(body.language).toBe("hi");
    expect(body.messages[0].content).toContain("chosen language");
    vi.mocked(aiChat).mockClear();
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(good)));
    await askKarma("hello there", calendar, [], "en");
    expect(vi.mocked(aiChat).mock.calls[0][0].language).toBe("en");
  });

  it("a wrong-language reply is retried once with a firm note, then refused with a translated message (never English)", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(good))); // English for a Hindi request
    await expect(askKarma("hello there", calendar, [], "hi")).rejects.toThrow(i18n.t("karma.errors.wrongLanguage", { lng: "hi" }));
    expect(aiChat).toHaveBeenCalledTimes(2);
    const retry = vi.mocked(aiChat).mock.calls[1][0];
    expect(JSON.stringify(retry.messages)).toContain("not written in Hindi");
    expect(retry.language).toBe("hi");
    // the second attempt can still rescue it
    vi.mocked(aiChat).mockClear();
    let n = 0;
    vi.mocked(aiChat).mockImplementation(() => ok(JSON.stringify(++n === 1 ? good : hiReply)));
    expect(await askKarma("hello there", calendar, [], "hi")).toEqual(hiReply);
  });

  it("errors are shown in the reply language", async () => {
    vi.mocked(aiChat).mockImplementation(() => Promise.resolve(new Response("{}", { status: 429 })));
    await expect(askKarma("hello there", calendar, [], "hi")).rejects.toThrow(i18n.t("karma.errors.rate", { lng: "hi" }));
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
