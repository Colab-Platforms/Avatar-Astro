import prisma from "../../prisma.js";

/**
 * Seeds everything the astrologer-onboarding domain needs before it can be used:
 *   - the ASTROLOGER Role row (granted to a user only on application approval — see
 *     astrologerAdmin.service.ts; nothing here grants it to anyone)
 *   - starter specialty options (editable afterward from SUPERADMIN → Astrologers → Settings)
 *   - starter document requirements (same — editable afterward, not hardcoded elsewhere)
 *
 * Idempotent: every write is an upsert, safe to re-run.
 *
 *   npm run db:seed:astrologer
 */

const SPECIALTIES: { key: string; label: string; sortOrder: number }[] = [
  { key: "vedic_astrology", label: "Vedic Astrology", sortOrder: 10 },
  { key: "tarot_reading", label: "Tarot Reading", sortOrder: 20 },
  { key: "numerology", label: "Numerology", sortOrder: 30 },
  { key: "palmistry", label: "Palmistry", sortOrder: 40 },
  { key: "vastu", label: "Vastu", sortOrder: 50 },
  { key: "lal_kitab", label: "Lal Kitab", sortOrder: 60 },
  { key: "kundali_analysis", label: "Kundali Analysis", sortOrder: 70 },
  { key: "relationship_guidance", label: "Relationship Guidance", sortOrder: 80 },
  { key: "career_guidance", label: "Career Guidance", sortOrder: 90 },
  { key: "other", label: "Other", sortOrder: 100 },
];

const IDENTITY_MIME = ["application/pdf", "image/jpeg", "image/png"];

const DOCUMENT_REQUIREMENTS: {
  group: string;
  key: string;
  label: string;
  category: "IDENTITY" | "SUPPORTING";
  isRequired: boolean;
  sortOrder: number;
}[] = [
  // One of these satisfies the single required identity slot — the applicant picks one.
  { group: "IDENTITY_PROOF", key: "identity_passport", label: "Passport", category: "IDENTITY", isRequired: true, sortOrder: 10 },
  { group: "IDENTITY_PROOF", key: "identity_driving_licence", label: "Driving Licence", category: "IDENTITY", isRequired: true, sortOrder: 20 },
  { group: "IDENTITY_PROOF", key: "identity_voter_id", label: "Voter ID", category: "IDENTITY", isRequired: true, sortOrder: 30 },
  // Deliberately no "other government ID" catch-all without legal review — add one here once reviewed.

  // Required, but not tied to a certificate specifically — experienced practitioners
  // without formal paper can satisfy this with a written declaration instead.
  { group: "EXPERIENCE_DECLARATION", key: "experience_declaration", label: "Professional Experience / Training Declaration", category: "SUPPORTING", isRequired: true, sortOrder: 40 },

  // Optional supporting evidence — never universally required (some practitioners have no formal certificate).
  { group: "ASTROLOGY_CERTIFICATE", key: "astrology_certificate", label: "Astrology Certificate / Diploma", category: "SUPPORTING", isRequired: false, sortOrder: 50 },
  { group: "TRAINING_CERTIFICATE", key: "training_certificate", label: "Training Certificate", category: "SUPPORTING", isRequired: false, sortOrder: 60 },
  { group: "EDUCATION_QUALIFICATION", key: "education_qualification", label: "Relevant Educational Qualification", category: "SUPPORTING", isRequired: false, sortOrder: 70 },
  { group: "EXPERIENCE_LETTER", key: "experience_letter", label: "Experience Letter / Professional Reference", category: "SUPPORTING", isRequired: false, sortOrder: 80 },
  { group: "OTHER_SUPPORTING", key: "other_supporting", label: "Other Supporting Evidence", category: "SUPPORTING", isRequired: false, sortOrder: 90 },
];

async function main() {
  await prisma.role.upsert({
    where: { name: "ASTROLOGER" },
    update: {},
    create: { name: "ASTROLOGER", description: "Granted on astrologer application approval. Coexists with the USER role; never implies ADMIN/SUPERADMIN access." },
  });
  console.log("✓ ASTROLOGER role row ready");

  for (const s of SPECIALTIES) {
    await prisma.astrologerSpecialtyOption.upsert({
      where: { key: s.key },
      update: { label: s.label, sortOrder: s.sortOrder },
      create: { key: s.key, label: s.label, sortOrder: s.sortOrder },
    });
  }
  console.log(`✓ ${SPECIALTIES.length} specialty options ready`);

  for (const d of DOCUMENT_REQUIREMENTS) {
    await prisma.astrologerDocumentRequirement.upsert({
      where: { key: d.key },
      update: { group: d.group, label: d.label, category: d.category, isRequired: d.isRequired, sortOrder: d.sortOrder, acceptedMimeTypes: IDENTITY_MIME },
      create: { group: d.group, key: d.key, label: d.label, category: d.category, isRequired: d.isRequired, sortOrder: d.sortOrder, acceptedMimeTypes: IDENTITY_MIME },
    });
  }
  console.log(`✓ ${DOCUMENT_REQUIREMENTS.length} document requirements ready`);
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
