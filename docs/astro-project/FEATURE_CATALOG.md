# Feature Catalog

54 investigated features. Logic for each is in [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) (same IDs). Status labels: **IMPL-NV** = IMPLEMENTED — NOT END-TO-END VERIFIED · **PART** = PARTIALLY IMPLEMENTED · **UI** = UI ONLY · **BE** = BACKEND ONLY · **MOCK** = MOCKED · **UNV** = UNVERIFIED · **NOT** = NOT IMPLEMENTED. No feature is VERIFIED WORKING: nothing was run end-to-end ([TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md)).

| Status | Count |
|---|---|
| IMPL-NV | 30 |
| PART | 4 (B3, B8, C4, D7) |
| UI | 8 (D2, D4, D6, E5, E6, E7, F3, F5) |
| BE | 4 (B4, B8b, B9a, C7) |
| MOCK | 6 (B2, B5, B6b, E8, F1, F2) |
| UNV | 1 (F4) |
| NOT | 1 (B9b) |

Paths: backend files under `backend/src/`, frontend under `frontend/src/`.

## A — Authentication & accounts

Common: backend `modules/auth/{auth.route,auth.controller,auth.service,auth.validators}.ts`; DB `users`, `roles`, `user_role_mapping`, `sessions`, `otp_verifications`, `password_reset_tokens`; frontend `features/auth/*`, `lib/authClient.ts`, `store/authStore.ts`. Actor: visitor / signed-in user. Security detail: [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md).

| ID | Feature | Business purpose | Frontend | Backend endpoint / service | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| A1 | Email/password registration | Create account with required profile | `/register` (`RegisterPage.tsx`) | `POST /api/auth/register` → `AuthService.register` | users, user_role_mapping | – | IMPL-NV | Overwrites unverified duplicate; `referralCode` accepted but unused; India-only phone; no rate limit; register sends no OTP itself |
| A2 | Email OTP (register/login) | Prove email ownership | `/verify-otp` (`VerifyOtpPage`, `OtpForm`) | `POST /auth/resend-otp`, `/auth/verify-otp` | otp_verifications | Resend | IMPL-NV | No attempt limit, `Math.random`, unsalted hash; send failures swallowed |
| A3 | Phone verification (MSG91) | Prove phone ownership | `/register` step 3 (`Msg91PhoneWidget`, `useVerifyPhone`) | `GET /auth/msg91-config`, `POST /auth/verify-phone` | users.isPhoneVerified | MSG91 | IMPL-NV | Number-match skipped if provider omits mobile (response shape UNKNOWN) |
| A4 | Password login | Sign in; route unverified users to OTP | `/login` | `POST /auth/login` | users, sessions, otp_verifications | Resend | IMPL-NV | 404 reveals unknown email; no lockout |
| A5 | Google sign-in + linking | One-click sign-in; link by email | `GoogleAuthButton`, `useGoogleIdentity` | `POST /auth/google` | users.googleId | Google | IMPL-NV | Pre-hijack: link keeps existing password |
| A6 | Complete profile (Google users) | Collect phone/location/DOB | `/google-onboarding` | `POST /auth/complete-profile` (auth) | users | – | IMPL-NV | Phone never OTP-verified; "Google Sheets sync" comment has no code |
| A7 | Session refresh / logout / logout-all | Maintain & end sessions | automatic in `authClient` | `POST /auth/refresh`, `/logout`, `/logout-all` | sessions | – | IMPL-NV | No reuse detection; no purge; access token valid ≤1 d after logout |
| A8 | Forgot / reset password | Account recovery | `/forgot-password`, `/reset-password` | `POST /auth/forgot-password`, `/reset-password` | password_reset_tokens | Resend | IMPL-NV | Plaintext token; 404 enumeration; sessions not revoked |
| A9 | Role-based access | Restrict admin | `routes/AdminRoute.tsx` (UI) | `middleware/authMiddleware.ts#auth`, `admin.route.ts` | roles, user_role_mapping | – | IMPL-NV | Role from token (≤1 d stale); no user-management UI; legacy `middleware/auth.ts` incompatible/dead |

## B — Astrology & readings

| ID | Feature | Purpose / actor | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| B1 | Daily Horoscope (AI) | Per-sign daily text; visitor | `/horoscopes` (`DailyHoroscopes.tsx`, `hooks/useInterpretation.ts`) | `GET /api/interpretation/horoscope/:sign` → `chatgptService.generateDailyHoroscope` | – | OpenRouter (`openai/gpt-4-turbo-preview`) | IMPL-NV | Not cached/date-seeded; sign unvalidated; unauthenticated; model ID availability UNKNOWN |
| B2 | Zodiac library & per-sign "daily" page | Sign info + daily "lucky" panel; visitor | `/zodiac`, `/zodiac/:sign` (`ZodiacSigns.tsx`, `ZodiacDetail.tsx`, `data/zodiacData.ts`) | `GET /api/zodiac/signs[/:sign]` exist, unused by UI | – | – | MOCK | Daily values are seeded random picks (not astronomical); unknown sign → Aries on backend |
| B3 | Birth Chart ("Cosmic Identity") | Personal profile reading; visitor | `/birth-chart` (`BirthChart.tsx`) | `POST /api/birthchart/analyze` | – | OpenRouter (`google/gemma-4-31b-it:free`), Nominatim | PART | Not a birth chart; time/coords never sent; pseudo-random scores; 5.6 s fake wait; errors silently fall back |
| B4 | Birth-chart chat | Q&A on chart | none active (in-page `AIChat` commented out; `hooks/useChartChat.ts` unused) | `POST /api/birthchart/chat`, `POST /api/interpretation/chart-chat` | – | OpenRouter | BE | Expects `moon`/`rising` that nothing computes |
| B5 | Compatibility checker | Two-person compatibility; visitor | `/compatibility` (`CompatibilityChecker.tsx`) | `POST /api/compatibility/analyze` (call commented out), `GET /api/interpretation/compatibility` (unused) | – | Nominatim | MOCK | Scores from name hash, ignore sign/life-path; chat is canned strings |
| B6 | Name Destiny (numerology) report | Name/DOB numerology report | `/name-destiny-report` (`NameDestinyReport/*`, `lib/numerology.ts`, `useNameReport.ts`) | `POST /api/name-analysis/narrative` | – | OpenRouter (gemma-4-31b-it:free) | IMPL-NV | Backend returns mock text with HTTP 200 on failure; non-A–Z letters dropped; table provenance UNKNOWN |
| B6b | Name report paywall (₹499) + PDF | Premium unlock | `PricingPaywall.tsx`, `lib/pdfExport.ts` | none | – | jsPDF (client) | MOCK | "Demo unlock", client state only |
| B7 | Tarot (Life Timeline / Karma Mirror) | Card draw + AI reading | `/tarot` (`TarotExperience.tsx`, `data/tarotData.ts`) | `POST /api/tarot/reading` | – | OpenRouter (`google/gemma-3-27b-it`) | IMPL-NV | Card count not validated server-side; static fallback on any failure; no history |
| B8 | Palm reading | Camera/upload palm scan | `/palm-reading` (`PalmReading.tsx`, `lib/palmAnalysis/*`) | none called | – | MediaPipe assets (CDN) | PART | Lines are template curves anchored to landmarks (not detected creases); text is local/canned |
| B8b | Palm-reading LLM endpoint | Vision reading | none | `POST /api/palm-reading` | – | OpenRouter (`anthropic/claude-3.5-sonnet`) | BE | Never called; unauthenticated, costly |
| B9a | Legacy Vedic API client + horoscope router | Intended real chart/horoscope data | none (legacy `lib/api.ts` calls nonexistent paths) | `services/astroApiService.ts`, `routes/horoscopeRoutes.ts`, `controllers/horoscopeController.ts` — **not mounted** | – | external "astro-api" (`ASTRO_API_BASE_URL`) | BE (dead) | `/api/horoscope/*` returns 404; `createHoroscope` returns 501 |
| B9b | True Kundali / astronomical computation | – | – | – | – | – | NOT | Does not exist in any form |

## C — Inner Voice / AI Guru

Shared: LLM calls made from the browser to Groq with `VITE_GROQ_API_KEY` (key public in bundle); state in localStorage only; no auth.

| ID | Feature | Purpose | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| C1 | AI Guru consultation chat | Persona chat ("Pandit Rameshwar Ji") | `/inner-voice/chat` (`InnerVoiceChat.tsx`, `components/ai-guru/*`) | none | none (localStorage titles) | Groq | IMPL-NV | Whole history resent each turn; conversations not saved; no moderation/safety handling |
| C2 | Diagnosis report + PDF | Structured remedy report | same, Report tab | none | none | Groq, jsPDF | IMPL-NV | Prompt contains example 2025 dates; all scores LLM-invented; remedy/cost advice unvetted |
| C3 | Voice consultation | Speech in/out | `components/VoiceConsultation.tsx`, `hooks/useSpeechRecognition.ts`, `useTextToSpeech.ts` | `POST /api/tts` | – | Groq, Sarvam, Web Speech API | IMPL-NV | Chrome/Edge STT; TTS 500-char truncation; no audio cache |
| C4 | Karma Score dashboard | "Karma" score + daily actions | `/inner-voice/dashboard` | none | none | Groq | PART | Natal/transit parts LLM-invented; hard-coded fallback score 62 |
| C5 | Karma Journal | Entry analysis + prompts | `/inner-voice/journal` | none | none | Groq | IMPL-NV | localStorage only; static fallback data |
| C6 | Shloka Wisdom | Sanskrit verse suggestion | `/inner-voice/wisdom` | none | none | Groq | IMPL-NV | Verse accuracy unchecked |
| C7 | Backend inner-voice API | Server-side equivalents of C1–C6 + TTS | none | `POST /api/inner-voice/{diagnose,guru-chat,analyze-journal,wisdom,tts}` | – | OpenRouter, Sarvam | BE | Unused by frontend |
| C8 | TTS proxy (3 copies) | Hide Sarvam key | via C3 | `POST /api/tts` (used), `/api/inner-voice/tts` (unused), `frontend/api/tts.ts` + root `api/tts.ts` (Vercel fns, differ) | – | Sarvam | IMPL-NV | Unauthenticated; spends credits |

## D — Devotion commerce & admin

| ID | Feature | Purpose / actor | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| D1 | Puja/temple catalogue | Browse temples & pujas; visitor | `/puja`, `/puja/:slug` (`pages/Puja/*`, `features/puja/*`) | `GET /api/temples`, `/api/temples/:slug` (`puja.service`) | temples, temple_images, pujas | – | IMPL-NV | Unpaginated; `priceFrom` independent of puja prices |
| D2 | Puja booking | Intended booking | `PujaDetail.tsx` | **none** | **none** | – | UI | "Book" buttons have no handler; copy claims (confirmation, certificate, prasad) have no backing |
| D3 | Chadhawa catalogue | Browse offerings | `/chadhawa`, `/chadhawa/:slug` | `GET /api/chadhawa[/:slug]` | chadhawas (+temples) | – | IMPL-NV | Only temples with ≥1 active offering |
| D4 | Chadhawa offering flow | Intended order | `ChadhawaDetail.tsx` | none | none | – | UI | Quantities/total client-only; "Proceed to Offer" has no handler; wishlist local state |
| D5 | Shop catalogue | Browse products | `/shop`, `/shop/:slug` | `GET /api/shop/{categories,products,products/:slug}` | shop_categories, shop_products | – | IMPL-NV | Active products in active categories only; `authenticity` is free text |
| D6 | Shop cart / Buy Now | Intended purchase | `ShopDetail.tsx`, `Shop/index.tsx` | none | none | – | UI | "Add to Cart"/"Buy Now" no handlers; no stock/shipping/tax |
| D7 | Admin dashboard | Admin landing | `/admin` (`pages/Dashboard.tsx`) | `GET /api/admin/dashboard` | users | – | PART | Returns only `{user, role}` |
| D8 | Admin temples / pujas / images | CMS | `/admin/puja` (+dialogs) | `/api/admin/puja/*` | temples, temple_images, pujas | Cloudinary | IMPL-NV | No audit log; slug race; assets not moved on slug rename |
| D9 | Admin Chadhawa | CMS | `/admin/chadhawa` | `/api/admin/chadhawa/*` | chadhawas | – | IMPL-NV | Name unique per temple (app-level check) |
| D10 | Admin Shop categories/products | CMS | `/admin/shop/categories`, `/admin/shop/products` | `/api/admin/shop/*` | shop_categories, shop_products | Cloudinary | IMPL-NV | No rule `originalPrice > price`; category delete blocked if products exist |
| D11 | Image upload/delete | Media | admin dialogs | `config/cloudinary.ts`, `middleware/upload.ts` | `*.imagePublicId` columns | Cloudinary | IMPL-NV | MIME by declared type only; ≤10 MB, ≤10 files |

## E — Live Darshan

| ID | Feature | Purpose | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| E1 | Darshan list/detail + embed | Watch temple streams | `/avatar-live/darshan[/:slug]`, `/avatar-live` | `GET /api/darshan/temples[/:slug]` | darshan_channels | YouTube IFrame API | IMPL-NV | List page shows hard-coded LIVE flags while backend loads/fails |
| E2 | WebSub subscription + webhook | Detect go-live | – | `darshan.websub.ts`, `GET/POST /api/darshan/websub/callback` | darshan_channels | WebSub hub, YouTube Data API | IMPL-NV | Unsigned; any upload may mark live stream offline; no startup scan; 4 channels lack IDs |
| E3 | Stale-live safety poll | Detect stream end | – | `darshan.refresh.ts` (default 120 s) | darshan_channels | YouTube Data API | IMPL-NV | One call per live channel per tick; no backoff |
| E4 | Live status push (SSE) | Real-time UI update | `hooks/useDarshanLiveEvents.ts` | `GET /api/darshan/events` | – | – | IMPL-NV | No connection cap/auth; no resync on reconnect; single-process |
| E5 | Prayer wall | Social prayers | `DarshanDetail.tsx#PrayerWall` | none | none | – | UI | Local component state seeded with sample prayers |
| E6 | Donation card | Donations | `DarshanDetail.tsx#DonationCard` | none | none | – | UI | No handler/payment |
| E7 | Notify / Set Reminder | Alerts | Darshan pages | none | none | – | UI | Local flag only |
| E8 | Viewer counts, family & upcoming events | Engagement content | `/avatar-live`, `/avatar-live/family`, `data/liveStreams.ts` | none | none | – | MOCK | Fabricated numbers/events |

## F — Site & miscellaneous

| ID | Feature | Purpose | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| F1 | Contact form | Message the team | `/contact` (`Contact.tsx`) | `POST /api/contact/send` (stub; **not called**) | none | – | MOCK | UI fakes success via `setTimeout`; messages lost |
| F2 | Newsletter | Email capture | Footer (`Footer.tsx`) | `POST /api/newsletter/subscribe` (stub; **not called**) | none | – | MOCK | Clears input only |
| F3 | Blog | Articles | `/blog` (`data/blogPosts.ts`) | none | none | – | UI | Static; no detail route found |
| F4 | 3D Solar System | Explorer | `/solar-system` iframe → `VITE_SOLAR_SYSTEM_URL` (default `http://localhost:3000`); `components/three/*` | none | none | `solar-system-app` (Auth0) | UNV | Production URL unknown; third-party code; stray copy in `frontend/public/` |
| F5 | Landing/home/about/tools grid | Marketing | `/`, `/about`, `components/*`, `data/tools.ts` | none | none | – | UI | Static presentation; large bundle |
| F6 | Platform: health, CORS, error envelope | Operations | – | `GET /api/health`, CORS in `index.ts`, error handler | – | – | IMPL-NV | CORS rejection → HTTP 500; two envelope shapes; no helmet/rate limit |
