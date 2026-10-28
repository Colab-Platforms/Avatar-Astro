# Integrations and Environment

Only environment variable **names** are recorded. No secret was printed, copied or stored. Account/subscription status of every external service is **[UNKNOWN]** unless stated — the repository cannot show it. No pricing is stated or implied.

> **Claude Code vs. the app's AI providers.** Claude Code (the CLI used for this investigation/documentation) is a *developer tool* and is **not** a dependency of the application. The deployed app uses OpenRouter (backend; model IDs from Google, OpenAI, Anthropic families), Groq (browser) and Sarvam (TTS). The model ID `anthropic/claude-3.5-sonnet` appears only in the unused palm endpoint, routed via OpenRouter.

## 1. Service register

| Service | Purpose | Dependent features | Code integration | Env names | Requirement status |
|---|---|---|---|---|---|
| **PostgreSQL** | persistence | all server features | Prisma + pg adapter | `DATABASE_URL` | **Required** |
| **OpenRouter** | LLM (text; vision in palm) | B1, B3, B4, B6, B7, B8b, C7 | axios/fetch to `https://openrouter.ai/api/v1/chat/completions` with Bearer | `OPENROUTER_API_KEY` | **Required** for AI readings; name report falls back to mock; models listed in [BACKEND_API_REFERENCE.md](BACKEND_API_REFERENCE.md); model availability/credit **UNKNOWN**; free-tier IDs rate-limited |
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

## 2. Environment variable names by area

**Backend (`backend/.env`)** — `.env.example` lists only: `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRE`, `CORS_ORIGIN`, `SMTP_HOST/PORT/USER/PASS`, `OPENROUTER_API_KEY`, `YOUTUBE_API_KEY`, `BACKEND_PUBLIC_URL`, `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS`, `CLOUDINARY_*`. **Missing from the example but used by code:** `DATABASE_URL`, `RESEND_API_KEY`, `SMTP_FROM_EMAIL`, `APP_NAME`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `MSG91_AUTH_KEY`, `MSG91_WIDGET_ID`, `MSG91_TOKEN_AUTH`, `SARVAM_API_KEY`, `ASTRO_API_BASE_URL`(dead). **Present locally but unused:** `MONGODB_URI`, `MONGODB_DNS_SERVERS`, `DARSHAN_REFRESH_INTERVAL_MINUTES`, `GOOGLE_CLIENT_SECRET`, `SUPPORT_EMAIL`, `SMTP_*`, `JWT_EXPIRE` (legacy middleware only).

**Frontend (`frontend/.env*`)** — `VITE_API_URL` (default `http://localhost:5000/api`), `VITE_GOOGLE_CLIENT_ID`, `VITE_GROQ_API_KEY`, `VITE_GROQ_MODEL`, `VITE_SOLAR_SYSTEM_URL` (default `http://localhost:3000`), `VITE_ENV`, `VITE_SARVAM_API_KEY` (unused), `VITE_GEMINI_API_KEY` (typed only). `frontend/.env.local` exists locally and is untracked.

**Port facts:** backend `PORT` defaults to 5001 if unset in `index.ts` (legacy `config/environment.ts` defaults to 5000; local `.env` sets 5000); Vite dev server 8081 proxying `/api` → `localhost:5000`; `FRONTEND_URL` default `http://localhost:3000` (does not match 8081).

## 3. Local setup prerequisites and commands (from `package.json`; none were executed by the investigation except the read-only checks noted)

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

## 4. To verify before production

* Valid and funded accounts/keys: OpenRouter (and that the model IDs exist), Groq (model exists), Sarvam, Resend (domain verified), MSG91 (widget, DLT), Google OAuth client + authorised origins, Cloudinary (create permission), YouTube API project and quota.
* Live Darshan: public HTTPS `BACKEND_PUBLIC_URL`; always-on single instance; four temples need channel IDs.
* Rotate any key ever bundled to browsers (Groq) — a design change is pending ([RESTART_ROADMAP.md](RESTART_ROADMAP.md) T-SEC).
* Complete `.env.example`; remove unused keys.

> **Update:** Groq calls now go through the backend (`POST /api/ai/chat`). Set `GROQ_API_KEY` (and optional `GROQ_MODEL`) in `backend/.env`; the `VITE_GROQ_*` variables described below are obsolete and must not be used.
