# Bhagya multilingual coverage

Generated from `npm run i18n:audit` (heuristic scan of the source for user-facing English that bypasses the translation system) and
`npm run i18n:report` (dictionary completeness). Re-run both to refresh. **Status: PARTIAL. The website is not fully multilingual.**
All non-English translations are AI-written DRAFTS. Nothing has been reviewed by a named reviewer.

## 1. What is translated and verified (all ten languages, draft)

| Area | Status |
|---|---|
| Central system: i18next, selector, `mybhagya_lang` persistence, fonts (Noto per script), glossary (164 calculated-term names) | Done |
| Navbar, hero, homepage sections, footer brand | Done (homepage long-form body/FAQ answers still English) |
| Baby Name Jyotish, Lucky Vehicle Number, Muhurat Finder (interface) | Done; engine-written explanation sentences still English |
| Divya Margdarshak chat (interface + AI replies + retry/validation) | Done |
| Voice Consultation (interface + AI replies + speech in/out + language requests) | Done |
| Batch 1 — Birth Chart, chart interpretation + chart chat (AI language guard), Compatibility, Kundali panels/guide/growth guide, Guna Milan interface, Zodiac and Daily Horoscope screens (interface only; stored reading stays English) | Done (draft); FAQ blocks, audio player and feature-catalog hero subtitles on these pages are still English; backend-supplied Guna Milan notes/doshas stay English |
| Dictionaries: 2,233 interface strings + 164 glossary names per language, 0 missing, 0 placeholder mismatches | Done (draft) |

## 2. What is NOT translated (heuristic count of hardcoded user-facing English)

| Area | Source files | Files using i18n | Files with English | Candidate strings |
|---|---:|---:|---:|---:|
| Shop, blog, about, contact, FAQ, static content | 27 | 0 | 22 | 365 |
| Tarot, palm, face, name analysis, gemstone (Ratna), numerology | 46 | 0 | 31 | 332 |
| Admin panel (staff-only) | 39 | 0 | 27 | 324 |
| Kundali, birth chart, compatibility, horoscope, zodiac | 24 | 0 | 17 | 321 |
| Astrology audio, Live Darshan, books, devotion, puja, chadhawa | 51 | 0 | 27 | 320 |
| Inner Voice: Divya Margdarshak, Voice, Karma, Bhavishya Marg, Shloka | 38 | 11 | 19 | 208 |
| Auth, profile, dashboard, account | 38 | 0 | 22 | 192 |
| Astrologer application and listing | 24 | 0 | 15 | 155 |
| Other | 115 | 9 | 25 | 73 |
| Astro Seva: Baby Name, Vehicle, Muhurat | 35 | 16 | 6 | 56 |
| Main website: navbar, footer, home, layout | 20 | 13 | 6 | 28 |

**Total: 2374 candidate strings in 217 of 457 source files.** (Counts include some false positives and miss long-form
content stored in data files; treat them as a ranking, not an exact figure.) Admin screens are staff-only and are the lowest priority.

Largest files still in English:

| Strings | i18n | File |
|---:|---|---|
| 116 | no | `data/featureFaqs.ts` |
| 98 | no | `pages/CompatibilityChecker.tsx` |
| 97 | no | `pages/BirthChart.tsx` |
| 60 | no | `features/dashboard/library/pages.tsx` |
| 53 | no | `data/liveStreams.ts` |
| 53 | no | `pages/Chadhawa/ChadhawaDetail.tsx` |
| 47 | partly | `pages/InnerVoiceChat.tsx` |
| 43 | no | `features/admin/panel/pages/ReportsPage.tsx` |
| 41 | no | `data/temples.ts` |
| 38 | no | `features/admin/panel/pages/CustomerDetailPage.tsx` |
| 37 | no | `features/astrologer/pages/ApplicationWizardPage.tsx` |
| 37 | no | `pages/InnerVoiceDashboard.tsx` |
| 33 | no | `features/muhurat/events.ts` |
| 32 | no | `components/tarot/TarotReadingResult.tsx` |
| 31 | no | `components/tarot/TarotLandingScene.tsx` |
| 31 | no | `pages/PalmReading.tsx` |
| 28 | no | `features/dashboard/DashboardLayout.tsx` |
| 28 | no | `pages/FutureLifePath.tsx` |
| 27 | no | `data/featureCatalog.ts` |
| 27 | no | `pages/Puja/PujaDetail.tsx` |
| 26 | no | `data/products.ts` |
| 26 | no | `features/admin/components/AdminSidebar.tsx` |
| 24 | no | `features/admin/panel/CostAnalytics.tsx` |
| 23 | no | `components/NameDestinyReport/index.tsx` |
| 22 | no | `features/admin/panel/pages/AdminsPage.tsx` |
| 22 | no | `pages/AvatarLive/index.tsx` |
| 21 | no | `features/admin/pages/Dashboard.tsx` |
| 21 | no | `features/astrologer/pages/BecomeAstrologerPage.tsx` |
| 21 | no | `features/kundali/GunaMilanPanel.tsx` |
| 21 | no | `pages/InnerVoiceWisdom.tsx` |
| 20 | no | `features/admin/astrologers/pages/AstrologerApplicationDetailPage.tsx` |
| 20 | no | `lib/karmaScore.ts` |
| 19 | no | `features/admin/pages/DevotionLibrary.tsx` |
| 19 | no | `features/admin/panel/FeatureCostBreakdown.tsx` |
| 19 | no | `features/admin/panel/pages/AstrologyAudioPage.tsx` |
| 19 | no | `features/dashboard/DashboardPages.tsx` |
| 18 | no | `features/admin/panel/pages/ActivityPage.tsx` |
| 18 | no | `features/ratna/ResultView.tsx` |
| 17 | no | `data/tarotData.ts` |
| 17 | no | `pages/Puja/index.tsx` |

## 3. AI routes (backend)

| Route | Language sent | Language instruction | Output checked + retried once | Notes |
|---|---|---|---|---|
| `/api/ai/chat` proxy (AI Guru, Shloka, Karma, guru report) | opt-in per caller | yes | caller-side (Guru, Voice) | Karma and Know Your Karma still use their own en/hi/Hinglish selector |
| `/api/inner-voice/diagnose, guru-chat, analyze-journal, wisdom` | yes (header) | yes | **yes (new)** | |
| `/api/inner-voice/life-path` (Bhavishya Marg) | yes | yes | yes + calendar-term guard | the calculated "meaning" text is built in English by the server |
| `/api/tarot/reading` | yes | yes | **yes (new)** | |
| `/api/interpretation/*`, chart chat, compatibility, birthchart, name analysis | yes | yes | not yet | wiring is mechanical; same helper |
| Palm reading (`/api/palm-reading`) | no | no | no | the page reads fixed English values ("Earth Hand", "Deep"); needs enum mapping first |
| Daily horoscope | no | no | no | one reading is stored per sign per day in the database: a per-language reading needs a schema decision (migration) |
| Gemstone explanation | no | no | no | its validator is English-only (planet/sign names); non-English output would fall back to rule-based English text |
| Chat screening classifier | n/a | n/a | n/a | fixed replies are translated in the Guru chat; other pages are not |

Shared helper: `backend/src/utils/responseLanguage.ts` (`generateInLanguage`, `replyIsInLanguage`, `WrongLanguageError`).
Face reading: no such feature exists in the codebase (only a mention in astrologer expertise lists).

## 4. Reports, audio, saved content, special cases

| Item | Status |
|---|---|
| PDF reports (Name Destiny report, Guru diagnosis report) | English. The PDF library cannot draw Indic scripts without embedding fonts: separate piece of work |
| Astrology audio narration | Existing admin-managed multi-language narration; not part of the interface language system |
| Daily horoscope stored once per day | English only (see above) |
| Previously saved readings / chat history | Kept as written; never rewritten on language change (verified for the Guru and Voice chats) |
| Emails and notifications (backend mailer) | English; brand text changed to Bhagya only |
| Backend error messages (about 95 fixed strings) | English; the AI routes now return a `code` (`wrong_language`) a page can translate, but most pages still show the server text |
| Admin-managed and API content (blog posts, shop products, astrologers) | As authored |

## 5. Not yet done
Almost everything in section 2. Converting a page means replacing its literals with dictionary keys in all ten languages; the audit
list above is the work queue, in priority order. Calculations, IDs and database values are not touched by any of this.
