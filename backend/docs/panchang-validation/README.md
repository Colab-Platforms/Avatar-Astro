# Panchang validation

The Panchang engine (`src/modules/gemstone/panchang.ts`, `chart.engine.ts`) was **not modified** for this
validation, and no tolerance or expected value was tuned to make a check pass.

There are two separate bodies of evidence. They are not combined into one figure.

## 1. Existing festival check: 67 / 67 (weaker evidence)

- Script: `scripts/panchang-check.ts` (unchanged). Full record of every case, expected and actual:
  `festival-67.json`, produced by `scripts/panchang-record.ts`.
- 10 festivals, 2019 to 2025, New Delhi (Asia/Kolkata). Pass = the expected Amanta month, Paksha and tithi is
  running at sunrise, noon, sunset, two hours after sunset or 23:30 on the published civil date.
- **Limits of this evidence:** the festival dates were recalled by the author, not read from an official source.
  A tithi lasts about a day, so "runs at one of five times on that date" is a lenient test. It validates month,
  Paksha, tithi and Adhika handling, not exact times. Delhi only.

## 2. Independent reference: Drik Panchang (stronger evidence)

- Source: Drik Panchang daily pages, `https://www.drikpanchang.com/panchang/day-panchang.html`, read on
  2026-10-31. Each case in `src/modules/gemstone/__tests__/panchang.reference.data.ts` records the exact page
  URL, city, coordinates, time zone (Asia/Kolkata for all), date and the values printed on the page.
- 18 pages: New Delhi (9), Mumbai (3), Chennai (2), Kolkata (2), Bengaluru (1). Results in
  `reference-results.json`. Run `npx tsx scripts/panchang-reference-report.ts`.
- Drik prints **end** times only, so 81 end times were compared: 17 tithi, 14 nakshatra, 17 yoga, 33 karana.
  21 of them fall after midnight. Also compared per day: Amanta and Purnimanta month, Adhika flag, Paksha,
  Vikram Samvat, sunrise and sunset (102 checks).
- Cases chosen on purpose: Vikram Samvat 2081 to 2082 (29 and 30 March 2025) and the 2082 to 2083 change
  (Mumbai, 19 March 2026); Adhika Shravana 2023 and its end (18 July and 17 August 2023); Adhika Jyeshtha 2026;
  days around Mesha, Makar and Karka Sankranti; Maha Shivaratri night; end times after midnight.

| Result | Value |
|---|---|
| End times within 3 minutes (tolerance fixed before the first run) | 81 of 81 |
| Largest difference | 1.9 minutes |
| Median / 90th percentile | 1.0 / 1.5 minutes |
| Month (both systems), Adhika, Paksha, sunrise, sunset (within 2 min) | 101 of 102 |
| The one difference | Vikram Samvat on 19 March 2026, Mumbai: Drik 2083, engine 2082 |

**The one difference is a convention, not an arithmetic error.** Chaitra Shukla Pratipada began at 06:52, eight
minutes after the 06:44 sunrise. The engine reckons the Panchang at sunrise, when it was still Amavasya, so it
still reports the old year; Drik shows the new year for the day on which Pratipada begins.

**Small systematic offsets** (not tuned away): the engine's tithi and karana end times run about 1.0 minute
later than Drik's, yoga about 1.3 minutes earlier, nakshatra about 0.3 minutes earlier. The yoga offset is
consistent with a small ayanamsa difference (see below).

## What this does and does not support

- It supports: the engine reproduces Drik Panchang tithi, nakshatra, yoga and karana end times to about
  2 minutes, and the month, Paksha, Adhika and Vikram Samvat data, for the 18 days and 5 cities tested.
- It does **not** support a claim of "99% accuracy" as a population statement. 18 days, one source, five cities
  and a handful of years is not a statistically meaningful sample of all dates and places. The honest summary is
  "agreed with Drik Panchang on every sampled item, to within 2 minutes".
- The reference data was transcribed by a reading tool from the page text and was not independently re-keyed.
- Drik is itself a computed almanac, not a ground truth. Agreement with it shows consistency with the most widely
  used published convention, not absolute astronomical truth.
- Pages for non-Delhi cities used standard city-centre coordinates, not Drik's printed ones.
- Nakshatra start times, and tithi, yoga and karana start times, were not compared because Drik prints end times
  only; a start time equals the previous item's end time.
- Sankranti was covered only as nearby days. The exact Sun-ingress instants were not compared.

## Known limitations of the engine

1. **Kshaya months** (a lunar month with two Sankrantis) are not modelled. The last was in 1963 and the next is
   far off, but dates in such a month would be wrong.
2. **Mean Lahiri ayanamsa.** The engine uses the mean value (23.85306° at J2000 plus general precession), about
   0.01° from some published "true" Lahiri values. That moves a moon-driven boundary by about a minute (see the
   yoga offset) and could change a Sankranti-day month decision that falls within minutes of a new moon.
3. **Regional conventions.** The default is Amanta months with a Chaitra new year (Chaitradi Vikram Samvat). The
   Purnimanta name is also returned. Kartikadi (Gujarat) years, Tamil, Bengali and Malayalam solar calendars, and
   regional rules for which day a festival falls on are not provided.
4. **Vikram Samvat is reckoned at sunrise**, so on the day Chaitra Shukla Pratipada begins after sunrise the engine
   reports the old year (the Mumbai 2026 case above).
5. **Unknown birth time:** the Panchang is reckoned at sunrise and items that change during the day are flagged
   uncertain.
6. **Sunrise and sunset** use the astronomical rise and set of the Sun's upper limb at sea level. They agreed with
   Drik within 1 minute in 34 comparisons, but elevation is not applied.
7. Rahu and Ketu are the mean lunar nodes.
