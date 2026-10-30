// One-time (and safe to repeat) setup of the LOCAL test database: applies the migrations and creates the
// synthetic TEST accounts. Hard-wired to the local database; it never reads DATABASE_URL from anywhere else.
//   npm run local:setup     (the local database from `npm run local:db` must be running)
import { spawnSync } from "child_process";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { BACKEND_DIR, LOCAL_DATABASE_URL, TEST_ACCOUNTS, TEST_PASSWORD } from "./config.mjs";

const host = new URL(LOCAL_DATABASE_URL).hostname;
if (host !== "127.0.0.1") throw new Error("Refusing to run: the target is not the local database.");

console.log("1/2 Applying migrations to the LOCAL test database…");
const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: BACKEND_DIR,
  shell: true,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: LOCAL_DATABASE_URL, DB_POOL_MAX: "1" },
});
if (mig.status !== 0) {
  console.error("Migration failed. Is `npm run local:db` running?");
  process.exit(1);
}

console.log("2/2 Creating the synthetic test accounts…");
const db = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
await db.connect();
const id = () => "c" + crypto.randomBytes(12).toString("hex");
const hash = await bcrypt.hash(TEST_PASSWORD, 10);
const roleId = {};
for (const name of ["USER", "ADMIN", "SUPERADMIN"]) {
  const r = await db.query("SELECT id FROM roles WHERE name = $1", [name]);
  if (r.rows[0]) roleId[name] = r.rows[0].id;
  else { roleId[name] = id(); await db.query("INSERT INTO roles (id, name) VALUES ($1, $2)", [roleId[name], name]); }
}
for (const a of TEST_ACCOUNTS) {
  let u = (await db.query("SELECT id FROM users WHERE email = $1", [a.email])).rows[0];
  if (!u) {
    u = { id: id() };
    await db.query(
      `INSERT INTO users (id, email, first_name, last_name, password, is_email_verified, profile_completed, is_active, country, state, city)
       VALUES ($1, $2, $3, $4, $5, true, true, $6, 'India', 'Maharashtra', 'Pune')`,
      [u.id, a.email, a.first, a.last, hash, a.active],
    );
  } else {
    await db.query("UPDATE users SET password = $2, is_active = $3, is_deleted = false WHERE id = $1", [u.id, hash, a.active]);
  }
  for (const role of a.roles) {
    await db.query("INSERT INTO user_role_mapping (id, user_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (user_id, role_id) DO NOTHING", [id(), u.id, roleId[role]]);
  }
}
// A tiny, clearly labelled SAMPLE catalogue so the shop, puja and chadhawa pages have something to show locally.
// No images and no uploads (the repo's own seeds upload to Cloudinary; this script never does).
console.log("    + local sample catalogue (1 temple, 2 offerings, 1 shop product)");
const ensure = async (table, slugCol, slug, insertSql) => {
  const r = await db.query(`SELECT id FROM ${table} WHERE ${slugCol} = $1`, [slug]);
  if (r.rows[0]) return r.rows[0].id;
  const newId = id();
  await db.query(insertSql, [newId]);
  return newId;
};
const templeId = await ensure("temples", "slug", "local-sample-temple",
  `INSERT INTO temples (id, slug, name, location, state, deity, description, price_from) VALUES ($1,'local-sample-temple','Local Sample Temple (test data)','Sample City','Maharashtra','Sample Deity','Sample description for local testing only.',101)`);
for (const [name, price] of [["Sample flowers (test)", 51], ["Sample prasad (test)", 101]]) {
  const e = await db.query("SELECT id FROM chadhawas WHERE temple_id = $1 AND name = $2", [templeId, name]);
  if (!e.rows[0]) await db.query("INSERT INTO chadhawas (id, temple_id, name, description, price, is_active) VALUES ($1,$2,$3,'Local test offering',$4,true)", [id(), templeId, name, price]);
}
const catId = await ensure("shop_categories", "slug", "local-sample-category",
  `INSERT INTO shop_categories (id, name, slug, is_active) VALUES ($1,'Local sample category (test data)','local-sample-category',true)`);
await ensure("shop_products", "slug", "local-sample-product",
  `INSERT INTO shop_products (id, category_id, name, slug, price, description, benefits, authenticity, is_active) VALUES ($1,'${catId}','Local sample product (test data)','local-sample-product',499,'Sample product for local testing only.',ARRAY['Sample benefit'],'Not a real product',true)`);
await db.end();

console.log("\nTEMPORARY LOCAL TEST ACCOUNTS (exist only in your local throwaway database)");
for (const a of TEST_ACCOUNTS) console.log(`  ${a.email.padEnd(32)} ${a.note}`);
console.log(`  password for all: ${TEST_PASSWORD}`);
