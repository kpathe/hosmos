import rateLimit from "express-rate-limit";

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting Middleware
//
// All limits are per IP address.
// PRD Section 23.5 defines these limits.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auth endpoint limiter (login + register routes)
 * 10 requests per 15 minutes per IP — prevents brute-force attacks
 */
export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many login attempts. Please try again in 15 minutes.",
    },
  },
});

/**
 * Registration limiter
 * 5 requests per hour per IP
 */
export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many registration attempts. Please try again in an hour.",
    },
  },
});

/**
 * Token refresh limiter
 * 30 requests per 15 minutes per IP
 */
export const authRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many token refresh attempts. Please try again later.",
    },
  },
});

/**
 * General API limiter for authenticated routes
 * 200 requests per minute per IP
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please slow down.",
    },
  },
});
