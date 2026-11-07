import prisma from "@root/prisma.js";
import type { Prisma, AstrologerApplication, AstrologerApplicationStatus } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { logActivity } from "@/modules/library/library.service.js";
import { sendAstrologerStatusEmail, sendAstrologerAdminAlertEmail } from "@/utils/mailer.js";
import { ASTROLOGER_AGREEMENT_TYPES, ASTROLOGER_AGREEMENT_VERSIONS, type AstrologerAgreementTypeKey } from "@/config/astrologerAgreements.js";
import { REAPPLIABLE_STATUSES, isTransitionAllowed, type DocumentRequirementSnapshotItem, type ReadinessResult } from "./astrologer.types.js";

type Db = Prisma.TransactionClient | typeof prisma;

const APPLICATION_DETAIL_INCLUDE = {
  specialties: { include: { specialty: true } },
  documents: { where: { isCurrent: true }, orderBy: { createdAt: "asc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  agreements: true,
  interviews: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.AstrologerApplicationInclude;

type ApplicationWithDetail = Prisma.AstrologerApplicationGetPayload<{ include: typeof APPLICATION_DETAIL_INCLUDE }>;

/** The most recent application row for a user, whatever its status (null if they've never applied). */
export async function getLatestApplicationForUser(userId: string, db: Db = prisma): Promise<ApplicationWithDetail | null> {
  return db.astrologerApplication.findFirst({
    where: { userId },
    orderBy: { attemptNumber: "desc" },
    include: APPLICATION_DETAIL_INCLUDE,
  });
}

/** Strips every field an applicant must never see: review notes, scan detail, admin notes, storage ids. */
export function toApplicantSafe(app: ApplicationWithDetail) {
  return {
    id: app.id,
    attemptNumber: app.attemptNumber,
    status: app.status,
    fullLegalName: app.fullLegalName,
    displayName: app.displayName,
    email: app.email,
    phone: app.phone,
    city: app.city,
    state: app.state,
    country: app.country,
    bio: app.bio,
    profilePhotoUrl: app.profilePhotoUrl,
    yearsOfExperience: app.yearsOfExperience,
    educationBackground: app.educationBackground,
    certificationsText: app.certificationsText,
    professionalIntro: app.professionalIntro,
    consultationExperience: app.consultationExperience,
    areasOfExpertise: app.areasOfExpertise,
    languages: app.languages,
    submittedAt: app.submittedAt,
    specialties: app.specialties.map((s) => ({ id: s.specialtyOptionId, key: s.specialty.key, label: s.customLabel?.trim() || s.specialty.label, isPrimary: s.isPrimary })),
    documents: app.documents.map((d) => ({
      id: d.id,
      requirementId: d.requirementId,
      fileName: d.fileName,
      mimeType: d.mimeType,
      version: d.version,
      verificationStatus: d.verificationStatus,
      rejectionReason: d.rejectionReason,
      uploadedAt: d.uploadedAt,
    })),
    agreements: app.agreements.map((a) => ({ agreementType: a.agreementType, version: a.version, acceptedAt: a.acceptedAt })),
    // Applicant-safe status trail only — never AstrologerApplicationNote (internal) and
    // never AstrologerInterview.notes (private); a generic "interview scheduled/outcome"
    // summary only.
    timeline: app.statusHistory.map((h) => ({ fromStatus: h.fromStatus, toStatus: h.toStatus, reason: h.reason, at: h.createdAt })),
    interview: app.interviews[0]
      ? { isRequired: app.interviews[0].isRequired, isWaived: app.interviews[0].isWaived, scheduledAt: app.interviews[0].scheduledAt, outcome: app.interviews[0].outcome }
      : null,
  };
}

/** Throws 409 if the user already has a row outside the reappliable terminal set — identical predicate to the DB partial unique index. */
async function assertNoBlockingApplication(userId: string, db: Db): Promise<void> {
  const blocking = await db.astrologerApplication.findFirst({
    where: { userId, status: { notIn: REAPPLIABLE_STATUSES } },
    select: { id: true, status: true },
  });
  if (blocking) {
    throw new ApiError(
      blocking.status === "APPROVED" || blocking.status === "SUSPENDED"
        ? "You already have an astrologer profile on this account; a new application cannot be started."
        : "You already have an application in progress.",
      STATUS_CODES.CONFLICT,
    );
  }
}

/** Returns the user's active (non-terminal) draft, creating a new attempt if their history is empty or every row is REJECTED/WITHDRAWN. Idempotent. */
export async function startOrContinueDraft(userId: string): Promise<ApplicationWithDetail> {
  const existing = await getLatestApplicationForUser(userId);
  if (existing && !REAPPLIABLE_STATUSES.includes(existing.status) && existing.status !== "APPROVED" && existing.status !== "SUSPENDED") {
    if (existing.status !== "DRAFT") {
      throw new ApiError("Your application has already been submitted; it can no longer be edited as a draft.", STATUS_CODES.CONFLICT);
    }
    return existing;
  }
  await assertNoBlockingApplication(userId, prisma);
  const nextAttempt = (existing?.attemptNumber ?? 0) + 1;
  const created = await prisma.astrologerApplication.create({
    data: { userId, attemptNumber: nextAttempt },
    include: APPLICATION_DETAIL_INCLUDE,
  });
  void logActivity({ userId, kind: "astrologer.application.started", title: "Astrologer application started" });
  return created;
}

const EDITABLE_STATUSES: AstrologerApplicationStatus[] = ["DRAFT", "MORE_INFORMATION_REQUIRED"];

async function loadEditableApplication(userId: string): Promise<ApplicationWithDetail> {
  const app = await getLatestApplicationForUser(userId);
  if (!app) throw new ApiError("No astrologer application found. Start one first.", STATUS_CODES.NOT_FOUND);
  if (!EDITABLE_STATUSES.includes(app.status)) {
    throw new ApiError("This application can no longer be edited in its current state.", STATUS_CODES.CONFLICT);
  }
  return app;
}

const EDITABLE_FIELDS = [
  "fullLegalName", "displayName", "email", "phone", "city", "state", "country", "bio",
  "yearsOfExperience", "educationBackground", "certificationsText", "professionalIntro",
  "consultationExperience", "areasOfExpertise", "languages",
] as const;

export async function updateDraftFields(userId: string, patch: Record<string, unknown>): Promise<ApplicationWithDetail> {
  const app = await loadEditableApplication(userId);
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) data[field] = patch[field];
  }
  if (Object.keys(data).length === 0) throw new ApiError("No editable fields supplied.", STATUS_CODES.BAD_REQUEST);
  await prisma.astrologerApplication.update({ where: { id: app.id }, data });
  return (await getLatestApplicationForUser(userId))!;
}

export async function setSpecialties(
  userId: string,
  items: { specialtyOptionId: string; isPrimary?: boolean; customLabel?: string }[],
): Promise<ApplicationWithDetail> {
  const app = await loadEditableApplication(userId);
  if (items.length === 0) throw new ApiError("Select at least one specialty.", STATUS_CODES.BAD_REQUEST);
  const validOptions = await prisma.astrologerSpecialtyOption.findMany({ where: { id: { in: items.map((i) => i.specialtyOptionId) }, isActive: true }, select: { id: true, key: true } });
  const validById = new Map(validOptions.map((o) => [o.id, o]));
  const filtered = items.filter((i) => validById.has(i.specialtyOptionId));
  if (filtered.length === 0) throw new ApiError("None of the selected specialties are currently valid.", STATUS_CODES.BAD_REQUEST);
  for (const i of filtered) {
    if (validById.get(i.specialtyOptionId)!.key === "other" && !i.customLabel?.trim()) {
      throw new ApiError("Describe your specialty when selecting Other.", STATUS_CODES.BAD_REQUEST);
    }
  }
  await prisma.$transaction([
    prisma.astrologerApplicationSpecialty.deleteMany({ where: { applicationId: app.id } }),
    prisma.astrologerApplicationSpecialty.createMany({
      data: filtered.map((i) => ({
        applicationId: app.id,
        specialtyOptionId: i.specialtyOptionId,
        isPrimary: Boolean(i.isPrimary),
        customLabel: validById.get(i.specialtyOptionId)!.key === "other" ? i.customLabel!.trim().slice(0, 80) : null,
      })),
    }),
  ]);
  return (await getLatestApplicationForUser(userId))!;
}

export async function setProfilePhoto(userId: string, url: string | null, publicId: string | null): Promise<void> {
  const app = await loadEditableApplication(userId);
  await prisma.astrologerApplication.update({ where: { id: app.id }, data: { profilePhotoUrl: url, profilePhotoPublicId: publicId } });
}

export async function acceptAgreements(userId: string, items: { agreementType: AstrologerAgreementTypeKey }[], ipAddress: string | null): Promise<void> {
  const app = await loadEditableApplication(userId);
  const valid = items.filter((i) => (ASTROLOGER_AGREEMENT_TYPES as string[]).includes(i.agreementType));
  if (valid.length === 0) throw new ApiError("No valid agreement types supplied.", STATUS_CODES.BAD_REQUEST);
  await prisma.$transaction(
    valid.map((i) =>
      prisma.astrologerAgreementAcceptance.upsert({
        where: { applicationId_agreementType: { applicationId: app.id, agreementType: i.agreementType } },
        update: { version: ASTROLOGER_AGREEMENT_VERSIONS[i.agreementType], acceptedAt: new Date(), ipAddress },
        create: { applicationId: app.id, agreementType: i.agreementType, version: ASTROLOGER_AGREEMENT_VERSIONS[i.agreementType], ipAddress },
      }),
    ),
  );
}

/** Active (isActive) requirements, used for the DRAFT config endpoint and live-readiness of unsubmitted drafts. */
export async function getActiveDocumentRequirements(db: Db = prisma) {
  return db.astrologerDocumentRequirement.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
}

export async function getPublicConfig() {
  const [specialties, requirements] = await Promise.all([
    prisma.astrologerSpecialtyOption.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getActiveDocumentRequirements(),
  ]);
  return {
    specialties: specialties.map((s) => ({ id: s.id, key: s.key, label: s.label })),
    documentRequirements: requirements.map((r) => ({ id: r.id, group: r.group, key: r.key, label: r.label, category: r.category, isRequired: r.isRequired, acceptedMimeTypes: r.acceptedMimeTypes, maxSizeMb: r.maxSizeMb })),
  };
}

/**
 * Document replace/upload rule: allowed only while the application is DRAFT, or when the
 * specific current document for this requirement is RESUBMISSION_REQUIRED — independent
 * of the application's own overall status, so one rejected document can be fixed without
 * reopening the whole application. Returns the previous current document (if any) so the
 * caller can flip it isCurrent:false in the same write.
 */
export async function assertDocumentReplaceable(applicationId: string, applicationStatus: AstrologerApplicationStatus, requirementId: string | null) {
  if (!requirementId) return null; // free-form "other" uploads are always addable, never "replace a slot"
  const current = await prisma.astrologerDocument.findFirst({ where: { applicationId, requirementId, isCurrent: true } });
  if (!current) {
    if (applicationStatus !== "DRAFT") throw new ApiError("This application is not accepting new documents right now.", STATUS_CODES.CONFLICT);
    return null;
  }
  if (applicationStatus === "DRAFT" || current.verificationStatus === "RESUBMISSION_REQUIRED") return current;
  throw new ApiError("This document can only be replaced after it has been marked for resubmission.", STATUS_CODES.CONFLICT);
}

/** Inserts the new document version and flips the old one, inside one transaction, guarded by the DB partial unique index for concurrent replacements. */
export async function recordDocumentUpload(input: {
  applicationId: string;
  requirementId: string | null;
  previousCurrentId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePublicId: string;
  storageResourceType: string;
  scanStatus: "CLEAN" | "SKIPPED";
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.previousCurrentId) {
        await tx.astrologerDocument.update({ where: { id: input.previousCurrentId }, data: { isCurrent: false } });
      }
      const version = input.previousCurrentId
        ? ((await tx.astrologerDocument.findUnique({ where: { id: input.previousCurrentId }, select: { version: true } }))?.version ?? 0) + 1
        : 1;
      return tx.astrologerDocument.create({
        data: {
          applicationId: input.applicationId,
          requirementId: input.requirementId,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storagePublicId: input.storagePublicId,
          storageResourceType: input.storageResourceType,
          version,
          isCurrent: true,
          verificationStatus: "PENDING",
          scanStatus: input.scanStatus,
          scannedAt: new Date(),
        },
      });
    });
  } catch (err: any) {
    if (err?.code === "P2002" || err?.code === "23505") {
      throw new ApiError("This document was just replaced by another request. Refresh and try again.", STATUS_CODES.CONFLICT);
    }
    throw err;
  }
}

/**
 * Pure, deterministic readiness check — reused by the admin readiness endpoint AND
 * inside the approval transaction itself (never trust a precomputed flag). Reads required
 * document groups from the application's frozen requirementsSnapshot once submitted, or
 * from the live config while still DRAFT (nothing to retroactively break yet).
 */
export async function computeApprovalReadiness(applicationId: string, db: Db = prisma): Promise<ReadinessResult> {
  const app = await db.astrologerApplication.findUnique({
    where: { id: applicationId },
    include: {
      specialties: true,
      documents: { where: { isCurrent: true } },
      agreements: true,
      interviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);

  const blockers: string[] = [];

  if (!app.fullLegalName) blockers.push("Full legal name is missing.");
  if (!app.displayName) blockers.push("Display name is missing.");
  if (app.specialties.length === 0) blockers.push("No specialty selected.");
  if (!app.languages || app.languages.length === 0) blockers.push("No language selected.");
  if (app.yearsOfExperience == null) blockers.push("Years of experience is missing.");
  if (!app.profilePhotoUrl) blockers.push("Profile photograph is missing.");

  for (const type of ASTROLOGER_AGREEMENT_TYPES) {
    const acceptance = app.agreements.find((a) => a.agreementType === type);
    if (!acceptance || acceptance.version !== ASTROLOGER_AGREEMENT_VERSIONS[type]) {
      blockers.push(`Agreement not accepted at current version: ${type}.`);
    }
  }

  const snapshot = (app.requirementsSnapshot as unknown as DocumentRequirementSnapshotItem[] | null) ?? (await liveSnapshot(db));
  const requiredGroups = new Map<string, Set<string>>();
  for (const item of snapshot) {
    if (!item.isRequired) continue;
    if (!requiredGroups.has(item.group)) requiredGroups.set(item.group, new Set());
    requiredGroups.get(item.group)!.add(item.id);
  }
  for (const [group, requirementIds] of requiredGroups) {
    const satisfied = app.documents.some(
      (d) => d.requirementId && requirementIds.has(d.requirementId) && d.verificationStatus === "VERIFIED" && (d.scanStatus === "CLEAN" || d.scanStatus === "SKIPPED"),
    );
    if (!satisfied) blockers.push(`Required document group not verified: ${group}.`);
  }

  const interview = app.interviews[0];
  if (interview && interview.isRequired && !interview.isWaived && interview.outcome !== "PASS") {
    blockers.push("Interview has not been passed.");
  }

  return { ready: blockers.length === 0, blockers };
}

async function liveSnapshot(db: Db): Promise<DocumentRequirementSnapshotItem[]> {
  const rows = await db.astrologerDocumentRequirement.findMany({ where: { isActive: true } });
  return rows.map((r) => ({ id: r.id, group: r.group, key: r.key, label: r.label, category: r.category as "IDENTITY" | "SUPPORTING", isRequired: r.isRequired }));
}

export async function submitApplication(userId: string): Promise<AstrologerApplication> {
  const app = await getLatestApplicationForUser(userId);
  if (!app) throw new ApiError("No astrologer application found.", STATUS_CODES.NOT_FOUND);
  if (!isTransitionAllowed(app.status, "SUBMITTED", "APPLICANT")) {
    throw new ApiError("This application cannot be submitted in its current state.", STATUS_CODES.CONFLICT);
  }

  const snapshot = await liveSnapshot(prisma);
  const requiredGroups = new Map<string, Set<string>>();
  for (const item of snapshot) {
    if (!item.isRequired) continue;
    if (!requiredGroups.has(item.group)) requiredGroups.set(item.group, new Set());
    requiredGroups.get(item.group)!.add(item.id);
  }
  const missing: string[] = [];
  if (!app.fullLegalName) missing.push("fullLegalName");
  if (!app.displayName) missing.push("displayName");
  if (!app.profilePhotoUrl) missing.push("profilePhoto");
  if (app.specialties.length === 0) missing.push("specialties");
  if (!app.languages || app.languages.length === 0) missing.push("languages");
  if (app.yearsOfExperience == null) missing.push("yearsOfExperience");
  for (const type of ASTROLOGER_AGREEMENT_TYPES) {
    const acceptance = app.agreements.find((a) => a.agreementType === type);
    if (!acceptance || acceptance.version !== ASTROLOGER_AGREEMENT_VERSIONS[type]) missing.push(`agreement:${type}`);
  }
  for (const [group, requirementIds] of requiredGroups) {
    const present = app.documents.some((d) => d.requirementId && requirementIds.has(d.requirementId));
    if (!present) missing.push(`document:${group}`);
  }
  if (missing.length > 0) {
    throw new ApiError(`Application is incomplete: ${missing.join(", ")}`, STATUS_CODES.UNPROCESSIBLE_ENTITY);
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    await tx.astrologerApplicationStatusHistory.create({
      data: { applicationId: app.id, fromStatus: app.status, toStatus: "SUBMITTED", actorUserId: userId, reason: "Submitted by applicant" },
    });
    return tx.astrologerApplication.update({
      where: { id: app.id },
      data: { status: "SUBMITTED", submittedAt: now, lockedAt: now, requirementsSnapshot: snapshot as unknown as Prisma.InputJsonValue },
    });
  });
  void logActivity({ userId, kind: "astrologer.application.submitted", title: "Astrologer application submitted" });
  if (updated.email) void sendAstrologerStatusEmail(updated.email, "SUBMITTED").catch(() => {});
  void sendAstrologerAdminAlertEmail(
    "New astrologer application submitted",
    "New application awaiting review",
    `${updated.displayName ?? updated.fullLegalName ?? "An applicant"} (${updated.email ?? "no email on file"}) has submitted an astrologer application.`,
    updated.id,
  ).catch(() => {});
  return updated;
}

export async function withdrawApplication(userId: string): Promise<AstrologerApplication> {
  const app = await getLatestApplicationForUser(userId);
  if (!app) throw new ApiError("No astrologer application found.", STATUS_CODES.NOT_FOUND);
  if (!isTransitionAllowed(app.status, "WITHDRAWN", "APPLICANT")) {
    throw new ApiError("This application cannot be withdrawn in its current state.", STATUS_CODES.CONFLICT);
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.astrologerApplicationStatusHistory.create({
      data: { applicationId: app.id, fromStatus: app.status, toStatus: "WITHDRAWN", actorUserId: userId, reason: "Withdrawn by applicant" },
    });
    return tx.astrologerApplication.update({ where: { id: app.id }, data: { status: "WITHDRAWN" } });
  });
  void logActivity({ userId, kind: "astrologer.application.withdrawn", title: "Astrologer application withdrawn" });
  return updated;
}

// ── Post-approval astrologer workspace (requireAstrologer-gated routes) ────
// These operate on AstrologerProfile, the public-facing snapshot created at approval —
// never on AstrologerApplication, which stays frozen as the verification record.

export async function getOwnAstrologerProfile(userId: string) {
  const profile = await prisma.astrologerProfile.findUnique({ where: { userId } });
  if (!profile) throw new ApiError("No astrologer profile found for this account.", STATUS_CODES.NOT_FOUND);
  return profile;
}

const PROFILE_EDITABLE_FIELDS = ["displayName", "bio", "yearsOfExperience", "languages", "pricePerMinute"] as const;

/** Rupees per minute. Null (unset) is always allowed — that's how a profile hides its price line until the astrologer actually sets one. */
const MIN_PRICE_PER_MINUTE = 1;
const MAX_PRICE_PER_MINUTE = 10_000;

export async function updateOwnAstrologerProfile(userId: string, patch: Record<string, unknown>) {
  const profile = await getOwnAstrologerProfile(userId);
  const data: Record<string, unknown> = {};
  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) data[field] = patch[field];
  }
  if (Object.keys(data).length === 0) throw new ApiError("No editable fields supplied.", STATUS_CODES.BAD_REQUEST);
  if ("displayName" in data && !String(data.displayName ?? "").trim()) throw new ApiError("Display name cannot be empty.", STATUS_CODES.BAD_REQUEST);
  if ("pricePerMinute" in data && data.pricePerMinute !== null) {
    const price = Number(data.pricePerMinute);
    if (!Number.isInteger(price) || price < MIN_PRICE_PER_MINUTE || price > MAX_PRICE_PER_MINUTE) {
      throw new ApiError(`Price per minute must be a whole number between ${MIN_PRICE_PER_MINUTE} and ${MAX_PRICE_PER_MINUTE}.`, STATUS_CODES.BAD_REQUEST);
    }
    data.pricePerMinute = price;
  }
  return prisma.astrologerProfile.update({ where: { id: profile.id }, data });
}

export async function setOwnProfilePhoto(userId: string, url: string | null, publicId: string | null) {
  const profile = await getOwnAstrologerProfile(userId);
  return prisma.astrologerProfile.update({ where: { id: profile.id }, data: { profilePhotoUrl: url, profilePhotoPublicId: publicId } });
}

/**
 * Self-serve publish/unpublish — the brief's "an approved astrologer may remain
 * unpublished until their profile is ready" is the astrologer's own call, while a
 * suspension (SUPERADMIN-only) always overrides it: a suspended astrologer can never
 * publish themselves back live.
 */
export async function setOwnPublication(userId: string, isPublished: boolean) {
  const profile = await getOwnAstrologerProfile(userId);
  if (profile.suspendedAt) throw new ApiError("Your astrologer access is currently suspended; you cannot publish your profile.", STATUS_CODES.CONFLICT);
  return prisma.astrologerProfile.update({
    where: { id: profile.id },
    data: { isPublished, publishedAt: isPublished ? new Date() : profile.publishedAt },
  });
}

export type { ApplicationWithDetail };
