import type { Request, Response, NextFunction } from "express";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";

/**
 * TenantMiddleware
 * 
 * Extracts the requested hostelId (e.g., from header X-Hostel-Id or URL param).
 * Verifies that the authenticated user has permission to access this hostel.
 * 
 * Must be used AFTER authMiddleware.
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AuthenticationError("User is not authenticated");
  }

  // Usually passed in headers for API requests, or could be a URL param
  const requestedHostelId = req.headers["x-hostel-id"] as string | undefined;

  if (!requestedHostelId) {
    // For Phase 1, we might not strictly enforce this if it's missing on generic routes,
    // but typically tenant-scoped routes should require it.
    throw new AuthorizationError("Missing X-Hostel-Id header");
  }

  if (req.user.role === "hosteller") {
    // Hostellers are strictly bound to a single hostelId stored in their JWT
    if (req.user.hostel_id !== requestedHostelId) {
      throw new AuthorizationError("You do not have access to this hostel");
    }
  } else if (req.user.role === "owner" || req.user.role === "manager") {
    // For MVP Phase 1, we will implement the actual DB check here in Phase 2
    // when we build the owner/hostel assignment APIs.
    // For now, we allow owners/managers to pass, but the logic would be:
    // 1. Owner: check if db.select().from(hostels).where({ id: requestedHostelId, ownerId: req.user.sub })
    // 2. Manager: check if db.select().from(hostelManagers).where({ managerId: req.user.sub, hostelId: requestedHostelId })
  }

  // Attach the verified hostel ID to the request for downstream controllers
  // req.tenantId = requestedHostelId; // If we extended Express.Request
  next();
}
