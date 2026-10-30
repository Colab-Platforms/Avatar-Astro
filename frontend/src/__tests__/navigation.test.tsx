import { describe, it, expect, beforeAll } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatedRoutes } from "@/App";
import Layout from "@/components/Layout";
import { NavigationProvider } from "@/context/NavigationContext";
import { getFallback } from "@/components/BackButton";

beforeAll(() => {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
  window.scrollTo = () => {};
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  Element.prototype.scrollIntoView = () => {};
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => ({}), set: () => true })) as never;
});

let nav: ReturnType<typeof useNavigate>;
let path = "";
const Probe = () => {
  nav = useNavigate();
  path = useLocation().pathname;
  return null;
};

const mount = (entries: string[], index?: number) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={entries} initialIndex={index}>
        <NavigationProvider>
          <Probe />
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </NavigationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 60)); });
const go = async (to: string | number) => {
  await act(async () => { (nav as (t: string | number) => void)(to); });
  await settle();
};
const navbar = () => document.querySelector("nav.navbar-gerua") as HTMLElement | null;
const shown = (el: HTMLElement | null) => !!el && el.style.display !== "none" && getComputedStyle(el).display !== "none";

const FEATURE_ROUTES = [
  "/birth-chart", "/tarot", "/zodiac", "/compatibility", "/palm-reading", "/ratna-jyotish",
  "/inner-voice", "/inner-voice/chat", "/inner-voice/dashboard", "/inner-voice/future-path",
  "/inner-voice/wisdom", "/name-destiny-report",
];

describe("navbar visibility", () => {
  it("stays visible on the homepage and on every public feature page", async () => {
    mount(["/"]);
    expect(shown(navbar())).toBe(true);
    for (const route of FEATURE_ROUTES.filter((r) => r !== "/inner-voice/chat")) {
      await go(route);
      expect(path).toBe(route);
      expect(shown(navbar()), route).toBe(true);
      expect(document.querySelectorAll("nav.navbar-gerua").length, `${route}: one navbar only`).toBe(1);
    }
  });

  it("returns to the homepage with a navbar after the full-screen Divya Margdarshak chat, even when going Back quickly", async () => {
    mount(["/"]);
    await act(async () => {
      nav("/inner-voice/chat");
      nav(-1); // Back before the lazy chat page has even finished loading
    });
    await settle();
    await settle();
    expect(path).toBe("/");
    expect(shown(navbar())).toBe(true);
    expect(screen.queryByText(/Namaste, Seeker/)).toBeNull(); // no stale chat page

    await go("/inner-voice/chat");
    expect(navbar()).toBeNull(); // chat is a full-screen app: route-driven, not hidden by style
    await go(-1);
    expect(path).toBe("/");
    expect(shown(navbar())).toBe(true);
    expect(navbar()!.getAttribute("style") ?? "").not.toContain("none");
  });
});

describe("Back button", () => {
  it.each(FEATURE_ROUTES.filter((r) => r !== "/inner-voice/chat"))("returns to the actual previous page from %s", async (route) => {
    mount(["/", "/blog"], 1); // arrived from /blog, not the homepage
    await go(route);
    fireEvent.click(await screen.findByRole("button", { name: /go back to previous page/i }));
    await settle();
    expect(path).toBe("/blog");
  });

  it.each(FEATURE_ROUTES.filter((r) => r !== "/inner-voice/chat"))("uses the feature's parent when %s is opened directly", async (route) => {
    mount([route]);
    await settle();
    fireEvent.click(await screen.findByRole("button", { name: /go back to previous page/i }));
    await settle();
    expect(path).toBe(getFallback(route));
  });

  it("falls back to the right parent for nested pages and never loops", () => {
    expect(getFallback("/inner-voice/wisdom")).toBe("/inner-voice");
    expect(getFallback("/ratna-jyotish/result")).toBe("/ratna-jyotish");
    expect(getFallback("/zodiac/aries")).toBe("/zodiac");
    expect(getFallback("/inner-voice")).toBe("/");
    expect(getFallback("/unknown")).toBe("/");
  });
});
