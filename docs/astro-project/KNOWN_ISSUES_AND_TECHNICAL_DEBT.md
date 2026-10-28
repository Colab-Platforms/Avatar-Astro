# Known Issues and Technical Debt

Every issue below was found by reading code (or the read-only checks in [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md)). **None has been fixed.** Priority: **P0** fix before any public exposure · **P1** correctness/honesty before launch · **P2** operations/scalability. Remediation is a recommendation; task IDs refer to [RESTART_ROADMAP.md](RESTART_ROADMAP.md).

## 1. Security (critical/high) — details in [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md)

| ID | Pri | Issue | Evidence | Impact | Remediation / task |
|---|---|---|---|---|---|
| KI-01 | P0 | Groq key in browser bundle (6 call sites) | `VITE_GROQ_API_KEY` usage | key theft, uncontrolled spend | proxy via backend; rotate — T-SEC-01 |
| KI-02 | P0 | AI/TTS/palm endpoints unauthenticated, no rate limit, 20 MB body | `index.ts`, `routes/*` | provider cost abuse, DoS | rate limits/auth — T-SEC-02 |
| KI-03 | P0 | OTP brute force | `generateOtp`, `verifyOtp` | account takeover of unverified accounts | T-SEC-03 / T-AUTH-01 |
| KI-04 | P0 | Pre-hijack via unverified overwrite + Google link | `register`, `googleAuth` | account takeover | T-AUTH-02 |
| KI-05 | P0 | Phone-match skip | `verifyPhone` | session issuance without number proof (if provider omits mobile) | T-AUTH-03 |
| KI-06 | P1 | User enumeration | `login`, `forgotPassword` | privacy | T-AUTH-04 |
| KI-07 | P1 | Unsigned WebSub webhook | `darshan.controller.ts` | quota burn, false states | T-DAR-01 |
| KI-08 | P1 | Reset tokens plaintext; sessions not revoked; low bcrypt cost; no refresh reuse detection | auth service | session persistence after compromise | T-AUTH-05 |
| KI-09 | P1 | Admin seed has hard-coded personal email; legacy default JWT secret string | `makeadmin.ts`, `config/environment.ts` | privacy/hygiene | T-SEC-04 |

## 2. Broken or misleading features

| ID | Pri | Issue | Evidence | Remediation |
|---|---|---|---|---|
| KI-10 | P1 | "Birth chart" is not a birth chart; time unused; scores are hash-derived | `BirthChart.tsx` (`getZodiac`, `getLP`, `dv`) | product decision first — T-AST-01 |
| KI-11 | P1 | Compatibility scores ignore sign/life-path; chat is canned; AI call commented out | `CompatibilityChecker.tsx` | T-AST-02 |
| KI-12 | P1 | Zodiac "daily" panel is seeded random | `ZodiacDetail.tsx` | label or compute — T-AST-03 |
| KI-13 | P1 | Inner Voice marketing claims natal/transit/dasha calculation; none exists | `InnerVoice.tsx` copy vs code | copy or feature — T-AST-04 |
| KI-14 | P1 | Karma score LLM-"calculated"; hard-coded fallback shown as real | `InnerVoiceDashboard.tsx` | T-AI-03 |
| KI-15 | P1 | Name narrative returns mock with HTTP 200 on failure | `nameAnalysisRoutes.ts` | flag fallback — T-AI-02 |
| KI-16 | P1 | Daily horoscope not cached/dated; sign unvalidated; model ID may not exist | `chatgptService.ts` | T-AST-05 |
| KI-17 | P1 | Darshan: unrelated upload marks live stream offline; no startup scan | `darshan.controller.ts`, `refresh.ts` | T-DAR-02 |
| KI-18 | P1 | Darshan list shows hard-coded LIVE while API loading/failing; fabricated viewer counts | `DarshanPage.tsx:127`, `liveStreams.ts` | T-DAR-03 |
| KI-19 | P1 | SSE not resynced after reconnect (`staleTime: Infinity`) | `useDarshan*` | T-DAR-04 |
| KI-20 | P2 | Palm "lines" are template curves; endpoint unused | `lineEstimator.ts` | label or implement — T-AST-06 |

## 3. Incomplete workflows / mocked behaviour

| ID | Pri | Item | Status |
|---|---|---|---|
| KI-21 | P1 | Puja booking buttons no handler; copy promises confirmation/certificate/prasad | UI ONLY (D2) — T-COM-* |
| KI-22 | P1 | Chadhawa "Proceed to Offer" no handler (D4) | UI ONLY |
| KI-23 | P1 | Shop Add to Cart / Buy Now no handlers (D6) | UI ONLY |
| KI-24 | P1 | Donation card no handler (E6) | UI ONLY |
| KI-25 | P1 | Contact and Newsletter simulate success; messages lost (F1, F2) | MOCKED — T-OPS-01 |
| KI-26 | P1 | ₹499 paywall is a client-state demo (B6b) | MOCKED |
| KI-27 | P2 | Prayer wall / reminders / notify local only (E5, E7) | UI ONLY |
| KI-28 | P2 | `Temple.priceFrom` independent of puja prices | data risk |
| KI-29 | P2 | No user profile, booking history, account deletion, password change UI | missing |

## 4. Unused and obsolete code

* Unmounted: `horoscopeRoutes`, `horoscopeController`, `astroApiService`, `middleware/auth.ts`, `config/environment.ts`, `birthDataValidation.ts` (tests exist only for the latter two and cannot run).
* Mounted but uncalled: `/api/palm-reading`, `/api/inner-voice/*`, `/api/compatibility/analyze`, `/api/birthchart/chat`, `/api/interpretation/{birth-chart,compatibility,chart-chat}`, `/api/zodiac/*`.
* Frontend: `lib/api.ts` (except Darshan), `hooks/useApi.ts`, `hooks/useChartChat.ts`, `useInterpretBirthChart`, unused route guards, `VITE_GEMINI_API_KEY` typing, `frontend/public/` solar copies and "(1)" duplicates, ~1,000+ commented lines in big pages.
* Duplicates: three TTS handlers (+ differing root `api/tts.ts`), four sun-sign tables, two life-path implementations.
* Stray tracked files: `backend/darshan-live.txt`, `video.txt`, many root status `.md` files of unverified accuracy.

## 5. Configuration and environment

* `backend/.env.example` omits `DATABASE_URL`, `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `MSG91_*`, `SARVAM_API_KEY`; lists unused `SMTP_*`.
* Stale `MONGODB_*`, `DARSHAN_REFRESH_INTERVAL_MINUTES` in local `.env`.
* Port/URL mismatches: backend `PORT` default 5001 vs 5000; `FRONTEND_URL` default 3000 vs Vite 8081; `VITE_SOLAR_SYSTEM_URL` default localhost:3000.
* CORS: hard-coded origins; Vercel preview domains blocked; rejection returns HTTP 500.
* Four temples lack YouTube channel IDs (`temples.json`).
* `makeadmin.ts` import lacks `.js`; seeds not verified. `vite.config.ts` auto-opens the bundle visualizer on build.

## 6. Testing gaps

* No test covers any feature. Frontend: one trivial test. Backend: two Jest files for dead code; Jest not installed; tests excluded from `tsconfig`.
* Frontend `tsc` has 40 errors (11 files); `strict:false`.
* No CI configuration found [not specifically searched beyond listing tracked files].

## 7. Performance, quota and cost

* Darshan quota: one `videos.list` per live channel per 120 s (≈720/day/channel, assuming 1 unit per call as per code comment; Google default quota unverified); webhook calls amplifiable by forged posts.
* Unpaginated public lists (`/api/temples`, `/api/shop/products`); no cache headers.
* Every horoscope click triggers a paid LLM call; no caching.
* Heavy bundle (three.js, mediapipe, jsPDF, gsap, framer-motion, recharts); 1–2k-line pages with inline styles.
* Single-process timers/EventEmitter: not multi-instance safe; free-tier sleeping hosts miss pushes.
* No logging/monitoring beyond `console`; no purge jobs for OTPs, reset tokens, sessions, unverified users; no index on `sessions.refresh_token`.

## 8. Dependencies between remediations

Auth fixes (T-AUTH-*) need the local DB/test harness (T-ENV-*). Moving Groq server-side (T-SEC-01) enables AI rate limiting and caching (T-AI-*). Commerce (T-COM-*) is blocked on product decisions D-PAY-* ([PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md)). Real astrology (T-AST-*) is blocked on D-AST-*.

## 9. Added in second pass (2026-10-19)

| ID | Finding | Evidence | Status |
|---|---|---|---|
| KI-2-01 | `frontend/.bin/*` (105 shim files) is tracked in git | `git ls-files frontend/.bin` | Confirmed |
| KI-2-02 | ~16 statically unreferenced frontend modules (3D scenes, cursor/starfield, `useApi`, `useChartChat`, legacy `data/products.ts`, `data/temples.ts`) and ~32 unused shadcn primitives | filename-import scan, [inventory §4.1](PROJECT_FILE_AND_MODULE_INVENTORY.md) | Heuristic; verify with bundle analysis |
| KI-2-03 | Karma `composite` has no lower clamp; model-supplied negative components could yield a negative score | `InnerVoiceDashboard.tsx` composite expression | Inferred from code |
| KI-2-04 | Palm endpoint claims "seed ensures consistent reading" but sets no seed/temperature, so output is not reproducible | `index.ts` palm prompt/request | Confirmed (unused endpoint) |
| KI-2-05 | Two life-path implementations disagree on 33 (`getLP` keeps 11,22 only; `lifePathNumber` keeps 11,22,33) | `BirthChart.tsx`, `lib/numerology.ts` | Confirmed |
| KI-2-06 | `makeadmin.ts` has no npm script and a hard-coded email constant (personal address in source) | `prisma/seeds/makeadmin.ts` | Confirmed |
| KI-2-07 | `datasource` in `schema.prisma` has no `url`; DB URL comes only from `prisma.config.ts` — tools that ignore the config (older CLIs/IDE plugins) will not connect | `schema/schema.prisma`, `prisma.config.ts` | Confirmed |
| KI-2-08 | No timeout/abort on OpenRouter `fetch`/`axios` calls: a hung provider ties up requests | all AI routes | Confirmed (no timeout option present) |
| KI-2-09 | Frontend `tsc` still reports 40 errors; `tsc` clean on backend (re-run 2026-10-19) | command output | Runtime-verified (static check) |
