import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES, PROTECTED_ROUTES } from "./helpers/routes";

for (const path of PROTECTED_ROUTES) {
  test(`anonymous visit to ${path} is sent to /login`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/);
  });
}
for (const path of ADMIN_ROUTES) {
  test(`anonymous visit to ${path} never shows admin UI`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForURL((u) => !u.pathname.startsWith("/admin"), { timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText(/Total customers|Customer management|Admin Management/i);
  });
}

test("a signed-in non-admin cannot open /admin (client guard)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("auth", JSON.stringify({ state: { user: { id: "u1", firstName: "Qa", lastName: "User", email: "qa@example.test", userRoleMappings: [{ role: { name: "USER" } }] }, accessToken: "x", refreshToken: "y", isAuthenticated: true }, version: 0 })));
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await page.waitForURL((u) => !u.pathname.startsWith("/admin"), { timeout: 15_000 });
});
