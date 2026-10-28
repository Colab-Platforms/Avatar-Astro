# Testing and Acceptance Criteria

## Part 1 — Tests that actually exist and results (investigation, 2026-10-19)

| Check | Command (read-only) | Result |
|---|---|---|
| Backend type-check | `tsc --noEmit` in `backend/` | exit 0, no diagnostics printed |
| Frontend unit tests | `vitest run` | 1 file / 1 test passed — `expect(true).toBe(true)` (`frontend/src/test/example.test.ts`) |
| Frontend type-check | `tsc -p tsconfig.app.json --noEmit` | **40 errors in 11 files** |
| Backend Jest tests | – | **Not runnable**: no `jest`/`ts-jest` dependency, no `test` script, tests excluded by `tsconfig.json`; they cover only dead code (`middleware/auth.ts`, `birthDataValidation.ts`) |
| Not executed | `vite build`, dev servers, DB, migrations, seeds, any provider call, `npm audit`, lint | – |

**No feature has passing tests, and no feature is verified working.** Everything in Part 2 is *proposed*; writing criteria does not mark anything as passing.

## Part 2 — Proposed tests and acceptance criteria

General approach: local only, throwaway PostgreSQL (e.g. container), all external services (Resend, MSG91, Google, OpenRouter, Groq, Sarvam, Cloudinary, YouTube, Nominatim) **stubbed**; no real payments/messages; no production data. Stack suggestion: Vitest/Jest + supertest (backend), Vitest + Testing Library (frontend), Playwright (E2E). A feature is "complete" only when its criteria pass **and** its listed decisions ([PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md)) are resolved.

### A — Authentication (A1–A9)
* **Preconditions:** seeded roles; mocked mailer/MSG91/Google; fixed clock.
* **Positive:** register→email OTP→session; register→phone verify→session; login; Google new user→complete profile; refresh rotation; logout; logout-all; reset password; admin dashboard as ADMIN.
* **Negative:** weak password; non-Indian phone; duplicate email/phone; wrong/expired/used OTP; resend within 60 s → 429; unknown email behaviours; inactive user; expired/tampered JWT; USER on admin route; reused refresh token.
* **Edge:** unverified duplicate registration; Google link on unverified local account; MSG91 response without `mobile`; concurrent refresh calls (client dedup).
* **Expected today vs target:** brute-force lockout and pre-hijack prevention are *target behaviours* (currently absent) — tests should fail until T-AUTH tasks land.
* **Complete when:** all paths pass; lockout, pre-hijack, phone-match tests pass; coverage of `auth.service` high; no secrets in logs.

### B — Readings
* **B1:** mocked provider; positive: text rendered; negative: 402/429/timeout/missing key; edge: invalid sign (target: 400). Complete when caching and validation exist per decision D-AST-*.
* **B2/B3/B5:** unit-test `getZodiac` cusp days (Jan 19/20, Feb 18/19, Mar 20/21, … Dec 21/22), `getLP` (incl. 11, 22), determinism of `hash/dv/deriveScore`. Assert these are *pseudo* outputs (document, not endorse). Real birth chart: golden fixtures vs a reference ephemeris — only after D-AST-1.
* **B6:** golden fixtures for numerology (destiny, soul urge, personality, Chaldean, life path, overall score formula); narrative with provider success/failure/bad JSON; target: UI can distinguish fallback. Edge: non-Latin names, empty strings, >14 letters.
* **B6b:** target tests only once payment exists; today assert it is a client-state demo.
* **B7:** mocked fetch; 3- and 5-card payloads; wrong count (target: 400); malformed JSON → fallback.
* **B8:** component tests with mocked MediaPipe; quality-gate branches (`no_hand_detected`, `too_blurry`, `hand_too_small`, `low_confidence`); synthetic/consented images only.
* **B4/B8b/B9a:** contract tests only if the features are revived; otherwise remove.

### C — AI Guru and Inner Voice
* Provider interface mocked; positive: greeting/gathering/readyForDiagnosis transitions; diagnosis JSON schema; PDF generation runs; negative: provider 429, malformed JSON, empty reply; edge: very long history (token growth), Devanagari input, language directive. Voice: mocked `SpeechRecognition`; TTS 500+ chars truncation, `en`→`en-IN`, other→`hi-IN`, missing key → 500, provider failure → 502.
* **Complete when:** keys are server-side (no `VITE_GROQ_*` in `dist/`), limits enforced, outputs schema-validated, persistence/retention decisions implemented.

### D — Devotion commerce and admin
* **Public lists (D1, D3, D5):** seeded DB; positive: list/detail; negative: unknown slug 404; inactive items hidden; chadhawa temples with zero active offerings hidden.
* **Admin (D7–D11):** supertest with ADMIN token; validation bounds (see logic reference), duplicate slug 409, category-with-products delete 409, upload >10 MB / wrong MIME / >10 files, Cloudinary failure compensation, temple delete reporting `orphanedImages`. Edge: concurrent slug creation; `originalPrice ≤ price` (currently accepted).
* **D2/D4/D6:** today assert buttons are inert (documenting reality); real acceptance criteria require the commerce spec (D-PAY-*): idempotent payment webhook, order state transitions, availability, confirmation.
* **Complete when (catalogue/admin):** tests pass and pagination/caching decisions made. **Commerce:** not definable until decisions are made.

### E — Live Darshan
* **Handler tests:** feed recorded Atom XML with mocked `getVideoLiveStatus`: live→markLive; not-live→markOffline; unknown channel ignored; missing key skipped; forged POST (target: rejected); non-live upload during live stream (target: stays live — currently marks offline); GET challenge echo (target: validates topic).
* **Poll tests:** fake timers; stream ends → offline + SSE broadcast; API error → state unchanged; restart while live (target: startup scan).
* **SSE:** event stream receives updates; heartbeat; client disconnect cleans listener; FE patches cache; FE resync after reconnect (target).
* **FE:** list page must not show hard-coded LIVE while loading (target); player only with live videoId; embed-error retry codes 101/150.
* **Quota:** unit test counts API calls per interval per live channel.
* **Complete when:** replay suite of live→upload→end sequences passes; forged webhook rejected; quota monitored.

### F — Site
* **F1/F2:** decide scope; then API tests (validation, storage/email) and E2E; today assert the UI never calls the API.
* **F3/F5:** smoke render tests. **F4:** confirm production `VITE_SOLAR_SYSTEM_URL` and iframe loads. **F6:** CORS allow/deny (target: 403 not 500), health.

### Cross-cutting
* CI: type-check (fix 40 frontend errors), lint, unit, integration; bundle check for keys; `npm audit` review.
* E2E (Playwright) on a local stack with stubs for the main journeys: register/login, horoscope, tarot, name report, Puja browse, Darshan live toggle via simulated webhook, admin CRUD.
