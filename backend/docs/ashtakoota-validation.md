# Ashtakoota (Guna Milan): comparison and conventions

**Scope of this document.** It records how this engine's scores compare with one open-source implementation and lists every convention choice. It does **not** claim that this tool matches, or is certified against, any external calculator. Published Guna Milan tables differ from each other, so scores from different calculators can legitimately differ. The agreed conventions below are this tool's own and have not been reviewed by a qualified Jyotish practitioner.

Engine: `src/modules/gemstone/ashtakoota.ts`. Comparison source: **PyJHora 4.8.7** (open source), North-Indian method.

## How it was compared

PyJHora ships a precomputed database of all 11,664 combinations (27 Nakshatras x 4 padas, boy x girl) with the score of each Koota
(`horoscope/match/all_nak_pad_boy_girl.csv`). Each combination was converted to a Moon longitude, scored by this engine
(first person = boy, second = girl) and compared Koota by Koota. The PyJHora code itself was **not executed**; its CSV and its tables
were read as data. The comparison script is not committed (the CSV is third-party data).

## Result (final comparison run)

| Koota | Pairs differing (of 11,664) | Verdict |
|---|---|---|
| Graha Maitri | 0 | Identical. |
| Nadi | 0 | Identical. |
| Yoni | 0 | Identical. The first version used a simplified grading; it was replaced by the full 14x14 grid, which matches this source on every pair. |
| Bhakoot | 81 | Reference bug. PyJHora's grid is asymmetric for Cancer/Aquarius (signs 4 and 11, which are 6/8 apart): it scores 7 for one order and 0 for the other. A Bhakoot relation must be symmetric, so this engine's 0 is kept. |
| Tara | 3,888 | Reference differs from the classical rule. PyJHora awards 1.5 for each direction whose remainder IS 3, 5 or 7 (Vipat, Pratyak, Vadha), the unfavourable taras, so even the same Nakshatra scores 0. The classical rule (several astrology sources agree) gives 0 to those taras. This engine follows the classical rule. |
| Varna | 1,458 | Convention. PyJHora puts Taurus/Virgo/Capricorn in Shudra and Gemini/Libra/Aquarius in Vaishya. Most sources (AstroYogi, Astromedha, Jagannath Hora) use the element rule: water Brahmin, fire Kshatriya, earth Vaishya, air Shudra, which this engine uses. |
| Vashya | 6,673 | Convention. Published tables differ. PyJHora's default is the Saravali table; it also ships the AstroYogi table. This engine uses a single widely published grid. The same grid appears in PyJHora as an alternative table, but PyJHora's default is the Saravali table, so the comparison against its default shows many differences. Sagittarius and Capricorn are split at 15 degrees of the sign here; PyJHora approximates the split by Nakshatra pada. |
| Gana | 2,592 | Convention. Sources disagree on which side scores 6 and which 5 for Deva/Manushya pairs. This engine: first person Deva with second Manushya = 6; Manushya with Deva = 5; Deva with Rakshasa = 1; Rakshasa with Deva = 0; Manushya with Rakshasa = 0. PyJHora has the Deva/Manushya pair the other way round. |

Totals therefore differ from PyJHora's default for most pairs (1,851 of 11,664 total scores are identical in the final comparison run). Every difference
above is a Varna, Vashya, Tara, Gana or Bhakoot convention listed here. Software from other vendors will differ from each other in the same places.

## What is still unverified

- No second independent implementation was run (executing third-party code was not permitted in this pass). Vashya and Gana direction in particular should
  be confirmed by a Jyotish reviewer before the tool is described as matching any named calculator.
- The Tara rule and the Varna element rule are supported by several astrology websites, which are secondary sources, not the classical texts.
- Dosha cancellations (Nadi, Bhakoot) are the commonly cited ones only.

## What users are told

The result's "How this was calculated" section lists these conventions, says that published tables differ and that scores may differ from other calculators, and does not name any external calculator or claim equivalence.
