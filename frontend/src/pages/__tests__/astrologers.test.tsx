import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Astrologer } from "@/data/astrologers";

// The network is MOCKED — these pages are now backed by the real /api/astrologers
// endpoints (GET list, GET /:slug), not the static data/astrologers.ts file.

const PUBLISHED: Astrologer[] = [
  {
    id: "p1", slug: "acharya-vihaan-sharma", name: "Acharya Vihaan Sharma", demo: true, verified: true, recognition: null,
    photo: "/images/astrologers/baba3.png", avatar: "male", gallery: [], online: true,
    expertise: ["Vedic Astrology", "Career Guidance"], languages: ["Hindi", "English"],
    experienceYears: 15, rating: 4.8, consultations: 12000, pricePerMin: 10, originalPricePerMin: null,
    about: "Reads the Janma Kundali.", qualifications: [], availability: "",
  },
  {
    id: "p2", slug: "ananya-iyer", name: "Ananya Iyer", demo: true, verified: true, recognition: null,
    photo: "/images/astrologers/female1.png", avatar: "female", gallery: [], online: true,
    expertise: ["Tarot Reading"], languages: ["English", "Tamil"],
    experienceYears: 8, rating: 4.7, consultations: 6400, pricePerMin: 5, originalPricePerMin: null,
    about: "Uses tarot to reflect on decisions.", qualifications: [], availability: "",
  },
  // A genuinely just-approved astrologer: no price/rating/consultations set yet. The UI
  // must hide these, never render a fake ₹0 / 0.0 / "0 chats".
  {
    id: "p3", slug: "kamaal-jii", name: "Kamaal Jii", demo: false, verified: true, recognition: null,
    photo: null, avatar: "male", gallery: [], online: true,
    expertise: ["Numerology"], languages: ["Hindi"],
    experienceYears: 3, rating: null, consultations: null, pricePerMin: null, originalPricePerMin: null,
    about: "Newly approved astrologer.", qualifications: [], availability: "",
  },
];

function mockList(items: Astrologer[] = PUBLISHED) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.includes("/astrologers/")) {
        const slug = url.split("/astrologers/")[1].split("?")[0];
        const found = items.find((a) => a.slug === slug);
        return Promise.resolve({
          ok: Boolean(found),
          json: async () => (found ? { status: true, data: found, message: "" } : { status: false, data: null, message: "Astrologer not found" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ status: true, data: { items, total: items.length, page: 1, pageSize: 50 }, message: "" }) });
    }),
  );
}

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

async function mountList() {
  const Astrologers = (await import("@/pages/Astrologers")).default;
  const AstrologerProfile = (await import("@/pages/AstrologerProfile")).default;
  return withProviders(
    <MemoryRouter initialEntries={["/astrologers"]}>
      <Routes>
        <Route path="/astrologers" element={<Astrologers />} />
        <Route path="/astrologers/:slug" element={<AstrologerProfile />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Consult Astrologers listing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("fetches and shows every published astrologer as a card", async () => {
    mockList();
    await mountList();
    expect(screen.getByRole("heading", { level: 1, name: "Consult Astrologers" })).toBeInTheDocument();
    const cards = await screen.findAllByTestId("astrologer-card");
    expect(cards).toHaveLength(PUBLISHED.length);
    const first = within(cards[0]);
    expect(first.getByRole("link", { name: "Acharya Vihaan Sharma" })).toHaveAttribute("href", "/astrologers/acharya-vihaan-sharma");
    expect(first.getByText("4.8")).toBeInTheDocument();
    expect(first.getByText("₹10")).toBeInTheDocument();
  });

  it("never shows a fake price or rating for an astrologer who hasn't set one yet", async () => {
    mockList();
    await mountList();
    const cards = await screen.findAllByTestId("astrologer-card");
    const kamaal = within(cards[2]);
    expect(kamaal.getByText("Pricing not set yet")).toBeInTheDocument();
    expect(kamaal.getByText("New")).toBeInTheDocument(); // rating placeholder, never "0.0"
    expect(kamaal.queryByText("₹0")).toBeNull();
  });

  it("searches by name and clears back to the full list", async () => {
    mockList();
    await mountList();
    await screen.findAllByTestId("astrologer-card");
    const searchInput = screen.getByLabelText("Search by name");

    fireEvent.change(searchInput, { target: { value: "ananya" } });
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Ananya Iyer" })).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "zzz-no-match" } });
    expect(await screen.findByTestId("astrologers-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("astrologer-card")).toHaveLength(PUBLISHED.length);
  });

  it("shows an empty state when no profiles are published", async () => {
    mockList([]);
    await mountList();
    expect(await screen.findByText(/0 astrologers found/)).toBeInTheDocument();
  });
});

describe("astrologer profile page", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("fetches and shows the profile by slug", async () => {
    mockList();
    const AstrologerProfile = (await import("@/pages/AstrologerProfile")).default;
    withProviders(
      <MemoryRouter initialEntries={["/astrologers/ananya-iyer"]}>
        <Routes>
          <Route path="/astrologers/:slug" element={<AstrologerProfile />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Ananya Iyer");
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("an unknown slug shows a clear not-found state with a way back", async () => {
    mockList();
    const AstrologerProfile = (await import("@/pages/AstrologerProfile")).default;
    withProviders(
      <MemoryRouter initialEntries={["/astrologers/nobody-here"]}>
        <Routes>
          <Route path="/astrologers/:slug" element={<AstrologerProfile />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("astrologer-missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Consult Astrologers" })).toHaveAttribute("href", "/astrologers");
  });
});

describe("homepage astrologers section", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("shows up to 4 cards and links to the full list", async () => {
    mockList();
    const HomeAstrologersSection = (await import("@/components/HomeAstrologersSection")).default;
    withProviders(
      <MemoryRouter>
        <HomeAstrologersSection />
      </MemoryRouter>,
    );
    const cards = await screen.findAllByTestId("astrologer-card");
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(screen.getByRole("link", { name: /View all astrologers/ })).toHaveAttribute("href", "/astrologers");
  });
});
