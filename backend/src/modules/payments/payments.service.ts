import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { payments } from "../../db/schema/payments.js";
import { bills } from "../../db/schema/bills.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { NotFoundError, BusinessRuleError } from "../../utils/errors.js";
import type { RecordPaymentDto } from "./payments.schema.js";
import type { PaymentDto } from "@hosmos/types";
import { randomBytes } from "node:crypto";

function generateRecordNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `PAY-${dateStr}-${rand}`;
}

function mapPaymentToDto(payment: typeof payments.$inferSelect, hostellerName: string): PaymentDto {
  return {
    id: payment.id,
    hostel_id: payment.hostelId,
    hosteller_id: payment.hostellerId,
    hosteller_name: hostellerName,
    bill_id: payment.billId,
    record_number: payment.recordNumber,
    payment_date: payment.paymentDate,
    amount_paise: payment.amountPaise,
    mode: payment.mode,
    description: payment.description,
    reference: payment.reference,
    created_at: payment.createdAt.toISOString(),
  };
}

export class PaymentsService {
  async recordPayment(hostelId: string, dto: RecordPaymentDto, userId: string): Promise<PaymentDto> {
    return await db.transaction(async (tx) => {
      // 1. Verify bill exists and belongs to hostel
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, dto.bill_id), eq(bills.hostelId, hostelId)));

      if (!bill) {
        throw new NotFoundError("Bill not found");
      }

      if (bill.hostellerId !== dto.hosteller_id) {
        throw new BusinessRuleError("PAYMENT_MISMATCH", "Bill does not belong to the specified hosteller");
      }

      if (bill.status === "paid") {
        throw new BusinessRuleError("BILL_ALREADY_PAID", "Cannot record payment for an already paid bill");
      }

      // 2. Get hosteller name for DTO
      const [hosteller] = await tx
        .select({ name: hostellers.name })
        .from(hostellers)
        .where(eq(hostellers.id, dto.hosteller_id));

      if (!hosteller) {
        throw new NotFoundError("Hosteller not found");
      }

      // 3. Create payment record
      const [payment] = await tx
        .insert(payments)
        .values({
          hostelId,
          hostellerId: dto.hosteller_id,
          billId: dto.bill_id,
          recordNumber: generateRecordNumber(),
          paymentDate: dto.payment_date,
          amountPaise: dto.amount_paise,
          mode: dto.mode,
          description: dto.description || null,
          reference: dto.reference || null,
          createdBy: userId,
        })
        .returning();

      // 4. Calculate total paid so far
      const allPayments = await tx
        .select({ amountPaise: payments.amountPaise })
        .from(payments)
        .where(eq(payments.billId, bill.id));

      const totalPaid = allPayments.reduce((sum, p) => sum + p.amountPaise, 0);

      // 5. If total paid >= bill total, mark as paid
      if (totalPaid >= bill.totalAmountPaise) {
        await tx
          .update(bills)
          .set({ 
            status: "paid", 
            paidAt: new Date(), 
            updatedBy: userId, 
            updatedAt: new Date() 
          })
          .where(eq(bills.id, bill.id));
      }

      return mapPaymentToDto(payment!, hosteller.name);
    });
  }

  async getPayments(hostelId: string, filters: { hostellerId?: string; billId?: string }): Promise<PaymentDto[]> {
    const conditions = [eq(payments.hostelId, hostelId)];
    
    if (filters.hostellerId) conditions.push(eq(payments.hostellerId, filters.hostellerId));
    if (filters.billId) conditions.push(eq(payments.billId, filters.billId));

    const records = await db
      .select({
        payment: payments,
        hostellerName: hostellers.name,
      })
      .from(payments)
      .innerJoin(hostellers, eq(payments.hostellerId, hostellers.id))
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt));

    return records.map(r => mapPaymentToDto(r.payment, r.hostellerName));
  }
}

export const paymentsService = new PaymentsService();
