import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_LANGUAGE_HEADER, chosenLanguage } from "@/i18n/aiLanguage";
import { STORAGE_KEY } from "@/i18n/languages";
import { useAuthStore } from "@/store/authStore";

vi.mock("@/lib/authClient", () => ({ refreshAccessToken: vi.fn() }));
import { authedFetch } from "@/lib/authedFetch";
import { aiChat } from "@/lib/aiClient";
import { fetchWisdom } from "@/lib/shlokaWisdom";

const ok = () => new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.removeItem(STORAGE_KEY);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ok());
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ isAuthenticated: true, accessToken: "tok" } as never);
});
afterEach(() => vi.unstubAllGlobals());

describe("the chosen language reaches the server", () => {
  it("is undefined until the visitor actually uses the selector", () => {
    expect(chosenLanguage()).toBeUndefined();
    window.localStorage.setItem(STORAGE_KEY, "klingon");
    expect(chosenLanguage()).toBeUndefined();
  });

  it("is sent as X-App-Language on account requests, alongside the caller's own headers", async () => {
    window.localStorage.setItem(STORAGE_KEY, "ta");
    await authedFetch("/x", { method: "POST", headers: { "Content-Type": "application/json" } });
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers[APP_LANGUAGE_HEADER]).toBe("ta");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer tok");
  });

  it("is not sent at all when the visitor never chose a language, so every AI feature behaves as before", async () => {
    await authedFetch("/x");
    expect(fetchMock.mock.calls[0][1].headers[APP_LANGUAGE_HEADER]).toBeUndefined();
  });

  it("English counts as a choice when it was picked on purpose", async () => {
    window.localStorage.setItem(STORAGE_KEY, "en");
    await authedFetch("/x");
    expect(fetchMock.mock.calls[0][1].headers[APP_LANGUAGE_HEADER]).toBe("en");
  });

  it("aiChat passes the language in the body only when the caller asks for it", async () => {
    await aiChat({ messages: [{ role: "user", content: "hi" }], language: "mr" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe("mr");
    await aiChat({ messages: [{ role: "user", content: "hi" }] });
    expect("language" in JSON.parse(fetchMock.mock.calls[1][1].body)).toBe(false);
  });

  it("Sacred Shloka asks for the reflection in the chosen language, and in nothing if none was chosen", async () => {
    window.localStorage.setItem(STORAGE_KEY, "bn");
    await fetchWisdom("I feel stuck at work", "gita").catch(() => undefined);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe("bn");

    fetchMock.mockClear();
    window.localStorage.removeItem(STORAGE_KEY);
    await fetchWisdom("I feel stuck at work", "gita").catch(() => undefined);
    expect("language" in JSON.parse(fetchMock.mock.calls[0][1].body)).toBe(false);
  });
});
