import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES } from "@/i18n/languages";
import { setLanguage } from "@/i18n";

const LONG = "A long description that goes on and on about the book. ".repeat(12);
const BOOKS = [
  { id: "b1", slug: "a", title: "Gita One", author: "Author A", category: "Bhagavad Gita", description: LONG, coverImageUrl: "x.png", hasFile: true },
  { id: "b2", slug: "b", title: "Veda One", author: null, category: "Vedic Wisdom", description: "Short.", coverImageUrl: null, hasFile: true },
  { id: "b3", slug: "c", title: "Jyotish One", author: "Author C", category: "Astrology", description: "", coverImageUrl: null, hasFile: false },
  { id: "b4", slug: "d", title: "Guide One", author: "Author A", category: "Spiritual Guide", description: "", coverImageUrl: null, hasFile: true },
  { id: "b5", slug: "e", title: "Odd One", author: "Author E", category: "Something Else", description: "", coverImageUrl: null, hasFile: true },
];
vi.mock("@/features/devotionLibrary/hooks", () => ({ useSpiritualBooks: () => ({ data: BOOKS, isLoading: false, isError: false }) }));

import SpiritualBooksPage from "@/pages/devotion/SpiritualBooks";

const mount = () => render(<MemoryRouter><SpiritualBooksPage /></MemoryRouter>);
const titles = () => screen.queryAllByTestId("book-card").map((c) => within(c).getByRole("heading").textContent);
const bar = () => within(screen.getByTestId("book-filters"));
const search = (v: string) => fireEvent.change(screen.getByTestId("book-search"), { target: { value: v } });

beforeEach(async () => { await act(async () => { await setLanguage("en"); }); });

describe("Spiritual Books page", () => {
  it("offers only the five requested filters, hides empty ones, and All Books shows every book", () => {
    mount();
    // "Self Discovery" has no books in this data, so it is not offered.
    expect(bar().getAllByRole("button").map((b) => b.textContent)).toEqual(["All Books", "Scripture", "Zodiac Signs", "Spirituality"]);
    expect(titles()).toEqual(["Gita One", "Veda One", "Jyotish One", "Guide One", "Odd One"]);
  });

  it("each filter maps the stored categories onto its group", () => {
    mount();
    fireEvent.click(bar().getByRole("button", { name: "Scripture" }));
    expect(titles()).toEqual(["Gita One", "Veda One"]);
    fireEvent.click(bar().getByRole("button", { name: "Zodiac Signs" }));
    expect(titles()).toEqual(["Jyotish One"]);
    fireEvent.click(bar().getByRole("button", { name: "Spirituality" }));
    expect(titles()).toEqual(["Guide One"]);
    fireEvent.click(bar().getByRole("button", { name: "All Books" }));
    expect(titles()).toHaveLength(5);
  });

  it("searches by title and by author, case-insensitively, and combines with a category", () => {
    mount();
    search("veda");
    expect(titles()).toEqual(["Veda One"]);
    search("AUTHOR a");
    expect(titles()).toEqual(["Gita One", "Guide One"]);
    fireEvent.click(bar().getByRole("button", { name: "Spirituality" }));
    expect(titles()).toEqual(["Guide One"]);
    search("zzz");
    expect(screen.getByText("No books found")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(screen.getByTestId("book-search")).toHaveValue("");
    expect(titles()).toEqual(["Guide One"]);
  });

  it("a book with a PDF links to the unchanged download URL; one without shows a note instead", () => {
    mount();
    const links = screen.getAllByRole("link", { name: /Download/ });
    expect(links).toHaveLength(4);
    expect(links[0].getAttribute("href")).toMatch(/\/devotion-library\/books\/b1\/download$/);
    expect(screen.getByText("PDF will be added soon")).toBeInTheDocument();
  });

  it("Read More expands a long description and Read Less collapses it; short ones have no control", () => {
    const sh = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (this: HTMLElement) { return this.textContent && this.textContent.length > 100 ? 200 : 20; });
    const ch = vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
    mount();
    expect(screen.getAllByRole("button", { name: "Read More" })).toHaveLength(1);
    const para = screen.getByText(/A long description/);
    expect(para.className).toContain("line-clamp-2");
    fireEvent.click(screen.getByRole("button", { name: "Read More" }));
    expect(para.className).not.toContain("line-clamp-2");
    expect(para.textContent).toBe(LONG); // the full text was always there
    fireEvent.click(screen.getByRole("button", { name: "Read Less" }));
    expect(para.className).toContain("line-clamp-2");
    sh.mockRestore(); ch.mockRestore();
  });

  it("the Divya Shloka section links to the real Divya Shloka route", () => {
    mount();
    const promo = within(screen.getByTestId("divya-shloka-promo"));
    expect(promo.getByRole("heading")).toHaveTextContent("Explore Divya Shlokas");
    expect(promo.getByRole("link", { name: /Explore Divya Shlokas/ })).toHaveAttribute("href", "/inner-voice/wisdom");
    expect(screen.queryByText(/Ancient Wisdom/)).toBeNull();
  });

  it("the filter bar hides its scrollbar", () => {
    mount();
    expect(screen.getByTestId("book-filters").className).toContain("[scrollbar-width:none]");
    expect(screen.getByTestId("book-filters").className).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("every new text exists in all ten languages and never shows a raw key", async () => {
    const dict = (c: string) => JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "locales", `${c}.json`), "utf8")).spiritualBooks;
    for (const l of LOCALES) {
      const d = dict(l.code);
      for (const k of ["title", "intro", "all", "download", "pdfPending", "by", "readMore", "readLess", "noResults", "shelfLabel", "dividerAlt", "filtersLabel"]) expect(d[k], `${l.code}.${k}`).toBeTruthy();
      for (const k of ["placeholder", "label", "clear"]) expect(d.search[k], `${l.code}.search.${k}`).toBeTruthy();
      for (const k of ["scripture", "zodiac", "selfDiscovery", "spirituality"]) expect(d.groups[k], `${l.code}.groups.${k}`).toBeTruthy();
      for (const k of ["title", "description", "button"]) expect(d.shloka[k], `${l.code}.shloka.${k}`).toBeTruthy();
    }
    await act(async () => { await setLanguage("ta"); });
    const { container } = mount();
    expect(container.textContent).not.toMatch(/spiritualBooks\./);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(dict("ta").title);
    expect(screen.getByTestId("book-search")).toHaveAttribute("placeholder", dict("ta").search.placeholder);
  });
});
