// Runs the DB-backed suites against the disposable test database. Refuses any other target.
//   npm run test:db:run              (default financial + chat + wallet + security set)
//   npm run test:db:run -- path/to/file.node-test.ts   (specific files)
import { spawnSync } from "node:child_process";
import { BACKEND_DIR, TEST_DATABASE_URL, assertSafeTestDatabase } from "./config.mjs";

const url = assertSafeTestDatabase(process.env.TEST_DATABASE_URL || TEST_DATABASE_URL, "test database");
const DEFAULT = [
  "src/__tests__/routes/walletLedger.node-test.ts",
  "src/__tests__/routes/walletReservations.node-test.ts",
  "src/__tests__/routes/freeAllowance.node-test.ts",
  "src/__tests__/routes/toolBilling.node-test.ts",
  "src/__tests__/routes/chatStateMachine.node-test.ts",
  "src/modules/chat/__tests__/billingFormula.test.ts",
  "src/__tests__/financial/*.node-test.ts",
  "src/__tests__/security/*.node-test.ts",
];
const files = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;
const r = spawnSync("npx", ["tsx", "--test", "--test-concurrency=1", "--test-timeout=240000", ...files], {
  cwd: BACKEND_DIR, shell: true, stdio: "inherit",
  env: { ...process.env, TEST_DATABASE_URL: url },
});
process.exit(r.status ?? 1);
