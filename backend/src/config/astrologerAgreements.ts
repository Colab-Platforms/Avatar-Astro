/**
 * Current version string for each agreement an applicant must accept before submitting.
 * Bumping a version here does NOT retroactively affect an already-submitted application —
 * AstrologerAgreementAcceptance.version freezes what was accepted at the time (see
 * astrologer.service.ts computeApprovalReadiness, which checks against this config only
 * for applications still in DRAFT).
 */
export const ASTROLOGER_AGREEMENT_VERSIONS = {
  TERMS_AND_CONDITIONS: "2026-01-v1",
  PRIVACY_NOTICE: "2026-01-v1",
  VERIFICATION_CONSENT: "2026-01-v1",
  PROFESSIONAL_CONDUCT_POLICY: "2026-01-v1",
} as const;

export type AstrologerAgreementTypeKey = keyof typeof ASTROLOGER_AGREEMENT_VERSIONS;

export const ASTROLOGER_AGREEMENT_TYPES = Object.keys(ASTROLOGER_AGREEMENT_VERSIONS) as AstrologerAgreementTypeKey[];
