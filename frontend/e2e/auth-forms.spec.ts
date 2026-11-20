import { expect, test } from "@playwright/test";

// Client-side validation only: nothing is submitted successfully, so no account or OTP is created.
const signIn = /sign in|log in|login/i;

test.describe("login form", () => {
  test("empty submit is blocked and sends no login request", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (/\/auth\/login/.test(r.url()) && r.method() === "POST") calls++; });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: signIn }).first().click();
    await page.waitForTimeout(500);
    expect(calls).toBe(0);
    await expect(page).toHaveURL(/\/login/);
  });
  test("invalid email format is rejected before any request", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => { if (/\/auth\/login/.test(r.url()) && r.method() === "POST") calls++; });
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("not-an-email");
    await page.locator('input[autocomplete="current-password"]').fill("Whatever#123");
    await page.getByRole("button", { name: signIn }).first().click();
    await page.waitForTimeout(500);
    expect(calls).toBe(0);
  });
  test("wrong credentials show an error and keep the user signed out", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').fill("qa-nobody-exists@example.com");
    await page.locator('input[autocomplete="current-password"]').fill("WrongPass#123");
    await page.getByRole("button", { name: signIn }).first().click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test("register form: empty submit blocked, nothing created", async ({ page }) => {
  let calls = 0;
  page.on("request", (r) => { if (/\/auth\/register/.test(r.url()) && r.method() === "POST") calls++; });
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /create|register|sign up|continue|next/i }).first().click();
  await page.waitForTimeout(600);
  expect(calls).toBe(0);
  await expect(page).toHaveURL(/\/register/);
});

test("forgot-password page renders an email field", async ({ page }) => {
  await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
