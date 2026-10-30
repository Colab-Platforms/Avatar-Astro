# Local testing: admin panel and user dashboard

Everything here runs **only on your computer**, against an embedded throwaway database. The scripts are hard-wired
to that database (they never read `DATABASE_URL` from your shell or from `backend/.env`), and every external service
(email, SMS, AI providers, YouTube, Cloudinary, Google) is switched **off**, so local testing cannot touch Neon,
send messages, upload images or subscribe anything.

## Temporary TEST accounts (local database only)

Password for all of them: `LocalTest#2026`

| Email | What it is | Expected behaviour |
|---|---|---|
| `local.admin@example.com` | Main admin (SUPERADMIN) | Opens `/admin` and every admin section |
| `local.user@example.com` | Normal user | Opens `/dashboard`; `/admin` sends them to the home page |
| `local.user2@example.com` | Second normal user | Use it next to the first to check users cannot see each other's data |
| `local.legacyadmin@example.com` | Old `ADMIN` role | Sees "Main admin only" in `/admin`; every admin API answers 403 |
| `local.deactivated@example.com` | Deactivated user | Cannot sign in |

These accounts and this password exist nowhere except in the local database. Never use them anywhere else.

## Start it (4 terminals, from the repository root, PowerShell)

```powershell
# Terminal 1: the local test database (leave open). Data lives outside the repo in ~/.mybhagya-local-testdb
cd backend
npm run local:db

# Terminal 2: first time only (safe to repeat): applies the migrations, creates the test accounts and a tiny sample catalogue
cd backend
npm run local:setup

# Terminal 3: the backend on http://localhost:5001
cd backend
npm run local:backend

# Terminal 4: the frontend on http://localhost:8082
cd backend
npm run local:frontend
```

Then open:

- Admin panel: <http://localhost:8082/admin> (sign in at <http://localhost:8082/login> first)
- User dashboard: <http://localhost:8082/dashboard>

Stop everything with Ctrl+C in each terminal. To start from scratch, stop terminal 1 and delete the folder
`%USERPROFILE%\.mybhagya-local-testdb`, then run `npm run local:db` and `npm run local:setup` again.

## What does not work locally (on purpose)

- **Registering a new account:** sign-up sends an email or SMS code. Those services are off in local mode, so no code
  arrives. Use the test accounts above. (To test sign-up for real you would have to set `RESEND_API_KEY` and
  `SMTP_FROM_EMAIL` in the shell before `npm run local:backend`, which sends **real emails**, so it is not the default.)
- **Google sign-in, AI readings, voice, live stream status, email forms:** they need provider keys and are off.
  Their pages load and show the normal "not configured / unavailable" behaviour.
- **Catalogue:** only a tiny sample (one temple, two offerings, one product, no images). The repository's own
  catalogue seeds (`npm run db:seed:*`) upload images to Cloudinary, so do not run them for local testing.

## Your own real account (production)

Register normally on the live site, then promote it from `backend/` with `npm run db:make-superadmin`. See
`docs/ADMIN_PANEL_DEPLOYMENT.md`. Do that only deliberately, against the intended database, after a backup.

## Automated checks

- Backend admin/security integration tests need their own disposable database and refuse anything that is not
  localhost: `TEST_DATABASE_URL=<a localhost Postgres> npm run test:admin`. They reset that database, so do not point them
  at the persistent local test database.
- Other backend suites: `npm run test:ai`, `test:tarot`, `test:inquiry`, `test:websub`, `test:gemstone`.
- Frontend: `npm test` in `frontend/`.

## Using your real providers locally (opt-in)

By default the local backend starts with every provider OFF, so the admin AI & integrations page correctly shows "Not configured" there.
To use providers you configured in backend/.env, name them explicitly (values are never printed, DATABASE_URL is never copied):

```powershell
npm run local:backend -- --with=openrouter,groq,sarvam,google
npm run local:frontend -- --with=google     # shows the Google button (client id from frontend/.env.local)
```

Allowed names: openrouter, groq, sarvam, google, email, msg91. This makes REAL provider calls (and real emails/SMS for email and msg91).
YouTube/WebSub and Cloudinary are deliberately not offered.

## Why a Google account can be missing from this admin panel

The admin panel shows the database the backend it talks to is connected to. Your usual dev backend (backend/.env) points at a different, hosted database than the local test stack (embedded, port 5544). An account created through one is stored only in that one. The AI & integrations page shows which database you are looking at.
