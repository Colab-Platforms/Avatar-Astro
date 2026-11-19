import { expect, test } from "@playwright/test";
import { API } from "./helpers/routes";

// Read-only / negative probes. Nothing here can create, change or charge anything.
const origin = API.replace(/\/api$/, "");

test("health endpoint is up", async ({ request }) => { expect((await request.get(`${origin}/api/health`)).status()).toBe(200); });

for (const p of ["/admin/customers", "/admin/overview/dashboard", "/admin/payments", "/admin/admins", "/wallet", "/me", "/chat/sessions"]) {
  test(`anonymous GET ${p} is rejected with 401`, async ({ request }) => { expect((await request.get(API + p)).status()).toBe(401); });
  test(`forged token on GET ${p} is rejected with 401`, async ({ request }) => {
    expect((await request.get(API + p, { headers: { authorization: "Bearer aaa.bbb.ccc" } })).status()).toBe(401);
  });
}

for (const p of ["/ai/chat", "/tarot/reading", "/birthchart/generate", "/interpretation/generate", "/compatibility/analyze"]) {
  test(`anonymous POST ${p} cannot spend AI credits (never 200)`, async ({ request }) => {
    const r = await request.post(API + p, { data: {} });
    expect([400, 401, 403, 404]).toContain(r.status());
  });
}

test("wallet credit endpoints require auth", async ({ request }) => {
  for (const p of ["/wallet/razorpay/order", "/wallet/razorpay/confirm", "/wallet/topup"]) {
    expect([401, 404]).toContain((await request.post(API + p, { data: { amount: 99999 } })).status());
  }
});

test("payment webhook rejects missing and forged signatures", async ({ request }) => {
  const url = `${origin}/api/payments/razorpay/webhook`;
  expect((await request.post(url, { data: { event: "payment.captured" } })).status()).toBe(400);
  expect((await request.post(url, { data: { event: "payment.captured" }, headers: { "x-razorpay-signature": "deadbeef" } })).status()).toBe(400);
});

test("login with unknown user gives a generic error (no user enumeration)", async ({ request }) => {
  const a = await request.post(`${API}/auth/login`, { data: { email: "qa-unknown-1@example.com", password: "WrongPass#123" } });
  expect(a.status()).toBe(401);
  expect((await a.json()).message).toMatch(/invalid email or password/i);
});

test("register validates input server-side", async ({ request }) => {
  expect((await request.post(`${API}/auth/register`, { data: { email: "not-an-email", password: "x" } })).status()).toBe(400);
});

test("security headers present and no stack trace leaked on 404", async ({ request }) => {
  const r = await request.get(`${origin}/api/does-not-exist`);
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect(r.headers()["strict-transport-security"]).toBeTruthy();
  expect(await r.text()).not.toMatch(/at .*\.(ts|js):\d+/);
});

test("CORS does not reflect an arbitrary origin", async ({ request }) => {
  const r = await request.get(`${origin}/api/health`, { headers: { origin: "https://evil.example" } });
  const allow = r.headers()["access-control-allow-origin"] ?? "";
  expect(allow).not.toBe("https://evil.example");
  expect(allow).not.toBe("*");
});

test("oversized JSON body is refused", async ({ request }) => {
  const r = await request.post(`${API}/auth/login`, { data: { email: "a@b.co", password: "x".repeat(400_000) } });
  expect([400, 413]).toContain(r.status());
});

test("public astrologer list exposes no private fields", async ({ request }) => {
  const r = await request.get(`${API}/astrologers`);
  expect(r.status()).toBe(200);
  expect(JSON.stringify(await r.json())).not.toMatch(/passwordHash|"phone"|"email"|payout|bank/i);
});
