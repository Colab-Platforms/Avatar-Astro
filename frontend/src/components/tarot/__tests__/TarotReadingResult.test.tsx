import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MAJOR_ARCANA } from "@/data/tarotData";
import { TimelineResult, KarmaResult, splitOverall, type AIReading } from "../TarotReadingResult";

class IO { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal("IntersectionObserver", IO);
vi.mock("@/features/guru/AskDivyaSection", () => ({ default: ({ feature }: { feature: string }) => <div data-testid="ask-divya">{feature}</div> }));

const timelineReading: AIReading = {
  currentLifeStage: "Stage text.", mainOpportunity: "Help text.", hiddenChallenge: "Block text.", nextMajorTurningPoint: "Theme text.",
  recommendedAction: "Step text.", spiritualGuidance: "Guidance text.",
  overallMessage: "First point. Middle point. Last point.",
  timelineNarrative: [0, 1, 2, 3, 4].map((i) => ({ position: `P${i}`, card: "x", insight: `Insight ${i}.` })),
};
const karmaReading: AIReading = {
  currentKarmaTheme: "Theme.", rootCause: "Root.", lifeAreasAffected: ["Work"], dailyAction: "Daily.", weeklyAction: "Weekly.", spiritualPractice: "Practice.",
  recommendedHabit: "Habit.", reflectionQuestion: "Question?", positiveAffirmation: "Affirm.",
  cardInsights: [0, 1, 2].map((i) => ({ position: `P${i}`, card: "x", insight: `Karma insight ${i}.` })),
};
const cards5 = [15, 18, 16, 8, 0].map((i) => MAJOR_ARCANA[i]);
const cards3 = [2, 11, 14].map((i) => MAJOR_ARCANA[i]);
const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("splitOverall", () => {
  it("splits only the generated sentences", () => {
    expect(splitOverall("A one. B two. C three. D four.")).toEqual({ main: "A one.", means: "B two. C three.", takeaway: "D four." });
    expect(splitOverall("Only one.")).toEqual({ main: "Only one.", means: "", takeaway: "" });
    expect(splitOverall(undefined)).toEqual({ main: "", means: "", takeaway: "" });
  });
});

describe("Life Timeline result", () => {
  it("shows five visual cards, the header, the split overall reading and all six sections", () => {
    mount(<TimelineResult cards={cards5} reading={timelineReading} question="Career" />);
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(5);
    expect(screen.getByText(/Your Soul/)).toBeInTheDocument();
    expect(screen.getByText("Career")).toBeInTheDocument();
    for (const t of ["Main Message", "What This Means for You", "Key Takeaway", "Where You Are Now", "What's Helping You", "What's Blocking You", "A Theme To Prepare For", "A Step You Could Take", "Reflective Guidance"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Simple Card Meaning/i)).toHaveLength(5);
  });
  it("opens a card's interpretation on click and renders the follow-up exactly once", () => {
    mount(<TimelineResult cards={cards5} reading={timelineReading} question="Career" />);
    fireEvent.click(screen.getAllByRole("button", { pressed: false })[1]);
    const panel = screen.getByTestId("tarot-card-panel");
    expect(within(panel).getByText("Insight 1.")).toBeInTheDocument();
    expect(screen.getAllByTestId("ask-divya")).toHaveLength(1);
  });
  it("embedded (saved) mode has no header or follow-up", () => {
    mount(<TimelineResult embedded cards={cards5} reading={timelineReading} />);
    expect(screen.queryByText(/Your Soul/)).toBeNull();
    expect(screen.queryByTestId("ask-divya")).toBeNull();
  });
});

describe("Karma Mirror result", () => {
  it("shows exactly three cards and stages, practical actions, takeaway and one follow-up, with no timeline wording", () => {
    mount(<KarmaResult cards={cards3} reading={karmaReading} />);
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(3);
    for (const t of ["Overall Karma Reflection", "Practical Reflection and Actions", "Key Takeaway"]) expect(screen.getByText(t)).toBeInTheDocument();
    expect(screen.getAllByTestId("ask-divya")).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/Next 6 Months|Future Potential|Soul.s Timeline/);
  });
});
