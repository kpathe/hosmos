import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels.js";
import { pricingModels } from "./pricing-models.js";

// ─────────────────────────────────────────────────────────────────────────────
// Rooms
//
// Physical rooms in a hostel. Capacity represents physical maximum occupants
// for PER_SEAT arrangements. For FULL_ROOM pricing, the service layer
// enforces max 1 active occupant regardless of physical capacity.
//
// PRD invariants enforced by service layer:
//   - pricing_model cannot be changed while room has active occupants
//   - pricing_model.compatible_capacity must equal room.capacity
//   - room.floor must be in pricing_model.compatible_floors (if non-empty)
// ─────────────────────────────────────────────────────────────────────────────

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),

    /** Human-readable room identifier, e.g., "101", "G-04", "3B" */
    roomNumber: text("room_number").notNull(),

    /**
     * Floor of the room.
     * Standardised values: 'G' (ground), '1', '2', '3'
     * Must match pricing_model.compatible_floors validation.
     */
    floor: text("floor").notNull(),

    /**
     * Physical maximum number of occupants.
     * For PER_SEAT rooms: max active occupancy = capacity.
     * For FULL_ROOM rooms: max active occupancy = 1 (enforced by service layer).
     */
    capacity: integer("capacity").notNull(),

    /**
     * Currently assigned pricing model.
     * NULL when room has no pricing arrangement (cannot admit until set).
     * Cannot be changed while room has active occupants (service layer invariant).
     */
    pricingModelId: uuid("pricing_model_id").references(() => pricingModels.id, {
      onDelete: "restrict",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** Room number must be unique within a hostel */
    unique("uq_hostel_room_number").on(t.hostelId, t.roomNumber),
    index("idx_rooms_hostel_id").on(t.hostelId),
    index("idx_rooms_pricing_model_id").on(t.pricingModelId),
  ]
);

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;
