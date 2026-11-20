# Bhagya QA audit: status report (partial)

Target: https://www.mybhagya.in (frontend) and the Render API. Tested by Claude Code, read-only against production.

## 1. Executive summary
The public site and API security surface were tested and held up: no defects found in what was executed. The money paths (registration, OTP, profile, AI tools, wallet recharge, subscription, admin modules) were reviewed in code but **not executed end to end**, because that needs a test account and sandbox payments that were not approved. **This is not a full launch-readiness sign-off.**

## 2. Feature inventory (from src/App.tsx and backend routes)
Public: home, about, contact, FAQ, blog, horoscopes, zodiac, astrologers (+profile), shop, puja, chadhawa, Avatar Live (darshan, family), devotion (books, mantras), birth chart, compatibility, tarot, palm reading, baby name, name destiny, lucky vehicle number, muhurat, gemstone calculator / Ratna Jyotish, Inner Voice (chat, journal, wisdom, future path, dashboard), solar system, auth (login, register, OTP, forgot/reset, Google).
Signed in: dashboard (wallet, chats, library, readings), astrologer dashboard and application, chat sessions.
Admin: overview, customers, activity, customer library, admins, reports, astrology tools, tool pricing, billing failures, payments, astrology audio, inner voice, chat escalations, astrologers, devotion, shop, settings.
Backend: Razorpay orders, confirm, webhook, reconciliation sweep, wallet ledger and reservations, OpenRouter AI with model fallback.

## 3. Results (executed)
| Suite | Cases | Passed | Failed |
|---|---|---|---|
| API security and auth probes (production API) | 39 | 39 | 0 |
| Public pages x desktop/tablet/mobile (render, console errors, failed requests, broken images, overflow) + 404 page | 108 | 108 | 0 |
| Login/register/forgot form validation x 3 viewports | 15 | 15 | 0 |
| Frontend unit tests (vitest) | 1259 | 1253 | 4 (2 are load timeouts that pass alone; 2 real, low severity: QA-001/002) |
Total Playwright cases: 162 passed, 0 failed. Re-running the Karma tests alone: passed.

## 4. Payment and wallet
Code review only (payment.service.ts): order created before gateway call; confirm verifies HMAC signature, order ownership and id match, re-fetches the payment from Razorpay (amount, INR, captured); credit is atomic with row lock and unique idempotency key per payment id; webhook signature verified (production rejects missing and forged signatures with 400); refunds and disputes are flagged for human review and never auto-debit; stale orders swept after 60 minutes with provider check. Min and max recharge enforced (Rs 20 to Rs 10,000). **No payment was initiated.** Success, failure, cancel, duplicate-webhook and multi-transaction behaviour is covered only by the existing backend suites, which could not run here (no Docker).

## 5. AI and token cost
Not executed against live endpoints (anonymous access is correctly refused; signed-in calls need a test account). Existing backend tests cover cost and billing; model fallback has a unit test.

## 6. Security findings
No defects found in: auth required on admin/wallet/me/chat APIs; forged tokens rejected; AI endpoints refuse anonymous calls; webhook signature enforced; no user enumeration on login; server-side validation on register; security headers present; CORS not reflective; oversized body refused; no stack traces; public astrologer data has no private fields. Not tested: rate limiting, authorization between two real users (data isolation), non-admin token against admin APIs (needs real tokens).

## 7. Bugs
See bug-tracker.csv: QA-001 and QA-002 open (low). Nothing fixed this round because no functional defect was found in what was executed.

## 8. Not tested / blocked
Signup + OTP, login success and logout, session persistence, profile and birth details, every AI tool with real output, Ratna Jyotish results, wallet recharge (success, failure, cancel), subscriptions (confirm whether plans exist), Live Darshan playback, shop checkout, chat with astrologers, Inner Voice flows, every admin module in a real session, real-user data isolation, rate limits.

## 9. Manual tests needing human approval
1. Create one labelled QA account on production (sends a real OTP email).
2. Razorpay test-mode top-up: success, failure, cancel (use test card; confirm the live key is not in test mode first).
3. Duplicate-webhook replay from the Razorpay dashboard test tools.
4. Admin walkthrough with a real admin login (read-only clicks).
5. Two-account data isolation check.
6. Run `npm run test:db:up` then `test:db:run` in backend on a machine with Docker.

## 10. Launch readiness
Public pages and API perimeter: ready. Transactional journeys: **unverified**. Do not treat the site as launch-ready until items 1 to 3 and 6 are done and pass.

## 11. Reusable suite
`cd frontend && E2E_CHROMIUM=<path to chrome, optional> npm run e2e` (all projects) or `npm run e2e:api`. Specs in frontend/e2e; reports in frontend/e2e/reports (ignored by git). Defaults to production, read-only.
