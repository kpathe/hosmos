import {
  pgTable,
  uuid,
  integer,
  text,
  date,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels";
import { hostellers } from "./hostellers";
import { bills } from "./bills";

// ─────────────────────────────────────────────────────────────────────────────
// Payment Mode Enum
// ─────────────────────────────────────────────────────────────────────────────

export const paymentModeEnum = pgEnum("payment_mode", ["cash", "cheque", "upi"]);

// ─────────────────────────────────────────────────────────────────────────────
// Payments
//
// Records of actual payments made by hostellers against bills.
// IMMUTABLE after creation — no updates, no deletes.
//
// PRD notes:
//   - A payment marks a bill as paid when amount >= bill.total_amount_paise
//   - Designed to support future partial/multiple payments per bill
//   - record_number is a human-readable reference (generated server-side)
// ─────────────────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),
    hostelerId: uuid("hosteller_id")
      .notNull()
      .references(() => hostellers.id, { onDelete: "restrict" }),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "restrict" }),

    /** Human-readable reference, e.g., "PMT-20261015-A3F2B" (server-generated) */
    recordNumber: text("record_number").notNull().unique(),

    /** Date on which the payment was physically made */
    paymentDate: date("payment_date").notNull(),

    /** Amount paid in paise */
    amountPaise: integer("amount_paise").notNull(),

    mode: paymentModeEnum("mode").notNull(),

    /** Optional description, e.g., "October advance" */
    description: text("description"),

    /** Cheque number, UPI transaction ID, etc. */
    reference: text("reference"),

    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_payments_hostel_id").on(t.hostelId),
    index("idx_payments_hosteller_id").on(t.hostelerId),
    index("idx_payments_bill_id").on(t.billId),
    index("idx_payments_payment_date").on(t.paymentDate),
  ]
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
