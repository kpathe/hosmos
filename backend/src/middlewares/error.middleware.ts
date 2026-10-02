import type { Request, Response, NextFunction } from "express";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, isAppError } from "../utils/errors.js";
import { isProduction } from "../config/env.js";

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler Middleware
//
// Handles all errors thrown in route handlers and services.
// Must be registered as the LAST middleware in Express (4 arguments signature).
// ─────────────────────────────────────────────────────────────────────────────

export const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── Zod Validation Errors (schema validation failure) ──────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // ── Known Application Errors ───────────────────────────────────────────────
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // ── PostgreSQL Unique Constraint Violations ────────────────────────────────
  if (isDrizzleUniqueConstraintError(err)) {
    res.status(409).json({
      error: {
        code: "DUPLICATE_ENTRY",
        message: "A record with this value already exists",
      },
    });
    return;
  }

  // ── Unknown / Unexpected Errors ────────────────────────────────────────────
  // Log full details server-side; never leak internals to client
  console.error("Unhandled server error:", err);

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "An unexpected error occurred. Please try again later."
        : String(err instanceof Error ? err.message : err),
    },
  });
};

/**
 * Detects PostgreSQL unique constraint violations from the node-postgres driver.
 * Error code 23505 = unique_violation in PostgreSQL.
 */
function isDrizzleUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}
