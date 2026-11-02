import { describe, it, expect } from "vitest";
import { BHAGAVATA_STORIES, GITA_VERSES, allowedReferences, buildGrounding, findUnverifiedReferences, groundingPrompt, matchStory, matchVerses, wantsCalendar } from "./guruScripture";
import { SHLOKAS } from "@/data/shlokaCatalog";

const cal = { date: "2026-11-02", place: "New Delhi, India", timezone: "Asia/Kolkata", reckonedAtLocal: "x", vara: "Monday", paksha: "Krishna" as const, masa: "Ashvina", tithi: { name: "Navami", numberInPaksha: 9, endsAtLocal: "x" }, nakshatra: { name: "Ashlesha", pada: 3 }, yoga: "", karana: "", sunrise: null, sunset: null, festivals: null, notes: [] };

describe("verified verses", () => {
  it("come only from the curated catalog, with the stored reference and meaning", () => {
    expect(GITA_VERSES.length).toBeGreaterThan(0);
    for (const v of GITA_VERSES) {
      const stored = SHLOKAS.find((s) => s.id === v.id)!;
      expect(stored.source).toBe("Bhagavad Gita");
      expect(v.reference).toBe(stored.reference);
      expect(v.meaning).toBe(stored.meaning);
      expect(v.key).toMatch(/^\d+\.\d+$/);
    }
  });
  it("match what the user wrote, and nothing is forced when nothing fits", () => {
    expect(matchVerses("I worry about the result of my exam")[0].key).toBe("2.47");
    expect(matchVerses("hello")).toEqual([]);
    expect(matchVerses("what should I cook tonight")).toEqual([]);
  });
});

describe("Bhagavata stories", () => {
  it("are a short fixed list with no verse or canto numbers in them", () => {
    for (const s of BHAGAVATA_STORIES) expect(`${s.summary} ${s.lesson}`).not.toMatch(/\d/);
  });
  it("match by theme and not otherwise", () => {
    expect(matchStory("I am scared of what people think")?.id).toBe("prahlada");
    expect(matchStory("I feel helpless and trapped")?.id).toBe("gajendra");
    expect(matchStory("what is the weather")).toBeNull();
  });
});

describe("calendar questions", () => {
  it("are detected, and unrelated questions are not", () => {
    for (const q of ["What is today's tithi?", "Is today ekadashi?", "which nakshatra now", "any good muhurat today", "Is it Purnima?"]) expect(wantsCalendar(q)).toBe(true);
    for (const q of ["How do I stay calm?", "I lost my job", "What is dharma?"]) expect(wantsCalendar(q)).toBe(false);
  });
  it("only a calendar question carries calendar facts into the prompt", () => {
    expect(groundingPrompt(buildGrounding("What is today's tithi?", cal))).toContain("- Tithi: Navami");
    const other = groundingPrompt(buildGrounding("How do I stay calm?", cal));
    expect(other).not.toContain("Navami");
    expect(other).toMatch(/Do not mention any tithi/);
    expect(groundingPrompt(buildGrounding("which tithi is it?", null))).toMatch(/not available right now/);
  });
});

describe("scripture references in a reply", () => {
  it("accepts the handed-over verse in different forms", () => {
    expect(findUnverifiedReferences("The Gita, Chapter 2, Verse 47 teaches effort.", ["2.47"])).toEqual([]);
    expect(findUnverifiedReferences("See Gita 2.47 for this.", ["2.47"])).toEqual([]);
    expect(findUnverifiedReferences("Be kind. Take 5 minutes at 10.30.", [])).toEqual([]); // times are not references
  });
  it("catches a reference that was not handed over", () => {
    expect(findUnverifiedReferences("Chapter 18, Verse 66 says surrender.", ["2.47"])).toEqual(["Chapter 18, Verse 66"]);
    expect(findUnverifiedReferences("As the Bhagavad Gita 4.7 says", [])).toEqual(["4.7"]);
    expect(findUnverifiedReferences("In Canto 10 of the Bhagavata", [])).toEqual(["Canto 10"]);
    expect(findUnverifiedReferences("See verse 99", ["2.47"])).toEqual(["Verse 99"]);
    expect(findUnverifiedReferences("The Gita, Chapter 2 talks about it", [])).toEqual(["Chapter 2"]);
  });
  it("the allowed list is exactly the handed-over verses", () => {
    expect(allowedReferences(buildGrounding("exam result worry", null))).toEqual(["2.47"]);
    expect(allowedReferences(buildGrounding("hello", null))).toEqual([]);
  });
});
