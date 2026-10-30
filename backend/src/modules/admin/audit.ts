import type { Request } from "express";
import prisma from "@root/prisma.js";
import type { Prisma } from "@prisma/client";
import type { MainAdminRequest } from "@/middleware/mainAdmin.js";

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}

/**
 * Appends an audit record. Callers await it: a sensitive admin action that
 * cannot be audited should fail rather than succeed silently. Summaries must
 * never contain secrets or personal content (titles, ids and status only).
 */
/** `db` may be a transaction client so the audit row commits or rolls back together with the change. */
export async function writeAudit(req: Request, input: AuditInput, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<void> {
  const r = req as MainAdminRequest;
  await db.adminAuditLog.create({
    data: {
      actorId: r.user!.id,
      actorEmail: r.adminEmail ?? "unknown",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary.slice(0, 500),
      ip: req.ip ?? null,
    },
  });
}
