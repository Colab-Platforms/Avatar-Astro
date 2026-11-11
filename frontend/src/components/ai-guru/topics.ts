import { Briefcase, Compass, Flower2, HeartHandshake, Leaf, type LucideIcon } from "lucide-react";

export interface GuruTopic {
  id: string;
  /** Key under guru.topic in the dictionaries (title, s1, s2 are the visible texts). */
  tkey: string;
  /** English title: also what the model is told, so the prompt is the same in every language. */
  title: string;
  icon: LucideIcon;
  /** Soft background tint for the card (Bhagya palette: cream, blush, sage, lavender, pale gold). */
  tint: string;
  /** Border and icon accent for the card. */
  accent: string;
  /** Example questions the user can start from (they fill the composer, never send by themselves). */
  starters: string[];
  /** Added to the model's instructions so the answer stays in this area. It adds no facts and no calculations. */
  hint: string;
}

export const GURU_TOPICS: GuruTopic[] = [
  {
    id: "career",
    tkey: "career",
    title: "Career & Finance",
    icon: Briefcase,
    tint: "#F7EBD0",
    accent: "#B7791F",
    starters: ["I feel stuck in my career. How should I think about my next step?", "How can I approach money decisions with more calm?"],
    hint: "The user wants to talk about work, career direction and money. Offer reflective, practical perspective. Do not give financial, investment or legal advice.",
  },
  {
    id: "relationships",
    tkey: "relationships",
    title: "Relationships",
    icon: HeartHandshake,
    tint: "#F8E3E0",
    accent: "#A8473C",
    starters: ["I am having conflict in my relationship. How can I approach it?", "How can I bring more understanding into my family life?"],
    hint: "The user wants to talk about relationships, marriage, family or compatibility concerns. Be warm and non-judgemental, and do not predict outcomes about a person.",
  },
  {
    id: "health",
    tkey: "health",
    title: "Health",
    icon: Leaf,
    tint: "#E4EEDD",
    accent: "#4F7A3B",
    starters: ["I feel drained lately. How can I bring more balance into my day?", "What simple routines support a calmer mind?"],
    hint: "The user wants to talk about general wellbeing and life balance. Offer gentle lifestyle and mindfulness perspective only. Never diagnose, treat or advise on medical conditions; suggest a qualified professional for health concerns.",
  },
  {
    id: "spiritual",
    tkey: "spiritual",
    title: "Spiritual Growth",
    icon: Flower2,
    tint: "#ECE5F3",
    accent: "#6B4E8C",
    starters: ["How can I begin a simple daily spiritual practice?", "What does karma mean for the choices I make today?"],
    hint: "The user wants to talk about personal growth, karma and inner reflection. Draw on Vedic and Indian traditions as perspectives for reflection.",
  },
  {
    id: "life-path",
    tkey: "lifePath",
    title: "Life Path",
    icon: Compass,
    tint: "#FBF0D5",
    accent: "#8A5A12",
    starters: ["I am unsure about my direction in life. Where do I begin?", "How can I tell what truly matters to me?"],
    hint: "The user wants to talk about direction, purpose and life decisions. Help them reflect with questions and perspective. Do not predict their future.",
  },
];

export const getTopic = (id: string | null | undefined): GuruTopic | null => GURU_TOPICS.find((t) => t.id === id) ?? null;
