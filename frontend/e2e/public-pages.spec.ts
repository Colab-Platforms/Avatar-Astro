import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./helpers/routes";

// Noise we do not own: third-party embeds / analytics / extensions.
const IGNORED = [/youtube\.com|ytimg|googleusercontent|gstatic|google-analytics|googletagmanager|doubleclick|razorpay|favicon/i];

for (const path of PUBLIC_ROUTES) {
  test(`public page ${path}: renders, no console/page errors, no failed app requests, no horizontal overflow`, async ({ page }, info) => {
    const consoleErrors: string[] = [];
    const failed: string[] = [];
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !IGNORED.some((r) => r.test(m.text()))) consoleErrors.push(m.text().slice(0, 200)); });
    page.on("response", (r) => { if (r.status() >= 400 && !IGNORED.some((x) => x.test(r.url()))) failed.push(`${r.status()} ${r.url().slice(0, 120)}`); });

    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(res?.status(), "document status").toBeLessThan(400);
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await expect(page.locator("body")).not.toContainText(/something went wrong|application error|unexpected error/i);
    expect((await page.locator("body").innerText()).trim().length, "page has visible text").toBeGreaterThan(40);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect.soft(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
    const brokenImages = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && getComputedStyle(i).display !== "none").map((i) => i.currentSrc.slice(0, 100)));
    expect.soft(brokenImages, "broken images").toEqual([]);
    expect.soft(failed, "failed requests").toEqual([]);
    expect.soft(consoleErrors, "console errors").toEqual([]);
    const name = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "_");
    await page.screenshot({ path: `e2e/reports/shots/${info.project.name}/${name}.png` });
  });
}

test("unknown route shows the 404 page, not a blank screen", async ({ page }) => {
  await page.goto("/this-page-does-not-exist-qa", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(/404|not found/i);
});
