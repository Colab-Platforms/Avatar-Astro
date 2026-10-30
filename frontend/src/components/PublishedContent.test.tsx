import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The network is MOCKED. The server only ever returns published, in-schedule items;
// these tests check the rendering and that unsafe links/HTML are never output.
const items = [
  { id: "b1", type: "BANNER", title: "Diwali offer", body: "Free readings\nall week", linkUrl: "/tarot", imageUrl: null },
  { id: "b2", type: "BANNER", title: "Unsafe banner", body: "x", linkUrl: "javascript:alert(1)", imageUrl: "data:image/png;base64,AAAA" },
  { id: "a1", type: "ARTICLE", title: "Understanding Saturn", body: "<b>bold?</b> " + "Long text. ".repeat(30), linkUrl: "https://example.com/saturn", imageUrl: null },
  { id: "q1", type: "FAQ", title: "Q?", body: "A.", linkUrl: null, imageUrl: null },
];

async function load() {
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: items }) }));
  return {
    Banners: (await import("./PublishedBanners")).default,
    Articles: (await import("./PublishedArticles")).default,
  };
}

describe("published banners and articles", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("shows only banners in the banner section, with safe links only", async () => {
    const { Banners } = await load();
    const { container } = render(<MemoryRouter><Banners /></MemoryRouter>);
    await screen.findByText("Diwali offer");
    expect(screen.getByText("Unsafe banner")).toBeInTheDocument();
    expect(screen.queryByText("Understanding Saturn")).toBeNull();
    expect(screen.queryByText("Q?")).toBeNull();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/tarot"]);
    expect(container.querySelector("img")).toBeNull(); // data: image rejected
  });

  it("renders articles as plain text (no HTML), expandable, with safe external links", async () => {
    const { Articles } = await load();
    const { container } = render(<MemoryRouter><Articles /></MemoryRouter>);
    await screen.findByText("Understanding Saturn");
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText(/<b>bold\?<\/b>/)).toBeInTheDocument();
    const open = screen.getByRole("link", { name: "Open" });
    expect(open).toHaveAttribute("href", "https://example.com/saturn");
    expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
    const more = screen.getByRole("button", { name: "Read more" });
    fireEvent.click(more);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("render nothing when the API fails or returns nothing", async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const Banners = (await import("./PublishedBanners")).default;
    const Articles = (await import("./PublishedArticles")).default;
    const { container } = render(<MemoryRouter><Banners /><Articles /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 50));
    expect(container.innerHTML).toBe("");
  });
});
