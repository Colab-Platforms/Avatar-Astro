import type { Request } from "express";
import prisma from "@root/prisma.js";
import type { Prisma, AstrologerApplicationStatus, AstrologerDocumentVerificationStatus } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { writeAudit } from "@/modules/admin/audit.js";
import { setSetting, getAllSettings, cacheSetting } from "@/modules/admin/settings.js";
import { getSignedDocumentUrl, deletePrivateDocument } from "@/config/cloudinary.js";
import { isTransitionAllowed } from "@/modules/astrologer/astrologer.types.js";
import { computeApprovalReadiness } from "@/modules/astrologer/astrologer.service.js";
import { SCANNING_SETTING_KEY } from "@/services/malwareScan.js";
import { sendAstrologerStatusEmail, type AstrologerNotificationStatus } from "@/utils/mailer.js";
import { generateUniqueAstrologerSlug } from "@/utils/slug.js";

const ASTROLOGER_ROLE_NAME = "ASTROLOGER";

/** Prefers the application's own contact email (collected in the wizard) and falls back to the account's login email — never throws, since a missing email should never block the status change it's reporting on. */
async function resolveNotifyEmail(userId: string, applicationEmail: string | null): Promise<string | null> {
  if (applicationEmail) return applicationEmail;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}

function notify(userId: string, applicationEmail: string | null, status: AstrologerNotificationStatus, reason?: string | null): void {
  void resolveNotifyEmail(userId, applicationEmail)
    .then((email) => { if (email) return sendAstrologerStatusEmail(email, status, reason); })
    .catch((err) => console.error(`[astrologerAdmin] failed to send ${status} notification:`, err));
}

// ── listing / detail ──────────────────────────────────────────────────────────

export interface ApplicationListFilters {
  status?: AstrologerApplicationStatus;
  specialtyKey?: string;
  language?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listApplications(filters: ApplicationListFilters) {
  const where: Prisma.AstrologerApplicationWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.language) where.languages = { has: filters.language };
  if (filters.specialtyKey) where.specialties = { some: { specialty: { key: filters.specialtyKey } } };
  if (filters.search) {
    where.OR = [
      { fullLegalName: { contains: filters.search, mode: "insensitive" } },
      { displayName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.astrologerApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: { specialties: { include: { specialty: true } }, documents: { where: { isCurrent: true } } },
    }),
    prisma.astrologerApplication.count({ where }),
  ]);

  return {
    items: items.map((a) => ({
      id: a.id,
      fullLegalName: a.fullLegalName,
      displayName: a.displayName,
      email: a.email,
      phone: a.phone,
      profilePhotoUrl: a.profilePhotoUrl,
      yearsOfExperience: a.yearsOfExperience,
      primarySpecialty: (() => {
        const s = a.specialties.find((s) => s.isPrimary) ?? a.specialties[0];
        return s ? s.customLabel?.trim() || s.specialty.label : null;
      })(),
      status: a.status,
      createdAt: a.createdAt,
      submittedAt: a.submittedAt,
      documentsPending: a.documents.filter((d) => d.verificationStatus === "PENDING" || d.verificationStatus === "UNDER_REVIEW").length,
      documentsVerified: a.documents.filter((d) => d.verificationStatus === "VERIFIED").length,
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getOverview() {
  const grouped = await prisma.astrologerApplication.groupBy({ by: ["status"], _count: { _all: true } });
  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;
  return { counts };
}

export async function getApplicationDetail(applicationId: string) {
  const app = await prisma.astrologerApplication.findUnique({
    where: { id: applicationId },
    include: {
      specialties: { include: { specialty: true } },
      documents: { orderBy: [{ requirementId: "asc" }, { version: "asc" }], include: { requirement: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      agreements: true,
      interviews: { orderBy: { createdAt: "desc" } },
      profile: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } },
    },
  });
  if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);
  return app;
}

export async function getReadiness(applicationId: string) {
  return computeApprovalReadiness(applicationId, prisma);
}

// ── documents ──────────────────────────────────────────────────────────────

export async function getDocumentSignedUrl(documentId: string, req: Request): Promise<string> {
  const doc = await prisma.astrologerDocument.findUnique({ where: { id: documentId } });
  if (!doc || doc.retentionDeletedAt) throw new ApiError("Document not found.", STATUS_CODES.NOT_FOUND);
  const url = getSignedDocumentUrl(doc.storagePublicId, doc.storageResourceType as "image" | "raw");
  await writeAudit(req, {
    action: "astrologer.document.viewed",
    entityType: "AstrologerDocument",
    entityId: doc.id,
    summary: `Viewed verification document for application ${doc.applicationId}`,
  });
  return url;
}

export async function reviewDocument(
  documentId: string,
  input: { verificationStatus: AstrologerDocumentVerificationStatus; rejectionReason?: string; reviewNotes?: string },
  req: Request,
): Promise<void> {
  const doc = await prisma.astrologerDocument.findUnique({ where: { id: documentId } });
  if (!doc) throw new ApiError("Document not found.", STATUS_CODES.NOT_FOUND);
  if (!doc.isCurrent) throw new ApiError("This document version has been superseded and can no longer be reviewed.", STATUS_CODES.CONFLICT);
  if (input.verificationStatus === "VERIFIED" && doc.scanStatus !== "CLEAN" && doc.scanStatus !== "SKIPPED") {
    throw new ApiError("This document cannot be verified until it has been scanned clean.", STATUS_CODES.CONFLICT);
  }
  if ((input.verificationStatus === "REJECTED" || input.verificationStatus === "RESUBMISSION_REQUIRED") && !input.rejectionReason) {
    throw new ApiError("A reason is required when rejecting or requesting resubmission.", STATUS_CODES.BAD_REQUEST);
  }

  await prisma.$transaction(async (tx) => {
    await tx.astrologerDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason ?? null,
        reviewNotes: input.reviewNotes ?? doc.reviewNotes,
        reviewedById: (req as any).user!.id,
        reviewedAt: new Date(),
      },
    });
    await writeAudit(
      req,
      { action: "astrologer.document.reviewed", entityType: "AstrologerDocument", entityId: documentId, summary: `Document marked ${input.verificationStatus}`, metadata: { applicationId: doc.applicationId } },
      tx,
    );
  });
}

export async function purgeSupersededDocuments(applicationId: string, retentionDays: number, req: Request): Promise<{ purged: number }> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
  const candidates = await prisma.astrologerDocument.findMany({
    where: { applicationId, isCurrent: false, retentionDeletedAt: null, createdAt: { lt: cutoff } },
  });
  let purged = 0;
  for (const doc of candidates) {
    const ok = await deletePrivateDocument(doc.storagePublicId, doc.storageResourceType as "image" | "raw").catch(() => false);
    if (!ok) continue;
    await prisma.astrologerDocument.update({ where: { id: doc.id }, data: { retentionDeletedAt: new Date(), storagePublicId: "" } });
    purged++;
  }
  if (purged > 0) {
    await writeAudit(req, { action: "astrologer.documents.purged", entityType: "AstrologerApplication", entityId: applicationId, summary: `Purged ${purged} superseded document(s) past retention`, metadata: { retentionDays } });
  }
  return { purged };
}

// ── notes & interviews ──────────────────────────────────────────────────────

export async function addNote(applicationId: string, note: string, req: Request): Promise<void> {
  if (!note.trim()) throw new ApiError("Note cannot be empty.", STATUS_CODES.BAD_REQUEST);
  await prisma.astrologerApplicationNote.create({ data: { applicationId, authorId: (req as any).user!.id, note: note.slice(0, 2000) } });
}

export async function recordInterview(
  applicationId: string,
  input: {
    isRequired?: boolean;
    isWaived?: boolean;
    scheduledAt?: string;
    conductedAt?: string;
    communicationScore?: number;
    domainKnowledgeScore?: number;
    professionalConductScore?: number;
    outcome?: "PENDING" | "PASS" | "FAIL" | "RESCHEDULE";
    notes?: string;
  },
  req: Request,
) {
  const app = await prisma.astrologerApplication.findUnique({ where: { id: applicationId }, select: { id: true } });
  if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);
  const interview = await prisma.astrologerInterview.create({
    data: {
      applicationId,
      isRequired: input.isRequired ?? true,
      isWaived: input.isWaived ?? false,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      conductedAt: input.conductedAt ? new Date(input.conductedAt) : null,
      communicationScore: input.communicationScore,
      domainKnowledgeScore: input.domainKnowledgeScore,
      professionalConductScore: input.professionalConductScore,
      outcome: input.outcome ?? "PENDING",
      notes: input.notes?.slice(0, 2000),
      createdById: (req as any).user!.id,
    },
  });
  await writeAudit(req, { action: "astrologer.interview.recorded", entityType: "AstrologerApplication", entityId: applicationId, summary: `Interview outcome recorded: ${interview.outcome}` });
  return interview;
}

// ── status transitions (non-approval) ───────────────────────────────────────

const NOTIFIABLE_STATUSES = new Set<AstrologerApplicationStatus>(["UNDER_REVIEW", "MORE_INFORMATION_REQUIRED", "INTERVIEW_PENDING", "REJECTED"]);

export async function transitionStatus(applicationId: string, toStatus: AstrologerApplicationStatus, reason: string | undefined, req: Request) {
  const app = await prisma.astrologerApplication.findUnique({ where: { id: applicationId }, select: { id: true, status: true, userId: true, email: true } });
  if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);
  if (!isTransitionAllowed(app.status, toStatus, "ADMIN")) {
    throw new ApiError(`Cannot move from ${app.status} to ${toStatus}.`, STATUS_CODES.CONFLICT);
  }
  if ((toStatus === "REJECTED") && !reason) {
    throw new ApiError("A reason is required to reject an application.", STATUS_CODES.BAD_REQUEST);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updateResult = await tx.astrologerApplication.updateMany({ where: { id: applicationId, status: app.status }, data: { status: toStatus } });
    if (updateResult.count === 0) {
      const fresh = await tx.astrologerApplication.findUnique({ where: { id: applicationId }, select: { status: true } });
      if (fresh?.status === toStatus) return { alreadyApplied: true as const };
      throw new ApiError("This application was changed by another request. Refresh and try again.", STATUS_CODES.CONFLICT);
    }
    await tx.astrologerApplicationStatusHistory.create({ data: { applicationId, fromStatus: app.status, toStatus, actorUserId: (req as any).user!.id, reason: reason ?? null } });
    await writeAudit(req, { action: "astrologer.application.status_changed", entityType: "AstrologerApplication", entityId: applicationId, summary: `${app.status} -> ${toStatus}`, metadata: { reason } }, tx);
    return { alreadyApplied: false as const };
  });
  if (!result.alreadyApplied && NOTIFIABLE_STATUSES.has(toStatus)) {
    notify(app.userId, app.email, toStatus as AstrologerNotificationStatus, reason);
  }
  return result;
}

// ── approval — exact concurrency/idempotency semantics (see implementation plan) ──

export async function approveApplication(applicationId: string, req: Request) {
  const result = await prisma.$transaction(async (tx) => {
    const readiness = await computeApprovalReadiness(applicationId, tx);
    if (!readiness.ready) {
      throw new ApiError(`Application is not ready for approval: ${readiness.blockers.join("; ")}`, STATUS_CODES.UNPROCESSIBLE_ENTITY);
    }

    const app = await tx.astrologerApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);

    const updateResult = await tx.astrologerApplication.updateMany({
      where: { id: applicationId, status: { in: ["UNDER_REVIEW", "INTERVIEW_PENDING"] } },
      data: { status: "APPROVED" },
    });

    if (updateResult.count === 0) {
      const fresh = await tx.astrologerApplication.findUnique({ where: { id: applicationId } });
      const profile = await tx.astrologerProfile.findUnique({ where: { applicationId } });
      const roleMapping = fresh
        ? await tx.userRoleMapping.findFirst({ where: { userId: fresh.userId, role: { name: ASTROLOGER_ROLE_NAME } } })
        : null;
      if (fresh?.status === "APPROVED" && profile && roleMapping) {
        return { profile, alreadyApproved: true as const };
      }
      throw new ApiError(
        `Application cannot be approved from its current state (${fresh?.status ?? "unknown"}), or a prior approval left inconsistent records. Investigate before retrying.`,
        STATUS_CODES.CONFLICT,
      );
    }

    const existingProfile = await tx.astrologerProfile.findUnique({ where: { applicationId }, select: { slug: true } });
    const appSpecialties = await tx.astrologerApplicationSpecialty.findMany({ where: { applicationId }, include: { specialty: true } });
    const specialtyLabels = appSpecialties.map((s) => s.customLabel?.trim() || s.specialty.label);
    const slug = existingProfile?.slug ?? (await generateUniqueAstrologerSlug(app.displayName ?? app.fullLegalName ?? "astrologer", tx));

    const profile = await tx.astrologerProfile.upsert({
      where: { applicationId },
      create: {
        applicationId,
        userId: app.userId,
        slug,
        displayName: app.displayName ?? app.fullLegalName ?? "Astrologer",
        bio: app.bio,
        profilePhotoUrl: app.profilePhotoUrl,
        profilePhotoPublicId: app.profilePhotoPublicId,
        yearsOfExperience: app.yearsOfExperience,
        languages: app.languages,
        specialtyLabels,
      },
      update: {
        displayName: app.displayName ?? app.fullLegalName ?? "Astrologer",
        bio: app.bio,
        profilePhotoUrl: app.profilePhotoUrl,
        profilePhotoPublicId: app.profilePhotoPublicId,
        yearsOfExperience: app.yearsOfExperience,
        languages: app.languages,
        specialtyLabels,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    const role = await tx.role.findUnique({ where: { name: ASTROLOGER_ROLE_NAME } });
    if (!role) {
      throw new ApiError("The ASTROLOGER role has not been seeded yet. Run `npm run db:seed:astrologer` before approving applications.", STATUS_CODES.SERVER_ERROR);
    }
    await tx.userRoleMapping.upsert({
      where: { userId_roleId: { userId: app.userId, roleId: role.id } },
      update: {},
      create: { userId: app.userId, roleId: role.id, assignedBy: (req as any).user!.id },
    });

    await tx.astrologerApplicationStatusHistory.create({ data: { applicationId, fromStatus: app.status, toStatus: "APPROVED", actorUserId: (req as any).user!.id, reason: "Approved" } });
    await writeAudit(req, { action: "astrologer.application.approved", entityType: "AstrologerApplication", entityId: applicationId, summary: "Application approved; ASTROLOGER role granted" }, tx);

    return { profile, alreadyApproved: false as const, userId: app.userId, email: app.email };
  });
  if (!result.alreadyApproved) notify(result.userId, result.email, "APPROVED");
  return result;
}

export async function suspendAstrologer(applicationId: string, reason: string, req: Request) {
  if (!reason?.trim()) throw new ApiError("A reason is required to suspend an astrologer.", STATUS_CODES.BAD_REQUEST);
  const result = await prisma.$transaction(async (tx) => {
    const app = await tx.astrologerApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);

    const updateResult = await tx.astrologerApplication.updateMany({ where: { id: applicationId, status: "APPROVED" }, data: { status: "SUSPENDED" } });
    if (updateResult.count === 0) {
      const fresh = await tx.astrologerApplication.findUnique({ where: { id: applicationId }, select: { status: true } });
      if (fresh?.status === "SUSPENDED") return { alreadySuspended: true as const };
      throw new ApiError(`Cannot suspend from status ${fresh?.status}.`, STATUS_CODES.CONFLICT);
    }

    await tx.astrologerProfile.update({ where: { applicationId }, data: { suspendedAt: new Date(), suspensionReason: reason, isPublished: false } });
    const role = await tx.role.findUnique({ where: { name: ASTROLOGER_ROLE_NAME } });
    if (role) await tx.userRoleMapping.deleteMany({ where: { userId: app.userId, roleId: role.id } });

    await tx.astrologerApplicationStatusHistory.create({ data: { applicationId, fromStatus: "APPROVED", toStatus: "SUSPENDED", actorUserId: (req as any).user!.id, reason } });
    await writeAudit(req, { action: "astrologer.application.suspended", entityType: "AstrologerApplication", entityId: applicationId, summary: `Astrologer suspended: ${reason}` }, tx);
    return { alreadySuspended: false as const, userId: app.userId, email: app.email };
  });
  if (!result.alreadySuspended) notify(result.userId, result.email, "SUSPENDED", reason);
  return result;
}

export async function reinstateAstrologer(applicationId: string, req: Request) {
  const result = await prisma.$transaction(async (tx) => {
    const app = await tx.astrologerApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new ApiError("Application not found.", STATUS_CODES.NOT_FOUND);

    const updateResult = await tx.astrologerApplication.updateMany({ where: { id: applicationId, status: "SUSPENDED" }, data: { status: "APPROVED" } });
    if (updateResult.count === 0) {
      const fresh = await tx.astrologerApplication.findUnique({ where: { id: applicationId }, select: { status: true } });
      if (fresh?.status === "APPROVED") return { alreadyReinstated: true as const };
      throw new ApiError(`Cannot reinstate from status ${fresh?.status}.`, STATUS_CODES.CONFLICT);
    }

    await tx.astrologerProfile.update({ where: { applicationId }, data: { suspendedAt: null, suspensionReason: null } });
    const role = await tx.role.findUnique({ where: { name: ASTROLOGER_ROLE_NAME } });
    if (!role) throw new ApiError("The ASTROLOGER role has not been seeded yet.", STATUS_CODES.SERVER_ERROR);
    await tx.userRoleMapping.upsert({ where: { userId_roleId: { userId: app.userId, roleId: role.id } }, update: {}, create: { userId: app.userId, roleId: role.id, assignedBy: (req as any).user!.id } });

    await tx.astrologerApplicationStatusHistory.create({ data: { applicationId, fromStatus: "SUSPENDED", toStatus: "APPROVED", actorUserId: (req as any).user!.id, reason: "Reinstated" } });
    await writeAudit(req, { action: "astrologer.application.reinstated", entityType: "AstrologerApplication", entityId: applicationId, summary: "Astrologer reinstated; publication state left as-is" }, tx);
    return { alreadyReinstated: false as const, userId: app.userId, email: app.email };
  });
  if (!result.alreadyReinstated) notify(result.userId, result.email, "REINSTATED");
  return result;
}

export async function setPublication(applicationId: string, isPublished: boolean, req: Request) {
  const profile = await prisma.astrologerProfile.findUnique({ where: { applicationId } });
  if (!profile) throw new ApiError("No astrologer profile exists for this application yet.", STATUS_CODES.CONFLICT);
  if (profile.suspendedAt) throw new ApiError("A suspended astrologer's profile cannot be published.", STATUS_CODES.CONFLICT);
  const updated = await prisma.astrologerProfile.update({ where: { applicationId }, data: { isPublished, publishedAt: isPublished ? new Date() : profile.publishedAt } });
  await writeAudit(req, { action: "astrologer.profile.publication_changed", entityType: "AstrologerProfile", entityId: profile.id, summary: isPublished ? "Published" : "Unpublished" });
  return updated;
}

/** Complimentary (fully free, unmetered up to a cap) consultations are a superadmin-only grant —
 * never settable by the astrologer's own profile-edit endpoints. `complimentaryMaxSeconds: null`
 * means "use the platform default" (chat.service.ts's resolveComplimentaryMaxSeconds). */
export async function setComplimentary(applicationId: string, isComplimentary: boolean, complimentaryMaxSeconds: number | null, req: Request) {
  const profile = await prisma.astrologerProfile.findUnique({ where: { applicationId } });
  if (!profile) throw new ApiError("No astrologer profile exists for this application yet.", STATUS_CODES.CONFLICT);
  const updated = await prisma.astrologerProfile.update({
    where: { applicationId },
    data: { isComplimentary, complimentaryMaxSeconds },
  });
  await writeAudit(req, {
    action: "astrologer.profile.complimentary_changed",
    entityType: "AstrologerProfile",
    entityId: profile.id,
    summary: isComplimentary
      ? `Granted complimentary chat (cap: ${complimentaryMaxSeconds ?? "platform default"}s)`
      : "Revoked complimentary chat",
  });
  return updated;
}

// ── settings: document-scanning toggle, specialties, document requirements ─

export async function getScanningSetting() {
  const all = await getAllSettings();
  const value = all.get(SCANNING_SETTING_KEY);
  return { enabled: value !== false };
}

export async function setScanningSetting(enabled: boolean, req: Request) {
  await prisma.$transaction(async (tx) => {
    await setSetting(SCANNING_SETTING_KEY, enabled, (req as any).user!.id, tx);
    await writeAudit(req, { action: "astrologer.settings.scanning_toggled", entityType: "PlatformSetting", entityId: SCANNING_SETTING_KEY, summary: `Document malware scanning turned ${enabled ? "ON" : "OFF"}` }, tx);
  });
  cacheSetting(SCANNING_SETTING_KEY, enabled);
}

export async function listSpecialtyOptions() {
  return prisma.astrologerSpecialtyOption.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertSpecialtyOption(input: { id?: string; key: string; label: string; isActive?: boolean; sortOrder?: number }, req: Request) {
  const saved = await prisma.astrologerSpecialtyOption.upsert({
    where: { key: input.key },
    update: { label: input.label, isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0 },
    create: { key: input.key, label: input.label, isActive: input.isActive ?? true, sortOrder: input.sortOrder ?? 0 },
  });
  await writeAudit(req, { action: "astrologer.settings.specialty_upserted", entityType: "AstrologerSpecialtyOption", entityId: saved.id, summary: `Specialty option saved: ${saved.key}` });
  return saved;
}

export async function listDocumentRequirements() {
  return prisma.astrologerDocumentRequirement.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertDocumentRequirement(
  input: { key: string; group: string; label: string; category: "IDENTITY" | "SUPPORTING"; acceptedMimeTypes?: string[]; maxSizeMb?: number; isRequired?: boolean; isActive?: boolean; sortOrder?: number },
  req: Request,
) {
  const data = {
    group: input.group,
    label: input.label,
    category: input.category,
    acceptedMimeTypes: input.acceptedMimeTypes ?? ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMb: input.maxSizeMb ?? 10,
    isRequired: input.isRequired ?? false,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
  };
  const saved = await prisma.astrologerDocumentRequirement.upsert({ where: { key: input.key }, update: data, create: { key: input.key, ...data } });
  await writeAudit(req, {
    action: "astrologer.settings.document_requirement_upserted",
    entityType: "AstrologerDocumentRequirement",
    entityId: saved.id,
    summary: `Document requirement saved: ${saved.key}`,
    metadata: { note: "Only affects applications submitted after this change — already-submitted applications use their frozen requirementsSnapshot." },
  });
  return saved;
}
