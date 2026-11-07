import { FEATURES } from "./featureCatalog";

export interface HomeFaq {
  question: string;
  answer: string;
}

/** The home page FAQ (five questions). Feature names come from the feature catalog so they stay in step with the approved names. */
export const homeFaqs: HomeFaq[] = [
  {
    question: "What can I explore on MyBhagya?",
    answer: `MyBhagya brings together Vedic astrology, spiritual wisdom and self-reflection. Explore your ${FEATURES.birthChart.name}, ${FEATURES.zodiac.name}, ${FEATURES.tarot.name}, ${FEATURES.palm.name}, ${FEATURES.numerology.name}, ${FEATURES.compatibility.name}, ${FEATURES.ratna.name}, ${FEATURES.futurePath.name}, ${FEATURES.shloka.name} and more.`,
  },
  {
    question: "Why should I trust astrology? Is it really accurate?",
    answer:
      "Vedic astrology is an ancient traditional system that reads planetary positions and links them to different parts of life. We try to explain these traditional ideas clearly. Astrology is not scientifically proven to predict the future, so treat a reading as food for reflection, not as a guaranteed fact.",
  },
  {
    question: "I am an atheist. Is MyBhagya still for me?",
    answer:
      "Absolutely. You don't need a religion or a belief in astrology to explore MyBhagya. You can enjoy the cultural knowledge, stories, life reflections, traditional calendar details and practical thoughts. Explore only what feels meaningful to you.",
  },
  {
    question: "Are my partner and I astrologically compatible?",
    answer: `${FEATURES.compatibility.name} compares the details of two people to show how well your signs match, and ${FEATURES.birthChart.name} can also show a traditional Guna Milan score for the two of you. Treat the result as something to talk about together, not a verdict on your relationship.`,
  },
  {
    question: "Why do people check their Kundali before marriage?",
    answer:
      "In Indian tradition, families compare the two birth charts, a practice called Kundali Milan, to see how well two people may get along. Many people follow it for cultural or family reasons. It is one input among many, and a good marriage also depends on understanding, respect and effort from both.",
  },
];
