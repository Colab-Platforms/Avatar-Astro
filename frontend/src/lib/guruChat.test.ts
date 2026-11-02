import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
import { aiChat } from "@/lib/aiClient";
import { parseGuruReply, askGuru, trimHistory, GURU_CONSULTATION_SYSTEM, MAX_HISTORY_MESSAGES } from "./guruChat";

// Provider responses below are MOCKED; no live AI call is made.
describe("parseGuruReply", () => {
  it("parses a normal JSON reply and clamps progress", () => {
    const t = parseGuruReply(JSON.stringify({ type: "gathering", message: "Hello", progress: 250, readyForDiagnosis: true }))!;
    expect(t).toMatchObject({ message: "Hello", progress: 100, readyForDiagnosis: true });
  });
  it("uses plain text as the message instead of a canned reply", () => {
    expect(parseGuruReply("Just some advice.")!.message).toBe("Just some advice.");
  });
  it("never surfaces raw JSON without a message", () => {
    expect(parseGuruReply('{"foo":1}')).toBeNull();
    expect(parseGuruReply("")).toBeNull();
  });
  it("tolerates code fences", () => {
    expect(parseGuruReply('```json\n{"message":"Hi"}\n```')!.message).toBe("Hi");
  });
});

describe("prompt", () => {
  it("is honest about being an AI and answers questions first", () => {
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/You are an AI, not a human/);
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/answer it directly/);
  });
});

describe("askGuru", () => {
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
  beforeEach(() => vi.mocked(aiChat).mockReset());

  it("caps history and message length sent to the backend", async () => {
    vi.mocked(aiChat).mockResolvedValue(reply(200, { choices: [{ message: { content: '{"message":"ok"}' } }] }));
    const history = Array.from({ length: 40 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i}` }));
    await askGuru(history, "q".repeat(5000), "lang");
    const sent = vi.mocked(aiChat).mock.calls[0][0].messages;
    expect(sent.length).toBe(2 + MAX_HISTORY_MESSAGES + 1);
    expect(sent[sent.length - 1].content.length).toBe(1000);
    expect(trimHistory([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it("maps rate limit, provider failure and bad output to safe messages", async () => {
    vi.mocked(aiChat).mockResolvedValue(reply(429, {}));
    await expect(askGuru([], "hi", "")).rejects.toThrow(/Too many/);
    vi.mocked(aiChat).mockResolvedValue(reply(502, { error: { message: "secret upstream detail" } }));
    await expect(askGuru([], "hi", "")).rejects.toThrow(/unavailable/);
    vi.mocked(aiChat).mockResolvedValue(reply(200, { choices: [{ message: { content: '{"x":1}' } }] }));
    await expect(askGuru([], "hi", "")).rejects.toThrow(/incomplete/);
  });
});

describe("scripture references", () => {
  const ok = (message: string) => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ type: "gathering", message }) } }] }), { status: 200 }));
  beforeEach(() => { vi.mocked(aiChat).mockReset(); });

  it("the prompt asks for very simple words, short answers and verified-only scripture", () => {
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/as if talking to a child/);
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/What our scriptures teach/);
    expect(GURU_CONSULTATION_SYSTEM).toMatch(/Never invent or guess a verse, chapter number, story, tithi/);
  });
  it("shows a reply that cites only the verified verse", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok("The Gita, Chapter 2, Verse 47, says to do your best and let go of worry."));
    expect((await askGuru([], "q", "", undefined, "", ["2.47"])).message).toContain("Verse 47");
  });
  it("refuses a reply that cites a verse it was not given", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok("The Gita, Chapter 9, Verse 22 promises this."));
    await expect(askGuru([], "q", "", undefined, "", ["2.47"])).rejects.toThrow(/could not be checked/);
    await expect(askGuru([], "q")).rejects.toThrow(/could not be checked/);
  });
  it("a reply with no reference is fine", async () => {
    vi.mocked(aiChat).mockImplementation(() => ok("Take a slow breath and do one small kind thing today."));
    expect((await askGuru([], "q")).message).toMatch(/slow breath/);
  });
});
