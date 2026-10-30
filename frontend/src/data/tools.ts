import { FEATURES } from "./featureCatalog";

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
    title: FEATURES.birthChart.name,
    description: FEATURES.birthChart.subtitle,
    image: "/images/tools/birth-chart.jpg",
    button: "Generate",
    path: "/birth-chart",
  },
  {
    title: FEATURES.tarot.name,
    description: FEATURES.tarot.subtitle,
    image: "/images/tools/tarot.jpg",
    button: "Try Now",
    path: "/tarot",
  },
  {
    title: FEATURES.compatibility.name,
    description: FEATURES.compatibility.subtitle,
    image: "/images/tools/compatibility.jpg",
    button: "Check Now",
    path: "/compatibility",
  },
  {
    title: FEATURES.palm.name,
    description: FEATURES.palm.subtitle,
    image: "/images/tools/palm-reading.jpg",
    button: "Analyze",
    path: "/palm-reading",
  },
  {
    title: FEATURES.numerology.name,
    description: FEATURES.numerology.subtitle,
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
