import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { 
  rooms, 
  pricingModels, 
  hostellers, 
  roomOccupancies, 
  bills, 
  billItems, 
  payments, 
  advanceRentAllocations, 
  securityDeposits 
} from "../../db/schema/index.js";
import type { CreateAdmissionRequest, AdmissionResultDto } from "@hosmos/types";
import { NotFoundError, ValidationError, BusinessRuleError } from "../../utils/errors.js";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function calculateProratedRent(monthlyAmount: number, admissionDateStr: string): number {
  const admissionDate = new Date(admissionDateStr);
  const year = admissionDate.getFullYear();
  const month = admissionDate.getMonth() + 1; // 1-12
  const day = admissionDate.getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const daysApplicable = daysInMonth - (day - 1);
  return Math.round((monthlyAmount / daysInMonth) * daysApplicable);
}

export class AdmissionsService {
  async admitHosteller(hostelId: string, createdBy: string, payload: CreateAdmissionRequest): Promise<AdmissionResultDto> {
    
    // We will use db.transaction
    return await db.transaction(async (tx) => {
      // 1. Validate room & pricing
      const row = await tx
        .select({ room: rooms, pricingModel: pricingModels })
        .from(rooms)
        .leftJoin(pricingModels, eq(rooms.pricingModelId, pricingModels.id))
        .where(and(eq(rooms.id, payload.room_id), eq(rooms.hostelId, hostelId)))
        .limit(1)
        .then(res => res[0]);
      
      if (!row || !row.room) throw new NotFoundError("Room not found");
      const room = row.room;
      if (!room.pricingModelId || !row.pricingModel) throw new BusinessRuleError("NO_PRICING_MODEL", "Room does not have a pricing model assigned");
      
      const isFullRoom = row.pricingModel.chargingBasis === "FULL_ROOM";
      
      // 2. Validate capacity (count active occupants)
      const occupancies = await tx.select({ count: sql<number>`count(*)` })
        .from(roomOccupancies)
        .where(
          and(
            eq(roomOccupancies.roomId, payload.room_id),
            sql`${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} > NOW()`
          )
        );
      const activeOccupants = Number(occupancies[0]?.count || 0);
      
      if (isFullRoom && activeOccupants >= 1) throw new BusinessRuleError("ROOM_FULL", "Room is fully occupied (FULL_ROOM pricing)");
      if (!isFullRoom && activeOccupants >= room.capacity) throw new BusinessRuleError("ROOM_FULL", "Room is at full capacity");
      
      // 3. Verify email globally unique
      const existing = await tx.query.hostellers.findFirst({
        where: and(eq(hostellers.email, payload.email), sql`${hostellers.status} != 'removed'`)
      });
      if (existing) throw new BusinessRuleError("EMAIL_EXISTS", "A hosteller with this email already exists");

      // 4. Create hosteller
      const [hosteller] = await tx.insert(hostellers).values({
        hostelId,
        name: payload.name,
        fatherName: payload.father_name || null,
        email: payload.email,
        phone: payload.phone || null,
        college: payload.college || null,
        branch: payload.branch || null,
        address: payload.address || null,
        aadhaarNumberEncrypted: payload.aadhaar_number || null, // Real app: encrypt this!
        admissionDate: payload.admission_date,
        status: "admitted",
        nameSlug: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}-${randomUUID().split('-')[0]}`,
        createdBy,
      }).returning();
      
      if (!hosteller) throw new Error("Failed to create hosteller");
      
      // 5. Create occupancy
      await tx.insert(roomOccupancies).values({
        roomId: room.id,
        hostellerId: hosteller.id,
        hostelId,
        effectiveFrom: payload.admission_date,
        createdBy,
      });

      // 6. Calculate Option C Rolling Advance Rent & Allocations
      // The student pays flat advance_months * monthlyAmount at admission.
      // E.g. advance_months = 3 means: 3 * 3,000 = 9,000 total rent + deposit = 14,000 flat.
      const monthlyAmountPaise = row.pricingModel.monthlyAmountPaise;
      const totalAdvanceRentPaise = payload.advance_months * monthlyAmountPaise;

      const admissionDate = new Date(payload.admission_date);
      const billYear = admissionDate.getFullYear();
      const billMonth = admissionDate.getMonth() + 1;
      const admissionDay = admissionDate.getDate();
      const daysInMonth = getDaysInMonth(billYear, billMonth);

      const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const advanceAllocationsToInsert = [];
      const futureMonthLabels: string[] = [];

      let currentMonthRentPaise = 0;
      let futureAdvanceRentPaise = 0;

      if (payload.advance_months > 0) {
        if (admissionDay === 1) {
          // Aligned to 1st of month
          currentMonthRentPaise = monthlyAmountPaise;
          futureAdvanceRentPaise = (payload.advance_months - 1) * monthlyAmountPaise;

          let curM = billMonth;
          let curY = billYear;
          for (let i = 0; i < payload.advance_months - 1; i++) {
            curM++;
            if (curM > 12) {
              curM = 1;
              curY++;
            }
            advanceAllocationsToInsert.push({
              hostellerId: hosteller.id,
              hostelId,
              billingPeriodYear: curY,
              billingPeriodMonth: curM,
              amountPaise: monthlyAmountPaise,
            });
            futureMonthLabels.push(`${MONTH_NAMES[curM - 1]} ${curY}`);
          }
        } else {
          // Mid-month admission: Option C (Rolling Date-to-Date Period)
          // Rent upfront is exactly totalAdvanceRentPaise.
          const daysApplicable = daysInMonth - (admissionDay - 1);
          currentMonthRentPaise = Math.round((monthlyAmountPaise / daysInMonth) * daysApplicable);
          futureAdvanceRentPaise = totalAdvanceRentPaise - currentMonthRentPaise;

          let remainingAdvanceToAllocate = futureAdvanceRentPaise;
          let curM = billMonth;
          let curY = billYear;

          while (remainingAdvanceToAllocate > 0) {
            curM++;
            if (curM > 12) {
              curM = 1;
              curY++;
            }
            const allocAmount = Math.min(monthlyAmountPaise, remainingAdvanceToAllocate);
            advanceAllocationsToInsert.push({
              hostellerId: hosteller.id,
              hostelId,
              billingPeriodYear: curY,
              billingPeriodMonth: curM,
              amountPaise: allocAmount,
            });
            futureMonthLabels.push(`${MONTH_NAMES[curM - 1]} ${curY}`);
            remainingAdvanceToAllocate -= allocAmount;
          }
        }
      }

      // 7. Prepare bill items
      const itemsToInsert: {
        itemType: "rent" | "security_deposit";
        description: string;
        amountPaise: number;
      }[] = [];

      if (currentMonthRentPaise > 0) {
        const desc = admissionDay === 1
          ? `Rent — Admission Month (${MONTH_NAMES[billMonth - 1]} ${billYear})`
          : `Rent — Admission Month (Prorated: ${daysInMonth - admissionDay + 1}/${daysInMonth} days)`;
        itemsToInsert.push({
          itemType: "rent",
          description: desc,
          amountPaise: currentMonthRentPaise,
        });
      }

      if (futureAdvanceRentPaise > 0) {
        itemsToInsert.push({
          itemType: "rent",
          description: `Advance Rent (${futureMonthLabels.join(", ")})`,
          amountPaise: futureAdvanceRentPaise,
        });
      }

      if (payload.security_deposit_amount_paise > 0) {
        itemsToInsert.push({
          itemType: "security_deposit",
          description: "Security deposit collected",
          amountPaise: payload.security_deposit_amount_paise,
        });
      }

      const totalBillAmount = itemsToInsert.reduce((sum, item) => sum + item.amountPaise, 0);

      // 8. Create admission bill
      const [bill] = await tx.insert(bills).values({
        hostelId,
        hostellerId: hosteller.id,
        billingPeriodYear: billYear,
        billingPeriodMonth: billMonth,
        status: "paid", // Paid at admission
        totalAmountPaise: totalBillAmount,
        paidAt: sql`NOW()`,
        createdBy,
      }).returning();

      if (!bill) throw new Error("Failed to create bill");

      const createdItems = await tx.insert(billItems).values(
        itemsToInsert.map(item => ({
          ...item,
          billId: bill.id,
          hostelId,
          createdBy,
        }))
      ).returning();

      // 9. Create security deposit record
      let securityDeposit: any = null;
      if (payload.security_deposit_amount_paise > 0) {
        const [sd] = await tx.insert(securityDeposits).values({
          hostellerId: hosteller.id,
          hostelId,
          originalAmountPaise: payload.security_deposit_amount_paise,
          status: "held",
          createdBy,
        }).returning();
        securityDeposit = sd;
      }

      // 10. Insert advance allocations for future prepaid months
      let insertedAllocations: any[] = [];
      if (advanceAllocationsToInsert.length > 0) {
        insertedAllocations = await tx.insert(advanceRentAllocations).values(advanceAllocationsToInsert).returning();
      }

      // 11. Create payment record (payment exactly matches totalBillAmount)
      const paymentTotal = totalBillAmount;
      const [payment] = await tx.insert(payments).values({
        hostelId,
        hostellerId: hosteller.id,
        billId: bill.id,
        recordNumber: `RCPT-${Date.now()}`,
        paymentDate: payload.payment_date,
        amountPaise: paymentTotal,
        mode: payload.payment_mode,
        description: payload.payment_description || "Admission Payment",
        reference: payload.payment_reference || null,
        createdBy,
      }).returning();

      if (!payment) throw new Error("Failed to create payment");

      if (insertedAllocations.length > 0) {
        await tx.update(advanceRentAllocations)
          .set({ sourcePaymentId: payment.id })
          .where(eq(advanceRentAllocations.hostellerId, hosteller.id));
      }

      return {
        hosteller: {
          id: hosteller.id,
          hostel_id: hosteller.hostelId,
          name: hosteller.name,
          father_name: hosteller.fatherName,
          email: hosteller.email,
          phone: hosteller.phone,
          college: hosteller.college,
          branch: hosteller.branch,
          address: hosteller.address,
          admission_date: hosteller.admissionDate,
          status: hosteller.status,
          name_slug: hosteller.nameSlug,
          created_at: hosteller.createdAt.toISOString()
        } as any,
        room: {
          id: room.id,
          room_number: room.roomNumber,
          floor: room.floor
        },
        admission_bill: {
          id: bill.id,
          hostel_id: bill.hostelId,
          hosteller_id: bill.hostellerId,
          hosteller_name: hosteller.name,
          billing_period_year: bill.billingPeriodYear,
          billing_period_month: bill.billingPeriodMonth,
          status: bill.status,
          total_amount_paise: bill.totalAmountPaise,
          items: createdItems.map(i => ({
            id: i.id,
            item_type: i.itemType,
            description: i.description,
            amount_paise: i.amountPaise,
            created_at: i.createdAt.toISOString(),
          })) as any[],
          generated_at: bill.generatedAt.toISOString(),
          paid_at: bill.paidAt?.toISOString() || null
        },
        advance_allocations: insertedAllocations.map(a => ({
          id: a.id,
          billing_period_year: a.billingPeriodYear,
          billing_period_month: a.billingPeriodMonth,
          amount_paise: a.amountPaise
        })),
        security_deposit: {
          id: securityDeposit.id,
          original_amount_paise: securityDeposit.originalAmountPaise,
          deductions_paise: securityDeposit.deductionsPaise,
          refunded_amount_paise: securityDeposit.refundedAmountPaise,
          settlement_date: securityDeposit.settlementDate,
          settlement_notes: securityDeposit.settlementNotes,
          status: securityDeposit.status
        },
        payment: {
          id: payment.id,
          hostel_id: payment.hostelId,
          hosteller_id: payment.hostellerId,
          hosteller_name: hosteller.name,
          bill_id: payment.billId,
          record_number: payment.recordNumber,
          payment_date: payment.paymentDate,
          amount_paise: payment.amountPaise,
          mode: payment.mode,
          description: payment.description,
          reference: payment.reference,
          created_at: payment.createdAt.toISOString()
        }
      };
    });
  }
}

export const admissionsService = new AdmissionsService();
