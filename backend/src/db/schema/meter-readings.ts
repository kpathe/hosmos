import {
  pgTable,
  uuid,
  numeric,
  text,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels.js";
import { rooms } from "./rooms.js";

// ─────────────────────────────────────────────────────────────────────────────
// Meter Readings
//
// Records the electricity sub-meter reading for each room on the 1st of each month.
// Consumption for a given month is derived by subtracting consecutive readings.
//
// PRD electricity workflow:
//   Reading on Nov 1 → Reading on Dec 1
//   Consumption for November = Dec_1_reading - Nov_1_reading
//   Cost = consumption × hostel.electricity_rate_paise
//   Cost is divided equally among active room occupants for that period.
//
// Edge cases (PRD resolved decisions):
//   - Vacant room: electricity cost absorbed by hostel; no bill items.
//   - Meter reset: is_reset=true, admin adds electricity manually as adjustment.
//   - Missing reading: electricity billing skipped; admin adds manually later.
// ─────────────────────────────────────────────────────────────────────────────

export const meterReadings = pgTable(
  "meter_readings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "restrict" }),

    /**
     * Value displayed on the sub-meter.
     * Stored as numeric to support decimal meter displays.
     * Consumption is always derived: current_reading - previous_reading.
     */
    readingValue: numeric("reading_value", { precision: 10, scale: 2 }).notNull(),

    /**
     * Date of the reading — should always be the 1st of a month.
     * PRD confirmed: readings taken monthly on the 1st.
     */
    readingDate: date("reading_date").notNull(),

    /**
     * True if the meter was replaced or reset at this reading.
     * When true, admin must manually add electricity cost as a bill item adjustment.
     */
    isReset: boolean("is_reset").notNull().default(false),

    /** Admin notes, e.g., "Meter replaced, starting from 0" */
    notes: text("notes"),

    /** UUID of the owner/manager who recorded this reading */
    recordedBy: uuid("recorded_by"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_meter_readings_room_id").on(t.roomId),
    index("idx_meter_readings_hostel_id").on(t.hostelId),
    /** Most common query: get readings for a room ordered by date DESC */
    index("idx_meter_readings_room_date").on(t.roomId, t.readingDate),
  ]
);

export type MeterReading = typeof meterReadings.$inferSelect;
export type NewMeterReading = typeof meterReadings.$inferInsert;
