export interface AstrologyTool {
  title: string;
  description: string;
  /** Path under /public — swap these files for final artwork, no code changes needed. */
  image: string;
  button: string;
  path: string;
}

export const tools: AstrologyTool[] = [
  {
    title: "AI Tarot Reading",
    description:
      "Receive AI-powered tarot guidance for love, career, finance, and life's important decisions.",
    image: "/placeholders/tarot-card.webp",
    button: "Try Now",
    path: "/tarot",
  },
  {
    title: "Birth Chart",
    description:
      "Enter your birth date to see your Sun sign, Life Path number and a written profile of traditional themes.",
    image: "/placeholders/Birth-Chart.webp",
    button: "Generate",
    path: "/birth-chart",
  },
  {
    title: "Compatibility",
    description:
      "Compare two Sun signs to see how their elements and aspects traditionally fit together.",
    image: "/placeholders/Compatibility.webp",
    button: "Check Now",
    path: "/compatibility",
  },
  {
    title: "Palm Reading",
    description:
      "Upload a palm photo or use your camera to find your hand shape: Earth, Air, Water or Fire.",
    image: "/placeholders/Palm-Reading.webp",
    button: "Analyze",
    path: "/palm-reading",
  },
  {
    title: "Cosmic Blueprint",
    description:
      "Calculate your name and birth-date numbers, with every step of the working shown.",
    image: "/placeholders/Cosmic-Blueprint.webp",
    button: "Explore Now",
    path: "/name-destiny-report",
  },
  {
    title: "Daily Horoscope",
    description:
      "Read personalized daily horoscope predictions based on your zodiac sign.",
    image: "/placeholders/Daily-horoscope.webp",
    button: "Read Now",
    path: "/horoscopes",
  },
];
