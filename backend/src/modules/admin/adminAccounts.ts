import { Router } from "express";
import crypto from "crypto";
import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { hashPassword } from "@/utils/auth.js";
import { sendPasswordResetEmail } from "@/utils/mailer.js";
import { invalidateAccountStatus } from "@/middleware/authMiddleware.js";
import { EVENT_TYPES, EVENT_LABELS } from "@/config/events.js";
import { featureName } from "@/config/readingFeatures.js";
import type { MainAdminRequest } from "@/middleware/mainAdmin.js";
import { wrap } from "./adminPanel.route.js";
import { writeAudit } from "./audit.js";
import { parsePage } from "./adminPanel.validation.js";

/**
 * Customer and administrator account management. The two account kinds are kept strictly apart:
 *   customers = live users holding NO admin role;  admins = live users holding ADMIN or SUPERADMIN (or the legacy SUPER_ADMIN).
 * Every route here sits behind requireMainAdmin (a signed SUPERADMIN token re-checked against the database on each call).
 * Roles are only ever chosen on the server from a fixed allow-list; nothing in a request body can grant a role to a customer.
 */

const DAY_MS = 86_400_000;
const ADMIN_ROLE_NAMES = ["ADMIN", "SUPERADMIN", "SUPER_ADMIN"];
const SUPER_NAMES = ["SUPERADMIN", "SUPER_ADMIN"];
const ASSIGNABLE_ADMIN_ROLES = ["ADMIN", "SUPERADMIN"] as const;
type AdminRole = (typeof ASSIGNABLE_ADMIN_ROLES)[number];
type Kind = "customer" | "admin";

const bad = (m: string) => new ApiError(m, STATUS_CODES.BAD_REQUEST);
const forbidden = (m: string) => new ApiError(m, STATUS_CODES.FORBIDDEN);
const conflict = (m: string) => new ApiError(m, STATUS_CODES.CONFLICT);
const notFound = (what: string) => new ApiError(`${what} not found`, STATUS_CODES.NOT_FOUND);

const adminRoleFilter = { userRoleMappings: { some: { role: { name: { in: ADMIN_ROLE_NAMES } } } } };
const customerRoleFilter = { userRoleMappings: { none: { role: { name: { in: ADMIN_ROLE_NAMES } } } } };
export const kindWhere = (kind: Kind): Prisma.UserWhereInput => ({ isDeleted: false, ...(kind === "admin" ? adminRoleFilter : customerRoleFilter) });

export const roleOfMappings = (mappings: { role: { name: string } }[]): "USER" | "ADMIN" | "SUPERADMIN" => {
  const names = mappings.map((m) => m.role.name);
  if (names.some((n) => SUPER_NAMES.includes(n))) return "SUPERADMIN";
  return names.includes("ADMIN") ? "ADMIN" : "USER";
};

const listSelect = {
  id: true, firstName: true, lastName: true, email: true, phoneNo: true, city: true, state: true, country: true,
  authProvider: true, isEmailVerified: true, isPhoneVerified: true, isActive: true, profileCompleted: true, createdAt: true,
  userRoleMappings: { select: { role: { select: { name: true } } } },
} as const;

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max) : "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/; // same rule as self-registration

function parseEmail(v: unknown): string {
  const e = str(v, 254).toLowerCase();
  if (!EMAIL_RE.test(e)) throw bad("Enter a valid email address.");
  return e;
}
function parsePhone(v: unknown): string | null {
  const p = str(v, 20).replace(/[\s-]/g, "");
  if (!p) return null;
  if (!PHONE_RE.test(p)) throw bad("Enter a valid 10-digit Indian mobile number.");
  return p;
}
/** Same strength rule as sign-up (8+ chars, upper, lower, digit); 72 is bcrypt's input limit. */
function parsePassword(password: unknown, confirm: unknown): string {
  if (typeof password !== "string" || !password) throw bad("Password is required.");
  if (password.length < 8) throw bad("Password must be at least 8 characters.");
  if (password.length > 72) throw bad("Password must be at most 72 characters.");
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) throw bad("Password must contain an uppercase letter, a lowercase letter and a number.");
  if (confirm !== password) throw bad("Password and confirmation do not match.");
  return password;
}
const parseName = (v: unknown, label: string): string => {
  const n = str(v, 60);
  if (n.length < 1) throw bad(`${label} is required.`);
  return n;
};
function parseStatus(v: unknown): boolean {
  if (v === undefined || v === null || v === "" || v === "active") return true;
  if (v === "inactive") return false;
  throw bad("status must be active or inactive.");
}

const actorId = (req: MainAdminRequest) => req.user!.id;

/** The caller must be the SUPERADMIN the middleware already verified; checked again here so a mounting mistake fails closed. */
function assertSuper(req: MainAdminRequest) {
  if (req.user?.role !== "SUPERADMIN" || !req.adminEmail) throw forbidden("Only a SUPERADMIN can manage accounts.");
}

/** Serialises account mutations so two SUPERADMINs acting on each other at the same moment cannot both pass the "last SUPERADMIN" check. */
async function lockAccounts(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(7788001)`;
}

async function otherActiveSupers(db: Prisma.TransactionClient | typeof prisma, excludeId: string): Promise<number> {
  return db.user.count({ where: { id: { not: excludeId }, isActive: true, isDeleted: false, userRoleMappings: { some: { role: { name: { in: SUPER_NAMES } } } } } });
}

async function loadTarget(kind: Kind, id: string, db: Prisma.TransactionClient | typeof prisma = prisma) {
  const t = await db.user.findFirst({
    where: { id, ...kindWhere(kind) },
    select: { id: true, email: true, firstName: true, lastName: true, phoneNo: true, googleId: true, authProvider: true, password: true, isActive: true, isEmailVerified: true, userRoleMappings: { select: { role: { select: { id: true, name: true } } } } },
  });
  if (!t) throw notFound(kind === "admin" ? "Administrator" : "Customer");
  return { ...t, role: roleOfMappings(t.userRoleMappings) };
}

const labelFor = (kind: Kind) => (kind === "admin" ? "admin" : "customer");

async function audit(req: MainAdminRequest, kind: Kind, action: string, targetId: string | null, summary: string, metadata: Record<string, unknown> | null, tx: Prisma.TransactionClient) {
  await writeAudit(req, { action: `${labelFor(kind)}.${action}`, entityType: kind === "admin" ? "admin" : "customer", entityId: targetId, summary, metadata }, tx);
}

async function revokeSessions(userId: string, tx: Prisma.TransactionClient) {
  await tx.session.deleteMany({ where: { userId } });
}

/** Removes everything personal and keeps only an anonymised tombstone row (soft delete). Runs inside the caller's transaction. */
async function anonymise(userId: string, byId: string, tx: Prisma.TransactionClient) {
  await Promise.all([
    tx.generatedReading.deleteMany({ where: { userId } }),
    tx.conversation.deleteMany({ where: { userId } }), // its messages cascade
    tx.userActivityEvent.deleteMany({ where: { userId } }),
    tx.session.deleteMany({ where: { userId } }),
    tx.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
  const old = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (old) await tx.otpVerification.deleteMany({ where: { OR: [{ userId }, { email: old.email }] } });
  // Usage rows stay for aggregate statistics and AI cost totals, but no longer point at a person.
  await tx.usageEvent.updateMany({ where: { userId }, data: { userId: null } });
  await tx.user.update({
    where: { id: userId },
    data: {
      isDeleted: true, isActive: false, deletedAt: new Date(), deletedById: byId,
      email: `deleted-${userId}@deleted.invalid`, phoneNo: null, googleId: null, password: null,
      firstName: null, lastName: null, address: null, gender: null, state: null, country: null, city: null,
      dateOfBirth: null, profileImage: null, profileImagePublicId: null,
      isEmailVerified: false, isPhoneVerified: false,
    },
  });
}

function buildListWhere(kind: Kind, query: any): Prisma.UserWhereInput {
  const where: any = { ...kindWhere(kind) };
  const and: Prisma.UserWhereInput[] = [];
  const q = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  if (query.status === "active" || query.status === "inactive") where.isActive = query.status === "active";
  if (query.emailVerified === "true" || query.emailVerified === "false") where.isEmailVerified = query.emailVerified === "true";
  if (query.phoneVerified === "true" || query.phoneVerified === "false") where.isPhoneVerified = query.phoneVerified === "true";
  if (query.provider === "LOCAL" || query.provider === "GOOGLE") where.authProvider = query.provider;
  if (kind === "admin" && (query.role === "ADMIN" || query.role === "SUPERADMIN")) {
    and.push({ userRoleMappings: { some: { role: { name: { in: query.role === "SUPERADMIN" ? SUPER_NAMES : ["ADMIN"] } } } } });
    if (query.role === "ADMIN") and.push({ userRoleMappings: { none: { role: { name: { in: SUPER_NAMES } } } } });
  }
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const created: any = {};
  if (typeof query.registeredFrom === "string" && day.test(query.registeredFrom)) created.gte = new Date(`${query.registeredFrom}T00:00:00.000Z`);
  if (typeof query.registeredTo === "string" && day.test(query.registeredTo)) created.lt = new Date(new Date(`${query.registeredTo}T00:00:00.000Z`).getTime() + DAY_MS);
  if (created.gte || created.lt) where.createdAt = created;
  if (q) and.push({ OR: ["email", "firstName", "lastName", "phoneNo"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) });
  if (and.length) where.AND = and;
  return where;
}

async function activityFor(ids: string[]) {
  if (!ids.length) return { last: new Map<string, Date | null>(), login: new Map<string, Date | null>(), count: new Map<string, number>() };
  const [all, logins] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { createdAt: true }, _count: { _all: true } }),
    prisma.usageEvent.groupBy({ by: ["userId"], where: { userId: { in: ids }, eventType: EVENT_TYPES.authLogin }, _max: { createdAt: true } }),
  ]);
  return {
    last: new Map(all.map((a) => [a.userId, a._max.createdAt])),
    count: new Map(all.map((a) => [a.userId, a._count._all])),
    login: new Map(logins.map((a) => [a.userId, a._max.createdAt])),
  };
}

async function nameOf(id: string | null | undefined) {
  if (!id) return null;
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, firstName: true, lastName: true } });
  return u ? { id: u.id, email: u.email.endsWith("@deleted.invalid") ? "(deleted account)" : u.email, name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null } : null;
}

export function createAccountsRouter(): Router {
  const router = Router();

  // ── generic handlers, mounted once for customers and once for administrators ─────────────────────────────────
  const mount = (kind: Kind, base: string) => {
    const word = kind === "admin" ? "Administrator" : "Customer";

    router.get(
      base,
      wrap(async (req, res) => {
        const { page, pageSize } = parsePage(req.query);
        const where = buildListWhere(kind, req.query);
        const [total, rows] = await Promise.all([
          prisma.user.count({ where }),
          prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: listSelect }),
        ]);
        const act = await activityFor(rows.map((r) => r.id));
        const items = rows.map(({ userRoleMappings, ...u }) => ({
          ...u,
          role: roleOfMappings(userRoleMappings),
          lastActiveAt: act.last.get(u.id) ?? null,
          lastLoginAt: act.login.get(u.id) ?? null,
          activityCount: act.count.get(u.id) ?? 0,
        }));
        let stats: Record<string, number> | undefined;
        if (kind === "admin") {
          const base = kindWhere("admin");
          const [totalAdmins, activeAdmins, supers] = await Promise.all([
            prisma.user.count({ where: base }),
            prisma.user.count({ where: { ...base, isActive: true } }),
            prisma.user.count({ where: { ...base, userRoleMappings: { some: { role: { name: { in: SUPER_NAMES } } } } } }),
          ]);
          stats = { total: totalAdmins, active: activeAdmins, deactivated: totalAdmins - activeAdmins, superAdmins: supers };
        }
        sendResponse(res, true, { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), ...(stats ? { stats } : {}) });
      }),
    );

    router.post(
      base,
      wrap(async (req, res) => {
        assertSuper(req);
        const b = req.body ?? {};
        let role: "USER" | AdminRole = "USER";
        if (kind === "customer") {
          if (b.role !== undefined && b.role !== "USER") throw forbidden("A customer account always has the USER role; roles cannot be assigned here.");
        } else {
          if (!ASSIGNABLE_ADMIN_ROLES.includes(b.role)) throw bad("role must be ADMIN or SUPERADMIN.");
          role = b.role;
        }
        const firstName = parseName(b.firstName, "First name");
        const lastName = parseName(b.lastName, "Last name");
        const email = parseEmail(b.email);
        const phoneNo = parsePhone(b.phoneNo);
        const password = parsePassword(b.password, b.confirmPassword);
        const isActive = parseStatus(b.status);
        if (await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) throw conflict("An account with this email already exists.");
        if (phoneNo && (await prisma.user.findFirst({ where: { phoneNo }, select: { id: true } }))) throw conflict("This phone number is already registered to another account.");
        const roleRecord = await prisma.role.findUnique({ where: { name: role } });
        if (!roleRecord) throw new ApiError(`${role} role not found — run db:seed first`, STATUS_CODES.SERVER_ERROR);
        const hashed = await hashPassword(password);
        const created = await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              firstName, lastName, email, phoneNo, password: hashed, authProvider: "LOCAL", profileCompleted: true, isActive,
              // Never pre-verified: the person proves the address through the normal sign-in verification.
              isEmailVerified: false, isPhoneVerified: false, createdById: actorId(req),
            },
            select: { id: true, email: true },
          });
          await tx.userRoleMapping.create({ data: { userId: u.id, roleId: roleRecord.id, assignedBy: actorId(req) } });
          await audit(req, kind, "create", u.id, `Created ${labelFor(kind)} ${u.email}${kind === "admin" ? ` as ${role}` : ""}`, { role, status: isActive ? "active" : "inactive" }, tx);
          return u;
        });
        sendResponse(res, true, { id: created.id, email: created.email, role, isActive, emailVerificationRequired: true }, `${word} created`, STATUS_CODES.CREATED);
      }),
    );

    router.get(
      `${base}/:id`,
      wrap(async (req, res) => {
        const user = await prisma.user.findFirst({
          where: { id: req.params.id, ...kindWhere(kind) },
          select: { ...listSelect, address: true, gender: true, dateOfBirth: true, profileImage: true, updatedAt: true, createdById: true, password: true, googleId: true, _count: { select: { sessions: true } } },
        });
        if (!user) throw notFound(word);
        const since = new Date(Date.now() - 30 * DAY_MS);
        const mine = { userId: user.id };
        const [usage30, usageAll, lastActive, lastLogin, logins, recent, totals, createdBy, library, history, actions] = await Promise.all([
          prisma.usageEvent.groupBy({ by: ["feature"], where: { ...mine, eventType: EVENT_TYPES.featureRequest, createdAt: { gte: since } }, _count: { _all: true } }),
          prisma.usageEvent.groupBy({ by: ["feature", "status"], where: { ...mine, eventType: EVENT_TYPES.featureRequest }, _count: { _all: true } }),
          prisma.usageEvent.aggregate({ where: mine, _max: { createdAt: true } }),
          prisma.usageEvent.aggregate({ where: { ...mine, eventType: EVENT_TYPES.authLogin }, _max: { createdAt: true } }),
          prisma.usageEvent.findMany({ where: { ...mine, eventType: { in: [EVENT_TYPES.authLogin, EVENT_TYPES.authLoginFailed, EVENT_TYPES.authRegister] } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, eventType: true, status: true, metadata: true, createdAt: true } }),
          prisma.usageEvent.findMany({ where: mine, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, eventType: true, feature: true, status: true, statusCode: true, metadata: true, createdAt: true } }),
          prisma.usageEvent.groupBy({ by: ["eventType"], where: mine, _count: { _all: true } }),
          nameOf(user.createdById),
          Promise.all([prisma.generatedReading.count({ where: mine }), prisma.generatedReading.count({ where: { ...mine, isSaved: true } }), prisma.conversation.count({ where: mine })]),
          prisma.adminAuditLog.findMany({ where: { entityId: user.id }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, actorEmail: true, action: true, summary: true, metadata: true, createdAt: true } }),
          kind === "admin" ? prisma.adminAuditLog.findMany({ where: { actorId: user.id }, orderBy: { createdAt: "desc" }, take: 15, select: { id: true, action: true, summary: true, createdAt: true } }) : Promise.resolve([]),
        ]);
        const { userRoleMappings, _count, password, googleId, createdById: _c, ...rest } = user;
        const byFeature = new Map<string, { feature: string; total: number; success: number; failed: number }>();
        for (const r of usageAll) {
          const f = byFeature.get(r.feature) ?? { feature: r.feature, total: 0, success: 0, failed: 0 };
          f.total += r._count._all;
          if (r.status === "success") f.success += r._count._all;
          if (r.status === "error") f.failed += r._count._all;
          byFeature.set(r.feature, f);
        }
        sendResponse(res, true, {
          ...rest,
          role: roleOfMappings(userRoleMappings),
          activeSessions: _count.sessions,
          // Only whether a password exists / Google is linked; never the hash or the id.
          credentialStatus: password ? "set" : "none (signs in with Google)",
          googleLinked: !!googleId,
          createdBy,
          usageLast30Days: usage30.map((u) => ({ feature: u.feature, count: u._count._all })),
          lastActiveAt: lastActive._max.createdAt,
          lastLoginAt: lastLogin._max.createdAt,
          loginHistory: logins,
          recentActivity: recent.map((e) => ({ ...e, label: EVENT_LABELS[e.eventType] ?? e.eventType })),
          featureUsage: [...byFeature.values()].sort((a, b) => b.total - a.total),
          eventCounts: totals.map((t) => ({ eventType: t.eventType, count: t._count._all })),
          library: { readings: library[0], saved: library[1], conversations: library[2] },
          auditHistory: history,
          recentAdminActions: actions,
          notStored: ["Orders, bookings and payments do not exist yet."],
        });
      }),
    );

    router.patch(
      `${base}/:id`,
      wrap(async (req, res) => {
        assertSuper(req);
        const b = req.body ?? {};
        const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k);
        const self = req.params.id === actorId(req);
        if (kind === "customer" && has("role")) throw forbidden("A customer's role cannot be changed. Customers always have the USER role.");
        if (has("isActive") || has("status")) throw bad("Use the activate / deactivate action to change account status.");
        const changed: string[] = [];
        const updated = await prisma.$transaction(async (tx) => {
          await lockAccounts(tx);
          const t = await loadTarget(kind, req.params.id, tx);
          const data: Prisma.UserUpdateInput = {};
          let revoke = false;
          if (has("firstName")) { const v = parseName(b.firstName, "First name"); if (v !== (t.firstName ?? "")) { data.firstName = v; changed.push("firstName"); } }
          if (has("lastName")) { const v = parseName(b.lastName, "Last name"); if (v !== (t.lastName ?? "")) { data.lastName = v; changed.push("lastName"); } }
          if (has("phoneNo")) {
            const v = parsePhone(b.phoneNo);
            if (v !== (t.phoneNo ?? null)) {
              if (v && (await tx.user.findFirst({ where: { phoneNo: v, id: { not: t.id } }, select: { id: true } }))) throw conflict("This phone number is already registered to another account.");
              data.phoneNo = v;
              data.isPhoneVerified = false; // the new number is unproven
              changed.push("phoneNo");
            }
          }
          if (has("email")) {
            const v = parseEmail(b.email);
            if (v !== t.email.toLowerCase()) {
              if (self) throw forbidden("Change your own email from your profile, not from the admin panel.");
              if (t.googleId || t.authProvider === "GOOGLE") throw conflict("This account is linked to Google; its email comes from the Google account and cannot be changed here.");
              if (await tx.user.findFirst({ where: { email: { equals: v, mode: "insensitive" }, id: { not: t.id } }, select: { id: true } })) throw conflict("An account with this email already exists.");
              data.email = v;
              data.isEmailVerified = false; // must be verified again at next sign-in
              revoke = true;
              changed.push("email");
            }
          }
          let roleChange: { from: string; to: AdminRole } | null = null;
          if (kind === "admin" && has("role")) {
            if (!ASSIGNABLE_ADMIN_ROLES.includes(b.role)) throw bad("role must be ADMIN or SUPERADMIN.");
            if (b.role !== t.role) {
              if (self) throw forbidden("You cannot change your own role.");
              if (t.role === "SUPERADMIN" && t.isActive && (await otherActiveSupers(tx, t.id)) === 0) throw forbidden("This is the last active SUPERADMIN; promote another SUPERADMIN first.");
              roleChange = { from: t.role, to: b.role };
            }
          }
          if (!changed.length && !roleChange) return null;
          if (Object.keys(data).length) await tx.user.update({ where: { id: t.id }, data });
          if (roleChange) {
            const roleRecord = await tx.role.findUnique({ where: { name: roleChange.to } });
            if (!roleRecord) throw new ApiError(`${roleChange.to} role not found`, STATUS_CODES.SERVER_ERROR);
            await tx.userRoleMapping.deleteMany({ where: { userId: t.id, role: { name: { in: ADMIN_ROLE_NAMES } } } });
            await tx.userRoleMapping.create({ data: { userId: t.id, roleId: roleRecord.id, assignedBy: actorId(req) } });
            revoke = true;
            changed.push("role");
          }
          if (revoke) await revokeSessions(t.id, tx);
          if (changed.some((c) => c !== "role")) await audit(req, kind, "update", t.id, `Edited ${labelFor(kind)} ${t.email} (${changed.filter((c) => c !== "role").join(", ")})`, { fields: changed.filter((c) => c !== "role") }, tx);
          if (roleChange) await audit(req, kind, "role_change", t.id, `Changed role of ${t.email} from ${roleChange.from} to ${roleChange.to}`, { from: roleChange.from, to: roleChange.to }, tx);
          return { id: t.id, revoke };
        });
        if (updated?.revoke) invalidateAccountStatus(updated.id);
        sendResponse(res, true, { id: req.params.id, changed }, changed.length ? `${word} updated` : "No changes");
      }),
    );

    router.patch(
      `${base}/:id/status`,
      wrap(async (req, res) => {
        assertSuper(req);
        if (typeof req.body?.isActive !== "boolean") throw bad("isActive (true/false) is required.");
        const isActive: boolean = req.body.isActive;
        if (req.params.id === actorId(req)) throw forbidden("You cannot change your own account status.");
        const out = await prisma.$transaction(async (tx) => {
          await lockAccounts(tx);
          const t = await loadTarget(kind, req.params.id, tx);
          if (!isActive && t.role === "SUPERADMIN" && t.isActive && (await otherActiveSupers(tx, t.id)) === 0) throw forbidden("This is the last active SUPERADMIN and cannot be deactivated.");
          if (t.isActive !== isActive) {
            await tx.user.update({ where: { id: t.id }, data: { isActive } });
            if (!isActive) await revokeSessions(t.id, tx);
            await audit(req, kind, isActive ? "reactivate" : "deactivate", t.id, `${isActive ? "Reactivated" : "Deactivated"} ${labelFor(kind)} ${t.email}`, null, tx);
          }
          return t.id;
        });
        invalidateAccountStatus(out); // the access token stops working on the very next request
        sendResponse(res, true, { id: out, isActive }, `${word} status updated`);
      }),
    );

    // Admin sets a new password directly (never shown back). Old password stops working, every session is ended.
    router.post(
      `${base}/:id/password`,
      wrap(async (req, res) => {
        assertSuper(req);
        if (req.params.id === actorId(req)) throw forbidden("Change your own password from your profile / forgot-password flow, not from the admin panel.");
        const password = parsePassword(req.body?.password, req.body?.confirmPassword);
        const t = await loadTarget(kind, req.params.id);
        if (!t.password && t.authProvider === "GOOGLE") throw conflict("This account signs in with Google and has no password to reset.");
        const hashed = await hashPassword(password);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: t.id }, data: { password: hashed } });
          await tx.passwordResetToken.updateMany({ where: { userId: t.id, used: false }, data: { used: true } });
          await revokeSessions(t.id, tx);
          await audit(req, kind, "password_reset", t.id, `Set a new password for ${labelFor(kind)} ${t.email}`, { method: "admin_set" }, tx);
        });
        invalidateAccountStatus(t.id);
        sendResponse(res, true, { id: t.id, sessionsEnded: true }, "Password updated");
      }),
    );

    // Existing reset flow: a one-hour single-use link emailed to the account owner. The link itself is never returned.
    router.post(
      `${base}/:id/password-reset-link`,
      wrap(async (req, res) => {
        assertSuper(req);
        const t = await loadTarget(kind, req.params.id);
        if (!t.password && t.authProvider === "GOOGLE") throw conflict("This account signs in with Google and has no password to reset.");
        const token = crypto.randomBytes(32).toString("hex");
        await prisma.$transaction(async (tx) => {
          await tx.passwordResetToken.updateMany({ where: { userId: t.id, used: false }, data: { used: true } });
          await tx.passwordResetToken.create({ data: { userId: t.id, token, expiresAt: new Date(Date.now() + 3_600_000) } });
          await audit(req, kind, "password_reset_link", t.id, `Sent a password-reset link to ${labelFor(kind)} ${t.email}`, { method: "email_link" }, tx);
        });
        let emailSent = true;
        await sendPasswordResetEmail(t.email, token).catch((e) => { emailSent = false; console.error("[admin] reset email failed:", e?.message ?? e); });
        sendResponse(res, true, { id: t.id, emailSent }, emailSent ? "Reset link sent" : "Reset link created but the email could not be sent");
      }),
    );

    router.delete(
      `${base}/:id`,
      wrap(async (req, res) => {
        assertSuper(req);
        if (req.params.id === actorId(req)) throw forbidden("You cannot delete your own account.");
        const out = await prisma.$transaction(async (tx) => {
          await lockAccounts(tx);
          const t = await loadTarget(kind, req.params.id, tx);
          if (typeof req.body?.confirmEmail !== "string" || req.body.confirmEmail.trim().toLowerCase() !== t.email.toLowerCase()) throw bad("Type the account's email address to confirm deletion.");
          if (t.role === "SUPERADMIN" && t.isActive && (await otherActiveSupers(tx, t.id)) === 0) throw forbidden("This is the last active SUPERADMIN and cannot be deleted.");
          await anonymise(t.id, actorId(req), tx);
          await audit(req, kind, "delete", t.id, `Deleted ${labelFor(kind)} ${t.email}${kind === "admin" ? ` (${t.role})` : ""}`, { role: t.role }, tx);
          return t.id;
        });
        invalidateAccountStatus(out);
        sendResponse(res, true, { id: out }, `${word} deleted`);
      }),
    );
  };

  mount("customer", "/customers");
  mount("admin", "/admins");

  // ── Customer library (metadata only: no reading text, no chat messages) ────────────────────────────────────
  router.get(
    "/customer-library",
    wrap(async (req, res) => {
      const { page, pageSize } = parsePage(req.query);
      const live = { user: kindWhere("customer") };
      const feature = typeof req.query.feature === "string" && req.query.feature ? req.query.feature.slice(0, 40) : undefined;
      const where = { ...live, ...(feature ? { feature } : {}) };
      const [total, savedTotal, conversations, byFeature, rows] = await Promise.all([
        prisma.generatedReading.count({ where: live }),
        prisma.generatedReading.count({ where: { ...live, isSaved: true } }),
        prisma.conversation.count({ where: live }),
        prisma.generatedReading.groupBy({ by: ["feature"], where: live, _count: { _all: true } }),
        prisma.generatedReading.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, feature: true, isSaved: true, createdAt: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } } }),
      ]);
      const filtered = await prisma.generatedReading.count({ where });
      sendResponse(res, true, {
        totals: { readings: total, saved: savedTotal, conversations },
        byFeature: byFeature.map((g) => ({ feature: g.feature, label: featureName(g.feature), count: g._count._all })).sort((a, b) => b.count - a.count),
        items: rows.map((r) => ({ id: r.id, feature: r.feature, label: featureName(r.feature), isSaved: r.isSaved, createdAt: r.createdAt, customer: { id: r.user.id, email: r.user.email, name: [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") || null } })),
        page, pageSize, total: filtered, totalPages: Math.max(1, Math.ceil(filtered / pageSize)),
        note: "Only that a reading exists is shown here. The reading text and chat messages stay private to each customer.",
      });
    }),
  );

  return router;
}
