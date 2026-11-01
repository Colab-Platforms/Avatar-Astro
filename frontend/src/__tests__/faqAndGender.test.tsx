import { describe, it, expect, beforeAll } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FEATURE_FAQS } from "@/data/featureFaqs";
import { FEATURES } from "@/data/featureCatalog";
import BirthChartEducation from "@/components/BirthChartEducation";
import CompatibilityEducation from "@/components/CompatibilityEducation";
import ZodiacEducation from "@/components/ZodiacEducation";
import NameNumerologyEducation from "@/components/NameNumerologyEducation";
import PalmEducation from "@/components/palm/PalmEducation";
import TarotEducation from "@/components/tarot/TarotEducation";
import FeatureFaq from "@/components/FeatureFaq";
import CompatibilityChecker from "@/pages/CompatibilityChecker";

beforeAll(() => {
  window.scrollTo = () => {};
});

describe("FAQs", () => {
  const keys = Object.keys(FEATURE_FAQS) as (keyof typeof FEATURE_FAQS)[];

  it("covers all twelve features and the astrologer section", () => {
    for (const k of Object.keys(FEATURES)) expect(FEATURE_FAQS, k).toHaveProperty(k);
    expect(FEATURE_FAQS).toHaveProperty("astrologers");
  });

  it.each(keys)("%s has 4 to 6 useful, positive questions with real answers", (k) => {
    const faqs = FEATURE_FAQS[k];
    expect(faqs.length).toBeGreaterThanOrEqual(4);
    expect(faqs.length).toBeLessThanOrEqual(6);
    for (const f of faqs) {
      expect(f.question.endsWith("?"), f.question).toBe(true);
      expect(f.answer.length, f.question).toBeGreaterThan(40);
      expect(f.question).not.toMatch(/same text|same sign|free\?|ayanamsa|why is my|why does a friend|wrong|not work|inaccurate/i);
      expect(f.answer).not.toMatch(/guarantee[sd]? (you|your|that)|will definitely|100% accurate|sample|placeholder|coming soon/i);
    }
  });

  it("never repeats a question across features", () => {
    const all = keys.flatMap((k) => FEATURE_FAQS[k].map((f) => f.question.toLowerCase()));
    expect(new Set(all).size).toBe(all.length);
  });

  it("the education sections show the new questions and none of the old ones", () => {
    const cases: [React.ReactElement, string][] = [
      [<BirthChartEducation />, "What can I discover from my Janma Kundali?"],
      [<CompatibilityEducation />, "How does Jodi Jyotish compare two people?"],
      [<ZodiacEducation />, "How can I discover my Rashi?"],
      [<NameNumerologyEducation />, "What does Naamank Jyotish reveal?"],
      [<PalmEducation />, "Which hand should I use for my reading?"],
      [<TarotEducation />, "What can I ask during a tarot reading?"],
    ];
    for (const [el, q] of cases) {
      const { unmount } = render(<MemoryRouter>{el}</MemoryRouter>);
      expect(screen.getByText(q)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/same text|Can I use it for free|Which ayanamsa|Why is my Vedic sign different/);
      unmount();
    }
  });

  it("the standalone FAQ block lists every question for its feature", () => {
    render(<FeatureFaq feature="guru" />);
    for (const f of FEATURE_FAQS.guru) expect(screen.getByText(f.question)).toBeInTheDocument();
  });
});

describe("Jodi Jyotish gender", () => {
  it("each partner has their own optional gender field and the two do not affect each other", () => {
    render(
      <MemoryRouter>
        <CompatibilityChecker />
      </MemoryRouter>,
    );
    const g1 = screen.getByLabelText(/Gender/, { selector: "#cc1-gender" }) as HTMLSelectElement;
    const g2 = screen.getByLabelText(/Gender/, { selector: "#cc2-gender" }) as HTMLSelectElement;
    expect(g1).not.toBe(g2);
    expect(g1.value).toBe("");
    expect(g2.value).toBe("");
    expect([...g1.options].map((o) => o.value)).toEqual(["", "Male", "Female", "Other", "Prefer not to say"]);

    fireEvent.change(g1, { target: { value: "Male" } });
    expect(g1.value).toBe("Male");
    expect(g2.value).toBe(""); // not copied to the other partner
    fireEvent.change(g2, { target: { value: "Female" } });
    expect(g1.value).toBe("Male");
    expect(g2.value).toBe("Female");
    expect(screen.getAllByText(/\(optional\)/).length).toBeGreaterThanOrEqual(2);
  });
});
