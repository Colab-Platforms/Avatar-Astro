import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { BirthChartDiagram } from "../BirthChartDiagram";
import type { HouseInfo } from "../types";

// A chart worked out by hand (Lagna Taurus). The same chart is checked in backend houses.test.ts.
const d1: HouseInfo[] = [
  { house: 1, sign: "Taurus", lord: "Venus", lordPlacement: { house: 12, sign: "Aries" }, planets: ["Sun", "Mercury", "Ketu"], aspectedBy: [] },
  { house: 2, sign: "Gemini", lord: "Mercury", lordPlacement: { house: 1, sign: "Taurus" }, planets: [], aspectedBy: [{ planet: "Jupiter", fromHouse: 6, aspect: 9 }] },
  { house: 3, sign: "Cancer", lord: "Moon", lordPlacement: { house: 3, sign: "Cancer" }, planets: ["Moon"], aspectedBy: [{ planet: "Saturn", fromHouse: 10, aspect: 7 }, { planet: "Mars", fromHouse: 9, aspect: 7 }] },
  ...[4, 5, 6].map((house) => ({ house, sign: ["Leo", "Virgo", "Libra"][house - 4], lord: "Sun", lordPlacement: { house: 1, sign: "Taurus" }, planets: [], aspectedBy: [] })),
  { house: 7, sign: "Scorpio", lord: "Mars", lordPlacement: { house: 9, sign: "Capricorn" }, planets: ["Rahu"], aspectedBy: [{ planet: "Sun", fromHouse: 1, aspect: 7 }, { planet: "Mercury", fromHouse: 1, aspect: 7 }, { planet: "Saturn", fromHouse: 10, aspect: 10 }] },
  ...[8, 9, 10, 11, 12].map((house) => ({ house, sign: ["Sagittarius", "Capricorn", "Aquarius", "Pisces", "Aries"][house - 8], lord: "Jupiter", lordPlacement: { house: 6, sign: "Libra" }, planets: [], aspectedBy: [] })),
];
// A different chart for D9: the card must show THIS chart's data, not D1's.
const d9: HouseInfo[] = d1.map((h) => ({ ...h, planets: h.house === 7 ? ["Venus"] : [], aspectedBy: h.house === 7 ? [{ planet: "Jupiter", fromHouse: 1, aspect: 7 }] : [], lord: h.house === 7 ? "Mercury" : h.lord }));

const grahas = [
  { planet: "Sun", sign: "Taurus", house: 1 }, { planet: "Mercury", sign: "Taurus", house: 1 }, { planet: "Moon", sign: "Cancer", house: 3 },
  { planet: "Rahu", sign: "Scorpio", house: 7 },
];
const house = (container: HTMLElement, n: number) => container.querySelector(`polygon[data-house="${n}"]`) as SVGPolygonElement;

describe("interactive house chart", () => {
  it("has twelve focusable house buttons and keeps the chart layout (lines and labels unchanged)", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    expect(container.querySelectorAll("polygon[role='button']")).toHaveLength(12);
    expect(container.querySelectorAll("path")).toHaveLength(1);
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(texts[0]).toBe("2"); // Taurus is sign 2, house 1
    expect(texts).toContain("Surya");
  });

  it("hovering a house shows its card with name, life areas, sign, lord with placement, occupants and aspects", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    expect(screen.queryByTestId("house-card")).toBeNull();
    fireEvent.mouseEnter(house(container, 7));
    const card = screen.getByTestId("house-card");
    expect(card).toHaveAttribute("data-house", "7");
    expect(within(card).getByText(/house 7 – partnerships/i)).toBeInTheDocument();
    expect(within(card).getByText(/marriage, partnerships and business relationships/i)).toBeInTheDocument();
    expect(card.textContent).toMatch(/Scorpio/);
    expect(card.textContent).toMatch(/Mangal \(Mars\) – in house 9 \(Capricorn\)/);
    expect(card.textContent).toMatch(/Rahu/);
    expect(card.textContent).toMatch(/Surya \(Sun\), standing in house 1 \(house-7 aspect\)/);
    expect(card.textContent).toMatch(/Shani \(Saturn\), standing in house 10 \(house-10 aspect\)/);
    // The convention is stated beside the chart, and says Rahu and Ketu are not given aspects.
    expect(screen.getByTestId("aspect-convention")).toHaveTextContent(/Parashari graha drishti.*Rahu and Ketu.*not given aspects/i);
    expect(card.closest("body")).toBe(document.body); // floats over the page, so it cannot be clipped by the chart's container
  });

  it("an occupant is not shown as an aspect, and a house with none says so", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    fireEvent.mouseEnter(house(container, 1));
    const card = screen.getByTestId("house-card");
    expect(card.textContent).toMatch(/Surya \(Sun\), Budh \(Mercury\), Ketu/); // occupants
    expect(within(card).getByText(/no planet casts an aspect on this house/i)).toBeInTheDocument();
  });

  it("moving away hides the hover card", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    fireEvent.mouseEnter(house(container, 3));
    expect(screen.getByTestId("house-card")).toBeInTheDocument();
    fireEvent.mouseLeave(container.querySelector("svg")!.parentElement!);
    expect(screen.queryByTestId("house-card")).toBeNull();
  });

  it("tapping keeps the card open with a close button, Escape and an outside tap close it", () => {
    const { container } = render(<div><button>outside</button><BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} /></div>);
    fireEvent.click(house(container, 7));
    expect(house(container, 7)).toHaveAttribute("aria-pressed", "true");
    fireEvent.mouseLeave(container.querySelector("svg")!.parentElement!);
    expect(screen.getByTestId("house-card")).toBeInTheDocument(); // stays after the pointer leaves (this is the phone case)
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("house-card")).toBeNull();

    fireEvent.click(house(container, 7));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("house-card")).toBeNull();

    fireEvent.click(house(container, 7));
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByTestId("house-card")).toBeNull();
  });

  it("can be used from the keyboard", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    fireEvent.focus(house(container, 3));
    expect(screen.getByTestId("house-card")).toHaveAttribute("data-house", "3");
    fireEvent.keyDown(house(container, 3), { key: "Enter" });
    expect(house(container, 3)).toHaveAttribute("aria-pressed", "true");
  });

  it("each chart shows its own data: the D9 card is not the D1 card", () => {
    const a = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    fireEvent.mouseEnter(house(a.container, 7));
    const d1Text = screen.getByTestId("house-card").textContent;
    a.unmount();
    const b = render(<BirthChartDiagram title="Navamsa chart (D9)" lagnaSign="Taurus" grahas={[{ planet: "Venus", sign: "Scorpio", house: 7 }]} houses={d9} />);
    fireEvent.mouseEnter(house(b.container, 7));
    const d9Text = screen.getByTestId("house-card").textContent!;
    expect(d9Text).toMatch(/Budh \(Mercury\) – in house 9/); // D9's lord of house 7
    expect(d9Text).toMatch(/Shukra \(Venus\)/);
    expect(d9Text).toMatch(/Guru \(Jupiter\), standing in house 1/);
    expect(d9Text).not.toMatch(/Shani/);
    expect(d9Text).not.toBe(d1Text);
  });

  it("without the server's house data it still explains the house and says what is unavailable (nothing invented)", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} />);
    fireEvent.mouseEnter(house(container, 7));
    const card = screen.getByTestId("house-card");
    expect(card.textContent).toMatch(/Scorpio/);
    expect(card.textContent).toMatch(/Rahu/);
    expect(card.textContent).toMatch(/not available for this chart/i);
    expect(card.textContent).not.toMatch(/standing in house/);
  });

  it("every house has a name and meaning, so the card is complete for all twelve", () => {
    const { container } = render(<BirthChartDiagram title="Rashi chart (D1)" lagnaSign="Taurus" grahas={grahas} houses={d1} />);
    for (let n = 1; n <= 12; n++) {
      fireEvent.mouseEnter(house(container, n));
      const card = screen.getByTestId("house-card");
      expect(card.textContent).not.toMatch(/birthChart\./);
      expect(card.querySelector("h4")!.textContent).toMatch(new RegExp(`^house ${n} – `, "i"));
    }
  });
});
