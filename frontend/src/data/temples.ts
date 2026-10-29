export interface Puja {
  id: string;
  name: string;
  price: number;
  duration: string;
  benefits: string[];
}

export interface Temple {
  id: string;
  slug: string;
  name: string;
  location: string;
  state: string;
  deity: string;
  description: string;
  priceFrom: number;
  gradient: string;
  image?: string; // filename under /images/temples/
}

export interface Offering {
  id: string;
  name: string;
  price: number;
  icon: string;
}

export const offerings: Offering[] = [
  { id: 'flowers',  name: 'Flowers',    price: 51,  icon: '🌸' },
  { id: 'coconut',  name: 'Coconut',    price: 31,  icon: '🥥' },
  { id: 'fruits',   name: 'Fruits',     price: 101, icon: '🍎' },
  { id: 'saree',    name: 'Saree',      price: 501, icon: '🧣' },
  { id: 'oil',      name: 'Sacred Oil', price: 71,  icon: '🪔' },
  { id: 'prasad',   name: 'Prasad',     price: 151, icon: '🍬' },
  { id: 'donation', name: 'Donation',   price: 251, icon: '🙏' },
];

export const temples: (Temple & { pujas: Puja[] })[] = [
  {
    id: '1',
    slug: 'tirupati-balaji',
    name: 'Tirupati Balaji',
    location: 'Tirumala, Tirupati',
    state: 'Andhra Pradesh',
    deity: 'Lord Venkateswara',
    description: "One of the world's most visited religious sites, perched atop the sacred Tirumala hills.",
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #2D1B69 0%, #6B3FA0 50%, #592209 100%)',
    image: 'tirupati-balaji.png',
    pujas: [
      {
        id: 'p1',
        name: 'Suprabhatam Seva',
        price: 300,
        duration: '30 min',
        benefits: ['Divine awakening blessings', 'Morning darshan priority', 'Spiritual energy renewal', 'Ancestral peace'],
      },
      {
        id: 'p2',
        name: 'Abhishekam',
        price: 750,
        duration: '45 min',
        benefits: ['Purification of soul', 'Health & longevity', 'Removal of past karma', 'Divine grace'],
      },
      {
        id: 'p3',
        name: 'Sahasra Deepalankara Seva',
        price: 1200,
        duration: '1 hr',
        benefits: ['Illumination of consciousness', 'Prosperity & wealth', 'Marital harmony', 'Family blessings'],
      },
    ],
  },
  {
    id: '2',
    slug: 'kashi-vishwanath',
    name: 'Kashi Vishwanath',
    location: 'Varanasi',
    state: 'Uttar Pradesh',
    deity: 'Lord Shiva',
    description: 'The most sacred Shiva temple, situated on the western bank of the holy Ganges river.',
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #1A1A2E 0%, #4A2C6A 50%, #7B3D8A 100%)',
    image: 'kashi-vishwanath.png',
    pujas: [
      {
        id: 'p1',
        name: 'Rudrabhishek',
        price: 501,
        duration: '45 min',
        benefits: ['Removal of negativity', 'Protection from evil', 'Health restoration', 'Moksha blessings'],
      },
      {
        id: 'p2',
        name: 'Ganga Aarti Participation',
        price: 251,
        duration: '1 hr',
        benefits: ['Spiritual upliftment', 'Liberation of ancestors', 'Inner peace', 'Cosmic alignment'],
      },
      {
        id: 'p3',
        name: 'Laghu Rudrabhishek',
        price: 1100,
        duration: '2 hrs',
        benefits: ['Complete Shiva blessings', 'Marriage harmony', 'Business success', 'Longevity'],
      },
    ],
  },
  {
    id: '3',
    slug: 'shirdi-sai-baba',
    name: 'Shirdi Sai Baba',
    location: 'Shirdi',
    state: 'Maharashtra',
    deity: 'Sai Baba',
    description: 'The revered abode of Sai Baba, drawing millions seeking miracles and divine grace.',
    priceFrom: 50,
    gradient: 'linear-gradient(135deg, #1B3A4B 0%, #2D6A4F 50%, #52B788 100%)',
    image: 'shirdi-sai-baba.png',
    pujas: [
      {
        id: 'p1',
        name: 'Kakad Aarti',
        price: 200,
        duration: '30 min',
        benefits: ['Early morning divine blessings', 'Positive start to day', 'Protection', 'Mental clarity'],
      },
      {
        id: 'p2',
        name: 'Shej Aarti',
        price: 300,
        duration: '40 min',
        benefits: ['Evening divine grace', 'Peace before sleep', 'Dreams & visions', 'Family wellbeing'],
      },
      {
        id: 'p3',
        name: 'Satcharitra Parayan',
        price: 551,
        duration: '2 hrs',
        benefits: ['Life transformation', 'Faith strengthening', 'Miraculous solutions', 'Wish fulfillment'],
      },
    ],
  },
  {
    id: '4',
    slug: 'golden-temple',
    name: 'Golden Temple',
    location: 'Amritsar',
    state: 'Punjab',
    deity: 'Waheguru',
    description: 'The holiest Sikh shrine, Harmandir Sahib, glistening in gold amid the sacred Amrit Sarovar.',
    priceFrom: 51,
    gradient: 'linear-gradient(135deg, #7D4A00 0%, #C9840A 50%, #F0D060 100%)',
    image: 'golden-temple.png',
    pujas: [
      {
        id: 'p1',
        name: 'Amrit Sanchar',
        price: 501,
        duration: '2 hrs',
        benefits: ['Spiritual initiation', 'Divine connection', 'Community bond', 'Inner transformation'],
      },
      {
        id: 'p2',
        name: 'Ardas',
        price: 151,
        duration: '20 min',
        benefits: ['Divine petition', 'Collective prayer power', 'Protection', 'Gratitude offering'],
      },
    ],
  },
  {
    id: '5',
    slug: 'vaishno-devi',
    name: 'Vaishno Devi',
    location: 'Katra, Reasi',
    state: 'Jammu & Kashmir',
    deity: 'Mata Vaishno Devi',
    description: 'A sacred cave shrine in the Trikuta Mountains, the abode of the divine Mother Goddess.',
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #3D0C02 0%, #8B1A1A 50%, #C0392B 100%)',
    image: 'vaishno-devi.png',
    pujas: [
      {
        id: 'p1',
        name: 'Charan Amrit',
        price: 251,
        duration: '30 min',
        benefits: ["Mother's divine blessings", 'Purification of past sins', 'Protection on journey', 'Wish fulfillment'],
      },
      {
        id: 'p2',
        name: 'Navratri Puja',
        price: 1001,
        duration: '3 hrs',
        benefits: ['Nine forms of Durga blessings', 'Business prosperity', 'Victory over enemies', 'Spiritual power'],
      },
    ],
  },
  {
    id: '6',
    slug: 'somnath-temple',
    name: 'Somnath Temple',
    location: 'Prabhas Patan, Veraval',
    state: 'Gujarat',
    deity: 'Lord Shiva (Jyotirlinga)',
    description: "The first and foremost Jyotirlinga, standing as an eternal symbol of faith on Gujarat's coast.",
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #0D3348 0%, #1A6A8A 50%, #2AAABF 100%)',
    image: 'somnath-temple.png',
    pujas: [
      {
        id: 'p1',
        name: 'Jyotirlinga Abhishek',
        price: 1116,
        duration: '1 hr',
        benefits: ['Supreme Shiva blessings', 'Liberation from birth cycle', 'Protection from all evils', 'Cosmic consciousness'],
      },
      {
        id: 'p2',
        name: 'Sandhya Aarti',
        price: 501,
        duration: '45 min',
        benefits: ['Evening divine grace', 'Ocean blessings', 'Ancestral liberation', 'Inner cleansing'],
      },
    ],
  },
  {
    id: '7',
    slug: 'jagannath-puri',
    name: 'Jagannath Temple',
    location: 'Puri',
    state: 'Odisha',
    deity: 'Lord Jagannath',
    description: 'One of the Char Dhams, home to the world-famous Rath Yatra chariot festival each year.',
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #1A0033 0%, #4B0082 50%, #8B008B 100%)',
    image: 'jagannath-puri.png',
    pujas: [
      {
        id: 'p1',
        name: 'Mahaprasad Seva',
        price: 301,
        duration: '30 min',
        benefits: ['Sacred food blessed by Lord', 'Moksha guarantee', 'All sins forgiven', 'Divine nourishment'],
      },
      {
        id: 'p2',
        name: 'Rath Yatra Darshan',
        price: 1001,
        duration: '2 hrs',
        benefits: ['Char Dham completion equivalent', 'Rare divine vision', 'Complete liberation', 'Cosmic celebration'],
      },
    ],
  },
  {
    id: '8',
    slug: 'siddhivinayak',
    name: 'Siddhivinayak Temple',
    location: 'Prabhadevi, Mumbai',
    state: 'Maharashtra',
    deity: 'Lord Ganesha',
    description: "Mumbai's most celebrated Ganesha temple, granting success and removing obstacles for devotees.",
    priceFrom: 125,
    gradient: 'linear-gradient(135deg, #1A2A00 0%, #3D6B00 50%, #5C9E00 100%)',
    image: 'siddhivinayak.png',
    pujas: [
      {
        id: 'p1',
        name: 'Ganesh Puja',
        price: 501,
        duration: '45 min',
        benefits: ['Obstacle removal', 'New beginnings', 'Success in ventures', 'Intellect enhancement'],
      },
      {
        id: 'p2',
        name: 'Modak Naivedya',
        price: 251,
        duration: '20 min',
        benefits: ["Ganesha's sweet blessings", 'Joy & celebration', 'Family harmony', 'Academic success'],
      },
    ],
  },
  {
    id: '9',
    slug: 'mahakaleshwar',
    name: 'Mahakaleshwar',
    location: 'Ujjain',
    state: 'Madhya Pradesh',
    deity: 'Lord Shiva (Mahakal)',
    description: 'The only south-facing Jyotirlinga, where Bhasma Aarti with sacred ash is performed daily at dawn.',
    priceFrom: 250,
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2D2D2D 50%, #4A3000 100%)',
    image: 'mahakaleshwar.png',
    pujas: [
      {
        id: 'p1',
        name: 'Bhasma Aarti',
        price: 750,
        duration: '1 hr',
        benefits: ['Rare cosmic blessing at dawn', 'Victory over death', 'Supreme Shiva grace', 'Enlightenment'],
      },
      {
        id: 'p2',
        name: 'Shiva Abhishek',
        price: 500,
        duration: '45 min',
        benefits: ['Time blessing (Mahakal)', 'Protection from Kaal Sarpa', 'Eternal peace', 'Longevity'],
      },
    ],
  },
  {
    id: '10',
    slug: 'iskcon-vrindavan',
    name: 'ISKCON Vrindavan',
    location: 'Vrindavan',
    state: 'Uttar Pradesh',
    deity: 'Lord Krishna & Radha',
    description: "The grand ISKCON temple in Krishna's birthplace, a beacon of Vaishnava devotion worldwide.",
    priceFrom: 116,
    gradient: 'linear-gradient(135deg, #00264D 0%, #0052A3 50%, #1A8CFF 100%)',
    image: 'iskcon-vrindavan.png',
    pujas: [
      {
        id: 'p1',
        name: 'Tulsi Puja',
        price: 251,
        duration: '20 min',
        benefits: ['Purification of home', 'Devotion to Krishna', 'Health protection', 'Spiritual merit'],
      },
      {
        id: 'p2',
        name: 'Radha Krishna Abhishek',
        price: 1001,
        duration: '1 hr',
        benefits: ['Divine love blessings', 'Relationship harmony', 'Artistic talents', 'Joy & devotion'],
      },
      {
        id: 'p3',
        name: 'Maha Aarti',
        price: 501,
        duration: '45 min',
        benefits: ['Evening Krishna blessings', 'Bhakti intensification', 'Karmic cleansing', 'Divine music grace'],
      },
    ],
  },
];
