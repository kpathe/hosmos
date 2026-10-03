import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { hostels } from "./hostels";
import { hostellers } from "./hostellers";
import { payments } from "./payments";

// ─────────────────────────────────────────────────────────────────────────────
// Advance Rent Allocations
//
// Maps prepaid advance rent to specific billing periods.
// PRD: advance rent is NOT a floating balance — it must be allocated
// to specific months so the billing system knows which months are covered.
//
// At admission: 3 records are created (one per advance month).
// Additional prepayments create additional records.
//
// When generating a monthly bill: if an allocation exists for that period,
// no rent bill_item is created for that month.
// ─────────────────────────────────────────────────────────────────────────────

export const advanceRentAllocations = pgTable(
  "advance_rent_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostelerId: uuid("hosteller_id")
      .notNull()
      .references(() => hostellers.id, { onDelete: "restrict" }),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),

    /** Year of the billing period this advance covers */
    billingPeriodYear: integer("billing_period_year").notNull(),
    /** Month of the billing period this advance covers (1-12) */
    billingPeriodMonth: integer("billing_period_month").notNull(),

    /** Amount in paise allocated to this month */
    amountPaise: integer("amount_paise").notNull(),

    /**
     * The payment that funded this allocation.
     * Nullable because the advance may have been recorded
     * as part of the admission transaction before a separate payment record.
     */
    sourcePaymentId: uuid("source_payment_id").references(() => payments.id, {
      onDelete: "restrict",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** One advance allocation per hosteller per period */
    unique("uq_advance_allocation_period").on(
      t.hostelerId,
      t.billingPeriodYear,
      t.billingPeriodMonth
    ),
    index("idx_advance_allocations_hosteller_id").on(t.hostelerId),
    index("idx_advance_allocations_lookup").on(
      t.hostelerId,
      t.billingPeriodYear,
      t.billingPeriodMonth
    ),
  ]
);

export type AdvanceRentAllocation = typeof advanceRentAllocations.$inferSelect;
export type NewAdvanceRentAllocation = typeof advanceRentAllocations.$inferInsert;
