import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import gemstoneRoutes from "../gemstone.route.js";
import { setAccountStatusChecker } from "../../../middleware/authMiddleware.js";

// Exercises the real auth middleware with a test-only secret; no database is used.
process.env.JWT_SECRET = "test-only-jwt-secret";
setAccountStatusChecker(async (id) => id !== "gone-user");
const userToken = jwt.sign({ id: "test-user", role: "USER" }, process.env.JWT_SECRET);
const goneToken = jwt.sign({ id: "gone-user", role: "USER" }, process.env.JWT_SECRET);

let server: Server;
let base = "";
before(() => {
  const app = express();
  app.use(express.json());
  app.use("/api/gemstone-calculator", gemstoneRoutes);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.statusCode || err.status || 500).json({ success: false, error: err.message });
  });
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const body = {
  fullName: "Asha Verma",
  gender: "Female",
  dateOfBirth: "1990-05-05",
  timeOfBirth: "10:00",
  timeUnknown: false,
  place: { name: "New Delhi", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
};
const post = (path: string, token?: string) =>
  fetch(`${base}/api/gemstone-calculator${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

for (const path of ["/calculate", "/kundali"]) {
  test(`${path}: 401 without a token, no result leaked`, async () => {
    const res = await post(path);
    assert.equal(res.status, 401);
    const text = await res.text();
    assert.doesNotMatch(text, /Pushya|ascendant|primary|rashi/i);
  });

  test(`${path}: a forged or garbage token is rejected`, async () => {
    assert.equal((await post(path, "not-a-jwt")).status, 401);
    const forged = jwt.sign({ id: "test-user", role: "USER" }, "some-other-secret");
    assert.equal((await post(path, forged)).status, 401);
  });

  test(`${path}: a deactivated account is refused`, async () => {
    assert.ok([401, 403].includes((await post(path, goneToken)).status));
  });

  test(`${path}: a signed-in user gets the result`, async () => {
    const res = await post(path, userToken);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: boolean; data: unknown };
    assert.equal(json.status, true);
    assert.ok(json.data);
  });
}

test("the birthplace search stays public (not a generated result)", async () => {
  const res = await fetch(`${base}/api/gemstone-calculator/locations?q=a`);
  assert.equal(res.status, 200);
});
