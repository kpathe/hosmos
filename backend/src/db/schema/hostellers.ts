import {
  pgTable,
  uuid,
  text,
  date,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels";

// ─────────────────────────────────────────────────────────────────────────────
// Hosteller Status Enum
//
// Lifecycle:
//   admitted     → Admin admits the hosteller (record created)
//   active       → Hosteller completes portal registration (credentials set)
//   exit_pending → Admin records that hosteller has given 1-month notice
//   removed      → Exit processing complete (cannot login)
// ─────────────────────────────────────────────────────────────────────────────

export const hostellerStatusEnum = pgEnum("hosteller_status", [
  "admitted",
  "active",
  "exit_pending",
  "removed",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Hostellers
//
// PRD invariants:
//   - email is globally unique (used as login identifier + registration lookup)
//   - username is globally unique (set during portal registration)
//   - password_hash is only set during portal registration
//   - Aadhaar is encrypted at rest (AES-256-GCM)
//   - status=removed hostellers cannot log in (enforced in auth service)
// ─────────────────────────────────────────────────────────────────────────────

export const hostellers = pgTable(
  "hostellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),

    name: text("name").notNull(),
    fatherName: text("father_name"),

    /**
     * Personal email address.
     * GLOBALLY UNIQUE (PRD decision OQ-2).
     * Dual purpose: contact info + lookup key for portal registration.
     * Can be used as login identifier (in addition to username).
     */
    email: text("email").notNull().unique(),

    phone: text("phone"),
    college: text("college"),
    branch: text("branch"),
    address: text("address"),

    /**
     * Aadhaar number encrypted with AES-256-GCM.
     * NEVER store plaintext. Never expose in API responses.
     * Masked to last 4 digits when shown to owner.
     */
    aadhaarNumberEncrypted: text("aadhaar_number_encrypted"),

    admissionDate: date("admission_date").notNull(),

    status: hostellerStatusEnum("status").notNull().default("admitted"),

    /**
     * Chosen username — set during portal registration.
     * Globally unique across all hostellers.
     */
    username: text("username").unique(),

    /**
     * bcrypt hash of portal password.
     * NULL until hosteller completes portal registration.
     */
    passwordHash: text("password_hash"),

    /** UUID of the owner or manager who admitted this hosteller */
    createdBy: uuid("created_by"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_hostellers_hostel_id").on(t.hostelId),
    index("idx_hostellers_email").on(t.email),
    index("idx_hostellers_status").on(t.status),
    index("idx_hostellers_username").on(t.username),
  ]
);

export type Hosteller = typeof hostellers.$inferSelect;
export type NewHosteller = typeof hostellers.$inferInsert;
