// Single source of truth for astrology terms shown to users. Every tool reads its explanations from here so a term such as
// "Rashi" or "Nakshatra" never carries two different definitions. To add a term, add one entry below: nothing else changes.
//
//   short    - one line, fine for a tooltip.
//   meaning  - everyday-English definition.
//   how      - how the value is worked out (only where it is calculated).
//   why      - why it matters when reading a result.
//   tradition- what Jyotish traditionally says; never presented as proven fact.
//   example  - optional relatable example.

export interface GlossaryEntry {
  term: string;
  short: string;
  meaning: string;
  how?: string;
  why?: string;
  tradition?: string;
  example?: string;
}

const entries: GlossaryEntry[] = [
  {
    term: "Sankranti",
    short: "The moment the Sun enters a new sign.",
    meaning: "Each month the Sun moves into the next zodiac sign; that moment is a Sankranti (for example Mesha Sankranti). On a birth date when it happens, your Sun sign depends on your birth time.",
  },
  {
    term: "Amanta",
    short: "A way of counting Hindu months (new moon to new moon).",
    meaning: "In the Amanta system a month ends at the New Moon. The Purnimanta system, used in much of North India, ends the month at the Full Moon, so the same day can carry two different month names. The result shows the Amanta name and the Purnimanta name beside it.",
  },
  {
    term: "Ephemeris",
    short: "A table of calculated positions of the Sun, Moon and planets.",
    meaning: "Astronomers publish exact positions of the Sun, Moon and planets for any moment in time. Software reads those positions from an ephemeris, so the chart does not rely on estimates.",
  },
  {
    term: "Shadbala",
    short: "A traditional method of measuring planetary strength.",
    meaning: "'Six-fold strength': a detailed traditional scoring of how strong each graha is. MyBhagya does not calculate it.",
  },
  {
    term: "Ashtakavarga",
    short: "A traditional point system for transits.",
    meaning: "A scoring method that gives each sign points from each graha, used to judge transits. MyBhagya does not calculate it.",
  },
  {
    term: "Parashari",
    short: "The main classical school of Vedic astrology.",
    meaning: "Methods that follow the ancient text attributed to the sage Parashara. Most Guna Milan tables use this tradition.",
  },
  {
    term: "Pratipada",
    short: "The first Tithi of a Paksha.",
    meaning: "The first lunar day after the New Moon or Full Moon. Shukla Pratipada, the first day of the waxing Moon, starts the Hindu month and year in the Chaitradi calendar.",
  },
  {
    term: "Koota",
    short: "One scoring factor in Guna Milan (also spelled Kuta or Kootam).",
    meaning:
      "'Koota' is a Sanskrit word for a factor or group. In marriage matching there are eight Kootas, and each one compares a different side of two people: for example temperament (Varna), mutual attraction (Vashya), birth-star harmony (Tara) or health and energy (Nadi). Each Koota has its own maximum score, and together they make 36.",
    how: "Each Koota is looked up in a fixed traditional table using the two people's Moon signs and Nakshatras. A full score means the pair is in harmony on that factor; zero means the table treats that pairing as a weak point.",
    why: "Reading the eight scores separately shows where a pair is strong and where tradition suggests extra care, which the single total cannot show.",
    tradition: "Different traditions and calculators use slightly different tables for some Kootas, so scores can differ by a few points between sources.",
    example: "Nadi is worth 8 points, the most of any Koota, so a zero there changes the total a lot.",
  },
  {
    term: "Vikram Samvat",
    short: "The Hindu calendar year number.",
    meaning: "A year count used in the Hindu calendar. It runs about 57 years ahead of the Gregorian (everyday) year.",
  },
  {
    term: "Masa",
    short: "A Hindu lunar month.",
    meaning: "The month in the Hindu calendar, such as Chaitra or Vaishakha. It follows the Moon, so it does not line up with Gregorian months. An Adhika Masa is an extra month added to keep the calendar in step with the seasons.",
  },
  {
    term: "Vara",
    short: "The weekday.",
    meaning: "The day of the week in the Panchang. Each weekday is linked with a graha: Sunday with the Sun, Monday with the Moon, Tuesday with Mars and so on.",
  },
  {
    term: "Mahadasha",
    short: "The main (long) planetary period in the Dasha system.",
    meaning: "In the Vimshottari Dasha system each graha rules a main period of several years (for example Jupiter 16, Saturn 19, Venus 20). This is the Mahadasha.",
    tradition: "Tradition reads a Mahadasha through the nature of its ruling graha. It describes emphasis, not fixed events.",
  },
  {
    term: "Antardasha",
    short: "A sub-period inside a Mahadasha.",
    meaning: "Every Mahadasha is divided into nine shorter sub-periods, one per graha. The Antardasha is the one running now, so it adds a second theme on top of the Mahadasha.",
  },
  {
    term: "Uchcha (exalted)",
    short: "A graha in the sign where it is traditionally strongest.",
    meaning: "Each graha has one sign where tradition says it works at its best, called its exaltation sign (for example Jupiter in Cancer or Venus in Pisces).",
    how: "Checked by comparing the graha's sign in your chart with the fixed list of exaltation signs.",
    tradition: "Considered strong, though the rest of the chart still matters.",
  },
  {
    term: "Swakshetra (own sign)",
    short: "A graha in a sign it rules.",
    meaning: "Each graha rules one or two signs (the Sun rules Leo, Mars rules Aries and Scorpio, and so on). A graha placed in a sign it rules is said to be in its own sign.",
    tradition: "Traditionally comfortable and steady.",
  },
  {
    term: "Neecha (debilitated)",
    short: "A graha in the sign where it is traditionally weakest.",
    meaning: "The sign opposite a graha's exaltation sign is its debilitation sign (for example Jupiter in Capricorn).",
    tradition: "Traditionally asks for extra effort in that graha's area of life. Other factors in the chart can soften it, so it is not a fixed verdict.",
  },
  {
    term: "Lagna lord",
    short: "The graha that rules your rising sign.",
    meaning: "Every sign is ruled by a graha. The graha ruling your Lagna sign is the Lagna lord, and where it sits in the chart shows where your life energy tends to go.",
    how: "Found from the fixed list of sign rulers, then located in your chart.",
  },
  {
    term: "Karma Bhava (10th house)",
    short: "The house of career and public work.",
    meaning: "The 10th house counted from the Lagna. 'Karma' means action or work, so this house is read for career and status.",
  },
  {
    term: "Kalatra Bhava (7th house)",
    short: "The house of marriage and partnership.",
    meaning: "The 7th house counted from the Lagna. 'Kalatra' means spouse, so this house is read for marriage and close partnerships.",
  },
  {
    term: "Rahu",
    short: "A shadow point: the Moon's north node.",
    meaning: "Rahu and Ketu are not physical planets. They are the two points where the Moon's path crosses the Sun's path, always exactly opposite each other. Rahu is the north node.",
    tradition: "Traditionally linked with ambition, desire and unusual paths.",
  },
  {
    term: "Ketu",
    short: "A shadow point: the Moon's south node.",
    meaning: "The point opposite Rahu on the Moon's path. Like Rahu it is a calculated point, not a planet.",
    tradition: "Traditionally linked with detachment, intuition and letting go.",
  },
  {
    term: "Sidereal zodiac (Nirayana)",
    short: "The star-fixed zodiac used in Vedic astrology.",
    meaning: "The zodiac measured against the fixed stars. It is about 24 degrees behind the Western tropical zodiac (which is measured from the March equinox) because of the slow wobble of the Earth's axis.",
    why: "It is the reason your Vedic sign is often the sign before your Western one.",
  },
  {
    term: "Tropical zodiac",
    short: "The Western zodiac, measured from the March equinox.",
    meaning: "The zodiac used in newspaper horoscopes. Its signs follow the seasons, not the stars.",
  },
  {
    term: "Janma Kundali",
    short: "Your birth chart: a map of the sky at your birth.",
    meaning: "A map of where the Sun, Moon and other grahas (planets) were at your exact moment and place of birth.",
    tradition: "Jyotish reads it for tendencies and themes, not guaranteed outcomes.",
  },
  {
    term: "Rashi",
    short: "A zodiac sign in Vedic astrology.",
    meaning:
      "One of the 12 zodiac signs (Mesha to Meena). Vedic astrology uses the sidereal zodiac, which sits about 24 degrees behind the Western tropical one, so your Vedic sign is often the sign before the one in newspapers.",
    how: "The sign the planet occupies is found from its longitude along the sidereal zodiac (each sign is 30 degrees).",
    why: "'Your Rashi' normally means your Moon sign (Chandra Rashi). Other signs are named explicitly, such as Surya Rashi (Sun sign) or Lagna.",
    tradition: "Traditionally the Moon sign describes temperament and emotional style.",
    example: "Born with the Moon in Dhanu (Sagittarius) means Dhanu is your Rashi, even if your Western Sun sign is Taurus.",
  },
  {
    term: "Chandra Rashi",
    short: "Your Moon sign: the sign the Moon was in at birth.",
    meaning: "The sign the Moon occupied when you were born. In Indian astrology this is usually what people mean by 'my Rashi'.",
    how: "The Moon's sidereal longitude at your birth time and place is mapped to one of the 12 signs.",
    why: "It is the base for Nakshatra, Dasha, Guna Milan and Sade Sati.",
    tradition: "Traditionally linked with mind, feelings and daily mood.",
  },
  {
    term: "Surya Rashi",
    short: "Your Sun sign in the Vedic (sidereal) zodiac.",
    meaning: "The sign the Sun occupied at birth, measured in the sidereal zodiac. It is usually one sign earlier than the Western Sun sign.",
    tradition: "Traditionally linked with the soul, vitality and sense of purpose.",
  },
  {
    term: "Lagna",
    short: "The rising sign: the sign on the eastern horizon at birth.",
    meaning:
      "The zodiac sign that was rising over the eastern horizon at your exact time and place of birth. It changes about every two hours, so it needs a birth time. It is different from the Moon sign.",
    how: "Calculated from your birth time (converted to sidereal time), your birthplace latitude and longitude, and the ayanamsa.",
    why: "The Lagna becomes the 1st house and every other house is counted from it, so it shapes the whole chart.",
    tradition: "Traditionally describes your body, personality and how you meet the world.",
    example: "Moon sign is how you feel inside; Lagna is closer to the first impression you give.",
  },
  {
    term: "Nakshatra",
    short: "One of the 27 lunar constellations (about 13°20' each).",
    meaning: "The Moon's path across the sky is divided into 27 equal parts called Nakshatras. Each has four quarters called padas.",
    how: "The Moon's sidereal longitude divided by 13°20' gives the Nakshatra; each 3°20' inside it is one pada.",
    why: "Your birth (Janma) Nakshatra decides the starting Dasha, is used in Guna Milan (Gana, Nadi, Yoni, Tara) and in naming traditions.",
    tradition: "Each Nakshatra has a ruling graha and traditional temperament.",
  },
  {
    term: "Pada",
    short: "One quarter (3°20') of a Nakshatra.",
    meaning: "Each Nakshatra is split into four padas. The pada gives a finer detail than the Nakshatra alone.",
  },
  {
    term: "Graha",
    short: "A planet or point used in Jyotish.",
    meaning: "Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn, plus the shadow points Rahu and Ketu (the Moon's nodes).",
  },
  {
    term: "Bhava (house)",
    short: "One of 12 life areas counted from the Lagna.",
    meaning: "The chart has 12 houses, each about a theme such as self, money, siblings, home, children, work, marriage, career or gains.",
    how: "Here houses are whole-sign: the Lagna sign is house 1, the next sign is house 2, and so on.",
    tradition: "A graha's meaning is read through the house it sits in and the house it rules.",
  },
  {
    term: "Navamsa (D9)",
    short: "The 9th-part divisional chart, read for marriage and inner strength.",
    meaning: "Each 30° sign is split into nine parts of 3°20'. Each part gives the planet a sign in the Navamsa chart (D9).",
    how: "Navamsa sign number = whole number of 3°20' steps in the planet's sidereal longitude, counted from Aries, wrapped around the 12 signs.",
    why: "It is a second view of each graha that adds to the main (D1) chart.",
    tradition: "Traditionally read for marriage, dharma and the true strength of a graha.",
  },
  {
    term: "D1 (Rashi chart)",
    short: "The main birth chart.",
    meaning: "The primary chart of sign placements at birth. 'D' stands for divisional chart; D1 is the whole, undivided sign.",
  },
  {
    term: "Dasha",
    short: "A planetary period that colours a stretch of life.",
    meaning:
      "In the Vimshottari system a 120-year cycle is split into periods ruled by nine grahas. The Mahadasha is the main period; the Antardasha is a sub-period inside it.",
    how: "The starting graha comes from the Moon's Nakshatra; the balance of that period at birth depends on how far the Moon had moved through it.",
    why: "Tradition reads the themes of the running periods rather than single dates.",
    tradition: "Periods describe emphasis and themes, not fixed events.",
  },
  {
    term: "Panchang",
    short: "The five limbs of the Hindu calendar for a moment.",
    meaning: "Tithi (lunar day), Vara (weekday), Nakshatra, Yoga and Karana, usually shown with sunrise, sunset and special timings.",
    how: "All are derived from the positions of the Sun and Moon at the chosen time and place.",
  },
  {
    term: "Tithi",
    short: "A lunar day: each is 12° of Moon-Sun separation.",
    meaning: "A Tithi is the time it takes the Moon to gain 12 degrees on the Sun. There are 30 in a lunar month, 15 in each Paksha.",
    how: "Tithi number = whole number of 12° steps in (Moon longitude minus Sun longitude). It can begin and end at any time of day.",
    why: "Many festivals, fasts and rituals are fixed by Tithi.",
  },
  {
    term: "Paksha",
    short: "Fortnight of the Moon: Shukla (waxing) or Krishna (waning).",
    meaning: "Shukla Paksha runs from New Moon to Full Moon; Krishna Paksha from Full Moon to New Moon.",
  },
  {
    term: "Yoga",
    short: "A Panchang value from the Sun plus Moon longitudes.",
    meaning: "One of 27 Yogas, found by adding the Sun and Moon longitudes and dividing into 13°20' parts. (Not the same as exercise yoga.)",
  },
  {
    term: "Karana",
    short: "Half of a Tithi.",
    meaning: "There are 60 Karanas in a lunar month; each is half a Tithi (6° of Moon-Sun separation).",
  },
  {
    term: "Rahu Kaal",
    short: "A daily window traditionally avoided for starting new work.",
    meaning:
      "The daytime (sunrise to sunset) is divided into eight equal parts. Rahu Kaal is one of them, and which one depends on the weekday.",
    how: "Daytime length / 8 gives each part. The part used rotates by weekday (Monday 2nd, Saturday 3rd, Friday 4th, Wednesday 5th, Thursday 6th, Tuesday 7th, Sunday 8th).",
    tradition: "Traditionally avoided for starting auspicious work. It is a custom, not a proven fact.",
  },
  {
    term: "Yamaganda",
    short: "Another daily inauspicious window, found like Rahu Kaal.",
    meaning: "One of eight equal parts of daytime, chosen by weekday, traditionally avoided for new beginnings.",
  },
  {
    term: "Gulika Kaal",
    short: "A daily window linked with Saturn's son Gulika.",
    meaning: "One of eight equal parts of daytime, chosen by weekday, traditionally avoided for repeatable events.",
  },
  {
    term: "Abhijit Muhurat",
    short: "The midday window traditionally considered favourable.",
    meaning: "About 48 minutes around local solar noon, traditionally considered favourable for beginnings.",
    how: "Daytime is split into 15 parts; the 8th part is Abhijit.",
  },
  {
    term: "Brahma Muhurat",
    short: "The pre-dawn window traditionally used for prayer and study.",
    meaning: "The 48-minute period that begins 1 hour 36 minutes before sunrise.",
  },
  {
    term: "Ayanamsa",
    short: "The offset between the Western and Vedic zodiacs.",
    meaning: "The angle (about 24° today) by which the Vedic sidereal zodiac lags the Western tropical one. MyBhagya uses the Lahiri ayanamsa.",
  },
  {
    term: "Guna Milan",
    short: "The 36-point Ashtakoota marriage-matching score.",
    meaning:
      "A traditional matching system. Eight factors (Kootas) are scored from the two Moon signs and Nakshatras: Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8: 36 points in all.",
    how: "Each Koota is scored from a fixed traditional table using the Moon sign and Nakshatra of both people. The eight scores are added.",
    why: "It is a conversation starter for traditional families, not a verdict on a relationship.",
    tradition: "Many families treat 18 of 36 as the minimum, but this is a convention and not a rule of nature.",
  },
  {
    term: "Ashtakoota",
    short: "'Eight factors': the eight parts of Guna Milan.",
    meaning: "Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot and Nadi.",
  },
  {
    term: "Varna",
    short: "Koota (1 point): temperament and ego compatibility.",
    meaning: "Compares the temperament class of the two Moon signs. There are four classes, in traditional order Brahmin, Kshatriya, Vaishya and Shudra, linked to the element of the Moon sign (water, fire, earth, air). It describes temperament in this system and is not a judgement of anyone's social standing. 1 point if the first person's class is equal or higher, else 0.",
  },
  {
    term: "Vashya",
    short: "Koota (2 points): mutual attraction and influence.",
    meaning: "Sorts each Moon sign into one of five groups (Chatushpada = four-legged, Manava = human, Jalachara = water, Vanachara = wild, Keeta = insect) and scores how well the two groups pull together.",
  },
  {
    term: "Tara",
    short: "Koota (3 points): birth-star harmony.",
    meaning: "Counts from each person's Nakshatra to the other's; the remainder after dividing by 9 gives one of nine 'taras'. The 3rd (Vipat, obstacles), 5th (Pratyak, hindrance) and 7th (Vadha, harm) are the traditionally unfavourable ones.",
  },
  {
    term: "Yoni",
    short: "Koota (4 points): physical and instinctive compatibility.",
    meaning: "Each Nakshatra is linked to an animal symbol. Same animal scores 4; enemy animals score 0.",
  },
  {
    term: "Graha Maitri",
    short: "Koota (5 points): mental friendship of the Moon-sign lords.",
    meaning: "Compares the ruling planets of the two Moon signs: friends, neutral or enemies.",
  },
  {
    term: "Gana",
    short: "Koota (6 points): nature (Deva, Manushya, Rakshasa).",
    meaning: "Each Nakshatra belongs to one of three temperament types: Deva (gentle, divine), Manushya (human, balanced) or Rakshasa (strong-willed, intense). These are descriptive labels, not moral ones. Similar types score high; Deva with Rakshasa scores lowest.",
  },
  {
    term: "Bhakoot",
    short: "Koota (7 points): emotional bond and family wellbeing.",
    meaning: "Looks at how many signs apart the two Moon signs are. Pairs 2/12, 5/9 or 6/8 apart are traditionally called Bhakoot Dosha.",
    tradition: "Bhakoot Dosha is traditionally thought to affect harmony or finances; classical texts list cancellation conditions such as both Moon-sign lords being the same or friends.",
  },
  {
    term: "Nadi",
    short: "Koota (8 points): health and energy compatibility.",
    meaning: "Each Nakshatra belongs to one of three Nadis: Adi (first), Madhya (middle) or Antya (last). If both people have the same Nadi the score is 0, which is called Nadi Dosha.",
    tradition: "Nadi Dosha is traditionally linked to health and progeny concerns; classical texts list exceptions, for example when both have the same Nakshatra but different padas.",
  },
  {
    term: "Dosha",
    short: "A traditional chart condition thought to need care.",
    meaning: "A planetary placement that classical texts say can bring difficulty. Each Dosha has its own rule and its own cancellation (Parihara) conditions.",
    tradition: "A Dosha is a tendency in tradition, not a certainty.",
  },
  {
    term: "Mangal Dosha",
    short: "Mars in the 1st, 2nd, 4th, 7th, 8th or 12th house.",
    meaning: "Also called Manglik. It is said to exist when Mars sits in house 1, 2, 4, 7, 8 or 12 counted from the Lagna.",
    how: "The house of Mars in your whole-sign chart is checked against that list.",
    tradition: "It is traditionally considered in marriage matching. Many classical exceptions exist, for example when both partners are Manglik.",
  },
  {
    term: "Sade Sati",
    short: "Saturn's roughly 7½-year transit around your Moon sign.",
    meaning:
      "Saturn takes about 2½ years per sign. Sade Sati is when Saturn passes through the sign before your Moon sign (12th from it), your Moon sign itself, and the sign after it (2nd from it). These are its three phases.",
    how: "Saturn's current sidereal sign is compared with your Moon sign.",
    tradition: "The first phase is traditionally linked with new responsibilities and spending, the second with the greatest pressure on mind and routine, the third with recovery and settling. It is read as a time for patience and discipline, not as a prediction.",
  },
  {
    term: "Mulank",
    short: "Root number: the reduced day of birth.",
    meaning: "Your day of birth reduced to a single digit (1-9). Born on the 29th: 2+9 = 11, 1+1 = 2.",
  },
  {
    term: "Bhagyank",
    short: "Destiny number: the reduced full date of birth.",
    meaning: "All the digits of your full date of birth added and reduced to a single digit (or master number where kept).",
  },
  {
    term: "Naamank",
    short: "Name number: the reduced value of your name's letters.",
    meaning: "Each letter has a number. The values are added and reduced. Chaldean and Pythagorean are two different letter tables, so they can give different results.",
  },
  {
    term: "Chaldean numerology",
    short: "Older letter table that uses 1-8.",
    meaning: "Assigns numbers 1-8 to letters by sound (9 is held sacred and not assigned).",
  },
  {
    term: "Pythagorean numerology",
    short: "Common modern letter table that uses 1-9.",
    meaning: "Assigns 1-9 to the letters A-Z in order, cycling back to 1 after I.",
  },
  {
    term: "Ratna",
    short: "A gemstone traditionally linked with a graha.",
    meaning: "Jyotish links each graha to a gemstone. A stone is traditionally suggested to support a graha that matters in your chart.",
    tradition: "Traditional guidance, not a medical or guaranteed remedy.",
  },
  {
    term: "Muhurat",
    short: "A time window chosen for an activity.",
    meaning: "A span of time (traditionally about 48 minutes) judged by Panchang factors to be suitable for starting something.",
  },
  {
    term: "Vastu",
    short: "Traditional Indian rules of space and direction.",
    meaning: "Guidance on how directions and layout of a home or workplace are traditionally arranged.",
    tradition: "A traditional design practice, not a scientific measurement.",
  },
];

const byKey = new Map(entries.map((e) => [e.term.toLowerCase(), e]));

const ALIASES: Record<string, string> = {
  kootas: "koota",
  kuta: "koota",
  vimshottari: "dasha",
  uchcha: "uchcha (exalted)",
  exalted: "uchcha (exalted)",
  swakshetra: "swakshetra (own sign)",
  neecha: "neecha (debilitated)",
  "karma bhava": "karma bhava (10th house)",
  "kalatra bhava": "kalatra bhava (7th house)",
  "10th house": "karma bhava (10th house)",
  "7th house": "kalatra bhava (7th house)",
  "sidereal zodiac": "sidereal zodiac (nirayana)",
  nirayana: "sidereal zodiac (nirayana)",
  sidereal: "sidereal zodiac (nirayana)",
  tropical: "tropical zodiac",
  "janma nakshatra": "nakshatra",
  "lagna (ascendant)": "lagna",
  "nadi dosha": "nadi",
  "bhakoot dosha": "bhakoot",
  rashis: "rashi",
  "moon sign": "chandra rashi",
  "sun sign": "surya rashi",
  ascendant: "lagna",
  "rising sign": "lagna",
  nakshatras: "nakshatra",
  house: "bhava (house)",
  houses: "bhava (house)",
  bhava: "bhava (house)",
  grahas: "graha",
  navamsa: "navamsa (d9)",
  d9: "navamsa (d9)",
  d1: "d1 (rashi chart)",
  manglik: "mangal dosha",
  "sade sati": "sade sati",
  "guna": "guna milan",
  "rahu kalam": "rahu kaal",
  "abhijit muhurta": "abhijit muhurat",
  "brahma muhurta": "brahma muhurat",
  "muhurta": "muhurat",
};

/** Look a term up (case-insensitive, with a few common spellings). Returns undefined when unknown. */
export const getTerm = (term: string): GlossaryEntry | undefined => {
  const k = term.trim().toLowerCase();
  return byKey.get(k) ?? byKey.get(ALIASES[k] ?? "");
};

export const GLOSSARY: readonly GlossaryEntry[] = entries;

// Words that identify each term in running text (for findTerms). Kept explicit so generic words such as "house" never match.
const MATCH_WORDS: Record<string, string[]> = {
  "bhava (house)": ["bhava"],
  "d1 (rashi chart)": ["rashi chart", "d1"],
  "navamsa (d9)": ["navamsa", "d9"],
  "uchcha (exalted)": ["uchcha", "exalted", "exaltation"],
  "swakshetra (own sign)": ["swakshetra"],
  "neecha (debilitated)": ["neecha", "debilitation", "debilitated"],
  "karma bhava (10th house)": ["karma bhava"],
  "kalatra bhava (7th house)": ["kalatra bhava"],
  "sidereal zodiac (nirayana)": ["sidereal", "nirayana"],
  "chandra rashi": ["chandra rashi", "moon sign"],
  "surya rashi": ["surya rashi"],
  nadi: ["nadi", "nadi dosha", "adi", "madhya", "antya"],
  bhakoot: ["bhakoot", "bhakoot dosha"],
  koota: ["koota", "kootas"],
  dasha: ["dasha", "vimshottari"],
  "janma kundali": ["janma kundali", "kundali"],
  varna: ["varna", "brahmin", "kshatriya", "vaishya", "shudra"],
  vashya: ["vashya", "chatushpada", "manava", "jalachara", "vanachara", "keeta"],
  tara: ["tara", "vipat", "pratyak", "vadha", "taras"],
  gana: ["gana", "deva", "manushya", "rakshasa"],
  amanta: ["amanta", "purnimanta"],
  "drik": ["drik"],
};

const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Glossary terms that appear in a piece of text (whole word, case-insensitive), in glossary order.
 * Longer names are matched first and consumed, so "Graha Maitri" counts as Graha Maitri only, not also as Graha.
 */
export const findTerms = (text: string): string[] => {
  let hay = " " + text.toLowerCase() + " ";
  const pairs = entries
    .flatMap((e) => (MATCH_WORDS[e.term.toLowerCase()] ?? [e.term.toLowerCase()]).map((w) => ({ w, e })))
    .sort((a, b) => b.w.length - a.w.length);
  const found = new Set<GlossaryEntry>();
  for (const { w, e } of pairs) {
    const re = new RegExp("(^|[^a-z0-9])" + escapeRe(w) + "(?=[^a-z0-9]|$)", "g");
    if (re.test(hay)) {
      found.add(e);
      hay = hay.replace(re, "$1 ");
    }
  }
  return entries.filter((e) => found.has(e)).map((e) => e.term);
};
