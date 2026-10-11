import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments } from "../../db/schema/payments.js";
import { securityDeposits } from "../../db/schema/security-deposits.js";
import type { MonthlyLedgerRequest } from "./reports.schema.js";

export interface MonthlyLedgerDto {
  year: number;
  month: number;
  total_payments_received_paise: number;
  security_deposits_collected_paise: number;
  security_deposits_refunded_paise: number;
  net_income_paise: number;
}

export class ReportsService {
  async getMonthlyLedger(hostelId: string, request: MonthlyLedgerRequest): Promise<MonthlyLedgerDto> {
    const { year, month } = request;

    // Build start and end dates for the month
    const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    
    // We can use SQL to extract year and month directly for simpler conditions
    // Using Postgres EXTRACT function

    // 1. Sum of all payments received
    const [paymentsResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payments.amountPaise}), 0)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.hostelId, hostelId),
          sql`EXTRACT(YEAR FROM ${payments.paymentDate}::date) = ${year}`,
          sql`EXTRACT(MONTH FROM ${payments.paymentDate}::date) = ${month}`
        )
      );

    // 2. Sum of security deposits collected
    const [depositsCollectedResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${securityDeposits.originalAmountPaise}), 0)::int`,
      })
      .from(securityDeposits)
      .where(
        and(
          eq(securityDeposits.hostelId, hostelId),
          sql`EXTRACT(YEAR FROM ${securityDeposits.createdAt}) = ${year}`,
          sql`EXTRACT(MONTH FROM ${securityDeposits.createdAt}) = ${month}`
        )
      );

    // 3. Sum of security deposits refunded
    const [depositsRefundedResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${securityDeposits.refundedAmountPaise}), 0)::int`,
      })
      .from(securityDeposits)
      .where(
        and(
          eq(securityDeposits.hostelId, hostelId),
          eq(securityDeposits.status, "settled"),
          sql`${securityDeposits.settlementDate} IS NOT NULL`,
          sql`EXTRACT(YEAR FROM ${securityDeposits.settlementDate}::date) = ${year}`,
          sql`EXTRACT(MONTH FROM ${securityDeposits.settlementDate}::date) = ${month}`
        )
      );

    const paymentsTotal = paymentsResult?.total || 0;
    const collectedTotal = depositsCollectedResult?.total || 0;
    const refundedTotal = depositsRefundedResult?.total || 0;

    // Net income = Payments + Deposits Collected - Deposits Refunded
    const netIncome = paymentsTotal + collectedTotal - refundedTotal;

    return {
      year,
      month,
      total_payments_received_paise: paymentsTotal,
      security_deposits_collected_paise: collectedTotal,
      security_deposits_refunded_paise: refundedTotal,
      net_income_paise: netIncome,
    };
  }
}

export const reportsService = new ReportsService();
