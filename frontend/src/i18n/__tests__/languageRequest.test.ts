import { describe, expect, it } from "vitest";
import { detectLanguageRequest } from "@/i18n/languageRequest";

describe("explicit language requests", () => {
  it.each([
    ["Talk in Tamil.", "ta"],
    ["talk in tamil", "ta"],
    ["Please reply in Marathi", "mr"],
    ["please speak in the Hindi language", "hi"],
    ["Can you answer in Telugu?", "te"],
    ["reply using Gujarati", "gu"],
    ["Write in Bengali please", "bn"],
    ["speak in Kannada", "kn"],
    ["Respond in Malayalam", "ml"],
    ["talk in punjabi", "pa"],
    ["switch to talking in English", "en"],
    ["tamil mein bolo", "ta"],
    ["marathi me jawab do", "mr"],
    ["हिंदी में जवाब दो।", "hi"],
    ["मराठीत उत्तर द्या", "mr"],
    ["தமிழில் பேசுங்கள்.", "ta"],
    ["తెలుగులో మాట్లాడండి", "te"],
    ["ગુજરાતીમાં જવાબ આપો", "gu"],
    ["বাংলায় উত্তর দিন", "bn"],
    ["ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರ ಕೊಡಿ", "kn"],
    ["മലയാളത്തിൽ മറുപടി പറയൂ", "ml"],
    ["ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ", "pa"],
  ])("%s -> %s", (text, code) => {
    expect(detectLanguageRequest(text)).toBe(code);
  });

  it.each([
    "hi",
    "I feel worried about my career.",
    "I can't speak English well",
    "I cannot talk in Hindi",
    "My friend is from Tamil Nadu and I miss her",
    "I want to learn Marathi cooking",
    "How do I find peace of mind?",
    "मुझे अपने करियर की चिंता है",
    "எனக்கு என் வேலை பற்றி கவலை",
    "",
    "   ",
  ])("an ordinary message is not a request: %s", (text) => {
    expect(detectLanguageRequest(text)).toBeNull();
  });

  it("a long message is never treated as a request", () => {
    expect(detectLanguageRequest(`talk in tamil ${"and also ".repeat(30)}`)).toBeNull();
  });

  it("when two languages are named the first one asked for wins", () => {
    expect(detectLanguageRequest("talk in Marathi not Hindi")).toBe("mr");
  });
});
