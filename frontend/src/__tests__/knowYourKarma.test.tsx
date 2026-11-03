import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/aiClient", () => ({ aiChat: vi.fn() }));
vi.mock("@/lib/karmaCalendar", async (orig) => ({ ...(await orig<object>()), fetchTodayCalendar: vi.fn() }));
vi.mock("@/features/auth/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

import InnerVoice from "@/pages/InnerVoice";
import { aiChat } from "@/lib/aiClient";
import { fetchTodayCalendar, type TodayCalendar } from "@/lib/karmaCalendar";
import { useAuthStore } from "@/store/authStore";

// All provider and calendar responses in this file are MOCKED.
const calendar: TodayCalendar = {
  date: "2026-11-02", place: "New Delhi, India", timezone: "Asia/Kolkata", reckonedAtLocal: "2026-11-02 17:46",
  vara: "Monday", paksha: "Krishna", masa: "Ashvina",
  tithi: { name: "Navami", numberInPaksha: 9, endsAtLocal: "Tue, 3 Nov 2026, 11:55" },
  nakshatra: { name: "Ashlesha", pada: 3 }, yoga: "Shukla", karana: "Taitila", sunrise: "06:33", sunset: "17:35", festivals: null, notes: [],
};
const reply = { thought: "Small habits shape how we feel.", action: "Say thank you to one person today.", remember: "You can begin again any time." };
const ok = (obj: object) => Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] }), { status: 200 }));

beforeAll(() => {
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => ({}), set: () => true })) as never;
});

const mount = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><InnerVoice /></MemoryRouter></QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({ user: { id: "u1", firstName: "Asha" } as never, accessToken: "t", refreshToken: "r", isAuthenticated: true });
  vi.mocked(fetchTodayCalendar).mockResolvedValue(calendar);
  vi.mocked(aiChat).mockImplementation(() => ok(reply));
});

describe("Inner Voice page", () => {
  it("no longer has the long explanation or the three How It Works cards", () => {
    mount();
    for (const t of [/how it works/i, "Share Your Situation", "Explore Your Karma Insights", "Reflect and Learn", /Explore the principles of karma/]) {
      expect(screen.queryByText(t)).toBeNull();
    }
  });

  it("shows the logo (still, not floating), then the heading, the sub-heading and a quote, with no 'MyBhagya' label above", () => {
    mount();
    const hero = screen.getByTestId("inner-voice-logo");
    expect(hero.getAttribute("src")).toBe("/images/tools/inner-voice-logo.png");
    const width = Number(hero.getAttribute("width"));
    expect(width).toBeGreaterThan(84); // large enough to read
    expect(width).toBeLessThanOrEqual(150); // but not oversized
    expect(hero.getAttribute("class") ?? "").not.toContain("lotus-live"); // it does not float
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Inner Voice");
    expect(screen.getByRole("heading", { level: 2, name: "Know Your Karma for a Better Life" })).toBeInTheDocument();
    expect(screen.getByTestId("inner-voice-quote")).toHaveTextContent("Every kind thought and small good deed plants a seed for a better tomorrow.");
    expect(document.body.textContent).not.toMatch(/Bhagavad Gita 2\.47|right to act, but not/);
    expect(document.querySelector(".iv-hero-eyebrow")).toBeNull();
    expect(document.querySelector(".iv-hero")!.textContent).not.toMatch(/MyBhagya/i);
  });

  it("the four feature cards under the chat are gone", () => {
    mount();
    for (const name of ["Divya Margdarshak", "Karma Sankhya", "Bhavishya Marg", "Divya Shloka"]) {
      expect(screen.queryByRole("link", { name: new RegExp(name) })).toBeNull();
    }
    expect(document.querySelector(".iv-nav-grid")).toBeNull();
  });

  it("the page order is heading, sub-heading, quote, then the chat box", () => {
    mount();
    const quote = screen.getByTestId("inner-voice-quote");
    const chat = screen.getByRole("region", { name: "Know Your Karma guide" });
    expect(quote.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the chat card has no title of its own, so "Know Your Karma" is not repeated inside it
    expect(within(chat).queryByRole("heading")).toBeNull();
  });

  it("the lotus animation is switched off for reduced-motion users", () => {
    const css = readFileSync(join(__dirname, "..", "index.css"), "utf8");
    expect(css).toMatch(/\.lotus-live\s*\{[^}]*animation:[^}]*lotus-float/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.lotus-live\s*\{\s*animation:\s*none;/);
  });
});

describe("Know Your Karma guide", () => {
  it("greets the user and shows today's verified calendar, only the values that exist", async () => {
    mount();
    const box = await screen.findByTestId("karma-calendar");
    await waitFor(() => expect(within(box).getByText("Navami")).toBeInTheDocument());
    expect(screen.getAllByTestId("karma-calendar")).toHaveLength(1);
    expect(within(box).getByText("Ashlesha")).toBeInTheDocument();
    expect(within(box).getByText("Krishna")).toBeInTheDocument();
    expect(box).not.toHaveTextContent("Calculated for"); // the line is not printed
    expect(box).toHaveAttribute("title", "Calculated for New Delhi, India"); // but the reference place is still available on hover
    expect(screen.getByText("Namaste, Asha.")).toBeInTheDocument();
  });

  it("says so honestly when the calendar is not available, and shows no calendar values", async () => {
    vi.mocked(fetchTodayCalendar).mockResolvedValue(null);
    mount();
    expect(await screen.findByText(/calendar details are not available right now/i)).toBeInTheDocument();
    expect(screen.queryByText("Navami")).toBeNull();
  });

  it("offers the simple starter questions in a consistent grid, plus one built from today's tithi", async () => {
    mount();
    await screen.findByText("Navami");
    const grid = screen.getByTestId("karma-suggestions");
    const labels = within(grid).getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual([
      "What does Navami tithi mean for me today?",
      "What should I focus on today?",
      "What habit should I improve?",
      "How can I bring more peace into my life?",
      "What can I learn from my current situation?",
      "Which good action can I practise today?",
    ]);
    expect(grid.className).toMatch(/grid-cols-1/);
    expect(grid.className).toMatch(/sm:grid-cols-2/);
  });

  it("a suggestion is sent once, even if clicked twice, and the answer uses the short format without repeating the calendar", async () => {
    mount();
    await screen.findByText("Navami");
    const q = screen.getByRole("button", { name: "What should I focus on today?" });
    fireEvent.click(q);
    fireEvent.click(q);
    const answer = await screen.findByTestId("karma-answer");
    expect(aiChat).toHaveBeenCalledTimes(1);
    for (const h of ["Your Karma Thought", "One Good Action", "Remember"]) {
      expect(within(answer).getByText(h)).toBeInTheDocument();
    }
    // "What it means" is the calendar's explanation: it is shown once, above the chat, not in every answer
    expect(within(answer).queryByText("What it means")).toBeNull();
    expect(screen.getAllByText("What it means")).toHaveLength(1);
    // the calendar is shown once, at the top of the chat, and is not repeated in each answer
    expect(within(answer).queryByText("Today's Calendar")).toBeNull();
    expect(screen.getAllByText("Navami")).toHaveLength(1);
    expect(screen.getAllByText("Today's Calendar")).toHaveLength(1);
    expect(answer).toHaveTextContent("Say thank you to one person today.");
    // the question appears as the user's message, and is no longer offered
    expect(screen.getAllByText("What should I focus on today?")).toHaveLength(1);
  });

  it("sends the verified calendar to the model and not a request to work it out", async () => {
    mount();
    await screen.findByText("Navami");
    fireEvent.click(screen.getByRole("button", { name: "What habit should I improve?" }));
    await screen.findByTestId("karma-answer");
    const system = vi.mocked(aiChat).mock.calls[0][0].messages[0].content;
    expect(system).toContain("- Tithi: Navami");
    expect(system).toContain("- Nakshatra: Ashlesha");
    expect(system).not.toMatch(/work out|calculate the tithi|what is today's tithi/i);
  });

  it("without a calendar the answer has no calendar section and no 'What it means'", async () => {
    vi.mocked(fetchTodayCalendar).mockResolvedValue(null);
    mount();
    await screen.findByText(/calendar details are not available right now/i);
    fireEvent.click(screen.getByRole("button", { name: "What should I focus on today?" }));
    const answer = await screen.findByTestId("karma-answer");
    expect(within(answer).queryByText("What it means")).toBeNull();
    expect(answer).toHaveTextContent("general reflection");
  });

  it("an answer that names a calendar fact is asked for again, then refused with a friendly error, and Try again works", async () => {
    // both attempts for the first question are bad
    vi.mocked(aiChat).mockImplementationOnce(() => ok({ ...reply, thought: "Today is Ekadashi, a day to fast." }));
    vi.mocked(aiChat).mockImplementationOnce(() => ok({ ...reply, thought: "Today is Ekadashi, a day to fast." }));
    mount();
    await screen.findByText("Navami");
    fireEvent.click(screen.getByRole("button", { name: "What should I focus on today?" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("didn't come out right");
    expect(screen.queryByTestId("karma-answer")).toBeNull();
    fireEvent.click(within(alert).getByRole("button", { name: /Try again/ }));
    expect(await screen.findByTestId("karma-answer")).toBeInTheDocument();
    expect(aiChat).toHaveBeenCalledTimes(3);
  });

  it("explains today's calendar in simple words, once, built from the verified values", async () => {
    mount();
    const box = await screen.findByTestId("karma-calendar-meaning");
    expect(box).toHaveTextContent("Today is Monday. Navami is the 9th day of the dark half (Krishna Paksha), when the Moon grows smaller each night. The Moon is in Ashlesha nakshatra (a group of stars).");
  });

  it("has an English / Hindi / Hinglish switch; it changes the labels, the calendar and the explanation, and is remembered", async () => {
    mount();
    await screen.findByText("Navami");
    const group = screen.getByRole("radiogroup", { name: "Language" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["English", "हिंदी", "Hinglish"]);
    expect(within(group).getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(within(group).getByRole("radio", { name: "हिंदी" }));
    expect(screen.getByText("आज का पंचांग")).toBeInTheDocument();
    expect(screen.getByText("नवमी")).toBeInTheDocument(); // tithi, in Devanagari
    expect(screen.getByText("सोमवार")).toBeInTheDocument(); // weekday
    expect(screen.getByTestId("karma-calendar-meaning")).toHaveTextContent("आज सोमवार है। नवमी कृष्ण पक्ष (अँधेरा पक्ष) का नौवाँ दिन है, जब चाँद हर रात थोड़ा छोटा होता है। चाँद आश्लेषा नक्षत्र (तारों के समूह) में है।");
    expect(screen.getByText("अपने कर्म के बारे में मुझसे कुछ भी पूछिए। मैं जवाब छोटे और आसान रखूँगा।")).toBeInTheDocument();
    expect(localStorage.getItem("karma_lang")).toBe("hi");

    fireEvent.click(screen.getByRole("radio", { name: "Hinglish" }));
    expect(screen.getByText("Aaj ka Panchang")).toBeInTheDocument();
    expect(screen.getByText("Somvar")).toBeInTheDocument();
    expect(screen.getByTestId("karma-calendar-meaning")).toHaveTextContent("Aaj Somvar hai. Navami Krishna Paksha (andhera paksh) ka 9th din hai, jab chaand har raat thoda chhota hota hai. Chaand Ashlesha nakshatra (taaron ke samooh) mein hai.");
  });

  it("the chosen language is sent to the model and the answer headings follow it", async () => {
    localStorage.setItem("karma_lang", "hi");
    vi.mocked(aiChat).mockImplementation(() => ok({ thought: "छोटी आदतें हमारे मन को शांत करती हैं।", action: "आज किसी एक व्यक्ति को धन्यवाद कहें।", remember: "आप फिर से शुरू कर सकते हैं।" }));
    mount();
    await screen.findByText("नवमी");
    fireEvent.click(screen.getByRole("button", { name: "आज मुझे किस बात पर ध्यान देना चाहिए?" }));
    const answer = await screen.findByTestId("karma-answer");
    expect(vi.mocked(aiChat).mock.calls[0][0].messages[0].content).toContain("Devanagari script");
    for (const h of ["आपका कर्म-विचार", "एक अच्छा काम", "याद रखिए"]) expect(within(answer).getByText(h)).toBeInTheDocument();
    expect(within(answer).getByText("पंचांग की बातें गणना से निकाली गई हैं। बाकी सोचने के लिए एक विचार है, भविष्यवाणी नहीं।")).toBeInTheDocument();
  });

  it("a Hindi request answered in Roman letters is refused (twice), in Hindi", async () => {
    localStorage.setItem("karma_lang", "hi");
    mount();
    await screen.findByText("नवमी");
    fireEvent.click(screen.getByRole("button", { name: "आज मुझे किस बात पर ध्यान देना चाहिए?" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("जवाब ठीक से नहीं बन पाया");
    expect(aiChat).toHaveBeenCalledTimes(2);
  });

  it("shows a typing indicator while waiting, and a typed question can be sent with Enter", async () => {
    let release!: (r: Response) => void;
    vi.mocked(aiChat).mockImplementation(() => new Promise<Response>((r) => { release = r; }));
    mount();
    await screen.findByText("Navami");
    const box = screen.getByLabelText("Ask about your karma");
    fireEvent.change(box, { target: { value: "Why do I get angry so fast?" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(await screen.findByTestId("karma-typing")).toBeInTheDocument();
    expect(screen.getByText("Why do I get angry so fast?")).toBeInTheDocument();
    release(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }), { status: 200 }));
    await screen.findByTestId("karma-answer");
    expect(screen.queryByTestId("karma-typing")).toBeNull();
  });

  it("signed out: the calendar waits for sign-in and nothing is sent", async () => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
    mount();
    expect(await screen.findByText(/to see today's calendar/i)).toBeInTheDocument();
    expect(fetchTodayCalendar).not.toHaveBeenCalled();
    expect(aiChat).not.toHaveBeenCalled();
  });
});
