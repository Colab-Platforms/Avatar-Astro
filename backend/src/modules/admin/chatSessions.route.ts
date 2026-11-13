import { Router, Request, Response, NextFunction } from "express";
import type { Prisma, ChatSessionStatus, ChatSessionType } from "@prisma/client";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import { sendResponse } from "@/utils/responseUtils.js";
import { endSession } from "@/modules/chat/billing.js";
import { writeAudit } from "./audit.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch((err) => {
      if (err instanceof ApiError) return next(err);
      console.error("[admin.chatSessions] unexpected error:", err);
      next(new ApiError("Failed to process chat sessions request", STATUS_CODES.SERVER_ERROR));
    });

/**
 * Superadmin monitoring and audit router for real-time customer <-> astrologer consultations.
 * Provides paginated session history, live status overview, metrics, full session audit,
 * and emergency administrative termination.
 */
export function createChatSessionsAdminRouter(): Router {
  const router = Router();

  router.get(
    "/",
    wrap(async (req, res) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const status = req.query.status as ChatSessionStatus | undefined;
      const type = req.query.type as ChatSessionType | undefined;
      const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : undefined;
      const astrologerProfileId = typeof req.query.astrologerProfileId === "string" ? req.query.astrologerProfileId.trim() : undefined;
      const startDate = typeof req.query.startDate === "string" ? req.query.startDate.trim() : undefined;
      const endDate = typeof req.query.endDate === "string" ? req.query.endDate.trim() : undefined;

      const where: Prisma.ChatSessionWhereInput = {};

      if (status) {
        where.status = status;
      }
      if (type) {
        where.type = type;
      }
      if (userId) {
        where.userId = userId;
      }
      if (astrologerProfileId) {
        where.astrologerProfileId = astrologerProfileId;
      }

      if (startDate || endDate) {
        where.requestedAt = {};
        if (startDate) {
          const parsedStart = new Date(startDate);
          if (!isNaN(parsedStart.getTime())) {
            where.requestedAt.gte = parsedStart;
          }
        }
        if (endDate) {
          const parsedEnd = new Date(endDate);
          if (!isNaN(parsedEnd.getTime())) {
            where.requestedAt.lte = parsedEnd;
          }
        }
      }

      if (search) {
        where.OR = [
          { user: { email: { contains: search, mode: "insensitive" } } },
          { user: { firstName: { contains: search, mode: "insensitive" } } },
          { user: { lastName: { contains: search, mode: "insensitive" } } },
          { astrologerProfile: { displayName: { contains: search, mode: "insensitive" } } },
          { id: { contains: search } },
        ];
      }

      const [total, items, statusCounts, aggregates] = await Promise.all([
        prisma.chatSession.count({ where }),
        prisma.chatSession.findMany({
          where,
          orderBy: { requestedAt: "desc" },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phoneNo: true,
              },
            },
            astrologerProfile: {
              select: {
                id: true,
                displayName: true,
                profilePhotoUrl: true,
                pricePerMinute: true,
              },
            },
            _count: {
              select: { messages: true },
            },
          },
        }),
        prisma.chatSession.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        prisma.chatSession.aggregate({
          _sum: {
            billedSeconds: true,
            amountPaise: true,
          },
          _count: { _all: true },
        }),
      ]);

      const countsByStatus = statusCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count._all;
        return acc;
      }, {});

      sendResponse(
        res,
        true,
        {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          metrics: {
            totalSessions: aggregates._count._all ?? 0,
            activeCount: countsByStatus.ACTIVE ?? 0,
            requestedCount: countsByStatus.REQUESTED ?? 0,
            pausedCount: countsByStatus.PAUSED ?? 0,
            endedCount: countsByStatus.ENDED ?? 0,
            totalBilledSeconds: aggregates._sum.billedSeconds ?? 0,
            totalAmountPaise: aggregates._sum.amountPaise ?? 0,
          },
          items,
        },
        "Chat sessions retrieved",
      );
    }),
  );

  router.get(
    "/:id",
    wrap(async (req, res) => {
      const { id } = req.params;

      const session = await prisma.chatSession.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNo: true,
              createdAt: true,
            },
          },
          astrologerProfile: {
            select: {
              id: true,
              displayName: true,
              profilePhotoUrl: true,
              pricePerMinute: true,
              isComplimentary: true,
              complimentaryMaxSeconds: true,
              user: {
                select: { id: true, email: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              senderRole: true,
              content: true,
              createdAt: true,
              isRead: true,
              clientMessageId: true,
            },
          },
        },
      });

      if (!session) {
        throw new ApiError("Chat session not found", STATUS_CODES.NOT_FOUND);
      }

      // Check for related wallet reservation
      const reservation = await prisma.walletReservation.findFirst({
        where: {
          referenceId: session.id,
          purpose: "CHAT_LOOKAHEAD",
        },
        orderBy: { createdAt: "desc" },
      });

      sendResponse(
        res,
        true,
        {
          session,
          reservation,
        },
        "Chat session details retrieved",
      );
    }),
  );

  router.post(
    "/:id/terminate",
    wrap(async (req, res) => {
      const { id } = req.params;
      const { reason = "Administrative termination" } = req.body ?? {};

      const session = await prisma.chatSession.findUnique({
        where: { id },
      });

      if (!session) {
        throw new ApiError("Chat session not found", STATUS_CODES.NOT_FOUND);
      }

      if (session.status === "ENDED") {
        throw new ApiError("Chat session is already ended", STATUS_CODES.BAD_REQUEST);
      }

      // End session using the billing state machine to cleanly release/settle reservations
      await endSession(id, "DISCONNECTED");

      await writeAudit(req, {
        action: "chat.session.force_terminate",
        entityType: "ChatSession",
        entityId: id,
        summary: `Admin terminated chat session ${id} (status was ${session.status}): ${reason}`,
        metadata: { previousStatus: session.status, reason },
      });

      const updated = await prisma.chatSession.findUnique({
        where: { id },
      });

      sendResponse(res, true, updated, "Chat session terminated by admin");
    }),
  );

  return router;
}

export default createChatSessionsAdminRouter;

