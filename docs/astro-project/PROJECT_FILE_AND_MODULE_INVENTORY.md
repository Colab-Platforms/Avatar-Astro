# Project File and Module Inventory

Back to [README](README.md). Inventory taken from `git ls-files` on branch `dev-vishwa` at `58a6f0e` plus untracked `docs/` and `package-lock.json` (2026-10-19). "Reachable" means imported from an entry point (`main.tsx` / `index.ts`) by static search of import statements — a heuristic, **not** a runtime trace; dynamic imports and barrel files were checked by hand where noted.

## 1. Totals

| Area | Tracked files | Notes |
|---|---|---|
| `backend/` | 97 | 64 TS files under `src/`, 5 Prisma schema files, 5 migrations, 6 seed files |
| `frontend/` | 344 | incl. 105 `.bin` shim files (committed by mistake), 49 shadcn UI files, images |
| `solar-system-app/` | 17 | separate third-party-style app (Auth0) |
| root | 19 | status/summary `.md` files, `api/tts.ts`, `video.txt`, `package-lock.json` (untracked) |
| Media | 216 tracked images/video/3D (png/jpg/svg/webp/mp4/glb) | not individually catalogued |
| Overall | 537 non-media tracked files (incl. 105 `.bin` shims) + 216 media files | counts from `git ls-files` with extension filter |

Source line counts (largest): `BirthChart.tsx` 2018, `CompatibilityChecker.tsx` 2078, `TarotExperience.tsx` 2060, `InnerVoiceChat.tsx` 1439, `ZodiacDetail.tsx` 1275, `PalmReading.tsx` 1019, `ZodiacSigns.tsx` 963, `InnerVoice.tsx` 675, `auth.service.ts` 740, `shop.service.ts` 538, `puja.service.ts` 470, `index.ts` 580.

## 2. Subprojects, languages and tooling

| Subproject | Language / runtime | Frameworks | Build / run |
|---|---|---|---|
| `backend/` (`astrology-backend`) | TypeScript 5.9, Node ESM (`"type":"module"`, `NodeNext`) | Express 4, Prisma 7 + `@prisma/adapter-pg`, Joi, jsonwebtoken, bcrypt (+ unused bcryptjs, express-validator), multer, cloudinary, resend, google-auth-library, axios, dayjs | `tsx watch src/index.ts` / `tsc && tsc-alias` → `node dist/src/index.js` |
| `frontend/` (`vite_react_shadcn_ts`) | TypeScript (strict:false), React 18 | Vite 5 + SWC, react-router 6, TanStack Query 5, Zustand 5, RHF + zod, Tailwind 3 + shadcn/Radix, GSAP, Framer Motion, three/@react-three, MediaPipe tasks-vision, jsPDF, Recharts, Vitest 3 | `vite` (port 8081) / `vite build` |
| `solar-system-app/` | JS, Node | Express static server, Auth0 config files, vanilla JS (`script.js`, `drawer.js`) | `server.js` / `scripts/build-static.js` |
| `api/tts.ts`, `frontend/api/tts.ts` | TS (Vercel serverless) | – | deployed by Vercel only if a project is rooted there [UNKNOWN] |

Tooling artefacts that are not product features: `lovable-tagger` (Lovable scaffold), `rollup-plugin-visualizer` (**`open: true` — a browser tab opens on every build/dev start**), `components.json` (shadcn), `bun.lockb` alongside `package-lock.json` (two lockfiles).

## 3. Backend inventory (`backend/src`)

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
| `prisma/schema/{schema,auth,temple,shop,darshan}.prisma`, `prisma/migrations/*` (5), `prisma/seeds/*` (6), `prisma.ts`, `prisma.config.ts` | data layer | see [DATABASE_AND_MIGRATION_GUIDE.md](DATABASE_AND_MIGRATION_GUIDE.md) |
| `skills-lock.json` | Claude Code skills lock (tooling artefact) | – |

## 4. Frontend inventory (`frontend/src`)

| Area | Contents | Notes |
|---|---|---|
| Entry | `main.tsx`, `App.tsx` (routes, providers, lazy-loaded pages), `index.css`, `App.css` | 3 route groups; see [FRONTEND_REFERENCE.md](FRONTEND_REFERENCE.md) |
| Pages (`pages/`) | Index, About, Blog, Contact, NotFound, SolarSystem, DailyHoroscopes, ZodiacSigns, ZodiacDetail, BirthChart, CompatibilityChecker, NameDestinyReportPage, TarotExperience, PalmReading, InnerVoice (+Chat, Dashboard, Journal, Wisdom), `Puja/*`, `Chadhawa/*`, `Shop/*`, `AvatarLive/*` | `Shop/index` and `AvatarLive/index` are reached by `lazy(() => import("./pages/…/index"))` (not dead) |
| Features (`features/`) | `auth` (pages, components, hooks, schemas, api, utils), `admin` (api, components, hooks, pages), `puja`, `chadhawa`, `shop` (api/hooks/types each) | `features/auth/index.ts` barrel unused |
| Components | layout (Layout, Navbar, Footer, CosmicBackground, PageTransition, Loader…), `ai-guru/*` (14), `NameDestinyReport/*` (index + 14 sections + lib), `palm/*` (3), `tarot/*`, `hero/*`, `three/*` (8), `astrology/ElementSelector`, `auth/Msg91PhoneWidget`, `ui/*` (shadcn, 49 files) | |
| Libraries (`lib/`) | `api.ts` (legacy client; only Darshan calls are live), `authClient.ts`, `numerology.ts`, `palmAnalysis/*` (6), `utils.ts` | |
| State | `store/authStore.ts` (Zustand persist `auth`), `context/NavigationContext.tsx`, React Query | |
| Hooks | `useApi` (dead), `useChartChat` (dead), `useConsultationGuard`, `useDarshanLiveEvents`, `useDarshanTemple(s)`, `useInterpretation`, `useLanguageDetection`, `useSpeechRecognition`, `useTextToSpeech`, `useVerifyPhone` (a second copy also exists under `features/auth/hooks`), `use-mobile`, `use-toast` (+ duplicate under `components/ui`) | |
| Data (`data/`) | `blogPosts`, `features`, `liveStreams`, `planetaryData`, `tarotData`, `tools`, `zodiacData` (static content); `products.ts`, `temples.ts` (legacy dummy data, no importers — only referenced in comments) | |
| Guards (`routes/`) | `AdminRoute`, `ProtectedRoute.tsx` (exports `GoogleOnboardingRoute`, used in `App.tsx`; no other route is login-guarded), `PublicRoute` | |
| Tests | `test/example.test.ts` (1 trivial test), `test/setup.ts` | |

### 4.1 Statically unreferenced frontend modules (candidate dead code)

`components/CosmicCursor.tsx`, `FloatingPlanets.tsx`, `ScrollStorytelling.tsx`, `StarField.tsx`; `components/three/{CloudLayer, MountainSilhouette, RealisticStarfield, ScrollytellingHero, SolarSystemOptimized, ZodiacFormation}.tsx` (`InteractiveSolarSystem` is imported only by the unreferenced `ScrollytellingHero`); `data/products.ts`, `data/temples.ts`; `hooks/useApi.ts`, `hooks/useChartChat.ts`; `features/auth/index.ts`; unused shadcn primitives: accordion, alert, aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, tabs, toggle-group, toggle. Method: filename-based import search; **not** confirmed by bundler analysis. Verify with `stats.html` (visualizer) or `knip` before deleting.

### 4.2 Stray / duplicated artefacts

| Path | Issue |
|---|---|
| `frontend/.bin/*` (committed shims) | node_modules `.bin` shims tracked in git; should be ignored |
| `frontend/public/{index.html, index (1).html, main.js, package (1).json, package-lock (1).json, vite.config.js, LICENSE, README.md, SECURITY.md}` | copy of a third-party app dropped into `public/` (served as static assets) |
| `frontend/api/tts.ts` vs root `api/tts.ts` | two differing Vercel functions |
| `backend/.gitignore`, `.env*` | `.env` untracked; `.env.example` incomplete |
| root `*.md`, `COMPLETION_SUMMARY.txt`, `video.txt`, `backend/darshan-live.txt` | historical status notes; claims inside are **unverified** (see [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md)) |
| `solar-system-app/` | separate app with its own `package.json`/Auth0 config; iframe target for `/solar-system` |

## 5. Missing from the upload / evidence limits

* No `.env` values were read (names only); no production configuration, deployment settings, or database contents were available.
* Migration SQL is the only evidence of schema; production schema state is **[UNKNOWN]**.
* `frontend/.env.production` / `.env.development` were deleted in recent commits; their former contents (`VITE_API_URL`) are only in git history.
* No CI configuration, Dockerfile, or infrastructure-as-code exists in the repo.
* Media assets were counted but not opened.
* 18 large page components (1000+ lines) were traced by symbol/search and by the earlier investigation; every line was not re-read in this pass.

## 6. Module ↔ feature cross-reference

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

Details: [FEATURE_CATALOG.md](FEATURE_CATALOG.md), [BACKEND_API_REFERENCE.md](BACKEND_API_REFERENCE.md), [FRONTEND_REFERENCE.md](FRONTEND_REFERENCE.md).
