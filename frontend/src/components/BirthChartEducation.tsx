import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";

const blocks: EducationBlock[] = [
  {
    heading: "What Is a Birth Chart?",
    paragraphs: [
      "A birth chart, also called a natal chart or kundali, is a map of the sky at the exact moment and place you were born. Astrologers read it by looking at where the Sun, Moon and planets sat in the zodiac signs, and which \"houses\" (areas of life) they fell in.",
      "This tool is a lighter starting point. It does not draw a full chart. It gives you a Sun sign and Life Path profile: your Sun sign from your birth date, your numerology Life Path number, and written interpretations for each. It suits you if you are new to astrology and want a quick, easy introduction to your own details.",
    ],
  },
  {
    heading: "How Does Birth Chart Generation Work?",
    list: [
      "Enter your first name and your date of birth. Your last name, time of birth and place of birth are optional.",
      "The tool checks that the date is real and not in the future, then finds your Sun sign and works out your Life Path number. This takes a moment and happens in your browser.",
      "Your profile appears with your Sun sign details, your Life Path number with the working shown step by step, and five insight tabs: Love, Career, Money, Health and Spirituality.",
    ],
    ordered: true,
    after: [
      "No AI is used to write the profile. The descriptions are fixed text for each of the twelve signs and each Life Path number, so two people with the same Sun sign and Life Path will read the same interpretation, with your name added where it appears.",
    ],
  },
  {
    heading: "What Birth Details Are Required?",
    list: [
      "Required: your first name and date of birth.",
      "Optional: last name, time of birth and place of birth. If you enter a time you must choose both the hour and the minute.",
      "Time and place are displayed on your profile for reference. They do not change your Sun sign or Life Path number, because neither is calculated from them.",
    ],
    after: [
      "Your name and birth date are processed in your browser and are not sent to MyBhagya Astro's servers by this tool. If you type a place of birth, the text you type is sent to OpenStreetMap's public search service so it can suggest matching locations.",
    ],
  },
  {
    heading: "How Are Planetary Placements and Houses Calculated?",
    paragraphs: [
      "This tool does not calculate planetary placements, an ascendant (rising sign) or houses, so none of these appear in your profile. Here is what is actually calculated.",
    ],
    list: [
      "Sun sign: a date lookup. Your day and month are matched to the Western (tropical) sign ranges, for example Leo covers 23 July to 22 August. These are approximate on boundary dates, and the Sun's exact sign change shifts a little each year.",
      "Life Path number: simple addition. All the digits of your birth date are added, and the total is reduced by adding its digits again until one digit remains. The numbers 11 and 22 are kept as master numbers. For 17 May 1990 the digits 1+9+9+0+0+5+1+7 give 32, and 3+2 gives a Life Path of 5.",
    ],
    after: [
      "A true birth chart needs astronomy software that uses an ephemeris (a table of planetary positions), plus your exact birth time and place. The place gives the time zone and latitude, which determine your rising sign and how the houses are divided. Astrologers also choose between systems, such as Western tropical or Vedic sidereal zodiacs and different house systems. If you want a full chart, ask a qualified astrologer or use dedicated chart software.",
    ],
  },
  {
    heading: "How to Understand Your Birth Chart Profile",
    list: [
      "Sun sign: the sign the Sun occupied on your birthday. It is a popular summary of traditional personality themes, and it is only one part of a full chart.",
      "Life Path number: a numerology idea based on your birth date. In numerology each number is linked with traditional themes, and these are beliefs rather than measurements.",
      "Detailed insights: each tab describes traditional themes for your Sun sign in that area of life. The reflection prompt below it is a general question to think about, not advice written for you personally.",
    ],
    after: [
      "Read the profile as a mirror for reflection. Keep the parts that feel true and let the rest go. Nothing here can tell you what will happen.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Why does it ask for birth time and place if they don't change the result?",
    answer:
      "They are shown on your profile for reference, and a full birth chart would need them. This tool's results come only from your date of birth.",
  },
  {
    question: "Is this a Vedic birth chart (kundali)?",
    answer:
      "No. It uses the Western tropical Sun sign ranges and a numerology Life Path number. A Vedic chart uses the sidereal zodiac and calculated planetary positions, which this tool does not provide.",
  },
  {
    question: "My Sun sign looks wrong. Why?",
    answer:
      "If you were born within a day or so of a sign boundary, your sign may differ because the Sun's change of sign varies slightly from year to year. Vedic astrology also gives a different Sun sign for many birthdays.",
  },
  {
    question: "Why does a friend with the same sign see the same text?",
    answer:
      "The interpretations are written once for each sign and Life Path number. Only your name, dates and the Life Path working are specific to you.",
  },
  {
    question: "Can I use it for free?",
    answer: "Yes. The Birth Chart profile is one of MyBhagya Astro's free tools and needs no sign-in.",
  },
];

const DISCLAIMER =
  "This profile is offered for personal interest, cultural exploration and reflection. Sun signs and numerology are traditional belief systems that are not scientifically proven, and the profile is not a prediction or professional advice.";

export default function BirthChartEducation() {
  return <EducationSection idPrefix="birthchart" title="About the Birth Chart Tool" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
