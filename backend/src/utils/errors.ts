// ─────────────────────────────────────────────────────────────────────────────
// Custom Application Error Classes
//
// Usage:
//   throw new NotFoundError("Bill not found");
//   throw new BusinessRuleError("ROOM_AT_CAPACITY", "Room has no available seats");
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required for extending built-in classes in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — Malformed request or invalid input that passed Zod but is semantically wrong */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

/** 401 — Missing, invalid, or expired authentication credentials */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

/** 403 — Authenticated but not permitted to access this resource */
export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
  }
}

/** 404 — Resource does not exist or is not visible to the requester */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
  }
}

/** 409 — Request conflicts with existing state (duplicate, constraint violation) */
export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

/**
 * 422 — Business rule violation.
 * Use a specific uppercase snake_case code so the frontend can identify the rule.
 * Examples: "ROOM_AT_CAPACITY", "BILL_ALREADY_PAID", "PRICING_INCOMPATIBLE"
 */
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 422, details);
  }
}

/** 500 — Unexpected internal server error */
export class InternalError extends AppError {
  constructor(message = "An internal error occurred") {
    super("INTERNAL_ERROR", message, 500);
  }
}

/** Type guard to check if an unknown value is an AppError */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
