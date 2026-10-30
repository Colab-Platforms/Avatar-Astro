import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import RatnaImage from "../RatnaImage";
import RatnaJyotish, { RATNA_SUBTITLE, RATNA_TITLE } from "@/pages/RatnaJyotish";
import { RATNA_ASSETS, hindiLine, stoneLabel } from "../ratnaCatalog";
import { complete } from "./fixtures";
import RatnaJyotishResult from "@/pages/RatnaJyotishResult";
import { saveResult } from "../storage";
import { ratnaApi } from "../api";

vi.mock("../api", () => ({
  ratnaApi: { searchLocations: vi.fn(), calculate: vi.fn(), products: vi.fn() },
}));

const root = process.cwd();
const css = readFileSync(resolve(root, "src/features/ratna/ratna.css"), "utf8");

const NINE: [string, string, string][] = [
  ["ruby", "माणिक", "Manik"],
  ["pearl", "मोती", "Moti"],
  ["red-coral", "मूंगा", "Moonga"],
  ["emerald", "पन्ना", "Panna"],
  ["yellow-sapphire", "पुखराज", "Pukhraj"],
  ["diamond", "हीरा", "Heera"],
  ["blue-sapphire", "नीलम", "Neelam"],
  ["hessonite", "गोमेद", "Gomed"],
  ["cats-eye", "लहसुनिया", "Lehsunia"],
];

/** Width and height of a lossy/lossless/extended WebP, read from its header. */
const webpSize = (file: string): [number, number] => {
  const b = readFileSync(file);
  expect(b.toString("ascii", 0, 4)).toBe("RIFF");
  expect(b.toString("ascii", 8, 12)).toBe("WEBP");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === "VP8L") {
    const v = b.readUInt32LE(21);
    return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1];
  }
  return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1]; // VP8X
};

describe("Ratna photographs", () => {
  it("has a local, square, same-size photograph for each of the nine Navaratna", () => {
    const files = new Set<string>();
    for (const [key] of NINE) {
      const asset = RATNA_ASSETS[key];
      expect(asset, key).toBeTruthy();
      const path = resolve(root, "public", asset.image.replace(/^\//, ""));
      expect(existsSync(path), `${key}: ${asset.image}`).toBe(true);
      expect(asset.image.startsWith("/images/ratna/")).toBe(true); // local, never an external URL
      expect(readFileSync(path).length).toBeGreaterThan(5_000); // a real photograph, not a placeholder
      expect(webpSize(path)).toEqual([640, 640]);
      files.add(asset.image);
    }
    expect(files.size).toBe(9); // no Ratna reuses another's image
  });

  it("uses descriptive file names and keeps the credits next to the images", () => {
    const names = readdirSync(resolve(root, "public/images/ratna"));
    for (const n of ["manikya-ruby", "moti-pearl", "moonga-red-coral", "panna-emerald", "pukhraj-yellow-sapphire", "heera-diamond", "neelam-blue-sapphire", "gomed-hessonite", "lehsunia-cats-eye"]) {
      expect(names).toContain(`${n}.webp`);
    }
    expect(names).toContain("CREDITS.md");
  });

  it("names every Ratna in Hindi and transliteration", () => {
    for (const [key, hindi, translit] of NINE) {
      expect(RATNA_ASSETS[key].hindi).toBe(hindi);
      expect(hindiLine({ key, name: "x", sanskrit: translit })).toBe(`${hindi} · ${translit}`);
    }
    // the diamond's API name "Heera / Safed Pukhraj" shows only its first term
    expect(hindiLine({ key: "diamond", name: "Diamond", sanskrit: "Heera / Safed Pukhraj", hindi: "हीरा" })).toBe("हीरा · Heera");
    expect(stoneLabel({ key: "yellow-sapphire", name: "Yellow Sapphire", sanskrit: "Pukhraj", hindi: "पुखराज" })).toBe("Yellow Sapphire (पुखराज · Pukhraj)");
  });

  it("renders each photograph with a descriptive alt and falls back gracefully when a file is missing", () => {
    for (const [key, hindi, translit] of NINE) {
      const stone = { key, name: RATNA_ASSETS[key].english, colour: "#888", hindi, sanskrit: translit };
      const { unmount } = render(<RatnaImage stone={stone} />);
      const img = screen.getByRole("img", { name: `${RATNA_ASSETS[key].english} (${hindi} · ${translit}) Ratna photograph` });
      expect(img).toHaveAttribute("src", RATNA_ASSETS[key].image);
      expect(img).toHaveAttribute("width", "640");
      expect(img.className).toContain("object-cover");
      fireEvent.error(img);
      expect(screen.getByTestId("ratna-image-fallback")).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /Ratna photograph/ })).toBeNull();
      unmount();
    }
    // an unknown stone key also falls back instead of breaking
    render(<RatnaImage stone={{ key: "unknown", name: "Mystery", colour: "#888", hindi: "", sanskrit: "" }} />);
    expect(screen.getByTestId("ratna-image-fallback")).toBeInTheDocument();
  });
});

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RatnaJyotish />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("form heading, terminology and theme", () => {
  it("uses the exact heading and subheading", () => {
    expect(RATNA_TITLE).toBe("Ratna Jyotish");
    expect(RATNA_SUBTITLE).toBe("Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali.");
    renderForm();
    const h1 = screen.getByRole("heading", { level: 1, name: "Ratna Jyotish" });
    expect(h1.className).toContain("font-home-serif");
    expect(h1.className).toContain("text-[#592209]");
    expect(screen.getByText("Know your Rashi Ratna and explore traditional gemstone guidance based on your Kundali.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CALCULATE MY RATNA" })).toBeInTheDocument();
  });

  it("themes every control: light colour scheme, brown border and icons, orange focus, readable disabled and invalid states", () => {
    expect(css).toMatch(/\.ratna-input,\s*\n\.ratna-select\s*\{[^}]*color-scheme:\s*light/);
    expect(css).not.toMatch(/color-scheme:\s*dark/);
    const base = css.slice(css.indexOf(".ratna-input,"), css.indexOf(".ratna-input::placeholder"));
    expect(base).toContain("border: 1.5px solid rgba(89, 34, 9, 0.55)");
    expect(base).toContain("background-color: #FBF5EC");
    expect(base).toContain("color: #301607");
    expect(css).toMatch(/::-webkit-calendar-picker-indicator\s*\{\s*background-image:\s*url\("data:image\/svg\+xml[^"]*%23592209/);
    expect(css).toMatch(/input\[type="time"\]::-webkit-calendar-picker-indicator\s*\{\s*background-image:\s*url\("data:image\/svg\+xml[^"]*%23592209/);
    expect(css).toMatch(/\.ratna-input:focus,\s*\n\.ratna-select:focus\s*\{[^}]*rgba\(229, 138, 69/);
    expect(css).toMatch(/\.ratna-input:disabled,\s*\n\.ratna-select:disabled\s*\{[^}]*background-color:\s*#EBDDC6/);
    expect(css).toMatch(/aria-invalid="true"\]\s*\{\s*border-color:\s*#9B2C1D/);
    // select: custom brown arrow, cream options, orange selected option
    expect(css).toMatch(/\.ratna-select\s*\{[^}]*appearance:\s*none[^}]*background-image:\s*url\("data:image\/svg\+xml[^"]*%23592209/s);
    expect(css).toMatch(/\.ratna-select option\s*\{\s*background:\s*#FBF5EC/);
    expect(css).toMatch(/option:checked\s*\{\s*background:\s*#E58A45/);
    // birthplace listbox
    expect(css).toMatch(/\.ratna-option\[aria-selected="true"\]\s*\{\s*background:\s*#E58A45/);
  });

  it("keeps the Ratna feature free of dark or legacy colours", () => {
    const dir = resolve(root, "src/features/ratna");
    const files = readdirSync(dir).filter((f) => /\.(tsx|css)$/.test(f));
    for (const f of [...files, "../../pages/RatnaJyotish.tsx", "../../pages/RatnaJyotishResult.tsx"]) {
      const text = readFileSync(resolve(dir, f), "utf8");
      expect(text, f).not.toMatch(/bg-(red|amber|slate|navy)-9\d\d|text-amber-100|#071327|#0B1020|#d4a64a|color-scheme:\s*dark/);
    }
  });
});

describe("result page terminology", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.scrollTo = vi.fn();
    vi.mocked(ratnaApi.products).mockResolvedValue({ stone: { key: "diamond", name: "Diamond", planet: "Venus" }, gemstones: [], jewellery: [], chartLinked: [], complementary: [] });
  });

  it("shows the Hindi name beside the English name and uses 'Ratna' for the feature's headings", () => {
    saveResult(complete);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/ratna-jyotish/result"]}>
          <RatnaJyotishResult />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("recommended-stone")).toHaveTextContent("Diamond or White Sapphire");
    expect(screen.getByTestId("recommended-stone-hindi")).toHaveTextContent("हीरा · Heera");
    for (const h of ["Recommended Ratna", "Why this Ratna is recommended", "Traditional significance", "Wearing guidance", "Alternative Ratnas", "Ratnas that require caution"]) {
      expect(screen.getAllByText(h).length, h).toBeGreaterThan(0);
    }
    const alt = screen.getByTestId("ratna-card-emerald");
    expect(within(alt).getByRole("img", { name: /Emerald \(पन्ना · Panna\)/ })).toBeInTheDocument();
    // generic marketing terms are gone from visible headings
    const headings = screen.getAllByRole("heading").map((h) => h.textContent ?? "");
    for (const t of headings) expect(t).not.toMatch(/Gemstone (Recommendation|Details|Benefits)/i);
  });
});
