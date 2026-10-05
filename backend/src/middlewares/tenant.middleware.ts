import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { db } from "../db/index.js";
import { hostels } from "../db/schema/hostels.js";
import { hostelManagers } from "../db/schema/managers.js";
import { eq, and } from "drizzle-orm";

/**
 * TenantMiddleware
 * 
 * Extracts the requested hostelId (e.g., from header X-Hostel-Id or X-Hostel-Slug).
 * Verifies that the authenticated user has permission to access this hostel.
 * 
 * Must be used AFTER authMiddleware.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AuthenticationError("User is not authenticated");
    }

    const requestedHostelId = req.headers["x-hostel-id"] as string | undefined;
    const requestedHostelSlug = req.headers["x-hostel-slug"] as string | undefined;

    if (!requestedHostelId && !requestedHostelSlug) {
      throw new AuthorizationError("Missing X-Hostel-Id or X-Hostel-Slug header");
    }

    let targetHostelId = requestedHostelId;

    if (requestedHostelSlug) {
      const [hostel] = await db.select({ id: hostels.id }).from(hostels).where(eq(hostels.slug, requestedHostelSlug));
      if (!hostel) {
        throw new AuthorizationError("Hostel not found");
      }
      targetHostelId = hostel.id;
      // Normalize header for downstream controllers
      req.headers["x-hostel-id"] = targetHostelId;
    }

    if (!targetHostelId) {
      throw new AuthorizationError("Invalid hostel identification");
    }

    if (req.user.role === "hosteller") {
      if (req.user.hostel_id !== targetHostelId) {
        throw new AuthorizationError("You do not have access to this hostel");
      }
    } else if (req.user.role === "owner") {
      const [ownerHostel] = await db
        .select({ id: hostels.id })
        .from(hostels)
        .where(and(eq(hostels.id, targetHostelId), eq(hostels.ownerId, req.user.sub)));
      if (!ownerHostel) {
        throw new AuthorizationError("You do not have access to this hostel");
      }
    } else if (req.user.role === "manager") {
      const [managerLink] = await db
        .select({ id: hostelManagers.id })
        .from(hostelManagers)
        .where(and(eq(hostelManagers.hostelId, targetHostelId), eq(hostelManagers.managerId, req.user.sub)));
      if (!managerLink) {
        throw new AuthorizationError("You do not have access to this hostel");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
