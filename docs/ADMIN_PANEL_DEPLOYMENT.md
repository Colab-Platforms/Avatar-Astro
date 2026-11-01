# Admin panel and user dashboard: deployment and operations

Status: implemented and verified **locally** against throwaway databases. Nothing here has been applied to
production. Every step marked **(operator)** needs a person with production access.

## What was added

- `/admin` (main admin only) and `/dashboard` (any signed-in user) in the frontend.
- `/api/admin/*` (main admin only), `/api/me/*` (signed-in user, scoped by the verified token),
  `/api/public/content` and `/api/public/config` (public, read-only, never cached).
- Migration `backend/prisma/migrations/20261029120000_add_admin_panel/`: 4 new tables
  (`usage_events`, `admin_audit_logs`, `platform_settings`, `content_items`) and 2 enums. It is additive only:
  no existing table is changed or dropped.

## Authorization model

- Main admin = an **active** account holding the `SUPERADMIN` role. Checked on every `/api/admin` request against
  the database (signed token alone is not enough). The old `ADMIN` role opens nothing under `/api/admin`.
- Optional second lock: `MAIN_ADMIN_EMAIL`. If set, the account must also have exactly that email. An email match
  never grants access by itself.
- Deactivation: the account-status check runs on every protected API request (cached per server for
  `ACCOUNT_STATUS_TTL_MS`, default 5000 ms; the server that performs the deactivation clears its own cache at once).
  Worst case on a multi-instance deployment: one TTL window. Refresh tokens are deleted and login is refused.
- If the status cannot be read (database trouble) protected requests are refused with 503 (fail closed).
- Sensitive admin changes write an audit row **in the same database transaction** as the change.

## Environment variables (names only)

Required for the site: `DATABASE_URL`, `JWT_SECRET` (32+ characters). The server prints a loud startup warning if
either is missing and lists missing optional ones.

Used by existing features: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `SARVAM_API_KEY`,
`RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `SUPPORT_EMAIL`, `YOUTUBE_API_KEY`, `BACKEND_PUBLIC_URL`, `CORS_ORIGIN`,
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GOOGLE_CLIENT_ID`, `MSG91_*`.

New and optional: `MAIN_ADMIN_EMAIL`, `ACCOUNT_STATUS_TTL_MS`, `DARSHAN_WEBSUB_SECRET` (signs YouTube WebSub
notifications; when set, unsigned or forged webhook calls get 403), `DB_POOL_MAX` (tests only).

## Order of operations for a deployment

1. **(operator)** Take a Neon backup / branch snapshot. Confirm you are looking at the intended Neon project.
2. **(operator)** Apply the migration deliberately, from `backend/`, with the production `DATABASE_URL` in your shell:
   `npm run db:deploy` (= `prisma migrate deploy`). Until it runs, public pages keep working (they fail open) and
   the new panel/dashboard endpoints answer 503 "Not available until the latest database migration has been applied".
   Add the same command to the Render build or pre-deploy step so it cannot be forgotten.
3. **(operator)** Create the main admin from an existing, active account (sign up normally first):
   `npm run db:make-superadmin -- owner@example.com --confirm-host=<database-host>`.
   The script prints only the target host name, refuses a remote host unless you retype it, never creates accounts,
   and only adds one role mapping. Sign out and in again afterwards.
4. **(operator)** Set the environment variables above on Render, then deploy the backend from
   `Colab-Platforms/Avatar-Astro` branch `main`, root `backend`.
   Build: `npm install && npm run build` (runs `prisma generate`, `tsc`, `tsc-alias`). Start: `npm start`.
5. Deploy the frontend (Vercel) from the same commit so both sides match.
6. Verify (see the checklist in the final report): `/api/health`, `/api/public/config`, sign in as the main admin,
   open `/admin`, try `/admin` as a normal user (must redirect), toggle one feature and back.

## Recovery if the only main admin is locked out

There is deliberately no HTTP endpoint for this. An operator with database access re-runs step 3 for a
different (or the same, reactivated) account. If the account itself was deactivated, reactivate it in the database
first (`is_active = true`); the script refuses inactive accounts.

## Known limits

- Usage history starts at deployment of this version; earlier activity was never recorded.
- Access tokens are stateless and last 1 day. Deactivation is enforced by the status check above; merely signing out
  in a browser does not invalidate a copied token.
- Not implemented (no data source exists): orders, bookings, payments, plans, general editable settings.
- Karma Score history, saved shlokas and AI Guru chats live only in the user's browser.

## Second migration

20261030120000_add_activity_tracking adds two columns (event_type default feature.request, metadata) and two indexes to usage_events. It is additive: existing rows stay valid. Apply the migrations with npm run db:deploy, as before.

20261031120000_add_ai_cost_tracking adds nine NULLABLE columns (ai_provider, ai_model, ai_calls, input_tokens, output_tokens, total_tokens, cost_usd, cost_basis, served_from_cache default false) and one index to usage_events. It is additive: nothing is rewritten and existing rows keep NULL (old activity is never back-filled with invented costs). It has been applied and tested only on the LOCAL test database, NOT on Neon. That makes three migrations pending for production (a fourth, 20261101120000_add_user_library, adds four tables for the user dashboard). Optional env vars: AI_PRICING_JSON (USD per 1M tokens, needed for any cost estimate on providers that do not report cost), USD_TO_INR_RATE (display only), OPENROUTER_MANAGEMENT_KEY (account-level OpenRouter credits), AI_USAGE_ACCOUNTING=off (disable capture).

20261102120000_add_account_management adds two nullable columns to users (created_by_id, deleted_by_id) and one nullable JSONB column to admin_audit_logs (metadata). It is additive and has been applied and tested only on the LOCAL test database, NOT on Neon. Five migrations are now pending for production (admin panel, activity tracking, AI cost tracking, user library, account management). Apply with npm run db:deploy from backend/ with the production DATABASE_URL, deliberately and after a backup.
