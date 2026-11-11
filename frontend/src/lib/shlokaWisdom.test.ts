import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
import { aiChat } from "@/lib/aiClient";
import i18n from "@/i18n";
import { SHLOKAS } from "@/data/shlokaCatalog";
import { parseWisdom, fetchWisdom, buildPrompt, shareText } from "./shlokaWisdom";

// Provider responses are MOCKED; no live AI call is made.
describe("shloka catalog integrity", () => {
  it("has unique ids and complete, non-empty fields for every verse", () => {
    expect(new Set(SHLOKAS.map((s) => s.id)).size).toBe(SHLOKAS.length);
    for (const s of SHLOKAS) {
      for (const f of [s.reference, s.devanagari, s.transliteration, s.meaning, s.context] as string[]) expect(f.trim().length).toBeGreaterThan(0);
      expect(s.themes.length).toBeGreaterThan(0);
      // Devanagari must actually contain Devanagari; transliteration must not.
      expect(/[ऀ-ॿ]/.test(s.devanagari)).toBe(true);
      expect(/[ऀ-ॿ]/.test(s.transliteration)).toBe(false);
      // Verse lines match between script and transliteration (same number of lines).
      expect(s.devanagari.split("\n").length).toBe(s.transliteration.split("\n").length);
    }
  });
});

describe("parseWisdom", () => {
  it("merges the AI reflection with the catalog verse, ignoring any verse text from the model", () => {
    const r = parseWisdom(JSON.stringify({ id: "bg-2-47", application: "Focus on effort.", devanagari: "FAKE", meaning: "FAKE" }))!;
    expect(r.chapter).toBe("Chapter 2, Verse 47");
    expect(r.devanagari).not.toContain("FAKE");
    expect(r.meaning).not.toContain("FAKE");
    expect(r.verified).toBe(true);
  });
  it("rejects verses that are not in the catalog or replies without an application", () => {
    expect(parseWisdom(JSON.stringify({ id: "bg-99-99", application: "x" }))).toBeNull();
    expect(parseWisdom(JSON.stringify({ id: "bg-2-47" }))).toBeNull();
    expect(parseWisdom("nonsense")).toBeNull();
  });
  it("restricts the offered list to the preferred scripture", () => {
    const p = buildPrompt("Upanishads");
    expect(p).toContain("up-asato");
    expect(p).not.toContain("bg-2-47");
  });
  it("builds copyable text with reference, verse and meaning", () => {
    const t = shareText({ source: "Bhagavad Gita", chapter: "Chapter 2, Verse 47", devanagari: "d", transliteration: "t", meaning: "m" });
    expect(t).toBe("Bhagavad Gita Chapter 2, Verse 47\n\nd\n\nt\n\nm");
  });
});

describe("fetchWisdom", () => {
  const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
  beforeEach(() => vi.mocked(aiChat).mockReset());
  it("returns a result and maps failures to safe messages", async () => {
    vi.mocked(aiChat).mockResolvedValue(reply(200, { choices: [{ message: { content: JSON.stringify({ id: "up-satyam", application: "Be honest." }) } }] }));
    expect((await fetchWisdom("a conflict", "")).source).toBe("Upanishads");
    vi.mocked(aiChat).mockResolvedValue(reply(502, { error: { message: "upstream" } }));
    await expect(fetchWisdom("x", "")).rejects.toThrow(/unavailable/);
    vi.mocked(aiChat).mockResolvedValue(reply(429, {}));
    await expect(fetchWisdom("x", "")).rejects.toThrow(/Too many/);
  });

  describe("chosen language", () => {
    const ok = (obj: object) => reply(200, { choices: [{ message: { content: JSON.stringify(obj) } }] });
    const en = { id: "up-satyam", application: "Be honest with the people around you in small things." };
    const hi = { id: "up-satyam", application: "छोटी-छोटी बातों में अपने आसपास के लोगों से सच बोलिए।" };
    afterEach(() => localStorage.clear());
    it("with no language chosen it behaves as before: nothing is sent, no retry", async () => {
      vi.mocked(aiChat).mockResolvedValue(ok(en));
      await fetchWisdom("x", "");
      expect(vi.mocked(aiChat).mock.calls[0][0].language).toBeUndefined();
      expect(vi.mocked(aiChat).mock.calls[0][0].messages[0].content).toContain("Hindi in Roman script");
      expect(aiChat).toHaveBeenCalledTimes(1);
    });
    it("sends the chosen language, asks for it in the prompt, retries once, then refuses with a translated error", async () => {
      localStorage.setItem("mybhagya_lang", "hi");
      vi.mocked(aiChat).mockResolvedValue(ok(en));
      await expect(fetchWisdom("x", "")).rejects.toThrow(i18n.t("guru.errors.wrongLanguage", { lng: "hi" }));
      expect(aiChat).toHaveBeenCalledTimes(2);
      const first = vi.mocked(aiChat).mock.calls[0][0];
      expect(first.language).toBe("hi");
      expect(first.messages[0].content).toContain("Write in the chosen language.");
      expect(first.messages[0].content).not.toContain("Hindi in Roman script");
      expect(JSON.stringify(vi.mocked(aiChat).mock.calls[1][0].messages)).toContain("not written in Hindi");
      vi.mocked(aiChat).mockReset();
      vi.mocked(aiChat).mockResolvedValueOnce(ok(en)).mockResolvedValueOnce(ok(hi));
      expect((await fetchWisdom("x", "")).application).toBe(hi.application);
    });
  });
});
