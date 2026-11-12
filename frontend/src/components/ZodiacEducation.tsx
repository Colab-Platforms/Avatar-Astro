import { useTranslation } from "react-i18next";
import EducationSection, { EducationBlock } from "@/components/EducationSection";
import { FEATURES } from "@/data/featureCatalog";
import { FEATURE_FAQS } from "@/data/featureFaqs";
import { zodiacSigns, useZodiacText } from "@/data/zodiacData";

// English source text. Each piece is looked up by key (zodiac.education.b<block>.<part>) with this English as the default.
const blocks: EducationBlock[] = [
  {
    heading: "What Are Zodiac Signs?",
    paragraphs: [
      "The zodiac is a belt of sky that the Sun, Moon and planets appear to travel through. Astrology divides that belt into twelve equal parts of 30 degrees each, and each part is called a sign. The signs carry the names of Aries, Taurus, Gemini and the rest, and each is associated with an element and a traditional set of themes.",
      "Your Sun sign is the sign the Sun was in when you were born. It is the sign most people mean when they say \"I'm a Leo\". It is a popular starting point for exploring astrology, and this page is useful if you are curious about the personality themes traditionally linked with each sign, or about the signs of people you know.",
    ],
  },
  {
    heading: "How Does Daily Horoscope Work?",
    list: [
      "Explore the wheel. Tap any sign to see its dates, element, ruling planet and a short description. The wheel also cycles through the signs by itself until you tap one.",
      "Filter by element if you want to compare Fire, Earth, Air or Water signs side by side.",
      "Open a sign's card to read its full profile: core traits, strengths, areas to watch and traditionally compatible signs.",
    ],
    ordered: true,
    after: [
      "This Seva does not ask for your name or birth details, and it uses no generated text. Every description is fixed text written for Bhagya Astro, so the same sign always shows the same profile.",
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
      // Rebuilt in the component so sign, element and planet names follow the chosen language.
      rows: [],
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

const faqs = FEATURE_FAQS.zodiac;

const DISCLAIMER =
  "Zodiac sign profiles are offered for personal interest, cultural exploration and reflection. They describe traditional symbolism, are not scientifically proven, and are not predictions or professional advice.";

export default function ZodiacEducation() {
  const { t } = useTranslation();
  const z = useZodiacText();
  const text = (b: number, part: string, def: string) => t(`zodiac.education.b${b}.${part}`, { defaultValue: def });
  const localized: EducationBlock[] = blocks.map((block, b) => ({
    ...block,
    heading: text(b, "heading", block.heading),
    paragraphs: block.paragraphs?.map((p, i) => text(b, `p.${i}`, p)),
    list: block.list?.map((item, i) => text(b, `list.${i}`, item as string)),
    after: block.after?.map((p, i) => text(b, `after.${i}`, p)),
    table: block.table && {
      caption: block.table.caption && text(b, "table.caption", block.table.caption),
      head: block.table.head.map((h, i) => text(b, `table.head.${i}`, h)),
      rows: zodiacSigns.map((s) => [
        z.sign(s.name),
        z.dates(s),
        z.element(s.element),
        s.traditionalRuling ? `${z.planet(s.ruling)} / ${z.planet(s.traditionalRuling)}` : z.planet(s.ruling),
      ]),
    },
  }));
  return <EducationSection audioToolSlug={FEATURES.zodiac.id} idPrefix="zodiac" title={t("zodiac.education.title", { defaultValue: "About Daily Horoscope" })} blocks={localized} faqs={faqs} disclaimer={t("zodiac.education.disclaimer", { defaultValue: DISCLAIMER })} />;
}
