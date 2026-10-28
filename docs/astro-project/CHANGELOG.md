# Documentation Changelog

Changes to **this documentation package** (not the application). Application history is in git (`git log`). Feature IDs are never renumbered; additions get a new ID with a suffix letter (e.g. `B6b`) and are listed here.

## 2026-10-19 — Second pass: completion to the 22-document package

Basis: branch `dev-vishwa`, commit `58a6f0e`, working tree with untracked `docs/` and `package-lock.json`.

**Added (8 documents)**
* [PROJECT_FILE_AND_MODULE_INVENTORY.md](PROJECT_FILE_AND_MODULE_INVENTORY.md)
* [USER_FLOWS_AND_USE_CASES.md](USER_FLOWS_AND_USE_CASES.md)
* [BUSINESS_RULES_AND_FORMULAS.md](BUSINESS_RULES_AND_FORMULAS.md)
* [DATABASE_AND_MIGRATION_GUIDE.md](DATABASE_AND_MIGRATION_GUIDE.md)
* [AI_MODELS_PROMPTS_AND_CALCULATIONS.md](AI_MODELS_PROMPTS_AND_CALCULATIONS.md)
* [ADMIN_AND_OPERATIONS_GUIDE.md](ADMIN_AND_OPERATIONS_GUIDE.md)
* [LOCAL_DEVELOPMENT_SETUP.md](LOCAL_DEVELOPMENT_SETUP.md)
* CHANGELOG.md (this file)

**Verified against source and left unchanged:** the 14 existing documents' statements about numerology formulas, model IDs and parameters, Darshan timings (lease 4 d, renewal 3 d, poll 120 s), auth TTLs (access 1 d, refresh 30 d, OTP 10 min, resend 60 s, reset 1 h), mounted routes, TTS parameters, migrations (5) and tables (13).

**Corrected / clarified in existing documents**
* [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) A4: the previously "[UNKNOWN]" front-end handling of `requiresVerification` is now confirmed — `LoginPage` navigates to `/verify-otp` with `{email, type:"LOGIN"}`.
* [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md) C4: composite has no lower clamp (only `min(100, …)`); LLM-prompted ranges added.
* [README.md](README.md): document table now lists all 22 files; verification table updated.
* New findings recorded in [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md) (section "Added in second pass").

**Checks actually executed (read-only)**
| Check | Result |
|---|---|
| `tsc --noEmit` (backend) | exit 0 |
| `tsc -p tsconfig.app.json --noEmit` (frontend) | 40 errors |
| `vitest run` (frontend) | 1 test passed |
| Static dead-code scan (filename-import heuristic) | list in [PROJECT_FILE_AND_MODULE_INVENTORY.md §4.1](PROJECT_FILE_AND_MODULE_INVENTORY.md) |
| Link and secret scan of `docs/astro-project/*.md` | see final report in the delivery message |

**Not done (by design or limitation):** no server, database, browser, provider or paid API was run; no migrations/seeds executed; application code untouched; nothing committed or pushed.

## Earlier — first pass (investigation report, 13 sections, 54 features)
Created the 14 documents: README, PROJECT_ARCHITECTURE, FEATURE_CATALOG, FEATURE_LOGIC_REFERENCE, FRONTEND_REFERENCE, BACKEND_API_REFERENCE, DATABASE_AND_DATA_MODELS, INTEGRATIONS_AND_ENVIRONMENT, AUTHENTICATION_AND_SECURITY, INTEGRATION_AND_DATA_FLOW_DIAGRAMS, KNOWN_ISSUES_AND_TECHNICAL_DEBT, TESTING_AND_ACCEPTANCE_CRITERIA, PRODUCT_DECISIONS_AND_OPEN_QUESTIONS, RESTART_ROADMAP.

## ID convention for future additions
Existing IDs (A1–A9, B1–B9 incl. B6b, B8b, B9a, B9b, C1–C8, D1–D11, E1–E8, F1–F6) are frozen. New features: next free number in the area (e.g. `D12`); sub-aspects of an existing feature: letter suffix. Use cases are `UC-nn` ([USER_FLOWS_AND_USE_CASES.md](USER_FLOWS_AND_USE_CASES.md)); known issues keep the IDs used in [KNOWN_ISSUES_AND_TECHNICAL_DEBT.md](KNOWN_ISSUES_AND_TECHNICAL_DEBT.md).
