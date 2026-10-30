// ── Types ──────────────────────────────────────────────────────────────────────
export type StreamCategory =
  | 'Jyotirlinga'
  | 'Shakti Peeth'
  | 'Ganesh Temple'
  | 'Sai Temple'
  | 'ISKCON'
  | 'South Indian';

export interface LiveTemple {
  id: string;
  slug: string;
  name: string;
  deity: string;
  city: string;
  state: string;
  category: StreamCategory;
  description: string;
  viewers: number;
  isLive: boolean;
  gradient: string;
  image?: string;
  darshanTimings: string;
  aartTimings: string[];
  website: string;
  youtubeChannelName: string;
  youtubeVideoId: string; // placeholder — swap with real embed IDs when partnered
}

export interface FamilyEvent {
  id: string;
  slug: string;
  title: string;
  family: string;
  type: 'Wedding' | 'Puja' | 'Naming Ceremony' | 'Birthday' | 'Anniversary' | 'Satyanarayan';
  city: string;
  viewers: number;
  isLive: boolean;
  scheduledAt?: string;
  gradient: string;
  isPrivate: boolean;
  description: string;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  isToday: boolean;
  category: 'darshan' | 'family';
  temple?: string;
}

export interface PrayerMessage {
  id: string;
  emoji: string;
  message: string;
  from: string;
  city: string;
  time: string;
}

// ── Temple data ────────────────────────────────────────────────────────────────
export const liveTemples: LiveTemple[] = [
  {
    id: 'siddhivinayak',
    slug: 'siddhivinayak',
    name: 'Siddhivinayak Temple',
    deity: 'Lord Ganesha',
    city: 'Mumbai',
    state: 'Maharashtra',
    category: 'Ganesh Temple',
    description: 'Shree Siddhivinayak Ganapati Mandir in Prabhadevi, Mumbai is one of the most revered Ganesha temples in India. Visited by over 25,000 devotees daily, it is believed Lord Siddhivinayak fulfils all wishes of his devotees who pray with a pure heart.',
    viewers: 12480,
    isLive: true,
    gradient: 'linear-gradient(135deg, #E8A458 0%, #D4844A 60%, #C47030 100%)',
    image: 'avatar-live/siddhivinayak.png',
    darshanTimings: '5:30 AM – 9:50 PM',
    aartTimings: [
      '5:30 AM – Kakad Aarti',
      '12:00 PM – Madhyan Aarti',
      '8:30 PM – Shej Aarti',
    ],
    website: 'https://www.siddhivinayak.org',
    youtubeChannelName: 'Siddhivinayak Temple Official',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'kashi-vishwanath',
    slug: 'kashi-vishwanath',
    name: 'Kashi Vishwanath',
    deity: 'Lord Shiva',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    category: 'Jyotirlinga',
    description: 'The sacred Kashi Vishwanath Temple stands on the western bank of the holy Ganga in Varanasi. One of the twelve Jyotirlingas, it is believed that a darshan here grants Moksha — liberation from the cycle of birth and death.',
    viewers: 24630,
    isLive: true,
    gradient: 'linear-gradient(135deg, #7B5EA7 0%, #9B7EC8 50%, #6A4E9A 100%)',
    image: 'avatar-live/kashi.png',
    darshanTimings: '3:00 AM – 11:00 PM',
    aartTimings: [
      '3:00 AM – Mangala Aarti',
      '7:00 AM – Bhog Aarti',
      '12:00 PM – Madhyan Aarti',
      '7:00 PM – Sandhya Aarti',
      '9:00 PM – Shrigang Aarti',
      '10:30 PM – Shayan Aarti',
    ],
    website: 'https://shrikashivishwanath.org',
    youtubeChannelName: 'Kashi Vishwanath Temple',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'tirupati-balaji',
    slug: 'tirupati-balaji',
    name: 'Tirupati Balaji',
    deity: 'Lord Venkateswara',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    category: 'South Indian',
    description: 'Shri Venkateswara Swami Temple atop the seven hills of Tirumala is the most visited religious site in the world. Lord Venkateswara, the Lord of Seven Hills, is believed to fulfil all the wishes of devotees who seek his grace.',
    viewers: 41200,
    isLive: true,
    gradient: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 50%, #1B4332 100%)',
    image: 'avatar-live/tirupati.png',
    darshanTimings: '6:00 AM – 9:00 PM',
    aartTimings: [
      '3:00 AM – Thiruvanandal',
      '6:00 AM – Viswaroopa Darshanam',
      '8:00 AM – Tomala Seva',
      '1:00 PM – Arjita Brahmotsavam',
      '6:00 PM – Dolotsavam',
      '9:00 PM – Ekantha Seva',
    ],
    website: 'https://tirumala.org',
    youtubeChannelName: 'SVBC TTD',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'shirdi-sai-baba',
    slug: 'shirdi-sai-baba',
    name: 'Shirdi Sai Baba',
    deity: 'Sai Baba',
    city: 'Shirdi',
    state: 'Maharashtra',
    category: 'Sai Temple',
    description: 'The Sai Baba Temple in Shirdi is one of the most visited pilgrimage sites in India. Sai Baba of Shirdi taught love, forgiveness and helping others. Devotees believe that sincere faith here manifests miracles in one\'s life.',
    viewers: 18750,
    isLive: true,
    gradient: 'linear-gradient(135deg, #C9A84C 0%, #E8C86C 50%, #B8943C 100%)',
    image: 'avatar-live/shirdi.png',
    darshanTimings: '4:00 AM – 11:30 PM',
    aartTimings: [
      '4:30 AM – Kakad Aarti',
      '12:00 PM – Madhyan Aarti',
      '6:00 PM – Dhoop Aarti',
      '9:00 PM – Shej Aarti',
    ],
    website: 'https://www.shrisaibabasansthan.org',
    youtubeChannelName: 'Shri Saibaba Sansthan Trust',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'mahakaleshwar',
    slug: 'mahakaleshwar',
    name: 'Mahakaleshwar',
    deity: 'Lord Shiva',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    category: 'Jyotirlinga',
    description: 'The Mahakaleshwar Jyotirlinga in Ujjain is the only south-facing Jyotirlinga in the world. The Bhasma Aarti performed with sacred ash at 4 AM is a unique and awe-inspiring ritual found nowhere else.',
    viewers: 8940,
    isLive: true,
    gradient: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #6B3410 100%)',
    image: 'avatar-live/mahakaleshwar.png',
    darshanTimings: '4:00 AM – 11:00 PM',
    aartTimings: [
      '4:00 AM – Bhasma Aarti',
      '7:00 AM – Naivedya',
      '10:30 AM – Mahabhog',
      '5:00 PM – Sandhya Aarti',
      '10:30 PM – Shayan Bhog',
    ],
    website: 'https://mahakaleshwar.nic.in',
    youtubeChannelName: 'Mahakaleshwar Temple',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'vaishno-devi',
    slug: 'vaishno-devi',
    name: 'Vaishno Devi',
    deity: 'Mata Vaishno Devi',
    city: 'Katra',
    state: 'Jammu & Kashmir',
    category: 'Shakti Peeth',
    description: 'Nestled in the Trikuta Mountains, the Vaishno Devi Temple is one of India\'s most sacred Shakti shrines. Mata Vaishno Devi is believed to call her devotees when they are spiritually ready for her darshan.',
    viewers: 15320,
    isLive: false,
    gradient: 'linear-gradient(135deg, #C0392B 0%, #E74C3C 50%, #922B21 100%)',
    image: 'avatar-live/vaishno.png',
    darshanTimings: '5:00 AM – 9:00 PM',
    aartTimings: [
      '5:00 AM – Pratah Aarti',
      '12:00 PM – Madhyan Aarti',
      '8:00 PM – Sandhya Aarti',
    ],
    website: 'https://www.maavaishnodevi.org',
    youtubeChannelName: 'Shri Mata Vaishno Devi Shrine Board',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'iskcon-vrindavan',
    slug: 'iskcon-vrindavan',
    name: 'ISKCON Vrindavan',
    deity: 'Radha Krishna',
    city: 'Vrindavan',
    state: 'Uttar Pradesh',
    category: 'ISKCON',
    description: 'The Krishna Balaram Mandir in Vrindavan is a magnificent temple of the International Society for Krishna Consciousness. Daily kirtan, aarti, and Bhagavad Gita discourses draw devotees from around the world to this divine abode.',
    viewers: 9870,
    isLive: true,
    gradient: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #0D47A1 100%)',
    image: 'avatar-live/iskcon.png',
    darshanTimings: '4:30 AM – 9:00 PM',
    aartTimings: [
      '4:30 AM – Mangal Aarti',
      '7:30 AM – Dhupa Aarti',
      '12:00 PM – Raj Bhoga Aarti',
      '4:00 PM – Utthapan',
      '6:30 PM – Sandhya Aarti',
      '8:30 PM – Shayan Aarti',
    ],
    website: 'https://iskconvrindavan.com',
    youtubeChannelName: 'ISKCON Desire Tree',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'somnath',
    slug: 'somnath',
    name: 'Somnath Temple',
    deity: 'Lord Shiva',
    city: 'Somnath',
    state: 'Gujarat',
    category: 'Jyotirlinga',
    description: 'The Somnath Temple, built on the shores of the Arabian Sea, is the first among the twelve Jyotirlingas of Lord Shiva. Rebuilt seven times after repeated destruction, it stands as a testament to eternal faith and devotion.',
    viewers: 7650,
    isLive: false,
    gradient: 'linear-gradient(135deg, #1A6B8A 0%, #2196A8 50%, #145A74 100%)',
    image: 'avatar-live/somnath.png',
    darshanTimings: '6:00 AM – 9:30 PM',
    aartTimings: [
      '7:00 AM – Pratah Aarti',
      '12:00 PM – Madhyan Aarti',
      '7:00 PM – Sandhya Aarti',
    ],
    website: 'https://somnath.org',
    youtubeChannelName: 'Somnath Temple Trust',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'jagannath-puri',
    slug: 'jagannath-puri',
    name: 'Jagannath Puri',
    deity: 'Lord Jagannath',
    city: 'Puri',
    state: 'Odisha',
    category: 'South Indian',
    description: 'The Jagannath Temple in Puri is one of the four sacred Char Dhams. Lord Jagannath, a form of Lord Vishnu, resides here with siblings Balabhadra and Subhadra. The famous annual Rath Yatra draws millions of devotees worldwide.',
    viewers: 11430,
    isLive: true,
    gradient: 'linear-gradient(135deg, #E67E22 0%, #F39C12 50%, #D35400 100%)',
    image: 'avatar-live/jagannath.png',
    darshanTimings: '5:00 AM – 12:00 AM',
    aartTimings: [
      '5:00 AM – Mangal Alati',
      '6:00 AM – Mailam',
      '10:00 AM – Ballav Dhupa',
      '1:00 PM – Madhyan Dhupa',
      '7:00 PM – Sandhya Dhupa',
      '9:00 PM – Chandanlagi',
    ],
    website: 'https://jagannath.nic.in',
    youtubeChannelName: 'Jagannath Temple Puri Official',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'kedarnath',
    slug: 'kedarnath',
    name: 'Kedarnath Temple',
    deity: 'Lord Shiva',
    city: 'Kedarnath',
    state: 'Uttarakhand',
    category: 'Jyotirlinga',
    description: 'Nestled in the Garhwal Himalayas at over 3,500 metres, Kedarnath is one of the twelve Jyotirlingas and part of the sacred Char Dham. The temple opens only for a few months each year, drawing lakhs of pilgrims who brave the mountain trek for darshan of Lord Shiva.',
    viewers: 6200,
    isLive: false,
    gradient: 'linear-gradient(135deg, #5C6B73 0%, #7B8A93 50%, #404E58 100%)',
    image: 'avatar-live/kedarnath.jpeg',
    darshanTimings: '6:00 AM – 3:00 PM, 5:00 PM – 9:00 PM (seasonal — open Akshaya Tritiya to Bhai Dooj)',
    aartTimings: [
      '4:00 AM – Mangal Aarti',
      '3:00 PM – Shringar Darshan',
      '7:00 PM – Sandhya Aarti',
    ],
    website: 'https://badrinath-kedarnath.gov.in',
    youtubeChannelName: 'Shri Badrinath Kedarnath Temple Committee (BKTC)',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'omkareshwar',
    slug: 'omkareshwar',
    name: 'Omkareshwar Temple',
    deity: 'Lord Shiva',
    city: 'Omkareshwar',
    state: 'Madhya Pradesh',
    category: 'Jyotirlinga',
    description: 'Set on Mandhata island where the Narmada river splits into a shape resembling the sacred "Om", Omkareshwar houses one of the twelve Jyotirlingas. The evening Narmada aarti on the riverbank is among the most serene rituals in the Jyotirlinga circuit.',
    viewers: 5400,
    isLive: false,
    gradient: 'linear-gradient(135deg, #3A6B7A 0%, #5C97A8 50%, #274C58 100%)',
    image: 'avatar-live/omkareshwar.jpeg',
    darshanTimings: '5:00 AM – 10:30 PM',
    aartTimings: [
      '5:00 AM – Prathah Aarti',
      '12:15 PM – Madhyan Bhog Aarti',
      '7:00 PM – Narmada Sandhya Aarti',
      '10:30 PM – Shayan Aarti',
    ],
    website: 'https://shriomkareshwar.org',
    youtubeChannelName: 'Shri Omkareshwar Jyotirlinga Official',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'trimbakeshwar',
    slug: 'trimbakeshwar',
    name: 'Trimbakeshwar Temple',
    deity: 'Lord Shiva',
    city: 'Trimbak, Nashik',
    state: 'Maharashtra',
    category: 'Jyotirlinga',
    description: 'Trimbakeshwar, near the source of the Godavari river, is unique among the Jyotirlingas for its three small lingas representing Brahma, Vishnu and Shiva. The Kushavarta Kund here is considered the origin point of the holy Godavari.',
    viewers: 4300,
    isLive: false,
    gradient: 'linear-gradient(135deg, #6B4F8A 0%, #8E6FB0 50%, #4A3763 100%)',
    image: 'avatar-live/trimbakeshwar.jpeg',
    darshanTimings: '5:30 AM – 9:00 PM',
    aartTimings: [
      '5:30 AM – Kakad Aarti',
      '12:00 PM – Madhyan Aarti',
      '7:30 PM – Sandhya Aarti',
    ],
    website: 'https://www.trimbakeshwartrust.com',
    youtubeChannelName: 'Shri Trimbakeshwar Devasthan Trust',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'ramanathaswamy',
    slug: 'ramanathaswamy',
    name: 'Ramanathaswamy Temple',
    deity: 'Lord Shiva',
    city: 'Rameswaram',
    state: 'Tamil Nadu',
    category: 'Jyotirlinga',
    description: 'On the island town of Rameswaram, the Ramanathaswamy Temple is both a Jyotirlinga and one of the four Char Dham sites. Legend holds that Lord Rama himself installed the lingam here, and the temple is renowned for its magnificent thousand-pillared corridor.',
    viewers: 7100,
    isLive: false,
    gradient: 'linear-gradient(135deg, #1F7A8C 0%, #3FA7BD 50%, #14545E 100%)',
    image: 'avatar-live/ramanathaswamy.jpeg',
    darshanTimings: '5:00 AM – 1:00 PM, 3:00 PM – 9:00 PM',
    aartTimings: [
      '5:00 AM – Palliyarai Deeparadhanai',
      '12:00 PM – Uchikala Pooja',
      '8:30 PM – Arthajama Pooja',
    ],
    website: 'https://rameswaramramanathar.hrce.tn.gov.in',
    youtubeChannelName: 'Ramanathaswamy Temple, Rameswaram',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'mallikarjuna',
    slug: 'mallikarjuna',
    name: 'Mallikarjuna Temple',
    deity: 'Lord Mallikarjuna (Shiva)',
    city: 'Srisailam',
    state: 'Andhra Pradesh',
    category: 'Jyotirlinga',
    description: 'Perched in the Nallamala Hills on the banks of the Krishna river, Srisailam is one of the rare sites revered as both a Jyotirlinga and a Shakti Peeth, with Lord Mallikarjuna and Goddess Bhramaramba worshipped together in the same temple complex.',
    viewers: 5800,
    isLive: false,
    gradient: 'linear-gradient(135deg, #8A5A2E 0%, #B57F42 50%, #5E3B1C 100%)',
    image: 'avatar-live/mallikarjuna.jpeg',
    darshanTimings: '4:30 AM – 10:00 PM',
    aartTimings: [
      '4:30 AM – Suprabhata Seva',
      '12:30 PM – Madhyahna Pooja',
      '8:30 PM – Ekanta Seva',
    ],
    website: 'https://www.srisailadevasthanam.org',
    youtubeChannelName: 'Srisaila Tv (Srisaila Devasthanam Official)',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'kamakhya',
    slug: 'kamakhya',
    name: 'Kamakhya Temple',
    deity: 'Goddess Kamakhya',
    city: 'Guwahati',
    state: 'Assam',
    category: 'Shakti Peeth',
    description: 'Atop Nilachal Hill overlooking the Brahmaputra, Kamakhya is one of the most revered Shakti Peeths in India, dedicated to the goddess of fertility and creation. The annual Ambubachi Mela draws devotees and tantric practitioners from across the country.',
    viewers: 9600,
    isLive: false,
    gradient: 'linear-gradient(135deg, #A5273D 0%, #D14459 50%, #7A1B2A 100%)',
    image: 'avatar-live/kamakhya.jpeg',
    darshanTimings: '5:30 AM – 10:00 PM',
    aartTimings: [
      '5:30 AM – Prathah Aarti',
      '1:00 PM – Madhyan Bhog',
      '7:00 PM – Sandhya Aarti',
    ],
    website: 'https://www.maakamakhya.org',
    youtubeChannelName: 'Kamakhya Devalaya Official Channel',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'ambaji',
    slug: 'ambaji',
    name: 'Ambaji Temple',
    deity: 'Goddess Amba (Arasuri Ambaji Mata)',
    city: 'Ambaji, Banaskantha',
    state: 'Gujarat',
    category: 'Shakti Peeth',
    description: 'Located near the Gujarat–Rajasthan border in the Aravalli hills, Ambaji is one of the 51 Shakti Peeths and, uniquely, has no idol — devotees worship a sacred visual yantra in place of a deity image. The temple is a major pilgrimage site during Navratri.',
    viewers: 6700,
    isLive: false,
    gradient: 'linear-gradient(135deg, #C9752E 0%, #E89A4D 50%, #9A5620 100%)',
    image: 'avatar-live/ambaji.jpeg',
    darshanTimings: '7:00 AM – 11:30 PM',
    aartTimings: [
      '7:00 AM – Prathah Aarti',
      '11:30 AM – Rajbhog Aarti',
      '7:30 PM – Sandhya Aarti',
    ],
    website: 'https://ambajitemple.in',
    youtubeChannelName: 'Ambaji Temple Official',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
  {
    id: 'jwala-ji',
    slug: 'jwala-ji',
    name: 'Jwala Ji Temple',
    deity: 'Goddess Jwalamukhi (Jwala Devi)',
    city: 'Jwalamukhi, Kangra',
    state: 'Himachal Pradesh',
    category: 'Shakti Peeth',
    description: 'In the Kangra valley of the Shivalik hills, Jwala Ji is a Shakti Peeth where the goddess is worshipped as an eternal flame burning naturally from the rock, with no idol enshrined. It is one of the most visited Shakti temples in North India.',
    viewers: 3900,
    isLive: false,
    gradient: 'linear-gradient(135deg, #B8452E 0%, #E06A45 50%, #832F1D 100%)',
    image: 'avatar-live/jwala-ji.jpeg',
    darshanTimings: '5:00 AM – 10:00 PM',
    aartTimings: [
      '5:00 AM – Prathah Aarti',
      '12:00 PM – Madhyan Bhog',
      '8:00 PM – Sandhya Aarti',
    ],
    website: 'http://kangratemples.hp.gov.in/shri-jawala-mata-mandir/',
    youtubeChannelName: 'Shri Jawala Mata Mandir, Kangra Temples',
    youtubeVideoId: 'kS5tPj8XJcI',
  },
];

// ── Family events ──────────────────────────────────────────────────────────────
export const familyEvents: FamilyEvent[] = [
  {
    id: 'sharma-wedding',
    slug: 'sharma-wedding',
    title: 'Priya & Rahul Wedding',
    family: 'Sharma Family',
    type: 'Wedding',
    city: 'Jaipur',
    viewers: 340,
    isLive: true,
    gradient: 'linear-gradient(135deg, #E91E8C 0%, #F06292 50%, #C2185B 100%)',
    isPrivate: false,
    description: 'A grand traditional Rajasthani wedding ceremony with full rituals.',
  },
  {
    id: 'gupta-satyanarayan',
    slug: 'gupta-satyanarayan',
    title: 'Satyanarayan Puja',
    family: 'Gupta Family',
    type: 'Satyanarayan',
    city: 'Delhi',
    viewers: 87,
    isLive: true,
    gradient: 'linear-gradient(135deg, #C9A84C 0%, #E8C86C 50%, #B8943C 100%)',
    isPrivate: true,
    description: 'Auspicious Satyanarayan Katha and puja performed by family pandit.',
  },
  {
    id: 'patel-naming',
    slug: 'patel-naming',
    title: 'Naamkaran Ceremony',
    family: 'Patel Family',
    type: 'Naming Ceremony',
    city: 'Ahmedabad',
    viewers: 124,
    isLive: false,
    scheduledAt: 'Today, 11:00 AM',
    gradient: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #388E3C 100%)',
    isPrivate: false,
    description: 'Naming ceremony for the newborn with traditional rituals and blessings.',
  },
  {
    id: 'singh-anniversary',
    slug: 'singh-anniversary',
    title: '25th Anniversary Puja',
    family: 'Singh Family',
    type: 'Anniversary',
    city: 'Chandigarh',
    viewers: 56,
    isLive: false,
    scheduledAt: 'Tomorrow, 6:00 PM',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 50%, #7B1FA2 100%)',
    isPrivate: true,
    description: 'Silver jubilee anniversary celebration with Ganesh puja and family gathering.',
  },
];

// ── Upcoming events ────────────────────────────────────────────────────────────
export const upcomingEvents: UpcomingEvent[] = [
  { id: 'upc-1', title: 'Mahakaleshwar Bhasma Aarti',   subtitle: 'Mahakaleshwar Temple · Ujjain',       time: '4:00 AM',    isToday: true,  category: 'darshan' },
  { id: 'upc-2', title: 'Siddhivinayak Kakad Aarti',    subtitle: 'Siddhivinayak Temple · Mumbai',       time: '5:30 AM',    isToday: true,  category: 'darshan' },
  { id: 'upc-3', title: 'Naamkaran Ceremony',           subtitle: 'Patel Family · Ahmedabad',            time: '11:00 AM',   isToday: true,  category: 'family'  },
  { id: 'upc-4', title: 'Kashi Vishwanath Sandhya Aarti', subtitle: 'Kashi Vishwanath · Varanasi',      time: '7:00 PM',    isToday: true,  category: 'darshan' },
  { id: 'upc-5', title: 'Sharma Family Wedding',         subtitle: 'Sharma Family · Jaipur',             time: '8:00 PM',    isToday: true,  category: 'family'  },
  { id: 'upc-6', title: 'Rudrabhishek Puja',            subtitle: 'Somnath Temple · Gujarat',            time: 'Tomorrow',   isToday: false, category: 'darshan' },
  { id: 'upc-7', title: 'Singh Anniversary Puja',       subtitle: 'Singh Family · Chandigarh',           time: 'Tomorrow',   isToday: false, category: 'family'  },
];

// ── Sample prayer wall ─────────────────────────────────────────────────────────

// ── Helpers ────────────────────────────────────────────────────────────────────
export const formatViewers = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};

export const streamCategories: StreamCategory[] = [
  'Jyotirlinga',
  'Shakti Peeth',
  'Ganesh Temple',
  'Sai Temple',
  'ISKCON',
  'South Indian',
];
