import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";

const blocks: EducationBlock[] = [
  {
    heading: "What Is Astrological Compatibility?",
    paragraphs: [
      "Astrological compatibility is the traditional practice of comparing two people's astrology to see how their themes fit together. The simplest form compares Sun signs. Fuller methods compare whole birth charts (called synastry in Western astrology) or, in Vedic astrology, use the Guna Milan or Ashtakoota system, which scores matches using the Moon sign and nakshatra.",
      "This tool uses the simplest method, a comparison of two Sun signs. It suits you if you are curious how two signs traditionally relate, for a partner, friend, family member or colleague. It gives a written reading and no score.",
    ],
  },
  {
    heading: "How Does the Compatibility Tool Work?",
    list: [
      "Enter a name and a date of birth for each person.",
      "The tool works out each person's Sun sign from the birth date, then compares the two signs' elements and the aspect between them.",
      "You see the two signs, the aspect, the element pairing and a short traditional reading of each, plus a few conversation starters.",
    ],
    ordered: true,
  },
  {
    heading: "Which Details Are Used?",
    list: [
      "Date of birth (day, month and year) is the only detail that affects the result. It decides each person's Sun sign.",
      "Names are shown on the result page and do not change the result.",
      "The tool does not ask for birth time or place, and it does not use numerology, Moon signs or any birth chart.",
    ],
    after: ["Your entries are processed in your browser. This tool does not send them to MyBhagya Astro's servers and does not use AI."],
  },
  {
    heading: "How Is the Compatibility Result Calculated?",
    paragraphs: [
      "There are two steps, and both are simple rules rather than a score.",
    ],
    list: [
      "Element pairing. Each sign belongs to Fire, Earth, Air or Water. Two signs of the same element, or Fire with Air, or Earth with Water, are treated as traditionally harmonious. Every other pairing (Fire with Earth, Fire with Water, Earth with Air, Air with Water) is treated as traditionally contrasting.",
      "Aspect. The twelve signs sit in a circle. Counting the signs between the two people, from 0 to 6 apart, gives the aspect shown in the table.",
    ],
    table: {
      caption: "Signs apart and the traditional aspect",
      head: ["Signs apart", "Aspect", "Traditional tone"],
      rows: [
        ["0", "Same sign", "Mirror"],
        ["1", "Neighbouring signs", "Different but close"],
        ["2", "Sextile", "Supportive"],
        ["3", "Square", "Dynamic"],
        ["4", "Trine", "Flowing"],
        ["5", "Quincunx", "Needs adjustment"],
        ["6", "Opposition", "Magnetic opposites"],
      ],
    },
    after: [
      "Worked example: Aries and Libra. Aries is the first sign and Libra the seventh, so they are 6 apart, an opposition. Aries is Fire and Libra is Air, a harmonious element pairing. The reading therefore describes magnetic opposites with an energising element mix.",
      "The tool deliberately gives no percentage. No recognised formula turns two Sun signs into a single number, so a score would look precise without being meaningful. The written readings are fixed text, so every pair of the same two signs sees the same reading.",
    ],
  },
  {
    heading: "How to Understand the Result",
    list: [
      "Aspect: the traditional relationship between the two signs. Flowing and supportive describe an easy fit, dynamic and contrasting describe friction that can drive growth, and none of these is better or worse than the others.",
      "Element pairing: a short note on how the two elements traditionally meet. \"Contrasting\" means different approaches, not a poor match.",
      "Conversation starters: general questions for you both, the same for every pair. They are not part of the astrological result.",
    ],
    after: [
      "Treat the reading as something to talk about together. Real relationships depend on communication, values, timing and effort far more than on two Sun signs, and a Sun sign pairing cannot tell you whether a relationship will last.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Why is there no compatibility percentage?",
    answer:
      "Because no accepted method produces a meaningful percentage from two Sun signs. Showing a number would suggest a precision the method does not have.",
  },
  {
    question: "Is this the Vedic Guna Milan (Ashtakoota) match?",
    answer:
      "No. Guna Milan uses the Moon sign and nakshatra from a calculated chart and gives a score out of 36. This tool compares Western Sun signs only and does not calculate either.",
  },
  {
    question: "Do the names I enter matter?",
    answer: "No. Names are only displayed. The result depends only on the two dates of birth.",
  },
  {
    question: "Can two people with a \"contrasting\" pairing be happy together?",
    answer:
      "Of course. The wording describes traditional symbolism, not what will happen. Many people value the differences between them.",
  },
  {
    question: "Can I use it for free?",
    answer: "Yes. The Compatibility tool is one of MyBhagya Astro's free tools and needs no sign-in.",
  },
];

const DISCLAIMER =
  "Compatibility readings are offered for personal interest, cultural exploration and reflection. They describe traditional symbolism, are not scientifically proven, and are not predictions or relationship advice.";

export default function CompatibilityEducation() {
  return <EducationSection idPrefix="compat" title="About the Compatibility Tool" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
