# Disposable PostgreSQL test database

Integration tests that touch money run against a **real PostgreSQL 17** in Docker — real transactions, real row locks,
real CHECK constraints and partial unique indexes. Nothing is mocked, and nothing here can reach Neon or Render.

```bash
cd backend
npm run test:db:up       # start postgres:17-alpine, bound to 127.0.0.1:54329 only
npm run test:db:init     # `prisma db push` + the SQL objects db push cannot express
npm run test:db:verify   # read-only check: constraints/indexes/triggers/functions/views == the real database's catalog
npm run test:db:run      # wallet, chat, free-allowance, tool-billing, financial regression and security suites
npm run test:db:run -- src/__tests__/financial/chatSettlement.node-test.ts   # one file
npm run test:db:down     # remove the container and its data
```

## Safety

Everything goes through `assertSafeTestDatabase()` (`config.mjs`). It refuses unless the URL is exactly
`127.0.0.1`/`localhost`, port **54329**, database **mybhagya_test**, contains no cloud-provider hostname, and is not the
target configured in `backend/.env`. The test suites independently skip themselves unless `TEST_DATABASE_URL` passes the
same check. `verify.mjs` opens the real database in a `READ ONLY` transaction and queries catalog views only.

## Why `db push` + a SQL file

This project builds its schema with `prisma db push` (the migration history cannot create a fresh database — the astrologer
tables were never in a migration). Postgres features Prisma's schema language cannot express — 14 CHECK constraints and the
partial unique indexes — live in `prisma/sql/custom_db_objects.sql` and `prisma/sql/astrologer_partial_indexes.sql`, which
`init.mjs` applies after the push. `verify.mjs` proves they match production.

## Test structure

`src/__tests__/financial/` — Checkpoint 1 regression suites. Time is **simulated** (billing functions take an explicit `now`,
heartbeats take an explicit timestamp), so a 10-minute chat runs in milliseconds; `realClock.node-test.ts` is the one suite
that uses real timers (~25 s). Files run serially (`--test-concurrency=1`) because they share one database.
