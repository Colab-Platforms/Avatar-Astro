import EducationSection, { EducationBlock, EducationFaq } from "@/components/EducationSection";
import { SQUARE_PALM_MIN, LONG_FINGERS_MIN } from "@/lib/palmAnalysis/lineEstimator";

const blocks: EducationBlock[] = [
  {
    heading: "What Is Palm Reading?",
    paragraphs: [
      "Palm reading, or palmistry, is a traditional practice of interpreting the shape of the hand, the lines on the palm and the raised areas called mounts. It is found in many cultures, including the Indian tradition often called Hasta Samudrika Shastra.",
      "Palm reading is a belief system and is not scientifically proven. People use it for reflection and conversation. This Seva covers one small part of it, which is hand shape.",
    ],
  },
  {
    heading: "How Does Palm Reading Work on MyBhagya Astro?",
    list: [
      "Upload a photo of your palm or use your camera for a live scan.",
      "Your device detects your hand and finds 21 landmark points, such as your knuckles and fingertips.",
      "The Seva measures your palm's width and length, your finger lengths and your thumb angle from those points.",
      "From the measurements it works out your hand shape (Earth, Air, Water or Fire) and shows the traditional description of that shape, along with the numbers it used.",
    ],
    ordered: true,
    after: [
      "The Seva does not read the lines or marks on your palm, and it does not use AI to interpret your photo. The hand detection is a machine-learning model that runs in your browser, and everything after that is fixed rules and fixed text.",
    ],
  },
  {
    heading: "What Information or Images Are Required?",
    list: [
      "One photo of your palm, as a JPG, PNG or WebP file up to 10 MB. You can instead allow camera access for a live scan.",
      "A clear photo works best: the whole palm facing the camera, fingers slightly spread, even lighting, and the hand large enough in the frame.",
      "No name, birth details or account are needed.",
    ],
    after: [
      "Before measuring, the Seva checks that a hand is detected, the detection is confident, the image is not too blurry and the hand is not too small. If a check fails it tells you why and asks for another photo. A photo that is not an image, or is not a supported type or size, is turned away before anything is analysed.",
    ],
  },
  {
    heading: "How Are Palm Features Interpreted?",
    paragraphs: [
      `Your hand shape is classified with two measurements. The palm ratio is the palm's width divided by its length, and a ratio of ${SQUARE_PALM_MIN} or more counts as a square palm. The finger ratio is the average of your four finger lengths divided by the palm length, and a ratio of ${LONG_FINGERS_MIN} or more counts as long fingers.`,
    ],
    table: {
      caption: "Hand shape rules used by the Seva",
      head: ["Palm", "Fingers", "Hand shape"],
      rows: [
        ["Square", "Short", "Earth"],
        ["Square", "Long", "Air"],
        ["Long", "Long", "Water"],
        ["Long", "Short", "Fire"],
      ],
    },
    after: [
      "Worked example: a palm ratio of 0.90 is square, and a finger ratio of 0.74 is short, so the hand is classed as Earth. These cut-off points are the Seva's own simple rules based on the classical descriptions, and a hand near a cut-off can fall on either side depending on the photo.",
      "For background, palmistry traditionally links the heart line with emotion, the head line with thinking, the life line with vitality and the fate line with direction in work. This Seva does not detect or read any of them, and it does not interpret mounts.",
    ],
  },
  {
    heading: "How to Understand Your Reading",
    list: [
      "Hand shape: a traditional description of temperament. Treat it as one lens for reflection and keep what resonates.",
      "The measurements: the numbers that led to your hand shape. If they change when you take another photo, that is because of camera angle, finger spread or distance.",
      "Hand in the photo: whether you photographed a left or right hand. The Seva cannot tell which of your hands is dominant, and the reading is the same either way.",
    ],
    after: [
      "The reading does not describe your future, health, career or relationships, and it should not be used to make decisions about any of them.",
    ],
  },
];

const faqs: EducationFaq[] = [
  {
    question: "Is my photo uploaded or stored?",
    answer:
      "No. Your photo is processed in your browser and is not sent to MyBhagya Astro's servers. The first scan downloads the hand-detection model files from public content networks (jsDelivr and Google), so you need an internet connection for that step.",
  },
  {
    question: "Does it read my palm lines?",
    answer:
      "No. It detects your hand and measures its proportions to classify your hand shape. It does not detect or interpret the lines or marks on your palm.",
  },
  {
    question: "Why was my photo rejected?",
    answer:
      "The Seva needs to see a clear, well-lit palm that fills enough of the frame. Try a sharper photo with your whole hand visible and fingers slightly spread. Files that are not JPG, PNG or WebP images, or are larger than 10 MB, are not accepted.",
  },
  {
    question: "Why did another photo give a different hand shape?",
    answer:
      "The shape comes from measured proportions, and the angle of the camera or how far your fingers are spread can change them slightly. If your hand sits near a cut-off, the result can switch.",
  },
  {
    question: "Can I use Palm Reading for free?",
    answer: "Yes. Hasta Rekha is one of MyBhagya Astro's free Seva and needs no sign-in.",
  },
];

const DISCLAIMER =
  "Palm reading is offered for personal interest, cultural exploration and reflection. It is a traditional practice that is not scientifically proven, and the result is not a prediction, a medical assessment or professional advice.";

export default function PalmEducation() {
  return <EducationSection idPrefix="palm" title="About Hasta Rekha" blocks={blocks} faqs={faqs} disclaimer={DISCLAIMER} />;
}
