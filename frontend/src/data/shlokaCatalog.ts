/**
 * Curated, fixed set of well-known verses. The Sanskrit, transliteration, translation and
 * reference for each verse are stored together here, so the app never relies on an AI model to
 * recall or "write" a verse. The AI only chooses a verse by id and writes the personal reflection.
 *
 * Translations are short paraphrases for readability. Before relying on any verse for formal use,
 * compare it with an authentic edition.
 */
export interface Shloka {
  id: string;
  source: "Bhagavad Gita" | "Upanishads";
  reference: string;
  devanagari: string;
  transliteration: string;
  meaning: string;
  /** Short context note shown with the verse. */
  context: string;
  /** Used to help the model choose; also shown nowhere else. */
  themes: string[];
}

export const SHLOKAS: Shloka[] = [
  {
    id: "bg-2-47",
    source: "Bhagavad Gita",
    reference: "Chapter 2, Verse 47",
    devanagari: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    transliteration: "karmaṇy evādhikāras te mā phaleṣu kadācana |\nmā karma-phala-hetur bhūr mā te saṅgo 'stv akarmaṇi ||",
    meaning:
      "You have a right to your actions, but never to their fruits. Do not let the fruit of action be your motive, and do not be attached to inaction.",
    context: "Krishna advises Arjuna to give full effort to his duty without being bound to the outcome.",
    themes: ["career", "results", "effort", "anxiety about outcome", "exams", "work", "detachment"],
  },
  {
    id: "bg-2-48",
    source: "Bhagavad Gita",
    reference: "Chapter 2, Verse 48",
    devanagari: "योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",
    transliteration: "yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya |\nsiddhy-asiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate ||",
    meaning:
      "Established in yoga, perform your actions, letting go of attachment, and stay even-minded in success and failure. This evenness of mind is called yoga.",
    context: "Continuing the teaching on acting without attachment: balance in success and failure.",
    themes: ["failure", "success", "balance", "equanimity", "business", "setbacks", "stress"],
  },
  {
    id: "bg-2-14",
    source: "Bhagavad Gita",
    reference: "Chapter 2, Verse 14",
    devanagari: "मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",
    transliteration: "mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ |\nāgamāpāyino 'nityās tāṁs titikṣasva bhārata ||",
    meaning:
      "Contacts of the senses with their objects bring cold and heat, pleasure and pain. They come and go and do not last, so learn to bear them patiently.",
    context: "Krishna reminds Arjuna that painful and pleasant experiences are temporary.",
    themes: ["suffering", "loss", "grief", "difficult times", "patience", "change", "health struggles", "breakup"],
  },
  {
    id: "bg-6-5",
    source: "Bhagavad Gita",
    reference: "Chapter 6, Verse 5",
    devanagari: "उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",
    transliteration: "uddhared ātmanātmānaṁ nātmānam avasādayet |\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||",
    meaning:
      "Lift yourself up by your own effort and do not let yourself down. The self alone is the friend of the self, and the self alone can be its enemy.",
    context: "On self-mastery: the mind can be our greatest ally or our greatest obstacle.",
    themes: ["self-doubt", "low confidence", "motivation", "discipline", "self-worth", "habits", "depression feelings"],
  },
  {
    id: "bg-6-35",
    source: "Bhagavad Gita",
    reference: "Chapter 6, Verse 35",
    devanagari: "असंशयं महाबाहो मनो दुर्निग्रहं चलम्।\nअभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥",
    transliteration: "asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam |\nabhyāsena tu kaunteya vairāgyeṇa ca gṛhyate ||",
    meaning:
      "Without doubt the mind is restless and hard to control, but it can be steadied through steady practice and detachment.",
    context: "Arjuna admits the mind is hard to control; Krishna agrees and points to practice and detachment.",
    themes: ["restless mind", "overthinking", "focus", "meditation", "anxiety", "distraction", "sleep"],
  },
  {
    id: "bg-6-17",
    source: "Bhagavad Gita",
    reference: "Chapter 6, Verse 17",
    devanagari: "युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु।\nयुक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥",
    transliteration: "yuktāhāra-vihārasya yukta-ceṣṭasya karmasu |\nyukta-svapnāvabodhasya yogo bhavati duḥkha-hā ||",
    meaning:
      "For one who is moderate in eating and recreation, moderate in effort, and moderate in sleep and waking, yoga becomes a remover of sorrow.",
    context: "On balance in daily life as the foundation of a steady practice.",
    themes: ["health", "routine", "burnout", "work-life balance", "lifestyle", "sleep", "exhaustion"],
  },
  {
    id: "bg-9-22",
    source: "Bhagavad Gita",
    reference: "Chapter 9, Verse 22",
    devanagari: "अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥",
    transliteration: "ananyāś cintayanto māṁ ye janāḥ paryupāsate |\nteṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham ||",
    meaning:
      "To those who worship Me with single-minded devotion and are constantly steadfast, I bring what they lack and preserve what they have.",
    context: "A verse of assurance for those who are devoted and steady in their practice.",
    themes: ["faith", "security", "financial worry", "devotion", "trust", "uncertainty", "future fear"],
  },
  {
    id: "bg-2-40",
    source: "Bhagavad Gita",
    reference: "Chapter 2, Verse 40",
    devanagari: "नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते।\nस्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात्॥",
    transliteration: "nehābhikrama-nāśo 'sti pratyavāyo na vidyate |\nsvalpam apy asya dharmasya trāyate mahato bhayāt ||",
    meaning:
      "On this path no effort is wasted and there is no harmful result. Even a little of this practice protects one from great fear.",
    context: "Encouragement that small, sincere steps on a spiritual path are never lost.",
    themes: ["starting something new", "fear", "small steps", "spiritual practice", "discouragement", "beginning"],
  },
  {
    id: "bg-18-66",
    source: "Bhagavad Gita",
    reference: "Chapter 18, Verse 66",
    devanagari: "सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥",
    transliteration: "sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja |\nahaṁ tvā sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||",
    meaning:
      "Giving up all other supports, take refuge in Me alone. I will free you from all sins; do not grieve. (Traditions interpret this verse in different ways.)",
    context: "Often read as the Gita's closing invitation to surrender and trust.",
    themes: ["guilt", "regret", "surrender", "letting go", "overwhelm", "forgiveness", "grief"],
  },
  {
    id: "up-asato",
    source: "Upanishads",
    reference: "Brihadaranyaka Upanishad 1.3.28",
    devanagari: "असतो मा सद्गमय।\nतमसो मा ज्योतिर्गमय।\nमृत्योर्मामृतं गमय॥",
    transliteration: "asato mā sad gamaya |\ntamaso mā jyotir gamaya |\nmṛtyor mā amṛtaṁ gamaya ||",
    meaning: "Lead me from untruth to truth, from darkness to light, from death to immortality.",
    context: "A well-known prayer for clarity and inner light.",
    themes: ["confusion", "clarity", "lost", "dark period", "seeking truth", "direction", "purpose"],
  },
  {
    id: "up-satyam",
    source: "Upanishads",
    reference: "Taittiriya Upanishad 1.11",
    devanagari: "सत्यं वद। धर्मं चर।",
    transliteration: "satyaṁ vada | dharmaṁ cara |",
    meaning: "Speak the truth. Follow dharma (right conduct).",
    context: "Part of a teacher's instruction to a graduating student about how to live.",
    themes: ["honesty", "ethics", "integrity", "relationships", "conflict", "right conduct", "family duty"],
  },
];

export const SHLOKA_BY_ID: Record<string, Shloka> = Object.fromEntries(SHLOKAS.map((s) => [s.id, s]));
