# Backend API Reference

Paths relative to `backend/src/`. Entry: `index.ts`. Base URL `/api`. See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md), [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md). **No endpoint was called during the investigation**; test status for every row is "not verified; no automated tests".

## 1. Architecture

* Express 4, ESM, aliases `@/` (src) and `@root/` (backend root). Global: `cors` (allowlist), `express.json({limit:"20mb"})`, `urlencoded`.
* Modules (`modules/<name>/`): `*.route.ts` → `*.controller.ts` → `*.service.ts` (+ `*.validators.ts` Joi, `*.types.ts`). Older flat code: `routes/`, `controllers/`, `services/`.
* Two envelopes: modules use `sendResponse` → `{status:boolean, data, message}`; legacy/AI routes and Darshan use `{success, data|error}` or bare JSON. The final error handler delegates to `errorHandler` only when `err.statusCode` is a number; otherwise `{success:false,error}`.
* Auth: `auth(...roles)` from `middleware/authMiddleware.ts` (Bearer JWT; role hierarchy). **No rate limiting, no helmet, no request logging.**
* DB: Prisma client with `@prisma/adapter-pg` (`prisma.ts`, `DATABASE_URL`).

## 2. Mounted endpoints

Auth column: **P** public, **U** requires token (USER+), **A** requires ADMIN+.

### 2.1 Platform and stubs (inline in `index.ts`)

| Method + path | Auth | Behaviour | Frontend consumer | Status |
|---|---|---|---|---|
| GET `/api/health` | P | `{success:true,message}` | none | IMPL-NV |
| GET `/api/zodiac/signs` | P | Hard-coded 12 signs | `apiService` (only via unused `useApi`) | IMPL-NV (unused) |
| GET `/api/zodiac/signs/:sign` | P | Hard-coded; unknown → Aries | same | IMPL-NV (unused) |
| POST `/api/newsletter/subscribe` | P | 400 if no `email`; else echoes success; **stores nothing** | none (UI doesn't call) | MOCK |
| POST `/api/contact/send` | P | 400 unless name,email,subject,message; success; **sends/stores nothing** | none (UI doesn't call) | MOCK |

### 2.2 Auth — `/api/auth` (`modules/auth/auth.route.ts`)

| Method + path | Auth | Validation (Joi) | Service | Notes |
|---|---|---|---|---|
| POST `/register` | P | profile + password + phone | `register` | 201; see A1 |
| POST `/verify-otp` | P | email, 6-digit otp, type | `verifyOtp` | returns user + tokens |
| POST `/resend-otp` | P | email, type | `resendOtp` | 60 s cooldown (429) |
| POST `/verify-phone` | P | email, accessToken | `verifyPhone` | MSG91 server check |
| GET `/msg91-config` | P | – | `getMsg91Config` | returns widgetId, tokenAuth; 500 if unset |
| POST `/login` | P | email, password | `login` | may return `{requiresVerification}` |
| POST `/google` | P | idToken | `googleAuth` | |
| POST `/complete-profile` | U | profile + DOB | `completeProfile` | |
| POST `/refresh` | P | refreshToken | `refresh` | rotation |
| POST `/logout` | P | refreshToken | `logout` | |
| POST `/logout-all` | U | – | `logoutAll` | |
| POST `/forgot-password` | P | email | `forgotPassword` | |
| POST `/reset-password` | P | token, password | `resetPassword` | |

Logic: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) A1–A9. DB: users, roles, user_role_mapping, sessions, otp_verifications, password_reset_tokens. External: Resend, MSG91, Google.

### 2.3 Admin — `/api/admin` (router-level `auth("ADMIN")`)

| Method + path | Purpose |
|---|---|
| GET `/dashboard` | `{user, role}` after DB re-check |
| GET/POST `/puja/temples`; GET/PUT/DELETE `/puja/temples/:id` | Temples CRUD (list: `search,page,limit≤100`) |
| POST `/puja/temples/:id/images` (multipart `images`, ≤10 × ≤10 MB) | Upload to Cloudinary |
| DELETE `/puja/images/:imageId` | Delete image (remote first) |
| GET/POST `/puja/temples/:id/pujas`; PUT/DELETE `/puja/pujas/:pujaId` | Pujas CRUD |
| GET/POST `/chadhawa`; GET `/chadhawa/temples/:templeId`; GET/PUT/DELETE `/chadhawa/:id` | Offerings CRUD |
| GET/POST `/shop/categories`; GET `/shop/categories/all`; GET/PATCH/DELETE `/shop/categories/:id`; POST `/shop/categories/:id/image` | Categories |
| GET/POST `/shop/products`; GET/PATCH/DELETE `/shop/products/:id`; POST `/shop/products/:id/image` | Products |

Validation limits: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) D8–D11. Consumers: `features/admin/api/*`.

### 2.4 Public catalogue

| Method + path | Behaviour |
|---|---|
| GET `/api/temples` , `/api/temples/:slug` | All temples (images+pujas); 404 "Temple not found" |
| GET `/api/chadhawa`, `/api/chadhawa/:slug` | Temples with ≥1 active offering; active offerings ordered |
| GET `/api/shop/categories`, `/api/shop/products`, `/api/shop/products/:slug` | Active only; detail 404 if inactive product/category |

### 2.5 AI / speech (all public, no rate limit)

| Method + path | Provider / model | Validation | Frontend consumer |
|---|---|---|---|
| GET `/api/interpretation/horoscope/:sign` | OpenRouter `openai/gpt-4-turbo-preview` | none on sign | `DailyHoroscopes` (B1) |
| POST `/api/interpretation/birth-chart` | same; mock text only on HTTP 402 | `birthData` required | `useInterpretBirthChart` (no page uses it) |
| GET `/api/interpretation/compatibility?sign1&sign2` | same | both required | none |
| POST `/api/interpretation/chart-chat` | same | `question`,`birthData` | none |
| POST `/api/birthchart/analyze` | OpenRouter `google/gemma-4-31b-it:free` | `name`,`zodiac` | `BirthChart` (B3) |
| POST `/api/birthchart/chat` | same | `question` | none |
| POST `/api/compatibility/analyze` | same | `p1.name`,`p2.name` (and `scores` assumed) | none (call commented out) |
| POST `/api/name-analysis/narrative` | same; **mock fallback with 200** | name,dob,lifePath,destiny | B6 |
| POST `/api/inner-voice/{diagnose,guru-chat,analyze-journal,wisdom}` | same | text/message/entry/situation | none |
| POST `/api/inner-voice/tts` | Sarvam | text | none |
| POST `/api/tts` | Sarvam `bulbul:v3`, speaker `manan`, ≤500 chars | text | `VoiceConsultation`, `InnerVoiceChat` |
| POST `/api/tarot/reading` | OpenRouter `google/gemma-3-27b-it` | `mode`,`cards[]` | B7 |
| POST `/api/palm-reading` | OpenRouter `anthropic/claude-3.5-sonnet` (vision) | `imageBase64`,`imageType` | **none** |

### 2.6 Live Darshan — `/api/darshan` (all public)

| Method + path | Behaviour |
|---|---|
| GET `/temples`, `/temples/:slug` | DTO `{name,slug,youtubeChannelId,currentLiveVideoId,isLive,lastCheckedAt}`; envelope `{success,data}` |
| GET `/events` | SSE stream of DTO updates; 30 s heartbeat |
| GET `/websub/callback` | echoes `hub.challenge` (400 if missing) |
| POST `/websub/callback` | `express.text` for atom/xml; 204 immediately; async processing |

Background: `startDarshanRefreshLoop()` (WebSub subscribe/renew, stale-live poll). Details: E1–E4.

## 3. Unmounted / obsolete code (not reachable)

| Code | Why unreachable | Notes |
|---|---|---|
| `routes/horoscopeRoutes.ts` (`/daily`, `/by-sign/:sign`, `/create`) + `controllers/horoscopeController.ts` | never imported in `index.ts` | `/create` returns 501; uses legacy auth |
| `services/astroApiService.ts` | only used by the above | external `ASTRO_API_BASE_URL` |
| `middleware/auth.ts`, `config/environment.ts` | only used by the above + tests | claim `userId`, hard-coded default JWT secret fallback |
| `middleware/birthDataValidation.ts` | unused | |
| Mounted-but-never-called: `/api/palm-reading`, `/api/inner-voice/*`, `/api/compatibility/analyze`, `/api/birthchart/chat`, `/api/interpretation/{birth-chart,compatibility,chart-chat}`, `/api/zodiac/*`, newsletter/contact | reachable, no frontend consumer | |

## 4. External provider calls

| Provider | Where | Failure handling |
|---|---|---|
| OpenRouter | `index.ts` (tarot, palm), `routes/*`, `services/chatgptService.ts`, `controllers/chartChatController.ts` | 500 with provider message, except name-analysis (mock 200) and interpretation/birth-chart (mock on 402) |
| Sarvam | `/api/tts`, `/api/inner-voice/tts` | 502/500 |
| Resend | `utils/mailer.ts` | OTP/forgot sends are caught + logged (API still succeeds) |
| MSG91 | `utils/msg91.ts` (5 s timeout) | returns `{success:false}` → 400 |
| Google | `utils/googleAuth.ts` | 401 |
| Cloudinary | `config/cloudinary.ts` | 400 with mapped message |
| YouTube Data API / WebSub hub | `modules/darshan/*` | logged; state unchanged |

## 5. Rate limiting and security limitations

None of the endpoints has rate limiting; AI/TTS/palm endpoints are unauthenticated; JSON limit 20 MB globally; CORS rejection returns 500; SSE unbounded; WebSub callback unsigned. See [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md) and [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md).

## 6. Test and verification status

* `tsc --noEmit`: clean (no diagnostics printed).
* Jest tests (`__tests__/middleware/auth.test.ts`, `birthDataValidation.test.ts`) target dead code and **cannot run** (`jest`/`ts-jest` not installed; no `test` script; tsconfig excludes them).
* No integration or contract tests exist. Proposed tests: [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md).
