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

// ─────────────────────────────────────────────────────────────────────────────
// Security Deposit Status Enum
// ─────────────────────────────────────────────────────────────────────────────

export const securityDepositStatusEnum = pgEnum("security_deposit_status", [
  "held",
  "settled",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Security Deposits
//
// Tracks the refundable security deposit collected at admission.
// This is a liability — NOT revenue.
//
// The deposit also appears as a bill_item on the admission bill for
// transparency (PRD decision OQ-8), but the authoritative lifecycle
// tracking is here.
//
// Settlement calculation at exit:
//   net_refund = original_amount - deductions - outstanding_bill_balances
// ─────────────────────────────────────────────────────────────────────────────

export const securityDeposits = pgTable(
  "security_deposits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostellerId: uuid("hosteller_id")
      .notNull()
      .references(() => hostellers.id, { onDelete: "restrict" }),
    hostelId: uuid("hostel_id")
      .notNull()
      .references(() => hostels.id, { onDelete: "restrict" }),

    /**
     * Actual amount collected from the hosteller at admission.
     * May differ from hostel.security_deposit_amount_paise in exceptional cases.
     */
    originalAmountPaise: integer("original_amount_paise").notNull(),

    /**
     * Total approved damage/loss deductions in paise.
     * 0 when no deductions. Updated during exit settlement.
     */
    deductionsPaise: integer("deductions_paise").notNull().default(0),

    /**
     * Actual amount refunded to the hosteller.
     * NULL until settlement is processed.
     * May differ from (original - deductions) if outstanding bills are deducted.
     */
    refundedAmountPaise: integer("refunded_amount_paise"),

    settlementDate: date("settlement_date"),
    settlementNotes: text("settlement_notes"),

    status: securityDepositStatusEnum("status").notNull().default("held"),

    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_security_deposits_hosteller_id").on(t.hostellerId),
    index("idx_security_deposits_hostel_id").on(t.hostelId),
  ]
);

export type SecurityDeposit = typeof securityDeposits.$inferSelect;
export type NewSecurityDeposit = typeof securityDeposits.$inferInsert;
