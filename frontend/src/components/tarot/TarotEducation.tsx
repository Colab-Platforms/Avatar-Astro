import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";

const blocks: EducationBlock[] = [
  {
    heading: "What Is Tarot Reading?",
    paragraphs: [
      "Tarot is a deck of 78 illustrated cards used for reflection and storytelling. Each card carries traditional themes such as new beginnings, choices, endings or support, and a reading places a few cards side by side so you can think about a question from several angles.",
      "People use tarot for personal interest, spiritual exploration and journaling. It is a tool for reflection rather than a way of proving what will happen. Tarot Experience suits you if you are curious about a life area such as career, love or health and want a thoughtful prompt to reflect on.",
    ],
  },
  {
    heading: "How Does Tarot Experience Work?",
    list: [
      "Choose a reading. Life Timeline Tarot looks at five points on a path, and Karma Mirror looks at three recurring patterns.",
      "For a Life Timeline reading, pick a life area such as Career, Love, Marriage, Business, Finance, Health or Life Purpose. Karma Mirror does not ask for a topic.",
      "Shuffle if you like, then pick the cards that draw you from the fanned deck. You choose five cards for a Life Timeline reading or three for Karma Mirror.",
      "Watch your cards turn over, then read the interpretation, which is written for exactly those cards in their positions.",
    ],
    ordered: true,
  },
  {
    heading: "How Are Tarot Cards Selected and Interpreted?",
    paragraphs: ["Here is what happens behind the scenes, so you know which parts are chance and which are generated text."],
    list: [
      "Selection is random. Each time the deck is shuffled, your browser mixes the 22 Major Arcana cards and fans out 20 of them face-down. You choose from those. The question you picked does not change which cards appear.",
      "Only the 22 Major Arcana cards (The Fool through The World) are drawn. The 56 Minor Arcana cards are not used in this experience, and cards are always read upright, never reversed.",
      "The same card can appear in a later reading, because every reading starts with a fresh shuffle. A single reading never contains the same card twice.",
      "The card names, your position labels and your life area are sent to an AI language model, which writes the interpretation. The AI is told to interpret only the cards you drew, in the positions you drew them, and not to give guaranteed outcomes, dates, scores or medical, legal or financial advice.",
      "The card meanings and the “Positive Aspects” and “Challenges” shown when you tap a card come from MyBhagya Astro's own card text. They are fixed and are not written by the AI.",
    ],
    after: [
      "The AI does not know your future, and it does not know you. It turns the card themes and your chosen life area into readable reflection. Two readings with the same cards can be worded differently.",
    ],
  },
  {
    heading: "How to Understand Your Tarot Reading",
    list: [
      "Your cards: tap a card to see its general meaning, its positive aspects and its challenges. Think of these as traditional themes rather than facts about you.",
      "Position labels: in a Life Timeline reading the five positions are Past Energy, Current Energy, Hidden Influence, Next 6 Months and Future Potential. They give each card a role in the story. The later positions describe themes to prepare for, not events that are certain to happen.",
      "Overall reading: a short summary that ties the cards together. Start here if the longer sections feel like a lot.",
      "The insight sections: what this means for you, what is helping you, what may be blocking you, a theme to prepare for and a suggested next step. Notice which ones feel true and which do not. Your own judgement matters most.",
      "Karma Mirror: here “karma” is used as a lens for recurring patterns in how you think and act. It is not a claim about past lives or fate. The action plan, reflection question and affirmation are prompts you can use or ignore.",
    ],
    after: [
      "A useful way to read a result is to write down the one sentence that stood out, then ask what small step it suggests. If something in a reading worries you, treat it as a prompt to talk with someone you trust, not as a prediction.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Do I need to enter personal details?",
    answer:
      "No. You do not enter your name, birth details or an account. For a Life Timeline reading you choose a life area, and you pick your cards. Only the chosen cards and life area are used to generate the reading.",
  },
  {
    question: "Is my reading saved?",
    answer:
      "No. The reading is shown on screen and is not stored on your account. If you leave the page or begin a new reading, the current result is gone.",
  },
  {
    question: "Why did I get a different reading with the same cards?",
    answer:
      "The card meanings are fixed, but the written interpretation is generated by an AI model, so its wording can vary between requests. The cards you drew are never changed.",
  },
  {
    question: "Can I use Tarot Experience for free?",
    answer: "Yes. Tarot Experience is one of MyBhagya Astro's free tools and does not ask for payment or sign-in.",
  },
  {
    question: "What should I do if I see an error?",
    answer:
      "Choose Try Again on the error screen. Your cards are kept, so you do not need to pick them again. If the problem continues, wait a minute, since readings are limited per minute, or begin a new reading.",
  },
];

const DISCLAIMER =
  "Tarot Experience is offered for personal interest, spiritual exploration and reflection. Readings are AI-written interpretations, not predictions or guarantees, and they are not medical, legal, financial or relationship advice.";

export default function TarotEducation() {
  return <EducationSection idPrefix="tarot" title="About Tarot Experience" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
