import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

// Base URL defaults to production and every spec in e2e/ is READ-ONLY against it (no registration,
// payment or data writes). Point E2E_BASE_URL at a local dev server for write-path journeys.
const baseURL = process.env.E2E_BASE_URL ?? "https://www.mybhagya.in";
// Reuse a locally installed Chromium when E2E_CHROMIUM is set (avoids a browser download).
const executablePath = process.env.E2E_CHROMIUM && fs.existsSync(process.env.E2E_CHROMIUM) ? process.env.E2E_CHROMIUM : undefined;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 1,
  workers: 4,
  reporter: [["list"], ["json", { outputFile: "e2e/reports/results.json" }], ["html", { outputFolder: "e2e/reports/html", open: "never" }]],
  outputDir: "e2e/reports/artifacts",
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure", video: "off", launchOptions },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 }, launchOptions } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1100 }, hasTouch: true, launchOptions } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, launchOptions } },
  ],
});
