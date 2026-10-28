# Admin and Operations Guide

Back to [README](README.md). Describes what the **code** provides for administrators and operators. Nothing here was exercised against a running system; production hosting, monitoring and backups are **[UNKNOWN]** and are listed as gaps, not described as existing.

## 1. Admin console

### 1.1 Access
* URL `/admin` (separate route group in `App.tsx`, wrapped by `AdminRoute`). Unauthenticated → `/login`; authenticated non-admin → `/`.
* Real enforcement is server-side: every `/api/admin/*` call passes `auth("ADMIN")` (token role, hierarchy ADMIN ⊂ SUPERADMIN). The dashboard additionally re-reads the user from the DB (`isActive`, `isDeleted`, roles).
* There is **no UI or API to grant roles**; see [DATABASE_AND_MIGRATION_GUIDE.md §4.4](DATABASE_AND_MIGRATION_GUIDE.md). Roles in a token can be up to 1 day stale (a demoted admin keeps API access until the access token expires; there is no revocation list).
* SUPERADMIN has no extra features anywhere in the code beyond passing `auth("ADMIN")`.

### 1.2 Screens and what each action does

| Route | Component | Capabilities | API (all `/api/admin/…`) |
|---|---|---|---|
| `/admin` | `features/admin/pages/Dashboard` | shows signed-in admin identity only | `GET /dashboard` |
| `/admin/puja` | `pages/Puja` + `TempleFormDialog`, `TempleImagesDialog`, `TemplePujasDialog`, `PujaFormDialog`, `GradientPicker` | list/search/paginate temples; create/edit/delete temple; upload (≤10 × ≤10 MB) and delete images; create/edit/delete pujas | `/puja/temples…`, `/puja/images/:id`, `/puja/pujas/:id` |
| `/admin/chadhawa` | `pages/Chadhawa` + `ChadhawaFormDialog` | list with filters (temple, search, active, sort); create/edit/delete offerings; set emoji, price, order, active | `/chadhawa…` |
| `/admin/shop/categories` | `pages/ShopCategories` + `CategoryFormDialog` | CRUD, image upload, activate/deactivate; delete blocked while products exist | `/shop/categories…` |
| `/admin/shop/products` | `pages/ShopProducts` + `ProductFormDialog` | CRUD, image upload, price/original price, benefits, authenticity text, gradient | `/shop/products…` |

Rules and limits enforced: [BUSINESS_RULES_AND_FORMULAS.md §8](BUSINESS_RULES_AND_FORMULAS.md). Endpoint list: [BACKEND_API_REFERENCE.md §2.3](BACKEND_API_REFERENCE.md).

### 1.3 What admins **cannot** do (no code exists)
Manage users/roles; view orders, bookings, donations, prayers, contact messages or newsletter signups (none are stored); edit Live Darshan channels (only seed + `temples.json`); edit blog or static content; view audit logs; moderate AI output; configure feature flags.

### 1.4 Admin editing caveats
* Changing a temple **slug** does not move Cloudinary assets (folder `puja/temples/<slug>`).
* `priceFrom` on a temple is typed by hand and is not recomputed from puja prices.
* Deleting a temple cascades to pujas, images and chadhawas; remote images are deleted first and failures are returned as `orphanedImages` (clean them manually in Cloudinary).
* No optimistic-lock/versioning: concurrent edits overwrite each other.
* Slug/name uniqueness is checked read-then-write; a race can produce a DB error that may surface as a 500.

## 2. Operating the backend

### 2.1 Process model
Single Node process. Besides HTTP it runs **in-process timers** started in `startServer()`: WebSub renewal (every 3 days) and the stale-live poll (default every 120 s). Consequences: run exactly **one** instance; restarts re-subscribe immediately; hosts that sleep idle processes (free tiers) will stop push delivery and polling; horizontal scaling breaks SSE fan-out (EventEmitter is per-process).

### 2.2 Configuration checklist for a production-like deploy
`DATABASE_URL`, strong `JWT_SECRET`, `CORS_ORIGIN` (exact frontend origin), `FRONTEND_URL`, `RESEND_API_KEY` + `SMTP_FROM_EMAIL` (verified sender), `GOOGLE_CLIENT_ID`, MSG91 trio, `OPENROUTER_API_KEY`, `SARVAM_API_KEY`, Cloudinary trio, `YOUTUBE_API_KEY`, `BACKEND_PUBLIC_URL` (HTTPS, reachable from Google). Then: `npm run db:deploy`, `npm run db:seed` (roles), `npm run db:seed:darshan`, optionally content seeds, promote the first admin.

### 2.3 Health and monitoring
* `GET /api/health` returns a static success (does not check the DB or providers).
* Logging is `console.log/warn/error` only: no request log, no correlation IDs, no structured logs, no error reporter. Some logs include provider response bodies; OTP-send failures are logged but not surfaced.
* Useful log prefixes: `[darshan]` (subscribe/renew/stream state), `[Sarvam TTS]`, `Birth chart analyze error`, `OpenRouter … Error`, `✗ CORS rejected origin`.
* No metrics, alerts, uptime checks, or quotas dashboards exist in the repo.

### 2.4 Runbooks

| Symptom | Likely cause (from code) | Action |
|---|---|---|
| Nobody can register: 500 "run db:seed first" | `roles` empty | `npm run db:seed` |
| OTP emails never arrive but API says sent | Resend failure is caught and logged | check Resend key/domain and server logs; consider surfacing failures |
| Password reset link goes to wrong host | `FRONTEND_URL` default | set it |
| Temple shows Offline while live | no `YOUTUBE_API_KEY`; not subscribed (no channel ID or `BACKEND_PUBLIC_URL` unset/unreachable); stream was already live before subscribe; embedding disabled | set keys; check `[darshan]` logs; wait for next webhook or manually set row via SQL; verify channel ID |
| Temple stuck Live after stream ended | poll disabled (no key), process asleep, or video id still `live` | check interval/log; `UPDATE darshan_channels SET is_live=false, current_live_video_id=NULL WHERE slug='…'` |
| Temple flips Offline unexpectedly | any non-live upload on the channel triggers `markOffline` (known defect) | see [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md) |
| WebSub verification fails | callback URL not public HTTPS, or proxy strips query | check `BACKEND_PUBLIC_URL`, `GET …/websub/callback` echoes `hub.challenge` |
| YouTube quota exhausted | forged/spammed webhook POSTs or many live channels | rotate key, restrict, add signature check |
| AI pages return errors | missing/invalid `OPENROUTER_API_KEY`, retired model slug, credits (402), free-tier limit (429) | check key/credits; change model constant in route file |
| AI/TTS bill spike | public unauthenticated endpoints; Groq key in bundle | rotate keys; add auth + rate limits; see [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md) |
| Admin image upload fails | Cloudinary key lacks `create` permission or wrong cloud | code maps 401/403 to actionable messages |
| Login works but admin shows redirect | role not in token | grant role, log out/in |
| Users cannot re-register with a phone/email | abandoned unverified account holds the unique value | login/verify, or delete the row |

### 2.5 Secrets
* Names are in [INTEGRATIONS_AND_ENVIRONMENT.md](INTEGRATIONS_AND_ENVIRONMENT.md). Rotate any key that was shared in chat, committed historically, or bundled (the Groq key is by design public in the JS bundle).
* `frontend/.env.production`/`.env.development` were removed in recent commits (contents remain in git history; they held only `VITE_API_URL` per earlier notes — verify before assuming).
* Local `backend/.env` also contains stale `MONGODB_*` keys — delete them.

### 2.6 Backups and data-protection
No backup, retention, export or deletion tooling exists. Personal data stored: users (name, email, phone, DOB, location, bcrypt hash, Google id), sessions, OTP hashes. No account-deletion path (`isDeleted` is never written). Inner Voice data lives in each visitor's browser only. Obligations (consent, privacy policy, DPDP/GDPR) are product/legal decisions — see [PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md).

## 3. Release and change management (as found)

* Branches: `main`, `dev-vishwa` (current), `origin/youtube-darshan` (merged via PR #1). 76 commits total.
* No CI, no Dockerfile, no deployment scripts, no environments file. Frontend `vercel.json` only sets build/output and an SPA rewrite.
* Before releasing: run both `tsc` checks, fix the 40 frontend type errors or decide to ignore, add real tests, then follow [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md).

## 4. Recommended operations backlog (not implemented)
Rate limiting + helmet; request logging with request id; real `/health` (DB ping); purge job; audit log for admin writes; role-management screen; a flag to disable public AI endpoints; WebSub signature verification; startup sweep of live status; alerting on provider errors. Prioritisation: [RESTART_ROADMAP.md](RESTART_ROADMAP.md).
