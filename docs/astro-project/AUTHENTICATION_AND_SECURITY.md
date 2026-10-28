# Authentication and Security

**Current behaviour** sections describe code as found; **Recommended** sections are proposals, not changes made. Nothing was exercised at runtime. Source: `backend/src/modules/auth/*`, `utils/{auth,mailer,msg91,googleAuth}.ts`, `middleware/authMiddleware.ts`, `frontend/src/{lib/authClient.ts,store/authStore.ts,features/auth,routes}`. Feature logic: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) A1–A9.

## 1. Current behaviour

### 1.1 Registration and account creation (A1)
Required: first/last name, email, password (≥8, lower+upper+digit), Indian 10-digit mobile `^[6-9]\d{9}$`, state, country, city. New users are created with the `USER` role in one transaction; flags `isEmailVerified=false`, `isPhoneVerified=false`, `profileCompleted=true`. An existing **unverified** account with the same email is overwritten. Registration itself sends no OTP.

### 1.2 Email OTP (A2)
6 digits via `Math.random`, SHA-256 (unsalted) in `otp_verifications`, valid 10 min, single use, resend gap 60 s, older unused codes invalidated. Lookup is by hash + email + type. No attempt counting. Mail failures are swallowed.

### 1.3 Phone verification (A3)
MSG91 widget in browser → `accessToken` → backend calls MSG91 `widget/verifyAccessToken` (5 s timeout). If the response carries a mobile it must end with the registered digits; otherwise the comparison is skipped. Then `isPhoneVerified=true` and a session is issued. Endpoint is unauthenticated and keyed by email.

### 1.4 Login / logout (A4, A7)
Login looks up by email; unknown → 404; password-less (Google-only) → 401; bcrypt compare (cost 8); inactive → 403 (checked **after** password); neither email nor phone verified → LOGIN OTP is emailed and `{requiresVerification:true}` returned. Logout deletes the presented refresh-token session; `logout-all` (authenticated) deletes all of a user's sessions.

### 1.5 Google OAuth (A5, A6)
Client obtains a Google ID token; backend verifies signature/audience (`GOOGLE_CLIENT_ID`) and requires `email_verified`. Match by `googleId`; else by email → **link** (sets `googleId`, `isEmailVerified=true`, **keeps any existing password**); else create a GOOGLE user with `profileCompleted=false`. Such users must call `POST /auth/complete-profile` (age ≥ 10); the requirement is enforced by a frontend redirect, not by backend gating of other routes.

### 1.6 Password reset (A8)
Token = 32 random bytes hex, stored **plaintext**, valid 1 h, single use; earlier unused tokens invalidated. Unknown email → 404 "Account … doesn't exist". Reset updates the password and token in a transaction; **sessions are not revoked**. Link base `FRONTEND_URL`.

### 1.7 Token lifecycle and rotation (A7)
| Token | Format | TTL | Storage |
|---|---|---|---|
| Access | JWT `{id, role}` signed with `JWT_SECRET` | 1 day | client localStorage (Zustand `auth`) |
| Refresh | 32 random bytes hex | 30 days | client localStorage; server stores SHA-256 in `sessions` |

Refresh: lookup by hash → expired ⇒ delete + 401; user inactive/deleted ⇒ 403; otherwise delete old session and create a new one (**rotation**). Client deduplicates concurrent refreshes (`refreshPromise`) and retries the failed request once; if refresh fails it clears the session. No `/me` endpoint; user object is kept from login time.

### 1.8 Roles and admin (A9)
Roles `USER`, `ADMIN`, `SUPERADMIN` (alias `SUPER_ADMIN` tolerated). `auth(...roles)` verifies the JWT and applies the hierarchy using the role **inside the token**. `/api/admin/*` requires ADMIN. `AdminService.getDashboard` re-checks DB role/active status. Admin creation: `prisma/seeds/makeadmin.ts` (hard-coded personal email). No user-management UI/API.

### 1.9 Existing controls
Joi validation on auth/admin modules; bcrypt; hashed refresh tokens and OTPs; refresh rotation; role hierarchy; Cloudinary upload filter (declared MIME, size, count); CORS allowlist; generic success message for unknown-email OTP resend; parameterised DB access via Prisma.

## 2. Confirmed vulnerabilities and weaknesses

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

## 3. Recommended remediation (not implemented)

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

## 4. Security verification checklist (proposed — none performed)

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
