// Run with: npm run test:security
// Checkpoint 0 — the MOCK payment gateway must fail closed everywhere except an explicitly enabled
// local development/test environment. No database is touched: the gate is asserted to trip BEFORE any
// query (the DATABASE_URL below points at a port nothing listens on, so reaching the DB would error
// with a connection failure instead of the expected 503).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { isMockPaymentsEnabled, isMockPaymentsMisconfigured } from "../../modules/payment/mockPayments.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-jwt-secret";
process.env.DATABASE_URL = "postgresql://nobody:nothing@127.0.0.1:1/never_connected";

// Every (NODE_ENV, ALLOW_MOCK_PAYMENTS) combination that matters.
const MATRIX: Array<{ nodeEnv: string | undefined; flag: string | undefined; enabled: boolean }> = [
  { nodeEnv: "production", flag: undefined, enabled: false },
  { nodeEnv: "production", flag: "true", enabled: false },
  { nodeEnv: "staging", flag: undefined, enabled: false },
  { nodeEnv: "staging", flag: "true", enabled: false },
  { nodeEnv: "preview", flag: "true", enabled: false },
  { nodeEnv: "Production", flag: "true", enabled: false },
  { nodeEnv: "", flag: "true", enabled: false },
  { nodeEnv: undefined, flag: "true", enabled: false },
  { nodeEnv: undefined, flag: undefined, enabled: false },
  { nodeEnv: "development", flag: undefined, enabled: false }, // local dev must opt IN explicitly
  { nodeEnv: "development", flag: "false", enabled: false },
  { nodeEnv: "development", flag: "TRUE", enabled: false }, // exact match only
  { nodeEnv: "development", flag: "1", enabled: false },
  { nodeEnv: "development", flag: "true", enabled: true },
  { nodeEnv: "test", flag: "true", enabled: true },
];

test("isMockPaymentsEnabled: only development/test WITH ALLOW_MOCK_PAYMENTS=true is enabled", () => {
  for (const { nodeEnv, flag, enabled } of MATRIX) {
    const env = { NODE_ENV: nodeEnv, ALLOW_MOCK_PAYMENTS: flag };
    assert.equal(isMockPaymentsEnabled(env), enabled, `NODE_ENV=${JSON.stringify(nodeEnv)} ALLOW_MOCK_PAYMENTS=${JSON.stringify(flag)}`);
  }
});

test("isMockPaymentsMisconfigured flags the flag being set where it can never take effect", () => {
  assert.equal(isMockPaymentsMisconfigured({ NODE_ENV: "production", ALLOW_MOCK_PAYMENTS: "true" }), true);
  assert.equal(isMockPaymentsMisconfigured({ NODE_ENV: "staging", ALLOW_MOCK_PAYMENTS: "true" }), true);
  assert.equal(isMockPaymentsMisconfigured({ NODE_ENV: "development", ALLOW_MOCK_PAYMENTS: "true" }), false);
  assert.equal(isMockPaymentsMisconfigured({ NODE_ENV: "production" }), false);
});

let prisma: any;
after(async () => {
  if (prisma) await prisma.$disconnect();
});

test("createRechargeOrder / confirmRechargeOrder throw 503 in every locked environment, before touching the database", async () => {
  prisma = (await import("../../../prisma.js")).default;
  const service = await import("../../modules/payment/payment.service.js");
  // This test pins the MOCK gate. A developer's local .env may hold real Razorpay test keys
  // (loaded via prisma.config.ts's dotenv), which would legitimately open the RAZORPAY path and
  // reach the (dead) database instead of 503ing. Deconfigure Razorpay for the matrix, restore after.
  const { defaultRazorpayProvider } = await import("../../modules/payment/payment.provider.js");
  defaultRazorpayProvider.reloadConfig({});

  const saved = { NODE_ENV: process.env.NODE_ENV, ALLOW_MOCK_PAYMENTS: process.env.ALLOW_MOCK_PAYMENTS };
  try {
    for (const { nodeEnv, flag, enabled } of MATRIX.filter((m) => !m.enabled)) {
      if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv;
      if (flag === undefined) delete process.env.ALLOW_MOCK_PAYMENTS; else process.env.ALLOW_MOCK_PAYMENTS = flag;

      for (const attempt of [
        () => service.createRechargeOrder("user-1", 50_000),
        () => service.confirmRechargeOrder("user-1", "order-1"),
      ]) {
        await assert.rejects(attempt(), (e: any) => e?.statusCode === 503, `NODE_ENV=${JSON.stringify(nodeEnv)} flag=${JSON.stringify(flag)} must be 503 (enabled=${enabled})`);
      }
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    defaultRazorpayProvider.reloadConfig(process.env);
  }
});

test("when explicitly enabled (development + flag) the gate opens: the request proceeds to normal validation", async () => {
  const service = await import("../../modules/payment/payment.service.js");
  const saved = { NODE_ENV: process.env.NODE_ENV, ALLOW_MOCK_PAYMENTS: process.env.ALLOW_MOCK_PAYMENTS };
  try {
    process.env.NODE_ENV = "development";
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    // An out-of-range amount is rejected with 400 by business validation, which only runs once the gate has passed.
    await assert.rejects(service.createRechargeOrder("user-1", 1), (e: any) => e?.statusCode === 400);
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});
