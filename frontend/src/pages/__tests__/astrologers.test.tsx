import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Astrologers from "@/pages/Astrologers";
import AstrologerProfile from "@/pages/AstrologerProfile";
import { ASTROLOGERS, ALL_LANGUAGES, EXPERTISE_OPTIONS, getAstrologer, hasReliableStats, initials } from "@/data/astrologers";

const mountList = () =>
  render(
    <MemoryRouter initialEntries={["/astrologers"]}>
      <Routes>
        <Route path="/astrologers" element={<Astrologers />} />
        <Route path="/astrologers/:slug" element={<AstrologerProfile />} />
      </Routes>
    </MemoryRouter>,
  );

describe("astrologer data", () => {
  it("has 4 to 5 profiles with unique slugs, and sample profiles are never marked verified", () => {
    expect(ASTROLOGERS.length).toBeGreaterThanOrEqual(4);
    expect(ASTROLOGERS.length).toBeLessThanOrEqual(5);
    expect(new Set(ASTROLOGERS.map((a) => a.slug)).size).toBe(ASTROLOGERS.length);
    for (const a of ASTROLOGERS) {
      if (a.demo) {
        expect(a.verified, a.name).toBe(false);
        expect(a.recognition, a.name).toBeNull();
        expect(a.qualifications, a.name).toEqual([]); // no invented credentials
        expect(a.gallery, a.name).toEqual([]); // no invented photographs
      }
      for (const e of a.expertise) expect(EXPERTISE_OPTIONS).toContain(e);
    }
  });

  it("only offers sorting when the numbers are real", () => {
    expect(hasReliableStats(ASTROLOGERS)).toBe(ASTROLOGERS.every((a) => !a.demo));
    expect(hasReliableStats([])).toBe(false);
  });

  it("makes monograms from the name without honorifics", () => {
    expect(initials("Dr. Meera Kulkarni")).toBe("MK");
    expect(initials("Pandit Kishore Joshi")).toBe("KJ");
  });
});

describe("Consult Astrologers listing", () => {
  it("shows every profile as a card with the required details and no unfinished-product wording", () => {
    mountList();
    expect(screen.getByRole("heading", { level: 1, name: "Consult Astrologers" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sample|placeholder|not real|coming soon|demo/i);
    const cards = screen.getAllByTestId("astrologer-card");
    expect(cards).toHaveLength(ASTROLOGERS.length);
    const first = within(cards[0]);
    const a = ASTROLOGERS[0];
    expect(first.getByRole("link", { name: a.name })).toHaveAttribute("href", `/astrologers/${a.slug}`);
    for (const x of a.expertise) expect(first.getByText(x)).toBeInTheDocument();
    expect(first.getByText(a.languages.join(" · "))).toBeInTheDocument();
    expect(first.getByText(`${a.experienceYears} yrs`)).toBeInTheDocument();
    expect(first.getByText(a.rating.toFixed(1))).toBeInTheDocument();
    expect(first.getByText(`₹${a.pricePerMin}`)).toBeInTheDocument();
    expect(first.getByText(/Online|Offline/)).toBeInTheDocument();
    expect(first.queryByLabelText("Verified")).toBeNull();
    // No emoji as portrait: a real portrait image or an accessible monogram.
    expect(first.getByRole("img")).toBeInTheDocument();
  });

  it("shows no Chat or Call buttons while no consultation service is connected", () => {
    mountList();
    expect(screen.queryByRole("button", { name: /chat|call/i })).toBeNull();
  });

  it("searches by name, filters by expertise, language and availability, and clears", () => {
    mountList();
    const count = () => screen.getByTestId("astrologer-count").textContent;

    fireEvent.change(screen.getByLabelText("Search by name"), { target: { value: "meera" } });
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Dr. Meera Kulkarni" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search by name"), { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Expertise" }), { target: { value: "Tarot Reading" } });
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(ASTROLOGERS.filter((a) => a.expertise.includes("Tarot Reading")).length);

    fireEvent.change(screen.getByRole("combobox", { name: "Expertise" }), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "Marathi" } });
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(ASTROLOGERS.filter((a) => a.languages.includes("Marathi")).length);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Availability"), { target: { value: "online" } });
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(ASTROLOGERS.filter((a) => a.online).length);
    expect(count()).toMatch(/astrologers? found/);

    fireEvent.change(screen.getByLabelText("Search by name"), { target: { value: "zzz" } });
    expect(screen.getByTestId("astrologers-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(ASTROLOGERS.length);
    expect(ALL_LANGUAGES.length).toBeGreaterThan(3);
  });

  it("sorting is disabled while the data is sample data", () => {
    mountList();
    const sort = screen.getByLabelText("Sort by");
    if (ASTROLOGERS.some((a) => a.demo)) expect(sort).toBeDisabled();
  });

  it("opens a profile from a card", () => {
    mountList();
    fireEvent.click(screen.getAllByRole("link", { name: ASTROLOGERS[1].name })[0]);
    expect(screen.getByTestId("astrologer-profile")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(ASTROLOGERS[1].name);
  });
});

describe("astrologer profile page", () => {
  const mountProfile = (slug: string) =>
    render(
      <MemoryRouter initialEntries={[`/astrologers/${slug}`]}>
        <Routes>
          <Route path="/astrologers/:slug" element={<AstrologerProfile />} />
          <Route path="/astrologers" element={<div>list</div>} />
        </Routes>
      </MemoryRouter>,
    );

  it("shows the header, statistics, about, expertise, languages, availability and the consultation panel", () => {
    const a = getAstrologer("pandit-kishore-joshi")!;
    mountProfile(a.slug);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(a.name);
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText(`${a.experienceYears} years`)).toBeInTheDocument();
    expect(screen.getByText(a.rating.toFixed(1))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Areas of expertise" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Languages" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Availability" })).toBeInTheDocument();
    const panel = within(screen.getByLabelText("Consultation"));
    expect(panel.getByText(`₹${a.pricePerMin}`)).toBeInTheDocument();
    expect(panel.queryByRole("button", { name: /chat|call/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/sample|placeholder|not real|coming soon/i);
  });

  it("invents no qualifications, gallery or testimonials", () => {
    mountProfile(ASTROLOGERS[0].slug);
    expect(screen.queryByRole("heading", { name: /qualifications/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /gallery/i })).toBeNull();
    expect(screen.queryByText(/testimonial|review/i)).toBeNull();
  });

  it("an unknown slug shows a clear not-found state with a way back", () => {
    mountProfile("nobody-here");
    expect(screen.getByTestId("astrologer-missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consult Astrologers" })).toHaveAttribute("href", "/astrologers");
  });
});

import HomeAstrologersSection from "@/components/HomeAstrologersSection";
describe("homepage astrologers section", () => {
  it("shows four cards and links to the full list", () => {
    render(
      <MemoryRouter>
        <HomeAstrologersSection />
      </MemoryRouter>,
    );
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /View all astrologers/ })).toHaveAttribute("href", "/astrologers");
  });
});

import { ALL_ASTROLOGERS, CONSULTATION_ENABLED } from "@/data/astrologers";
describe("publishing rule", () => {
  it("placeholder profiles are never verified, and chat/call stay off without a service", () => {
    expect(CONSULTATION_ENABLED).toBe(false);
    for (const a of ALL_ASTROLOGERS.filter((x) => x.demo)) expect(a.verified).toBe(false);
  });

  it("in a production build placeholder profiles are not listed, so the page and section disappear", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/data/astrologers.ts", "utf8");
    expect(src).toMatch(/ALL_ASTROLOGERS.filter((a) => !a.demo || import.meta.env.DEV)/);
    const page = fs.readFileSync("src/pages/Astrologers.tsx", "utf8");
    expect(page).toContain('ASTROLOGERS.length === 0) return <Navigate to="/"');
    expect(fs.readFileSync("src/components/HomeAstrologersSection.tsx", "utf8")).toContain("featured.length === 0) return null");
  });
});
