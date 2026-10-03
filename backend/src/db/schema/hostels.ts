import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { owners } from "./owners";

// ─────────────────────────────────────────────────────────────────────────────
// Hostels
// Each hostel belongs to one owner. A hostel is the primary tenant unit.
// All financial configuration (electricity rate, security deposit, fine) lives here.
// ─────────────────────────────────────────────────────────────────────────────

export const hostels = pgTable(
  "hostels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => owners.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    address: text("address"),

    /**
     * Electricity rate stored in paise per unit.
     * Default: 1100 paise = ₹11.00 per unit.
     * PRD confirmed: configurable per hostel.
     */
    electricityRatePaise: integer("electricity_rate_paise").notNull().default(1100),

    /**
     * Security deposit amount in paise.
     * PRD: hostel-level global amount, same for all rooms.
     * Default: 500000 paise = ₹5000. Admin sets the actual amount.
     */
    securityDepositAmountPaise: integer("security_deposit_amount_paise")
      .notNull()
      .default(500000),

    /**
     * Late fine amount in paise.
     * Default: 100000 paise = ₹1000 (charged after 3 consecutive unpaid months).
     * V1: admin adds manually. Future: auto-calculated.
     */
    lateFineAmountPaise: integer("late_fine_amount_paise").notNull().default(100000),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_hostels_owner_id").on(t.ownerId)]
);

export type Hostel = typeof hostels.$inferSelect;
export type NewHostel = typeof hostels.$inferInsert;
