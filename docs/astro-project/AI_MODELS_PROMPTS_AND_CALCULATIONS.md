# AI Models, Prompts and Calculations

Back to [README](README.md). Business rules/formulas in canonical form: [BUSINESS_RULES_AND_FORMULAS.md](BUSINESS_RULES_AND_FORMULAS.md). Per-feature behaviour: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md). Verified against source on 2026-10-19; **no model call was made** (no keys used, no provider contacted).

**Provenance legend:** LOCAL-CALC (deterministic code) · PSEUDO (hash/seeded value shown as a score) · LLM (non-reproducible generation) · STATIC (hard-coded) · MOCK (simulated).

> **Core finding.** There is **no astronomical calculation anywhere** (no ephemeris, ascendant, moon sign, houses, dashas, transits). Everything labelled "astrology" is a cutoff table, numerology arithmetic, a hash, a static list, or LLM text. Marketing copy on `/inner-voice` that mentions natal/transit/dasha computation has no code behind it — the LLM is asked to invent those values.

## 1. Model and provider register (as configured in source)

| # | Where (file) | Caller | Provider | Model ID | temp | max_tokens | Output handling |
|---|---|---|---|---|---|---|---|
| 1 | `services/chatgptService.ts#generateHumanReadableInterpretation` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 1500 | greedy `{…}` regex + `JSON.parse`; mock text **only on HTTP 402** |
| 2 | same `#generateDailyHoroscope` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.8 | 800 | raw text returned |
| 3 | same `#generateCompatibilityAnalysis` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 1000 | raw text |
| 4 | `controllers/chartChatController.ts` | backend | OpenRouter | `openai/gpt-4-turbo-preview` | 0.7 | 800 | text |
| 5 | `routes/birthChartRoutes.ts` `/analyze` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 1800 | strip ```` ```json ```` fences → `JSON.parse` (error → 500) |
| 6 | same `/chat` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 400 | text |
| 7 | `routes/compatibilityRoutes.ts` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 1200 | (endpoint unused) |
| 8 | `routes/nameAnalysisRoutes.ts` | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 900 | fence strip → `JSON.parse`; **any failure → `mockNarrative` with HTTP 200** |
| 9 | `routes/innerVoiceRoutes.ts` (`callAI`) | backend | OpenRouter | `google/gemma-4-31b-it:free` | default | 900 / 800 / 700 / 900 (diagnose / guru-chat / journal / wisdom) | regex-extract JSON (unused by UI) |
| 10 | `index.ts` `/api/tarot/reading` | backend | OpenRouter | `google/gemma-3-27b-it` | default | 2000 | first `{…}` match → `JSON.parse` |
| 11 | `index.ts` `/api/palm-reading` | backend | OpenRouter | `anthropic/claude-3.5-sonnet` (vision, `image_url` data-URI) | default | 3000 | first `{…}` match (unused by UI) |
| 12 | `pages/InnerVoiceChat.tsx` `callConsultation` | **browser** | Groq | `VITE_GROQ_MODEL` ‖ `openai/gpt-oss-120b` | 0.7 | 1000 | `response_format: json_object` |
| 13 | same `callDiagnosis` | browser | Groq | same | 0.6 | 4000 | json_object |
| 14 | `pages/InnerVoice.tsx` (hub: greeting/insights) | browser | Groq | same | 0.7 | 1500 | json_object |
| 15 | `pages/InnerVoiceDashboard.tsx` | browser | Groq | same | 0.7 | 1000 | json_object; hard-coded fallback on error |
| 16 | `pages/InnerVoiceJournal.tsx` | browser | Groq | same | 0.7 | per-call `maxTokens` | json_object (3 prompts: `DASH_SYSTEM`, `REFLECTION_SYSTEM`, `EOD_SYSTEM`) |
| 17 | `pages/InnerVoiceWisdom.tsx` | browser | Groq | same | 0.7 | 1500 | json_object |
| 18 | `components/VoiceConsultation.tsx` reply | browser | Groq | same | 0.75 | 380 | text → `transliterateToRoman` |
| 19 | same `translateText` | browser | Groq | same | 0.3 | 400 | text → transliterate |
| 20 | `index.ts` `/api/tts`, `routes/innerVoiceRoutes.ts` `/tts`, `api/tts.ts`, `frontend/api/tts.ts` | backend / Vercel fn | Sarvam AI | `bulbul:v3`, speaker `manan` | 0.4 | n/a (≤500 chars in; pace 0.85; 22 050 Hz) | `audios[0]` base64 WAV |
| 21 | `lib/palmAnalysis/handLandmarkDetector.ts` | browser | MediaPipe HandLandmarker (WASM + model fetched at runtime) | – | – | – | 21 landmarks; local ML, not an LLM |

Model availability on OpenRouter/Groq at run time is **[UNKNOWN]**; `gpt-4-turbo-preview`, `:free` variants and `gpt-oss-120b` IDs may be retired or rate-limited. Headers `HTTP-Referer` (`http://localhost:8081` or `https://spiritual-ai.app`) are hard-coded. OpenRouter `X-Title` values vary per route.

Common weaknesses (apply to every row): no schema validation of JSON (regex/`JSON.parse` only); user text interpolated directly into prompts (prompt-injection surface); no retry, no timeout on `fetch`/`axios` calls to OpenRouter (provider default), no caching, no token accounting; backend routes unauthenticated and unthrottled (cost-abuse surface); the Groq key is shipped to browsers.

## 2. Prompt catalogue

| Prompt | Location | Inputs interpolated | Output contract | Notes |
|---|---|---|---|---|
| Interpretation (system "friendly astrologer… valid JSON" + user) | `chatgptService.ts` L35–51 | `JSON.stringify(birthData)` | `summary, personality, strengths[], challenges[], compatibility, careerGuidance, lifeAdvice` | Input shape (`sign/moon/rising/planets/houses/aspects`) is never produced by any code |
| Daily horoscope | `chatgptService.ts` L129 | `sign` (unvalidated path param) | free text, 5 sections, Hinglish | **Date is not in the prompt** (response adds server date only) |
| Compatibility (sign1, sign2) | `chatgptService.ts` L183 | two sign strings | free text | unused route |
| Chart chat | `chartChatController.ts` | question + `birthData` | text | unused route |
| Birth chart analyze | `birthChartRoutes.ts` L19–73 | name, zodiac, lifePath, dob, place | JSON: `purpose, archetypes[3], powers[5], shadows[4], loveLanguage, relStyle, attachment, idealPartner, emotionalNeed, spiritMeaning[4], mustDo[5], mustAvoid[5]` | Persona "world-class vedic astrologer"; birth time/coords absent |
| Birth chart chat | `birthChartRoutes.ts` L114–129 | chartData fields + question | text, 4–6 sentences | unused |
| Name narrative | `nameAnalysisRoutes.ts` L69–95 | all computed numerology values + `topVariant` | JSON: `frictionExplanation, wealthPotential, relationshipEnergy, careerAlignment, remedies[4], signatureAnalysisNote, topVariantExplanation` | **Good practice present:** "use ONLY the numbers given", "possibility not guarantee" |
| Tarot timeline / karma | `index.ts` L359–405 | question, `cardList` (name/meaning/keywords), `cards[0..4].name` | timeline: 8 text fields + `probabilityScore` + `timelineNarrative[5]`; karma: texts + `energyScore, karmaBlockScore, spiritualGrowthScore` + `cardInsights[3]` | Prompt contains example numbers (78, 68, 72, 61) the model may copy; scores are LLM-invented |
| Palm vision | `index.ts` L464–508 | seed number, image | large JSON incl. `palmScore, confidence, mounts[].strength` | "seed ensures consistency" is **not enforceable** (no temperature/seed param set); example values embedded |
| Pandit consultation | `InnerVoiceChat.tsx` L31 (`PANDIT_CONSULTATION_SYSTEM`) | whole chat history | JSON incl. reply text, progress, `readyForDiagnosis` | Persona "Pandit Rameshwar Ji" |
| Pandit diagnosis | `InnerVoiceChat.tsx` L65 (`PANDIT_DIAGNOSIS_SYSTEM`) | transcript | big JSON (diagnosis, forecast, remedies, mantra, puja, gemstone, donations, timeline, karma score, planet dashboard) | Contains example 2025 dates |
| Voice persona | `VoiceConsultation.tsx` L145 (`VOICE_SYSTEM_PROMPT`) | history | spoken-style text; topic whitelist; language mirroring | Off-topic refusal is partly prompt-side, partly regex-side |
| Translation | `VoiceConsultation.tsx#translateText` | reply text, target language | translation only | Hindi forced to Roman script |
| Karma score | `InnerVoiceDashboard.tsx` L201 | name, sign, nakshatra, dasha, DOB, today | `{composite, natalBase(0–40), transitBonus(−20..+30), behaviorBase(0–30), scoreMessage, currentDasha, transitAlerts[], radarData[6]}` | Model asked to "calculate" — it cannot; values are invented |
| Journal / wisdom | `InnerVoiceJournal.tsx` L25–56; `InnerVoiceWisdom.tsx` | entries / situation | JSON (karma impact, affirmation; verse, transliteration, meaning) | Verse accuracy unchecked |

## 3. Local (non-LLM) logic

All formulas with variables, constants and clamps are in [BUSINESS_RULES_AND_FORMULAS.md](BUSINESS_RULES_AND_FORMULAS.md). Summary of what is genuinely deterministic:

| Logic | File / symbol | Class | Authentic astrology/numerology? |
|---|---|---|---|
| Sun-sign by date cutoffs | `lib/numerology.ts#zodiacFromDob`; `BirthChart.tsx#getZodiac`; `CompatibilityChecker.tsx` | LOCAL-CALC | Western tropical cutoffs only; year/time/ayanamsa ignored; **not** Vedic (sidereal) sign |
| Life path | `lib/numerology.ts#lifePathNumber` (keeps 11/22/33); `BirthChart.tsx#getLP` (keeps 11, 22 only) | LOCAL-CALC | Standard Pythagorean-style digit sum; two implementations disagree on 33 |
| Destiny / soul urge / personality / Chaldean / birth number | `lib/numerology.ts` | LOCAL-CALC | Conventional letter tables (see doc); Chaldean map as coded omits 9 (standard) |
| Name-vs-birth "alignment score" and variant ranking | `scoreNameAgainstProfile`, `rankNameVariants` | LOCAL-CALC | Product-defined weights, not doctrine; relationship matrix provenance unknown |
| Lucky numbers/colours/dates/handles | `luckyNumbers`, `LUCKY_COLOR_BY_NUMBER`, `luckyDates`, `digitalHandleSuggestions` | LOCAL-CALC + STATIC | Arbitrary mappings |
| Birth-chart score bars | `BirthChart.tsx#hash/dv` | **PSEUDO** | No |
| Compatibility scores | `CompatibilityChecker.tsx#deriveScore` | **PSEUDO** | No (sign and life path computed but unused) |
| Zodiac "daily" panel | `ZodiacDetail.tsx#generateDailyData`, `getDailySeed` | **PSEUDO** | No (seeded picks; no planetary positions) |
| Palm metrics | `lib/palmAnalysis/*` | LOCAL-CALC over **template** curves | No (not crease detection) |
| Karma composite | `InnerVoiceDashboard.tsx` | LOCAL-CALC over LLM numbers | Partly |
| Tarot deck | `data/tarotData.ts` + `shuffleDeck` | STATIC + client RNG | Card meanings static |

Which inputs actually influence results:

| Input | Birth chart | Compatibility | Name report | Tarot | Palm | Daily horoscope |
|---|---|---|---|---|---|---|
| Name | hash seed + prompt | hash seed | numerology letters | – | – | – |
| DOB (date) | sign cutoff, life path, hash | hash seed (sign/LP unused) | life path/birth number | – | – | – |
| Birth time | **ignored** | **ignored** | – | – | – | – |
| Birth place | city string → prompt only | ignored | – | – | – | – |
| Today's date | – | – | – | – | – | server date label only |
| Sign | – | – | – | – | – | prompt |

## 4. Determinism and reproducibility

* Deterministic: numerology, sun-sign cutoffs, birth-chart scores for the same name+DOB, compatibility scores for the same names+DOBs, zodiac daily panel for the same sign+calendar day, karma composite given its inputs.
* Non-deterministic: every LLM output; `Math.random` in the Zodiac spin-wheel, tarot shuffle, OTP generation, palm endpoint seed fallback.
* Cross-session: nothing is cached or stored server-side; reloading regenerates.

## 5. Fallback behaviour matrix

| Feature | Failure | User-visible result |
|---|---|---|
| Daily horoscope | missing key / provider error | HTTP 500 → "Failed to generate horoscope" |
| Interpretation birth-chart | HTTP 402 only | canned text (other errors → 500) |
| Birth-chart analyze | any | UI swallows error, renders static dictionaries + pseudo scores |
| Name narrative | any (key missing, provider error, bad JSON, exception) | `mockNarrative` templated text, **HTTP 200, indistinguishable** |
| Tarot | any | `generateFallbackReading` (STATIC) |
| Consultation JSON parse failure | bad JSON | canned greeting; network error → apology bubble |
| Diagnosis | bad JSON | `null` report |
| Karma dashboard | error | hard-coded composite 62 data shown as normal |
| Voice TTS | Sarvam error | falls back / silent [exact wiring of `useTextToSpeech` fallback not traced — UNKNOWN] |

## 6. Cost, quota and privacy considerations (from implementation)

* Public AI/TTS/palm endpoints can be called by anyone: free-tier model IDs hit provider rate limits; paid IDs (`gpt-4-turbo-preview`, `claude-3.5-sonnet`) spend credit. Palm accepts up to the 20 MB JSON body limit.
* Groq calls are billed/limited to the account of the key embedded in the JS bundle; anyone can extract and reuse it.
* Personal data (names, DOB, birthplace, free-text life problems, voice transcripts, journal text) is sent to third-party LLMs; no consent text or retention policy exists in code [UI copy not exhaustively audited]. Inner-voice data also persists in `localStorage` in clear text.
* TTS text (≤500 chars) goes to Sarvam.
* No content-safety layer: no crisis/medical/financial-advice handling, the diagnosis prompt asks for puja/gemstone costs and donations.

## 7. How to verify safely

1. Use throwaway keys with spend caps; never the production key.
2. Mock `fetch`/`axios` for contract tests (valid JSON, fenced JSON, prose + JSON, invalid JSON, 402/429/timeout).
3. Golden-fixture tests for `lib/numerology.ts` (see [TESTING_AND_ACCEPTANCE_CRITERIA.md](TESTING_AND_ACCEPTANCE_CRITERIA.md)).
4. Confirm each model ID exists via the provider's model list **before** assuming it works.

## 8. Unknowns requiring accounts or a live environment

Model availability and latency; actual JSON compliance rate of `gemma-*` free models; Sarvam voice quality/quota; whether `response_format: json_object` is honoured for the configured Groq model; MediaPipe CDN availability from production origin.
