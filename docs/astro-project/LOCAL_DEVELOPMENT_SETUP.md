# Local Development Setup

Back to [README](README.md). Environment variable **names** only; never paste real values into documents or commits. Commands come from `package.json` files; this pass **re-ran only** `tsc --noEmit` (backend), `tsc -p tsconfig.app.json --noEmit` (frontend) and `vitest run` — no server, database or provider was started.

## 1. Prerequisites

* Node.js (version not pinned in the repo; backend `@types/node` ^20 suggests Node 20+ — inferred), npm.
* PostgreSQL 14+ reachable via `DATABASE_URL` (version requirement inferred, not stated).
* Optional keys depending on what you want to exercise: see [INTEGRATIONS_AND_ENVIRONMENT.md](INTEGRATIONS_AND_ENVIRONMENT.md).
* Windows is fine (project was developed on Windows paths); shell examples below are POSIX/PowerShell-neutral.

## 2. Ports and URLs

| Process | Default | Source |
|---|---|---|
| Backend | `PORT` env, else **5001** (`backend/src/index.ts`) | local `.env` conventionally sets 5000 |
| Frontend dev server | **8081**, `host: "::"` | `frontend/vite.config.ts` |
| Vite proxy | `/api` → `http://localhost:5000` | same file (only helps if backend is on 5000) |
| Frontend API base | `VITE_API_URL` else `http://localhost:5000/api` | `frontend/src/lib/*` |
| `FRONTEND_URL` default (password-reset links) | `http://localhost:3000` | does **not** match 8081 — set it |
| Solar system iframe | `VITE_SOLAR_SYSTEM_URL` else `http://localhost:3000` | `/solar-system` |

Simplest consistent local setup: backend `PORT=5000`, `FRONTEND_URL=http://localhost:8081`, no `VITE_API_URL` needed. CORS already allows `localhost:8081` and any LAN IP.

## 3. Backend

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

## 4. Frontend

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

## 5. Environment files (names only)

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

## 6. What works with which configuration

| You want to try | Needs |
|---|---|
| Browse Puja/Chadhawa/Shop/Darshan lists | DB + seeds |
| Register/login by email | DB + roles seed + `RESEND_API_KEY` & verified sender (otherwise OTP is only logged as an error; you can read the OTP hash only — see note) |
| Google sign-in | `GOOGLE_CLIENT_ID` (backend) = `VITE_GOOGLE_CLIENT_ID`; `http://localhost:8081` as an authorised origin |
| Phone OTP | MSG91 widget/auth values |
| Admin CMS | an ADMIN user ([DATABASE_AND_MIGRATION_GUIDE.md §4.4](DATABASE_AND_MIGRATION_GUIDE.md)) + Cloudinary for images |
| Horoscope/Birth chart/Name narrative/Tarot | `OPENROUTER_API_KEY` (name narrative works without a key via mock text) |
| Inner Voice (all pages) | `VITE_GROQ_API_KEY` |
| Voice playback | `SARVAM_API_KEY` |
| Palm scan | camera + internet (MediaPipe assets from jsDelivr / Google storage) |
| Live Darshan "LIVE" state | `YOUTUBE_API_KEY`, public `BACKEND_PUBLIC_URL`, channels with IDs |

Note on OTP in dev: OTPs are stored hashed (SHA-256) and only emailed, so without a working mailer you cannot read one. For local testing either configure Resend, temporarily log the code in a **local, uncommitted** change, or insert a known hash directly into `otp_verifications`. Nothing in the repo provides a dev bypass.

## 7. Verification commands used in this documentation pass

| Check | Result (2026-10-19) |
|---|---|
| `cd backend && npx tsc --noEmit -p .` | exit 0, no diagnostics |
| `cd frontend && npx tsc -p tsconfig.app.json --noEmit` | **40 errors** |
| `cd frontend && npx vitest run` | 1 file, 1 test passed |
| Backend tests | not runnable |
| Lint, builds, servers, DB, providers | **not run** |

## 8. Troubleshooting

* `register` returns 500 "run db:seed first" → roles table empty.
* CORS error from a custom host/port → add to `CORS_ORIGIN` or the explicit list in `index.ts` (rejections surface as HTTP 500 with "Not allowed by CORS").
* Password-reset link opens a dead port → set `FRONTEND_URL`.
* Vite proxy 404s → backend not on port 5000.
* `/solar-system` blank → nothing serves `http://localhost:3000`; start `solar-system-app` (its own `npm install` / `server.js`) or set `VITE_SOLAR_SYSTEM_URL`.
* Build opens a browser → `visualizer({ open: true })` in `vite.config.ts`.
* AI features return provider errors → model slug may be unavailable; see [AI_MODELS_PROMPTS_AND_CALCULATIONS.md](AI_MODELS_PROMPTS_AND_CALCULATIONS.md).

> **Update:** Groq calls now go through the backend (`POST /api/ai/chat`). Set `GROQ_API_KEY` (and optional `GROQ_MODEL`) in `backend/.env`; the `VITE_GROQ_*` variables described below are obsolete and must not be used.
