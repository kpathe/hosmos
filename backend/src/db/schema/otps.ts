import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Verification OTPs
//
// Stores cryptographically hashed one-time passwords for verification flows:
//   - hosteller_signup: Email verification prior to setting account credentials
//   - password_reset: (future use)
//
// Invariants:
//   - Raw OTP is NEVER stored in database (only SHA-256 hash)
//   - Rate limiting: max_attempts limits brute force
//   - Single use: consumed_at is set immediately on verification
// ─────────────────────────────────────────────────────────────────────────────

export const otps = pgTable(
  "otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    otpHash: text("otp_hash").notNull(),
    purpose: text("purpose").notNull().default("hosteller_signup"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_otps_email_purpose").on(t.email, t.purpose),
    index("idx_otps_expires_at").on(t.expiresAt),
  ]
);

export type Otp = typeof otps.$inferSelect;
export type NewOtp = typeof otps.$inferInsert;

