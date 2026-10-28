# Avatar-Astro — Project Documentation

> **Scope and date.** Documents the repository as it stood on branch `dev-vishwa` at commit `58a6f0e` (investigation date 2026-10-19). Source of truth: the investigation report (13 sections, 54 features). **Nothing here has been verified at runtime** — the only executed checks were `tsc --noEmit` (backend clean; frontend 40 errors) and one trivial frontend test, **re-run 2026-10-19** with the same results. Recommendations are always labelled as recommendations; current behaviour is stated as found in code.

## 1. What the project is

A React/Vite single-page site ("Spiritual AI" / "Avatar Learner" in UI strings) with an Express + Prisma + PostgreSQL backend. It offers:

* **Astrology-style readings** — daily horoscope, birth chart, compatibility, numerology name report, tarot, palm scan. None is backed by an ephemeris; outputs are local tables, numerology math, hash-derived pseudo-scores, or LLM text.
* **Inner Voice / AI Guru** — a "Vedic pandit" chat, diagnosis report, voice mode, karma score, journal, shloka tool (LLM calls made **from the browser** to Groq).
* **Devotion catalogue** — Puja (temples/pujas), Chadhawa (offerings), Shop (products) with an admin CMS and Cloudinary images. **Booking/cart/checkout/donation controls are UI only.**
* **Live Darshan** — YouTube temple live streams with WebSub push, safety-net polling and SSE.
* **Authentication** — email/password, email OTP, MSG91 phone OTP, Google sign-in, rotating refresh tokens, roles.

## 2. Current implementation status (54 features)

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

Per-feature detail: [FEATURE_CATALOG.md](FEATURE_CATALOG.md).

## 3. Technology stack

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

MongoDB: **no MongoDB code exists** in the repository; only stale `MONGODB_*` keys in a local `.env`. See [DATABASE_AND_DATA_MODELS.md](DATABASE_AND_DATA_MODELS.md).

## 4. Documents (22)

| # | Document | Purpose |
|---|---|---|
| 1 | [README.md](README.md) | This entry point |
| 2 | [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) | Structure, entry points, routing, auth/DB architecture, deployment |
| 3 | [PROJECT_FILE_AND_MODULE_INVENTORY.md](PROJECT_FILE_AND_MODULE_INVENTORY.md) | Every subproject/module, reachability, dead and stray files, evidence limits |
| 4 | [FEATURE_CATALOG.md](FEATURE_CATALOG.md) | All 54 features with status, routes, endpoints, limits |
| 5 | [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) | Actual business logic per feature (most important) |
| 6 | [USER_FLOWS_AND_USE_CASES.md](USER_FLOWS_AND_USE_CASES.md) | 19 end-to-end journeys, where each stops being real |
| 7 | [BUSINESS_RULES_AND_FORMULAS.md](BUSINESS_RULES_AND_FORMULAS.md) | Canonical constants, thresholds, formulas, worked example |
| 8 | [FRONTEND_REFERENCE.md](FRONTEND_REFERENCE.md) | Routes, pages, state, mocks, dead controls |
| 9 | [BACKEND_API_REFERENCE.md](BACKEND_API_REFERENCE.md) | Mounted vs unmounted endpoints, validation, providers |
| 10 | [DATABASE_AND_DATA_MODELS.md](DATABASE_AND_DATA_MODELS.md) | Prisma models, ERD, persistence, risks |
| 11 | [DATABASE_AND_MIGRATION_GUIDE.md](DATABASE_AND_MIGRATION_GUIDE.md) | Migrations, seeds, procedures, housekeeping |
| 12 | [INTEGRATIONS_AND_ENVIRONMENT.md](INTEGRATIONS_AND_ENVIRONMENT.md) | External services, env var names, setup |
| 13 | [AI_MODELS_PROMPTS_AND_CALCULATIONS.md](AI_MODELS_PROMPTS_AND_CALCULATIONS.md) | Model register, prompts, local vs LLM vs pseudo-random logic |
| 14 | [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md) | Auth lifecycle, vulnerabilities, remediation |
| 15 | [INTEGRATION_AND_DATA_FLOW_DIAGRAMS.md](INTEGRATION_AND_DATA_FLOW_DIAGRAMS.md) | Mermaid workflows |
| 16 | [ADMIN_AND_OPERATIONS_GUIDE.md](ADMIN_AND_OPERATIONS_GUIDE.md) | Admin console, operating the backend, runbooks |
| 17 | [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md) | Prioritised defects and debt |
| 18 | [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md) | Existing test results + proposed tests |
| 19 | [LOCAL_DEVELOPMENT_SETUP.md](LOCAL_DEVELOPMENT_SETUP.md) | Ports, env names, commands, troubleshooting |
| 20 | [PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) | Unresolved decisions (not decided here) |
| 21 | [RESTART_ROADMAP.md](RESTART_ROADMAP.md) | Prioritised plan (recommendation only) |
| 22 | [CHANGELOG.md](CHANGELOG.md) | Changes to this documentation, ID convention |

## 5. Most important known limitations

1. **No commerce.** Puja Book, Chadhawa "Proceed to Offer", Shop Add to Cart / Buy Now, Darshan Donate have no handlers; no Order/Booking/Payment/Cart tables.
2. **No real birth chart / Kundali.** Birth time is never used; birth place only reaches an LLM prompt as a city string. Birth-chart and compatibility scores are hash-derived pseudo-random numbers.
3. **Groq API key ships in the browser bundle** (`VITE_GROQ_API_KEY`); backend AI/TTS endpoints have no auth or rate limiting.
4. **Auth gaps:** OTP brute-forceable, account pre-hijack path, possible phone-match bypass, user enumeration.
5. **Live Darshan:** unsigned webhook; unrelated uploads can mark a live stream offline.
6. **Mocked UI:** Contact, Newsletter, ₹499 paywall, compatibility chat, viewer counts, hard-coded LIVE flags.

Full list: [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md).

## 6. How to navigate

* New developer: README → [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) → [FEATURE_CATALOG.md](FEATURE_CATALOG.md) → area references.
* Need to know what a feature *really* does: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md).
* Preparing to build: [PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) then [RESTART_ROADMAP.md](RESTART_ROADMAP.md).
* Security review: [AUTHENTICATION_AND_SECURITY.md](AUTHENTICATION_AND_SECURITY.md).

## 7. Conventions

* Status labels: IMPLEMENTED — NOT END-TO-END VERIFIED (**IMPL-NV**), PARTIALLY IMPLEMENTED (**PART**), UI ONLY (**UI**), BACKEND ONLY (**BE**), MOCKED (**MOCK**), UNVERIFIED (**UNV**), NOT IMPLEMENTED (**NOT**), BROKEN, VERIFIED WORKING.
* Feature IDs follow the investigation: A1–A9, B1–B9 (with B6b, B8b, B9a, B9b), C1–C8, D1–D11, E1–E8, F1–F6.
* Line numbers are approximate (taken from the investigation) and may drift; function names are the stable anchor.
* "[UNKNOWN]" means it cannot be established from the repository.
* No secret values appear in these documents; only environment variable **names**.
