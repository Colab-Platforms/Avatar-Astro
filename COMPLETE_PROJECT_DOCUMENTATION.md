# Complete Project Documentation — Avatar-Astro ("Spiritual AI")

> **Basis.** Branch `dev-vishwa`, commit `58a6f0e`, working tree as of 2026-10-21. Built from reading the source files plus a second-pass verification of an earlier investigation. **Nothing was run end to end**: no server, database, browser or provider was started, and no migration or seed was executed. Executed checks: backend `tsc --noEmit` (exit 0), frontend `tsc -p tsconfig.app.json --noEmit` (40 errors), frontend `vitest run` (1 trivial test passed). Evidence words: **Confirmed** (read in source), **Inferred**, **Unknown**. No secret values appear; only environment variable names.

> **Coverage limits.** The 1,000–2,000-line page components (`BirthChart.tsx`, `CompatibilityChecker.tsx`, `TarotExperience.tsx`, `InnerVoiceChat.tsx`, `ZodiacDetail.tsx`, `PalmReading.tsx`) were traced by symbol search, targeted reads of their logic and API calls, and the earlier investigation, not read line by line. Media assets, `solar-system-app` internals and the 49 shadcn primitives were counted, not analysed. Production configuration, hosting and database state are not in the repository.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack and Architecture](#2-technology-stack-and-architecture)
3. [Project Directory Structure](#3-project-directory-structure)
4. [Complete Feature Inventory](#4-complete-feature-inventory)
5. [Detailed Feature-by-Feature Documentation](#5-detailed-feature-by-feature-documentation)
6. [Business Logic and Calculation Formulas](#6-business-logic-and-calculation-formulas)
7. [Frontend Pages and Components](#7-frontend-pages-and-components)
8. [Backend Architecture and API Reference](#8-backend-architecture-and-api-reference)
9. [Database Schema and Migrations](#9-database-schema-and-migrations)
10. [End-to-End User Journeys and Data Flows](#10-end-to-end-user-journeys-and-data-flows)
11. [External Integrations and Tools](#11-external-integrations-and-tools)
12. [Authentication, Authorization, Security, and Privacy](#12-authentication-authorization-security-and-privacy)
13. [Error Handling and Logging](#13-error-handling-and-logging)
14. [Testing and Acceptance Criteria](#14-testing-and-acceptance-criteria)
15. [Environment Configuration and Local Setup](#15-environment-configuration-and-local-setup)
16. [Known Issues and Technical Debt](#16-known-issues-and-technical-debt)
17. [Feature Dependencies and Integration Map](#17-feature-dependencies-and-integration-map)
18. [Missing Functionality and Unresolved Questions](#18-missing-functionality-and-unresolved-questions)
19. [Prioritized Development Recommendations](#19-prioritized-development-recommendations)
20. [Source File Reference Index](#20-source-file-reference-index)

---

## 1. Project Overview

#### 1. What the project is

A React/Vite single-page site ("Spiritual AI" / "Avatar Learner" in UI strings) with an Express + Prisma + PostgreSQL backend. It offers:

* **Astrology-style readings** — daily horoscope, birth chart, compatibility, numerology name report, tarot, palm scan. None is backed by an ephemeris; outputs are local tables, numerology math, hash-derived pseudo-scores, or LLM text.
* **Inner Voice / AI Guru** — a "Vedic pandit" chat, diagnosis report, voice mode, karma score, journal, shloka tool (LLM calls made **from the browser** to Groq).
* **Devotion catalogue** — Puja (temples/pujas), Chadhawa (offerings), Shop (products) with an admin CMS and Cloudinary images. **Booking/cart/checkout/donation controls are UI only.**
* **Live Darshan** — YouTube temple live streams with WebSub push, safety-net polling and SSE.
* **Authentication** — email/password, email OTP, MSG91 phone OTP, Google sign-in, rotating refresh tokens, roles.

#### 2. Current implementation status (54 features)

| Status | Count |
|---|---|
| VERIFIED WORKING | 0 |
| IMPLEMENTED — NOT END-TO-END VERIFIED | 30 |
| PARTIALLY IMPLEMENTED | 4 |
| UI ONLY | 8 |
| BACKEND ONLY | 4 |
| MOCKED | 6 |
| UNVERIFIED | 1 |
| NOT IMPLEMENTED | 1 |

Per-feature detail: Section 4.

#### 3. Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript (`strict:false`), react-router v6, TanStack Query, Zustand (persisted), react-hook-form + zod, Tailwind + shadcn/Radix, GSAP, Framer Motion, three.js / @react-three, MediaPipe tasks-vision, jsPDF, Recharts |
| Backend | Node (ESM), Express 4, TypeScript, Joi, JWT (`jsonwebtoken`), bcrypt, multer, axios/fetch |
| Database | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` (schema split in `backend/prisma/schema/`) |
| Media | Cloudinary |
| Auth providers | Resend (email), MSG91 (phone), Google Identity Services |
| AI / speech | OpenRouter (backend), Groq (browser), Sarvam AI TTS (backend) |
| Live streams | YouTube WebSub hub, YouTube Data API v3, YouTube IFrame API |
| Hosting hints | Vercel (`frontend/vercel.json`, `api/tts.ts`), Render (comments, CORS) — **actual deployment unknown** |

MongoDB: **no MongoDB code exists** in the repository; only stale `MONGODB_*` keys in a local `.env`. See Section 9.

#### 5. Most important known limitations

1. **No commerce.** Puja Book, Chadhawa "Proceed to Offer", Shop Add to Cart / Buy Now, Darshan Donate have no handlers; no Order/Booking/Payment/Cart tables.
2. **No real birth chart / Kundali.** Birth time is never used; birth place only reaches an LLM prompt as a city string. Birth-chart and compatibility scores are hash-derived pseudo-random numbers.
3. **Groq API key ships in the browser bundle** (`VITE_GROQ_API_KEY`); backend AI/TTS endpoints have no auth or rate limiting.
4. **Auth gaps:** OTP brute-forceable, account pre-hijack path, possible phone-match bypass, user enumeration.
5. **Live Darshan:** unsigned webhook; unrelated uploads can mark a live stream offline.
6. **Mocked UI:** Contact, Newsletter, ₹499 paywall, compatibility chat, viewer counts, hard-coded LIVE flags.

Full list: Section 16.

#### 7. Conventions

* Status labels: IMPLEMENTED — NOT END-TO-END VERIFIED (**IMPL-NV**), PARTIALLY IMPLEMENTED (**PART**), UI ONLY (**UI**), BACKEND ONLY (**BE**), MOCKED (**MOCK**), UNVERIFIED (**UNV**), NOT IMPLEMENTED (**NOT**), BROKEN, VERIFIED WORKING.
* Feature IDs follow the investigation: A1–A9, B1–B9 (with B6b, B8b, B9a, B9b), C1–C8, D1–D11, E1–E8, F1–F6.
* Line numbers are approximate (taken from the investigation) and may drift; function names are the stable anchor.
* "[UNKNOWN]" means it cannot be established from the repository.
* No secret values appear in these documents; only environment variable **names**.


---

## 2. Technology Stack and Architecture

Related: Section 8, Section 9, Section 11.

#### 1. Repository layout

```
Avatar-Astro/
├─ backend/                 Express + Prisma API
│  ├─ src/index.ts          entry point; also holds inline routes (zodiac, newsletter, contact, tts, tarot, palm)
│  ├─ src/modules/          auth, admin, puja, chadhawa, shop, darshan  (controller/route/service/validators/types)
│  ├─ src/routes/           birthChart, compatibility, nameAnalysis, innerVoice, interpretation, horoscope(unmounted)
│  ├─ src/services/         chatgptService (OpenRouter), astroApiService (dead)
│  ├─ src/controllers/      chartChat, horoscope(dead), interpretation
│  ├─ src/middleware/       authMiddleware (active), auth (legacy/dead), upload, errorHandler, birthDataValidation (dead)
│  ├─ src/utils/            mailer (Resend), msg91, googleAuth, auth (bcrypt), ApiError, responseUtils
│  ├─ src/config/           cloudinary.ts, environment.ts (legacy), temples.json (Darshan channels)
│  ├─ prisma/schema/*.prisma, prisma/migrations (5), prisma/seeds/*
│  └─ src/__tests__/        2 Jest files for dead code (cannot run)
├─ frontend/                Vite SPA
│  ├─ src/App.tsx, main.tsx
│  ├─ src/pages/            reading pages, Inner Voice, Puja/Chadhawa/Shop, AvatarLive
│  ├─ src/features/         auth, admin, puja, chadhawa, shop (api/hooks/types)
│  ├─ src/components/       UI kit (shadcn), ai-guru, NameDestinyReport, three, palm, tarot, auth
│  ├─ src/lib/              api.ts (mostly legacy), authClient.ts, numerology.ts, palmAnalysis/
│  ├─ src/store/authStore.ts, src/hooks/, src/data/ (static content), src/routes/ (guards)
│  ├─ api/tts.ts            Vercel serverless TTS copy
│  └─ public/               assets + stray copy of solar-system files
├─ solar-system-app/        separate third-party-authored Express static app with Auth0 config (iframe target)
├─ api/tts.ts               root TTS serverless copy (differs from frontend/api/tts.ts)
└─ *.md, video.txt          root status docs (unverified), stray artefacts
```

#### 2. Technologies and responsibilities

| Technology | Responsibility |
|---|---|
| React + react-router | SPA, client routing, lazy-loaded auth/admin/devotion pages |
| TanStack Query | Server state for catalogues, Darshan, admin; Darshan cache patched by SSE |
| Zustand (`persist`, key `auth`) | Session (user, access/refresh tokens) in localStorage |
| react-hook-form + zod | Auth forms |
| Express | HTTP API, CORS, JSON body (20 MB), error envelope |
| Prisma + PostgreSQL | All persistent data (13 tables) |
| Joi | Validation in auth/puja/chadhawa/shop modules only |
| axios / fetch | Provider calls (OpenRouter, Sarvam, MSG91, YouTube, WebSub hub) |
| multer + Cloudinary SDK | Admin image upload (memory storage → Cloudinary) |

#### 3. Entry points

* Backend: `backend/src/index.ts` → mounts routers, starts `startDarshanRefreshLoop()` then `app.listen(PORT)`. Dev: `tsx watch`; prod: `tsc && tsc-alias` → `node dist/src/index.js`. `PORT` defaults to 5001 in `index.ts` if unset (local `.env` sets 5000).
* Frontend: `frontend/src/main.tsx` → `App.tsx`. Dev server port 8081 with `/api` proxy to `localhost:5000` (`vite.config.ts`).
* Default API base in the frontend: `VITE_API_URL` or `http://localhost:5000/api`.

#### 4. Routing architecture

* **Frontend:** `App.tsx` defines three route groups: (1) standalone — `/solar-system`, auth pages (`PublicRoute`), `/google-onboarding` (`GoogleOnboardingRoute`), `/admin/*` (`AdminRoute`); (2) a catch-all `*` that wraps `AnimatedRoutes` in `CosmicBackground` + `Layout`. Full inventory: Section 7.
* **Backend:** path prefixes `/api/auth`, `/api/admin`, `/api/temples`, `/api/chadhawa`, `/api/shop`, `/api/interpretation`, `/api/compatibility`, `/api/birthchart`, `/api/name-analysis`, `/api/inner-voice`, `/api/darshan`, plus inline `/api/health`, `/api/zodiac/*`, `/api/newsletter/subscribe`, `/api/contact/send`, `/api/tts`, `/api/tarot/reading`, `/api/palm-reading`. Details and mounted-vs-dead status: Section 8.

#### 5. Authentication architecture (summary)

Access JWT (`{id, role}`, 1 d) + opaque refresh token (SHA-256 hashed in `sessions`, 30 d, rotated on use). Client attaches Bearer, deduplicates a single refresh on 401. Role hierarchy enforced by `auth(...roles)` middleware (role read from token). Only `/api/admin/*`, `/auth/complete-profile`, `/auth/logout-all` require a token; **no end-user feature is login-gated**. Full detail: Section 12.

#### 6. Database architecture

PostgreSQL only (Prisma). 13 tables: `users`, `roles`, `user_role_mapping`, `sessions`, `otp_verifications`, `password_reset_tokens`, `temples`, `temple_images`, `pujas`, `chadhawas`, `shop_categories`, `shop_products`, `darshan_channels`. **MongoDB is not used by any code**; leftover `MONGODB_URI`/`MONGODB_DNS_SERVERS` keys exist only in a local `.env` (history: a prior commit message "changed polling to SSE and removed mongodb"). Everything from readings and AI chats is stored only in browser `localStorage`. See Section 9.

#### 7. External services

OpenRouter, Groq, Sarvam, Resend, MSG91, Google Identity, Cloudinary, YouTube (WebSub + Data API + IFrame), Nominatim, MediaPipe CDN assets; dead: external "astro-api"; separate: Auth0 inside `solar-system-app`. See Section 11.

#### 8. Architecture diagram (as implemented)

```mermaid
flowchart LR
  subgraph Browser["Browser SPA"]
    Auth["Auth pages + authClient + Zustand"]
    Read["Reading pages"]
    IV["Inner Voice pages + VoiceConsultation"]
    Dev["Puja / Chadhawa / Shop / Darshan"]
    Adm["Admin"]
    LS[("localStorage")]
  end
  subgraph API["Express API"]
    AuthR["/api/auth"]
    AdmR["/api/admin"]
    Pub["/api/temples, /api/chadhawa, /api/shop"]
    DarR["/api/darshan + WebSub + timers"]
    LLM["/api/interpretation, birthchart, name-analysis, tarot"]
    TTS["/api/tts"]
    Unused["mounted but never called by the UI: palm-reading, inner-voice, compatibility analyze, birthchart chat"]
    Dead["not mounted at all: horoscopeRoutes + astroApiService"]
  end
  PG[("PostgreSQL")]
  Auth --> AuthR --> PG
  Adm --> AdmR --> PG
  Dev --> Pub --> PG
  Dev --> DarR --> PG
  Read --> LLM --> OR["OpenRouter"]
  IV -->|"direct, key in bundle"| GQ["Groq"]
  IV --> TTS --> SV["Sarvam"]
  IV <--> LS
  AuthR --> RS["Resend"]
  AuthR --> MS["MSG91"]
  AuthR --> GG["Google"]
  AdmR --> CL["Cloudinary"]
  DarR <--> YT["YouTube WebSub + Data API"]
  Read --> NM["Nominatim"]
```

#### 9. Hosting and deployment dependencies

* Known only from hints: Vercel (`vercel.json` SPA rewrite, `api/tts.ts`, a hard-coded `https://avatar-astro.vercel.app` CORS origin) and Render (comments about idle timeouts; default `astro-api` URL). **Actual hosts, domains, and environments are [UNKNOWN].**
* Live Darshan requires a **publicly reachable HTTPS backend** (`BACKEND_PUBLIC_URL`) and a single long-running process (in-process timers and EventEmitter); sleeping or multi-instance hosting will break push detection and SSE fan-out.
* `frontend/vercel.json` only configures build/output and SPA rewrites; production `VITE_*` values are not in the repo (earlier committed `.env.production`/`.env.development` contained only `VITE_API_URL`, since deleted).


---

## 3. Project Directory Structure

Inventory taken from `git ls-files` on branch `dev-vishwa` at `58a6f0e` plus untracked `docs/` and `package-lock.json` (2026-10-19). "Reachable" means imported from an entry point (`main.tsx` / `index.ts`) by static search of import statements — a heuristic, **not** a runtime trace; dynamic imports and barrel files were checked by hand where noted.

#### 1. Totals

| Area | Tracked files | Notes |
|---|---|---|
| `backend/` | 97 | 64 TS files under `src/`, 5 Prisma schema files, 5 migrations, 6 seed files |
| `frontend/` | 344 | incl. 105 `.bin` shim files (committed by mistake), 49 shadcn UI files, images |
| `solar-system-app/` | 17 | separate third-party-style app (Auth0) |
| root | 19 | status/summary `.md` files, `api/tts.ts`, `video.txt`, `package-lock.json` (untracked) |
| Media | 216 tracked images/video/3D (png/jpg/svg/webp/mp4/glb) | not individually catalogued |
| Overall | 537 non-media tracked files (incl. 105 `.bin` shims) + 216 media files | counts from `git ls-files` with extension filter |

Source line counts (largest): `BirthChart.tsx` 2018, `CompatibilityChecker.tsx` 2078, `TarotExperience.tsx` 2060, `InnerVoiceChat.tsx` 1439, `ZodiacDetail.tsx` 1275, `PalmReading.tsx` 1019, `ZodiacSigns.tsx` 963, `InnerVoice.tsx` 675, `auth.service.ts` 740, `shop.service.ts` 538, `puja.service.ts` 470, `index.ts` 580.

#### 2. Subprojects, languages and tooling

| Subproject | Language / runtime | Frameworks | Build / run |
|---|---|---|---|
| `backend/` (`astrology-backend`) | TypeScript 5.9, Node ESM (`"type":"module"`, `NodeNext`) | Express 4, Prisma 7 + `@prisma/adapter-pg`, Joi, jsonwebtoken, bcrypt (+ unused bcryptjs, express-validator), multer, cloudinary, resend, google-auth-library, axios, dayjs | `tsx watch src/index.ts` / `tsc && tsc-alias` → `node dist/src/index.js` |
| `frontend/` (`vite_react_shadcn_ts`) | TypeScript (strict:false), React 18 | Vite 5 + SWC, react-router 6, TanStack Query 5, Zustand 5, RHF + zod, Tailwind 3 + shadcn/Radix, GSAP, Framer Motion, three/@react-three, MediaPipe tasks-vision, jsPDF, Recharts, Vitest 3 | `vite` (port 8081) / `vite build` |
| `solar-system-app/` | JS, Node | Express static server, Auth0 config files, vanilla JS (`script.js`, `drawer.js`) | `server.js` / `scripts/build-static.js` |
| `api/tts.ts`, `frontend/api/tts.ts` | TS (Vercel serverless) | – | deployed by Vercel only if a project is rooted there [UNKNOWN] |

Tooling artefacts that are not product features: `lovable-tagger` (Lovable scaffold), `rollup-plugin-visualizer` (**`open: true` — a browser tab opens on every build/dev start**), `components.json` (shadcn), `bun.lockb` alongside `package-lock.json` (two lockfiles).

#### 3. Backend inventory (`backend/src`)

| Path | Role | Reachable? |
|---|---|---|
| `index.ts` | entry; CORS; inline routes: health, zodiac ×2, newsletter, contact, TTS, tarot, palm; error handler; starts Darshan loops | entry |
| `modules/auth/` (route, controller, service, validators, types) | registration, OTP, phone, login, Google, sessions, reset | mounted `/api/auth` |
| `modules/admin/` | dashboard + mounts puja/chadhawa/shop admin routers | mounted `/api/admin` |
| `modules/puja/` (route, public.route, controller, service, validators, types) | temples/pujas/images | mounted (public `/api/temples`, admin) |
| `modules/chadhawa/` | offerings | mounted |
| `modules/shop/` | categories/products | mounted |
| `modules/darshan/` (controller, events, public.route, refresh, service, types, websub, youtube) | live streams | mounted + background timers |
| `routes/birthChartRoutes.ts`, `compatibilityRoutes.ts`, `nameAnalysisRoutes.ts`, `innerVoiceRoutes.ts`, `interpretationRoutes.ts` | AI routes | mounted |
| `routes/horoscopeRoutes.ts` | legacy horoscope router | **not mounted (dead)** |
| `controllers/chartChatController.ts`, `interpretationController.ts` | handlers for interpretation routes | mounted |
| `controllers/horoscopeController.ts` | | dead |
| `services/chatgptService.ts` | OpenRouter helper (3 functions) | used by interpretation controller |
| `services/astroApiService.ts` | external "astro-api" client | dead (only dead code imports it) |
| `middleware/authMiddleware.ts` | `auth(...roles)` JWT/role guard | active |
| `middleware/auth.ts`, `birthDataValidation.ts`, `config/environment.ts` | legacy | dead (only tests/dead code) |
| `middleware/upload.ts` (multer), `errorHandler.ts` | | active |
| `config/cloudinary.ts` | upload/delete helpers | active |
| `config/temples.json` | 18 Darshan channel definitions (4 without channel ID) | seed input |
| `utils/mailer.ts` (Resend), `msg91.ts`, `googleAuth.ts`, `auth.ts` (bcrypt helpers), `ApiError.ts`, `responseUtils.ts`, `statusCodes.ts` | helpers | active |
| `user.d.ts` | Express request augmentation | active (types) |
| `__tests__/middleware/{auth,birthDataValidation}.test.ts` | Jest tests of dead code | **cannot run** (no jest/ts-jest, no script; excluded from tsconfig) |
| `.gitkeep` in empty `controllers/`, `middleware/`, `models/`, `routes/`, `utils/` | placeholders | – |
| `prisma/schema/{schema,auth,temple,shop,darshan}.prisma`, `prisma/migrations/*` (5), `prisma/seeds/*` (6), `prisma.ts`, `prisma.config.ts` | data layer | see Section 9 |
| `skills-lock.json` | Claude Code skills lock (tooling artefact) | – |

#### 4. Frontend inventory (`frontend/src`)

| Area | Contents | Notes |
|---|---|---|
| Entry | `main.tsx`, `App.tsx` (routes, providers, lazy-loaded pages), `index.css`, `App.css` | 3 route groups; see Section 7 |
| Pages (`pages/`) | Index, About, Blog, Contact, NotFound, SolarSystem, DailyHoroscopes, ZodiacSigns, ZodiacDetail, BirthChart, CompatibilityChecker, NameDestinyReportPage, TarotExperience, PalmReading, InnerVoice (+Chat, Dashboard, Journal, Wisdom), `Puja/*`, `Chadhawa/*`, `Shop/*`, `AvatarLive/*` | `Shop/index` and `AvatarLive/index` are reached by `lazy(() => import("./pages/…/index"))` (not dead) |
| Features (`features/`) | `auth` (pages, components, hooks, schemas, api, utils), `admin` (api, components, hooks, pages), `puja`, `chadhawa`, `shop` (api/hooks/types each) | `features/auth/index.ts` barrel unused |
| Components | layout (Layout, Navbar, Footer, CosmicBackground, PageTransition, Loader…), `ai-guru/*` (14), `NameDestinyReport/*` (index + 14 sections + lib), `palm/*` (3), `tarot/*`, `hero/*`, `three/*` (8), `astrology/ElementSelector`, `auth/Msg91PhoneWidget`, `ui/*` (shadcn, 49 files) | |
| Libraries (`lib/`) | `api.ts` (legacy client; only Darshan calls are live), `authClient.ts`, `numerology.ts`, `palmAnalysis/*` (6), `utils.ts` | |
| State | `store/authStore.ts` (Zustand persist `auth`), `context/NavigationContext.tsx`, React Query | |
| Hooks | `useApi` (dead), `useChartChat` (dead), `useConsultationGuard`, `useDarshanLiveEvents`, `useDarshanTemple(s)`, `useInterpretation`, `useLanguageDetection`, `useSpeechRecognition`, `useTextToSpeech`, `useVerifyPhone` (a second copy also exists under `features/auth/hooks`), `use-mobile`, `use-toast` (+ duplicate under `components/ui`) | |
| Data (`data/`) | `blogPosts`, `features`, `liveStreams`, `planetaryData`, `tarotData`, `tools`, `zodiacData` (static content); `products.ts`, `temples.ts` (legacy dummy data, no importers — only referenced in comments) | |
| Guards (`routes/`) | `AdminRoute`, `ProtectedRoute.tsx` (exports `GoogleOnboardingRoute`, used in `App.tsx`; no other route is login-guarded), `PublicRoute` | |
| Tests | `test/example.test.ts` (1 trivial test), `test/setup.ts` | |

##### 4.1 Statically unreferenced frontend modules (candidate dead code)

`components/CosmicCursor.tsx`, `FloatingPlanets.tsx`, `ScrollStorytelling.tsx`, `StarField.tsx`; `components/three/{CloudLayer, MountainSilhouette, RealisticStarfield, ScrollytellingHero, SolarSystemOptimized, ZodiacFormation}.tsx` (`InteractiveSolarSystem` is imported only by the unreferenced `ScrollytellingHero`); `data/products.ts`, `data/temples.ts`; `hooks/useApi.ts`, `hooks/useChartChat.ts`; `features/auth/index.ts`; unused shadcn primitives: accordion, alert, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, tabs, toggle-group, toggle. Method: filename-based import search; **not** confirmed by bundler analysis. Verify with `stats.html` (visualizer) or `knip` before deleting.

##### 4.2 Stray / duplicated artefacts

| Path | Issue |
|---|---|
| `frontend/.bin/*` (committed shims) | node_modules `.bin` shims tracked in git; should be ignored |
| `frontend/public/{index.html, index (1).html, main.js, package (1).json, package-lock (1).json, vite.config.js, LICENSE, README.md, SECURITY.md}` | copy of a third-party app dropped into `public/` (served as static assets) |
| `frontend/api/tts.ts` vs root `api/tts.ts` | two differing Vercel functions |
| `backend/.gitignore`, `.env*` | `.env` untracked; `.env.example` incomplete |
| root `*.md`, `COMPLETION_SUMMARY.txt`, `video.txt`, `backend/darshan-live.txt` | historical status notes; claims inside are **unverified** (see Section 16) |
| `solar-system-app/` | separate app with its own `package.json`/Auth0 config; iframe target for `/solar-system` |

#### 5. Missing from the upload / evidence limits

* No `.env` values were read (names only); no production configuration, deployment settings, or database contents were available.
* Migration SQL is the only evidence of schema; production schema state is **[UNKNOWN]**.
* `frontend/.env.production` / `.env.development` were deleted in recent commits; their former contents (`VITE_API_URL`) are only in git history.
* No CI configuration, Dockerfile, or infrastructure-as-code exists in the repo.
* Media assets were counted but not opened.
* 18 large page components (1000+ lines) were traced by symbol/search and by the earlier investigation; every line was not re-read in this pass.

#### 6. Module ↔ feature cross-reference

| Module | Features |
|---|---|
| `modules/auth` + `features/auth` | A1–A9 |
| `routes/birthChartRoutes`, `BirthChart.tsx`, `lib/numerology` | B3, B4 |
| `NameDestinyReport/*`, `nameAnalysisRoutes`, `lib/numerology` | B6, B6b |
| `chatgptService`, `interpretation*`, `DailyHoroscopes` | B1 |
| Tarot inline route + `TarotExperience` | B7 |
| `palmAnalysis/*`, `PalmReading`, palm inline route | B8, B8b |
| `InnerVoice*`, `ai-guru/*`, `VoiceConsultation`, TTS | C1–C8 |
| `modules/puja|chadhawa|shop|admin`, `features/admin|puja|chadhawa|shop` | D1–D11 |
| `modules/darshan`, `pages/AvatarLive/*`, `useDarshan*` | E1–E8 |
| Contact/Footer/Blog/Index/solar-system | F1–F6 |

Details: Section 4, Section 8, Section 7.


---

## 4. Complete Feature Inventory

### 4.0 Status vocabulary used in this document

The feature tables below use short codes from the first-pass investigation. They map to the required labels as follows. **No feature qualifies as `VERIFIED WORKING`**: nothing was exercised end to end; the only executed checks are `tsc` (backend clean, frontend 40 errors) and one trivial frontend test.

| Code in tables | Official label | Count | Features |
|---|---|---|---|
| IMPL-NV | `IMPLEMENTED — NOT VERIFIED` | 30 | A1–A9, B1, B6, B7, C1, C2, C3, C5, C6, C8, D1, D3, D5, D8–D11, E1–E4, F6 |
| PART | `PARTIALLY IMPLEMENTED` | 4 | B3, B8, C4, D7 |
| UI | `UI ONLY` | 8 | D2, D4, D6, E5, E6, E7, F3, F5 |
| BE | `BACKEND ONLY / UNUSED` | 4 | B4, B8b, B9a (unmounted), C7 |
| MOCK | `MOCKED / SIMULATED` | 6 | B2, B5, B6b, E8, F1, F2 |
| UNV | `UNKNOWN / INSUFFICIENT EVIDENCE` | 1 | F4 |
| NOT | `NOT IMPLEMENTED` | 1 | B9b |
| — | `VERIFIED WORKING` | 0 | none |

Evidence for each classification is in the "Known limitations" column and in Section 5. Shop, cart, checkout, donation, booking, order and payment flows are `UI ONLY` (D2, D4, D6, E6): there are no order or payment tables or endpoints.

### Part: Feature Catalog

54 investigated features. Logic for each is in Section 5 (same IDs). Status labels: **IMPL-NV** = IMPLEMENTED — NOT END-TO-END VERIFIED · **PART** = PARTIALLY IMPLEMENTED · **UI** = UI ONLY · **BE** = BACKEND ONLY · **MOCK** = MOCKED · **UNV** = UNVERIFIED · **NOT** = NOT IMPLEMENTED. No feature is VERIFIED WORKING: nothing was run end-to-end (Section 14).

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

##### A — Authentication & accounts

Common: backend `modules/auth/{auth.route,auth.controller,auth.service,auth.validators}.ts`; DB `users`, `roles`, `user_role_mapping`, `sessions`, `otp_verifications`, `password_reset_tokens`; frontend `features/auth/*`, `lib/authClient.ts`, `store/authStore.ts`. Actor: visitor / signed-in user. Security detail: Section 12.

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

##### B — Astrology & readings

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

##### C — Inner Voice / AI Guru

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

##### D — Devotion commerce & admin

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

##### E — Live Darshan

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

##### F — Site & miscellaneous

| ID | Feature | Purpose | Frontend | Backend | DB | External | Status | Known limitations |
|---|---|---|---|---|---|---|---|---|
| F1 | Contact form | Message the team | `/contact` (`Contact.tsx`) | `POST /api/contact/send` (stub; **not called**) | none | – | MOCK | UI fakes success via `setTimeout`; messages lost |
| F2 | Newsletter | Email capture | Footer (`Footer.tsx`) | `POST /api/newsletter/subscribe` (stub; **not called**) | none | – | MOCK | Clears input only |
| F3 | Blog | Articles | `/blog` (`data/blogPosts.ts`) | none | none | – | UI | Static; no detail route found |
| F4 | 3D Solar System | Explorer | `/solar-system` iframe → `VITE_SOLAR_SYSTEM_URL` (default `http://localhost:3000`); `components/three/*` | none | none | `solar-system-app` (Auth0) | UNV | Production URL unknown; third-party code; stray copy in `frontend/public/` |
| F5 | Landing/home/about/tools grid | Marketing | `/`, `/about`, `components/*`, `data/tools.ts` | none | none | – | UI | Static presentation; large bundle |
| F6 | Platform: health, CORS, error envelope | Operations | – | `GET /api/health`, CORS in `index.ts`, error handler | – | – | IMPL-NV | CORS rejection → HTTP 500; two envelope shapes; no helmet/rate limit |


---

## 5. Detailed Feature-by-Feature Documentation

The canonical description of what each feature **actually does** in code. IDs match Section 4. Every entry answers the 14 required points, numbered:

1 purpose · 2 journey · 3 inputs/validation · 4 rules/branches · 5 calculations/defaults/fallbacks · 6 FE→BE flow · 7 DB · 8 external calls · 9 state/lifecycle · 10 auth/security · 11 success/failure · 12 status · 13 missing/defects · 14 verification.

Where several features share identical behaviour the shared block comes first and entries cross-reference it. "[UNKNOWN]" = not establishable from the repository. **Nothing was runtime-verified**; "status" never implies it was.

**Legend for value provenance (used throughout):**
**LOCAL-CALC** = real deterministic computation in our code · **PSEUDO** = deterministic hash/seeded pseudo-random value presented as a score · **LLM** = generated by a language model (non-reproducible) · **STATIC** = hard-coded content · **MOCK** = simulated response.

---

#### Shared block S-AUTH (applies to A1–A9)

* Tokens: access JWT `{id, role}` (`ACCESS_TOKEN_TTL "1d"`), refresh = 32 random bytes hex stored as SHA-256 in `sessions` (TTL 30 d, `REFRESH_TOKEN_TTL_DAYS`), rotated on use. Highest role wins (`getHighestRole`).
* Envelope `{status, data, message}` via `sendResponse`; controllers validate with Joi then delegate to `AuthService`.
* Client: Zustand persisted store `auth` (localStorage); `authRequest` (lib/authClient.ts) adds Bearer, on 401 performs one deduplicated `/auth/refresh` + retry, else logs out. No `/me` endpoint.
* No rate limiting anywhere. bcrypt cost 8. Details/vulnerabilities: Section 12.
* Env names: `JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL`, `MSG91_AUTH_KEY`, `MSG91_WIDGET_ID`, `MSG91_TOKEN_AUTH`, `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`.

#### A — Authentication

##### A1 Email/password registration
1. Create an account with full profile. 2. `/register` step 1 details → `POST /auth/register` → step 2 choose email vs phone verification → email: `POST /auth/resend-otp {REGISTER}` then `/verify-otp`; phone: MSG91 widget (A3). 3. Joi (`auth.validators.ts`): trimmed names; email lower-cased; password ≥8 with lower+upper+digit; phone `^[6-9]\d{9}$`; state/country/city required; `referralCode` optional (unused). 4. Existing account with email- **or** phone-verified → 409; existing **unverified** account is overwritten (names, password, phone, location, `isPhoneVerified=false`, `profileCompleted=true`); phone used by another non-deleted user → 409; `USER` role row missing → 500 "run db:seed first". 5. Password hashed bcrypt cost 8. 6. FE `RegisterPage` → `authApi.register` → `AuthService.register`. 7. Writes `users` (+`user_role_mapping`) in one `prisma.$transaction` for new users; update for existing unverified. 8. none. 9. Created (both flags false) → email verified or phone verified. 10. Public endpoint; no rate limit/CAPTCHA. 11. 201 "choose verification method"; errors → toast. 12. IMPL-NV. 13. Pre-hijack via overwrite (see A5); no cleanup of abandoned users; referral dead. 14. Unit tests with mocked Prisma (verified/unverified/phone conflict); integration on throwaway Postgres.

##### A2 Email OTP
1. Verify email at registration or unverified login. 2. `/verify-otp` form → `POST /auth/verify-otp`; "Resend" → `/resend-otp`. 3. `otp` exactly 6 digits; `type` ∈ {REGISTER, LOGIN}. 4. OTP = `Math.floor(100000+Math.random()*900000)`; stored as SHA-256; 10-min expiry; single use; resend blocked within 60 s of an unused code (429); prior unused codes marked used on resend; unknown email on resend → generic success. REGISTER success sets `isEmailVerified`. 5. Lookup is `(email, hash(otp), type, used=false)` newest first, then expiry check. 6. `OtpForm` → `authApi.verifyOtp` → `AuthService.verifyOtp` → `issueAuthTokens`. 7. `otp_verifications` create/update; `users` update. 8. Resend `emails.send` (`sendOtpEmail`); failures are caught and logged, API still reports "sent". 9. Created → used | expired (never purged). 10. Public; no attempt cap. 11. Success returns user+tokens; invalid → 400 "Invalid OTP"; expired → 400. 12. IMPL-NV. 13. Brute-forceable; weak RNG/hash; silent delivery failure; no purge. 14. Fake-timer tests for expiry/60 s; brute-force negative test (currently expected to fail).

##### A3 Phone verification (MSG91)
1. Verify phone as alternative to email OTP. 2. Register → choose phone → `GET /auth/msg91-config` → widget → `accessToken` → `POST /auth/verify-phone`. 3. `email`, `accessToken` required. 4. User must exist; already phone-verified → 409; MSG91 `widget/verifyAccessToken` must return `type:"success"`; **if** MSG91 returns a mobile it must end with the registered 10 digits; else check skipped; phone uniqueness re-checked. 5. 5 s provider timeout. 6. `useVerifyPhone` → `authApi.verifyPhone` → `AuthService.verifyPhone`. 7. `users.isPhoneVerified=true`. 8. MSG91 control API (`MSG91_AUTH_KEY` server-side). 9. unverified → phone-verified → session. 10. Unauthenticated; keyed by email only. 11. 200 session / 400 provider failure or mismatch / 409. 12. IMPL-NV. 13. Possible bypass if mobile field absent [response shape UNKNOWN]; DLT/template status UNKNOWN. 14. Mock `verifyMsg91AccessToken` with/without `mobile`; real test needs MSG91 sandbox.

##### A4 Password login
1. Sign in. 2. `/login` → `POST /auth/login`. 3. email + password required. 4. Unknown email → 404 "User with this Email doesn't exist"; no password hash (Google-only) → 401; wrong password → 401; **password checked before `isActive`**; inactive → 403; neither email nor phone verified → invalidate old LOGIN OTPs, create OTP, email it, return `{requiresVerification:true}`; else `ensureEmailProfileCompleted` (legacy local accounts auto-marked complete; Google-only without password stays incomplete) then tokens. 6. `useLoginMutation` applies session only when response is a full session. 7. `users`, `sessions`, `otp_verifications`. 8. Resend (unverified branch). 9. → session. 10. Public; enumeration via 404. 11. Tokens or toast message. 12. IMPL-NV. 13. No lockout; on `requiresVerification` the FE (`LoginPage.tsx`) navigates to `/verify-otp` with state `{email, type:"LOGIN"}` (confirmed in second pass). 14. Tests for each branch.

##### A5 Google sign-in
1. Passwordless sign-in. 2. Google Identity button → ID token → `POST /auth/google`. 3. `idToken` required (`referralCode` ignored). 4. `OAuth2Client.verifyIdToken` with audience `GOOGLE_CLIENT_ID`; `email_verified` required; match by `googleId`, else by email → **link** (sets `googleId`, `isEmailVerified=true`, keeps password), else create user (`authProvider=GOOGLE`, `profileCompleted=false`, USER role in a transaction); inactive → 403. 7. `users`, `user_role_mapping`, `sessions`. 8. Google token verification. 9. new Google user → profile incomplete → A6. 10. Public. 11. Tokens; 401 on bad token. 12. IMPL-NV. 13. Pre-hijack: attacker-registered unverified password survives linking. 14. Test link-on-unverified-local scenario (should invalidate password — currently does not).

##### A6 Complete profile
1. Capture phone/location/DOB for Google users. 2. Redirect to `/google-onboarding` when `profileCompleted===false` → `POST /auth/complete-profile` (Bearer). 3. Joi: names, phone regex, state/country/city, `dateOfBirth` ISO ≤ now. 4. Already complete → 409; DOB invalid/future → 400; **age ≥ 10** (`MIN_PROFILE_AGE_YEARS`); phone unique → 409. 5. DOB stored `startOf('day')`. 7. Updates `users`. 10. `auth("USER","ADMIN","SUPERADMIN")`. 12. IMPL-NV. 13. Phone not verified; enforcement of completion is UI redirect only (no backend gate on other routes); "Google Sheets sync" comment has no implementation. 14. Unit/integration tests.

##### A7 Sessions
1. Keep users signed in. 2. Automatic. 3. `refreshToken` required. 4. Refresh: hash lookup; missing → 401; expired → delete row + 401; inactive/deleted user → 403; else delete old session, create new, new access token (device header carried). Logout: delete by hash (public, idempotent). Logout-all: delete all of user's sessions (auth). 7. `sessions` (no index on `refresh_token`). 9. active → rotated | deleted. 10. Access tokens survive logout until expiry; no reuse detection; reset password doesn't revoke. 12. IMPL-NV. 13. No purge of expired sessions unless presented. 14. Rotation and concurrency tests (client dedups parallel refreshes).

##### A8 Forgot / reset password
1. Recovery. 2. `/forgot-password` → `/reset-password?token=`. 3. email; token + password (same policy). 4. Unknown email → **404** "Account … doesn't exist" (despite generic success text for known); prior unused tokens invalidated; token 32 random bytes hex (**plaintext in DB**), 1 h; reset requires unused + unexpired. 7. `password_reset_tokens`; reset runs `user.update` + token `used=true` in `$transaction`. 8. Resend; link base `FRONTEND_URL` (default `http://localhost:3000`, but Vite dev port is 8081). 12. IMPL-NV. 13. Enumeration, plaintext tokens, sessions not revoked; Google-only users can gain a password. 14. Mock mailer; token reuse/expiry tests.

##### A9 Role-based access
1. Restrict admin. 4. `auth(...allowedRoles)`: needs `Authorization: Bearer`; verifies JWT; hierarchy USER⊂ADMIN⊂SUPERADMIN; role taken from token. `/api/admin` router uses `auth("ADMIN")`. `AdminService.getDashboard` re-reads DB (`isActive`, `isDeleted`, roles). FE `AdminRoute` redirects unauthenticated→`/login`, non-admin→`/`. 7. reads `roles`, `user_role_mapping`. 10. Real enforcement is backend; FE guard is UX. 12. IMPL-NV. 13. Role stale ≤1 d; admin bootstrap is a seed script with a hard-coded personal email; legacy `middleware/auth.ts` uses `{userId}` claim and a default secret (dead). 14. Tests for forbidden/expired/malformed tokens and hierarchy.

---

#### B — Astrology & readings

##### Shared block S-LLM (B1, B3, B4, B6, B7, B8b, C7)
OpenRouter chat-completions with `OPENROUTER_API_KEY`; unauthenticated, no rate limit, no caching, body limit 20 MB. Prompts interpolate user input. JSON replies are parsed by stripping code fences / greedy `{…}` regex without schema validation. Model IDs: `openai/gpt-4-turbo-preview` (interpretation), `google/gemma-4-31b-it:free` (birthchart, compatibility, name-analysis, inner-voice), `google/gemma-3-27b-it` (tarot), `anthropic/claude-3.5-sonnet` (palm). Availability of IDs [UNKNOWN]. Output is **LLM**-generated: not reproducible; no accuracy requirement is defined anywhere in the repo.

##### B1 Daily Horoscope
1. Daily sign text. 2. `/horoscopes`: choose sign (12 from `zodiacData`) → effect calls `GET /api/interpretation/horoscope/:sign` → spinner → text. 3. `sign` path param, **not validated**. 4. No key → 500. 5. Prompt asks overall energy, love, career, health, lucky tip in Hinglish; temp 0.8, 800 tokens; response adds `date` (server date) but date is **not in the prompt**; no caching → each click/user differs. 6. `useAIDailyHoroscope` → `generateAIDailyHoroscope` → `chatgptService.generateDailyHoroscope`. 7. none. 8. OpenRouter. 11. Text in `whitespace-pre-wrap`; failure shows "Failed to generate horoscope". 12. IMPL-NV. 13. No cache/date/validation; model slug may be retired. 14. Mock axios; 429/402/timeout cases.

##### B2 Zodiac library & daily panel
1. Sign info + daily panel. 2. `/zodiac` list; `/zodiac/:sign` detail. 5. `generateDailyData(sign)` uses `rng(getDailySeed(sign))`, `getDailySeed = (YYYY*10000+MM*100+DD)*1000 + Σ charCode(sign)`; lucky colour/number/gemstone/direction, moon phase, planets, mood, challenge, compatible signs and messages are **PSEUDO** picks from hard-coded lists — **not astronomical**. A spin-wheel uses `Math.random`. 7. none. Backend `GET /api/zodiac/signs[/:sign]` are STATIC lists (unknown sign → Aries) and unused by the UI. 12. MOCK (daily); static content otherwise. 13. Presented as guidance without disclaimer verified. 14. Seed determinism unit test.

##### B3 Birth Chart ("Cosmic Identity")
1. Personal reading page. 2. `/birth-chart`: first/last name, DOB day/month/year (required: first name + DOB), optional time (hour/min/AM-PM), place via Nominatim autocomplete (browser-direct) → generate → loading screen → results. 3. Only first name + DOB checked. 5. **LOCAL-CALC:** sun sign `getZodiac(day, month)` = cutoff table (Capricorn ≤ Jan 19 … Sagittarius ≤ Dec 21), year/time ignored; life path `getLP(dob)` = sum of all digits of `YYYY-MM-DD`, repeatedly reduced while >9 and ≠11,22 (33 never produced here). **PSEUDO:** `hash(s)=s.reduce((a,c)=>(a*31+c.code)&0xffff,0)`; `base=62+(hash(name+dob)%30)`; `dv(base,seed,lo=55,hi=98)=clamp(base+(hash(seed)%22)-11)` drives LOVE/CAREER/MONEY/HEALTH/GROWTH and insight scores. **LLM:** `POST /api/birthchart/analyze {name, zodiac, lifePath, dob, place(city)}` returns purpose/archetypes/powers/shadows/love-language/must-do/avoid. Birth **time and coordinates are never sent**. A fixed 5.6 s `setTimeout` delays the results regardless of latency. 6. `fetchBirthChartAI` → `birthChartRoutes` `/analyze` (needs `name`,`zodiac`; model gemma-4-31b-it:free, 1800 tokens; fence-strip + `JSON.parse`, parse error → 500). 8. OpenRouter; Nominatim. 11. API errors are swallowed; Results renders static dictionaries and pseudo-scores. 12. PART. 13. **No ascendant, moon sign, planets, houses or dashas; no timezone/DST handling; nothing persisted.** 14. Unit tests for `getZodiac` cusps, `getLP`, determinism; contract test for `/analyze`.

##### B4 Birth-chart chat (BACKEND ONLY)
`POST /api/birthchart/chat {question, chartData}` (needs `question`; model gemma-4-31b-it:free, 400 tokens, "4–6 sentences") and `POST /api/interpretation/chart-chat {question, birthData}` (needs both; gpt-4-turbo-preview; expects `sign/moon/rising/birthDate/birthTime/birthPlace`). No active frontend consumer (`useChartChat` unused; `AIChat` in `BirthChart.tsx` is commented out). `moon`/`rising` are never computed anywhere. Status BE. Verification: contract tests with mocked provider.

##### B5 Compatibility checker
1. Two-person compatibility page. 2. `/compatibility`: both persons' name + DOB required (time/place optional) → compute → 5.6 s loading → results (+ chat). 5. Zodiac via cutoff table and life path via digit-sum are computed **but do not affect scores**. **PSEUDO:** `seed=p1.name+p2.name+dob1+dob2`; `hash` as in B3; `base=60+(hash%35)`; `deriveScore(base,n1,n2,tag)=clamp(52,99, base + (Σ charCode(n1+n2+tag) % 20) − 10)` for love, emotional, physical, friendship, marriage, financial, family, spiritual; `overall=min(99, base+5)`; "who loves more" = weighted blend (p1: emotional .35, love .25, friendship .2, marriage .2; p2: spiritual .35, physical .25, family .2, financial .2). 6/8. **The call to `POST /api/compatibility/analyze` is commented out**; the chat answers via `getCompatFallback` (keyword-matched canned text) after a 900 ms timer — **MOCK**. 12. MOCK. 13. Same name pair always yields same scores; unrelated to astrology; unused backend (`/analyze`, `/api/interpretation/compatibility`). 14. Determinism tests; decide product intent first.

##### B6 Name Destiny (numerology) report
1. Name/DOB numerology report. 2. `/name-destiny-report` → report sections (core numbers, aura, timeline, heatmap, variants, celebrity carousel, lucky numbers). 3. name + dob. 5. **LOCAL-CALC** (`lib/numerology.ts`): letters A–Z only; Pythagorean destiny (all letters), soul urge (vowels A,E,I,O,U), personality (consonants); Chaldean name number via Chaldean map; `reduceNumber` repeats digit-sum while >9 unless 11/22/33; life path = digit sum of DOB reduced; birth number = day-of-month reduced; planet per number (`PLANET_BY_NUMBER`); `scoreNameAgainstProfile.overallScore = round(0.4·lifePathCompat + 0.3·chaldeanFavorability + 0.2·clamp(0..100, 100−|vowelRatio−0.4|·150) + 0.1·70 + syllablePenalty)` clamped 0–100, where `chaldeanFavorability`=90 for {1,3,5,6}, 55 for {2,9}, else 70; `syllablePenalty`=−8 if letters>14, −3 if >10, else 0; `lifePathCompat` from `planetCompatibility(destinyPlanet, lifePathPlanet)` (matrix `PLANET_RELATIONSHIPS`; origin [UNKNOWN]). Variants from `generateNameVariants` ranked by the same score. **LLM:** `POST /api/name-analysis/narrative` with the computed numbers; prompt says use only given numbers and hedge. 6. `useNameReport` → `fetchNameNarrative`. **MOCK fallback:** missing key, provider error or JSON parse failure returns `mockNarrative()` templated text with HTTP 200 (indistinguishable to the user). 12. IMPL-NV (math is reproducible). 13. Non-A–Z characters dropped; weights are product choices, not doctrine; celebrity data provenance [UNKNOWN]. 14. Golden-fixture unit tests (best-value test in repo).

##### B6b Paywall & PDF
₹499 card; `onUnlock` → `setUnlocked(true)` (component state); copy "Demo unlock — real payment coming soon." No payment, no server entitlement, resets on reload. PDF via jsPDF client-side. MOCK. Missing: payment, entitlement storage, gating enforced server-side.

##### B7 Tarot
1. Card reading. 2. `/tarot`: landing → choose mode (Life Timeline: question step, 5 cards; Karma Mirror: 3 cards) → shuffle/spread (client `shuffleDeck`) → reveal → `POST /api/tarot/reading {mode, question, cards[{name,meaning,keywords,symbol}]}`. 3. Server requires `mode` and `cards` array only. 4. `mode==='timeline'` → timeline prompt else karma prompt. 5. gemma-3-27b-it, 2000 tokens; first `{…}` match parsed. 11. `data.success` → render; otherwise or on exception `generateFallbackReading` (STATIC). 13. Card count unvalidated (prompt indexes `cards[0..4]`); nothing stored. 12. IMPL-NV. 14. Mock fetch; wrong-count and garbage-JSON cases.

##### B8 Palm reading
1. Palm scan experience. 2. `/palm-reading`: camera/upload → MediaPipe HandLandmarker (WASM and model fetched at runtime from jsDelivr / Google Storage) → quality gates (`no_hand_detected`, `too_blurry`, `hand_too_small`, `low_confidence`) → crop/align → `estimatePalmFeatures`. 5. Lines/mounts are **template curves positioned in a landmark-anchored frame** (the source states this is not crease segmentation); dashboard metrics blend curvature/mount strength with seeded personality scores: e.g. love = `clamp(35..98, 55 + curviness(heart)·22)`; career `55+curviness(fate)·18`; health `55+curviness(life)·20`; reading text is canned. 6. Entirely client-side; **no backend call**. 12. PART. 13. Not real line detection; accuracy claims unsupportable; runtime CDN dependency. 14. Component tests with mocked MediaPipe and synthetic images.

##### B8b Palm-reading endpoint (BACKEND ONLY)
`POST /api/palm-reading {imageBase64, imageType, fingerprint?}`: requires image fields; seed = `parseInt(fingerprint)%1000` or random; vision prompt to claude-3.5-sonnet (3000 tokens); parsed JSON returned. Not called by the UI; unauthenticated and costly.

##### B9a Legacy Vedic API / horoscope router (dead)
`AstroApiService` (`ASTRO_API_BASE_URL`, default a public Render URL) wraps `vedic/chart`, `vedic/yogas`, `horoscope/{daily,weekly,monthly}/{sign}`; `horoscopeRoutes` (`/daily`, `/by-sign/:sign`, `/create`) and `horoscopeController` expose them but **`index.ts` never mounts them** → 404. `createHoroscope` → 501. `middleware/birthDataValidation.ts` unused. Frontend `lib/api.ts` calls `/horoscope/daily/…`, `/zodiac/compatibility`, `/birth-chart/calculate`, `/user/profile` and old `/auth` shapes that do not exist. Only the Darshan calls in that file are live.

##### B9b True Kundali
NOT IMPLEMENTED: no ephemeris dependency, no birth-time/timezone/geocoding pipeline, no house/planet/dasha computation anywhere.

---

#### C — Inner Voice / AI Guru

##### Shared block S-GROQ (C1–C6)
Browser calls `https://api.groq.com/openai/v1/chat/completions` with `Authorization: Bearer ${VITE_GROQ_API_KEY}`; model `VITE_GROQ_MODEL` or default `openai/gpt-oss-120b` (availability UNKNOWN). Vite inlines `VITE_*` → key is public. No auth, no limits, no server persistence; all memory in localStorage (`iv_profile`, `iv_chat_sessions`, `iv_karma_v2`, `iv_done_<date>`, `ivj_entries_v3`, `kj_*`, `iv_shlokas`, `iv_saved_mantras`, `iv_cal_checked`). Marketing text on `/inner-voice` claims natal/transit/dasha computation; **no code computes any of these** — the LLM is asked to produce them.

##### C1 AI Guru consultation
1. Persona chat. 2. Type or dictate (Web Speech, `hi-IN`) → `send()`. 3. Non-empty; ignored while loading. 4. Prompt `PANDIT_CONSULTATION_SYSTEM`: greeting vs gathering; one follow-up at a time; `readyForDiagnosis:true` after 3–5 exchanges; no coaching clichés; same language, no Devanagari. 5. History = all prior messages resent each call; `temperature 0.7`, `max_tokens 1000`, `response_format json_object`; parse failure → canned greeting; error → apology bubble. 6. `callConsultation` direct to Groq. 9. progress 0–100 and `readyForDiagnosis` flags in state. 7. none; localStorage stores only first-message title (40 chars, max 10). 10. none. 12. IMPL-NV. 13. Conversation lost on refresh; text chat lacks the off-topic guard; no crisis/medical handling; persona claims "real Pandit Ji" in-prompt [UI disclosure not verified]. 14. Provider mock; schema tests for JSON.

##### C2 Diagnosis report + PDF
Report tab (requires `readyForDiagnosis`) → `callDiagnosis(messages)` sends transcript with `PANDIT_DIAGNOSIS_SYSTEM` (temp 0.6, 4000 tokens) → large JSON (diagnosis, forecast, remedies, mantra, puja with `estimatedCost`, gemstone, donations, timeline, karma score, planet dashboard). All scores/dates are LLM output; the prompt embeds example 2025 dates. `downloadReportPDF` builds a jsPDF file locally. Parse failure → `null`. IMPL-NV. Missing: disclaimers, validation, safe-advice policy.

##### C3 Voice consultation
Mic → `useSpeechRecognition` (Chrome/Edge) → `isAllowedTopic` regex deny-list (programming, sports, recipes, etc.; also rejects <2 words) → Groq (`VOICE_SYSTEM_PROMPT`, temp 0.75, 380 tokens, full history) → Devanagari→Roman transliteration → `detectLanguage` → TTS `POST {API}/tts {text, language}` → base64 WAV → `Audio`. `speechSynthesis` helper exists (`useTextToSpeech`); its exact fallback wiring was not traced [UNKNOWN]. Replies can be translated on demand via Groq. Limits: 500-char TTS truncation, no audio cache. IMPL-NV.

##### C4 Karma Score
User types profile (name, dob, sign, nakshatra, dasha) → localStorage. Groq asked to "calculate" `{composite, natalBase(0–40), transitBonus, behaviorBase, scoreMessage, currentDasha, transitAlerts…}`. **Only local formula:** `composite = min(100, natalBase + transitBonus + round(behaviorPts/68 × behaviorBase))`, where `behaviorPts` = points of ticked daily `ACTIONS` (total 68). LLM is prompted for `natalBase` 0–40, `transitBonus` −20…+30, `behaviorBase` 0–30; there is **no lower clamp** on `composite`. On error a hard-coded fallback (`composite 62`) is shown as normal. History kept 60 days in localStorage. PART.

##### C5 Karma Journal / C6 Shloka Wisdom
C5: daily prompts and entries analysed by Groq (`karmaImpact`, `karmaScore 1–10`, affirmation…); streak counters in localStorage; static `FALLBACK` on failure. C6: situation/mood/domain → Groq returns Devanagari verse, transliteration, source, meaning; correctness unchecked; saved verses in localStorage. Both IMPL-NV with S-GROQ caveats.

##### C7 Backend inner-voice API
`POST /api/inner-voice/diagnose` (needs `text`), `/guru-chat` (needs `message`, uses last 6 history items), `/analyze-journal` (needs `entry`), `/wisdom` (needs `situation`), `/tts` (needs `text`). OpenRouter gemma-4-31b-it:free. No frontend consumer. BE.

##### C8 TTS proxy
`POST /api/tts {text, language}` (used): requires non-empty text; needs `SARVAM_API_KEY` (else 500); `language` starting "en" → `en-IN`, else `hi-IN`; Sarvam body: `inputs:[text.slice(0,500)]`, speaker `manan`, `pace 0.85`, `speech_sample_rate 22050`, model `bulbul:v3`, `temperature 0.4`; returns `{audio: base64}` (non-OK → 502). Two other copies (`/api/inner-voice/tts` unused; Vercel functions that differ and also read `VITE_SARVAM_API_KEY`). Unauthenticated; each call spends Sarvam credits [account/quota UNKNOWN].

---

#### D — Devotion commerce & admin

##### Shared block S-CATALOGUE
Prisma models: `Temple`(slug unique, `priceFrom` Int) → `TempleImage`, `Puja`(price Int, `benefits String[]`), `Chadhawa`; `ShopCategory` → `ShopProduct` (FK Restrict). **No Order/Booking/Cart/Payment/Address/Stock tables exist.** Public routes unauthenticated and unpaginated; FE React Query `staleTime 60 s`. Prices are whole rupees.

##### D1 Puja catalogue
List all temples with images and pujas (`listPublicTemples`, oldest first); detail by slug (404 "Temple not found"). FE `/puja` filters client-side; `/puja/:slug` shows carousel, details, puja list, selection. IMPL-NV. `Temple.priceFrom` is admin-typed, **not derived from puja prices**.

##### D2 Puja booking (UI ONLY)
Flow stops at `PujaDetail.tsx`: selecting a puja sets `selectedPuja`; quantity stepper (min 1); `total = activePuja.price × quantity` (display only). "🙏 Proceed to Book" and mobile "Book — ₹{total}" are `<button>`s with **no onClick/form/route**. Copy claims instant confirmation, "100% secure", Sankalp certificate, prasad dispatch, certified pandits — **none supported by any code or data**. Capabilities that do not exist: devotee details, date/slot availability, pandit assignment, payment, confirmation messaging, cancellation/refund, booking history, admin order console, any state machine.

##### D3 Chadhawa catalogue
Public API returns temples having ≥1 **active** offering; offerings filtered `isActive`, ordered `displayOrder, createdAt`. Detail by slug (404 if missing). IMPL-NV.

##### D4 Chadhawa offering flow (UI ONLY)
Per-offering quantity state; `cartItems` = items with qty; `totalAmt = Σ price×qty`, `totalItems = Σ qty`; button "🙏 Proceed to Offer" disabled at 0 items, otherwise **no handler**; "Add to Wishlist" toggles local state. FAQ mentions choosing auspicious dates "during checkout" — no checkout exists. Same missing capabilities as D2.

##### D5 Shop catalogue
Public: active categories; products with `isActive` in active categories (optional category filter); `getPublicProductBySlug` → 404 if inactive product/category. FE category tabs + grid. IMPL-NV.

##### D6 Shop cart / Buy Now (UI ONLY)
`ShopDetail`: quantity stepper; "Add to Cart" and "Buy Now" are handler-less buttons; list-page "Buy" is a styled `<span>` inside a link. No cart state, stock, shipping, address, tax/GST, payment or order lifecycle.

##### D7 Admin dashboard
`GET /api/admin/dashboard` returns `{user:{id,firstName,lastName,email}, role}` after DB re-check of role/`isActive`. PART (identity only; no metrics).

##### D8 Admin temples / pujas / images
Endpoints under `/api/admin/puja`. Joi: temple name ≤150, slug `^[a-z0-9]+(-[a-z0-9]+)*$` ≤120, location/state/deity ≤150/100/150, description ≤2000, `priceFrom` ≥0, gradient ≤300; puja price ≥0, duration ≤60, benefits 1–20 items ≤200 chars; list `limit` ≤100. Rules: slug uniqueness pre-check (409) plus DB unique; `deleteTemple` first deletes every Cloudinary asset (failures returned as `orphanedImages`) then the row (cascade removes pujas/images); `deleteTempleImage` requires successful remote delete first; batch upload failure rolls back uploaded assets. Search is DB `contains` (case-insensitive) over name/location/state/deity. No audit log. IMPL-NV.

##### D9 Admin Chadhawa
Joi: price integer >0, description ≤1000, emoji ≤16, `displayOrder` 0–9999, `isActive`; list filters templeId/search/isActive/sort. Name unique per temple (`assertNameAvailable`); `displayOrder` auto = next when omitted (`nextDisplayOrder`); temple must exist. IMPL-NV.

##### D10 Admin Shop
Categories: name unique, slug unique, `isActive`, image upload; delete blocked (409) if products exist; image removed on delete. Products: Joi price ≥1, `originalPrice` nullable ≥1 (**no check that it exceeds price**), benefits 1–20, description ≤2000, authenticity ≤300; slug unique; image upload/delete best-effort. IMPL-NV.

##### D11 Image handling
multer memory storage; allowed MIME (client-declared) JPEG/PNG/WebP/AVIF; ≤10 MB, ≤10 files per request; `upload_stream` to Cloudinary folder (`puja/temples/<slug>` for temples); 401/403 mapped to actionable messages; `deleteImageByPublicId` treats "not found" as success. No magic-byte verification; slug rename does not move assets. IMPL-NV.

---

#### E — Live Darshan

##### Shared block S-DARSHAN
Config `backend/src/config/temples.json` (18 entries, 4 with empty `youtubeChannelId`: mahakaleshwar, trimbakeshwar, ramanathaswamy, jwala-ji) → seed `npm run db:seed:darshan` upserts `darshan_channels` by slug. At server start `startDarshanRefreshLoop()` subscribes each channel with an ID to the WebSub hub (lease 4 days) and re-subscribes every 3 days. No MongoDB is involved. Flow diagram: Section 10.

##### E1 List/detail + embed
FE merges static metadata (`data/liveStreams.ts`) with backend `isLive` by slug. Detail shows the player only when the backend reports `isLive` **and** a `currentLiveVideoId`; otherwise Offline UI with a YouTube link. The IFrame Player retries on embed errors (codes 101/150 treated as embedding disabled). **List page:** `if (!statuses) return staticTemples` shows hard-coded `isLive:true` for 9 static entries while the API is loading or failing. Backend `GET /api/darshan/temples` (all, ordered by name) and `/temples/:slug` (404). IMPL-NV.

##### E2 WebSub subscription + webhook
`GET /api/darshan/websub/callback` echoes `hub.challenge` (400 if absent; no topic/mode check). `POST` (text/xml bodies) replies **204 immediately**, extracts `<yt:videoId>` via regex, and per ID calls `getVideoLiveStatus` (`videos.list?part=snippet,status`, 1 quota unit per code comment); channel looked up by `snippet.channelId`; `isLive = liveBroadcastContent==='live' && embeddable!==false` → `markLive(id, videoId)` else `markOffline(id)`; result broadcast to SSE. Missing `YOUTUBE_API_KEY` → skip with warning. No signature verification (`hub.secret` unused). **Defects:** forged POSTs burn quota; any non-live upload while a stream is live marks it offline; streams already live at start/subscription are not detected. IMPL-NV.

##### E3 Stale-live poll
Every `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS` (default 120) for channels with `isLive && currentLiveVideoId`: re-check that video; not live/embeddable → `markOffline` + broadcast; still live → `touchLastChecked`. Per-channel errors are logged and the state is left unchanged. Quota arithmetic (assumes 1 unit/call; Google default quota not verified): ≈720 calls/day per continuously live channel at 120 s. IMPL-NV.

##### E4 SSE push
`GET /api/darshan/events`: `text/event-stream`, heartbeat comment every 30 s, one listener per client on a shared EventEmitter (`setMaxListeners(0)`), payload = `DarshanChannelDTO`. FE `useDarshanLiveEvents` opens `EventSource(API_BASE_URL/darshan/events)` and patches React Query caches (`staleTime: Infinity`; no refetch after reconnect). No auth, no client cap. IMPL-NV.

##### E5–E7 (UI ONLY)
E5 Prayer wall: submit prepends a message (random emoji) to a local list seeded with `samplePrayers`; nothing transmitted. E6 Donation: amount chips + "Donate ₹X" without handler; no payment/receipt/tax logic. E7: "Notify Me When Live" sets `notifyRequested` locally; "Set Reminder" buttons are no-ops. None persist.

##### E8 Viewer counts, family events
`viewers` numbers, family events (e.g. sharma-wedding) and upcoming events are static fabricated data in `data/liveStreams.ts`. MOCK.

---

#### F — Site & miscellaneous

##### F1 Contact
`Contact.tsx` `handleSubmit` awaits `setTimeout(1500)` and shows success; it **does not call** `POST /api/contact/send`. That endpoint only checks that name/email/subject/message exist and returns success without sending/storing. MOCK.

##### F2 Newsletter
`Footer.handleNewsletter` only clears the input. `POST /api/newsletter/subscribe` checks `email` presence and echoes it. MOCK.

##### F3 Blog / F5 Landing
Static content (`data/blogPosts.ts`, `data/tools.ts`, hero/3D/GSAP sections). No data layer. UI ONLY.

##### F4 3D Solar System
`/solar-system` full-screen iframe to `VITE_SOLAR_SYSTEM_URL` (default `http://localhost:3000`) — the separate `solar-system-app/` (Express static server, Auth0 configuration, different authors) — plus in-app `components/three/*` scenes. Production hosting [UNKNOWN]. UNV.

##### F6 Platform
CORS allowlist: localhost ports 5173/3000/8081 and LAN ranges (regex), a hard-coded Vercel domain, optional `CORS_ORIGIN`; rejected origins hit the generic handler → HTTP 500. `GET /api/health` → `{success:true}`. Two error envelopes coexist: `{success,error}` and `{status,data,message}` (for errors carrying `statusCode`). No helmet, no rate limiting, no graceful shutdown. IMPL-NV.


---

## 6. Business Logic and Calculation Formulas

### Part: Business Rules And Formulas

Canonical location for every constant, threshold, formula and rule found in code. Narrative per feature: Section 5; AI specifics: Section 6. Verified by reading source on 2026-10-19; nothing executed at runtime. Paths: `backend/src/…`, `frontend/src/…`.

##### 1. Authentication and sessions (`modules/auth/auth.service.ts`, `auth.validators.ts`)

| Rule | Value | Symbol |
|---|---|---|
| Access token | JWT `{id, role}`, expiry `"1d"` | `ACCESS_TOKEN_TTL` |
| Refresh token | 32 random bytes hex; SHA-256 stored; 30 days; rotated each use | `REFRESH_TOKEN_TTL_DAYS = 30` |
| OTP | `Math.floor(100000 + Math.random()*900000)` (6 digits), SHA-256 stored, expiry 10 min, single use | `generateOtp` |
| OTP resend cooldown | reject if an OTP was created < 60 s ago (HTTP 429) | `resendOtp` |
| Password reset token | 32 random bytes hex, **plaintext in DB**, 1 h, single use | `forgotPassword` |
| Password policy | ≥ 8 chars, lower + upper + digit | `auth.validators.ts` |
| Phone | `^[6-9]\d{9}$` (India mobile) | validators |
| bcrypt cost | 8 | `utils/auth.ts` |
| Minimum age (Google profile) | 10 years (`MIN_PROFILE_AGE_YEARS`) | `completeProfile` |
| Role hierarchy | USER ⊂ ADMIN ⊂ SUPERADMIN; token role used | `middleware/authMiddleware.ts` |
| Login order | email lookup → password check → `isActive` → verification state | `login` |
| Unverified login | invalidate old LOGIN OTPs, issue + email new OTP, return `{requiresVerification:true}` | `login` |
| Registration duplicate rule | verified (email or phone) → 409; unverified → overwritten; phone used by other active user → 409 | `register` |

##### 2. Name Destiny numerology (`lib/numerology.ts`)

Letters: `cleanName` = uppercase, drop everything except `A–Z`.

**Reduction** `reduceNumber(n, keepMaster=true)`: while `n > 9` and not (`keepMaster` and `n ∈ {11,22,33}`): `n ← digitSum(n)`.

| Quantity | Formula |
|---|---|
| Destiny (Expression) | `reduce(Σ PYTH[c])` over all letters |
| Soul urge | same over vowels `A,E,I,O,U` |
| Personality | same over consonants |
| Chaldean name number | `reduce(Σ CHALDEAN[c])` |
| Life path | digits of DOB string (non-digits removed) summed, then `reduce` |
| Birth number | `reduce(day-of-month)` (3rd `-` part; falls back to 1st) |
| Planet of number | table: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars, 11 Moon, 22 Saturn, 33 Jupiter |
| Planet compatibility `(a,b)` | a = b → 92 friendly; b ∈ friends(a) → 82 friendly; b ∈ enemies(a) → 38 friction; else 60 neutral (matrix `PLANET_RELATIONSHIPS`, source of matrix UNKNOWN) |

Tables: `PYTHAGOREAN_MAP` A,J,S=1 · B,K,T=2 · C,L,U=3 · D,M,V=4 · E,N,W=5 · F,O,X=6 · G,P,Y=7 · H,Q,Z=8 · I,R=9. `CHALDEAN_MAP` A,I,J,Q,Y=1 · B,K,R=2 · C,G,L,S=3 · D,M,T=4 · E,H,N,X=5 · U,V,W=6 · O,Z=7 · F,P=8.

**Overall alignment score** (`scoreNameAgainstProfile.overallScore`):

```
lifePathCompat  = planetCompatibility(destinyPlanet, lifePathPlanet).score      // 38|60|82|92
chaldeanFav     = 90 if chaldean ∈ {1,3,5,6}; 55 if ∈ {2,9}; else 70
vowelRatio      = vowels / letters   (0.4 if no letters)
balanceScore    = clamp(0,100, 100 − |vowelRatio − 0.4| × 150)
syllablePenalty = −8 if letters > 14; −3 if letters > 10; else 0
overall         = clamp(0,100, round(0.4·lifePathCompat + 0.3·chaldeanFav + 0.2·balanceScore + 0.1·70 + syllablePenalty))
```

Worked example (inputs chosen to be checkable by hand, **not run**): name "ARUN", DOB 1990-05-14. Letters A,R,U,N → Pythagorean 1+9+3+5 = 18 → 9 (Mars). Chaldean 1+2+6+5 = 14 → 5 → favourable (90). DOB digits 1+9+9+0+0+5+1+4 = 29 → 11 (master, kept) → Moon. Lookup is `PLANET_RELATIONSHIPS[Mars]` → friends Sun, Moon, Jupiter → Moon is a friend → 82. Vowels A,U = 2 of 4 → ratio 0.5 → balance = 100 − 0.1×150 = 85. Letters 4 → penalty 0. overall = round(0.4·82 + 0.3·90 + 0.2·85 + 7) = round(32.8 + 27 + 17 + 7) = **84**.

**Variants** `generateNameVariants(name, 12)` (first word only): double each letter position; phonetic swaps k↔c, i↔y, s↔z; append one of `a,e,h,s,r`; drop trailing vowel or add `a`; de-duplicate; remove original; cap 12. `rankNameVariants` scores each, `diff = variantScore − baseScore`, deltas `career = round(0.9·diff)`, `business = round(1.1·diff)`, `wealth = round(0.8·diff)`, `relationship = round(0.6·diff)`, returns top 5 by score. Multipliers are product constants.

Lucky values: `luckyNumbers = unique{destiny, lifePath, reduce(destiny+lifePath,false), reduce(2·destiny,false)}` (first 4); `luckyDates = {b, b+9, b+18, b+27}` ∩ [1,31], `b = lifePath` (9 if 0); handle suggestion = first 8 letters + destiny.

Limitations: non A–Z characters (Devanagari, accents) are dropped silently; empty name gives destiny 0; weights untested against any reference; two other life-path implementations exist (see §3).

##### 3. Birth Chart page (`pages/BirthChart.tsx`)

| Item | Rule |
|---|---|
| `getZodiac(day, month)` | cutoff table: Capricorn ≤ Jan 19, Aquarius ≤ Feb 18, Pisces ≤ Mar 20, Aries ≤ Apr 19, Taurus ≤ May 20, Gemini ≤ Jun 20, Cancer ≤ Jul 22, Leo ≤ Aug 22, Virgo ≤ Sep 22, Libra ≤ Oct 22, Scorpio ≤ Nov 21, Sagittarius ≤ Dec 21, else Capricorn |
| `getLP(dob)` | digit sum of `YYYY-MM-DD`, reduce while > 9 and ∉ {11, 22} (33 not preserved) |
| `hash(s)` | `s.split('').reduce((a,c)=>(a*31 + code)&0xffff, 0)` |
| `base` | `62 + hash(name+dob) % 30` (62–91) |
| `dv(base, seed, lo=55, hi=98)` | `clamp(lo,hi, base + hash(seed)%22 − 11)` |
| Delay | fixed 5.6 s `setTimeout` before results regardless of API |
| Request | `{name, zodiac, lifePath, dob, place(city)}` — **no time, no coordinates** |

##### 4. Compatibility page (`pages/CompatibilityChecker.tsx`)

```
seed    = name1 + name2 + dob1 + dob2
base    = 60 + hash(seed) % 35                                   // 60–94
score_t = clamp(52, 99, base + (Σ charCode(name1+name2+tag) % 20) − 10)   // t ∈ love, emotional, physical, friendship, marriage, financial, family, spiritual
overall = min(99, base + 5)
```
"Who loves more": person-1 weighted sum `0.35·emotional + 0.25·love + 0.2·friendship + 0.2·marriage`; person-2 `0.35·spiritual + 0.25·physical + 0.2·family + 0.2·financial` (compare). Zodiac cutoffs and life path are computed but **not used** by any score. Chat answers: keyword-matched canned strings after a 900 ms timer.

##### 5. Zodiac "daily" panel (`pages/ZodiacDetail.tsx`)

`getDailySeed(sign) = (YYYY·10000 + MM·100 + DD)·1000 + Σ charCode(sign)`; `rng(seed)` is a seeded PRNG; lucky colour/number/gemstone/direction, moon phase, planets, mood, challenge, compatible signs are picked from hard-coded arrays. Same sign + same calendar day (browser local date) ⇒ same output. Not astronomical.

##### 6. Karma score (`pages/InnerVoiceDashboard.tsx`)

```
behaviorPts = Σ pts of ticked daily ACTIONS          // ACTIONS total = 68
composite   = min(100, natalBase + transitBonus + round(behaviorPts / 68 × behaviorBase))
```
`natalBase` (prompted 0–40), `transitBonus` (−20…+30), `behaviorBase` (0–30) come from the LLM. There is **no lower clamp**, so a negative composite is possible if the model returns low `natalBase` with a negative `transitBonus` [inferred from code; not observed]. Error fallback: `composite 62`, `natalBase 28`, `transitBonus 5`, `behaviorBase 29`. History: newest first, one entry per date, max 60, key `iv_karma_v2`; chart shows last 14.

##### 7. Palm reading (`lib/palmAnalysis/*`, `pages/PalmReading.tsx`)

Quality gates, evaluated in this order (`engine.ts#checkQuality`): no landmarks → `no_hand_detected`; `landmarks.confidence < 0.55` → `low_confidence`; blur score fails (`BLUR_VARIANCE_THRESHOLD = 45`, Laplacian-style variance in `imagePreprocessing.ts`) → `too_blurry`; hand bounding box < `MIN_HAND_FRACTION_OF_FRAME = 0.12` of the frame → `hand_too_small`. Images are downscaled to `MAX_WORKING_DIM = 960` px. Then landmark-anchored template curves; example metric rules: love `clamp(35,98, 55 + curviness(heart)·22)`, career `55 + curviness(fate)·18`, health `55 + curviness(life)·20`. Result text is canned.

##### 8. Catalogue and admin rules (`modules/{puja,chadhawa,shop}`)

| Rule | Value |
|---|---|
| Temple slug | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 120; unique (409) |
| Temple fields | name ≤ 150, location ≤ 150, state ≤ 100, deity ≤ 150, description ≤ 2000, `priceFrom` ≥ 0, gradient ≤ 300 |
| Puja | price ≥ 0, duration ≤ 60, benefits 1–20 items ≤ 200 chars |
| Admin list | `limit` ≤ 100 |
| Chadhawa | price integer > 0, description ≤ 1000, emoji ≤ 16, `displayOrder` 0–9999 (default = next), name unique per temple |
| Shop product | price ≥ 1, `originalPrice` ≥ 1 or null (no check `> price`), benefits 1–20, description ≤ 2000, authenticity ≤ 300, slug unique |
| Shop category | name & slug unique; delete blocked (409) while products exist (also DB `Restrict`) |
| Public visibility | temples: all; chadhawa: temples with ≥ 1 active offering; shop: active product in active category |
| Uploads | MIME ∈ JPEG/PNG/WebP/AVIF (client-declared), ≤ 10 MB, ≤ 10 files/request |
| Image deletion | remote Cloudinary delete must succeed before DB row removal (images); temple delete reports `orphanedImages` |
| Display-only maths | puja total `price × qty`; chadhawa `Σ price × qty` (no server counterpart) |

##### 9. Live Darshan (`modules/darshan/*`)

| Rule | Value |
|---|---|
| WebSub lease | 4 days (`LEASE_SECONDS`); renewal interval = lease − 1 day = **3 days** |
| Live definition | `liveBroadcastContent === "live"` **and** `embeddable !== false` |
| Safety poll | every `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS` (default 120) for channels with `isLive && currentLiveVideoId` |
| Quota cost | code comments assume 1 unit per `videos.list` call (Google quota table not verified) |
| SSE heartbeat | 30 s |
| Channels | 18 in `config/temples.json`; 4 without channel ID (mahakaleshwar, trimbakeshwar, ramanathaswamy, jwala-ji) are never subscribed |
| Embed retries (client) | error codes 101/150 treated as embedding disabled |

##### 10. Platform

* JSON body limit 20 MB; CORS allowlist (7 explicit origins + localhost/LAN regex + `CORS_ORIGIN`), rejection → HTTP 500.
* TTS: input truncated to 500 chars; `language` startsWith `en` → `en-IN` else `hi-IN`.
* Client React Query `staleTime` 60 s for catalogues; Darshan `Infinity` (patched by SSE).
* Client refresh: single in-flight refresh deduplicated; retry once on 401.

### Part: Ai Models Prompts And Calculations

Business rules/formulas in canonical form: Section 6. Per-feature behaviour: Section 5. Verified against source on 2026-10-19; **no model call was made** (no keys used, no provider contacted).

**Provenance legend:** LOCAL-CALC (deterministic code) · PSEUDO (hash/seeded value shown as a score) · LLM (non-reproducible generation) · STATIC (hard-coded) · MOCK (simulated).

> **Core finding.** There is **no astronomical calculation anywhere** (no ephemeris, ascendant, moon sign, houses, dashas, transits). Everything labelled "astrology" is a cutoff table, numerology arithmetic, a hash, a static list, or LLM text. Marketing copy on `/inner-voice` that mentions natal/transit/dasha computation has no code behind it — the LLM is asked to invent those values.

##### 1. Model and provider register (as configured in source)

| # | Where (file) | Caller | Provider | Model ID | temp | max_tokens | Output handling |
|---|---|---|---|---|---|---|---|
| 1 | `services/chatgptService.ts#generateHumanReadableInterpretation` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 1500 | greedy `{…}` regex + `JSON.parse`; mock text **only on HTTP 402** |
| 2 | same `#generateDailyHoroscope` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.8 | 800 | raw text returned |
| 3 | same `#generateCompatibilityAnalysis` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 1000 | raw text |
| 4 | `controllers/chartChatController.ts` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 800 | text |
| 5 | `routes/birthChartRoutes.ts` `/analyze` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 1800 | strip ```` ```json ```` fences → `JSON.parse` (error → 500) |
| 6 | same `/chat` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 400 | text |
| 7 | `routes/compatibilityRoutes.ts` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 1200 | (endpoint unused) |
| 8 | `routes/nameAnalysisRoutes.ts` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 900 | fence strip → `JSON.parse`; **any failure → `mockNarrative` with HTTP 200** |
| 9 | `routes/innerVoiceRoutes.ts` (`callAI`) | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 900 / 800 / 700 / 900 (diagnose / guru-chat / journal / wisdom) | regex-extract JSON (unused by UI) |
| 10 | `index.ts` `/api/tarot/reading` | backend | OpenRouter | `google/gemma-3-27b-it` | default | 2000 | first `{…}` match → `JSON.parse` |
| 11 | `index.ts` `/api/palm-reading` | backend | OpenRouter | `anthropic/claude-3.5-sonnet` (vision, `image_url` data-URI) | default | 3000 | first `{…}` match (unused by UI) |
| 12 | `pages/InnerVoiceChat.tsx` `callConsultation` | **browser** | Groq | `VITE_GROQ_MODEL` ‖ `openai/gpt-oss-120b` | 0.7 | 1000 | `response_format: json_object` |
| 13 | same `callDiagnosis` | browser | Groq | same | 0.6 | 4000 | json_object |
| 14 | `pages/InnerVoice.tsx` (hub: greeting/insights) | browser | Groq | same | 0.7 | 1500 | json_object |
| 15 | `pages/InnerVoiceDashboard.tsx` | browser | Groq | same | 0.7 | 1000 | json_object; hard-coded fallback on error |
| 16 | `pages/InnerVoiceJournal.tsx` | browser | Groq | same | 0.7 | per-call `maxTokens` | json_object (3 prompts: `DASH_SYSTEM`, `REFLECTION_SYSTEM`, `EOD_SYSTEM`) |
| 17 | `pages/InnerVoiceWisdom.tsx` | browser | Groq | same | 0.7 | 1500 | json_object |
| 18 | `components/VoiceConsultation.tsx` reply | browser | Groq | same | 0.75 | 380 | text → `transliterateToRoman` |
| 19 | same `translateText` | browser | Groq | same | 0.3 | 400 | text → transliterate |
| 20 | `index.ts` `/api/tts`, `routes/innerVoiceRoutes.ts` `/tts`, `api/tts.ts`, `frontend/api/tts.ts` | backend / Vercel fn | Sarvam AI | `bulbul:v3`, speaker `manan` | 0.4 | n/a (≤500 chars in; pace 0.85; 22 050 Hz) | `audios[0]` base64 WAV |
| 21 | `lib/palmAnalysis/handLandmarkDetector.ts` | browser | MediaPipe HandLandmarker (WASM + model fetched at runtime) | – | – | – | 21 landmarks; local ML, not an LLM |

Model availability on OpenRouter/Groq at run time is **[UNKNOWN]**; `gpt-4-turbo-preview`, `:free` variants and `gpt-oss-120b` IDs may be retired or rate-limited. Headers `HTTP-Referer` (`http://localhost:8081` or `https://spiritual-ai.app`) are hard-coded. OpenRouter `X-Title` values vary per route.

Common weaknesses (apply to every row): no schema validation of JSON (regex/`JSON.parse` only); user text interpolated directly into prompts (prompt-injection surface); no retry, no timeout on `fetch`/`axios` calls to OpenRouter (provider default), no caching, no token accounting; backend routes unauthenticated and unthrottled (cost-abuse surface); the Groq key is shipped to browsers.

##### 2. Prompt catalogue

| Prompt | Location | Inputs interpolated | Output contract | Notes |
|---|---|---|---|---|
| Interpretation (system "friendly astrologer… valid JSON" + user) | `chatgptService.ts` L35–51 | `JSON.stringify(birthData)` | `summary, personality, strengths[], challenges[], compatibility, careerGuidance, lifeAdvice` | Input shape (`sign/moon/rising/planets/houses/aspects`) is never produced by any code |
| Daily horoscope | `chatgptService.ts` L129 | `sign` (unvalidated path param) | free text, 5 sections, Hinglish | **Date is not in the prompt** (response adds server date only) |
| Compatibility (sign1, sign2) | `chatgptService.ts` L183 | two sign strings | free text | unused route |
| Chart chat | `chartChatController.ts` | question + `birthData` | text | unused route |
| Birth chart analyze | `birthChartRoutes.ts` L19–73 | name, zodiac, lifePath, dob, place | JSON: `purpose, archetypes[3], powers[5], shadows[4], loveLanguage, relStyle, attachment, idealPartner, emotionalNeed, spiritMeaning[4], mustDo[5], mustAvoid[5]` | Persona "world-class vedic astrologer"; birth time/coords absent |
| Birth chart chat | `birthChartRoutes.ts` L114–129 | chartData fields + question | text, 4–6 sentences | unused |
| Name narrative | `nameAnalysisRoutes.ts` L69–95 | all computed numerology values + `topVariant` | JSON: `frictionExplanation, wealthPotential, relationshipEnergy, careerAlignment, remedies[4], signatureAnalysisNote, topVariantExplanation` | **Good practice present:** "use ONLY the numbers given", "possibility not guarantee" |
| Tarot timeline / karma | `index.ts` L359–405 | question, `cardList` (name/meaning/keywords), `cards[0..4].name` | timeline: 8 text fields + `probabilityScore` + `timelineNarrative[5]`; karma: texts + `energyScore, karmaBlockScore, spiritualGrowthScore` + `cardInsights[3]` | Prompt contains example numbers (78, 68, 72, 61) the model may copy; scores are LLM-invented |
| Palm vision | `index.ts` L464–508 | seed number, image | large JSON incl. `palmScore, confidence, mounts[].strength` | "seed ensures consistency" is **not enforceable** (no temperature/seed param set); example values embedded |
| Pandit consultation | `InnerVoiceChat.tsx` L31 (`PANDIT_CONSULTATION_SYSTEM`) | whole chat history | JSON incl. reply text, progress, `readyForDiagnosis` | Persona "Pandit Rameshwar Ji" |
| Pandit diagnosis | `InnerVoiceChat.tsx` L65 (`PANDIT_DIAGNOSIS_SYSTEM`) | transcript | big JSON (diagnosis, forecast, remedies, mantra, puja, gemstone, donations, timeline, karma score, planet dashboard) | Contains example 2025 dates |
| Voice persona | `VoiceConsultation.tsx` L145 (`VOICE_SYSTEM_PROMPT`) | history | spoken-style text; topic whitelist; language mirroring | Off-topic refusal is partly prompt-side, partly regex-side |
| Translation | `VoiceConsultation.tsx#translateText` | reply text, target language | translation only | Hindi forced to Roman script |
| Karma score | `InnerVoiceDashboard.tsx` L201 | name, sign, nakshatra, dasha, DOB, today | `{composite, natalBase(0–40), transitBonus(−20..+30), behaviorBase(0–30), scoreMessage, currentDasha, transitAlerts[], radarData[6]}` | Model asked to "calculate" — it cannot; values are invented |
| Journal / wisdom | `InnerVoiceJournal.tsx` L25–56; `InnerVoiceWisdom.tsx` | entries / situation | JSON (karma impact, affirmation; verse, transliteration, meaning) | Verse accuracy unchecked |

##### 3. Local (non-LLM) logic

All formulas with variables, constants and clamps are in Section 6. Summary of what is genuinely deterministic:

| Logic | File / symbol | Class | Authentic astrology/numerology? |
|---|---|---|---|
| Sun-sign by date cutoffs | `lib/numerology.ts#zodiacFromDob`; `BirthChart.tsx#getZodiac`; `CompatibilityChecker.tsx` | LOCAL-CALC | Western tropical cutoffs only; year/time/ayanamsa ignored; **not** Vedic (sidereal) sign |
| Life path | `lib/numerology.ts#lifePathNumber` (keeps 11/22/33); `BirthChart.tsx#getLP` (keeps 11, 22 only) | LOCAL-CALC | Standard Pythagorean-style digit sum; two implementations disagree on 33 |
| Destiny / soul urge / personality / Chaldean / birth number | `lib/numerology.ts` | LOCAL-CALC | Conventional letter tables (see doc); Chaldean map as coded omits 9 (standard) |
| Name-vs-birth "alignment score" and variant ranking | `scoreNameAgainstProfile`, `rankNameVariants` | LOCAL-CALC | Product-defined weights, not doctrine; relationship matrix provenance unknown |
| Lucky numbers/colours/dates/handles | `luckyNumbers`, `LUCKY_COLOR_BY_NUMBER`, `luckyDates`, `digitalHandleSuggestions` | LOCAL-CALC + STATIC | Arbitrary mappings |
| Birth-chart score bars | `BirthChart.tsx#hash/dv` | **PSEUDO** | No |
| Compatibility scores | `CompatibilityChecker.tsx#deriveScore` | **PSEUDO** | No (sign and life path computed but unused) |
| Zodiac "daily" panel | `ZodiacDetail.tsx#generateDailyData`, `getDailySeed` | **PSEUDO** | No (seeded picks; no planetary positions) |
| Palm metrics | `lib/palmAnalysis/*` | LOCAL-CALC over **template** curves | No (not crease detection) |
| Karma composite | `InnerVoiceDashboard.tsx` | LOCAL-CALC over LLM numbers | Partly |
| Tarot deck | `data/tarotData.ts` + `shuffleDeck` | STATIC + client RNG | Card meanings static |

Which inputs actually influence results:

| Input | Birth chart | Compatibility | Name report | Tarot | Palm | Daily horoscope |
|---|---|---|---|---|---|---|
| Name | hash seed + prompt | hash seed | numerology letters | – | – | – |
| DOB (date) | sign cutoff, life path, hash | hash seed (sign/LP unused) | life path/birth number | – | – | – |
| Birth time | **ignored** | **ignored** | – | – | – | – |
| Birth place | city string → prompt only | ignored | – | – | – | – |
| Today's date | – | – | – | – | – | server date label only |
| Sign | – | – | – | – | – | prompt |

##### 4. Determinism and reproducibility

* Deterministic: numerology, sun-sign cutoffs, birth-chart scores for the same name+DOB, compatibility scores for the same names+DOBs, zodiac daily panel for the same sign+calendar day, karma composite given its inputs.
* Non-deterministic: every LLM output; `Math.random` in the Zodiac spin-wheel, tarot shuffle, OTP generation, palm endpoint seed fallback.
* Cross-session: nothing is cached or stored server-side; reloading regenerates.

##### 5. Fallback behaviour matrix

| Feature | Failure | User-visible result |
|---|---|---|
| Daily horoscope | missing key / provider error | HTTP 500 → "Failed to generate horoscope" |
| Interpretation birth-chart | HTTP 402 only | canned text (other errors → 500) |
| Birth-chart analyze | any | UI swallows error, renders static dictionaries + pseudo scores |
| Name narrative | any (key missing, provider error, bad JSON, exception) | `mockNarrative` templated text, **HTTP 200, indistinguishable** |
| Tarot | any | `generateFallbackReading` (STATIC) |
| Consultation JSON parse failure | bad JSON | canned greeting; network error → apology bubble |
| Diagnosis | bad JSON | `null` report |
| Karma dashboard | error | hard-coded composite 62 data shown as normal |
| Voice TTS | Sarvam error | falls back / silent [exact wiring of `useTextToSpeech` fallback not traced — UNKNOWN] |

##### 6. Cost, quota and privacy considerations (from implementation)

* Public AI/TTS/palm endpoints can be called by anyone: free-tier model IDs hit provider rate limits; paid IDs (`gpt-4-turbo-preview`, `claude-3.5-sonnet`) spend credit. Palm accepts up to the 20 MB JSON body limit.
* Groq calls are billed/limited to the account of the key embedded in the JS bundle; anyone can extract and reuse it.
* Personal data (names, DOB, birthplace, free-text life problems, voice transcripts, journal text) is sent to third-party LLMs; no consent text or retention policy exists in code [UI copy not exhaustively audited]. Inner-voice data also persists in `localStorage` in clear text.
* TTS text (≤500 chars) goes to Sarvam.
* No content-safety layer: no crisis/medical/financial-advice handling, the diagnosis prompt asks for puja/gemstone costs and donations.

##### 7. How to verify safely

1. Use throwaway keys with spend caps; never the production key.
2. Mock `fetch`/`axios` for contract tests (valid JSON, fenced JSON, prose + JSON, invalid JSON, 402/429/timeout).
3. Golden-fixture tests for `lib/numerology.ts` (see Section 14).
4. Confirm each model ID exists via the provider's model list **before** assuming it works.

##### 8. Unknowns requiring accounts or a live environment

Model availability and latency; actual JSON compliance rate of `gemma-*` free models; Sarvam voice quality/quota; whether `response_format: json_object` is honoured for the configured Groq model; MediaPipe CDN availability from production origin.


---

## 7. Frontend Pages and Components

Paths relative to `frontend/src/`. Feature IDs refer to Section 4; logic is in Section 5. Not run in a browser during the investigation; behaviour is from code.

#### 1. Route inventory

Route guards: **Public** = `PublicRoute` (redirects signed-in users via `getPostAuthPath`), **Onboarding** = `GoogleOnboardingRoute`, **Admin** = `AdminRoute` (UI guard; real enforcement is the backend). No other route is login-gated (`ProtectedRoute`, `CompletedProfileRoute` exist but are unused).

| Path | Component | Guard / layout | Feature | Data source |
|---|---|---|---|---|
| `/` | `pages/Index.tsx` | Layout | F5 | static |
| `/horoscopes` | `DailyHoroscopes.tsx` | Layout | B1 | `GET /api/interpretation/horoscope/:sign` |
| `/zodiac`, `/zodiac/:sign` | `ZodiacSigns.tsx`, `ZodiacDetail.tsx` | Layout | B2 | static `data/zodiacData.ts` + seeded random |
| `/compatibility` | `CompatibilityChecker.tsx` | Layout | B5 | local pseudo-scores; Nominatim |
| `/birth-chart` | `BirthChart.tsx` | Layout | B3 | Nominatim; `POST /api/birthchart/analyze` |
| `/name-destiny-report` | `NameDestinyReportPage.tsx` | Layout | B6, B6b | `lib/numerology.ts`; `POST /api/name-analysis/narrative` |
| `/tarot` | `TarotExperience.tsx` | Layout | B7 | `POST /api/tarot/reading` |
| `/palm-reading` | `PalmReading.tsx` | Layout | B8 | local MediaPipe |
| `/inner-voice` | `InnerVoice.tsx` | Layout | C-hub | Groq (browser) |
| `/inner-voice/chat` | `InnerVoiceChat.tsx` | Layout | C1, C2, C3 | Groq; `POST /api/tts` |
| `/inner-voice/dashboard` | `InnerVoiceDashboard.tsx` | Layout | C4 | Groq; localStorage |
| `/inner-voice/journal` | `InnerVoiceJournal.tsx` | Layout | C5 | Groq; localStorage |
| `/inner-voice/wisdom` | `InnerVoiceWisdom.tsx` | Layout | C6 | Groq; localStorage |
| `/puja`, `/puja/:slug` | `pages/Puja/index.tsx`, `PujaDetail.tsx` | Layout, lazy | D1, D2 | `GET /api/temples[/:slug]` |
| `/chadhawa`, `/chadhawa/:slug` | `pages/Chadhawa/*` | Layout, lazy | D3, D4 | `GET /api/chadhawa[/:slug]` |
| `/shop`, `/shop/:slug` | `pages/Shop/*` | Layout, lazy | D5, D6 | `GET /api/shop/*` |
| `/avatar-live` | `AvatarLive/index.tsx` | Layout, lazy | E1, E8 | static + Darshan API |
| `/avatar-live/darshan`, `/:slug` | `DarshanPage.tsx`, `DarshanDetail.tsx` | Layout, lazy | E1, E4–E8 | `GET /api/darshan/*`, SSE |
| `/avatar-live/family` | `FamilyPage.tsx` | Layout, lazy | E8 | static |
| `/blog` | `Blog.tsx` | Layout | F3 | static |
| `/about` | `About.tsx` | Layout | F5 | static |
| `/contact` | `Contact.tsx` | Layout | F1 | none (simulated) |
| `*` | `NotFound.tsx` | Layout | – | – |
| `/solar-system` | `SolarSystem.tsx` | standalone | F4 | iframe |
| `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` | `features/auth/pages/*` | **Public**, standalone | A1–A8 | `/api/auth/*` |
| `/google-onboarding` | `GoogleOnboardingPage.tsx` | **Onboarding** | A6 | `/api/auth/complete-profile` |
| `/admin`, `/admin/puja`, `/admin/chadhawa`, `/admin/shop/categories`, `/admin/shop/products` | `features/admin/pages/*` in `AdminLayout` | **Admin** | D7–D11 | `/api/admin/*` |

#### 2. State management and data fetching

| Concern | Implementation |
|---|---|
| Session | Zustand `useAuthStore` persisted to localStorage key `auth` (user, access/refresh tokens, `isAuthenticated`, `hasHydrated`); `useAuthHydrated` gates guards |
| Server state | TanStack Query (default `QueryClient`, no global config); catalogue queries `staleTime 60 s`; Darshan queries `staleTime: Infinity` patched by SSE |
| HTTP | `lib/authClient.ts#authRequest` (envelope unwrap, refresh-on-401, `skipAuth` for public calls; used for catalogues, auth, admin). `lib/api.ts#ApiService` (legacy; only `getDarshanTemple(s)` live). Raw `fetch` in reading pages and `hooks/useInterpretation.ts`. |
| Forms | react-hook-form + zod (`features/auth/schemas`); admin dialogs; reading pages use ad-hoc `useState` |
| Local persistence | `localStorage` for Inner Voice data (list in Section 5 S-GROQ); `sessionStorage` `auth:pending-registration` (email+phone during signup) |
| Navigation helpers | `NavigationContext`, `useBackOverride` (custom back handling, not traced), `forceScrollTop` hacks in `App.tsx` |

#### 3. Forms and validation (frontend side)

| Form | Validation | Notes |
|---|---|---|
| Register | zod schema + state dropdown (`constants/indianStates.ts`) mirroring backend rules | Phone must be Indian 10-digit |
| OTP | 6-digit input (`OtpForm`, `input-otp`) | Resend with cool-down enforced by backend |
| Birth chart | first name + DOB day/month/year only | time/place optional; **time is ignored downstream** |
| Compatibility | both names + both DOBs | |
| Name report | name + DOB | |
| Tarot | optional free-text question | |
| Contact | required fields; submit **simulated** | |
| Admin dialogs | form + backend Joi errors surfaced | |

#### 4. Static, mocked and hard-coded data

`data/zodiacData.ts` (sign info), `data/tarotData.ts` (deck), `data/blogPosts.ts`, `data/tools.ts`, `data/features.ts`, `data/planetaryData.ts`, `data/liveStreams.ts` (**fabricated viewer counts, hard-coded `isLive`, sample prayers, family/upcoming events**), `NameDestinyReport/lib/celebrityData.ts` (provenance unknown), static fallbacks in Tarot (`generateFallbackReading`), Karma (`composite 62`), Journal (`FALLBACK`), Compatibility chat (`getCompatFallback`). `data/temples.ts` and `data/products.ts` exist only as type shapes mirrored by `features/*/types.ts` (real data comes from the API).

#### 5. Loading / empty / error behaviour (as coded)

* Horoscope: spinner → text; error text "Failed to generate horoscope".
* Birth chart / compatibility: fixed **5.6 s** artificial loading screen; API failures swallowed (birth chart) → static results.
* Tarot: loading overlay; any failure → static fallback reading.
* Catalogue pages: skeleton components (`PujaSkeletons`, `ChadhawaSkeletons`, `ShopSkeletons`); error/empty states exist per page [not individually traced].
* Darshan list: shows static data (with hard-coded LIVE) until API responds; detail: Offline UI until a live `videoId` arrives.
* Auth: toasts (sonner) with backend message.

#### 6. Missing handlers and nonfunctional controls

| Control | Location | Behaviour |
|---|---|---|
| "Proceed to Book" / "Book — ₹X" | `Puja/PujaDetail.tsx` | no handler |
| "Proceed to Offer" | `Chadhawa/ChadhawaDetail.tsx` | no handler (disabled when empty) |
| "Add to Cart", "Buy Now" | `Shop/ShopDetail.tsx` | no handler |
| "Buy" | `Shop/index.tsx` card | styled `<span>` |
| "Donate ₹X" | `DarshanDetail.tsx#DonationCard` | no handler |
| "Set Reminder", "Notify Me When Live" | Darshan pages | no-op / local flag |
| Prayer wall submit | `DarshanDetail.tsx` | local state only |
| Newsletter subscribe | `Footer.tsx` | clears input |
| Contact submit | `Contact.tsx` | simulated success |
| "Unlock" | `PricingPaywall.tsx` | local `unlocked` state ("Demo unlock") |

#### 7. Access restrictions

Only the admin area is guarded. All readings, the AI Guru, catalogues and Darshan are public; signed-in state is read only by `Navbar`. There is no profile page, booking history, or logout-everywhere UI (API exists).

#### 8. Known frontend defects

* `tsc -p tsconfig.app.json`: **40 errors in 11 files** (InnerVoiceChat 15, InnerVoiceWisdom 7, InnerVoice 4, BirthChart 4, InnerVoiceJournal 3, useInterpretation 2, 1 each in InnerVoiceDashboard, CompatibilityChecker, useSpeechRecognition, useApi, InteractiveSolarSystem); `strict:false`. `vite build` does not type-check, and it was not run.
* `VITE_GROQ_API_KEY` in bundle (Section 16).
* Dead/legacy: `lib/api.ts` (non-Darshan methods hit nonexistent endpoints), `hooks/useApi.ts`, `hooks/useChartChat.ts`, unused guards, `VITE_GEMINI_API_KEY` type, `frontend/public/` solar copy and duplicate `(1)` files, large commented-out blocks in `BirthChart.tsx` (~1060 lines), `CompatibilityChecker.tsx`, `ZodiacDetail.tsx`.
* Nominatim called straight from browsers (`searchPlaces`) — usage-policy risk.
* Darshan SSE not resynced after reconnect.
* `vite.config.ts` includes `rollup-plugin-visualizer` with `open:true` (opens a browser on build) and `lovable-tagger` in dev.
* Only test: `src/test/example.test.ts` (`expect(true).toBe(true)`).

#### 9. Not inspected in depth

Three.js scene components, hero/cosmic/background components, `components/ai-guru/*` presentation, `NameDestinyReport/sections/*` (except paywall), `lib/palmAnalysis/*` internals, `About.tsx`, `Index.tsx`, admin page/dialog components (API layer only). Treat statements about them as limited.


---

## 8. Backend Architecture and API Reference

### Part: Backend Api Reference

Paths relative to `backend/src/`. Entry: `index.ts`. Base URL `/api`. See Section 2, Section 12. **No endpoint was called during the investigation**; test status for every row is "not verified; no automated tests".

##### 1. Architecture

* Express 4, ESM, aliases `@/` (src) and `@root/` (backend root). Global: `cors` (allowlist), `express.json({limit:"20mb"})`, `urlencoded`.
* Modules (`modules/<name>/`): `*.route.ts` → `*.controller.ts` → `*.service.ts` (+ `*.validators.ts` Joi, `*.types.ts`). Older flat code: `routes/`, `controllers/`, `services/`.
* Two envelopes: modules use `sendResponse` → `{status:boolean, data, message}`; legacy/AI routes and Darshan use `{success, data|error}` or bare JSON. The final error handler delegates to `errorHandler` only when `err.statusCode` is a number; otherwise `{success:false,error}`.
* Auth: `auth(...roles)` from `middleware/authMiddleware.ts` (Bearer JWT; role hierarchy). **No rate limiting, no helmet, no request logging.**
* DB: Prisma client with `@prisma/adapter-pg` (`prisma.ts`, `DATABASE_URL`).

##### 2. Mounted endpoints

Auth column: **P** public, **U** requires token (USER+), **A** requires ADMIN+.

###### 2.1 Platform and stubs (inline in `index.ts`)

| Method + path | Auth | Behaviour | Frontend consumer | Status |
|---|---|---|---|---|
| GET `/api/health` | P | `{success:true,message}` | none | IMPL-NV |
| GET `/api/zodiac/signs` | P | Hard-coded 12 signs | `apiService` (only via unused `useApi`) | IMPL-NV (unused) |
| GET `/api/zodiac/signs/:sign` | P | Hard-coded; unknown → Aries | same | IMPL-NV (unused) |
| POST `/api/newsletter/subscribe` | P | 400 if no `email`; else echoes success; **stores nothing** | none (UI doesn't call) | MOCK |
| POST `/api/contact/send` | P | 400 unless name,email,subject,message; success; **sends/stores nothing** | none (UI doesn't call) | MOCK |

###### 2.2 Auth — `/api/auth` (`modules/auth/auth.route.ts`)

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

Logic: Section 5 A1–A9. DB: users, roles, user_role_mapping, sessions, otp_verifications, password_reset_tokens. External: Resend, MSG91, Google.

###### 2.3 Admin — `/api/admin` (router-level `auth("ADMIN")`)

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

Validation limits: Section 5 D8–D11. Consumers: `features/admin/api/*`.

###### 2.4 Public catalogue

| Method + path | Behaviour |
|---|---|
| GET `/api/temples` , `/api/temples/:slug` | All temples (images+pujas); 404 "Temple not found" |
| GET `/api/chadhawa`, `/api/chadhawa/:slug` | Temples with ≥1 active offering; active offerings ordered |
| GET `/api/shop/categories`, `/api/shop/products`, `/api/shop/products/:slug` | Active only; detail 404 if inactive product/category |

###### 2.5 AI / speech (all public, no rate limit)

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

###### 2.6 Live Darshan — `/api/darshan` (all public)

| Method + path | Behaviour |
|---|---|
| GET `/temples`, `/temples/:slug` | DTO `{name,slug,youtubeChannelId,currentLiveVideoId,isLive,lastCheckedAt}`; envelope `{success,data}` |
| GET `/events` | SSE stream of DTO updates; 30 s heartbeat |
| GET `/websub/callback` | echoes `hub.challenge` (400 if missing) |
| POST `/websub/callback` | `express.text` for atom/xml; 204 immediately; async processing |

Background: `startDarshanRefreshLoop()` (WebSub subscribe/renew, stale-live poll). Details: E1–E4.

##### 3. Unmounted / obsolete code (not reachable)

| Code | Why unreachable | Notes |
|---|---|---|
| `routes/horoscopeRoutes.ts` (`/daily`, `/by-sign/:sign`, `/create`) + `controllers/horoscopeController.ts` | never imported in `index.ts` | `/create` returns 501; uses legacy auth |
| `services/astroApiService.ts` | only used by the above | external `ASTRO_API_BASE_URL` |
| `middleware/auth.ts`, `config/environment.ts` | only used by the above + tests | claim `userId`, hard-coded default JWT secret fallback |
| `middleware/birthDataValidation.ts` | unused | |
| Mounted-but-never-called: `/api/palm-reading`, `/api/inner-voice/*`, `/api/compatibility/analyze`, `/api/birthchart/chat`, `/api/interpretation/{birth-chart,compatibility,chart-chat}`, `/api/zodiac/*`, newsletter/contact | reachable, no frontend consumer | |

##### 4. External provider calls

| Provider | Where | Failure handling |
|---|---|---|
| OpenRouter | `index.ts` (tarot, palm), `routes/*`, `services/chatgptService.ts`, `controllers/chartChatController.ts` | 500 with provider message, except name-analysis (mock 200) and interpretation/birth-chart (mock on 402) |
| Sarvam | `/api/tts`, `/api/inner-voice/tts` | 502/500 |
| Resend | `utils/mailer.ts` | OTP/forgot sends are caught + logged (API still succeeds) |
| MSG91 | `utils/msg91.ts` (5 s timeout) | returns `{success:false}` → 400 |
| Google | `utils/googleAuth.ts` | 401 |
| Cloudinary | `config/cloudinary.ts` | 400 with mapped message |
| YouTube Data API / WebSub hub | `modules/darshan/*` | logged; state unchanged |

##### 5. Rate limiting and security limitations

None of the endpoints has rate limiting; AI/TTS/palm endpoints are unauthenticated; JSON limit 20 MB globally; CORS rejection returns 500; SSE unbounded; WebSub callback unsigned. See Section 12 and Section 16.

##### 6. Test and verification status

* `tsc --noEmit`: clean (no diagnostics printed).
* Jest tests (`__tests__/middleware/auth.test.ts`, `birthDataValidation.test.ts`) target dead code and **cannot run** (`jest`/`ts-jest` not installed; no `test` script; tsconfig excludes them).
* No integration or contract tests exist. Proposed tests: Section 14.

### Part: Admin And Operations Guide

Describes what the **code** provides for administrators and operators. Nothing here was exercised against a running system; production hosting, monitoring and backups are **[UNKNOWN]** and are listed as gaps, not described as existing.

##### 1. Admin console

###### 1.1 Access
* URL `/admin` (separate route group in `App.tsx`, wrapped by `AdminRoute`). Unauthenticated → `/login`; authenticated non-admin → `/`.
* Real enforcement is server-side: every `/api/admin/*` call passes `auth("ADMIN")` (token role, hierarchy ADMIN ⊂ SUPERADMIN). The dashboard additionally re-reads the user from the DB (`isActive`, `isDeleted`, roles).
* There is **no UI or API to grant roles**; see Section 9 §4.4. Roles in a token can be up to 1 day stale (a demoted admin keeps API access until the access token expires; there is no revocation list).
* SUPERADMIN has no extra features anywhere in the code beyond passing `auth("ADMIN")`.

###### 1.2 Screens and what each action does

| Route | Component | Capabilities | API (all `/api/admin/…`) |
|---|---|---|---|
| `/admin` | `features/admin/pages/Dashboard` | shows signed-in admin identity only | `GET /dashboard` |
| `/admin/puja` | `pages/Puja` + `TempleFormDialog`, `TempleImagesDialog`, `TemplePujasDialog`, `PujaFormDialog`, `GradientPicker` | list/search/paginate temples; create/edit/delete temple; upload (≤10 × ≤10 MB) and delete images; create/edit/delete pujas | `/puja/temples…`, `/puja/images/:id`, `/puja/pujas/:id` |
| `/admin/chadhawa` | `pages/Chadhawa` + `ChadhawaFormDialog` | list with filters (temple, search, active, sort); create/edit/delete offerings; set emoji, price, order, active | `/chadhawa…` |
| `/admin/shop/categories` | `pages/ShopCategories` + `CategoryFormDialog` | CRUD, image upload, activate/deactivate; delete blocked while products exist | `/shop/categories…` |
| `/admin/shop/products` | `pages/ShopProducts` + `ProductFormDialog` | CRUD, image upload, price/original price, benefits, authenticity text, gradient | `/shop/products…` |

Rules and limits enforced: Section 6 §8. Endpoint list: Section 8 §2.3.

###### 1.3 What admins **cannot** do (no code exists)
Manage users/roles; view orders, bookings, donations, prayers, contact messages or newsletter signups (none are stored); edit Live Darshan channels (only seed + `temples.json`); edit blog or static content; view audit logs; moderate AI output; configure feature flags.

###### 1.4 Admin editing caveats
* Changing a temple **slug** does not move Cloudinary assets (folder `puja/temples/<slug>`).
* `priceFrom` on a temple is typed by hand and is not recomputed from puja prices.
* Deleting a temple cascades to pujas, images and chadhawas; remote images are deleted first and failures are returned as `orphanedImages` (clean them manually in Cloudinary).
* No optimistic-lock/versioning: concurrent edits overwrite each other.
* Slug/name uniqueness is checked read-then-write; a race can produce a DB error that may surface as a 500.

##### 2. Operating the backend

###### 2.1 Process model
Single Node process. Besides HTTP it runs **in-process timers** started in `startServer()`: WebSub renewal (every 3 days) and the stale-live poll (default every 120 s). Consequences: run exactly **one** instance; restarts re-subscribe immediately; hosts that sleep idle processes (free tiers) will stop push delivery and polling; horizontal scaling breaks SSE fan-out (EventEmitter is per-process).

###### 2.2 Configuration checklist for a production-like deploy
`DATABASE_URL`, strong `JWT_SECRET`, `CORS_ORIGIN` (exact frontend origin), `FRONTEND_URL`, `RESEND_API_KEY` + `SMTP_FROM_EMAIL` (verified sender), `GOOGLE_CLIENT_ID`, MSG91 trio, `OPENROUTER_API_KEY`, `SARVAM_API_KEY`, Cloudinary trio, `YOUTUBE_API_KEY`, `BACKEND_PUBLIC_URL` (HTTPS, reachable from Google). Then: `npm run db:deploy`, `npm run db:seed` (roles), `npm run db:seed:darshan`, optionally content seeds, promote the first admin.

###### 2.3 Health and monitoring
* `GET /api/health` returns a static success (does not check the DB or providers).
* Logging is `console.log/warn/error` only: no request log, no correlation IDs, no structured logs, no error reporter. Some logs include provider response bodies; OTP-send failures are logged but not surfaced.
* Useful log prefixes: `[darshan]` (subscribe/renew/stream state), `[Sarvam TTS]`, `Birth chart analyze error`, `OpenRouter … Error`, `✗ CORS rejected origin`.
* No metrics, alerts, uptime checks, or quotas dashboards exist in the repo.

###### 2.4 Runbooks

| Symptom | Likely cause (from code) | Action |
|---|---|---|
| Nobody can register: 500 "run db:seed first" | `roles` empty | `npm run db:seed` |
| OTP emails never arrive but API says sent | Resend failure is caught and logged | check Resend key/domain and server logs; consider surfacing failures |
| Password reset link goes to wrong host | `FRONTEND_URL` default | set it |
| Temple shows Offline while live | no `YOUTUBE_API_KEY`; not subscribed (no channel ID or `BACKEND_PUBLIC_URL` unset/unreachable); stream was already live before subscribe; embedding disabled | set keys; check `[darshan]` logs; wait for next webhook or manually set row via SQL; verify channel ID |
| Temple stuck Live after stream ended | poll disabled (no key), process asleep, or video id still `live` | check interval/log; `UPDATE darshan_channels SET is_live=false, current_live_video_id=NULL WHERE slug='…'` |
| Temple flips Offline unexpectedly | any non-live upload on the channel triggers `markOffline` (known defect) | see Section 16 |
| WebSub verification fails | callback URL not public HTTPS, or proxy strips query | check `BACKEND_PUBLIC_URL`, `GET …/websub/callback` echoes `hub.challenge` |
| YouTube quota exhausted | forged/spammed webhook POSTs or many live channels | rotate key, restrict, add signature check |
| AI pages return errors | missing/invalid `OPENROUTER_API_KEY`, retired model slug, credits (402), free-tier limit (429) | check key/credits; change model constant in route file |
| AI/TTS bill spike | public unauthenticated endpoints; Groq key in bundle | rotate keys; add auth + rate limits; see Section 12 |
| Admin image upload fails | Cloudinary key lacks `create` permission or wrong cloud | code maps 401/403 to actionable messages |
| Login works but admin shows redirect | role not in token | grant role, log out/in |
| Users cannot re-register with a phone/email | abandoned unverified account holds the unique value | login/verify, or delete the row |

###### 2.5 Secrets
* Names are in Section 11. Rotate any key that was shared in chat, committed historically, or bundled (the Groq key is by design public in the JS bundle).
* `frontend/.env.production`/`.env.development` were removed in recent commits (contents remain in git history; they held only `VITE_API_URL` per earlier notes — verify before assuming).
* Local `backend/.env` also contains stale `MONGODB_*` keys — delete them.

###### 2.6 Backups and data-protection
No backup, retention, export or deletion tooling exists. Personal data stored: users (name, email, phone, DOB, location, bcrypt hash, Google id), sessions, OTP hashes. No account-deletion path (`isDeleted` is never written). Inner Voice data lives in each visitor's browser only. Obligations (consent, privacy policy, DPDP/GDPR) are product/legal decisions — see Section 18.

##### 3. Release and change management (as found)

* Branches: `main`, `dev-vishwa` (current), `origin/youtube-darshan` (merged via PR #1). 76 commits total.
* No CI, no Dockerfile, no deployment scripts, no environments file. Frontend `vercel.json` only sets build/output and an SPA rewrite.
* Before releasing: run both `tsc` checks, fix the 40 frontend type errors or decide to ignore, add real tests, then follow Section 14.

##### 4. Recommended operations backlog (not implemented)
Rate limiting + helmet; request logging with request id; real `/health` (DB ping); purge job; audit log for admin writes; role-management screen; a flag to disable public AI endpoints; WebSub signature verification; startup sweep of live status; alerting on provider errors. Prioritisation: Section 19.


---

## 9. Database Schema and Migrations

### Part: Database And Data Models

Source: `backend/prisma/schema/{auth,temple,shop,darshan,schema}.prisma`, 5 migrations in `backend/prisma/migrations/`. Provider: PostgreSQL via Prisma 7 (`provider = "prisma-client-js"`, `@prisma/adapter-pg`, `DATABASE_URL`). Migrations and seeds were **not run**; table list is from migration SQL (13 `CREATE TABLE`, 2 enums).

##### 1. MongoDB — correction to the assumption of "separate MongoDB usage"

**No MongoDB code exists in the repository** (no `mongo` string in `backend/src`, `backend/prisma`, `backend/package.json`, or `frontend/src`). Only leftover environment keys `MONGODB_URI`, `MONGODB_DNS_SERVERS` and `DARSHAN_REFRESH_INTERVAL_MINUTES` appear in a local, untracked `backend/.env` (names only inspected). The git history message "changed polling to SSE and removed mongodb" is consistent with a past removal. Live Darshan state is in PostgreSQL (`darshan_channels`). Whether any MongoDB instance still exists in production is **[UNKNOWN]**.

##### 2. Entity-relationship diagram (from schema evidence)

```mermaid
erDiagram
  users ||--o{ user_role_mapping : has
  roles ||--o{ user_role_mapping : has
  users ||--o{ sessions : owns
  users ||--o{ otp_verifications : "optional userId"
  users ||--o{ password_reset_tokens : owns
  temples ||--o{ temple_images : has
  temples ||--o{ pujas : has
  temples ||--o{ chadhawas : has
  shop_categories ||--o{ shop_products : "contains (Restrict)"
  darshan_channels {
    string slug
    string youtube_channel_id
    bool is_live
  }
```

`darshan_channels` is deliberately unrelated to `temples` (comment in `darshan.prisma`: slugs don't line up 1:1; different required fields).

##### 3. Models

###### Auth (`auth.prisma`)

| Model → table | Key fields | Constraints / indexes |
|---|---|---|
| `User` → `users` | `id` cuid; `email` unique; `password?`; `phoneNo?` unique; `googleId?` unique; `authProvider` LOCAL/GOOGLE (default LOCAL); `firstName,lastName,gender,address,state,country,city,dateOfBirth,profileImage,profileImagePublicId`; flags `profileCompleted`(default false) `isEmailVerified` `isPhoneVerified` `isActive`(true) `isDeleted`(false); `deletedAt`; timestamps | `@@index([email])`, `@@index([isActive])` |
| `OtpVerification` → `otp_verifications` | `email`, `otpCode` (SHA-256 hex), `type` REGISTER/LOGIN, `used`, `userId?` (cascade), `expiresAt` | index email, expiresAt |
| `PasswordResetToken` → `password_reset_tokens` | `userId`, `token` unique (**plaintext**), `used`, `expiresAt` | index userId, token |
| `Role` → `roles` | `name` unique (USER, ADMIN, SUPERADMIN seeded) | |
| `UserRoleMapping` → `user_role_mapping` | `userId`, `roleId`, `assignedAt`, `assignedBy?` | unique(userId, roleId); indexes |
| `Session` → `sessions` | `refreshToken` (SHA-256 hex), `device?`, `userId`, `expiresAt` | index userId, expiresAt; **no index on refreshToken** |

Unused/unsurfaced fields: `gender`, `address`, `profileImage*` (no code writes them except Google profile image on link/create); no delete/deactivate API sets `isDeleted/isActive/deletedAt`.

###### Puja / Chadhawa (`temple.prisma`)

| Model → table | Key fields | Notes |
|---|---|---|
| `Temple` → `temples` | `slug` unique, `name,location,state,deity,description`, `priceFrom` Int, `gradient?` | index name, state; `priceFrom` is manually set — not derived from `pujas.price` |
| `TempleImage` → `temple_images` | `templeId` (cascade), `url`, `publicId` (Cloudinary) | |
| `Puja` → `pujas` | `templeId` (cascade), `name`, `price` Int, `duration` String, `benefits String[]` | |
| `Chadhawa` → `chadhawas` | `templeId` (cascade), `name`, `description`, `price` Int, `emoji?`, `isActive`(true), `displayOrder`(0) | indexes templeId, (templeId,isActive), displayOrder; name uniqueness per temple enforced **in application only** |

###### Shop (`shop.prisma`)

| Model → table | Key fields | Notes |
|---|---|---|
| `ShopCategory` → `shop_categories` | `name` unique, `slug` unique, `description?`, `image?`, `imagePublicId?`, `isActive` | |
| `ShopProduct` → `shop_products` | `categoryId` (**onDelete: Restrict**), `name`, `slug` unique, `price`, `originalPrice?`, `description`, `benefits String[]`, `authenticity`, `gradient?`, `image?`, `imagePublicId?`, `isActive` | indexes category, isActive, createdAt, (categoryId,isActive) |

###### Live Darshan (`darshan.prisma`)

`DarshanChannel` → `darshan_channels`: `slug` unique, `name`, `youtubeChannelId` (default `""`), `currentLiveVideoId?`, `isLive`, `lastCheckedAt?`; indexes youtubeChannelId, isLive.

###### Absent (documented so nobody assumes them)

No Order, Booking, Cart, CartItem, Payment, Address, Inventory/Stock, Donation, Prayer, Reminder/Subscription, ContactMessage, NewsletterSubscriber, Reading/ChatHistory, UserProfile-extension, or Audit tables exist.

##### 4. Data creation and update flows

| Flow | Writes |
|---|---|
| Register | `users` + `user_role_mapping` (transaction); or update of unverified user |
| Email OTP | `otp_verifications` insert / mark used; `users.isEmailVerified` |
| Phone verify | `users.isPhoneVerified` |
| Login/Google/refresh | `sessions` insert/delete; Google link updates `users.googleId,isEmailVerified,profileImage` |
| Password reset | `password_reset_tokens` insert/used; `users.password` (transaction) |
| Admin CMS | CRUD on temples/images/pujas/chadhawas/shop tables; Cloudinary assets in parallel (non-atomic) |
| Darshan | upsert from `temples.json` via seed; `markLive/markOffline/touchLastChecked` from webhook and poll |
| Readings / AI chats / karma | **no database writes** (browser localStorage only) |

##### 5. Ownership by module

Auth → users, roles, user_role_mapping, sessions, otp_verifications, password_reset_tokens · Puja → temples, temple_images, pujas · Chadhawa → chadhawas (reads temples) · Shop → shop_categories, shop_products · Darshan → darshan_channels · Admin → no tables (re-reads users/roles).

##### 6. Persistence vs in-memory / mock

* Persistent: tables above.
* In-process memory: Darshan `EventEmitter` listeners, WebSub/poll timers.
* Browser only: session tokens, all Inner Voice data, Darshan prayer wall (component state), cart quantities (component state).
* Mock/hard-coded: `data/liveStreams.ts`, `data/blogPosts.ts`, zodiac/tarot data, fallbacks.

##### 7. Seeds and migrations

| Item | Notes |
|---|---|
| `npm run db:migrate` (`prisma migrate dev`) / `db:deploy` (`migrate deploy`) | not run |
| `db:seed` (`prisma/seeds/index.ts`) | upserts roles USER/ADMIN/SUPERADMIN — **required before registration works** |
| `db:seed:puja`, `:chadhawa`, `:shop`, `:darshan` | catalogue data and Darshan channels (from `temples.json`) — contents not audited |
| `prisma/seeds/makeadmin.ts` | promotes a **hard-coded personal email** to ADMIN; imports `../../prisma` without `.js` (differs from other seeds) — not parameterised |
| Migration drift | migration dir names are dated 2026-08…2026-10; whether prod DB matches is **[UNKNOWN]** |

##### 8. Consistency risks

* `Temple.priceFrom` vs puja prices can drift.
* Cloudinary and DB updates are not atomic (compensation only on batch upload failure; temple delete proceeds even if remote deletes fail → orphaned assets reported).
* Unique checks done as read-then-write (slugs, chadhawa names) can race; DB unique errors may surface as 500 [not verified].
* Three overlapping slug sets: `temples.json` (18), frontend `liveStreams.ts` (17 temples + 3 family events), catalogue `temples` table (admin-defined).
* No cleanup for expired OTPs, reset tokens, sessions or abandoned unverified users.
* Unverified accounts reserve emails/phones (phone unique) indefinitely.

##### 9. Possible consolidation — recommendation only (nothing done)

Add Order/Booking/Payment models once commerce is specified; store chat/readings per user if product wants history; derive `priceFrom` from pujas or drop it; add purge jobs and an index on `sessions.refresh_token`; decide whether Darshan channels should link to catalogue temples. Decisions pending: Section 18.

### Part: Database And Migration Guide

Model reference: Section 9. This guide covers **how to operate** the schema. No migration, seed or database command was executed while writing it; production schema state is **[UNKNOWN]** — never infer it from the files below.

##### 1. Setup facts

| Item | Value (from source) |
|---|---|
| Engine | PostgreSQL (Prisma `provider = "postgresql"`) |
| ORM | Prisma 7.9 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) |
| Client | `backend/prisma.ts`: `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`; default export `prisma` (also named `prisma`) |
| Schema location | `backend/prisma/schema/*.prisma` — multi-file (`schema.prisma` generator+datasource; `auth`, `temple`, `shop`, `darshan`) |
| Datasource URL | **not in the schema file** — supplied by `backend/prisma.config.ts` (`datasource.url = process.env["DATABASE_URL"]`, `schema: "prisma/schema"`, `migrations.path: "prisma/migrations"`) |
| Generator | `prisma-client-js`, default output (into `node_modules`); `prebuild` runs `prisma generate` |
| Env | `DATABASE_URL` only |
| Migrations lock | `prisma/migrations/migration_lock.toml` (postgresql) |

##### 2. Migration history

| # | Directory | Creates |
|---|---|---|
| 1 | `20260804061833_init_auth` | enums `AuthProvider(LOCAL,GOOGLE)`, `OtpType(REGISTER,LOGIN)`; tables `users`, `otp_verifications`, `password_reset_tokens`, `roles`, `user_role_mapping`, `sessions`; unique indexes on phone, email, google_id, token, role name, (user, role) |
| 2 | `20260810103538_add_puja_schema` | `temples` (unique slug), `temple_images`, `pujas` (+ FKs, indexes) |
| 3 | `20260811054543_added_chadhawa_model` | `chadhawas` (+ indexes on temple, (temple,is_active), display_order) |
| 4 | `20260812063637_implement_shop` | `shop_categories` (unique name, slug), `shop_products` (unique slug, FK category, indexes) |
| 5 | `20261015115200_add_darshan_channel` | `darshan_channels` (unique slug; indexes on channel id and is_live) |

Total after all migrations: 13 tables, 2 enums. Dates look like they use a 2026 calendar; compare with `_prisma_migrations` in each environment before applying anything.

Observations to act on (recommendations, not done):

* No index on `sessions.refresh_token`, yet refresh looks sessions up by that column.
* `password_reset_tokens.token` is plaintext (see Section 12).
* Chadhawa name uniqueness per temple exists only in application code (no unique index on `(temple_id, name)`).
* No retention/purge job for `otp_verifications`, `password_reset_tokens`, `sessions`.

##### 3. Seeds

| Command (in `backend/`) | File | Behaviour | Prerequisites |
|---|---|---|---|
| `npm run db:seed` | `prisma/seeds/index.ts` | upserts roles `USER`, `ADMIN`, `SUPERADMIN` | migrated DB. **Mandatory before registration** (register fails with 500 "run db:seed first") |
| `npm run db:seed:puja` | `pujaTemples.ts` | upserts temples by slug, **replaces pujas wholesale**, uploads images to Cloudinary only for temples without images. Flags: `--skip-images`, `--reset` (deletes the seeded temples first) | Cloudinary env unless `--skip-images`; data are copied from the former `frontend/src/data/temples.ts` |
| `npm run db:seed:chadhawa` | `chadhawaOfferings.ts` | offerings for seeded temples | puja seed first (needs temples) [order inferred from FK] |
| `npm run db:seed:shop` | `shopProducts.ts` | categories + products | Cloudinary for images [not audited] |
| `npm run db:seed:darshan` | `darshanChannels.ts` | upsert `darshan_channels` by slug from `src/config/temples.json` (18 rows, 4 with empty `youtubeChannelId`) | migration 5 |
| *(no npm script)* `npx tsx prisma/seeds/makeadmin.ts` | `makeadmin.ts` | grants ADMIN to a **hard-coded email constant** inside the file; user must already exist; imports `../../prisma` without `.js` unlike the others | edit the constant first; roles seeded |

`--reset` on the puja seed deletes data (cascade to pujas/images/chadhawas) — never run it against production.

##### 4. Standard procedures

###### 4.1 New developer database
```
createdb avatar_astro            # or any managed Postgres
# backend/.env : DATABASE_URL=postgresql://USER:PASS@HOST:5432/avatar_astro   (placeholder; never commit)
cd backend
npm install
npm run db:generate
npm run db:migrate               # prisma migrate dev  — applies all 5 migrations
npm run db:seed                  # roles
npm run db:seed:puja -- --skip-images
npm run db:seed:chadhawa
npm run db:seed:shop             # check the file for Cloudinary needs first
npm run db:seed:darshan
```

###### 4.2 Existing/production database
Use `npm run db:deploy` (`prisma migrate deploy`) only. Before the first run on an environment whose history is unknown, run `npx prisma migrate status` and compare; if the schema was created outside Prisma, baseline with `prisma migrate resolve --applied <name>` rather than re-running SQL. Take a backup first.

###### 4.3 Changing the schema
1. Edit the relevant `prisma/schema/*.prisma`.
2. `npm run db:migrate -- --name <what_changed>` on a development DB; review the generated SQL.
3. Commit schema + migration folder together.
4. Deploy with `db:deploy`. Destructive changes (drop/rename) need a two-step expand/contract plan.

###### 4.4 Promoting an admin
There is no UI or API for user-role management. Options: (a) edit `makeadmin.ts`'s email constant and run it; (b) insert into `user_role_mapping` for the user id and the `roles.id` of `ADMIN`. Role is baked into the access token, so the user must log in again (or wait ≤ 1 day) for it to apply.

###### 4.5 Housekeeping SQL (recommendations — review before use)
```sql
-- expired/used OTPs
DELETE FROM otp_verifications WHERE expires_at < now() - interval '1 day';
-- expired/used reset tokens
DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day' OR used;
-- expired sessions
DELETE FROM sessions WHERE expires_at < now();
```
Column names are snake_case as in the migrations (`expires_at`, `used`); confirm against your DB.

##### 5. Data lifecycle summary

| Data | Created | Updated | Deleted |
|---|---|---|---|
| user | register / Google | verify, profile, reset password | **never** (no delete/deactivate path; `isDeleted/isActive` only read) |
| session | login, refresh | – | refresh rotation, logout, logout-all, expired-on-use |
| otp / reset token | requested | `used=true` | never purged |
| temple / puja / image | admin | admin | admin (images: Cloudinary first) |
| chadhawa, shop rows | admin | admin | admin (category delete restricted) |
| darshan_channel | seed | webhook + poll (`isLive`, `currentLiveVideoId`, `lastCheckedAt`) | never |

##### 6. Known inconsistencies and risks

See Section 9 §8 for the full list. Operational highlights: Cloudinary↔DB non-atomic; read-then-write uniqueness races; abandoned unverified users keep reserving email/phone; three independent slug sets (Darshan config, frontend `liveStreams.ts`, catalogue tables).

##### 7. What cannot be verified from the repo

Production schema/migration state, row counts, indexes added manually, backups, connection limits, SSL requirements, managed-provider choice.


---

## 10. End-to-End User Journeys and Data Flows

### Part: User Flows And Use Cases

End-to-end journeys as the **code** implements them, with the point where each stops being real. Actors: **Visitor** (no login needed for anything except admin), **Registered user**, **Admin**, **System** (timers/webhooks). Feature IDs from Section 4; mechanics in Section 5. Mermaid blocks were written to be valid but **not rendered or syntax-tested**.

Key fact: **no user-facing feature requires login.** Accounts exist for admin access and (unused) profile data.

##### UC-01 Register and verify (A1–A3)

```mermaid
flowchart TD
  R[/register step 1: details/] -->|POST /auth/register| S{email or phone already verified?}
  S -->|yes| E409[409 error toast]
  S -->|no| M[step 2: choose method]
  M -->|email| O[POST /auth/resend-otp REGISTER]
  O --> V[/verify-otp 6 digits/]
  V -->|POST /auth/verify-otp| T[tokens issued, user stored in Zustand]
  M -->|phone| W[MSG91 widget -> accessToken]
  W -->|POST /auth/verify-phone| T
  T --> H{profileCompleted?}
  H -->|false| G[/google-onboarding/]
  H -->|true, admin| A[/admin/]
  H -->|true| Home[/]
```
Actor: visitor. Preconditions: roles seeded. Failure paths: duplicate verified account (409), wrong/expired OTP (400), resend within 60 s (429), MSG91 mismatch (400). Gaps: email delivery failure is silent; OTP attempts unlimited. Acceptance: Section 14 A-series.

##### UC-02 Login (A4, A7)
1. `/login` → `POST /auth/login`.
2. Full session → navigate to `from` or `getPostAuthPath(user)`: incomplete profile → `/google-onboarding`; admin → `/admin`; else `/`.
3. Unverified account → backend emails a LOGIN OTP and returns `{requiresVerification:true}`; `LoginPage` navigates to `/verify-otp` with state `{email, type:"LOGIN"}` (confirmed in `LoginPage.tsx`).
4. Thereafter every API call attaches the Bearer token; on 401 one shared refresh is attempted; failure logs the user out.

##### UC-03 Google sign-in and profile completion (A5, A6)
Google button → ID token → `POST /auth/google` → existing user (by Google id or email, linking) or new user with `profileCompleted=false` → redirect to `/google-onboarding` → `POST /auth/complete-profile` (names, phone, state/country/city, DOB, age ≥ 10). Phone is not verified; completion is enforced only by the front-end redirect.

##### UC-04 Forgot / reset password (A8)
`/forgot-password` → email → (Resend) link `FRONTEND_URL/reset-password?token=…` → `/reset-password` → new password (policy §BUSINESS_RULES 1) → login. Existing sessions stay valid.

##### UC-05 Daily horoscope (B1)
Visitor opens `/horoscopes`, picks one of 12 signs → `GET /api/interpretation/horoscope/:sign` → LLM text (Hinglish). Different text on every request; no date in prompt. Error → "Failed to generate horoscope".

##### UC-06 Explore a zodiac sign (B2)
`/zodiac` → `/zodiac/:sign`: static traits + a daily panel computed locally from a date-and-sign seed (stable within a calendar day on one device). Spin-wheel uses `Math.random`. Backend sign endpoints are not called.

##### UC-07 Birth chart "Cosmic Identity" (B3)
Visitor enters first name + DOB (+ optional last name, time, place) → local sun sign / life path / pseudo-scores → 5.6 s animated wait while `POST /api/birthchart/analyze` runs → results page mixing LLM text and static dictionaries. API failure is silent. **Not an astrological chart** (no ascendant, moon, planets, houses; time ignored).

##### UC-08 Compatibility (B5)
Two people's name + DOB → hash-derived scores (same input ⇒ same output) → 5.6 s wait → results and a chat box answering from canned keyword text. No server call.

##### UC-09 Name Destiny report (B6, B6b)
`/name-destiny-report`: name + DOB → local numerology (instant) → `POST /api/name-analysis/narrative` for prose (mock text on any failure) → sections (core numbers, aura, timeline, heatmap, name variants ranked by local score, celebrities, lucky numbers). Unlocking "premium" is a client flag labelled "Demo unlock"; ₹499 is not charged. "Export PDF" is client-side jsPDF.

##### UC-10 Tarot (B7)
Landing → mode: **Life Timeline** (question + 5 cards) or **Karma Mirror** (3 cards) → shuffle/choose → reveal → `POST /api/tarot/reading` → structured reading; any failure → static fallback reading. Nothing saved.

##### UC-11 Palm reading (B8)
`/palm-reading`: camera or upload → quality check (hand detected, confidence ≥ 0.55, sharp, large enough) → overlay of template lines on landmarks → dashboard metrics and canned reading. Entirely in-browser; the image is not uploaded.

##### UC-12 AI Guru consultation (C1, C2, C8)
```mermaid
sequenceDiagram
  participant U as Visitor
  participant B as Browser (InnerVoiceChat)
  participant G as Groq
  U->>B: message (typed or dictated)
  B->>G: system prompt + full history (key in bundle)
  G-->>B: JSON {reply, progress, readyForDiagnosis}
  B-->>U: reply bubble
  Note over B: after 3-5 exchanges readyForDiagnosis=true
  U->>B: open Report tab
  B->>G: transcript + diagnosis prompt
  G-->>B: large JSON report
  B-->>U: report + optional PDF (jsPDF)
```
Nothing is stored server-side; only a short title list is kept in `localStorage`. Refresh loses the conversation.

##### UC-13 Voice consultation (C3)
Mic (Chrome/Edge) → transcript → topic regex guard (≥ 2 words; rejects programming/sports/recipes/etc.) → Groq reply (380 tokens) → Roman-script transliteration → language detection → `POST /api/tts` (≤ 500 chars) → Sarvam WAV → playback. On-demand translation of a reply via Groq.

##### UC-14 Karma dashboard, journal, wisdom (C4–C6)
Profile saved locally → Groq returns score components → local composite with ticked daily actions → "Save today" persists up to 60 days locally. Journal: daily prompts, AI reflection, streak counter. Wisdom: situation → verse + meaning; save favourites. All data is per-browser.

##### UC-15 Browse temples, offerings and shop (D1, D3, D5)
Public lists from the API (60 s client cache) → detail pages → quantity steppers and totals shown. **Dead end:** "Proceed to Book", "Proceed to Offer", "Add to Cart", "Buy Now" have no handlers. Use case "buy/book/offer" is **not implemented** (no order, payment, address, inventory model).

##### UC-16 Watch a live darshan (E1–E4)
```mermaid
sequenceDiagram
  participant Y as YouTube
  participant H as WebSub hub
  participant S as Backend
  participant DB as PostgreSQL
  participant C as Browser
  S->>H: subscribe channel feed (callback /api/darshan/websub/callback)
  H-->>S: GET challenge, S echoes it
  Y->>H: new video published
  H->>S: POST atom/xml (unsigned)
  S-->>H: 204
  S->>Y: videos.list (snippet,status)
  S->>DB: markLive / markOffline
  S-->>C: SSE event (DarshanChannelDTO)
  C->>C: patch React Query cache; show player if isLive and videoId
  loop every 120 s
    S->>Y: re-check currently-live videos
    S->>DB: touchLastChecked or markOffline
  end
```
Visitor opens `/avatar-live/darshan`, sees temples, opens `/…/:slug`; the embedded IFrame appears only while the backend says live. Donate, prayer wall, reminders, viewer counts and "family events" are decorative.

##### UC-17 Admin manages catalogue (D7–D11)
Admin logs in → `/admin` → Puja/Chadhawa/Shop screens → forms validated by Joi server-side → images to Cloudinary → public pages reflect changes after the 60 s client cache.

##### UC-18 System: Darshan lifecycle (E2, E3)
At boot: subscribe all channels with IDs, renew every 3 days, poll every 120 s for live ones. Missed events (process down, stream live before subscribe) are not reconciled.

##### UC-19 Contact and newsletter (F1, F2)
Both show a success state without sending anything.

##### Use cases the product copy implies but the code does not support
Booking a puja and receiving confirmation/certificate/prasad; paying; donating; viewing order history; real Kundali/dasha/transit prediction; saved readings across devices; push/WhatsApp reminders; moderated prayer wall; account deletion. Status and decisions: Section 18, Section 19.

### Part: Integration And Data Flow Diagrams

Each diagram shows what the code **actually does**. Elements drawn with dashed borders / labelled *MISSING* or *SIMULATED* are not implemented or are faked. No flow was run end-to-end. Logic detail: Section 5.

##### 1. Registration, OTP verification, login (A1–A4, A7)

```mermaid
sequenceDiagram
  participant U as Browser
  participant B as /api/auth
  participant DB as PostgreSQL
  participant R as Resend
  participant M as MSG91
  U->>B: POST /register
  B->>DB: create user+role (txn) OR overwrite unverified user
  B-->>U: 201 (NO email/OTP sent here)
  alt choose email
    U->>B: POST /resend-otp {REGISTER}
    B->>DB: insert hashed OTP (10 min)
    B->>R: send (failures swallowed)
    U->>B: POST /verify-otp  (no attempt limit)
    B->>DB: mark used; isEmailVerified
  else choose phone
    U->>M: widget OTP
    U->>B: POST /verify-phone {email, accessToken}
    B->>M: verifyAccessToken
    Note over B: mobile match skipped if provider returns none
    B->>DB: isPhoneVerified
  end
  B-->>U: user + accessToken(1d) + refreshToken(30d)
  Note over U,B: Login: wrong/unknown email -> 404/401; unverified -> LOGIN OTP emailed (requiresVerification)
  U->>B: POST /refresh (on 401)
  B->>DB: delete old session, create new (rotation)
```

##### 2. AI Guru chat (C1, C2)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as InnerVoiceChat (browser)
  participant G as Groq API
  participant LS as localStorage
  U->>FE: message (text / Web Speech)
  FE->>G: system prompt + ALL prior messages (Bearer VITE_GROQ_API_KEY)
  G-->>FE: JSON {type,message,progress,readyForDiagnosis}
  FE->>LS: store first-message title only
  U->>FE: open Report (when ready)
  FE->>G: transcript + diagnosis prompt (4000 tokens)
  G-->>FE: large JSON (LLM-invented scores/dates)
  FE-->>U: report + local PDF (jsPDF)
  Note over FE,G: MISSING: backend proxy, auth, rate limits, saved conversation, birth-chart/transit/dasha computation
  Note over FE: Backend /api/inner-voice/* equivalents exist but are NOT called
```

##### 3. Text-to-speech (C3, C8)

```mermaid
sequenceDiagram
  participant FE as VoiceConsultation / InnerVoiceChat
  participant API as POST /api/tts
  participant S as Sarvam API
  FE->>API: {text, language}
  API->>API: text.slice(0,500); en* -> en-IN else hi-IN
  API->>S: bulbul:v3, speaker manan, pace 0.85, 22050 Hz (api-subscription-key)
  S-->>API: audios[0] (base64)
  API-->>FE: {audio}
  FE->>FE: atob -> Blob(audio/wav) -> Audio.play()
  Note over API: No auth, no caching of audio, no quota handling beyond HTTP error (502/500)
```

##### 4. Horoscope / astrology request flows (B1, B3, B5, B7)

```mermaid
flowchart TD
  subgraph B1["B1 Daily horoscope - LLM"]
    s1["select sign"] --> r1["GET /api/interpretation/horoscope/:sign"] --> o1["OpenRouter gpt-4-turbo-preview"] --> t1["free text - not cached - date not in prompt"]
  end
  subgraph B3["B3 Birth chart - mostly local"]
    f["name + DOB, optional time and place"] --> L["LOCAL: sun-sign table, digit-sum life path, hash pseudo-scores"]
    f --> a["POST /api/birthchart/analyze with name, zodiac, lifePath, dob, city"] --> o3["OpenRouter gemma"] --> txt["LLM text"]
    f -.->|"birth time and coordinates never sent"| X["MISSING: ephemeris, houses, planets, ascendant"]
    L --> w["fixed 5.6 s wait"] --> res["results"]
    txt --> res
  end
  subgraph B5["B5 Compatibility - simulated"]
    p["two names + DOBs"] --> h["hash pseudo-scores - sign and life path unused"] --> w5["5.6 s wait"] --> r5["results"]
    q["chat question"] --> c["keyword canned reply after 900 ms"]
    p -.->|"call commented out"| API5["POST /api/compatibility/analyze"]
  end
  subgraph B7["B7 Tarot"]
    d["client shuffle and pick cards"] --> t7["POST /api/tarot/reading"] --> o7["OpenRouter gemma-3"] --> r7["reading"]
    t7 -.->|"any failure"| fb["static fallback reading"]
  end
```

##### 5. Live Darshan discovery and status updates (E1–E4)

```mermaid
sequenceDiagram
  participant YT as YouTube channel
  participant Hub as WebSub hub
  participant API as Express /api/darshan
  participant YD as YouTube Data API
  participant DB as darshan_channels
  participant FE as Browser (React Query)
  API->>Hub: subscribe (startup + every 3 days; lease 4 d)
  Hub-->>API: GET callback?hub.challenge (echoed)
  YT->>Hub: video published/updated
  Hub->>API: POST Atom XML (UNSIGNED)
  API-->>Hub: 204
  API->>YD: videos.list(videoId)
  alt live and embeddable
    API->>DB: markLive(videoId)
  else anything else
    API->>DB: markOffline  (also hit by unrelated uploads!)
  end
  API-->>FE: SSE push (EventEmitter, single process)
  FE->>FE: patch query cache -> IFrame player
  loop every 120 s
    API->>YD: videos.list(currentLiveVideoId) for live channels
    API->>DB: markOffline if ended
  end
  Note over API: MISSING: initial live scan, signature check, quota backoff, multi-instance support, FE resync after reconnect
  Note over FE: List page shows hard-coded isLive until API data arrives
```

##### 6. Admin content and image upload (D8–D11)

```mermaid
sequenceDiagram
  participant A as Admin UI
  participant API as /api/admin (auth ADMIN)
  participant C as Cloudinary
  participant DB as PostgreSQL
  A->>API: POST /puja/temples/:id/images (multipart, <=10 x 10MB, MIME filter)
  API->>C: upload_stream (each)
  alt a later upload fails
    API->>C: destroy already-uploaded (compensation)
  else all ok
    API->>DB: createMany temple_images
  end
  A->>API: DELETE temple
  API->>C: destroy each image (failures -> orphanedImages list)
  API->>DB: delete temple (cascade pujas/images)
```

##### 7. Commerce flows - where they stop (D2, D4, D6, E6)

```mermaid
flowchart LR
  Browse["Catalogue pages: real API data"] --> Select["Select puja, offering or product and quantity: component state"]
  Select --> Total["Total computed in browser"]
  Total --> Btn["Book / Proceed to Offer / Add to Cart / Buy Now / Donate: NO HANDLER"]
  Btn -.-> M1["MISSING: customer details"]
  Btn -.-> M2["MISSING: availability / stock"]
  Btn -.-> M3["MISSING: payment"]
  Btn -.-> M4["MISSING: Order/Booking tables and states"]
  Btn -.-> M5["MISSING: confirmation, history, admin fulfilment"]
```

##### 8. Name Destiny report (B6, B6b)

```mermaid
flowchart TD
  In["name + DOB"] --> N["LOCAL numerology: destiny, soul urge, personality, Chaldean, life path, planets, overall score, variants"]
  N --> API["POST /api/name-analysis/narrative"]
  API --> LLM["OpenRouter gemma"]
  LLM -->|"ok"| Text["LLM narrative"]
  API -->|"no key, error or bad JSON"| Mock["templated mock text, HTTP 200, indistinguishable"]
  N --> UI["report"]
  Text --> UI
  Mock --> UI
  UI --> Pay["499 INR button sets unlocked state - SIMULATED, no payment"]
  Pay --> PDF["jsPDF client export"]
```


---

## 11. External Integrations and Tools

Only environment variable **names** are recorded. No secret was printed, copied or stored. Account/subscription status of every external service is **[UNKNOWN]** unless stated — the repository cannot show it. No pricing is stated or implied.

> **Claude Code vs. the app's AI providers.** Claude Code (the CLI used for this investigation/documentation) is a *developer tool* and is **not** a dependency of the application. The deployed app uses OpenRouter (backend; model IDs from Google, OpenAI, Anthropic families), Groq (browser) and Sarvam (TTS). The model ID `anthropic/claude-3.5-sonnet` appears only in the unused palm endpoint, routed via OpenRouter.

#### 1. Service register

| Service | Purpose | Dependent features | Code integration | Env names | Requirement status |
|---|---|---|---|---|---|
| **PostgreSQL** | persistence | all server features | Prisma + pg adapter | `DATABASE_URL` | **Required** |
| **OpenRouter** | LLM (text; vision in palm) | B1, B3, B4, B6, B7, B8b, C7 | axios/fetch to `https://openrouter.ai/api/v1/chat/completions` with Bearer | `OPENROUTER_API_KEY` | **Required** for AI readings; name report falls back to mock; models listed in Section 8; model availability/credit **UNKNOWN**; free-tier IDs rate-limited |
| **Groq** | LLM for AI Guru family **from the browser** | C1–C6 | fetch to `https://api.groq.com/openai/v1/chat/completions` | `VITE_GROQ_API_KEY`, `VITE_GROQ_MODEL` (default `openai/gpt-oss-120b`) | **Required** by current design; key is public in bundle — design decision pending |
| **Sarvam AI** | Text-to-speech (`bulbul:v3`, speaker `manan`) | C3, C8 | fetch to `https://api.sarvam.ai/text-to-speech` with `api-subscription-key` | `SARVAM_API_KEY` (backend); `VITE_SARVAM_API_KEY` appears in `.env.example`/types and as a fallback in the Vercel fn only — unused by `src` | Optional (voice mode) |
| **Resend** | OTP + password-reset email | A2, A4, A8 | `utils/mailer.ts` | `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL` | **Required** for email verification; needs a Resend-verified sender/domain; `SMTP_HOST/PORT/USER/PASS` are in env files but **unused** |
| **MSG91** | Phone OTP widget + server verification | A3 | `utils/msg91.ts`; FE `Msg91PhoneWidget` | `MSG91_AUTH_KEY`, `MSG91_WIDGET_ID`, `MSG91_TOKEN_AUTH` | Optional (alternative to email OTP); India DLT/template status UNKNOWN |
| **Google Identity Services** | Sign-in | A5, A6 | `google-auth-library` `verifyIdToken`; FE `useGoogleIdentity` | `GOOGLE_CLIENT_ID` (backend), `VITE_GOOGLE_CLIENT_ID` (frontend, must match); `GOOGLE_CLIENT_SECRET` present locally but unused | Optional; authorised origins must include FE origins |
| **Cloudinary** | Admin image storage | D8, D10, D11 | `config/cloudinary.ts` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required for admin uploads; API key needs `create` permission |
| **YouTube WebSub hub** | push of channel feed updates | E2 | `https://pubsubhubbub.appspot.com/subscribe`, callback `/api/darshan/websub/callback` | `BACKEND_PUBLIC_URL` | Required for live detection; backend must be public HTTPS and always-on |
| **YouTube Data API v3** | confirm live/embeddable (`videos.list`) | E2, E3 | `darshan.youtube.ts` | `YOUTUBE_API_KEY`, `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS` (default 120) | Required for Darshan; project/quota UNKNOWN |
| **YouTube IFrame API** | embedded player | E1 | FE script `https://www.youtube.com/iframe_api` | – | Required for Darshan UI |
| **Nominatim (OpenStreetMap)** | place autocomplete | B3, B5 | direct browser fetch | – | Optional; OSM usage policy (identifying User-Agent, no heavy autocomplete) is a risk |
| **MediaPipe assets** | hand landmarks | B8 | runtime fetch from jsDelivr and `storage.googleapis.com` | – | Required for palm scan |
| **External "astro-api"** | Vedic chart/horoscope | B9a (dead) | `astroApiService` default Render URL | `ASTRO_API_BASE_URL` | **Unused** (router unmounted) |
| **Auth0** | login inside `solar-system-app` only | F4 | separate app config files | (in that app) | Separate project; not part of main auth |
| **Vercel / Render** | hosting hints | – | `vercel.json`, `api/tts.ts`, CORS domain | `CORS_ORIGIN` | Deployment status UNKNOWN |

**Not present / future only (no code):** payment gateway, WhatsApp/SMS notification provider, ephemeris or astrology API in use, object storage for audio, error monitoring, Redis.

#### 2. Environment variable names by area

**Backend (`backend/.env`)** — `.env.example` lists only: `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRE`, `CORS_ORIGIN`, `SMTP_HOST/PORT/USER/PASS`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, `BACKEND_PUBLIC_URL`, `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS`, `CLOUDINARY_*`. **Missing from the example but used by code:** `DATABASE_URL`, `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `MSG91_AUTH_KEY`, `MSG91_WIDGET_ID`, `MSG91_TOKEN_AUTH`, `SARVAM_API_KEY`, `ASTRO_API_BASE_URL`(dead). **Present locally but unused:** `MONGODB_URI`, `MONGODB_DNS_SERVERS`, `DARSHAN_REFRESH_INTERVAL_MINUTES`, `GOOGLE_CLIENT_SECRET`, `SUPPORT_EMAIL`, `SMTP_*`, `JWT_EXPIRE` (legacy middleware only).

**Frontend (`frontend/.env*`)** — `VITE_API_URL` (default `http://localhost:5000/api`), `VITE_GOOGLE_CLIENT_ID`, `VITE_GROQ_API_KEY`, `VITE_GROQ_MODEL`, `VITE_SOLAR_SYSTEM_URL` (default `http://localhost:3000`), `VITE_ENV`, `VITE_SARVAM_API_KEY` (unused), `VITE_GEMINI_API_KEY` (typed only). `frontend/.env.local` exists locally and is untracked.

**Port facts:** backend `PORT` defaults to 5001 if unset in `index.ts` (legacy `config/environment.ts` defaults to 5000; local `.env` sets 5000); Vite dev server 8081 proxying `/api` → `localhost:5000`; `FRONTEND_URL` default `http://localhost:3000` (does not match 8081).

#### 3. Local setup prerequisites and commands (from `package.json`; none were executed by the investigation except the read-only checks noted)

Prerequisites: Node.js (version not pinned in the repo; Node 20 is *inferred* from backend `@types/node` ^20), npm, a PostgreSQL database, backend `.env` (see above), frontend `.env.local`.

```
# backend (cd backend)
npm install
npm run db:generate        # prisma generate
npm run db:migrate         # prisma migrate dev   (or db:deploy for existing envs)
npm run db:seed            # roles — required before registration
npm run db:seed:puja | db:seed:chadhawa | db:seed:shop | db:seed:darshan
npm run dev                # tsx watch src/index.ts
npm run build && npm start # tsc && tsc-alias ; node dist/src/index.js
npm run lint

# frontend (cd frontend)
npm install
npm run dev                # vite, port 8081
npm run build              # note: rollup-plugin-visualizer is configured with open:true
npm test                   # vitest run (1 trivial test)
npm run lint
```

Read-only checks that **were** run: backend `tsc --noEmit` (clean), frontend `vitest run` (1 trivial test passes), frontend `tsc -p tsconfig.app.json --noEmit` (40 errors). Backend Jest tests cannot run as-is.

#### 4. To verify before production

* Valid and funded accounts/keys: OpenRouter (and that the model IDs exist), Groq (model exists), Sarvam, Resend (domain verified), MSG91 (widget, DLT), Google OAuth client + authorised origins, Cloudinary (create permission), YouTube API project and quota.
* Live Darshan: public HTTPS `BACKEND_PUBLIC_URL`; always-on single instance; four temples need channel IDs.
* Rotate any key ever bundled to browsers (Groq) — a design change is pending (Section 19 T-SEC).
* Complete `.env.example`; remove unused keys.


---

## 12. Authentication, Authorization, Security, and Privacy

**Current behaviour** sections describe code as found; **Recommended** sections are proposals, not changes made. Nothing was exercised at runtime. Source: `backend/src/modules/auth/*`, `utils/{auth,mailer,msg91,googleAuth}.ts`, `middleware/authMiddleware.ts`, `frontend/src/{lib/authClient.ts,store/authStore.ts,features/auth,routes}`. Feature logic: Section 5 A1–A9.

#### 1. Current behaviour

##### 1.1 Registration and account creation (A1)
Required: first/last name, email, password (≥8, lower+upper+digit), Indian 10-digit mobile `^[6-9]\d{9}$`, state, country, city. New users are created with the `USER` role in one transaction; flags `isEmailVerified=false`, `isPhoneVerified=false`, `profileCompleted=true`. An existing **unverified** account with the same email is overwritten. Registration itself sends no OTP.

##### 1.2 Email OTP (A2)
6 digits via `Math.random`, SHA-256 (unsalted) in `otp_verifications`, valid 10 min, single use, resend gap 60 s, older unused codes invalidated. Lookup is by hash + email + type. No attempt counting. Mail failures are swallowed.

##### 1.3 Phone verification (A3)
MSG91 widget in browser → `accessToken` → backend calls MSG91 `widget/verifyAccessToken` (5 s timeout). If the response carries a mobile it must end with the registered digits; otherwise the comparison is skipped. Then `isPhoneVerified=true` and a session is issued. Endpoint is unauthenticated and keyed by email.

##### 1.4 Login / logout (A4, A7)
Login looks up by email; unknown → 404; password-less (Google-only) → 401; bcrypt compare (cost 8); inactive → 403 (checked **after** password); neither email nor phone verified → LOGIN OTP is emailed and `{requiresVerification:true}` returned. Logout deletes the presented refresh-token session; `logout-all` (authenticated) deletes all of a user's sessions.

##### 1.5 Google OAuth (A5, A6)
Client obtains a Google ID token; backend verifies signature/audience (`GOOGLE_CLIENT_ID`) and requires `email_verified`. Match by `googleId`; else by email → **link** (sets `googleId`, `isEmailVerified=true`, **keeps any existing password**); else create a GOOGLE user with `profileCompleted=false`. Such users must call `POST /auth/complete-profile` (age ≥ 10); the requirement is enforced by a frontend redirect, not by backend gating of other routes.

##### 1.6 Password reset (A8)
Token = 32 random bytes hex, stored **plaintext**, valid 1 h, single use; earlier unused tokens invalidated. Unknown email → 404 "Account … doesn't exist". Reset updates the password and token in a transaction; **sessions are not revoked**. Link base `FRONTEND_URL`.

##### 1.7 Token lifecycle and rotation (A7)
| Token | Format | TTL | Storage |
|---|---|---|---|
| Access | JWT `{id, role}` signed with `JWT_SECRET` | 1 day | client localStorage (Zustand `auth`) |
| Refresh | 32 random bytes hex | 30 days | client localStorage; server stores SHA-256 in `sessions` |

Refresh: lookup by hash → expired ⇒ delete + 401; user inactive/deleted ⇒ 403; otherwise delete old session and create a new one (**rotation**). Client deduplicates concurrent refreshes (`refreshPromise`) and retries the failed request once; if refresh fails it clears the session. No `/me` endpoint; user object is kept from login time.

##### 1.8 Roles and admin (A9)
Roles `USER`, `ADMIN`, `SUPERADMIN` (alias `SUPER_ADMIN` tolerated). `auth(...roles)` verifies the JWT and applies the hierarchy using the role **inside the token**. `/api/admin/*` requires ADMIN. `AdminService.getDashboard` re-checks DB role/active status. Admin creation: `prisma/seeds/makeadmin.ts` (hard-coded personal email). No user-management UI/API.

##### 1.9 Existing controls
Joi validation on auth/admin modules; bcrypt; hashed refresh tokens and OTPs; refresh rotation; role hierarchy; Cloudinary upload filter (declared MIME, size, count); CORS allowlist; generic success message for unknown-email OTP resend; parameterised DB access via Prisma.

#### 2. Confirmed vulnerabilities and weaknesses

| ID | Severity | Issue | Location | Evidence |
|---|---|---|---|---|
| SEC-1 | Critical | Groq API key compiled into the browser bundle | `InnerVoiceChat.tsx`, `InnerVoice.tsx`, `InnerVoiceDashboard.tsx`, `InnerVoiceJournal.tsx`, `InnerVoiceWisdom.tsx`, `VoiceConsultation.tsx` (`import.meta.env.VITE_GROQ_API_KEY`) | code |
| SEC-2 | High | No auth/rate limit on LLM, TTS, palm endpoints; 20 MB JSON limit → cost abuse/DoS | `index.ts`, `routes/*` | code |
| SEC-3 | High | OTP brute force: 6 digits, no attempt cap, `Math.random`, unsalted hash | `auth.service.ts` (`generateOtp`, `verifyOtp`) | code |
| SEC-4 | High | Account pre-hijack: unverified overwrite on register + Google link keeps attacker's password | `register`, `googleAuth` | code path; not exercised |
| SEC-5 | High | Phone match skipped when MSG91 response has no mobile → unauthenticated session issuance for any unverified email with any valid widget token | `verifyPhone` | code; MSG91 response shape UNKNOWN |
| SEC-6 | Medium | User enumeration (login 404, forgot-password 404) | `login`, `forgotPassword` | code |
| SEC-7 | Medium | Unsigned WebSub webhook: forged posts burn YouTube quota; no `hub.secret`; challenge echoed unchecked | `darshan.controller.ts`, `darshan.websub.ts` | code |
| SEC-8 | Medium | Reset tokens plaintext; password reset doesn't revoke sessions; no reuse detection for refresh tokens | `forgotPassword`, `resetPassword`, `refresh` | code |
| SEC-9 | Medium | bcrypt cost 8 | `utils/auth.ts` | code |
| SEC-10 | Medium | Role trusted from 1-day token; deactivation/demotion delayed | `authMiddleware.ts` | code |
| SEC-11 | Medium | Tokens in localStorage (XSS-exposed) | `authStore.ts` | code |
| SEC-12 | Low | Hard-coded personal email in admin seed; legacy `config/environment.ts` default JWT secret string; stray `backend/darshan-live.txt`/`video.txt` committed | seeds, config | code (no secrets found in tracked files by pattern search) |
| SEC-13 | Low | MIME-only upload check (no magic-byte); CORS rejection yields 500; no `helmet`; no `trust proxy`; SSE unbounded | `upload.ts`, `index.ts`, `darshan.controller.ts` | code |
| SEC-14 | Info | Nominatim/MediaPipe fetched from browser (third-party exposure) | frontend | code |

Quota/cost vector: SEC-2 + SEC-7 can spend OpenRouter/Sarvam credits and YouTube quota without authentication.

#### 3. Recommended remediation (not implemented)

* SEC-1: move Groq calls behind the backend (existing `/api/inner-voice/*` is a starting point), rotate any key previously built into a browser bundle, and remove `VITE_GROQ_*`.
* SEC-2: add authentication or per-IP/per-user rate limits and per-route body limits; add `helmet`; validate inputs.
* SEC-3: `crypto.randomInt`, HMAC/salted OTP hash, per-email attempt counter with lockout, global rate limits.
* SEC-4: on first Google link of an unverified local account, discard the password and sessions; do not overwrite unverified accounts without proof of ownership.
* SEC-5: fail closed when the provider does not return the mobile; consider requiring the registration session.
* SEC-6: uniform responses and timing for login/forgot-password.
* SEC-7: use `hub.secret` and verify `X-Hub-Signature`; validate `hub.topic`; match notification video IDs against the current live video before marking offline; add startup scan.
* SEC-8/9: hash reset tokens, revoke sessions on reset, refresh-token family reuse detection, bcrypt cost ≥ 10–12 (benchmarked).
* SEC-10/11: short access TTL or DB check for admin routes; consider HttpOnly cookie for the refresh token.
* Housekeeping: purge jobs for OTPs/tokens/sessions/unverified users; remove personal email from seeds; delete dead legacy auth.

#### 4. Security verification checklist (proposed — none performed)

- [ ] 6-digit OTP lockout after N failures (per email and per IP).
- [ ] Pre-hijack scenario fails (attacker password unusable after Google link).
- [ ] `verifyPhone` rejects when provider omits/mismatches mobile.
- [ ] Forged WebSub POST/GET rejected.
- [ ] Unauthenticated calls to AI/TTS endpoints limited.
- [ ] Production bundle contains no provider keys (grep `dist/`).
- [ ] Refresh-token rotation and revocation (logout, logout-all, reset) tested.
- [ ] Admin route denies USER, expired, tampered, and demoted-user tokens.
- [ ] Upload rejects spoofed MIME types.
- [ ] Dependency audit (`npm audit`) reviewed — not run in this investigation.


---

## 13. Error Handling and Logging

### 13.1 Error envelopes
* Module routes (`auth`, `admin`, `puja`, `chadhawa`, `shop`): `sendResponse` gives `{status:boolean, data, message}`; errors thrown as `ApiError(statusCode, message)` are formatted by `middleware/errorHandler.ts`, which also `console.error`s them.
* Legacy/AI/Darshan routes: `{success:boolean, data|error}` or bare JSON (`{error}` for birthchart, name-analysis, inner-voice; `{success:false,error}` for tarot, palm, interpretation).
* Final handler in `backend/src/index.ts`: numeric `err.statusCode` goes to `errorHandler`; otherwise `{success:false,error: message}` with `err.status || 500`.
* A CORS rejection (`Error("Not allowed by CORS")`) has no `statusCode`, so it is returned as **HTTP 500**.

### 13.2 Fallback behaviour by feature
| Feature | On failure |
|---|---|
| Daily horoscope | 500, UI shows "Failed to generate horoscope" |
| Interpretation birth-chart | canned text only on provider HTTP 402; other errors 500 |
| Birth chart analyze | UI swallows the error; static dictionaries and pseudo scores shown |
| Name narrative | `mockNarrative` with HTTP 200 for missing key, provider error, bad JSON or exception |
| Tarot | UI `generateFallbackReading` (static) |
| AI Guru chat | JSON parse failure: canned greeting; network error: apology bubble; diagnosis failure: `null` |
| Karma dashboard | hard-coded composite 62 data displayed as normal |
| TTS | backend 400 (no text), 500 (no key), 502 (Sarvam failure); client playback fallback wiring not fully traced |
| Email OTP / reset | send errors caught and logged; API still responds as if sent |
| MSG91 verify | 5 s timeout, `{success:false}`, HTTP 400 |
| Image upload | Cloudinary 401/403 mapped to readable 400; batch failure rolls back already-uploaded assets |
| Darshan | per-channel errors logged, DB state unchanged; missing `YOUTUBE_API_KEY` skips with a warning |
| Frontend routes | `*` renders `NotFound`; no global React error boundary was identified (not exhaustively checked) |

### 13.3 Logging
`console.log/warn/error` only. No request logger, request IDs, structured logs, log levels, redaction, error tracker or metrics. Prefixes: `[darshan]`, `[Sarvam TTS]`, `Error Handler Middleware:`, `✗ CORS rejected origin`, `OpenRouter … Error`. Provider error bodies are logged unscrubbed.

### 13.4 Edge cases
Unknown sign on `/api/zodiac/signs/:sign` falls back to Aries; non-A–Z name characters are dropped in numerology; an empty name yields number 0; the palm endpoint accepts up to 20 MB JSON; SSE connections are unbounded; unverified accounts reserve email and phone indefinitely.


---

## 14. Testing and Acceptance Criteria

#### Part 1 — Tests that actually exist and results (investigation, 2026-10-19)

| Check | Command (read-only) | Result |
|---|---|---|
| Backend type-check | `tsc --noEmit` in `backend/` | exit 0, no diagnostics printed |
| Frontend unit tests | `vitest run` | 1 file / 1 test passed — `expect(true).toBe(true)` (`frontend/src/test/example.test.ts`) |
| Frontend type-check | `tsc -p tsconfig.app.json --noEmit` | **40 errors in 11 files** |
| Backend Jest tests | – | **Not runnable**: no `jest`/`ts-jest` dependency, no `test` script, tests excluded by `tsconfig.json`; they cover only dead code (`middleware/auth.ts`, `birthDataValidation.ts`) |
| Not executed | `vite build`, dev servers, DB, migrations, seeds, any provider call, `npm audit`, lint | – |

**No feature has passing tests, and no feature is verified working.** Everything in Part 2 is *proposed*; writing criteria does not mark anything as passing.

#### Part 2 — Proposed tests and acceptance criteria

General approach: local only, throwaway PostgreSQL (e.g. container), all external services (Resend, MSG91, Google, OpenRouter, Groq, Sarvam, Cloudinary, YouTube, Nominatim) **stubbed**; no real payments/messages; no production data. Stack suggestion: Vitest/Jest + supertest (backend), Vitest + Testing Library (frontend), Playwright (E2E). A feature is "complete" only when its criteria pass **and** its listed decisions (Section 18) are resolved.

##### A — Authentication (A1–A9)
* **Preconditions:** seeded roles; mocked mailer/MSG91/Google; fixed clock.
* **Positive:** register→email OTP→session; register→phone verify→session; login; Google new user→complete profile; refresh rotation; logout; logout-all; reset password; admin dashboard as ADMIN.
* **Negative:** weak password; non-Indian phone; duplicate email/phone; wrong/expired/used OTP; resend within 60 s → 429; unknown email behaviours; inactive user; expired/tampered JWT; USER on admin route; reused refresh token.
* **Edge:** unverified duplicate registration; Google link on unverified local account; MSG91 response without `mobile`; concurrent refresh calls (client dedup).
* **Expected today vs target:** brute-force lockout and pre-hijack prevention are *target behaviours* (currently absent) — tests should fail until T-AUTH tasks land.
* **Complete when:** all paths pass; lockout, pre-hijack, phone-match tests pass; coverage of `auth.service` high; no secrets in logs.

##### B — Readings
* **B1:** mocked provider; positive: text rendered; negative: 402/429/timeout/missing key; edge: invalid sign (target: 400). Complete when caching and validation exist per decision D-AST-*.
* **B2/B3/B5:** unit-test `getZodiac` cusp days (Jan 19/20, Feb 18/19, Mar 20/21, … Dec 21/22), `getLP` (incl. 11, 22), determinism of `hash/dv/deriveScore`. Assert these are *pseudo* outputs (document, not endorse). Real birth chart: golden fixtures vs a reference ephemeris — only after D-AST-1.
* **B6:** golden fixtures for numerology (destiny, soul urge, personality, Chaldean, life path, overall score formula); narrative with provider success/failure/bad JSON; target: UI can distinguish fallback. Edge: non-Latin names, empty strings, >14 letters.
* **B6b:** target tests only once payment exists; today assert it is a client-state demo.
* **B7:** mocked fetch; 3- and 5-card payloads; wrong count (target: 400); malformed JSON → fallback.
* **B8:** component tests with mocked MediaPipe; quality-gate branches (`no_hand_detected`, `too_blurry`, `hand_too_small`, `low_confidence`); synthetic/consented images only.
* **B4/B8b/B9a:** contract tests only if the features are revived; otherwise remove.

##### C — AI Guru and Inner Voice
* Provider interface mocked; positive: greeting/gathering/readyForDiagnosis transitions; diagnosis JSON schema; PDF generation runs; negative: provider 429, malformed JSON, empty reply; edge: very long history (token growth), Devanagari input, language directive. Voice: mocked `SpeechRecognition`; TTS 500+ chars truncation, `en`→`en-IN`, other→`hi-IN`, missing key → 500, provider failure → 502.
* **Complete when:** keys are server-side (no `VITE_GROQ_*` in `dist/`), limits enforced, outputs schema-validated, persistence/retention decisions implemented.

##### D — Devotion commerce and admin
* **Public lists (D1, D3, D5):** seeded DB; positive: list/detail; negative: unknown slug 404; inactive items hidden; chadhawa temples with zero active offerings hidden.
* **Admin (D7–D11):** supertest with ADMIN token; validation bounds (see logic reference), duplicate slug 409, category-with-products delete 409, upload >10 MB / wrong MIME / >10 files, Cloudinary failure compensation, temple delete reporting `orphanedImages`. Edge: concurrent slug creation; `originalPrice ≤ price` (currently accepted).
* **D2/D4/D6:** today assert buttons are inert (documenting reality); real acceptance criteria require the commerce spec (D-PAY-*): idempotent payment webhook, order state transitions, availability, confirmation.
* **Complete when (catalogue/admin):** tests pass and pagination/caching decisions made. **Commerce:** not definable until decisions are made.

##### E — Live Darshan
* **Handler tests:** feed recorded Atom XML with mocked `getVideoLiveStatus`: live→markLive; not-live→markOffline; unknown channel ignored; missing key skipped; forged POST (target: rejected); non-live upload during live stream (target: stays live — currently marks offline); GET challenge echo (target: validates topic).
* **Poll tests:** fake timers; stream ends → offline + SSE broadcast; API error → state unchanged; restart while live (target: startup scan).
* **SSE:** event stream receives updates; heartbeat; client disconnect cleans listener; FE patches cache; FE resync after reconnect (target).
* **FE:** list page must not show hard-coded LIVE while loading (target); player only with live videoId; embed-error retry codes 101/150.
* **Quota:** unit test counts API calls per interval per live channel.
* **Complete when:** replay suite of live→upload→end sequences passes; forged webhook rejected; quota monitored.

##### F — Site
* **F1/F2:** decide scope; then API tests (validation, storage/email) and E2E; today assert the UI never calls the API.
* **F3/F5:** smoke render tests. **F4:** confirm production `VITE_SOLAR_SYSTEM_URL` and iframe loads. **F6:** CORS allow/deny (target: 403 not 500), health.

##### Cross-cutting
* CI: type-check (fix 40 frontend errors), lint, unit, integration; bundle check for keys; `npm audit` review.
* E2E (Playwright) on a local stack with stubs for the main journeys: register/login, horoscope, tarot, name report, Puja browse, Darshan live toggle via simulated webhook, admin CRUD.


---

## 15. Environment Configuration and Local Setup

Environment variable **names** only; never paste real values into documents or commits. Commands come from `package.json` files; this pass **re-ran only** `tsc --noEmit` (backend), `tsc -p tsconfig.app.json --noEmit` (frontend) and `vitest run` — no server, database or provider was started.

#### 1. Prerequisites

* Node.js (version not pinned in the repo; backend `@types/node` ^20 suggests Node 20+ — inferred), npm.
* PostgreSQL 14+ reachable via `DATABASE_URL` (version requirement inferred, not stated).
* Optional keys depending on what you want to exercise: see Section 11.
* Windows is fine (project was developed on Windows paths); shell examples below are POSIX/PowerShell-neutral.

#### 2. Ports and URLs

| Process | Default | Source |
|---|---|---|
| Backend | `PORT` env, else **5001** (`backend/src/index.ts`) | local `.env` conventionally sets 5000 |
| Frontend dev server | **8081**, `host: "::"` | `frontend/vite.config.ts` |
| Vite proxy | `/api` → `http://localhost:5000` | same file (only helps if backend is on 5000) |
| Frontend API base | `VITE_API_URL` else `http://localhost:5000/api` | `frontend/src/lib/*` |
| `FRONTEND_URL` default (password-reset links) | `http://localhost:3000` | does **not** match 8081 — set it |
| Solar system iframe | `VITE_SOLAR_SYSTEM_URL` else `http://localhost:3000` | `/solar-system` |

Simplest consistent local setup: backend `PORT=5000`, `FRONTEND_URL=http://localhost:8081`, no `VITE_API_URL` needed. CORS already allows `localhost:8081` and any LAN IP.

#### 3. Backend

```
cd backend
npm install
# create backend/.env  (see §5)
npm run db:generate
npm run db:migrate       # applies 5 migrations to an empty dev DB
npm run db:seed          # roles — required before registering users
npm run db:seed:darshan  # optional: Live Darshan channel rows
npm run db:seed:puja -- --skip-images   # optional catalogue data without Cloudinary
npm run dev              # tsx watch src/index.ts
```
Health check: `GET http://localhost:<PORT>/api/health` → `{success:true,message:"Server is running"}`.

Build: `npm run build` (runs `prisma generate`, `tsc`, `tsc-alias`) → `npm start`.
Lint: `npm run lint`. **Tests:** none runnable (Jest files exist but `jest`/`ts-jest` are not installed, there is no `test` script, and `tsconfig` excludes `src/__tests__`).

Live Darshan locally: `BACKEND_PUBLIC_URL` must be a public HTTPS URL (e.g. a tunnel) or WebSub subscribe will fail/never call back; without `YOUTUBE_API_KEY` the webhook/poll skip with a warning. With no `BACKEND_PUBLIC_URL`, `subscribeAllChannels` logs per-channel errors and the app still starts.

#### 4. Frontend

```
cd frontend
npm install
# create frontend/.env.local (see §5)
npm run dev      # http://localhost:8081
npm run build    # NOTE: rollup-plugin-visualizer is configured with open:true → opens stats.html in a browser
npm run lint
npm test         # vitest run → 1 trivial test
```

Camera/microphone features (palm scan, voice) need `https` or `localhost`. Speech recognition works in Chrome/Edge only.

#### 5. Environment files (names only)

`backend/.env`
```
PORT=            NODE_ENV=         DATABASE_URL=
JWT_SECRET=      CORS_ORIGIN=      FRONTEND_URL=       APP_NAME=
RESEND_API_KEY=  SMTP_FROM_EMAIL=
GOOGLE_CLIENT_ID=
MSG91_AUTH_KEY=  MSG91_WIDGET_ID=  MSG91_TOKEN_AUTH=
OPENROUTER_API_KEY=
SARVAM_API_KEY=
CLOUDINARY_CLOUD_NAME=  CLOUDINARY_API_KEY=  CLOUDINARY_API_SECRET=
YOUTUBE_API_KEY=  BACKEND_PUBLIC_URL=  DARSHAN_LIVE_CHECK_INTERVAL_SECONDS=
```
`backend/.env.example` covers only part of this (it lists `PORT, NODE_ENV, JWT_SECRET, JWT_EXPIRE, CORS_ORIGIN, SMTP_*, OPENROUTER_API_KEY, YOUTUBE_API_KEY, BACKEND_PUBLIC_URL, DARSHAN_LIVE_CHECK_INTERVAL_SECONDS, CLOUDINARY_*`), and omits the rest — update it when convenient. A weak or missing `JWT_SECRET` must not be used outside local dev.

`frontend/.env.local`
```
VITE_API_URL=  VITE_GOOGLE_CLIENT_ID=  VITE_GROQ_API_KEY=  VITE_GROQ_MODEL=  VITE_SOLAR_SYSTEM_URL=
```
Anything prefixed `VITE_` is embedded in the browser bundle. Use a throwaway Groq key locally.

Minimum to see most pages: `DATABASE_URL`, `JWT_SECRET`, migrated + role-seeded DB. Everything else degrades per feature (AI pages error, TTS 500, email OTP not delivered, uploads fail).

#### 6. What works with which configuration

| You want to try | Needs |
|---|---|
| Browse Puja/Chadhawa/Shop/Darshan lists | DB + seeds |
| Register/login by email | DB + roles seed + `RESEND_API_KEY` & verified sender (otherwise OTP is only logged as an error; you can read the OTP hash only — see note) |
| Google sign-in | `GOOGLE_CLIENT_ID` (backend) = `VITE_GOOGLE_CLIENT_ID`; `http://localhost:8081` as an authorised origin |
| Phone OTP | MSG91 widget/auth values |
| Admin CMS | an ADMIN user (Section 9 §4.4) + Cloudinary for images |
| Horoscope/Birth chart/Name narrative/Tarot | `OPENROUTER_API_KEY` (name narrative works without a key via mock text) |
| Inner Voice (all pages) | `VITE_GROQ_API_KEY` |
| Voice playback | `SARVAM_API_KEY` |
| Palm scan | camera + internet (MediaPipe assets from jsDelivr / Google storage) |
| Live Darshan "LIVE" state | `YOUTUBE_API_KEY`, public `BACKEND_PUBLIC_URL`, channels with IDs |

Note on OTP in dev: OTPs are stored hashed (SHA-256) and only emailed, so without a working mailer you cannot read one. For local testing either configure Resend, temporarily log the code in a **local, uncommitted** change, or insert a known hash directly into `otp_verifications`. Nothing in the repo provides a dev bypass.

#### 7. Verification commands used in this documentation pass

| Check | Result (2026-10-19) |
|---|---|
| `cd backend && npx tsc --noEmit -p .` | exit 0, no diagnostics |
| `cd frontend && npx tsc -p tsconfig.app.json --noEmit` | **40 errors** |
| `cd frontend && npx vitest run` | 1 file, 1 test passed |
| Backend tests | not runnable |
| Lint, builds, servers, DB, providers | **not run** |

#### 8. Troubleshooting

* `register` returns 500 "run db:seed first" → roles table empty.
* CORS error from a custom host/port → add to `CORS_ORIGIN` or the explicit list in `index.ts` (rejections surface as HTTP 500 with "Not allowed by CORS").
* Password-reset link opens a dead port → set `FRONTEND_URL`.
* Vite proxy 404s → backend not on port 5000.
* `/solar-system` blank → nothing serves `http://localhost:3000`; start `solar-system-app` (its own `npm install` / `server.js`) or set `VITE_SOLAR_SYSTEM_URL`.
* Build opens a browser → `visualizer({ open: true })` in `vite.config.ts`.
* AI features return provider errors → model slug may be unavailable; see Section 6.


---

## 16. Known Issues and Technical Debt

Every issue below was found by reading code (or the read-only checks in Section 14). **None has been fixed.** Priority: **P0** fix before any public exposure · **P1** correctness/honesty before launch · **P2** operations/scalability. Remediation is a recommendation; task IDs refer to Section 19.

#### 1. Security (critical/high) — details in Section 12

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

#### 2. Broken or misleading features

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

#### 3. Incomplete workflows / mocked behaviour

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

#### 4. Unused and obsolete code

* Unmounted: `horoscopeRoutes`, `horoscopeController`, `astroApiService`, `middleware/auth.ts`, `config/environment.ts`, `birthDataValidation.ts` (tests exist only for the latter two and cannot run).
* Mounted but uncalled: `/api/palm-reading`, `/api/inner-voice/*`, `/api/compatibility/analyze`, `/api/birthchart/chat`, `/api/interpretation/{birth-chart,compatibility,chart-chat}`, `/api/zodiac/*`.
* Frontend: `lib/api.ts` (except Darshan), `hooks/useApi.ts`, `hooks/useChartChat.ts`, `useInterpretBirthChart`, unused route guards, `VITE_GEMINI_API_KEY` typing, `frontend/public/` solar copies and "(1)" duplicates, ~1,000+ commented lines in big pages.
* Duplicates: three TTS handlers (+ differing root `api/tts.ts`), four sun-sign tables, two life-path implementations.
* Stray tracked files: `backend/darshan-live.txt`, `video.txt`, many root status `.md` files of unverified accuracy.

#### 5. Configuration and environment

* `backend/.env.example` omits `DATABASE_URL`, `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `MSG91_*`, `SARVAM_API_KEY`; lists unused `SMTP_*`.
* Stale `MONGODB_*`, `DARSHAN_REFRESH_INTERVAL_MINUTES` in local `.env`.
* Port/URL mismatches: backend `PORT` default 5001 vs 5000; `FRONTEND_URL` default 3000 vs Vite 8081; `VITE_SOLAR_SYSTEM_URL` default localhost:3000.
* CORS: hard-coded origins; Vercel preview domains blocked; rejection returns HTTP 500.
* Four temples lack YouTube channel IDs (`temples.json`).
* `makeadmin.ts` import lacks `.js`; seeds not verified. `vite.config.ts` auto-opens the bundle visualizer on build.

#### 6. Testing gaps

* No test covers any feature. Frontend: one trivial test. Backend: two Jest files for dead code; Jest not installed; tests excluded from `tsconfig`.
* Frontend `tsc` has 40 errors (11 files); `strict:false`.
* No CI configuration found [not specifically searched beyond listing tracked files].

#### 7. Performance, quota and cost

* Darshan quota: one `videos.list` per live channel per 120 s (≈720/day/channel, assuming 1 unit per call as per code comment; Google default quota unverified); webhook calls amplifiable by forged posts.
* Unpaginated public lists (`/api/temples`, `/api/shop/products`); no cache headers.
* Every horoscope click triggers a paid LLM call; no caching.
* Heavy bundle (three.js, mediapipe, jsPDF, gsap, framer-motion, recharts); 1–2k-line pages with inline styles.
* Single-process timers/EventEmitter: not multi-instance safe; free-tier sleeping hosts miss pushes.
* No logging/monitoring beyond `console`; no purge jobs for OTPs, reset tokens, sessions, unverified users; no index on `sessions.refresh_token`.

#### 8. Dependencies between remediations

Auth fixes (T-AUTH-*) need the local DB/test harness (T-ENV-*). Moving Groq server-side (T-SEC-01) enables AI rate limiting and caching (T-AI-*). Commerce (T-COM-*) is blocked on product decisions D-PAY-* (Section 18). Real astrology (T-AST-*) is blocked on D-AST-*.

#### 9. Added in second pass (2026-10-19)

| ID | Finding | Evidence | Status |
|---|---|---|---|
| KI-2-01 | `frontend/.bin/*` (105 shim files) is tracked in git | `git ls-files frontend/.bin` | Confirmed |
| KI-2-02 | ~16 statically unreferenced frontend modules (3D scenes, cursor/starfield, `useApi`, `useChartChat`, legacy `data/products.ts`, `data/temples.ts`) and ~32 unused shadcn primitives | filename-import scan, inventory §4.1 | Heuristic; verify with bundle analysis |
| KI-2-03 | Karma `composite` has no lower clamp; model-supplied negative components could yield a negative score | `InnerVoiceDashboard.tsx` composite expression | Inferred from code |
| KI-2-04 | Palm endpoint claims "seed ensures consistent reading" but sets no seed/temperature, so output is not reproducible | `index.ts` palm prompt/request | Confirmed (unused endpoint) |
| KI-2-05 | Two life-path implementations disagree on 33 (`getLP` keeps 11,22 only; `lifePathNumber` keeps 11,22,33) | `BirthChart.tsx`, `lib/numerology.ts` | Confirmed |
| KI-2-06 | `makeadmin.ts` has no npm script and a hard-coded email constant (personal address in source) | `prisma/seeds/makeadmin.ts` | Confirmed |
| KI-2-07 | `datasource` in `schema.prisma` has no `url`; DB URL comes only from `prisma.config.ts` — tools that ignore the config (older CLIs/IDE plugins) will not connect | `schema/schema.prisma`, `prisma.config.ts` | Confirmed |
| KI-2-08 | No timeout/abort on OpenRouter `fetch`/`axios` calls: a hung provider ties up requests | all AI routes | Confirmed (no timeout option present) |
| KI-2-09 | Frontend `tsc` still reports 40 errors; `tsc` clean on backend (re-run 2026-10-19) | command output | Runtime-verified (static check) |


---

## 17. Feature Dependencies and Integration Map

### 17.1 Feature dependency table
| Feature | Depends on |
|---|---|
| A1–A9 Auth | PostgreSQL (users, roles, sessions, otp, reset tokens); roles seed; Resend (A2, A4, A8); MSG91 (A3); Google (A5, A6); `JWT_SECRET` |
| D7–D11 Admin | A4/A7 (token), ADMIN role mapping, Cloudinary (images) |
| B1 Horoscope | OpenRouter (`openai/gpt-4-turbo-preview`) |
| B3 Birth chart | local `getZodiac`/`getLP`, OpenRouter (gemma), Nominatim (place) |
| B5 Compatibility | local hash only; Nominatim; backend analyze unused |
| B6 Name report | `lib/numerology.ts` (local), OpenRouter narrative (mock fallback), jsPDF |
| B7 Tarot | `data/tarotData.ts`, OpenRouter (gemma-3) |
| B8 Palm | MediaPipe (CDN assets), browser camera, local `palmAnalysis` |
| C1–C6 Inner Voice | Groq (browser key), localStorage; C3 also Web Speech and the C8 TTS proxy |
| C3/C8 Voice | Sarvam via `/api/tts`; `useConsultationGuard`, `useLanguageDetection` |
| D1/D3/D5 Catalogues | PostgreSQL and D8–D10 content; Cloudinary URLs |
| D2/D4/D6 Commerce | nothing (no backend) |
| E1–E4 Darshan | PostgreSQL `darshan_channels`, `temples.json` and seed, YouTube WebSub hub, YouTube Data API, IFrame API, public HTTPS `BACKEND_PUBLIC_URL`, single long-running process |
| E5–E8, F1–F3, F5 | static or local state only |
| F4 Solar system | separate `solar-system-app` (Auth0) at `VITE_SOLAR_SYSTEM_URL` |

### 17.2 Integration map
```mermaid
flowchart LR
  FE[Frontend SPA] -->|REST| BE[Express API]
  FE -->|direct, key in bundle| GROQ[Groq]
  FE -->|direct| NOM[Nominatim]
  FE -->|runtime assets| MP[MediaPipe CDN]
  FE -->|iframe| SOL[solar-system-app]
  FE -->|IFrame API| YTP[YouTube player]
  FE <-->|SSE| BE
  BE --> PG[(PostgreSQL)]
  BE --> OR[OpenRouter]
  BE --> SV[Sarvam TTS]
  BE --> RS[Resend]
  BE --> M91[MSG91]
  BE --> GG[Google token verify]
  BE --> CL[Cloudinary]
  BE <-->|WebSub + videos.list| YT[YouTube]
```
Registered vs mounted vs used: `routes/horoscopeRoutes.ts` (+ `astroApiService`) is registered in code but **not mounted**; `/api/palm-reading`, `/api/inner-voice/*`, `/api/compatibility/analyze`, `/api/birthchart/chat`, `/api/interpretation/{birth-chart,compatibility,chart-chat}`, `/api/zodiac/*`, newsletter and contact are **mounted but never called** by the UI. (Mermaid not rendered or syntax-tested.)


---

## 18. Missing Functionality and Unresolved Questions

All items are **open**. This document records them, why they matter and what decision is needed; it deliberately decides none. Questions marked from the investigation report are preserved; items added while documenting are marked *(added)* when they are direct implications of report findings. IDs (`D-…`) are referenced from Section 19.

#### 1. Business and product requirements

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-BIZ-1 | What is the product positioning: entertainment/guidance app or a service with accuracy and commercial obligations? | Determines accuracy, disclaimers, legal exposure, what to remove | all B, C | Choose positioning and required disclaimers |
| D-BIZ-2 | Which features are launch-critical vs optional? (e.g. palm, tarot, solar system, blog) | Avoids stabilising features nobody will ship | B, C, F | Launch scope list |
| D-BIZ-3 | Should any feature require login? Today none (except admin) does | Drives usage limits, personalisation, data retention | A, B, C | Define gated features |
| D-BIZ-4 | What is the role of `solar-system-app` (third-party-authored, own Auth0)? Ship, replace or drop? | Licensing/hosting; stray copies in repo | F4 | Keep/replace/remove |
| D-BIZ-5 | Are the mock behaviours (Contact, Newsletter, ₹499 paywall, viewer counts, family events) to be built or removed? | Trust and honesty | F1, F2, B6b, E8 | Build or remove each |

#### 2. Astrology accuracy and calculation requirements

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-AST-1 | Must birth charts / Kundali be astronomically accurate (ephemeris, ayanamsa, timezone/DST, houses, dashas), or are LLM narratives acceptable? | Today nothing is computed; birth time is unused | B3, B4, B9, C4 | Accuracy standard; library vs API vs none |
| D-AST-2 | Which zodiac system and cusp rules (tropical/sidereal; date-only table vs exact time)? Four duplicate date-only tables exist | Sun sign wrong on cusp days; Vedic users expect sidereal | B2, B3, B5, B6 | System + single shared implementation |
| D-AST-3 | Should compatibility scoring use real methods (e.g. Ashtakoota/Guna Milan) or stay entertainment? Currently name-hash pseudo-scores | Misleading for marriage-related decisions | B5 | Method or relabel |
| D-AST-4 | Is the daily horoscope per-sign shared (cached per date) or per request? Source: LLM, provider, or editorial? | Cost, consistency, trust | B1, B2 | Source + caching policy |
| D-AST-5 | Numerology tables (Pythagorean/Chaldean maps, number→planet, planet compatibility matrix, score weights 0.4/0.3/0.2/0.1) — provenance and approval | Origin unknown; weights are product choices | B6 | Domain-expert sign-off |
| D-AST-6 | Is the Zodiac "daily" panel (lucky colour, moon phase…) acceptable as random-per-day or must it be real? | Moon phase/transits are presented as facts | B2 | Real data or label |
| D-AST-7 | Palm reading: keep geometric template, implement real crease detection, use vision LLM (unused endpoint) or remove? | Accuracy claims; privacy of palm images | B8, B8b | Approach |
| D-AST-8 | Are the AI Guru/diagnosis outputs (remedies, gemstones, costs, forecast dates) acceptable without verification? Disclaimers, medical/financial/crisis handling? | Safety and liability | C1–C6 | Content policy and guardrails |

#### 3. Pooja, Chadhawa, Shop and donation workflows

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-DEV-1 | Is Puja booking a real transactional service (who performs rituals, availability, slots, sankalp details, confirmation, proof) or an enquiry funnel? | Entire data model and ops depend on it | D1, D2 | Service model |
| D-DEV-2 | Chadhawa: what is delivered/fulfilled and by whom; date selection (FAQ promises it) | Spec for D4 | D3, D4 | Workflow definition |
| D-DEV-3 | Shop: own inventory/shipping, dropshipping, or catalogue only? Tax/GST, returns, authenticity claims | Commerce scope; legal claims ("authenticity" text) | D5, D6 | Model |
| D-DEV-4 | Donations: legal entity, receipts, 80G/FCRA, who receives funds | Compliance | E6 | Whether to offer at all |
| D-DEV-5 | Should `Temple.priceFrom` be derived from puja prices? Should catalogue temples link to Darshan channels? | Data consistency | D1, E | Schema direction |
| D-DEV-6 | Four Darshan temples lack YouTube channel IDs — fill, hide, or drop? Replace fabricated viewer counts? Family/upcoming events: real feature? | Visible fake data | E1, E8 | Per item |
| D-DEV-7 | Prayer wall: real shared/moderated feature? Reminders: delivered how (email/push/WhatsApp)? | Moderation, notification provider | E5, E7 | Build or remove |

#### 4. Payments, booking, orders and fulfilment

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PAY-1 | Payment provider and methods (none exists in code) | Integration, compliance | D2, D4, D6, E6, B6b | Provider choice |
| D-PAY-2 | Order/booking lifecycle and states, cancellation/refund policy | State machine, support load | D2–D6 | Policy |
| D-PAY-3 | Customer data to collect (name, gotra, address, phone) and storage | Schema, privacy | D2–D6 | Fields + retention |
| D-PAY-4 | Notifications (email/SMS/WhatsApp) and proof-of-service delivery | Providers | D2, D4 | Channels |
| D-PAY-5 | Is the ₹499 name-report paywall real? Server-side entitlement? | Revenue vs demo | B6b | Build or remove |
| D-PAY-6 | Admin operations: order console, reporting, roles beyond ADMIN | Scope | D7 | Requirements |

#### 5. Authentication and account linking

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-AUTH-1 | Which verification is mandatory: email, phone, or either (today either)? | Login gating, spam, fraud | A2–A4 | Policy |
| D-AUTH-2 | Account linking rules when an unverified local account exists for a Google email | Pre-hijack fix design | A1, A5 | Rule |
| D-AUTH-3 | Should Google users' phone be OTP-verified? Is phone India-only? | Consistency; international users | A6 | Policy |
| D-AUTH-4 | Minimum age (code uses 10) and parental/age policy | Compliance | A6 | Value + legal check |
| D-AUTH-5 | Referral codes (field accepted but unused): implement or remove | Dead field | A1, A5 | Decide |
| D-AUTH-6 | Admin provisioning (seed with hard-coded email today), SUPERADMIN usage, user management UI | Operations/security | A9, D7 | Process |
| D-AUTH-7 | Token storage (localStorage vs cookies) and session length | XSS posture | A7 | Policy |

#### 6. Database architecture

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-DB-1 | Is any MongoDB instance still in use anywhere? (Code has none; stale env keys remain) | Cleanup, cost | Darshan | Confirm retirement |
| D-DB-2 | Persist readings/AI chats/karma data server-side per user? Retention and deletion | Today only localStorage | B, C | Yes/no + policy |
| D-DB-3 | Production DB host/version/backups and migration state | Cannot be known from repo | all | Provide/confirm |
| D-DB-4 | Purge policy for OTP/reset tokens/sessions/unverified users | Growth, privacy | A | Policy |

#### 7. External providers and subscriptions

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PROV-1 | One AI provider/model policy: OpenRouter (4 model IDs), Groq, or other; paid vs free tier | Reliability, cost; free/preview model IDs may vanish | B, C | Standardise |
| D-PROV-2 | Which accounts exist and are funded: OpenRouter, Groq, Sarvam, Resend (domain), MSG91 (DLT), Google OAuth, Cloudinary, YouTube quota | Nothing verifiable from the repo | all | Provide status |
| D-PROV-3 | Keep Sarvam for TTS? Cache audio? Keep browser `speechSynthesis` fallback? | Cost and UX | C3, C8 | Decide |
| D-PROV-4 | Geocoding: continue Nominatim from browsers or use a licensed provider (also needed for timezone) | Policy risk; needed for real charts | B3, B5 | Provider |
| D-PROV-5 | Real astrology API (the unmounted `astro-api` target) vs library | Dependency and licensing | B9 | Choice |

#### 8. Deployment and operational ownership

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-OPS-1 | Where are frontend and backend hosted (Vercel/Render hints only), domains, environments (dev/staging/prod) | CORS, WebSub public URL, secrets | all | Provide |
| D-OPS-2 | Single always-on backend instance acceptable for Darshan? | Timers/SSE are in-process | E | Hosting model |
| D-OPS-3 | Monitoring, alerting, log retention, quota dashboards | None exist | all | Tooling |
| D-OPS-4 | Who owns the YouTube/Google Cloud project and key rotation | Operations | E | Owner |
| D-OPS-5 | Cleanup of stray repo files (root status docs, `darshan-live.txt`, `video.txt`, stray public copies) | Repo hygiene | – | Approve removal |

#### 9. Privacy, security and compliance

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PRIV-1 | Personal data inventory (DOB, phone, city, palm images, journal text) and legal basis/consent | Compliance (jurisdiction unknown) | A, B, C | Policy |
| D-PRIV-2 | Sending user text/DOB to third-party LLMs: disclosure and retention terms | Privacy | B, C | Policy + vendor terms |
| D-PRIV-3 | Account/data deletion and export | `isDeleted` fields exist; no API | A | Build or not |
| D-PRIV-4 | Handling of crisis/self-harm/medical content in AI Guru | Safety | C | Guardrails |
| D-PRIV-5 | Rate-limit and abuse policy; CAPTCHA | Cost/security | A, B, C | Policy |
| D-PRIV-6 | Is the personal email in the admin seed intended? Rotate/remove? | Privacy hygiene | A9 | Confirm |


---

## 19. Prioritized Development Recommendations

**A recommendation, not a record of work done.** Nothing below has been started or committed. The investigation report contained a recommended sequence but **no task IDs**, so the IDs here are new (`T-<area>-<nn>`) and are referenced from Section 16. Decisions marked `D-…` live in Section 18 and are **unresolved**; tasks depending on them cannot be finalised until the owner decides.

Not everything must launch together. **Launch tiers:** **L1 launch-critical** (security + whatever the owner chooses to ship), **L2 launch-optional** (should follow quickly), **L3 enhancement/deferred**.

Priority: P0 immediate · P1 before launch · P2 after.

#### Phase 1 — Security and exposed-credential remediation

| ID | Objective | Pri / Tier | Existing status | Depends on | Modules | Acceptance criteria | Verification | External dependency |
|---|---|---|---|---|---|---|---|---|
| T-SEC-01 | Remove provider keys from browser bundle: route AI Guru family through backend; rotate any key ever bundled | P0 / L1 | Groq called from browser (C1–C6); backend `/api/inner-voice/*` unused | D-PROV-1 | C, FE, BE | `dist/` contains no provider keys; all Inner Voice calls via backend; old keys revoked | grep built bundle; E2E with stub | Groq/OpenRouter accounts |
| T-SEC-02 | Rate limiting, auth/quotas, per-route body limits, `helmet` on AI/TTS/palm and auth endpoints | P0 / L1 | none | D-PRIV-5 | BE | Burst tests return 429; palm/AI bodies capped; unauth policy per D-BIZ-3 | supertest load test | optional Redis |
| T-SEC-03 | OTP hardening (CSPRNG, HMAC hash, attempt lockout) — see T-AUTH-01 | P0 / L1 | brute-forceable | – | A2 | lockout test passes | unit/integration | – |
| T-SEC-04 | Remove personal email/stray artefacts; parametrise admin seed; delete legacy default JWT fallback | P1 / L1 | present | D-AUTH-6, D-OPS-5 | seeds, config | no personal data/hard-coded secrets in tree | grep + review | – |

#### Phase 2 — Local environment and database setup

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-ENV-01 | Complete `backend/.env.example` and `frontend/.env.example` (add missing vars; drop unused) | P0 / L1 | incomplete | – | config | fresh clone boots with only the example filled in | follow README on clean machine | – |
| T-ENV-02 | Reproducible local DB (container Postgres), migrate + seeds documented | P0 / L1 | not verified | – | DB | `db:migrate`, `db:seed*` succeed; roles exist | run scripts on empty DB | Postgres |
| T-ENV-03 | Fix port/URL defaults (5000/5001, FRONTEND_URL, Solar URL) | P1 / L1 | inconsistent | – | BE, FE | defaults consistent in dev | manual + test | – |
| T-ENV-04 | Make backend Jest runnable (or move to Vitest), include `__tests__`; remove tests of dead code | P1 / L1 | cannot run | – | BE | `npm test` runs | CI | – |
| T-ENV-05 | Fix 40 frontend type errors; consider enabling `strict` incrementally | P1 / L2 | 40 errors | – | FE | `tsc` clean | CI | – |

#### Phase 3 — Authentication and core stabilisation

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AUTH-01 | OTP: CSPRNG, HMAC/salted hash, attempt limit + lockout, surface delivery failure | P0 / L1 | IMPL-NV w/ gap | T-ENV-02 | A2 | brute-force test locks out | integration | Resend |
| T-AUTH-02 | Fix pre-hijack (Google link + unverified overwrite) | P0 / L1 | vulnerable | D-AUTH-2 | A1, A5 | attacker password unusable | scenario test | Google |
| T-AUTH-03 | Phone verification fails closed without mobile match | P0 / L1 | bypass possible | – | A3 | tests pass with/without `mobile` | unit + sandbox | MSG91 |
| T-AUTH-04 | Uniform login/forgot-password responses | P1 / L1 | enumerates | – | A4, A8 | identical responses/timing | tests | – |
| T-AUTH-05 | Hash reset tokens; revoke sessions on reset; refresh reuse detection; bcrypt cost review; short-lived admin access | P1 / L1 | gaps | D-AUTH-7 | A7–A9 | tests pass | tests | – |
| T-AUTH-06 | Purge jobs (OTP, reset tokens, sessions, unverified users); index `sessions.refresh_token` | P2 / L2 | none | D-DB-4 | A, DB | job + migration verified | integration | – |
| T-AUTH-07 | Profile/account pages, change password, deletion/export (as decided) | P2 / L3 | missing | D-PRIV-3 | A | per decision | E2E | – |

#### Phase 4 — Verification of existing features

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-VER-01 | Run and record end-to-end verification of A1–A9 with sandbox/stubs | P0 / L1 | none | T-ENV-* | A | checklist in Section 14 green | E2E | stubs/sandboxes |
| T-VER-02 | Verify catalogues + admin CRUD + Cloudinary (D1, D3, D5, D8–D11) | P1 / L1 (if shipping devotion) | IMPL-NV | T-ENV-02 | D | tests pass | supertest | Cloudinary (stub) |
| T-VER-03 | Verify numerology (B6) with golden fixtures | P1 / L2 | IMPL-NV | D-AST-5 | B6 | fixtures approved | unit | – |
| T-VER-04 | Verify provider-backed readings with mocks (B1, B3, B7, C*) | P1 / L2 | IMPL-NV | T-SEC-01 | B, C | contract tests | mocked fetch | – |

#### Phase 5 — Product decisions (owner)

| ID | Objective | Pri | Status | Depends | Acceptance |
|---|---|---|---|---|---|
| T-DEC-01 | Resolve launch scope, positioning, accuracy standard (D-BIZ-1/2, D-AST-1) | P0 | open | – | written decisions recorded in the decisions doc |
| T-DEC-02 | Resolve commerce model and payment provider (D-DEV-*, D-PAY-*) | P1 | open | – | decisions recorded |
| T-DEC-03 | Resolve provider/account status and hosting (D-PROV-*, D-OPS-*) | P0 | open | – | account inventory confirmed |
| T-DEC-04 | Privacy/compliance policy (D-PRIV-*) | P0 | open | – | policy documented |

#### Phase 6 — Core astrology functionality (depends on T-DEC-01)

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AST-01 | Birth chart per decision: real ephemeris + timezone/geocoding, **or** relabel as entertainment and remove "calculated" claims | P1 / L1 or L2 | PART; not a real chart | D-AST-1/2, D-PROV-4/5 | B3, B4, B9 | per decision; if real: matches reference ephemeris fixtures | fixtures | geocoder/ephemeris |
| T-AST-02 | Compatibility per decision (real method or relabel); re-enable or remove dead AI chat | P2 / L2 | MOCK | D-AST-3 | B5 | per decision | tests | – |
| T-AST-03 | Zodiac daily panel: real data or label | P2 / L2 | MOCK | D-AST-6 | B2 | per decision | tests | – |
| T-AST-04 | Align Inner Voice copy/features with reality (no natal/transit/dasha claims unless computed) | P1 / L1 | misleading | D-AST-1 | C | copy review passes | review | – |
| T-AST-05 | Daily horoscope: validate sign, include date, cache per sign/date | P1 / L2 | IMPL-NV | D-AST-4 | B1 | repeated calls identical per date; invalid sign 400 | tests | provider |
| T-AST-06 | Palm reading per decision | P2 / L3 | PART | D-AST-7 | B8, B8b | per decision | tests | – |
| T-AST-07 | Consolidate sun-sign/life-path utilities into one module | P2 / L2 | 4 copies | D-AST-2 | B | one implementation, tested | unit | – |

#### Phase 7 — Devotion and Live Darshan

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-DAR-01 | Sign/verify WebSub (`hub.secret`, topic check) | P1 / L1 (if shipping Darshan) | unsigned | – | E2 | forged requests rejected | handler tests | YouTube hub |
| T-DAR-02 | Correct live-state logic: don't mark offline on unrelated uploads; startup live scan | P1 / L1 | defect | – | E2, E3 | replay suite passes | recorded-XML tests | YouTube API |
| T-DAR-03 | Remove hard-coded LIVE/viewer counts; fill or hide 4 channels without IDs | P1 / L1 | mock | D-DEV-6 | E1, E8 | no fabricated data shown | review/tests | – |
| T-DAR-04 | SSE resync on reconnect; connection cap; multi-instance plan | P2 / L2 | gaps | D-OPS-2 | E4 | reconnect test passes | tests | – |
| T-DAR-05 | Quota monitoring/backoff | P2 / L2 | none | – | E3 | alert on quota errors | tests | Google Cloud |
| T-DEV-01 | Catalogue pagination/caching; `priceFrom` rule; `originalPrice>price` validation | P2 / L2 | gaps | D-DEV-5 | D | per decision | tests | – |
| T-DEV-02 | Prayer wall / reminders / notify per decision | P2 / L3 | UI ONLY | D-DEV-7 | E5, E7 | per decision | tests | notification provider |

#### Phase 8 — Commerce and payments (depends on T-DEC-02)

Not defined enough to specify acceptance criteria. Proposed breakdown once decisions exist:

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance (draft) | External |
|---|---|---|---|---|---|---|---|
| T-COM-01 | Data model: orders/bookings/payments/addresses | P1 / L1 for commerce | NOT IMPLEMENTED | D-PAY-2/3 | DB | migrations + tests | – |
| T-COM-02 | Payment integration with idempotent webhooks (sandbox) | P1 / L1 for commerce | NOT IMPLEMENTED | D-PAY-1 | BE | sandbox payments reconcile | payment provider |
| T-COM-03 | Wire Puja/Chadhawa/Shop/Donate flows to order APIs; remove unsupported marketing claims | P1 / L1 for commerce | UI ONLY | T-COM-01/02 | FE, BE | E2E sandbox order | – |
| T-COM-04 | Confirmations/notifications, order history, admin console | P2 / L2 | missing | D-PAY-4/6 | FE, BE | per decision | email/SMS/WhatsApp |
| T-COM-05 | Name-report paywall: real entitlement or remove | P2 / L3 | MOCK | D-PAY-5 | B6b | per decision | payment provider |
| T-OPS-01 | Contact + Newsletter: implement storage/email or remove UI | P1 / L2 | MOCK | D-BIZ-5 | F1, F2 | messages stored/delivered | Resend |

#### Phase 9 — AI usage controls and integration hardening

| ID | Objective | Pri / Tier | Status | Depends | Modules | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|---|
| T-AI-01 | Single backend AI service: prompt registry, schema validation, retries/timeouts, caching, quotas | P1 / L1 | scattered | T-SEC-01, D-PROV-1 | BE | all AI routes use it | contract tests | provider |
| T-AI-02 | Mark fallback/mock outputs distinctly (name narrative returns 200 mock) | P1 / L2 | defect | T-AI-01 | B6 | API flags fallback; UI shows | tests | – |
| T-AI-03 | Karma score/journal/diagnosis: validate ranges, no silent hard-coded fallback | P2 / L2 | PART | T-AI-01 | C4–C6 | per decision | tests | – |
| T-AI-04 | Conversation persistence, history cap/summarisation, safety guardrails | P2 / L2 | none | D-AST-8, D-PRIV-4, D-DB-2 | C1–C3 | per decision | tests | – |
| T-AI-05 | TTS: single endpoint, caching, length handling | P2 / L3 | 3 copies | D-PROV-3 | C3, C8 | one endpoint | tests | Sarvam |
| T-AI-06 | Delete dead code (horoscope router/astroApiService/legacy auth, unused FE API client/hooks, duplicate TTS, stray files) | P2 / L2 | dead | D-OPS-5 | repo | build/tests still pass | CI | – |

#### Phase 10 — Testing, staging, deployment, release

| ID | Objective | Pri / Tier | Status | Depends | Acceptance | Verification | External |
|---|---|---|---|---|---|---|---|
| T-REL-01 | CI: type-check, lint, unit, integration, bundle-key scan, `npm audit` review | P1 / L1 | none | T-ENV-04/05 | pipeline green | CI run | CI host |
| T-REL-02 | Staging environment with public HTTPS backend; end-to-end Darshan test with a real channel | P1 / L1 | unknown | D-OPS-1 | staging checklist passes | manual + E2E | Vercel/Render or chosen hosts |
| T-REL-03 | Observability (logs, errors, quotas), backups, key rotation runbook | P1 / L1 | none | D-OPS-3/4 | runbook + alerts exist | review | monitoring provider |
| T-REL-04 | Release checklist: security checklist (Section 12 §4), accounts funded, legal pages | P1 / L1 | – | T-DEC-04 | all items ticked | review | – |

#### Suggested ordering

1. T-DEC-01/03/04 (owner decisions) in parallel with T-SEC-01/02/04 and T-ENV-01…04.
2. T-AUTH-01…05 → T-VER-01.
3. Pick the launch tier: devotion/Darshan (T-DAR-01…03, T-VER-02) and/or readings (T-AST-01/04/05, T-AI-01/02).
4. Commerce (T-COM-*) only after T-DEC-02.
5. T-REL-* before any public release; L3 items are optional enhancements.


---

## 20. Source File Reference Index

Tracked non-media files, excluding committed `frontend/.bin` shims, the 49 shadcn primitives in `frontend/src/components/ui/`, lockfiles and images. Role notes are given for files that carry the main logic; other files are grouped by directory in Section 3.

| Path | Role / feature |
|---|---|
| `.gitignore` |  |
| `BIRTHCHART_FIXES.md` |  |
| `CHART_CHAT_FEATURE.md` |  |
| `CHATGPT_INTEGRATION_GUIDE.md` |  |
| `COMPLETION_SUMMARY.txt` |  |
| `CONNECTION_STATUS.md` |  |
| `DOCUMENTATION_INDEX.md` |  |
| `FINAL_CHECKLIST.md` |  |
| `FRONTEND_STRUCTURE_VERIFICATION.md` |  |
| `IMPLEMENTATION_COMPLETE.md` |  |
| `OPENROUTER_INTEGRATION_COMPLETE.md` |  |
| `PERFORMANCE_FIXES.md` |  |
| `PROJECT_STATUS_REPORT.md` |  |
| `QUICK_START.md` |  |
| `README.md` |  |
| `README_FINAL.md` |  |
| `SETUP_GUIDE.md` |  |
| `START_HERE.md` |  |
| `api/tts.ts` | Vercel TTS copy (differs from frontend/api/tts.ts) |
| `backend/.env.example` |  |
| `backend/.gitignore` |  |
| `backend/README.md` |  |
| `backend/darshan-live.txt` |  |
| `backend/jest.config.js` |  |
| `backend/package.json` |  |
| `backend/prisma.config.ts` | Prisma 7 config (schema dir, migrations path, DATABASE_URL) |
| `backend/prisma.ts` |  |
| `backend/prisma/migrations/20260804061833_init_auth/migration.sql` |  |
| `backend/prisma/migrations/20260810103538_add_puja_schema/migration.sql` |  |
| `backend/prisma/migrations/20260811054543_added_chadhawa_model/migration.sql` |  |
| `backend/prisma/migrations/20260812063637_implement_shop/migration.sql` |  |
| `backend/prisma/migrations/20261015115200_add_darshan_channel/migration.sql` |  |
| `backend/prisma/migrations/migration_lock.toml` |  |
| `backend/prisma/schema/auth.prisma` | User, Role, Session, OTP, reset models |
| `backend/prisma/schema/darshan.prisma` |  |
| `backend/prisma/schema/schema.prisma` |  |
| `backend/prisma/schema/shop.prisma` |  |
| `backend/prisma/schema/temple.prisma` |  |
| `backend/prisma/seeds/chadhawaOfferings.ts` |  |
| `backend/prisma/seeds/darshanChannels.ts` |  |
| `backend/prisma/seeds/index.ts` |  |
| `backend/prisma/seeds/makeadmin.ts` |  |
| `backend/prisma/seeds/pujaTemples.ts` |  |
| `backend/prisma/seeds/shopProducts.ts` |  |
| `backend/skills-lock.json` |  |
| `backend/src/__tests__/middleware/auth.test.ts` |  |
| `backend/src/__tests__/middleware/birthDataValidation.test.ts` |  |
| `backend/src/config/cloudinary.ts` |  |
| `backend/src/config/environment.ts` |  |
| `backend/src/config/temples.json` |  |
| `backend/src/controllers/.gitkeep` |  |
| `backend/src/controllers/chartChatController.ts` |  |
| `backend/src/controllers/horoscopeController.ts` |  |
| `backend/src/controllers/interpretationController.ts` |  |
| `backend/src/index.ts` | entry; CORS; inline routes (health, zodiac, newsletter, contact, tts, tarot, palm); error handler; starts Darshan loops |
| `backend/src/middleware/.gitkeep` |  |
| `backend/src/middleware/auth.ts` |  |
| `backend/src/middleware/authMiddleware.ts` | JWT + role guard |
| `backend/src/middleware/birthDataValidation.ts` |  |
| `backend/src/middleware/errorHandler.ts` |  |
| `backend/src/middleware/upload.ts` |  |
| `backend/src/models/.gitkeep` |  |
| `backend/src/modules/admin/admin.controller.ts` |  |
| `backend/src/modules/admin/admin.route.ts` |  |
| `backend/src/modules/admin/admin.services.ts` |  |
| `backend/src/modules/admin/admin.types.ts` |  |
| `backend/src/modules/auth/auth.controller.ts` |  |
| `backend/src/modules/auth/auth.route.ts` | /api/auth routes |
| `backend/src/modules/auth/auth.service.ts` | A1–A9 business logic |
| `backend/src/modules/auth/auth.types.ts` |  |
| `backend/src/modules/auth/auth.validators.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.controller.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.public.route.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.route.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.service.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.types.ts` |  |
| `backend/src/modules/chadhawa/chadhawa.validators.ts` |  |
| `backend/src/modules/darshan/darshan.controller.ts` | webhook + SSE |
| `backend/src/modules/darshan/darshan.events.ts` |  |
| `backend/src/modules/darshan/darshan.public.route.ts` |  |
| `backend/src/modules/darshan/darshan.refresh.ts` | stale-live poll loop |
| `backend/src/modules/darshan/darshan.service.ts` |  |
| `backend/src/modules/darshan/darshan.types.ts` |  |
| `backend/src/modules/darshan/darshan.websub.ts` | WebSub subscribe/renew |
| `backend/src/modules/darshan/darshan.youtube.ts` |  |
| `backend/src/modules/puja/puja.controller.ts` |  |
| `backend/src/modules/puja/puja.public.route.ts` |  |
| `backend/src/modules/puja/puja.route.ts` |  |
| `backend/src/modules/puja/puja.service.ts` |  |
| `backend/src/modules/puja/puja.types.ts` |  |
| `backend/src/modules/puja/puja.validators.ts` |  |
| `backend/src/modules/shop/shop.controller.ts` |  |
| `backend/src/modules/shop/shop.public.route.ts` |  |
| `backend/src/modules/shop/shop.route.ts` |  |
| `backend/src/modules/shop/shop.service.ts` |  |
| `backend/src/modules/shop/shop.types.ts` |  |
| `backend/src/modules/shop/shop.validators.ts` |  |
| `backend/src/routes/.gitkeep` |  |
| `backend/src/routes/birthChartRoutes.ts` | /api/birthchart (analyze, chat) |
| `backend/src/routes/compatibilityRoutes.ts` |  |
| `backend/src/routes/horoscopeRoutes.ts` |  |
| `backend/src/routes/innerVoiceRoutes.ts` | /api/inner-voice (unused by UI) |
| `backend/src/routes/interpretationRoutes.ts` |  |
| `backend/src/routes/nameAnalysisRoutes.ts` | /api/name-analysis narrative + mock |
| `backend/src/services/astroApiService.ts` |  |
| `backend/src/services/chatgptService.ts` | OpenRouter prompts (interpretation, horoscope, compatibility) |
| `backend/src/user.d.ts` |  |
| `backend/src/utils/.gitkeep` |  |
| `backend/src/utils/ApiError.ts` |  |
| `backend/src/utils/auth.ts` |  |
| `backend/src/utils/googleAuth.ts` |  |
| `backend/src/utils/mailer.ts` |  |
| `backend/src/utils/msg91.ts` |  |
| `backend/src/utils/responseUtils.ts` |  |
| `backend/src/utils/statusCodes.ts` |  |
| `backend/tsconfig.json` |  |
| `frontend/.env.example` |  |
| `frontend/.gitignore` |  |
| `frontend/README.md` |  |
| `frontend/api/tts.ts` |  |
| `frontend/components.json` |  |
| `frontend/eslint.config.js` |  |
| `frontend/index.html` |  |
| `frontend/package.json` |  |
| `frontend/postcss.config.js` |  |
| `frontend/public/LICENSE` |  |
| `frontend/public/README.md` |  |
| `frontend/public/SECURITY.md` |  |
| `frontend/public/index (1).html` |  |
| `frontend/public/index.html` |  |
| `frontend/public/main.js` |  |
| `frontend/public/package (1).json` |  |
| `frontend/public/vite.config.js` |  |
| `frontend/src/App.css` |  |
| `frontend/src/App.tsx` | route table and providers |
| `frontend/src/components/AIGuruCard.tsx` |  |
| `frontend/src/components/AstrologyToolsSection.tsx` |  |
| `frontend/src/components/BackButton.tsx` |  |
| `frontend/src/components/CosmicBackground.tsx` |  |
| `frontend/src/components/CosmicCursor.tsx` |  |
| `frontend/src/components/DevotionCard.tsx` |  |
| `frontend/src/components/DevotionLayout.tsx` |  |
| `frontend/src/components/FaqSection.tsx` |  |
| `frontend/src/components/FeatureButton.tsx` |  |
| `frontend/src/components/FeatureShowcase.tsx` |  |
| `frontend/src/components/FeaturedBirthChart.tsx` |  |
| `frontend/src/components/FloatingPlanets.tsx` |  |
| `frontend/src/components/Footer.tsx` |  |
| `frontend/src/components/HomeBlogSection.tsx` |  |
| `frontend/src/components/Layout.tsx` |  |
| `frontend/src/components/LiveDarshanCard.tsx` |  |
| `frontend/src/components/Loader/Loader.css` |  |
| `frontend/src/components/Loader/Loader.tsx` |  |
| `frontend/src/components/NameDestinyReport/index.tsx` |  |
| `frontend/src/components/NameDestinyReport/lib/celebrityData.ts` |  |
| `frontend/src/components/NameDestinyReport/lib/fetchNarrative.ts` |  |
| `frontend/src/components/NameDestinyReport/lib/pdfExport.ts` |  |
| `frontend/src/components/NameDestinyReport/sections/AuraVisualization.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/BeforeAfterCompare.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/CelebrityCarousel.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/CoreNumbersGrid.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/DestinyHero.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/FutureTimeline.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/LifeHeatmap.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/NameEvolutionLab.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/NameFrequencyWave.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/NameSimulationDeltas.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/PdfExportButton.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/PremiumHero.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/PricingPaywall.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/StatsRow.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/SuccessProbability.tsx` |  |
| `frontend/src/components/NameDestinyReport/sections/WhatsIncludedGrid.tsx` |  |
| `frontend/src/components/NameDestinyReport/types.ts` |  |
| `frontend/src/components/NameDestinyReport/useNameReport.ts` |  |
| `frontend/src/components/Navbar.tsx` |  |
| `frontend/src/components/PageTransition.tsx` |  |
| `frontend/src/components/PlanetInfoPanel.tsx` |  |
| `frontend/src/components/ScrollStorytelling.tsx` |  |
| `frontend/src/components/StarField.tsx` |  |
| `frontend/src/components/ToolCard.tsx` |  |
| `frontend/src/components/VoiceConsultation.tsx` | C3 voice |
| `frontend/src/components/WhyAstrologySection.tsx` |  |
| `frontend/src/components/ZodiacCard.tsx` |  |
| `frontend/src/components/ZodiacWheelSection.tsx` |  |
| `frontend/src/components/ai-guru/AnalysisTimeline.tsx` |  |
| `frontend/src/components/ai-guru/CategoryCards.tsx` |  |
| `frontend/src/components/ai-guru/CosmicOverlay.tsx` |  |
| `frontend/src/components/ai-guru/GuruChatInput.tsx` |  |
| `frontend/src/components/ai-guru/GuruConversation.tsx` |  |
| `frontend/src/components/ai-guru/GuruProgressBar.tsx` |  |
| `frontend/src/components/ai-guru/GuruSidebar.tsx` |  |
| `frontend/src/components/ai-guru/GuruTabs.tsx` |  |
| `frontend/src/components/ai-guru/GuruTopHeader.tsx` |  |
| `frontend/src/components/ai-guru/HeroWelcome.tsx` |  |
| `frontend/src/components/ai-guru/LanguageControls.tsx` |  |
| `frontend/src/components/ai-guru/LanguageSelector.tsx` |  |
| `frontend/src/components/ai-guru/SuggestedQuestions.tsx` |  |
| `frontend/src/components/ai-guru/TrustStats.tsx` |  |
| `frontend/src/components/ai-guru/languages.ts` |  |
| `frontend/src/components/ai-guru/types.ts` |  |
| `frontend/src/components/astrology/ElementSelector.tsx` |  |
| `frontend/src/components/auth/Msg91PhoneWidget.tsx` |  |
| `frontend/src/components/hero/Hero.tsx` |  |
| `frontend/src/components/hero/Stars.tsx` |  |
| `frontend/src/components/palm/MetricDashboard.tsx` |  |
| `frontend/src/components/palm/PalmLineOverlay.tsx` |  |
| `frontend/src/components/palm/ScanSequence.tsx` |  |
| `frontend/src/components/tarot/TarotLandingScene.tsx` |  |
| `frontend/src/components/three/CloudLayer.tsx` |  |
| `frontend/src/components/three/InteractiveSolarSystem.tsx` |  |
| `frontend/src/components/three/MountainSilhouette.tsx` |  |
| `frontend/src/components/three/RealisticStarfield.tsx` |  |
| `frontend/src/components/three/ScrollytellingHero.tsx` |  |
| `frontend/src/components/three/SolarSystem.tsx` |  |
| `frontend/src/components/three/SolarSystemOptimized.tsx` |  |
| `frontend/src/components/three/ZodiacFormation.tsx` |  |
| `frontend/src/context/NavigationContext.tsx` |  |
| `frontend/src/data/blogPosts.ts` |  |
| `frontend/src/data/features.ts` |  |
| `frontend/src/data/liveStreams.ts` |  |
| `frontend/src/data/planetaryData.ts` |  |
| `frontend/src/data/products.ts` |  |
| `frontend/src/data/tarotData.ts` |  |
| `frontend/src/data/temples.ts` |  |
| `frontend/src/data/tools.ts` |  |
| `frontend/src/data/zodiacData.ts` |  |
| `frontend/src/features/admin/api/adminApi.ts` |  |
| `frontend/src/features/admin/api/chadhawaApi.ts` |  |
| `frontend/src/features/admin/api/pujaApi.ts` |  |
| `frontend/src/features/admin/api/shopApi.ts` |  |
| `frontend/src/features/admin/components/AdminHeader.tsx` |  |
| `frontend/src/features/admin/components/AdminLayout.tsx` |  |
| `frontend/src/features/admin/components/AdminSidebar.tsx` |  |
| `frontend/src/features/admin/components/GradientPicker.tsx` |  |
| `frontend/src/features/admin/components/chadhawa/ChadhawaFormDialog.tsx` |  |
| `frontend/src/features/admin/components/puja/PujaFormDialog.tsx` |  |
| `frontend/src/features/admin/components/puja/TempleFormDialog.tsx` |  |
| `frontend/src/features/admin/components/puja/TempleImagesDialog.tsx` |  |
| `frontend/src/features/admin/components/puja/TemplePujasDialog.tsx` |  |
| `frontend/src/features/admin/components/shop/CategoryFormDialog.tsx` |  |
| `frontend/src/features/admin/components/shop/ProductFormDialog.tsx` |  |
| `frontend/src/features/admin/hooks/useAdminDashboard.ts` |  |
| `frontend/src/features/admin/hooks/useChadhawaAdmin.ts` |  |
| `frontend/src/features/admin/hooks/usePujaAdmin.ts` |  |
| `frontend/src/features/admin/hooks/useShopAdmin.ts` |  |
| `frontend/src/features/admin/pages/Chadhawa.tsx` |  |
| `frontend/src/features/admin/pages/Dashboard.tsx` |  |
| `frontend/src/features/admin/pages/Puja.tsx` |  |
| `frontend/src/features/admin/pages/ShopCategories.tsx` |  |
| `frontend/src/features/admin/pages/ShopProducts.tsx` |  |
| `frontend/src/features/admin/types/chadhawa.ts` |  |
| `frontend/src/features/admin/types/index.ts` |  |
| `frontend/src/features/admin/types/puja.ts` |  |
| `frontend/src/features/admin/types/shop.ts` |  |
| `frontend/src/features/admin/utils/puja.ts` |  |
| `frontend/src/features/admin/utils/roles.ts` |  |
| `frontend/src/features/admin/utils/shop.ts` |  |
| `frontend/src/features/auth/api/authApi.ts` |  |
| `frontend/src/features/auth/components/AuthDivider.tsx` |  |
| `frontend/src/features/auth/components/AuthLayout.tsx` |  |
| `frontend/src/features/auth/components/AuthSubmitButton.tsx` |  |
| `frontend/src/features/auth/components/AuthTextField.tsx` |  |
| `frontend/src/features/auth/components/GoogleAuthButton.tsx` |  |
| `frontend/src/features/auth/components/OtpForm.tsx` |  |
| `frontend/src/features/auth/components/PasswordField.tsx` |  |
| `frontend/src/features/auth/components/StateSelect.tsx` |  |
| `frontend/src/features/auth/components/VerificationMethodPicker.tsx` |  |
| `frontend/src/features/auth/constants/indianStates.ts` |  |
| `frontend/src/features/auth/hooks/useAuthHydrated.ts` |  |
| `frontend/src/features/auth/hooks/useAuthMutations.ts` |  |
| `frontend/src/features/auth/hooks/useGoogleIdentity.ts` |  |
| `frontend/src/features/auth/hooks/useVerifyPhone.ts` |  |
| `frontend/src/features/auth/index.ts` |  |
| `frontend/src/features/auth/pages/ForgotPasswordPage.tsx` |  |
| `frontend/src/features/auth/pages/GoogleOnboardingPage.tsx` |  |
| `frontend/src/features/auth/pages/LoginPage.tsx` |  |
| `frontend/src/features/auth/pages/RegisterPage.tsx` |  |
| `frontend/src/features/auth/pages/ResetPasswordPage.tsx` |  |
| `frontend/src/features/auth/pages/VerifyOtpPage.tsx` |  |
| `frontend/src/features/auth/schemas/authSchemas.ts` |  |
| `frontend/src/features/auth/types/index.ts` |  |
| `frontend/src/features/auth/utils/pendingRegistration.ts` |  |
| `frontend/src/features/auth/utils/postAuthRedirect.ts` |  |
| `frontend/src/features/auth/utils/safeZodResolver.ts` |  |
| `frontend/src/features/chadhawa/api.ts` |  |
| `frontend/src/features/chadhawa/hooks.ts` |  |
| `frontend/src/features/chadhawa/types.ts` |  |
| `frontend/src/features/puja/api.ts` |  |
| `frontend/src/features/puja/hooks.ts` |  |
| `frontend/src/features/puja/types.ts` |  |
| `frontend/src/features/shop/api.ts` |  |
| `frontend/src/features/shop/hooks.ts` |  |
| `frontend/src/features/shop/types.ts` |  |
| `frontend/src/hooks/use-mobile.tsx` |  |
| `frontend/src/hooks/use-toast.ts` |  |
| `frontend/src/hooks/useApi.ts` |  |
| `frontend/src/hooks/useChartChat.ts` |  |
| `frontend/src/hooks/useConsultationGuard.ts` |  |
| `frontend/src/hooks/useDarshanLiveEvents.ts` | SSE client |
| `frontend/src/hooks/useDarshanTemple.ts` |  |
| `frontend/src/hooks/useDarshanTemples.ts` |  |
| `frontend/src/hooks/useInterpretation.ts` |  |
| `frontend/src/hooks/useLanguageDetection.ts` |  |
| `frontend/src/hooks/useSpeechRecognition.ts` |  |
| `frontend/src/hooks/useTextToSpeech.ts` |  |
| `frontend/src/hooks/useVerifyPhone.ts` |  |
| `frontend/src/index.css` |  |
| `frontend/src/lib/api.ts` |  |
| `frontend/src/lib/authClient.ts` | Bearer + refresh-on-401 |
| `frontend/src/lib/numerology.ts` | numerology engine (Section 6) |
| `frontend/src/lib/palmAnalysis/engine.ts` | palm quality gates + features |
| `frontend/src/lib/palmAnalysis/handLandmarkDetector.ts` |  |
| `frontend/src/lib/palmAnalysis/imagePreprocessing.ts` |  |
| `frontend/src/lib/palmAnalysis/index.ts` |  |
| `frontend/src/lib/palmAnalysis/lineEstimator.ts` |  |
| `frontend/src/lib/palmAnalysis/types.ts` |  |
| `frontend/src/lib/utils.ts` |  |
| `frontend/src/main.tsx` |  |
| `frontend/src/pages/About.tsx` |  |
| `frontend/src/pages/AvatarLive/DarshanDetail.tsx` | E1, E5–E7 |
| `frontend/src/pages/AvatarLive/DarshanPage.tsx` |  |
| `frontend/src/pages/AvatarLive/FamilyPage.tsx` |  |
| `frontend/src/pages/AvatarLive/index.tsx` |  |
| `frontend/src/pages/BirthChart.tsx` | B3 (pseudo scores) |
| `frontend/src/pages/Blog.tsx` |  |
| `frontend/src/pages/Chadhawa/ChadhawaDetail.tsx` |  |
| `frontend/src/pages/Chadhawa/ChadhawaSkeletons.tsx` |  |
| `frontend/src/pages/Chadhawa/index.tsx` |  |
| `frontend/src/pages/CompatibilityChecker.tsx` | B5 (hash scores) |
| `frontend/src/pages/Contact.tsx` |  |
| `frontend/src/pages/DailyHoroscopes.tsx` | B1 |
| `frontend/src/pages/Index.tsx` |  |
| `frontend/src/pages/InnerVoice.tsx` |  |
| `frontend/src/pages/InnerVoiceChat.tsx` | C1/C2 (Groq prompts) |
| `frontend/src/pages/InnerVoiceDashboard.tsx` | C4 karma composite |
| `frontend/src/pages/InnerVoiceJournal.tsx` |  |
| `frontend/src/pages/InnerVoiceWisdom.tsx` |  |
| `frontend/src/pages/NameDestinyReportPage.tsx` |  |
| `frontend/src/pages/NotFound.tsx` |  |
| `frontend/src/pages/PalmReading.tsx` | B8 |
| `frontend/src/pages/Puja/PujaDetail.tsx` |  |
| `frontend/src/pages/Puja/PujaSkeletons.tsx` |  |
| `frontend/src/pages/Puja/index.tsx` |  |
| `frontend/src/pages/Shop/ShopDetail.tsx` |  |
| `frontend/src/pages/Shop/ShopSkeletons.tsx` |  |
| `frontend/src/pages/Shop/index.tsx` |  |
| `frontend/src/pages/SolarSystem.tsx` |  |
| `frontend/src/pages/TarotExperience.tsx` | B7 |
| `frontend/src/pages/ZodiacDetail.tsx` | B2 seeded daily panel |
| `frontend/src/pages/ZodiacSigns.tsx` |  |
| `frontend/src/routes/AdminRoute.tsx` |  |
| `frontend/src/routes/ProtectedRoute.tsx` |  |
| `frontend/src/routes/PublicRoute.tsx` |  |
| `frontend/src/store/authStore.ts` | persisted session store |
| `frontend/src/test/example.test.ts` |  |
| `frontend/src/test/setup.ts` |  |
| `frontend/src/vite-env.d.ts` |  |
| `frontend/tailwind.config.ts` |  |
| `frontend/tsconfig.app.json` |  |
| `frontend/tsconfig.json` |  |
| `frontend/tsconfig.node.json` |  |
| `frontend/vercel.json` |  |
| `frontend/vite.config.ts` |  |
| `frontend/vitest.config.ts` |  |
| `solar-system-app/.gitignore` |  |
| `solar-system-app/LICENSE` |  |
| `solar-system-app/README.md` |  |
| `solar-system-app/api/runtime-auth0.js` |  |
| `solar-system-app/auth-manager.js` |  |
| `solar-system-app/auth0-config-new.js` |  |
| `solar-system-app/auth0-config.js` |  |
| `solar-system-app/drawer.js` |  |
| `solar-system-app/index.html` |  |
| `solar-system-app/package.json` |  |
| `solar-system-app/script.js` |  |
| `solar-system-app/scripts/build-static.js` |  |
| `solar-system-app/server.js` |  |
| `solar-system-app/style.css` |  |
| `solar-system-app/vercel.json` |  |
| `video.txt` |  |
