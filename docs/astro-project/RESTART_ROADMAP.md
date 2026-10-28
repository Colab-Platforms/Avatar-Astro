# Restart Roadmap

**A recommendation, not a record of work done.** Nothing below has been started or committed. The investigation report contained a recommended sequence but **no task IDs**, so the IDs here are new (`T-<area>-<nn>`) and are referenced from [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md). Decisions marked `D-…` live in [PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) and are **unresolved**; tasks depending on them cannot be finalised until the owner decides.

Not everything must launch together. **Launch tiers:** **L1 launch-critical** (security + whatever the owner chooses to ship), **L2 launch-optional** (should follow quickly), **L3 enhancement/deferred**.

Priority: P0 immediate · P1 before launch · P2 after.

## Phase 1 — Security and exposed-credential remediation

| ID | Objective | Pri / Tier | Existing status | Depends on | Modules | Acceptance criteria | Verification | External dependency |
|---|---|---|---|---|---|---|---|---|
| T-SEC-01 | Remove provider keys from browser bundle: route AI Guru family through backend; rotate any key ever bundled | P0 / L1 | Groq called from browser (C1–C6); backend `/api/inner-voice/*` unused | D-PROV-1 | C, FE, BE | `dist/` contains no provider keys; all Inner Voice calls via backend; old keys revoked | grep built bundle; E2E with stub | Groq/OpenRouter accounts |
| T-SEC-02 | Rate limiting, auth/quotas, per-route body limits, `helmet` on AI/TTS/palm and auth endpoints | P0 / L1 | none | D-PRIV-5 | BE | Burst tests return 429; palm/AI bodies capped; unauth policy per D-BIZ-3 | supertest load test | optional Redis |
| T-SEC-03 | OTP hardening (CSPRNG, HMAC hash, attempt lockout) — see T-AUTH-01 | P0 / L1 | brute-forceable | – | A2 | lockout test passes | unit/integration | – |
| T-SEC-04 | Remove personal email/stray artefacts; parametrise admin seed; delete legacy default JWT fallback | P1 / L1 | present | D-AUTH-6, D-OPS-5 | seeds, config | no personal data/hard-coded secrets in tree | grep + review | – |

## Phase 2 — Local environment and database setup

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-ENV-01 | Complete `backend/.env.example` and `frontend/.env.example` (add missing vars; drop unused) | P0 / L1 | incomplete | – | config | fresh clone boots with only the example filled in | follow README on clean machine | – |
| T-ENV-02 | Reproducible local DB (container Postgres), migrate + seeds documented | P0 / L1 | not verified | – | DB | `db:migrate`, `db:seed*` succeed; roles exist | run scripts on empty DB | Postgres |
| T-ENV-03 | Fix port/URL defaults (5000/5001, FRONTEND_URL, Solar URL) | P1 / L1 | inconsistent | – | BE, FE | defaults consistent in dev | manual + test | – |
| T-ENV-04 | Make backend Jest runnable (or move to Vitest), include `__tests__`; remove tests of dead code | P1 / L1 | cannot run | – | BE | `npm test` runs | CI | – |
| T-ENV-05 | Fix 40 frontend type errors; consider enabling `strict` incrementally | P1 / L2 | 40 errors | – | FE | `tsc` clean | CI | – |

## Phase 3 — Authentication and core stabilisation

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AUTH-01 | OTP: CSPRNG, HMAC/salted hash, attempt limit + lockout, surface delivery failure | P0 / L1 | IMPL-NV w/ gap | T-ENV-02 | A2 | brute-force test locks out | integration | Resend |
| T-AUTH-02 | Fix pre-hijack (Google link + unverified overwrite) | P0 / L1 | vulnerable | D-AUTH-2 | A1, A5 | attacker password unusable | scenario test | Google |
| T-AUTH-03 | Phone verification fails closed without mobile match | P0 / L1 | bypass possible | – | A3 | tests pass with/without `mobile` | unit + sandbox | MSG91 |
| T-AUTH-04 | Uniform login/forgot-password responses | P1 / L1 | enumerates | – | A4, A8 | identical responses/timing | tests | – |
| T-AUTH-05 | Hash reset tokens; revoke sessions on reset; refresh reuse detection; bcrypt cost review; short-lived admin access | P1 / L1 | gaps | D-AUTH-7 | A7–A9 | tests pass | tests | – |
| T-AUTH-06 | Purge jobs (OTP, reset tokens, sessions, unverified users); index `sessions.refresh_token` | P2 / L2 | none | D-DB-4 | A, DB | job + migration verified | integration | – |
| T-AUTH-07 | Profile/account pages, change password, deletion/export (as decided) | P2 / L3 | missing | D-PRIV-3 | A | per decision | E2E | – |

## Phase 4 — Verification of existing features

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-VER-01 | Run and record end-to-end verification of A1–A9 with sandbox/stubs | P0 / L1 | none | T-ENV-* | A | checklist in [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md) green | E2E | stubs/sandboxes |
| T-VER-02 | Verify catalogues + admin CRUD + Cloudinary (D1, D3, D5, D8–D11) | P1 / L1 (if shipping devotion) | IMPL-NV | T-ENV-02 | D | tests pass | supertest | Cloudinary (stub) |
| T-VER-03 | Verify numerology (B6) with golden fixtures | P1 / L2 | IMPL-NV | D-AST-5 | B6 | fixtures approved | unit | – |
| T-VER-04 | Verify provider-backed readings with mocks (B1, B3, B7, C*) | P1 / L2 | IMPL-NV | T-SEC-01 | B, C | contract tests | mocked fetch | – |

## Phase 5 — Product decisions (owner)

| ID | Objective | Pri | Status | Depends | Acceptance |
|---|---|---|---|---|---|
| T-DEC-01 | Resolve launch scope, positioning, accuracy standard (D-BIZ-1/2, D-AST-1) | P0 | open | – | written decisions recorded in the decisions doc |
| T-DEC-02 | Resolve commerce model and payment provider (D-DEV-*, D-PAY-*) | P1 | open | – | decisions recorded |
| T-DEC-03 | Resolve provider/account status and hosting (D-PROV-*, D-OPS-*) | P0 | open | – | account inventory confirmed |
| T-DEC-04 | Privacy/compliance policy (D-PRIV-*) | P0 | open | – | policy documented |

## Phase 6 — Core astrology functionality (depends on T-DEC-01)

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AST-01 | Birth chart per decision: real ephemeris + timezone/geocoding, **or** relabel as entertainment and remove "calculated" claims | P1 / L1 or L2 | PART; not a real chart | D-AST-1/2, D-PROV-4/5 | B3, B4, B9 | per decision; if real: matches reference ephemeris fixtures | fixtures | geocoder/ephemeris |
| T-AST-02 | Compatibility per decision (real method or relabel); re-enable or remove dead AI chat | P2 / L2 | MOCK | D-AST-3 | B5 | per decision | tests | – |
| T-AST-03 | Zodiac daily panel: real data or label | P2 / L2 | MOCK | D-AST-6 | B2 | per decision | tests | – |
| T-AST-04 | Align Inner Voice copy/features with reality (no natal/transit/dasha claims unless computed) | P1 / L1 | misleading | D-AST-1 | C | copy review passes | review | – |
| T-AST-05 | Daily horoscope: validate sign, include date, cache per sign/date | P1 / L2 | IMPL-NV | D-AST-4 | B1 | repeated calls identical per date; invalid sign 400 | tests | provider |
| T-AST-06 | Palm reading per decision | P2 / L3 | PART | D-AST-7 | B8, B8b | per decision | tests | – |
| T-AST-07 | Consolidate sun-sign/life-path utilities into one module | P2 / L2 | 4 copies | D-AST-2 | B | one implementation, tested | unit | – |

## Phase 7 — Devotion and Live Darshan

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-DAR-01 | Sign/verify WebSub (`hub.secret`, topic check) | P1 / L1 (if shipping Darshan) | unsigned | – | E2 | forged requests rejected | handler tests | YouTube hub |
| T-DAR-02 | Correct live-state logic: don't mark offline on unrelated uploads; startup live scan | P1 / L1 | defect | – | E2, E3 | replay suite passes | recorded-XML tests | YouTube API |
| T-DAR-03 | Remove hard-coded LIVE/viewer counts; fill or hide 4 channels without IDs | P1 / L1 | mock | D-DEV-6 | E1, E8 | no fabricated data shown | review/tests | – |
| T-DAR-04 | SSE resync on reconnect; connection cap; multi-instance plan | P2 / L2 | gaps | D-OPS-2 | E4 | reconnect test passes | tests | – |
| T-DAR-05 | Quota monitoring/backoff | P2 / L2 | none | – | E3 | alert on quota errors | tests | Google Cloud |
| T-DEV-01 | Catalogue pagination/caching; `priceFrom` rule; `originalPrice>price` validation | P2 / L2 | gaps | D-DEV-5 | D | per decision | tests | – |
| T-DEV-02 | Prayer wall / reminders / notify per decision | P2 / L3 | UI ONLY | D-DEV-7 | E5, E7 | per decision | tests | notification provider |

## Phase 8 — Commerce and payments (depends on T-DEC-02)

Not defined enough to specify acceptance criteria. Proposed breakdown once decisions exist:

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance (draft) | External |
|---|---|---|---|---|---|---|---|
| T-COM-01 | Data model: orders/bookings/payments/addresses | P1 / L1 for commerce | NOT IMPLEMENTED | D-PAY-2/3 | DB | migrations + tests | – |
| T-COM-02 | Payment integration with idempotent webhooks (sandbox) | P1 / L1 for commerce | NOT IMPLEMENTED | D-PAY-1 | BE | sandbox payments reconcile | payment provider |
| T-COM-03 | Wire Puja/Chadhawa/Shop/Donate flows to order APIs; remove unsupported marketing claims | P1 / L1 for commerce | UI ONLY | T-COM-01/02 | FE, BE | E2E sandbox order | – |
| T-COM-04 | Confirmations/notifications, order history, admin console | P2 / L2 | missing | D-PAY-4/6 | FE, BE | per decision | email/SMS/WhatsApp |
| T-COM-05 | Name-report paywall: real entitlement or remove | P2 / L3 | MOCK | D-PAY-5 | B6b | per decision | payment provider |
| T-OPS-01 | Contact + Newsletter: implement storage/email or remove UI | P1 / L2 | MOCK | D-BIZ-5 | F1, F2 | messages stored/delivered | Resend |

## Phase 9 — AI usage controls and integration hardening

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AI-01 | Single backend AI service: prompt registry, schema validation, retries/timeouts, caching, quotas | P1 / L1 | scattered | T-SEC-01, D-PROV-1 | BE | all AI routes use it | contract tests | provider |
| T-AI-02 | Mark fallback/mock outputs distinctly (name narrative returns 200 mock) | P1 / L2 | defect | T-AI-01 | B6 | API flags fallback; UI shows | tests | – |
| T-AI-03 | Karma score/journal/diagnosis: validate ranges, no silent hard-coded fallback | P2 / L2 | PART | T-AI-01 | C4–C6 | per decision | tests | – |
| T-AI-04 | Conversation persistence, history cap/summarisation, safety guardrails | P2 / L2 | none | D-AST-8, D-PRIV-4, D-DB-2 | C1–C3 | per decision | tests | – |
| T-AI-05 | TTS: single endpoint, caching, length handling | P2 / L3 | 3 copies | D-PROV-3 | C3, C8 | one endpoint | tests | Sarvam |
| T-AI-06 | Delete dead code (horoscope router/astroApiService/legacy auth, unused FE API client/hooks, duplicate TTS, stray files) | P2 / L2 | dead | D-OPS-5 | repo | build/tests still pass | CI | – |

## Phase 10 — Testing, staging, deployment, release

| ID | Objective | Pri / Tier | Status | Depends | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|
| T-REL-01 | CI: type-check, lint, unit, integration, bundle-key scan, `npm audit` review | P1 / L1 | none | T-ENV-04/05 | pipeline green | CI run | CI host |
| T-REL-02 | Staging environment with public HTTPS backend; end-to-end Darshan test with a real channel | P1 / L1 | unknown | D-OPS-1 | staging checklist passes | manual + E2E | Vercel/Render or chosen hosts |
| T-REL-03 | Observability (logs, errors, quotas), backups, key rotation runbook | P1 / L1 | none | D-OPS-3/4 | runbook + alerts exist | review | monitoring provider |
| T-REL-04 | Release checklist: security checklist ([AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md) §4), accounts funded, legal pages | P1 / L1 | – | T-DEC-04 | all items ticked | review | – |

## Suggested ordering

1. T-DEC-01/03/04 (owner decisions) in parallel with T-SEC-01/02/04 and T-ENV-01…04.
2. T-AUTH-01…05 → T-VER-01.
3. Pick the launch tier: devotion/Darshan (T-DAR-01…03, T-VER-02) and/or readings (T-AST-01/04/05, T-AI-01/02).
4. Commerce (T-COM-*) only after T-DEC-02.
5. T-REL-* before any public release; L3 items are optional enhancements.
