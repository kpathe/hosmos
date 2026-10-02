import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Refresh Tokens
//
// Stores hashed refresh tokens for all user types (owner, manager, hosteller).
// The raw token is sent to the client via HttpOnly cookie only.
// NEVER store the raw token — only the SHA-256 hash.
//
// Token rotation: on every /auth/refresh call, the old token is revoked
// and a new one is issued. This is done atomically in a transaction.
//
// Replay detection: if a revoked token is used, it will not be found
// (revoked_at IS NOT NULL check fails). Future: alert on revoked token reuse.
// ─────────────────────────────────────────────────────────────────────────────

export const userTypeEnum = pgEnum("user_type", ["owner", "manager", "hosteller"]);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** UUID of the owner, manager, or hosteller — polymorphic reference */
    userId: uuid("user_id").notNull(),
    userType: userTypeEnum("user_type").notNull(),

    /**
     * SHA-256 hash of the raw refresh token.
     * The raw token is NEVER stored in the database.
     * Lookup: hash the incoming cookie value and find this record.
     */
    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    /**
     * Set when token is revoked (logout or rotation).
     * NULL means the token is currently active.
     */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** Primary lookup: find token by hash */
    index("idx_refresh_tokens_hash").on(t.tokenHash),
    /** Cleanup: find all expired or revoked tokens */
    index("idx_refresh_tokens_user").on(t.userId, t.userType),
    index("idx_refresh_tokens_cleanup").on(t.expiresAt),
  ]
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
