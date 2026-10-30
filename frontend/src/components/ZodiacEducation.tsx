import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";
import { zodiacSigns } from "@/data/zodiacData";

const blocks: EducationBlock[] = [
  {
    heading: "What Are Zodiac Signs?",
    paragraphs: [
      "The zodiac is a belt of sky that the Sun, Moon and planets appear to travel through. Astrology divides that belt into twelve equal parts of 30 degrees each, and each part is called a sign. The signs carry the names of Aries, Taurus, Gemini and the rest, and each is associated with an element and a traditional set of themes.",
      "Your Sun sign is the sign the Sun was in when you were born. It is the sign most people mean when they say \"I'm a Leo\". It is a popular starting point for exploring astrology, and this page is useful if you are curious about the personality themes traditionally linked with each sign, or about the signs of people you know.",
    ],
  },
  {
    heading: "How Does Rashi Chakra Work?",
    list: [
      "Explore the wheel. Tap any sign to see its dates, element, ruling planet and a short description. The wheel also cycles through the signs by itself until you tap one.",
      "Filter by element if you want to compare Fire, Earth, Air or Water signs side by side.",
      "Open a sign's card to read its full profile: core traits, strengths, areas to watch and traditionally compatible signs.",
    ],
    ordered: true,
    after: [
      "This Seva does not ask for your name or birth details, and it does not use AI. Every description is fixed text written for MyBhagya Astro, so the same sign always shows the same profile.",
    ],
  },
  {
    heading: "How Are Zodiac Signs Determined?",
    paragraphs: [
      "A Sun sign is found by date. Find the range your birthday falls in and you have your sign. The table lists the commonly used Western (tropical) date ranges that this Seva shows.",
    ],
    table: {
      caption: "Commonly used Western (tropical) Sun-sign date ranges",
      head: ["Sign", "Dates", "Element", "Ruler"],
      rows: zodiacSigns.map((z) => [
        z.name,
        z.dates,
        z.element,
        z.traditionalRuling ? `${z.ruling} / ${z.traditionalRuling}` : z.ruling,
      ]),
    },
    after: [
      "These are approximate. The Sun changes sign on a slightly different date and time from year to year, and the clock time depends on your time zone, so if you were born within a day or so of a boundary your Sun sign may differ from the table. A calculation from your exact birth time and place, by a qualified astrologer or chart software, can settle it.",
      "Western astrology uses the tropical zodiac, which is tied to the seasons. Vedic (Indian) astrology uses the sidereal zodiac, which is tied to the stars, and the two are roughly 24 degrees (about three and a half weeks) apart. For many birthdays this means your Vedic Sun sign is the sign before your Western one, and Vedic astrology often gives as much weight to the Moon sign (Rashi) and rising sign (Lagna) as to the Sun sign. The dates on this page are the Western ones.",
      "Where two rulers are shown, the first is the modern one and the second is the traditional one. Scorpio, Aquarius and Pisces were assigned Mars, Saturn and Jupiter before Pluto, Uranus and Neptune were discovered, and traditions still differ on which to use.",
    ],
  },
  {
    heading: "How to Understand Your Zodiac Profile",
    list: [
      "Element: Fire, Earth, Air or Water groups the twelve signs into four families of traditional themes, such as energy, practicality, ideas and feeling.",
      "Ruler: the planet traditionally associated with the sign. It is part of the symbolism of the sign and does not tell you where any planet is today.",
      "Traits, strengths and areas to watch: general themes astrologers associate with the sign. Most people recognise some of them and not others, which is normal.",
      "Compatible signs: signs of a harmonious element, based on tradition. They are not a prediction about any friendship or relationship.",
    ],
    after: [
      "A Sun sign is one part of a birth chart. It does not account for your Moon sign, rising sign, the other planets or the houses, so it cannot give a complete or personal picture. Use it as a prompt for reflection and test it against your own experience.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "What if my birthday falls on the boundary between two signs?",
    answer:
      "The boundary dates shift a little each year and depend on your birth time and time zone. If you were born within a day or two of a change, ask a qualified astrologer, or use chart software that works from your exact birth time and place, to see which sign the Sun was in. MyBhagya Astro's Janma Kundali Seva uses your date only, so it cannot settle a boundary case.",
  },
  {
    question: "Is my Sun sign the same as my Vedic sign?",
    answer:
      "Often not. Vedic astrology uses the sidereal zodiac, so your Vedic Sun sign is frequently the sign before your Western one, and the Moon sign (Rashi) is usually emphasised. The dates on this page are Western.",
  },
  {
    question: "Does this page predict my future?",
    answer:
      "No. It describes the traditional themes linked with each sign. For a daily outlook, see the Daily Horoscope page, which is a separate Seva.",
  },
  {
    question: "Can I use Rashi Chakra for free?",
    answer: "Yes. Rashi Chakra is one of MyBhagya Astro's free Seva and needs no sign-in or personal details.",
  },
];

const DISCLAIMER =
  "Zodiac sign profiles are offered for personal interest, cultural exploration and reflection. They describe traditional symbolism, are not scientifically proven, and are not predictions or professional advice.";

export default function ZodiacEducation() {
  return <EducationSection idPrefix="zodiac" title="About Rashi Chakra" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
