import {
  pgTable,
  uuid,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels";
import { rooms } from "./rooms";
import { hostellers } from "./hostellers";

// ─────────────────────────────────────────────────────────────────────────────
// Room Occupancies
//
// Historical record of which hosteller occupied which room and when.
// Occupancy is NEVER stored as a count — always derived from these records.
//
// PRD invariants:
//   - Only one active occupancy per hosteller at a time
//     (enforced by partial unique index: WHERE effective_to IS NULL)
//   - PER_SEAT rooms: active occupants must not exceed room.capacity
//   - FULL_ROOM rooms: active occupants must not exceed 1
//   Both capacity invariants are enforced by the admission service layer.
//
// Room changes:
//   - Admin closes the current occupancy (effective_to = last day of month)
//   - Opens new occupancy (effective_from = 1st of next month)
//   Both done atomically in a single transaction.
// ─────────────────────────────────────────────────────────────────────────────

export const roomOccupancies = pgTable(
  "room_occupancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Denormalized for efficient tenant-scoped queries */
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),

    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),

    hostelerId: uuid("hosteller_id")
      .notNull()
      .references(() => hostellers.id, { onDelete: "restrict" }),

    /**
     * First billing-effective day of this occupancy.
     * Set to admission_date for new admissions.
     * Set to 1st of month after room change.
     */
    effectiveFrom: date("effective_from").notNull(),

    /**
     * Last day of this occupancy period.
     * NULL means currently active.
     * Set when hosteller changes rooms or exits.
     */
    effectiveTo: date("effective_to"),

    /** UUID of the admin/manager who created this occupancy record */
    createdBy: uuid("created_by"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * CRITICAL: One active occupancy per hosteller at a time.
     * The PARTIAL UNIQUE INDEX (WHERE effective_to IS NULL) cannot be expressed
     * in Drizzle's table definition API — it must be added via a raw SQL migration.
     *
     * Drizzle-generated migration will include normal indexes; the DBA must
     * also add this SQL after running `db:generate`:
     *   CREATE UNIQUE INDEX idx_unique_active_occupancy
     *   ON room_occupancies(hosteller_id)
     *   WHERE effective_to IS NULL;
     *
     * The admission service layer also enforces this via SELECT FOR UPDATE +
     * application-level check before inserting any occupancy record.
     */
    index("idx_room_occupancies_room_id").on(t.roomId),
    index("idx_room_occupancies_hosteller_id").on(t.hostelerId),
    index("idx_room_occupancies_hostel_id").on(t.hostelId),
    index("idx_room_occupancies_effective_to").on(t.effectiveTo),
  ]
);

export type RoomOccupancy = typeof roomOccupancies.$inferSelect;
export type NewRoomOccupancy = typeof roomOccupancies.$inferInsert;
