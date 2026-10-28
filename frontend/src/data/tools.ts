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
      "Discover relationship compatibility using advanced astrology matching.",
    image: "/images/tools/compatibility.jpg",
    button: "Check Now",
    path: "/compatibility",
  },
  {
    title: "Palm Reading",
    description:
      "Upload your palm and receive an AI-generated palm analysis.",
    image: "/images/tools/palm-reading.jpg",
    button: "Analyze",
    path: "/palm-reading",
  },
  {
    title: "Cosmic Blueprint",
    description:
      "Explore name and birth-date numerology insights into your personality and life journey.",
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
