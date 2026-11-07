import prisma from "../../prisma.js";

/**
 * Seeds launch-content astrologer profiles so the public directory and home page have
 * something real to show before genuine applications have been approved. Each one is a
 * full, real pipeline row (a User + an APPROVED AstrologerApplication + a published
 * AstrologerProfile) — not a special-cased "fake" code path — so the exact same public
 * API, admin screens and approval machinery serve them as any genuinely approved
 * astrologer. The only marker is `isDemo: true` on the profile, kept purely so these rows
 * stay identifiable/removable later as real supply grows; nothing in the public API or
 * frontend currently treats isDemo specially (per instruction: show them like any other
 * listing).
 *
 * Idempotent — every write is an upsert keyed by email/attemptNumber/applicationId, safe
 * to re-run. Slugs intentionally match frontend/src/data/astrologers.ts's existing demo
 * entries, so any links already shared to /astrologers/<slug> keep working once the
 * frontend switches from that static file to this real data.
 *
 *   npm run db:seed:astrologer-demo
 */

interface DemoAstrologer {
  slug: string;
  name: string;
  photoPath: string;
  expertise: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  consultations: number;
  pricePerMin: number;
  about: string;
}

const DEMO_ASTROLOGERS: DemoAstrologer[] = [
  {
    slug: "acharya-vihaan-sharma",
    name: "Acharya Vihaan Sharma",
    photoPath: "/images/astrologers/baba3.png",
    expertise: ["Vedic Astrology", "Horoscope Analysis", "Career Guidance"],
    languages: ["Hindi", "English", "Sanskrit"],
    experienceYears: 15,
    rating: 4.8,
    consultations: 12000,
    pricePerMin: 10,
    about: "Focuses on reading the Janma Kundali: Lagna, Chandra Rashi, Nakshatra and the Vimshottari dasha, and explaining them in plain language.",
  },
  {
    slug: "ananya-iyer",
    name: "Ananya Iyer",
    photoPath: "/images/astrologers/female1.png",
    expertise: ["Tarot Reading", "Relationship Guidance"],
    languages: ["English", "Hindi", "Tamil"],
    experienceYears: 8,
    rating: 4.7,
    consultations: 6400,
    pricePerMin: 5,
    about: "Uses tarot as a way to reflect on relationships and decisions, with a calm, non-predictive approach.",
  },
  {
    slug: "pandit-kishore-joshi",
    name: "Pandit Kishore Joshi",
    photoPath: "/images/astrologers/baba2.png",
    expertise: ["Prashna Astrology", "Vedic Astrology", "Palmistry"],
    languages: ["Hindi", "Marathi", "English"],
    experienceYears: 22,
    rating: 4.9,
    consultations: 21000,
    pricePerMin: 10,
    about: "Answers specific questions through Prashna (horary) astrology and supports them with palm reading.",
  },
  {
    slug: "dr-meera-kulkarni",
    name: "Dr. Meera Kulkarni",
    photoPath: "/images/astrologers/female2.png",
    expertise: ["Numerology", "Face Reading", "Horoscope Analysis"],
    languages: ["English", "Hindi", "Gujarati"],
    experienceYears: 11,
    rating: 4.6,
    consultations: 4800,
    pricePerMin: 5,
    about: "Works with name and birth-date numerology and face reading, explaining each step of the working.",
  },
  {
    slug: "swami-aditya-rao",
    name: "Swami Aditya Rao",
    photoPath: "/images/astrologers/baba1.png",
    expertise: ["Vedic Astrology", "Relationship Guidance", "Career Guidance"],
    languages: ["Hindi", "English", "Kannada", "Telugu"],
    experienceYears: 18,
    rating: 4.8,
    consultations: 15500,
    pricePerMin: 10,
    about: "Looks at marriage and career timing through the dasha periods, with attention to what the chart can and cannot say.",
  },
];

async function seedOne(d: DemoAstrologer) {
  const email = `demo.${d.slug}@mybhagya.demo`;
  const [firstName, ...rest] = d.name.replace(/^(acharya|pandit|dr\.?|swami)\s+/i, "").split(" ");

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstName: firstName ?? d.name,
      lastName: rest.join(" ") || null,
      isActive: true,
      isEmailVerified: true,
      profileCompleted: true,
    },
  });

  const application = await prisma.astrologerApplication.upsert({
    where: { userId_attemptNumber: { userId: user.id, attemptNumber: 1 } },
    update: {
      fullLegalName: d.name,
      displayName: d.name,
      email,
      bio: d.about,
      yearsOfExperience: d.experienceYears,
      languages: d.languages,
      profilePhotoUrl: d.photoPath,
      status: "APPROVED",
    },
    create: {
      userId: user.id,
      attemptNumber: 1,
      status: "APPROVED",
      fullLegalName: d.name,
      displayName: d.name,
      email,
      bio: d.about,
      yearsOfExperience: d.experienceYears,
      languages: d.languages,
      profilePhotoUrl: d.photoPath,
      submittedAt: new Date(),
      lockedAt: new Date(),
    },
  });

  await prisma.astrologerProfile.upsert({
    where: { applicationId: application.id },
    update: {
      displayName: d.name,
      bio: d.about,
      profilePhotoUrl: d.photoPath,
      yearsOfExperience: d.experienceYears,
      languages: d.languages,
      specialtyLabels: d.expertise,
      pricePerMinute: d.pricePerMin,
      rating: d.rating,
      consultationsCount: d.consultations,
      isPublished: true,
      publishedAt: new Date(),
      isDemo: true,
    },
    create: {
      applicationId: application.id,
      userId: user.id,
      slug: d.slug,
      displayName: d.name,
      bio: d.about,
      profilePhotoUrl: d.photoPath,
      yearsOfExperience: d.experienceYears,
      languages: d.languages,
      specialtyLabels: d.expertise,
      pricePerMinute: d.pricePerMin,
      rating: d.rating,
      consultationsCount: d.consultations,
      isPublished: true,
      publishedAt: new Date(),
      isDemo: true,
    },
  });

  console.log(`✓ ${d.name} (/astrologers/${d.slug})`);
}

async function main() {
  for (const d of DEMO_ASTROLOGERS) {
    await seedOne(d);
  }
  console.log(`\n✓ ${DEMO_ASTROLOGERS.length} demo astrologer profiles seeded and published.`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
