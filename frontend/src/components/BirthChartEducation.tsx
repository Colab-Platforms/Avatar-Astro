import EducationSection, { EducationBlock } from "@/components/EducationSection";
import { FEATURE_FAQS } from "@/data/featureFaqs";

const blocks: EducationBlock[] = [
  {
    heading: "What Is a Janma Kundali?",
    paragraphs: [
      "A Janma Kundali is the Vedic birth chart: a map of the sky at the exact moment and place you were born. Vedic astrologers read it from the signs (Rashis), lunar mansions (Nakshatras) and houses that the Sun, Moon and planets occupied.",
      "This Seva calculates the key parts of that chart: your Surya Rashi (Sun sign), Chandra Rashi (Moon sign), Janma Nakshatra and its pada, the Lagna (ascendant) with the planets in their Rashis and houses when you give an exact birth time, and the Panchang of your birth. It also shows a numerology Life Path number, which is a separate tradition.",
    ],
  },
  {
    heading: "How Is It Calculated?",
    list: [
      "Your birth date, time and birthplace are used. The birthplace gives the latitude, longitude and time zone, so your local time is converted correctly to the real moment of birth.",
      "Planet positions come from a high-precision astronomical ephemeris. They are shifted to the sidereal (Nirayana) zodiac using the Lahiri ayanamsa, the standard used in India.",
      "The Lagna is the sign rising on the eastern horizon at your birth time and place. Houses are counted whole-sign, with the Lagna sign as the 1st house.",
      "The Panchang (Hindu month, Paksha, Tithi, Nakshatra, Yoga, Karana, Vara) comes from the real positions of the Sun and Moon, not from a calendar table.",
    ],
    ordered: true,
    after: [
      "The Rashi, Nakshatra, Lagna and Panchang are calculated for you. The written descriptions of each Rashi and the Life Path insights are traditional text written once for each sign or number.",
    ],
  },
  {
    heading: "What If I Don't Know My Birth Time?",
    list: [
      "Surya Rashi and Chandra Rashi are stated only when the Sun or Moon stays in one sign for the whole day at your birthplace. If it changes sign that day, both possibilities are shown and marked uncertain.",
      "The Lagna, the houses and the planets' house placements are not calculated and are never guessed.",
      "The Moon's pada and the Vimshottari dasha need your exact birth time, so they are left out. The Panchang is worked out for local sunrise, and anything that changes during the day is marked uncertain.",
    ],
    after: [
      "If your birth time is only approximate, remember that the Lagna moves to the next sign about every two hours and advances roughly 1° every four minutes.",
    ],
  },
  {
    heading: "What Is Not Calculated?",
    paragraphs: [
      "This Seva does not calculate divisional charts such as the Navamsa, planetary strength (Shadbala), Ashtakavarga, yogas or predictions of events. Rahu and Ketu are the mean lunar nodes. If you want those readings, consult a qualified Vedic astrologer or full chart software.",
    ],
  },
  {
    heading: "How to Read Your Result",
    list: [
      "Surya Rashi: the sidereal sign of the Sun at your birth. In Vedic astrology it describes the self and vitality.",
      "Chandra Rashi: the sidereal sign of the Moon. It is the main sign used in Indian astrology for the mind and temperament.",
      "Nakshatra and pada: the lunar mansion of the Moon, one of 27 divisions of the zodiac, split into four padas.",
      "Panchang: the traditional almanac details for the day of birth.",
    ],
    after: [
      "Read these as traditional descriptions for reflection. Nothing here can tell you what will happen.",
    ],
  },
];

const faqs = FEATURE_FAQS.birthChart;

const DISCLAIMER =
  "This profile is offered for personal interest, cultural exploration and reflection. Astrology and numerology are traditional belief systems that are not scientifically proven, and the profile is not a prediction or professional advice.";

export default function BirthChartEducation() {
  return <EducationSection idPrefix="birthchart" title="About Janma Kundali" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
