export interface AstrologyTool {
  title: string;
  description: string;
  /** Path under /public. */
  image: string;
  button: string;
  path: string;
}

export const tools: AstrologyTool[] = [
  {
    title: "Birth Chart",
    description:
      "Enter your birth date to see your Sun sign, Life Path number and a written profile of traditional themes.",
    image: "/placeholders/Birth-Chart.webp",
      "Generate your complete birth chart with detailed astrological insights.",
    image: "/images/tools/birth-chart.jpg",
    button: "Generate",
    path: "/birth-chart",
  },
  {
    title: "AI Tarot Reading",
    description:
      "Receive AI-powered tarot guidance for love, career, finance, and life's important decisions.",
    image: "/images/tools/tarot.jpg",
    button: "Try Now",
    path: "/tarot",
  },
  {
    title: "Compatibility",
    description:
      "Compare two Sun signs to see how their elements and aspects traditionally fit together.",
    image: "/placeholders/Compatibility.webp",
      "Discover relationship compatibility using advanced astrology matching.",
    image: "/images/tools/compatibility.jpg",
    button: "Check Now",
    path: "/compatibility",
  },
  {
    title: "Palm Reading",
    description:
      "Upload a palm photo or use your camera to find your hand shape: Earth, Air, Water or Fire.",
    image: "/placeholders/Palm-Reading.webp",
      "Upload your palm and receive an AI-generated palm analysis.",
    image: "/images/tools/palm-reading.jpg",
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
