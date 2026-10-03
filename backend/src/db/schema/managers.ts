import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { owners } from "./owners";
import { hostels } from "./hostels";

// ─────────────────────────────────────────────────────────────────────────────
// Managers
// Operational staff. Global identity, scoped to hostels via hostel_managers.
// Created by owners. Must change password on first login.
// ─────────────────────────────────────────────────────────────────────────────

export const managers = pgTable(
  "managers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** Login identity — globally unique across all managers */
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_managers_email").on(t.email)]
);

// ─────────────────────────────────────────────────────────────────────────────
// Hostel Managers (Join Table)
// Many-to-many: a manager can be assigned to multiple hostels.
// A hostel can have multiple managers.
// ─────────────────────────────────────────────────────────────────────────────

export const hostelManagers = pgTable(
  "hostel_managers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => managers.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => owners.id, { onDelete: "restrict" }),
  },
  (t) => [
    /** A manager can only be assigned to a hostel once */
    unique("uq_hostel_manager").on(t.hostelId, t.managerId),
    index("idx_hostel_managers_hostel_id").on(t.hostelId),
    index("idx_hostel_managers_manager_id").on(t.managerId),
  ]
);

export type Manager = typeof managers.$inferSelect;
export type NewManager = typeof managers.$inferInsert;
export type HostelManager = typeof hostelManagers.$inferSelect;
export type NewHostelManager = typeof hostelManagers.$inferInsert;
