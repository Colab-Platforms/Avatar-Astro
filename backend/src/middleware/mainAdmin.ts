import type { Response, NextFunction } from "express";
import prisma from "@root/prisma.js";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";
import type { AuthRequest } from "@/middleware/authMiddleware.js";

export type MainAdminRequest = AuthRequest & { adminEmail?: string };

/**
 * Main-admin authorisation for the admin panel APIs. Runs after auth() has
 * verified the signed JWT, then re-checks against the DATABASE on every call so
 * a revoked or deactivated admin loses access immediately rather than when the
 * token expires. Nothing the browser sends (role claims in local storage, user
 * ids in bodies) is trusted: the role comes from the signed token AND the
 * user_role_mapping table.
 *
 * The main admin is the user holding the SUPERADMIN role. If MAIN_ADMIN_EMAIL
 * is set, it must also match the account email (a second lock). Fails closed.
 */
export async function requireMainAdmin(req: MainAdminRequest, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError("Authentication required", STATUS_CODES.UNAUTHORIZED);
    if (req.user.role !== "SUPERADMIN") {
      throw new ApiError("Main admin access required", STATUS_CODES.FORBIDDEN);
    }
    const user = await prisma.user.findFirst({
      where: { id: req.user.id, isActive: true, isDeleted: false },
      select: { id: true, email: true, userRoleMappings: { select: { role: { select: { name: true } } } } },
    });
    const isSuper = user?.userRoleMappings.some((m) => m.role.name === "SUPERADMIN" || m.role.name === "SUPER_ADMIN");
    const pinned = process.env.MAIN_ADMIN_EMAIL?.trim().toLowerCase();
    if (!user || !isSuper || (pinned && user.email.toLowerCase() !== pinned)) {
      throw new ApiError("Main admin access required", STATUS_CODES.FORBIDDEN);
    }
    req.adminEmail = user.email;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    // Database trouble: refuse (fail closed) without leaking internals.
    console.error("[mainAdmin] access check failed:", (err as Error)?.message);
    next(new ApiError("Unable to verify admin access right now. Please try again.", 503));
  }
}
