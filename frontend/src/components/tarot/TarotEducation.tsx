import EducationSection, { EducationBlock } from "@/components/EducationSection";
import { FEATURE_FAQS } from "@/data/featureFaqs";

const blocks: EducationBlock[] = [
  {
    heading: "What Is Tarot Reading?",
    paragraphs: [
      "Tarot is a deck of illustrated cards used for reflection and storytelling. Each card carries traditional themes such as new beginnings, choices, endings or support. It is an aid for thinking a question through, not a way of proving what will happen.",
    ],
  },
  {
    heading: "How Does Tarot Drishti Work?",
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

const faqs = FEATURE_FAQS.tarot;

const DISCLAIMER =
  "Tarot Drishti is offered for personal interest and reflection. Readings are AI-written interpretations, not predictions, and not medical, legal, financial or relationship advice.";

export default function TarotEducation() {
  return <EducationSection idPrefix="tarot" title="About Tarot Drishti" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
