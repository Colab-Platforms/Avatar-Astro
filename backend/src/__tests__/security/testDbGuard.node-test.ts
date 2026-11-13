// Run with: npm run test:security
// Phase-1 safeguard: the test-database tooling must refuse anything that is not the dedicated local container.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error — plain .mjs tooling module, intentionally dependency-free
import { assertSafeTestDatabase, TEST_DATABASE_URL } from "../../../scripts/test-db/config.mjs";

const REFUSED: Array<[string, string]> = [
  ["a Neon pooled URL", "postgresql://u:p@ep-green-mountain-azj4r8n8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"],
  ["a Render URL", "postgresql://u:p@dpg-abc123.oregon-postgres.render.com/db"],
  ["a remote host on the test port", "postgresql://mybhagya_test:x@10.0.0.5:54329/mybhagya_test"],
  ["a cloud host spoofing the db name", "postgresql://mybhagya_test:x@db.example.amazonaws.com:54329/mybhagya_test"],
  ["localhost but the wrong port", "postgresql://mybhagya_test:x@127.0.0.1:5432/mybhagya_test"],
  ["localhost, right port, wrong database name", "postgresql://mybhagya_test:x@127.0.0.1:54329/postgres"],
  ["localhost, right port, a production-looking name", "postgresql://mybhagya_test:x@localhost:54329/neondb"],
  ["the developer's PGlite port", "postgresql://postgres:postgres@127.0.0.1:5544/postgres"],
  ["not a postgres URL", "mysql://u:p@127.0.0.1:54329/mybhagya_test"],
  ["garbage", "not a url"],
  ["empty", ""],
];

test("assertSafeTestDatabase accepts exactly the dedicated local test database", () => {
  assert.equal(assertSafeTestDatabase(TEST_DATABASE_URL), TEST_DATABASE_URL);
  assert.doesNotThrow(() => assertSafeTestDatabase("postgresql://mybhagya_test:mybhagya_test_pw@localhost:54329/mybhagya_test"));
});

for (const [label, url] of REFUSED) {
  test(`assertSafeTestDatabase REFUSES ${label}`, () => {
    assert.throws(() => assertSafeTestDatabase(url), /REFUSING/);
  });
}

test("assertSafeTestDatabase refuses undefined/null", () => {
  assert.throws(() => assertSafeTestDatabase(undefined as any), /REFUSING/);
  assert.throws(() => assertSafeTestDatabase(null as any), /REFUSING/);
});
