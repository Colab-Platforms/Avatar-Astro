import { FEATURES, LUCKY_VEHICLE_FEATURE, MUHURAT_FEATURE } from "./featureCatalog";
import { BABY_NAME_FEATURE } from "@/features/babyName/feature";

export interface AstrologyTool {
  title: string;
  description: string;
  /** Path under /public. */
  image: string;
  /** CSS object-position for the card photo (default: centre). Used where the artwork is taller than the card. */
  imagePosition?: string;
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
    image: "/images/tools/hasta-rekha-palmistry.webp",
    imagePosition: "center 62%", // the artwork is portrait: keep the palm and all five labels in the card frame
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
  {
    title: BABY_NAME_FEATURE.name,
    description: BABY_NAME_FEATURE.subtitle,
    image: "/images/tools/baby-name-card.png",
    button: "Find a Name",
    path: BABY_NAME_FEATURE.path,
  },
  {
    title: LUCKY_VEHICLE_FEATURE.name,
    description: LUCKY_VEHICLE_FEATURE.subtitle,
    image: "/images/tools/lucky-vehicle-card.png",
    button: "Find My Number",
    path: LUCKY_VEHICLE_FEATURE.path,
  },
  {
    title: MUHURAT_FEATURE.name,
    description: "Explore suitable dates and timings for important events based on Hindu Panchang.",
    image: "/images/tools/muhurat-finder-card.png",
    button: "Find a Muhurat",
    path: MUHURAT_FEATURE.path,
  },
];
