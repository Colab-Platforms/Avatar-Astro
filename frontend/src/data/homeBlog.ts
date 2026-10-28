/**
 * The four articles shown on the homepage. Copy, dates and read times are taken
 * as-is from the published site. The separate /blog page keeps using blogPosts.
 */
export interface HomeBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  /** ISO date, as published. */
  date: string;
  readTime: string;
  image: string;
  imageAlt: string;
  /** CSS object-position for the 16:9 crop. */
  focus: string;
}

export const homeBlogPosts: HomeBlogPost[] = [
  {
    slug: "how-to-read-your-birth-chart",
    title: "How to Read Your Birth Chart: Planets, Signs and Houses",
    excerpt:
      "A birth chart looks complicated until you see that it answers three simple questions: what, how and where. Start there.",
    category: "Astrology Basics",
    date: "2026-10-24",
    readTime: "3 min read",
    image: "/images/blog/birth-chart-guide.jpg",
    imageAlt: "A printed natal chart on a table beside a lit candle",
    focus: "50% 55%",
  },
  {
    slug: "moon-signs-explained",
    title: "Moon Signs Explained: Understanding Your Emotional World",
    excerpt:
      "Your Sun sign is how you shine; your Moon sign is how you feel at home in yourself. Here is how to read it.",
    category: "Moon & Emotions",
    date: "2026-10-24",
    readTime: "3 min read",
    image: "/images/blog/moon-signs.jpg",
    imageAlt: "A full moon against a dark night sky",
    focus: "50% 40%",
  },
  {
    slug: "the-12-houses-of-astrology",
    title: "The 12 Houses of Astrology: A Beginner's Guide",
    excerpt:
      "If signs describe style and planets describe drives, houses describe the stage on which it all happens: twelve areas of everyday life.",
    category: "Astrology Basics",
    date: "2026-10-24",
    readTime: "2 min read",
    image: "/images/blog/twelve-houses.jpg",
    imageAlt: "Hands holding an open astrology book showing zodiac symbols",
    focus: "50% 45%",
  },
  {
    slug: "mercury-retrograde-meaning-and-myths",
    title: "Mercury Retrograde: Meaning, Myths and Practical Guidance",
    excerpt:
      "Mercury never actually reverses. Here is what the apparent backward motion is, what astrologers read into it, and a calmer way to plan around it.",
    category: "Planetary Transits",
    date: "2026-10-24",
    readTime: "2 min read",
    image: "/images/blog/mercury-retrograde.jpg",
    imageAlt: "A telescope on a tripod under the Milky Way at night",
    focus: "50% 50%",
  },
];
