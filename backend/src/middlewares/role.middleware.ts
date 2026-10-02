import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@hosmos/types";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";

/**
 * RoleMiddleware factory
 *
 * Returns a middleware that verifies the authenticated user has one of the
 * allowed roles. Must be used AFTER authMiddleware.
 *
 * Usage:
 *   router.post("/admissions", authMiddleware, requireRole("owner", "manager"), controller)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Route requires role(s): ${allowedRoles.join(", ")}. Current role: ${req.user.role}`
      );
    }

    next();
  };
}

/**
 * Convenience middleware: Owner only
 */
export const requireOwner = requireRole("owner");

/**
 * Convenience middleware: Owner or Manager
 */
export const requireOwnerOrManager = requireRole("owner", "manager");

/**
 * Convenience middleware: Hosteller only
 */
export const requireHosteller = requireRole("hosteller");
