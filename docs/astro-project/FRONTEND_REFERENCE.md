# Frontend Reference

Paths relative to `frontend/src/`. Feature IDs refer to [FEATURE_CATALOG.md](FEATURE_CATALOG.md); logic is in [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md). Not run in a browser during the investigation; behaviour is from code.

## 1. Route inventory

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

## 2. State management and data fetching

| Concern | Implementation |
|---|---|
| Session | Zustand `useAuthStore` persisted to localStorage key `auth` (user, access/refresh tokens, `isAuthenticated`, `hasHydrated`); `useAuthHydrated` gates guards |
| Server state | TanStack Query (default `QueryClient`, no global config); catalogue queries `staleTime 60 s`; Darshan queries `staleTime: Infinity` patched by SSE |
| HTTP | `lib/authClient.ts#authRequest` (envelope unwrap, refresh-on-401, `skipAuth` for public calls; used for catalogues, auth, admin). `lib/api.ts#ApiService` (legacy; only `getDarshanTemple(s)` live). Raw `fetch` in reading pages and `hooks/useInterpretation.ts`. |
| Forms | react-hook-form + zod (`features/auth/schemas`); admin dialogs; reading pages use ad-hoc `useState` |
| Local persistence | `localStorage` for Inner Voice data (list in [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) S-GROQ); `sessionStorage` `auth:pending-registration` (email+phone during signup) |
| Navigation helpers | `NavigationContext`, `useBackOverride` (custom back handling, not traced), `forceScrollTop` hacks in `App.tsx` |

## 3. Forms and validation (frontend side)

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

## 4. Static, mocked and hard-coded data

`data/zodiacData.ts` (sign info), `data/tarotData.ts` (deck), `data/blogPosts.ts`, `data/tools.ts`, `data/features.ts`, `data/planetaryData.ts`, `data/liveStreams.ts` (**fabricated viewer counts, hard-coded `isLive`, sample prayers, family/upcoming events**), `NameDestinyReport/lib/celebrityData.ts` (provenance unknown), static fallbacks in Tarot (`generateFallbackReading`), Karma (`composite 62`), Journal (`FALLBACK`), Compatibility chat (`getCompatFallback`). `data/temples.ts` and `data/products.ts` exist only as type shapes mirrored by `features/*/types.ts` (real data comes from the API).

## 5. Loading / empty / error behaviour (as coded)

* Horoscope: spinner → text; error text "Failed to generate horoscope".
* Birth chart / compatibility: fixed **5.6 s** artificial loading screen; API failures swallowed (birth chart) → static results.
* Tarot: loading overlay; any failure → static fallback reading.
* Catalogue pages: skeleton components (`PujaSkeletons`, `ChadhawaSkeletons`, `ShopSkeletons`); error/empty states exist per page [not individually traced].
* Darshan list: shows static data (with hard-coded LIVE) until API responds; detail: Offline UI until a live `videoId` arrives.
* Auth: toasts (sonner) with backend message.

## 6. Missing handlers and nonfunctional controls

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

## 7. Access restrictions

Only the admin area is guarded. All readings, the AI Guru, catalogues and Darshan are public; signed-in state is read only by `Navbar`. There is no profile page, booking history, or logout-everywhere UI (API exists).

## 8. Known frontend defects

* `tsc -p tsconfig.app.json`: **40 errors in 11 files** (InnerVoiceChat 15, InnerVoiceWisdom 7, InnerVoice 4, BirthChart 4, InnerVoiceJournal 3, useInterpretation 2, 1 each in InnerVoiceDashboard, CompatibilityChecker, useSpeechRecognition, useApi, InteractiveSolarSystem); `strict:false`. `vite build` does not type-check, and it was not run.
* `VITE_GROQ_API_KEY` in bundle ([KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md)).
* Dead/legacy: `lib/api.ts` (non-Darshan methods hit nonexistent endpoints), `hooks/useApi.ts`, `hooks/useChartChat.ts`, unused guards, `VITE_GEMINI_API_KEY` type, `frontend/public/` solar copy and duplicate `(1)` files, large commented-out blocks in `BirthChart.tsx` (~1060 lines), `CompatibilityChecker.tsx`, `ZodiacDetail.tsx`.
* Nominatim called straight from browsers (`searchPlaces`) — usage-policy risk.
* Darshan SSE not resynced after reconnect.
* `vite.config.ts` includes `rollup-plugin-visualizer` with `open:true` (opens a browser on build) and `lovable-tagger` in dev.
* Only test: `src/test/example.test.ts` (`expect(true).toBe(true)`).

## 9. Not inspected in depth

Three.js scene components, hero/cosmic/background components, `components/ai-guru/*` presentation, `NameDestinyReport/sections/*` (except paywall), `lib/palmAnalysis/*` internals, `About.tsx`, `Index.tsx`, admin page/dialog components (API layer only). Treat statements about them as limited.
