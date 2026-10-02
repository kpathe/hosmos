import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Owners
// Platform-level users who own one or more hostels.
// Created via CLI seed script (MVP). Not self-registered.
// ─────────────────────────────────────────────────────────────────────────────

export const owners = pgTable(
  "owners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Login identity — globally unique */
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    /** When true, owner must change password on next login */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_owners_email").on(t.email)]
);

export type Owner = typeof owners.$inferSelect;
export type NewOwner = typeof owners.$inferInsert;
