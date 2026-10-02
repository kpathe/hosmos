import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/crypto.js";
import { AuthenticationError } from "../utils/errors.js";
import type { JwtPayload } from "../config/jwt.js";

// Extend Express Request to carry authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * AuthMiddleware
 *
 * Extracts and validates the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user for downstream use.
 *
 * Format: "Authorization: Bearer <access_token>"
 *
 * On failure: throws AuthenticationError (caught by global error middleware).
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or malformed Authorization header");
  }

  const token = authHeader.slice(7);

  // verifyAccessToken throws AuthenticationError on failure
  const payload = verifyAccessToken(token);

  req.user = payload;
  next();
}
