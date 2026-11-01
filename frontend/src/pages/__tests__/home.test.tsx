import { describe, it, expect, beforeAll } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Index from "@/pages/Index";
import Layout from "@/components/Layout";
import { NavigationProvider } from "@/context/NavigationContext";
import { tools } from "@/data/tools";
import { homeBlogPosts } from "@/data/homeBlog";
import { featuredSlides, devotionFeature, aiGuruFeature, liveDarshanFeature } from "@/data/features";

// framer-motion's whileInView needs IntersectionObserver, which jsdom lacks.
beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
});

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
const src = (p: string) => readFileSync(resolve(process.cwd(), "src", p), "utf8");

const renderAt = (path: string, ui: React.ReactNode = <Index />) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <NavigationProvider>
          <Routes>
            <Route path="*" element={<Layout>{ui}</Layout>} />
          </Routes>
        </NavigationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const sectionOf = (name: RegExp) => screen.getByRole("heading", { level: 2, name }).closest("section")!;

describe("homepage content and structure", () => {
  it("renders every section, each with a heading", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Discover Clarity,\s*Align Your Energy,\s*Create a Better Tomorrow/);
    for (const name of [
      /Explore Our\s+Astrology Seva/,
      /RASHI CHAKRA/,
      /Read from our\s+blog\./,
      /Why do\s+You\s+need astrology\?/,
      /Start Your Journey With\s+Clarity\./,
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    for (const t of ["Live Darshan", "Divya Margdarshak", "Devotion & Spirituality"]) {
      expect(screen.getByRole("heading", { level: 3, name: t })).toBeInTheDocument();
    }
    for (const t of ["Janma Kundali"]) {
      expect(screen.getAllByRole("heading", { level: 3, name: t }).length).toBeGreaterThan(0); // card grid and featured carousel
    }
  });

  it("hero: static artwork (no video), the approved copy, real destinations and no eyebrow or scroll prompt", () => {
    const { container } = renderAt("/");
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Discover Clarity,Align Your Energy,Create a Better Tomorrow");
    expect(screen.getByText("Create a Better Tomorrow").className).toContain("text-home-gerua");
    expect(screen.queryByText(/YOUR PERSONAL ASTROLOGY/)).toBeNull();
    expect(screen.getByText(/Get accurate astrology insights, personalised guidance/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore Astrology Seva/ })).toHaveAttribute("href", "#astrology-tools");
    expect(screen.getByRole("link", { name: "Book a Consultation" })).toHaveAttribute("href", "/inner-voice/chat");
    for (const [v, l] of [["50,000+", "Happy Users"], ["Verified", "Astrologers"], ["13+", "Languages"], ["60+", "Countries"]]) {
      expect(screen.getByText(v)).toBeInTheDocument();
      expect(within(document.querySelector("main")!).getByText(l)).toBeInTheDocument();
    }
    expect(screen.queryByText(/Scroll to explore/)).toBeNull();
    const hero = h1.closest("section")!;
    expect(hero.querySelector("video")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
    const img = hero.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/images/hero/mybhagya-hero-base.webp");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.closest("[aria-hidden='true']")).not.toBeNull();
    expect(hero.querySelector(".hero-wheel")).not.toBeNull();
    expect(container.querySelector("#astrology-tools")).not.toBeNull();
  });

  it("Astrology Seva: every card renders in data order, led by the four photo cards, each with its route", () => {
    renderAt("/");
    const section = sectionOf(/Astrology\s+Seva/);
    expect(screen.getAllByRole("heading", { level: 2, name: /Astrology\s+Seva/ })).toHaveLength(1); // one section only
    const titles = [...section.querySelectorAll(".hl-card h3")].map((h) => h.textContent);
    expect(titles).toEqual(tools.map((t) => t.title)); // follows tools.ts, whatever it contains
    expect(titles.slice(0, 4)).toEqual(["Janma Kundali", "Tarot Drishti", "Jodi Jyotish", "Hasta Rekha"]);
    for (const tool of tools.slice(0, 4)) {
      expect(tool.image).toMatch(/^\/images\/tools\/.+\.jpg$/); // the photo cards
    }
    for (const tool of tools) {
      const card = within(document.getElementById("astrology-tools")!).getByRole("heading", { level: 3, name: tool.title }).closest(".hl-card") as HTMLElement;
      const img = within(card).getByRole("img", { name: tool.title });
      expect(img.getAttribute("src")).toBe(tool.image);
      expect(within(card).getByText(tool.description)).toBeInTheDocument();
      expect(within(card).getByRole("link", { name: new RegExp(tool.button) })).toHaveAttribute("href", tool.path);
      expect(card.querySelector(".h-48")).not.toBeNull(); // large, consistent image area
    }
  });

  it("tool grid: 1 column, 2 from 768px, 3 from 1280px, inside a 6xl container", () => {
    renderAt("/");
    const grid = sectionOf(/Astrology\s+Seva/).querySelector(".grid")!;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("md:grid-cols-2");
    expect(grid.className).toContain("xl:grid-cols-3");
    expect(grid.className).toContain("max-w-6xl");
    expect(grid.className).not.toMatch(/grid-cols-4/);
  });

  it("tool cards are plain ivory surfaces: no pastel tone classes anywhere on the homepage", () => {
    const { container } = renderAt("/");
    for (const t of tools) {
      const card = within(document.getElementById("astrology-tools")!).getByRole("heading", { level: 3, name: t.title }).closest(".hl-card") as HTMLElement;
      expect(card.className).not.toMatch(/hl-tone/);
    }
    expect(container.querySelector("[class*='hl-tone']")).toBeNull();
    expect(css).not.toMatch(/\.hl-tone-/);
  });

  it("Featured carousel: four slides, arrows wrap, dots jump, one slide visible at a time", () => {
    const { container } = renderAt("/");
    const region = screen.getByRole("region", { name: "Featured Seva" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const slides = () => [...container.querySelectorAll("[aria-roledescription='slide']")];
    const visible = () => slides().filter((s) => s.getAttribute("aria-hidden") === "false").map((s) => s.querySelector("h3")!.textContent);
    expect(slides()).toHaveLength(4);
    expect(visible()).toEqual(["Janma Kundali"]);

    fireEvent.click(screen.getByRole("button", { name: "Next featured Seva" }));
    expect(visible()).toEqual(["Tarot Drishti"]);
    fireEvent.click(screen.getByRole("button", { name: "Show Hasta Rekha" }));
    expect(visible()).toEqual(["Hasta Rekha"]);
    fireEvent.click(screen.getByRole("button", { name: "Next featured Seva" })); // wraps
    expect(visible()).toEqual(["Janma Kundali"]);
    fireEvent.click(screen.getByRole("button", { name: "Previous featured Seva" })); // wraps back
    expect(visible()).toEqual(["Hasta Rekha"]);
    expect(screen.getByRole("button", { name: "Show Hasta Rekha" })).toHaveAttribute("aria-current", "true");
  });

  it("Featured slides keep their copy, photo, checklist and destination", () => {
    const { container } = renderAt("/");
    const slides = [...container.querySelectorAll("[aria-roledescription='slide']")] as HTMLElement[];
    featuredSlides.forEach((slide, i) => {
      const el = slides[i];
      expect(el.querySelector("h3")).toHaveTextContent(slide.title);
      expect(el.textContent).toContain(slide.description);
      expect(el.querySelector(`a[href="${slide.buttonPath}"]`)).toHaveTextContent(slide.buttonLabel);
      expect(el.querySelector("img")!.getAttribute("src")).toBe(slide.image);
      expect(el.querySelector("img")!.getAttribute("alt")).toBe(slide.imageAlt);
      expect([...el.querySelectorAll("li")].map((l) => l.textContent)).toEqual(slide.checklist);
    });
  });

  it("Live Darshan, Divya Margdarshak and Devotion keep their photos, tiles and links", () => {
    renderAt("/");
    const live = screen.getByRole("heading", { level: 3, name: "Live Darshan" }).closest(".hl-card") as HTMLElement;
    expect(within(live).getByText("LIVE")).toBeInTheDocument();
    expect(live.querySelectorAll("img")).toHaveLength(1 + liveDarshanFeature.thumbnails.length);
    expect(within(live).getByRole("link", { name: /Watch Live/ })).toHaveAttribute("href", "/avatar-live/darshan");

    const guru = screen.getByRole("heading", { level: 3, name: "Divya Margdarshak" }).closest(".hl-card") as HTMLElement;
    expect(within(guru).getByRole("img", { name: aiGuruFeature.imageAlt })).toHaveAttribute("src", "/images/tools/ai-guru.jpg");
    expect(within(guru).getByText("Ask your question...")).toBeInTheDocument();
    expect(within(guru).getByRole("link", { name: /Talk to Divya Margdarshak/ })).toHaveAttribute("href", "/inner-voice/chat");

    const dev = screen.getByRole("heading", { level: 3, name: "Devotion & Spirituality" }).closest(".hl-card") as HTMLElement;
    expect(within(dev).getByText(devotionFeature.description)).toBeInTheDocument();
    for (const item of devotionFeature.items) {
      expect(within(dev).getByRole("link", { name: item.label })).toHaveAttribute("href", item.path);
    }
    expect(within(dev).getByRole("link", { name: /Explore All/ })).toHaveAttribute("href", "/avatar-live");
    // Puja entry points are temporarily hidden from the card.
    expect(within(dev).queryByRole("link", { name: /Puja|Festivals/ })).toBeNull();
  });

  it("zodiac carousel: arrows and dots change the selected sign, with the profile link on the pills row", () => {
    renderAt("/");
    // State-driven (aria-current on the dots); the animated text swap is covered in the browser check.
    const current = () => screen.getAllByRole("button", { name: /^(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)$/ })
      .find((b) => b.getAttribute("aria-current") === "true")!.getAttribute("aria-label");
    expect(current()).toBe("Aries");
    fireEvent.click(screen.getByRole("button", { name: "Next sign" }));
    expect(current()).toBe("Taurus");
    fireEvent.click(screen.getByRole("button", { name: "Previous sign" }));
    expect(current()).toBe("Aries");
    fireEvent.click(screen.getByRole("button", { name: "Previous sign" }));
    expect(current()).toBe("Pisces"); // wraps around
    fireEvent.click(screen.getByRole("button", { name: "Gemini" }));
    expect(current()).toBe("Gemini");
    const profile = screen.getByRole("button", { name: "Read Full Profile" });
    expect(profile.parentElement!.querySelectorAll("span").length).toBe(4); // four trait pills share its row
  });

  it("blog: the four published articles with photo, category, excerpt, date and read time", () => {
    const { container } = renderAt("/");
    const section = sectionOf(/Read from our\s+blog\./);
    expect(section.querySelectorAll("article")).toHaveLength(4);
    homeBlogPosts.forEach((post) => {
      const card = screen.getByRole("heading", { level: 3, name: post.title }).closest("a")!;
      expect(card).toHaveAttribute("href", "/blog");
      expect(within(card).getByText(post.excerpt)).toBeInTheDocument();
      expect(within(card).getByText(post.category)).toBeInTheDocument();
      expect(within(card).getByText(post.readTime)).toBeInTheDocument();
      expect(card.querySelector("time")!.getAttribute("datetime")).toBe(post.date);
      expect(within(card).getByRole("img", { name: post.imageAlt })).toHaveAttribute("src", post.image);
    });
    expect(screen.getAllByText("24 Oct 2026")).toHaveLength(4);
    expect(within(section).getByRole("link", { name: /View all blogs/ })).toHaveAttribute("href", "/blog");
    expect(container).toBeTruthy();
  });

  it("FAQ keeps its content and toggles", () => {
    renderAt("/");
    const q = screen.getByRole("button", { name: "How does Janma Kundali work on Spiritual?" });
    expect(q).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(q);
    expect(q).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "What can I explore on Spiritual?" })).toHaveAttribute("aria-expanded", "false");
  });

  it("every image has an alt attribute (empty for the decorative hero art)", () => {
    const { container } = renderAt("/");
    for (const img of container.querySelectorAll("img")) expect(img.hasAttribute("alt")).toBe(true);
  });

  it("every homepage image path points at a file that exists in the repo", () => {
    const paths = [
      ...tools.map((t) => t.image),
      ...featuredSlides.map((s) => s.image),
      aiGuruFeature.image,
      liveDarshanFeature.image,
      ...liveDarshanFeature.thumbnails,
      ...homeBlogPosts.map((p) => p.image),
      "/images/hero/solar-system-poster.jpg",
      "/images/temples/Solar_system.mp4",
    ];
    for (const p of paths) expect(existsSync(resolve(process.cwd(), "public", p.slice(1))), p).toBe(true);
  });
});

describe("site-wide light theme scoping", () => {
  it("applies the shared .home-light theme to every route, not just '/'", () => {
    const { container, unmount } = renderAt("/");
    expect(container.querySelector(".home-light")).not.toBeNull();
    expect(document.body.classList.contains("home-light-body")).toBe(true);
    unmount();
    expect(document.body.classList.contains("home-light-body")).toBe(false);

    const other = renderAt("/about", <p>about page</p>);
    expect(other.container.querySelector(".home-light")).not.toBeNull();
    expect(document.body.classList.contains("home-light-body")).toBe(true);
  });

  it("the old dark starfield layer is no longer mounted by the app shell or the auth layout", () => {
    expect(src("App.tsx")).not.toMatch(/import CosmicBackground|<CosmicBackground/);
    expect(src("features/auth/components/AuthLayout.tsx")).not.toMatch(/import CosmicBackground|<CosmicBackground/);
  });

  it("the gerua navbar and footer are shared by every route", () => {
    const home = renderAt("/");
    expect(document.querySelector("nav")!.className).toContain("navbar-gerua");
    expect(document.querySelector("footer")!.getAttribute("style")).toContain("rgb(89, 34, 9)");
    home.unmount();
    renderAt("/about", <p>about</p>);
    expect(document.querySelector("nav")!.className).toContain("navbar-gerua");
    expect(document.querySelector("footer")!.getAttribute("style")).toContain("rgb(89, 34, 9)");
  });

  it("gerua navbar tokens: gerua bar, ivory type, antique-gold accent, ivory dropdowns", () => {
    const block = css.slice(css.indexOf("nav.navbar-gerua {"));
    for (const decl of ["--nav-bg: #592209;", "--nav-fg: #F5E9D6;", "--nav-accent: #E58A45;", "--nav-menu-bg: #FBF5EC;", "--nav-menu-text: #301607;"]) {
      expect(block, decl).toContain(decl);
    }
    // the bar's colours are page-independent: the nav never sets a page background
    expect(css).not.toMatch(/\.navbar-gerua[^{]*\{[^}]*\bbody\b/);
  });

  it("navigation keeps all links on the homepage", () => {
    renderAt("/");
    const nav = within(document.querySelector("nav")!);
    for (const [name, href] of [["Blog", "/blog"], ["About", "/about"], ["Contact", "/contact"]] as const) {
      expect(nav.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    for (const label of ["Astrology Seva", "Inner Voice", "Live"]) {
      expect(nav.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(nav.getByRole("link", { name: /Sign in/ })).toBeInTheDocument();
  });

  it("navbar: Shop is a permanent top-level link, Devotion, Puja and Chadhawa are hidden", () => {
    renderAt("/");
    const nav = within(document.querySelector("nav")!);
    expect(nav.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(nav.queryByRole("button", { name: /Devotion/ })).toBeNull();
    expect(nav.queryByText(/Devotion/)).toBeNull();
    expect(nav.queryByRole("link", { name: /Puja/ })).toBeNull();
    expect(nav.queryByRole("link", { name: /Chadhawa/ })).toBeNull();
    // order: Home, Astrology Seva, Inner Voice, Shop, Live, Blog, About, Contact, Sign in
    const text = document.querySelector("nav [class~=\"lg:flex\"]")!.textContent!;
    const order = ["Home", "Astrology Seva", "Inner Voice", "Shop", "Live", "Blog", "About", "Contact", "Sign in"].map((l) => text.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("mobile menu shows Shop directly (not in a dropdown) and no Devotion", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = within(document.getElementById("mobile-menu")!);
    expect(menu.getByRole("link", { name: "Shop" })).toHaveAttribute("href", "/shop");
    expect(menu.queryByText(/Devotion/)).toBeNull();
    expect(menu.queryByText(/Puja|Chadhawa/)).toBeNull();
    expect(menu.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("homepage sections carry no dark-theme styling", () => {
    const { container } = renderAt("/");
    const main = container.querySelector("main")!.innerHTML;
    for (const dark of ["text-white/", "bg-black", "#050b18", "#081426", "#020B1F", "rgba(5,11,24", "rgba(13,28,52", "mix-blend", "StarField", "brand-accent"]) {
      expect(main, dark).not.toContain(dark);
    }
  });
});

describe("no dark sections remain", () => {
  it("the footer is gerua with cream type, translucent cream tiles, a cream input and an orange submit button", () => {
    const footer = src("components/Footer.tsx");
    expect(footer).toContain("background: '#592209'");
    expect(footer).toContain("color: '#F5E9D6'");
    expect(footer).toContain("bg-[#F5E9D6] px-[18px] text-[15px] text-[#301607]");
    expect(footer).toContain("placeholder:text-[#6B4A30]");
    expect(footer).toContain("bg-[#E58A45] text-[#301607]");
    expect(footer).toContain("hover:text-[#E58A45]");
    expect(footer).toContain("bg-[#F5E9D6]/10");
    // no leftover dark / navy / per-route palette
    expect(footer).not.toMatch(/5, 11, 24|#081426|#020B1F|const t = |#FAF7F1|#8C3F18/);
  });

  it("the homepage no longer shows the Solar System feature", () => {
    renderAt("/");
    expect(screen.queryByText(/Explore the\s+Solar System/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /Launch Solar System/ })).toBeNull();
  });

  it("every section sits directly on the parchment page: no tinted band, no inline dark background", () => {
    const { container } = renderAt("/");
    expect(container.querySelectorAll("main .hl-alt")).toHaveLength(0);
    expect(css).not.toMatch(/\.hl-alt\s*\{/);
    const inline = [...container.querySelectorAll("main section[style], main section > div[style]")].map((e) => e.getAttribute("style") ?? "");
    for (const st of inline) expect(st).not.toMatch(/#0[0-9a-f]{5}|#1[0-9a-f]{5}/i);
  });

  it("carousel arrows are gerua with ivory icons", () => {
    renderAt("/");
    for (const name of ["Previous sign", "Next sign", "Previous featured Seva", "Next featured Seva"]) {
      expect(screen.getByRole("button", { name }).className, name).toContain("bg-home-gerua");
      expect(screen.getByRole("button", { name }).className, name).toContain("text-home-ivory");
    }
    expect(src("components/ZodiacWheelSection.tsx")).not.toContain("mixBlendMode");
  });
});

describe("layout matches the design", () => {
  it("uses Tailwind's own container: the page does not override its width", () => {
    expect(css).not.toMatch(/\.home-light \.container\s*\{/);
  });

  it("featured, zodiac and blog use the 1440px content width; the trio is 1/2/3 columns", () => {
    renderAt("/");
    for (const sec of [sectionOf(/Read from our\s+blog\./), screen.getByRole("region", { name: "Featured Seva" }).closest("section")!]) {
      expect(sec.querySelector("[class*='max-w-[1440px]']")).not.toBeNull();
    }
    const trio = screen.getByRole("heading", { level: 3, name: "Live Darshan" }).closest(".grid")!;
    expect(trio.className).toContain("md:grid-cols-2");
    expect(trio.className).toContain("lg:grid-cols-3");
    const blogGrid = sectionOf(/Read from our\s+blog\./).querySelector(".grid")!;
    expect(blogGrid.className).toContain("sm:grid-cols-2");
    expect(blogGrid.className).toContain("xl:grid-cols-4");
  });

  it("the nav tightens its spacing between 1024 and 1279px so it stays on one row", () => {
    expect(css).toMatch(/@media \(min-width: 1024px\) and \(max-width: 1279px\) \{\s*\.home-light nav \.lg\\:flex \{ gap: 0\.75rem; \}\s*\.home-light nav \.lg\\:flex :is\(a, button\) \{ font-size: 0\.9rem; \}/);
  });

  it("the footer lines up with the page container on '/' and keeps its wider layout elsewhere", () => {
    const footer = src("components/Footer.tsx");
    expect(footer).toContain("home ? 'max-w-[1400px]' : 'max-w-[1600px]'");
    expect(footer).toContain("home ? 'px-6' : 'px-6 md:px-12 lg:px-[72px]'");
  });

  it("UI text is DM Sans, headings Cinzel, the logo Uncial Antiqua (all loaded)", () => {
    expect(css.split("\n")[0]).toContain("DM+Sans");
    expect(css.split("\n")[0]).toContain("Uncial+Antiqua");
    expect(readFileSync(resolve(process.cwd(), "tailwind.config.ts"), "utf8")).toContain('"home-sans": ["DM Sans"');
    expect(css).toMatch(/\.home-light nav a\[href="\/"\]\.group \.font-display \{ font-family: "Uncial Antiqua"/);
  });

  it("headings can be uppercase: the reset has zero specificity so utilities win", () => {
    expect(css).toMatch(/:where\(\.home-light\) h1, :where\(\.home-light\) h2, :where\(\.home-light\) h3, :where\(\.home-light\) h4 \{/);
  });
});

describe("parchment / gerua / gold palette", () => {
  const tailwind = readFileSync(resolve(process.cwd(), "tailwind.config.ts"), "utf8");
  const homeBlock = css.slice(css.indexOf("--mb-primary: #592209;"), css.indexOf("--mb-focus-ring") + 40);
  const TOKENS: Record<string, string> = {
    "--mb-primary": "#592209", "--mb-background": "#F5E9D6", "--mb-accent": "#E58A45", "--mb-text": "#301607",
    "--mb-surface": "#FBF5EC", "--mb-surface-muted": "#F0DFC7", "--mb-text-muted": "#6B4A37", "--mb-primary-hover": "#461B07", "--mb-focus-ring": "#E58A45",
  };

  it("defines the four brand tokens plus their derived surfaces on :root (site-wide)", () => {
    for (const [name, hex] of Object.entries(TOKENS)) expect(homeBlock).toContain(`${name}: ${hex};`);
    expect(homeBlock).toContain("--mb-border: rgba(89, 34, 9, 0.18);");
    // the shared HSL tokens behind every Tailwind utility are light, not the old dark navy
    expect(css).toContain("--background: 37 61% 90%;");
    expect(css).toContain("--foreground: 22 75% 11%;");
    expect(css).toMatch(/body \{\s*background: #F5E9D6;/);
  });

  it("Tailwind home.* tokens match the CSS variables", () => {
    const pairs: Record<string, string> = { parchment: "#F5E9D6", ivory: "#FBF5EC", gerua: "#592209", "gerua-dark": "#461B07", ink: "#301607", muted: "#6B4A37", gold: "#E58A45", line: "#E0C8B0", navy: "#1C2740" };
    for (const [k, v] of Object.entries(pairs)) {
      const key = k.includes("-") ? `"${k}"` : k; // hyphenated keys are quoted in the config
      expect(tailwind, k).toContain(`${key}: "${v}"`);
    }
  });

  it("cosmic navy is not used as any homepage background", () => {
    expect(css.slice(css.indexOf("HOMEPAGE LIGHT THEME"))).not.toMatch(/background[^;]*var\(--mb-cosmic-navy\)/);
    const files = ["pages/Index.tsx", "components/hero/Hero.tsx", "components/ToolCard.tsx", "components/AstrologyToolsSection.tsx", "components/FeatureShowcase.tsx", "components/FeaturedCarousel.tsx", "components/LiveDarshanCard.tsx", "components/AIGuruCard.tsx", "components/DevotionCard.tsx", "components/ZodiacWheelSection.tsx", "components/HomeBlogSection.tsx", "components/WhyAstrologySection.tsx", "components/FaqSection.tsx", "components/Footer.tsx"];
    for (const f of files) expect(src(f), f).not.toMatch(/bg-home-navy|#1C2740/);
  });

  it("no homepage source still uses the superseded rust-orange, indigo-purple or earlier palettes", () => {
    const old = ["#5136BC", "#8754D9", "#EDEBFF", "#E7E6F0", "#252B72", "#202950", "#FFFCF8", "#5B6380", "#F8F7FC", "#D05F2F", "#121212", "#FE9F30", "#FFF3EC", "#A14C28", "#F2CAB7", "#54514F", "#F8F3EB", "#EFE4D5", "#FFFCF7", "#B95638", "#98432D", "#E9CF78", "#C7A46A", "#081426", "#020B1F", "home-purple", "home-violet", "home-lavender", "home-indigo", "home-peach", "home-mint", "home-pink", "home-mist", "home-rust", "home-orange", "home-cream", "home-deep", "home-card", "hl-gradient", "hl-tone", "brand-accent", "--mb-ivory", "--mb-purple", "--mb-violet", "--mb-rust", "--mb-orange", "--mb-cream"];
    const files = ["pages/Index.tsx", "components/Footer.tsx", "components/hero/Hero.tsx", "components/ToolCard.tsx", "components/AstrologyToolsSection.tsx", "components/FeatureShowcase.tsx", "components/FeaturedCarousel.tsx", "components/LiveDarshanCard.tsx", "components/AIGuruCard.tsx", "components/DevotionCard.tsx", "components/FeatureButton.tsx", "components/ZodiacWheelSection.tsx", "components/HomeBlogSection.tsx", "components/WhyAstrologySection.tsx", "components/FaqSection.tsx"];
    const themeCss = css.slice(css.indexOf("HOMEPAGE LIGHT THEME"));
    for (const f of files) for (const o of old) expect(src(f), `${f} -> ${o}`).not.toContain(o);
    for (const o of old) expect(themeCss, o).not.toContain(o);
  });
});

describe("motion and contrast", () => {
  it("switches the new animations and transitions off for reduced-motion users", () => {
    const start = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
    const reduced = css.slice(start);
    expect(reduced).toContain(".hl-rise");
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).toContain(".hl-card");
    expect(reduced).toMatch(/transition:\s*none/);
    expect(src("components/hero/Hero.tsx")).toContain('behavior: reduceMotion ? "auto" : "smooth"');
  });

  const lum = (hex: string) => {
    const ch = (i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    const [r, g, b] = [0, 1, 2].map(ch).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const PARCHMENT = "#F5E9D6", IVORY = "#FBF5EC", GERUA = "#592209", GERUA_DARK = "#461B07", INK = "#301607", MUTED = "#6B4A37", GOLD = "#E58A45";

  it("charcoal, muted text and gerua meet AA (4.5:1) on both surfaces", () => {
    for (const [name, bg] of Object.entries({ parchment: PARCHMENT, ivory: IVORY })) {
      expect(ratio(INK, bg), `ink on ${name}`).toBeGreaterThanOrEqual(7);
      expect(ratio(MUTED, bg), `muted on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(GERUA, bg), `gerua on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(GERUA_DARK, bg), `gerua hover on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("ivory text on the gerua button meets AA, including the hover shade", () => {
    expect(ratio(IVORY, GERUA)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(IVORY, GERUA_DARK)).toBeGreaterThanOrEqual(4.5);
  });

  it("footer text pairs: cream, input text and placeholder meet AA; orange is a 3:1 hover accent with an underline cue", () => {
    const CREAM = "#F5E9D6", FG = "#592209", ORANGE = "#E58A45", BROWN = "#301607";
    expect(ratio(CREAM, FG)).toBeGreaterThanOrEqual(7);
    expect(ratio(BROWN, CREAM)).toBeGreaterThanOrEqual(7);
    expect(ratio("#6B4A30", CREAM)).toBeGreaterThanOrEqual(4.5); // placeholder
    expect(ratio(BROWN, ORANGE)).toBeGreaterThanOrEqual(4.5); // submit icon
    expect(ratio(ORANGE, FG)).toBeGreaterThanOrEqual(3); // hover/focus indicator
  });

  it("navbar text pairs: beige on gerua AA; orange on gerua is a 3:1 accent paired with an underline; dropdown text AA", () => {
    const ORANGE = "#E58A45", BEIGE = "#F5E9D6";
    expect(ratio(BEIGE, GERUA)).toBeGreaterThanOrEqual(7);
    expect(ratio(ORANGE, GERUA)).toBeGreaterThanOrEqual(3);
    expect(ratio(INK, ORANGE)).toBeGreaterThanOrEqual(4.5); // sign-in hover
    expect(ratio(INK, IVORY)).toBeGreaterThanOrEqual(7);
    expect(ratio(GERUA, IVORY)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(MUTED, IVORY)).toBeGreaterThanOrEqual(4.5);
  });

  it("documents why antique gold is decoration only", () => {
    expect(ratio(GOLD, PARCHMENT)).toBeLessThan(3);
    expect(ratio(GOLD, IVORY)).toBeLessThan(3);
  });
});
