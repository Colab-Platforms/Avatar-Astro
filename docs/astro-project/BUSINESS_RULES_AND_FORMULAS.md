# Business Rules and Formulas

Canonical location for every constant, threshold, formula and rule found in code. Narrative per feature: [FEATURE_LOGIC_REFERENCE.md](FEATURE_LOGIC_REFERENCE.md); AI specifics: [AI_MODELS_PROMPTS_AND_CALCULATIONS.md](AI_MODELS_PROMPTS_AND_CALCULATIONS.md). Verified by reading source on 2026-10-19; nothing executed at runtime. Paths: `backend/src/…`, `frontend/src/…`.

## 1. Authentication and sessions (`modules/auth/auth.service.ts`, `auth.validators.ts`)

| Rule | Value | Symbol |
|---|---|---|
| Access token | JWT `{id, role}`, expiry `"1d"` | `ACCESS_TOKEN_TTL` |
| Refresh token | 32 random bytes hex; SHA-256 stored; 30 days; rotated each use | `REFRESH_TOKEN_TTL_DAYS = 30` |
| OTP | `Math.floor(100000 + Math.random()*900000)` (6 digits), SHA-256 stored, expiry 10 min, single use | `generateOtp` |
| OTP resend cooldown | reject if an OTP was created < 60 s ago (HTTP 429) | `resendOtp` |
| Password reset token | 32 random bytes hex, **plaintext in DB**, 1 h, single use | `forgotPassword` |
| Password policy | ≥ 8 chars, lower + upper + digit | `auth.validators.ts` |
| Phone | `^[6-9]\d{9}$` (India mobile) | validators |
| bcrypt cost | 8 | `utils/auth.ts` |
| Minimum age (Google profile) | 10 years (`MIN_PROFILE_AGE_YEARS`) | `completeProfile` |
| Role hierarchy | USER ⊂ ADMIN ⊂ SUPERADMIN; token role used | `middleware/authMiddleware.ts` |
| Login order | email lookup → password check → `isActive` → verification state | `login` |
| Unverified login | invalidate old LOGIN OTPs, issue + email new OTP, return `{requiresVerification:true}` | `login` |
| Registration duplicate rule | verified (email or phone) → 409; unverified → overwritten; phone used by other active user → 409 | `register` |

## 2. Name Destiny numerology (`lib/numerology.ts`)

Letters: `cleanName` = uppercase, drop everything except `A–Z`.

**Reduction** `reduceNumber(n, keepMaster=true)`: while `n > 9` and not (`keepMaster` and `n ∈ {11,22,33}`): `n ← digitSum(n)`.

| Quantity | Formula |
|---|---|
| Destiny (Expression) | `reduce(Σ PYTH[c])` over all letters |
| Soul urge | same over vowels `A,E,I,O,U` |
| Personality | same over consonants |
| Chaldean name number | `reduce(Σ CHALDEAN[c])` |
| Life path | digits of DOB string (non-digits removed) summed, then `reduce` |
| Birth number | `reduce(day-of-month)` (3rd `-` part; falls back to 1st) |
| Planet of number | table: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars, 11 Moon, 22 Saturn, 33 Jupiter |
| Planet compatibility `(a,b)` | a = b → 92 friendly; b ∈ friends(a) → 82 friendly; b ∈ enemies(a) → 38 friction; else 60 neutral (matrix `PLANET_RELATIONSHIPS`, source of matrix UNKNOWN) |

Tables: `PYTHAGOREAN_MAP` A,J,S=1 · B,K,T=2 · C,L,U=3 · D,M,V=4 · E,N,W=5 · F,O,X=6 · G,P,Y=7 · H,Q,Z=8 · I,R=9. `CHALDEAN_MAP` A,I,J,Q,Y=1 · B,K,R=2 · C,G,L,S=3 · D,M,T=4 · E,H,N,X=5 · U,V,W=6 · O,Z=7 · F,P=8.

**Overall alignment score** (`scoreNameAgainstProfile.overallScore`):

```
lifePathCompat  = planetCompatibility(destinyPlanet, lifePathPlanet).score      // 38|60|82|92
chaldeanFav     = 90 if chaldean ∈ {1,3,5,6}; 55 if ∈ {2,9}; else 70
vowelRatio      = vowels / letters   (0.4 if no letters)
balanceScore    = clamp(0,100, 100 − |vowelRatio − 0.4| × 150)
syllablePenalty = −8 if letters > 14; −3 if letters > 10; else 0
overall         = clamp(0,100, round(0.4·lifePathCompat + 0.3·chaldeanFav + 0.2·balanceScore + 0.1·70 + syllablePenalty))
```

Worked example (inputs chosen to be checkable by hand, **not run**): name "ARUN", DOB 1990-05-14. Letters A,R,U,N → Pythagorean 1+9+3+5 = 18 → 9 (Mars). Chaldean 1+2+6+5 = 14 → 5 → favourable (90). DOB digits 1+9+9+0+0+5+1+4 = 29 → 11 (master, kept) → Moon. Lookup is `PLANET_RELATIONSHIPS[Mars]` → friends Sun, Moon, Jupiter → Moon is a friend → 82. Vowels A,U = 2 of 4 → ratio 0.5 → balance = 100 − 0.1×150 = 85. Letters 4 → penalty 0. overall = round(0.4·82 + 0.3·90 + 0.2·85 + 7) = round(32.8 + 27 + 17 + 7) = **84**.

**Variants** `generateNameVariants(name, 12)` (first word only): double each letter position; phonetic swaps k↔c, i↔y, s↔z; append one of `a,e,h,s,r`; drop trailing vowel or add `a`; de-duplicate; remove original; cap 12. `rankNameVariants` scores each, `diff = variantScore − baseScore`, deltas `career = round(0.9·diff)`, `business = round(1.1·diff)`, `wealth = round(0.8·diff)`, `relationship = round(0.6·diff)`, returns top 5 by score. Multipliers are product constants.

Lucky values: `luckyNumbers = unique{destiny, lifePath, reduce(destiny+lifePath,false), reduce(2·destiny,false)}` (first 4); `luckyDates = {b, b+9, b+18, b+27}` ∩ [1,31], `b = lifePath` (9 if 0); handle suggestion = first 8 letters + destiny.

Limitations: non A–Z characters (Devanagari, accents) are dropped silently; empty name gives destiny 0; weights untested against any reference; two other life-path implementations exist (see §3).

## 3. Birth Chart page (`pages/BirthChart.tsx`)

| Item | Rule |
|---|---|
| `getZodiac(day, month)` | cutoff table: Capricorn ≤ Jan 19, Aquarius ≤ Feb 18, Pisces ≤ Mar 20, Aries ≤ Apr 19, Taurus ≤ May 20, Gemini ≤ Jun 20, Cancer ≤ Jul 22, Leo ≤ Aug 22, Virgo ≤ Sep 22, Libra ≤ Oct 22, Scorpio ≤ Nov 21, Sagittarius ≤ Dec 21, else Capricorn |
| `getLP(dob)` | digit sum of `YYYY-MM-DD`, reduce while > 9 and ∉ {11, 22} (33 not preserved) |
| `hash(s)` | `s.split('').reduce((a,c)=>(a*31 + code)&0xffff, 0)` |
| `base` | `62 + hash(name+dob) % 30` (62–91) |
| `dv(base, seed, lo=55, hi=98)` | `clamp(lo,hi, base + hash(seed)%22 − 11)` |
| Delay | fixed 5.6 s `setTimeout` before results regardless of API |
| Request | `{name, zodiac, lifePath, dob, place(city)}` — **no time, no coordinates** |

## 4. Compatibility page (`pages/CompatibilityChecker.tsx`)

```
seed    = name1 + name2 + dob1 + dob2
base    = 60 + hash(seed) % 35                                   // 60–94
score_t = clamp(52, 99, base + (Σ charCode(name1+name2+tag) % 20) − 10)   // t ∈ love, emotional, physical, friendship, marriage, financial, family, spiritual
overall = min(99, base + 5)
```
"Who loves more": person-1 weighted sum `0.35·emotional + 0.25·love + 0.2·friendship + 0.2·marriage`; person-2 `0.35·spiritual + 0.25·physical + 0.2·family + 0.2·financial` (compare). Zodiac cutoffs and life path are computed but **not used** by any score. Chat answers: keyword-matched canned strings after a 900 ms timer.

## 5. Zodiac "daily" panel (`pages/ZodiacDetail.tsx`)

`getDailySeed(sign) = (YYYY·10000 + MM·100 + DD)·1000 + Σ charCode(sign)`; `rng(seed)` is a seeded PRNG; lucky colour/number/gemstone/direction, moon phase, planets, mood, challenge, compatible signs are picked from hard-coded arrays. Same sign + same calendar day (browser local date) ⇒ same output. Not astronomical.

## 6. Karma score (`pages/InnerVoiceDashboard.tsx`)

```
behaviorPts = Σ pts of ticked daily ACTIONS          // ACTIONS total = 68
composite   = min(100, natalBase + transitBonus + round(behaviorPts / 68 × behaviorBase))
```
`natalBase` (prompted 0–40), `transitBonus` (−20…+30), `behaviorBase` (0–30) come from the LLM. There is **no lower clamp**, so a negative composite is possible if the model returns low `natalBase` with a negative `transitBonus` [inferred from code; not observed]. Error fallback: `composite 62`, `natalBase 28`, `transitBonus 5`, `behaviorBase 29`. History: newest first, one entry per date, max 60, key `iv_karma_v2`; chart shows last 14.

## 7. Palm reading (`lib/palmAnalysis/*`, `pages/PalmReading.tsx`)

Quality gates, evaluated in this order (`engine.ts#checkQuality`): no landmarks → `no_hand_detected`; `landmarks.confidence < 0.55` → `low_confidence`; blur score fails (`BLUR_VARIANCE_THRESHOLD = 45`, Laplacian-style variance in `imagePreprocessing.ts`) → `too_blurry`; hand bounding box < `MIN_HAND_FRACTION_OF_FRAME = 0.12` of the frame → `hand_too_small`. Images are downscaled to `MAX_WORKING_DIM = 960` px. Then landmark-anchored template curves; example metric rules: love `clamp(35,98, 55 + curviness(heart)·22)`, career `55 + curviness(fate)·18`, health `55 + curviness(life)·20`. Result text is canned.

## 8. Catalogue and admin rules (`modules/{puja,chadhawa,shop}`)

| Rule | Value |
|---|---|
| Temple slug | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 120; unique (409) |
| Temple fields | name ≤ 150, location ≤ 150, state ≤ 100, deity ≤ 150, description ≤ 2000, `priceFrom` ≥ 0, gradient ≤ 300 |
| Puja | price ≥ 0, duration ≤ 60, benefits 1–20 items ≤ 200 chars |
| Admin list | `limit` ≤ 100 |
| Chadhawa | price integer > 0, description ≤ 1000, emoji ≤ 16, `displayOrder` 0–9999 (default = next), name unique per temple |
| Shop product | price ≥ 1, `originalPrice` ≥ 1 or null (no check `> price`), benefits 1–20, description ≤ 2000, authenticity ≤ 300, slug unique |
| Shop category | name & slug unique; delete blocked (409) while products exist (also DB `Restrict`) |
| Public visibility | temples: all; chadhawa: temples with ≥ 1 active offering; shop: active product in active category |
| Uploads | MIME ∈ JPEG/PNG/WebP/AVIF (client-declared), ≤ 10 MB, ≤ 10 files/request |
| Image deletion | remote Cloudinary delete must succeed before DB row removal (images); temple delete reports `orphanedImages` |
| Display-only maths | puja total `price × qty`; chadhawa `Σ price × qty` (no server counterpart) |

## 9. Live Darshan (`modules/darshan/*`)

| Rule | Value |
|---|---|
| WebSub lease | 4 days (`LEASE_SECONDS`); renewal interval = lease − 1 day = **3 days** |
| Live definition | `liveBroadcastContent === "live"` **and** `embeddable !== false` |
| Safety poll | every `DARSHAN_LIVE_CHECK_INTERVAL_SECONDS` (default 120) for channels with `isLive && currentLiveVideoId` |
| Quota cost | code comments assume 1 unit per `videos.list` call (Google quota table not verified) |
| SSE heartbeat | 30 s |
| Channels | 18 in `config/temples.json`; 4 without channel ID (mahakaleshwar, trimbakeshwar, ramanathaswamy, jwala-ji) are never subscribed |
| Embed retries (client) | error codes 101/150 treated as embedding disabled |

## 10. Platform

* JSON body limit 20 MB; CORS allowlist (7 explicit origins + localhost/LAN regex + `CORS_ORIGIN`), rejection → HTTP 500.
* TTS: input truncated to 500 chars; `language` startsWith `en` → `en-IN` else `hi-IN`.
* Client React Query `staleTime` 60 s for catalogues; Darshan `Infinity` (patched by SSE).
* Client refresh: single in-flight refresh deduplicated; retry once on 401.
