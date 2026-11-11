import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@/i18n/languages";
import { setLanguage } from "@/i18n";

const BOOKS = [
  { id: "b1", slug: "a", title: "Gita One", author: "Author A", category: "Bhagavad Gita", description: "", coverImageUrl: "x.png", hasFile: true },
  { id: "b2", slug: "b", title: "Veda One", author: null, category: "Vedic Wisdom", description: "", coverImageUrl: null, hasFile: true },
  { id: "b3", slug: "c", title: "Jyotish One", author: "Author C", category: "Astrology", description: "", coverImageUrl: null, hasFile: false },
];
vi.mock("@/features/devotionLibrary/hooks", () => ({ useSpiritualBooks: () => ({ data: BOOKS, isLoading: false, isError: false }) }));

import SpiritualBooksPage from "@/pages/devotion/SpiritualBooks";

const mount = () => render(<MemoryRouter><SpiritualBooksPage /></MemoryRouter>);
const titles = () => screen.getAllByTestId("book-card").map((c) => within(c).getByRole("heading").textContent);

beforeEach(async () => { await act(async () => { await setLanguage("en"); }); });

describe("Spiritual Books page", () => {
  it("filters come from the real categories, filtering works and All Books restores everything", () => {
    mount();
    const bar = screen.getByTestId("book-filters");
    expect(within(bar).getAllByRole("button").map((b) => b.textContent)).toEqual(["All Books", "Bhagavad Gita", "Vedic Wisdom", "Astrology"]);
    expect(titles()).toEqual(["Gita One", "Veda One", "Jyotish One"]);
    fireEvent.click(within(bar).getByRole("button", { name: "Vedic Wisdom" }));
    expect(titles()).toEqual(["Veda One"]);
    fireEvent.click(within(bar).getByRole("button", { name: "All Books" }));
    expect(titles()).toHaveLength(3);
  });

  it("a book with a PDF links to the unchanged download URL; one without shows a note instead", () => {
    mount();
    const links = screen.getAllByRole("link", { name: /Download/ });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toMatch(/\/devotion-library\/books\/b1\/download$/);
    expect(screen.getByText("PDF will be added soon")).toBeInTheDocument();
  });

  it("Explore More goes to an existing route, and the shelf arrows have accessible labels", () => {
    mount();
    expect(screen.getByRole("link", { name: /Explore More/ })).toHaveAttribute("href", "/inner-voice/wisdom");
    expect(screen.getByLabelText("Previous books")).toBeInTheDocument();
    expect(screen.getByLabelText("Next books")).toBeInTheDocument();
    expect(within(screen.getByTestId("benefits")).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Timeless Knowledge", "Spiritual Growth", "Inner Peace", "Guidance for Life"]);
  });

  it("every new text exists in all ten languages and never shows a raw key", async () => {
    const dict = (c: string) => JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "locales", `${c}.json`), "utf8")).spiritualBooks;
    for (const l of LOCALES) {
      const d = dict(l.code);
      for (const k of ["title", "intro", "all", "download", "pdfPending", "by", "prev", "next", "shelfLabel", "heroAlt", "benefitsLabel"]) expect(d[k], `${l.code}.${k}`).toBeTruthy();
      for (const k of ["knowledge", "growth", "peace", "guidance"]) expect(d.benefits[k], `${l.code}.benefits.${k}`).toBeTruthy();
      expect(d.wisdom.description && d.wisdom.explore, l.code).toBeTruthy();
      expect(Object.keys(d.category).sort()).toEqual(["astrology", "bhagavadgita", "spiritualguide", "vedicwisdom"]);
    }
    await act(async () => { await setLanguage("ta"); });
    const { container } = mount();
    expect(container.textContent).not.toMatch(/spiritualBooks\./);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(dict("ta").title);
  });
});
