import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";

const blocks: EducationBlock[] = [
  {
    heading: "What Is Tarot Reading?",
    paragraphs: [
      "Tarot is a deck of illustrated cards used for reflection and storytelling. Each card carries traditional themes such as new beginnings, choices, endings or support. It is a tool for thinking a question through, not a way of proving what will happen.",
    ],
  },
  {
    heading: "How Does Tarot Experience Work?",
    list: [
      "Choose a reading: Life Timeline Tarot (five cards, with a life area such as Career or Love) or Karma Mirror (three cards).",
      "Shuffle if you like, then pick the cards that draw you from the fanned deck and watch them turn over.",
      "Read the interpretation written for exactly those cards in their positions. Tap any card to see its general meaning.",
    ],
    ordered: true,
    after: [
      "Selection is random: your browser shuffles the 22 Major Arcana cards and cards are always read upright. The card names, positions and life area are sent to an AI model, which writes the interpretation, so its wording can differ between readings.",
    ],
  },
  {
    heading: "How to Understand Your Reading",
    paragraphs: [
      "Treat the later positions as themes to prepare for, not events that are certain. In Karma Mirror, “karma” is a lens for recurring patterns, not a claim about past lives. Notice what feels true, and use the suggested steps or ignore them. Your own judgement matters most.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Do I need to enter personal details?",
    answer: "No. You only choose a life area (for Life Timeline) and your cards. No name, birth details or account are needed.",
  },
  {
    question: "Is my reading saved?",
    answer: "No. It is shown on screen only. If you leave the page or begin a new reading, the current result is gone.",
  },
  {
    question: "Why did the same cards give a different reading?",
    answer: "The card meanings are fixed, but the interpretation is written by an AI model, so its wording can vary. The cards you drew never change.",
  },
];

const DISCLAIMER =
  "Tarot Experience is offered for personal interest and reflection. Readings are AI-written interpretations, not predictions, and not medical, legal, financial or relationship advice.";

export default function TarotEducation() {
  return <EducationSection idPrefix="tarot" title="About Tarot Experience" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
