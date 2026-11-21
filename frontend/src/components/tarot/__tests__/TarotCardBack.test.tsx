import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import TarotCardBack, { CARD_BACK_SRC } from "../TarotCardBack";

describe("TarotCardBack", () => {
  it("shows the card-back artwork (not a plain colour), filling the card", () => {
    render(<div className="relative"><TarotCardBack /></div>);
    const img = screen.getByTestId("card-back-art") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(CARD_BACK_SRC);
    expect(img.className).toMatch(/absolute inset-0 h-full w-full object-cover/);
    expect(img).toHaveAttribute("alt", ""); // decorative: the card's own button carries the label
    expect(screen.queryByTestId("card-back-drawn")).toBeNull();
  });

  it("adds depth: an edge vignette, a fine inner gold frame and a hover sheen", () => {
    const { container } = render(<div className="group relative"><TarotCardBack /></div>);
    const html = container.innerHTML;
    expect(html).toMatch(/radial-gradient\(ellipse_at_50%_45%/); // vignette
    expect(html).toMatch(/inset-\[3\.5%\]/);                      // inner frame
    expect(html).toMatch(/group-hover:translate-x-full/);        // sheen
    expect(html).toMatch(/motion-reduce:hidden/);                // sheen is skipped for reduced motion
  });

  it("if the picture cannot load, a drawn card back appears: layered frames, mandala, sun, moons, stars, corners", () => {
    const { container } = render(<div className="relative"><TarotCardBack /></div>);
    fireEvent.error(screen.getByTestId("card-back-art"));
    expect(screen.queryByTestId("card-back-art")).toBeNull();
    const svg = screen.getByTestId("card-back-drawn");
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.querySelectorAll("rect").length).toBeGreaterThanOrEqual(5); // background + four frame layers
    expect(svg.querySelectorAll("circle").length).toBeGreaterThan(8);      // mandala rings, sun, corner studs
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(40);       // petals, sun rays, moons, stars, corner flourishes
    expect(svg.innerHTML).toMatch(/#C18A3D/i);                              // brand gold
    expect(svg.innerHTML).toMatch(/#4A160D|#2A0F04|#6A2412/i);              // chocolate / burgundy field
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("several cards on one page do not share gradient ids", () => {
    const { container } = render(<><div className="relative"><TarotCardBack /></div><div className="relative"><TarotCardBack /></div></>);
    container.querySelectorAll("img").forEach((i) => fireEvent.error(i));
    const ids = Array.from(container.querySelectorAll("linearGradient, radialGradient")).map((g) => g.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the artwork file is a real, brand-coloured picture, and the original is kept untouched", () => {
    const root = path.resolve(__dirname, "../../../../public/images/tarot/cards");
    const art = fs.readFileSync(path.join(root, "tarot-card-back-burgundy.png"));
    expect(art.subarray(1, 4).toString()).toBe("PNG");
    expect(art.readUInt32BE(16)).toBe(600);
    expect(art.readUInt32BE(20)).toBe(905);
    expect(art.length).toBeGreaterThan(100_000); // detailed artwork, not a flat fill
    expect(fs.existsSync(path.join(root, "tarot-card-back.png"))).toBe(true);
    expect(CARD_BACK_SRC.endsWith("tarot-card-back-burgundy.png")).toBe(true);
  });
});
