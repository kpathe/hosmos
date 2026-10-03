import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels";

// ─────────────────────────────────────────────────────────────────────────────
// Charging Basis Enum
// PER_SEAT: each occupant pays the configured amount per seat.
// FULL_ROOM: entire room is rented as one unit — always 1 occupant (INVARIANT).
// ─────────────────────────────────────────────────────────────────────────────

export const chargingBasisEnum = pgEnum("charging_basis", ["PER_SEAT", "FULL_ROOM"]);

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Models
//
// PRD invariants enforced by service layer:
//   - compatible_capacity must match the room's physical capacity
//   - compatible_floors must include the room's floor (if not empty)
//   - Cannot be changed while room is occupied
//   - FULL_ROOM models enforce max 1 active occupant on the room
// ─────────────────────────────────────────────────────────────────────────────

export const pricingModels = pgTable(
  "pricing_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),
    name: text("name").notNull(),

    /**
     * Charging basis for this model.
     * PER_SEAT: monthly_amount_paise is per occupant.
     * FULL_ROOM: monthly_amount_paise is the total room rent (1 occupant only).
     */
    chargingBasis: chargingBasisEnum("charging_basis").notNull(),

    /**
     * Monthly rent amount in paise.
     * PER_SEAT: amount per occupant (e.g., ₹2700 = 270000)
     * FULL_ROOM: total room rent (e.g., ₹6800 = 680000)
     */
    monthlyAmountPaise: integer("monthly_amount_paise").notNull(),

    /**
     * Physical room capacity this model is compatible with.
     * Service layer validates: pricing_model.compatible_capacity == room.capacity
     */
    compatibleCapacity: integer("compatible_capacity").notNull(),

    /**
     * Array of floor values this model applies to.
     * Valid values: 'G', '1', '2', '3'
     * Empty array means: compatible with any floor.
     * Stored as PostgreSQL TEXT[] using JSON workaround in Drizzle.
     */
    compatibleFloors: text("compatible_floors").array().notNull().default([]),

    /** Soft delete — prevents deletion of in-use models */
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_pricing_models_hostel_id").on(t.hostelId)]
);

export type PricingModel = typeof pricingModels.$inferSelect;
export type NewPricingModel = typeof pricingModels.$inferInsert;
