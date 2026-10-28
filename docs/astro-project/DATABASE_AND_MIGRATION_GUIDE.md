# Database and Migration Guide

Back to [README](README.md). Model reference: [DATABASE_AND_DATA_MODELS.md](DATABASE_AND_DATA_MODELS.md). This guide covers **how to operate** the schema. No migration, seed or database command was executed while writing it; production schema state is **[UNKNOWN]** — never infer it from the files below.

## 1. Setup facts

| Item | Value (from source) |
|---|---|
| Engine | PostgreSQL (Prisma `provider = "postgresql"`) |
| ORM | Prisma 7.9 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) |
| Client | `backend/prisma.ts`: `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`; default export `prisma` (also named `prisma`) |
| Schema location | `backend/prisma/schema/*.prisma` — multi-file (`schema.prisma` generator+datasource; `auth`, `temple`, `shop`, `darshan`) |
| Datasource URL | **not in the schema file** — supplied by `backend/prisma.config.ts` (`datasource.url = process.env["DATABASE_URL"]`, `schema: "prisma/schema"`, `migrations.path: "prisma/migrations"`) |
| Generator | `prisma-client-js`, default output (into `node_modules`); `prebuild` runs `prisma generate` |
| Env | `DATABASE_URL` only |
| Migrations lock | `prisma/migrations/migration_lock.toml` (postgresql) |

## 2. Migration history

| # | Directory | Creates |
|---|---|---|
| 1 | `20260804061833_init_auth` | enums `AuthProvider(LOCAL,GOOGLE)`, `OtpType(REGISTER,LOGIN)`; tables `users`, `otp_verifications`, `password_reset_tokens`, `roles`, `user_role_mapping`, `sessions`; unique indexes on phone, email, google_id, token, role name, (user, role) |
| 2 | `20260810103538_add_puja_schema` | `temples` (unique slug), `temple_images`, `pujas` (+ FKs, indexes) |
| 3 | `20260811054543_added_chadhawa_model` | `chadhawas` (+ indexes on temple, (temple,is_active), display_order) |
| 4 | `20260812063637_implement_shop` | `shop_categories` (unique name, slug), `shop_products` (unique slug, FK category, indexes) |
| 5 | `20261015115200_add_darshan_channel` | `darshan_channels` (unique slug; indexes on channel id and is_live) |

Total after all migrations: 13 tables, 2 enums. Dates look like they use a 2026 calendar; compare with `_prisma_migrations` in each environment before applying anything.

Observations to act on (recommendations, not done):

* No index on `sessions.refresh_token`, yet refresh looks sessions up by that column.
* `password_reset_tokens.token` is plaintext (see [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md)).
* Chadhawa name uniqueness per temple exists only in application code (no unique index on `(temple_id, name)`).
* No retention/purge job for `otp_verifications`, `password_reset_tokens`, `sessions`.

## 3. Seeds

| Command (in `backend/`) | File | Behaviour | Prerequisites |
|---|---|---|---|
| `npm run db:seed` | `prisma/seeds/index.ts` | upserts roles `USER`, `ADMIN`, `SUPERADMIN` | migrated DB. **Mandatory before registration** (register fails with 500 "run db:seed first") |
| `npm run db:seed:puja` | `pujaTemples.ts` | upserts temples by slug, **replaces pujas wholesale**, uploads images to Cloudinary only for temples without images. Flags: `--skip-images`, `--reset` (deletes the seeded temples first) | Cloudinary env unless `--skip-images`; data are copied from the former `frontend/src/data/temples.ts` |
| `npm run db:seed:chadhawa` | `chadhawaOfferings.ts` | offerings for seeded temples | puja seed first (needs temples) [order inferred from FK] |
| `npm run db:seed:shop` | `shopProducts.ts` | categories + products | Cloudinary for images [not audited] |
| `npm run db:seed:darshan` | `darshanChannels.ts` | upsert `darshan_channels` by slug from `src/config/temples.json` (18 rows, 4 with empty `youtubeChannelId`) | migration 5 |
| *(no npm script)* `npx tsx prisma/seeds/makeadmin.ts` | `makeadmin.ts` | grants ADMIN to a **hard-coded email constant** inside the file; user must already exist; imports `../../prisma` without `.js` unlike the others | edit the constant first; roles seeded |

`--reset` on the puja seed deletes data (cascade to pujas/images/chadhawas) — never run it against production.

## 4. Standard procedures

### 4.1 New developer database
```
createdb avatar_astro            # or any managed Postgres
# backend/.env : DATABASE_URL=postgresql://USER:PASS@HOST:5432/avatar_astro   (placeholder; never commit)
cd backend
npm install
npm run db:generate
npm run db:migrate               # prisma migrate dev  — applies all 5 migrations
npm run db:seed                  # roles
npm run db:seed:puja -- --skip-images
npm run db:seed:chadhawa
npm run db:seed:shop             # check the file for Cloudinary needs first
npm run db:seed:darshan
```

### 4.2 Existing/production database
Use `npm run db:deploy` (`prisma migrate deploy`) only. Before the first run on an environment whose history is unknown, run `npx prisma migrate status` and compare; if the schema was created outside Prisma, baseline with `prisma migrate resolve --applied <name>` rather than re-running SQL. Take a backup first.

### 4.3 Changing the schema
1. Edit the relevant `prisma/schema/*.prisma`.
2. `npm run db:migrate -- --name <what_changed>` on a development DB; review the generated SQL.
3. Commit schema + migration folder together.
4. Deploy with `db:deploy`. Destructive changes (drop/rename) need a two-step expand/contract plan.

### 4.4 Promoting an admin
There is no UI or API for user-role management. Options: (a) edit `makeadmin.ts`'s email constant and run it; (b) insert into `user_role_mapping` for the user id and the `roles.id` of `ADMIN`. Role is baked into the access token, so the user must log in again (or wait ≤ 1 day) for it to apply.

### 4.5 Housekeeping SQL (recommendations — review before use)
```sql
-- expired/used OTPs
DELETE FROM otp_verifications WHERE expires_at < now() - interval '1 day';
-- expired/used reset tokens
DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' OR used;
-- expired sessions
DELETE FROM sessions WHERE expires_at < now();
```
Column names are snake_case as in the migrations (`expires_at`, `used`); confirm against your DB.

## 5. Data lifecycle summary

| Data | Created | Updated | Deleted |
|---|---|---|---|
| user | register / Google | verify, profile, reset password | **never** (no delete/deactivate path; `isDeleted/isActive` only read) |
| session | login, refresh | – | refresh rotation, logout, logout-all, expired-on-use |
| otp / reset token | requested | `used=true` | never purged |
| temple / puja / image | admin | admin | admin (images: Cloudinary first) |
| chadhawa, shop rows | admin | admin | admin (category delete restricted) |
| darshan_channel | seed | webhook + poll (`isLive`, `currentLiveVideoId`, `lastCheckedAt`) | never |

## 6. Known inconsistencies and risks

See [DATABASE_AND_DATA_MODELS.md §8](DATABASE_AND_DATA_MODELS.md) for the full list. Operational highlights: Cloudinary↔DB non-atomic; read-then-write uniqueness races; abandoned unverified users keep reserving email/phone; three independent slug sets (Darshan config, frontend `liveStreams.ts`, catalogue tables).

## 7. What cannot be verified from the repo

Production schema/migration state, row counts, indexes added manually, backups, connection limits, SSL requirements, managed-provider choice.
