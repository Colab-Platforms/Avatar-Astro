# Product Decisions and Open Questions

All items are **open**. This document records them, why they matter and what decision is needed; it deliberately decides none. Questions marked from the investigation report are preserved; items added while documenting are marked *(added)* when they are direct implications of report findings. IDs (`D-…`) are referenced from [RESTART_ROADMAP.md](RESTART_ROADMAP.md).

## 1. Business and product requirements

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-BIZ-1 | What is the product positioning: entertainment/guidance app or a service with accuracy and commercial obligations? | Determines accuracy, disclaimers, legal exposure, what to remove | all B, C | Choose positioning and required disclaimers |
| D-BIZ-2 | Which features are launch-critical vs optional? (e.g. palm, tarot, solar system, blog) | Avoids stabilising features nobody will ship | B, C, F | Launch scope list |
| D-BIZ-3 | Should any feature require login? Today none (except admin) does | Drives usage limits, personalisation, data retention | A, B, C | Define gated features |
| D-BIZ-4 | What is the role of `solar-system-app` (third-party-authored, own Auth0)? Ship, replace or drop? | Licensing/hosting; stray copies in repo | F4 | Keep/replace/remove |
| D-BIZ-5 | Are the mock behaviours (Contact, Newsletter, ₹499 paywall, viewer counts, family events) to be built or removed? | Trust and honesty | F1, F2, B6b, E8 | Build or remove each |

## 2. Astrology accuracy and calculation requirements

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

## 3. Pooja, Chadhawa, Shop and donation workflows

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-DEV-1 | Is Puja booking a real transactional service (who performs rituals, availability, slots, sankalp details, confirmation, proof) or an enquiry funnel? | Entire data model and ops depend on it | D1, D2 | Service model |
| D-DEV-2 | Chadhawa: what is delivered/fulfilled and by whom; date selection (FAQ promises it) | Spec for D4 | D3, D4 | Workflow definition |
| D-DEV-3 | Shop: own inventory/shipping, dropshipping, or catalogue only? Tax/GST, returns, authenticity claims | Commerce scope; legal claims ("authenticity" text) | D5, D6 | Model |
| D-DEV-4 | Donations: legal entity, receipts, 80G/FCRA, who receives funds | Compliance | E6 | Whether to offer at all |
| D-DEV-5 | Should `Temple.priceFrom` be derived from puja prices? Should catalogue temples link to Darshan channels? | Data consistency | D1, E | Schema direction |
| D-DEV-6 | Four Darshan temples lack YouTube channel IDs — fill, hide, or drop? Replace fabricated viewer counts? Family/upcoming events: real feature? | Visible fake data | E1, E8 | Per item |
| D-DEV-7 | Prayer wall: real shared/moderated feature? Reminders: delivered how (email/push/WhatsApp)? | Moderation, notification provider | E5, E7 | Build or remove |

## 4. Payments, booking, orders and fulfilment

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PAY-1 | Payment provider and methods (none exists in code) | Integration, compliance | D2, D4, D6, E6, B6b | Provider choice |
| D-PAY-2 | Order/booking lifecycle and states, cancellation/refund policy | State machine, support load | D2–D6 | Policy |
| D-PAY-3 | Customer data to collect (name, gotra, address, phone) and storage | Schema, privacy | D2–D6 | Fields + retention |
| D-PAY-4 | Notifications (email/SMS/WhatsApp) and proof-of-service delivery | Providers | D2, D4 | Channels |
| D-PAY-5 | Is the ₹499 name-report paywall real? Server-side entitlement? | Revenue vs demo | B6b | Build or remove |
| D-PAY-6 | Admin operations: order console, reporting, roles beyond ADMIN | Scope | D7 | Requirements |

## 5. Authentication and account linking

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-AUTH-1 | Which verification is mandatory: email, phone, or either (today either)? | Login gating, spam, fraud | A2–A4 | Policy |
| D-AUTH-2 | Account linking rules when an unverified local account exists for a Google email | Pre-hijack fix design | A1, A5 | Rule |
| D-AUTH-3 | Should Google users' phone be OTP-verified? Is phone India-only? | Consistency; international users | A6 | Policy |
| D-AUTH-4 | Minimum age (code uses 10) and parental/age policy | Compliance | A6 | Value + legal check |
| D-AUTH-5 | Referral codes (field accepted but unused): implement or remove | Dead field | A1, A5 | Decide |
| D-AUTH-6 | Admin provisioning (seed with hard-coded email today), SUPERADMIN usage, user management UI | Operations/security | A9, D7 | Process |
| D-AUTH-7 | Token storage (localStorage vs cookies) and session length | XSS posture | A7 | Policy |

## 6. Database architecture

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-DB-1 | Is any MongoDB instance still in use anywhere? (Code has none; stale env keys remain) | Cleanup, cost | Darshan | Confirm retirement |
| D-DB-2 | Persist readings/AI chats/karma data server-side per user? Retention and deletion | Today only localStorage | B, C | Yes/no + policy |
| D-DB-3 | Production DB host/version/backups and migration state | Cannot be known from repo | all | Provide/confirm |
| D-DB-4 | Purge policy for OTP/reset tokens/sessions/unverified users | Growth, privacy | A | Policy |

## 7. External providers and subscriptions

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PROV-1 | One AI provider/model policy: OpenRouter (4 model IDs), Groq, or other; paid vs free tier | Reliability, cost; free/preview model IDs may vanish | B, C | Standardise |
| D-PROV-2 | Which accounts exist and are funded: OpenRouter, Groq, Sarvam, Resend (domain), MSG91 (DLT), Google OAuth, Cloudinary, YouTube quota | Nothing verifiable from the repo | all | Provide status |
| D-PROV-3 | Keep Sarvam for TTS? Cache audio? Keep browser `speechSynthesis` fallback? | Cost and UX | C3, C8 | Decide |
| D-PROV-4 | Geocoding: continue Nominatim from browsers or use a licensed provider (also needed for timezone) | Policy risk; needed for real charts | B3, B5 | Provider |
| D-PROV-5 | Real astrology API (the unmounted `astro-api` target) vs library | Dependency and licensing | B9 | Choice |

## 8. Deployment and operational ownership

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-OPS-1 | Where are frontend and backend hosted (Vercel/Render hints only), domains, environments (dev/staging/prod) | CORS, WebSub public URL, secrets | all | Provide |
| D-OPS-2 | Single always-on backend instance acceptable for Darshan? | Timers/SSE are in-process | E | Hosting model |
| D-OPS-3 | Monitoring, alerting, log retention, quota dashboards | None exist | all | Tooling |
| D-OPS-4 | Who owns the YouTube/Google Cloud project and key rotation | Operations | E | Owner |
| D-OPS-5 | Cleanup of stray repo files (root status docs, `darshan-live.txt`, `video.txt`, stray public copies) | Repo hygiene | – | Approve removal |

## 9. Privacy, security and compliance

| ID | Question | Why it matters | Modules | Decision needed |
|---|---|---|---|---|
| D-PRIV-1 | Personal data inventory (DOB, phone, city, palm images, journal text) and legal basis/consent | Compliance (jurisdiction unknown) | A, B, C | Policy |
| D-PRIV-2 | Sending user text/DOB to third-party LLMs: disclosure and retention terms | Privacy | B, C | Policy + vendor terms |
| D-PRIV-3 | Account/data deletion and export | `isDeleted` fields exist; no API | A | Build or not |
| D-PRIV-4 | Handling of crisis/self-harm/medical content in AI Guru | Safety | C | Guardrails |
| D-PRIV-5 | Rate-limit and abuse policy; CAPTCHA | Cost/security | A, B, C | Policy |
| D-PRIV-6 | Is the personal email in the admin seed intended? Rotate/remove? | Privacy hygiene | A9 | Confirm |
