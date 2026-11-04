import type { Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import type { AuthRequest } from "@/middleware/authMiddleware.js";

export type AstrologerRequest = AuthRequest & { astrologerProfileId?: string };

/**
 * Astrologer-only authorisation, modeled directly on requireMainAdmin
 * (middleware/mainAdmin.ts): runs after auth("USER") has verified the signed JWT (which
 * never carries an ASTROLOGER claim — this stays entirely relational, see the
 * implementation plan), then re-checks the DATABASE on every request:
 *   1. the account is active (isActive && !isDeleted)
 *   2. a UserRoleMapping row to the "ASTROLOGER" Role exists
 *   3. an AstrologerProfile exists for them with suspendedAt: null
 * All three, not just the role row — so if a suspension's role-revoke and
 * profile-unpublish steps ever diverged (a bug, a partial failure), this still fails
 * closed on the profile check alone. No caching: a suspension is visible on the very
 * next request, never waiting for a token to expire, because the JWT never carried
 * this claim in the first place.
 */
export async function requireAstrologer(req: AstrologerRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError("Authentication required", STATUS_CODES.UNAUTHORIZED);

    const user = await prisma.user.findFirst({
      where: { id: req.user.id, isActive: true, isDeleted: false },
      select: {
        id: true,
        userRoleMappings: { select: { role: { select: { name: true } } } },
        astrologerProfile: { select: { id: true, suspendedAt: true } },
      },
    });

    const hasRole = user?.userRoleMappings.some((m) => m.role.name === "ASTROLOGER") ?? false;
    const profile = user?.astrologerProfile ?? null;

    if (!user || !hasRole || !profile || profile.suspendedAt) {
      throw new ApiError("Astrologer access required", STATUS_CODES.FORBIDDEN);
    }

    req.astrologerProfileId = profile.id;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    console.error("[astrologerAuth] access check failed:", (err as Error)?.message);
    next(new ApiError("Unable to verify astrologer access right now. Please try again.", 503));
  }
}
