import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "@/utils/ApiError.js";
import STATUS_CODES from "@/utils/statusCodes.js";

export type Role = "USER" | "ADMIN" | "SUPERADMIN";

export type AuthRequest = Request & {
    user?: {
        id: string;
        role: Role;
    }
};

/**
 * Account status check. A signed token alone is not enough: a deactivated or
 * deleted account must stop working immediately, not when its access token
 * expires. Results are cached per user for a few seconds so a busy user costs
 * at most one cheap indexed query per window, and the admin panel clears the
 * entry the moment it deactivates someone (see invalidateAccountStatus).
 *
 * Fails CLOSED: if the status cannot be determined the request is refused with
 * 503 rather than letting a possibly revoked account through.
 */
export type AccountStatusChecker = (userId: string) => Promise<boolean>;

// Worst-case delay (per server instance) before a deactivation is noticed; the instance that performs
// the deactivation clears its own entry immediately. Override with ACCOUNT_STATUS_TTL_MS.
const STATUS_TTL_MS = Number(process.env.ACCOUNT_STATUS_TTL_MS) > 0 ? Number(process.env.ACCOUNT_STATUS_TTL_MS) : 5_000;
const MAX_CACHE = 5_000;
const statusCache = new Map<string, { active: boolean; at: number }>();

const defaultChecker: AccountStatusChecker = async (userId) => {
    // Imported lazily so route tests that stub the checker never load the database client.
    const { default: prisma } = await import("@root/prisma.js");
    const user = await prisma.user.findFirst({
        where: { id: userId, isActive: true, isDeleted: false },
        select: { id: true },
    });
    return !!user;
};

let checker: AccountStatusChecker = defaultChecker;

/** Test hook: replace (or with no argument, restore) the status lookup. */
export function setAccountStatusChecker(fn?: AccountStatusChecker): void {
    checker = fn ?? defaultChecker;
    statusCache.clear();
}

/** Forget a cached status so the next request re-reads the database. */
export function invalidateAccountStatus(userId: string): void {
    statusCache.delete(userId);
}

async function isAccountActive(userId: string): Promise<boolean> {
    const hit = statusCache.get(userId);
    if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.active;
    const active = await checker(userId);
    if (statusCache.size >= MAX_CACHE) statusCache.clear();
    statusCache.set(userId, { active, at: Date.now() });
    return active;
}

export const auth = (...allowedRoles: Role[]) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            const header = req.headers.authorization;
            if (!header || !header.startsWith("Bearer ")) {
                throw new ApiError("Authentication required", STATUS_CODES.UNAUTHORIZED);
            }

            const token = header.split(" ")[1];
            if (!process.env.JWT_SECRET) {
                throw new ApiError("JWT secret is not defined", STATUS_CODES.SERVER_ERROR);
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: Role };

            if (allowedRoles.length > 0) {
                const effectiveRoles = [...allowedRoles];
         // ensure that if a user has a higher role, they can access lower role routes
                if (effectiveRoles.includes("USER")) {
                    if (!effectiveRoles.includes("ADMIN")) effectiveRoles.push("ADMIN");
                    if (!effectiveRoles.includes("SUPERADMIN")) effectiveRoles.push("SUPERADMIN");
                } else if (effectiveRoles.includes("ADMIN") && !effectiveRoles.includes("SUPERADMIN")) {
                    effectiveRoles.push("SUPERADMIN");
                }

                if (!effectiveRoles.includes(decoded.role)) {
                    throw new ApiError("You do not have permission to access this resource", STATUS_CODES.FORBIDDEN);
                }
            }

            let active: boolean;
            try {
                active = await isAccountActive(decoded.id);
            } catch (err) {
                console.error("[auth] account status check failed:", (err as Error)?.message);
                throw new ApiError("Unable to verify your account right now. Please try again.", 503);
            }
            // 401 (not 403) so the client's refresh-once logic runs, fails, and signs the user out.
            if (!active) {
                throw new ApiError("This account is no longer active.", STATUS_CODES.UNAUTHORIZED);
            }

            req.user = { id: decoded.id, role: decoded.role };
            next();
        } catch (error: any) {
            if (error instanceof ApiError) {
                next(error);
            } else if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
                next(new ApiError("Invalid or expired token", STATUS_CODES.UNAUTHORIZED));
            } else {
                next(error);
            }
        }
    };
};
