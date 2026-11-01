import { Router } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { wrap } from "./adminPanel.route.js";
import { writeAudit } from "./audit.js";

const STATUSES = ["PENDING", "CONTACTED", "DISMISSED"] as const;

/** Super-admin queue of /inner-voice/chat messages that were held back from the AI. */
export function createChatEscalationsRouter(): Router {
  const router = Router();

  router.get(
    "/chat-escalations",
    wrap(async (req, res) => {
      const status = String(req.query.status ?? "PENDING");
      const where = (STATUSES as readonly string[]).includes(status) ? { status } : {};
      const take = 100;
      const [items, counts] = await Promise.all([
        prisma.chatEscalation.findMany({
          where,
          orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
          take,
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNo: true } } },
        }),
        prisma.chatEscalation.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);
      sendResponse(res, true, {
        items,
        counts: Object.fromEntries(STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all ?? 0])),
      });
    }),
  );

  router.patch(
    "/chat-escalations/:id",
    wrap(async (req, res) => {
      const status = req.body?.status;
      if (!(STATUSES as readonly string[]).includes(status)) throw new ApiError("status must be PENDING, CONTACTED or DISMISSED.", STATUS_CODES.BAD_REQUEST);
      const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim().slice(0, 1000) || null : undefined;
      const existing = await prisma.chatEscalation.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!existing) throw new ApiError("Escalation not found", STATUS_CODES.NOT_FOUND);
      const pending = status === "PENDING";
      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.chatEscalation.update({
          where: { id: req.params.id },
          data: { status, ...(adminNote !== undefined ? { adminNote } : {}), handledById: pending ? null : req.user!.id, handledAt: pending ? null : new Date() },
        });
        await writeAudit(req, { action: "chat-escalation.update", entityType: "chat_escalation", entityId: row.id, summary: `Marked chat escalation ${status}` }, tx);
        return row;
      });
      sendResponse(res, true, updated, "Escalation updated");
    }),
  );

  return router;
}
