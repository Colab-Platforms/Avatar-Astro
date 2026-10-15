export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string;
  readTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: 'Understanding Your Moon Sign: The Hidden Self',
    excerpt: 'While your sun sign represents your core identity, your moon sign reveals your emotional landscape and innermost needs...',
    category: 'Beginner Astrology',
    date: '2024-01-15',
    image: '🌙',
    readTime: '5 min read',
  },
  {
    id: 2,
    title: 'Mercury Retrograde Survival Guide 2024',
    excerpt: 'Mercury retrograde can disrupt communication and technology, but with the right preparation, you can navigate it smoothly...',
    category: 'Celestial Events',
    date: '2024-01-12',
    image: '☿',
    readTime: '7 min read',
  },
  {
    id: 3,
    title: 'The 12 Houses: Your Cosmic Map Explained',
    excerpt: 'Each house in your birth chart represents a different area of life. Understanding them unlocks deeper self-knowledge...',
    category: 'Beginner Astrology',
    date: '2024-01-10',
    image: '🏠',
    readTime: '10 min read',
  },
  {
    id: 4,
    title: 'Venus in Capricorn: Love Gets Serious',
    excerpt: 'When Venus transits through Capricorn, relationships take on a more committed and practical tone...',
    category: 'Planetary Transits',
    date: '2024-01-08',
    image: '♀',
    readTime: '4 min read',
  },
  {
    id: 5,
    title: 'Full Moon Rituals for Each Zodiac Sign',
    excerpt: 'Harness the powerful energy of the full moon with rituals tailored to your unique astrological makeup...',
    category: 'Rituals & Practices',
    date: '2024-01-05',
    image: '🌕',
    readTime: '8 min read',
  },
  {
    id: 6,
    title: 'Saturn Return: Your Cosmic Coming of Age',
    excerpt: 'Around ages 28-30, Saturn returns to its natal position, marking a pivotal time of growth and responsibility...',
    category: 'Life Cycles',
    date: '2024-01-02',
    image: '♄',
    readTime: '6 min read',
  },
];
