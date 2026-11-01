# Admin panel and dashboard: what is complete and what is not

Honest status as of the last verification. "Local" means verified in a real browser and by automated tests against a
throwaway local database; nothing here has been verified against production.

## Complete (local)

Overview, Users, Astrology Tools (feature switches), Content & Banners (with draft preview), Reports (+CSV),
Settings & Audit Logs (read-only settings, audit log), plus the user dashboard (Home, My Astrology, My Inner Voice,
Devotion & Live, Profile & Settings).

## Partial

| Item | State | What is needed to finish |
|---|---|---|
| Independent switches for AI Guru / Know Your Karma / Sacred Shloka | One shared switch (`ai-chat`) because all three call the same generic `/api/ai/chat` endpoint | Separate endpoints (or a server-side feature tag the client cannot choose) per feature. A client-supplied tag would only look like enforcement |
| Inner Voice admin | Real usage and errors only | Server-side history does not exist; Karma Score, saved shlokas and AI Guru chats live in each user's browser |
| Devotion & Live admin | Live channel status (read-only) and catalogue counts | Bookings do not exist (see below) |
| Integrations | Configured / not configured, masked keys, real failure counts | Live provider test calls, which need credentials and have a cost |

## Not implemented (no data source exists)

| Feature | Why it cannot be finished by a code change alone |
|---|---|
| Shop cart, checkout, orders | There is no cart, order or inventory model. Needs a data model, business rules (stock, shipping, tax, cancellations) and a payment provider. Buttons are disabled with an honest note |
| Puja / chadhawa booking and "Proceed to Offer" | No booking model, no payment, no fulfilment workflow. Buttons are disabled with an honest note |
| Payments, plans, payment verification | No payment provider integrated. Needs provider account, server-side webhook with signature verification and idempotency, order linkage, refund policy |
| Darshan "Notify me when live" | No subscriber store and no notification channel. Button is disabled |
| General editable settings | The only settings are the feature switches. Needs product decisions about which settings should exist |
| Donations | No payment provider. Button is disabled |
| Account-level wishlist | Wishlist is now saved in the browser only (localStorage); an account wishlist needs a server model |

## Changed in this pass (to stop showing invented data)

- The Darshan "Prayer Wall" no longer starts with six fabricated prayers from invented devotees. It starts empty and says
  that prayers stay on the device. (They are still not shared or stored on the server.)
- The invented "N watching" viewer counts are removed from every Live Darshan / Family / Avatar Live page.
- Not changed, but worth knowing: the `/avatar-live` pages are built from static data in `frontend/src/data/liveStreams.ts`,
  including static "live" flags. Real live status exists only on the Darshan pages that use the API.

## Known limits (security)

- Access tokens are stateless and last 1 day. A deactivated account is refused immediately on the server that processed
  the deactivation, and within `ACCOUNT_STATUS_TTL_MS` (default 5 s) on other instances. Signing out in a browser does
  not invalidate a copied token.
- CORS: the backend allows any `localhost` / private-LAN origin in addition to the configured production origin. This is
  convenient for developing against a deployed backend but widens the allowed origins in production; tokens travel in
  headers (not cookies), so it is low risk. Restricting it would break local frontend development against the Render
  backend, so it was left for a decision. A refused origin now gets a 403 (it used to get a 500).

## Activity tracking (added with migration 20261030120000_add_activity_tracking)

One table (usage_events) records everything: feature.request (API calls and their result), feature.opened (a signed-in visitor opened a tool page, NOT proof it was used), auth.register, auth.login (method), auth.login_failed (reason), profile.updated (field names only). Metadata is sanitised (no tokens, passwords, keys, message content). Not tracked because there is nothing to track: saved/removed items (browser-only), orders, bookings, payments. AI Guru, Know Your Karma and Sacred Shloka share one API, so they appear together as ai-chat.

## AI cost tracking and provider balance (migration 20261031120000_add_ai_cost_tracking)

- Each feature request gets ONE usage_events row. If an AI provider was called, the row also stores provider, model, number of provider calls, input/output/total tokens, cost in USD and its basis. Capture wraps global fetch and the default axios instance once (utils/aiUsageCapture.ts), so route files are unchanged. Only response metadata is read; prompts and answers are never stored.
- Cost basis: "actual" = OpenRouter usage.cost (the capture adds usage: {include: true} to OpenRouter chat requests); "estimated" = tokens x a price from AI_PRICING_JSON. No built-in prices exist. No price or no token count means cost is NULL ("Not known"), never 0. A request with several provider calls is summed into one row; it is "actual" only if every costed call was actual.
- Non-AI requests, HTTP 304 and answers marked served-from-cache carry no AI cost. Failed requests keep only a cost the provider actually reported. Old rows stay NULL.
- Views: Customer activity (Provider / Model and Cost columns, provider and cost-type filters, row detail), Reports (Feature cost analytics, cost CSV), AI & integrations (Provider balance). All SUPERADMIN-only.
- Provider balance (official APIs only; page loads read a saved check, only Refresh contacts providers, at most once a minute): OpenRouter GET /api/v1/key gives key-level usage and remaining limit (works with the normal key; verified live read-only on the local stack); GET /api/v1/credits gives account credits but needs a separate management key (OPENROUTER_MANAGEMENT_KEY, not tested live). Groq: no balance API, key verified via GET /models. Sarvam: no balance API and no safe verification call; shown as key set, not verifiable. Balances are never derived from our own cost records.
- Limits: Groq and Sarvam costs are only estimated if you configure prices; Sarvam text-to-speech reports no tokens (counted as a call, cost not known); only fetch and axios calls to openrouter.ai, api.groq.com, api.sarvam.ai and generativelanguage.googleapis.com are captured (google responses are only counted if they use the chat-completions shape).

### Troubleshooting: Provider / Model and Cost show a dash
A dash means no AI provider call was recorded for that request. Verified causes, in order of likelihood:
1. The request failed before reaching a provider, for example the provider key is not set on THAT server (local test mode switches every provider off on purpose, so every AI request returns 503/500 and has no usage).
2. The backend process is older than this change. `npm run local:backend` does not auto-reload and a stale or orphaned process can keep serving the port; an old process records activity with no AI usage. Restart it.
3. The request was cached or answered with HTTP 304, or happened before tracking began (old rows are never back-filled).
Check AI & integrations > "AI usage capture status" (backend `GET /api/admin/costs/diagnostics`): it shows whether capture is installed, which provider keys this server has, and per feature how many requests had AI usage. Set `AI_USAGE_DEBUG=1` to also log one safe line per provider call (flags only, never prompts, keys or user content).
End-to-end proof: `npm run test:pipeline` starts the real server with a stubbed provider network and checks provider, model, tokens, cost, customer attribution and the Admin API for every AI route.

### Why an old request shows no cost (verified on a real case)
Costs are recorded from the moment the capture code runs on the server that handles the request. A request handled earlier, or by a server running older code, has no AI data and is never back-filled. In one investigation the only AI request in the shared database (a tarot reading) was made 24 minutes BEFORE the capture code existed, so it correctly has no cost. OpenRouter itself showed the matching spend on its side (usage_daily), which confirms the call was real. Make a new AI request and check AI & integrations > "AI usage capture status".
OpenRouter models: most OpenRouter features use `google/gemma-4-31b-it:free`, a free-tier model: OpenRouter reports cost 0 for it, shown as an actual $0 (the provider said so), not as "missing". When a response has tokens but no `usage.cost`, the cost is estimated from OpenRouter's public model price list and labelled Estimated; `AI_OPENROUTER_PRICING=off` disables that lookup. Palm reading requests `anthropic/claude-3.5-sonnet`, which is no longer in OpenRouter's model list, so that feature fails before any usage exists.

### Gemstone calculator: attribution and cost
- The gemstone endpoints are PUBLIC on purpose and stay public. Only `POST /calculate` calls an AI provider (Groq, default model `llama-3.3-70b-versatile`, or `GROQ_MODEL`); `/locations`, `/products/:stone` and `/kundali` are ordinary requests and carry no provider, model or cost.
- Signed-in visitors used to appear as "Not signed in" because the frontend called these endpoints with `skipAuth` (no token) and the routes had no auth middleware, so the server never knew who called. Now the frontend sends the token when one exists (`sendTokenIfPresent`: no refresh, no sign-out on 401) and the route group runs `optionalAuth()`, which only identifies the caller for attribution. A missing, bad, expired, forged or deactivated-account token leaves the request anonymous and never blocks it. Visitors whose access token has expired are recorded as anonymous until their next authenticated call refreshes it.
- Groq has no cost field, so a gemstone cost appears only when `AI_PRICING_JSON` has an entry for the exact model (for example `groq:llama-3.3-70b-versatile`) with rates you have confirmed on Groq's pricing page. Without it, tokens are shown and cost is "Not known".

## User dashboard: personal library (migration 20261101120000_add_user_library)

**Sections** (`/dashboard`): Overview, My Readings, My Activity, Saved, My Conversations, My Bookings, My Orders, Profile & Settings.

**How it works.** `captureReadings()` (mounted once in `index.ts`) wraps `res.json` for the AI routes listed in `modules/library/readingSpecs.ts`. After a successful (2xx) response where an AI provider call succeeded, it saves the ORIGINAL output to the signed-in user's account, then sends the response with headers `X-Reading-Id` / `X-Conversation-Id` and `X-Reading-Saved: true|false`. A failed save is reported as `false`; the result is still delivered. Anonymous requests, errors and canned fallbacks are never saved. Reopening a reading reads the stored JSON: no provider call. A retry carrying the same `X-Client-Request-Id` is saved once.

**Persistence coverage**
| Feature | Saved | Notes |
|---|---|---|
| Tarot, daily horoscope, zodiac compatibility, chart interpretation, birth chart analysis, relationship compatibility, name analysis, palm reading | yes | server-side, at generation time |
| Gemstone (Ratna Jyotish) | yes | the calculation is kept even when the explanation text is rules-based |
| Karma, Sacred Shloka, AI Guru diagnosis report (Groq proxy) | yes | the client labels the call (`library.feature`); saved content is the provider reply, and only if it parses as JSON |
| Inner Voice diagnose / wisdom / journal / life path | yes | |
| AI Guru chat, Inner Voice guru chat | yes, as conversations | AI Guru can be continued from the dashboard; Inner Voice is read-only |
| Karma Score history, browser-saved shlokas (localStorage) | no | not migrated: the data lives only in each browser and cannot be read by the server |
| Bookings, Orders | n/a | there is no booking or checkout system, so the pages say so instead of inventing records |

**API (all under `/api/me`, `auth("USER")`, identity only from the token):** `GET /overview`, `GET /readings`, `GET|DELETE /readings/:id`, `POST /readings/:id/save`, `GET /conversations`, `GET|DELETE /conversations/:id`, `GET /activity` (cursor paging), `GET /bookings`, `GET /orders`. Another user's id returns 404, same as a missing one.

**Tables (additive):** `generated_readings`, `conversations`, `conversation_messages`, `user_activity_events`. Activity rows hold only the event kind, feature, a safe title and a link; never message text. Clearing activity also removes the user link from AI cost rows (kept for admin spend reports, no content).

**Production:** four pending migrations now (admin panel, activity tracking, AI cost tracking, user library). Applied and tested on the LOCAL database only.

**Limits:** saved readings are shown with a generic renderer of the original JSON (not each feature's custom page). No notification preferences exist (nothing is sent) and there is no self-service account deletion (email support). Tests: `npm run test:library` (real server, two users).


## Customer and administrator account management (migration 20261102120000_add_account_management)

Customers and administrators are now two separate sections of the Admin Panel. Everything below is main-admin (SUPERADMIN) only and is re-checked against the database on every call.

**Navigation:** Customer management (Customers, Customer activity, Customer readings / library) and Administration (Admin management, Admin activity / audit). `/admin/users` redirects to `/admin/customers`. Other sections are unchanged.

**Separation:** a customer is a live user with NO ADMIN/SUPERADMIN/SUPER_ADMIN role; an administrator is a live user with one of them. `/api/admin/customers*` never returns or accepts an administrator (404), `/api/admin/admins*` never returns a customer. The Overview and analytics user counts are now customer-only, so they equal the Customers total.

| Action | Customers | Admins |
|---|---|---|
| List / view / search / filter | SUPERADMIN | SUPERADMIN (role, status, sign-in, verification filters; real statistics) |
| Create | SUPERADMIN, role is always USER (a role in the payload is refused with 403) | SUPERADMIN, role ADMIN or SUPERADMIN from a server allow-list |
| Edit name / phone / email | SUPERADMIN | SUPERADMIN (own email is changed from the profile, not here) |
| Change role | never | SUPERADMIN, not for oneself, not away from the last active SUPERADMIN |
| Reset password (emailed one-time link, or set directly) | SUPERADMIN | SUPERADMIN, not for oneself |
| Deactivate / reactivate | SUPERADMIN | SUPERADMIN, not oneself, not the last active SUPERADMIN |
| Delete | SUPERADMIN, typed-email confirmation | same, not oneself, not the last active SUPERADMIN |
| Any of the above as ADMIN or USER | 403 | 403 |

**Endpoints** (all under `/api/admin`): `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`, `PATCH /customers/:id/status`, `POST /customers/:id/password`, `POST /customers/:id/password-reset-link`; the same set under `/admins`; `GET /customer-library` (counts and metadata only, never reading text or messages); `GET /audit-logs?actionPrefix=admin.` (or `customer.`).

**Passwords:** hashed with the existing bcrypt helper, same strength rule as sign-up (8-72 chars, upper, lower, digit), confirmation required, never returned, logged or stored in audit rows. Detail views show only "set / none (Google)". A directly set password and an email change end every refresh session; deactivation and deletion also invalidate the access token immediately (account-status cache). A role change or password change does NOT revoke an access token already issued (1 day lifetime).

**Email verification:** accounts created from the panel are never marked verified. The person signs in on the normal page and completes the existing email-code step (needs email configured). Changing an email or phone marks it unverified; Google-linked accounts cannot change their email here.

**Deletion (soft):** the row stays as an anonymous tombstone (`is_deleted`, `deleted_at`, `deleted_by_id`, email `deleted-<id>@deleted.invalid`, name/phone/password/profile erased). Sessions, OTPs, reset tokens, saved readings, conversations and the personal activity timeline are deleted; usage and AI-cost rows are kept with the user link removed; audit rows are kept. The email can be registered again.

**Last-SUPERADMIN safeguard:** checked inside the transaction after a database advisory lock, so two SUPERADMINs acting on each other at the same moment cannot both succeed (covered by a concurrency test).

**Schema:** `users.created_by_id`, `users.deleted_by_id`, `admin_audit_logs.metadata` (all nullable, additive). Applied to the LOCAL database only; this is the fifth migration pending for production.

**Audit actions:** `customer.` / `admin.` + create, update, role_change, deactivate, reactivate, password_reset, password_reset_link, delete. Metadata holds field names or role from/to only.

**Verified:** backend accounts 15, admin 45, library 9, cost 24, pipeline 15, capture 13, ai 47, tarot 28, inquiry 11, websub 4, gemstone 159; frontend 311; browser E2E 94 checks (1440 / 768 / 390 px, real sign-in); production build OK.

**Limits:** MAIN_ADMIN_EMAIL, when set, still restricts the whole panel to that one SUPERADMIN; there is no "force password change at next sign-in"; Google sign-in and email delivery were not exercised locally; admin-set passwords must be shared by the operator.
