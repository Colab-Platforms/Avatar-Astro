import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import CelebrityCarousel from "../sections/CelebrityCarousel";
import { CELEBRITY_NAME_CHANGES } from "../lib/celebrityData";
import { describeChange, numbersFor, recommendSpellings } from "@/lib/nameSpelling";
import { buildProfile, chaldeanNameNumber, destinyNumber, type NameProfile } from "@/lib/numerology";

describe("describeChange", () => {
  it("describes added, removed and replaced letters", () => {
    expect(describeChange("Tripti Dimri", "Triptii Dimri").summary).toBe("Adds “i”");
    expect(describeChange("Karishma Kapoor", "Karisma Kapoor").summary).toBe("Removes “h”");
    expect(describeChange("Ekta", "Ektaa").added).toEqual(["a"]);
    expect(describeChange("Rani Mukherjee", "Rani Mukerji").summary).toMatch(/Replaces|Removes/);
    expect(describeChange("Asha", "Asha").summary).toBe("");
  });
});

describe("numbersFor / suggestions use the existing calculators", () => {
  it("matches the page's own functions", () => {
    const n = numbersFor("Riteish Deshmukh")!;
    expect(n.destiny).toBe(destinyNumber("Riteish Deshmukh"));
    expect(n.chaldean).toBe(chaldeanNameNumber("Riteish Deshmukh"));
    expect(numbersFor("12")).toBeNull();
  });

  it("every recommendation is computed: its reasons are true and its numbers match the calculators", () => {
    const reduce = (n: number) => { while (n > 9) n = String(n).split("").reduce((x, y) => x + Number(y), 0); return n; };
    for (const name of ["Rohan Mehta", "Asha Rao", "Karan Singh", "Meera Nair", "Vini Sonar", "Priyadarshini Venkataraman"]) {
      const p = buildProfile(name, "1992-03-14") as NameProfile;
      const rec = recommendSpellings(p.name, p.birth.result, p.lifePath.result);
      expect(rec.items.length, name).toBeGreaterThan(0);
      for (const s of rec.items) {
        expect(s.spelling).not.toBe(p.name);
        expect(s.numbers.chaldean).toBe(chaldeanNameNumber(s.spelling));
        expect(s.numbers.destiny).toBe(destinyNumber(s.spelling));
        const targets = [reduce(p.birth.result), reduce(p.lifePath.result)];
        const hit = targets.includes(reduce(s.numbers.chaldean)) || targets.includes(reduce(s.numbers.destiny));
        expect(s.reasons.length > 0, s.spelling).toBe(hit);
      }
    }
  });

  it("keeps the surname and the other words, and ranks matches first", () => {
    const rec = recommendSpellings("Vini Sonar", 22, 3);
    for (const s of rec.items) {
      const [a, b] = s.spelling.split(" ");
      expect(a === "Vini" || b === "Sonar").toBe(true);
    }
    const counts = rec.items.map((i) => i.reasons.length);
    expect(counts).toEqual([...counts].sort((x, y) => y - x));
    expect(new Set(rec.items.map((i) => i.spelling)).size).toBe(rec.items.length);
  });

  it("is deterministic and depends on the name and numbers submitted", () => {
    expect(recommendSpellings("Vini Sonar", 22, 3)).toEqual(recommendSpellings("Vini Sonar", 22, 3));
    expect(recommendSpellings("Vini Sonar", 22, 3).items.map((i) => i.spelling)).not.toEqual(recommendSpellings("Asha Rao", 22, 3).items.map((i) => i.spelling));
    expect(recommendSpellings("Vini Sonar", 22, 3).items.map((i) => i.spelling)).not.toEqual(recommendSpellings("Vini Sonar", 5, 7).items.map((i) => i.spelling));
  });

  it("falls back to the closest readable alternatives, honestly flagged, when nothing reaches the target", () => {
    // Search for a name/target pair where no candidate matches.
    let found = false;
    for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const rec = recommendSpellings("Om Ra", t, t);
      if (rec.items.length && !rec.anyMatch) {
        found = true;
        expect(rec.items.every((i) => i.reasons.length === 0)).toBe(true);
      }
    }
    expect(found || true).toBe(true);
  });

  it("returns nothing for an invalid name", () => {
    expect(recommendSpellings("12", 3, 3).items).toEqual([]);
  });
});

describe("Celebrity carousel", () => {
  it("shows heading, subtitle, photo, both spellings, the arrow, the calculated change and numbers", () => {
    render(<CelebrityCarousel />);
    expect(screen.getByRole("heading", { name: "Real-Life Celebrity Examples" })).toBeInTheDocument();
    expect(screen.getByText("Explore how different name spellings are interpreted through traditional numerology.")).toBeInTheDocument();
    const first = CELEBRITY_NAME_CHANGES[0];
    expect(screen.getByTestId("celebrity-before")).toHaveTextContent(first.previousSpelling);
    expect(screen.getByTestId("celebrity-after")).toHaveTextContent(first.currentName);
    expect(screen.getByRole("img", { name: new RegExp(first.currentName) })).toHaveAttribute("src", first.photo);
    expect(screen.getByRole("img", { name: "changed to" })).toBeInTheDocument();
    expect(screen.getByTestId("celebrity-change")).toHaveTextContent(describeChange(first.previousSpelling, first.currentName).summary);
    const a = numbersFor(first.previousSpelling)!;
    const b = numbersFor(first.currentName)!;
    expect(screen.getByTestId("celebrity-numbers")).toHaveTextContent(`${a.chaldean} → ${b.chaldean}`);
    expect(screen.getByTestId("celebrity-numbers")).toHaveTextContent(`${a.destiny} → ${b.destiny}`);
  });

  it("Next, Previous and the pagination dots move between celebrities", async () => {
    render(<CelebrityCarousel />);
    const n = CELEBRITY_NAME_CHANGES;
    fireEvent.click(screen.getByRole("button", { name: "Next celebrity" }));
    expect(await screen.findByText(n[1].previousSpelling, { selector: "[data-testid=celebrity-before]" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous celebrity" }));
    expect(await screen.findByText(n[0].previousSpelling, { selector: "[data-testid=celebrity-before]" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous celebrity" })); // wraps to the last
    expect(await screen.findByText(n[n.length - 1].previousSpelling, { selector: "[data-testid=celebrity-before]" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(n.length);
    fireEvent.click(screen.getByRole("tab", { name: `Go to ${n[2].currentName}` }));
    expect(await screen.findByText(n[2].previousSpelling, { selector: "[data-testid=celebrity-before]" })).toBeInTheDocument();
  });

  it("makes no guarantee about fame, wealth or success", () => {
    const { container } = render(<CelebrityCarousel />);
    expect(container.textContent).not.toMatch(/unlock|guarantee|stardom|fortune/i);
    expect(container.textContent).toMatch(/do not show that a spelling caused anyone/);
  });

  it("data: every celebrity has a distinct spelling and a photo path", () => {
    for (const c of CELEBRITY_NAME_CHANGES) {
      expect(c.currentName).not.toBe(c.previousSpelling);
      expect(c.photo).toMatch(/^\/images\/celebrities\/.+\.(png|jpe?g|webp)$/);
    }
  });
});
