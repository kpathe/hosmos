import { eq, and, isNull, sql, inArray, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { securityDeposits } from "../../db/schema/security-deposits.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { rooms } from "../../db/schema/rooms.js";
import { pricingModels } from "../../db/schema/pricing-models.js";
import { bills, billItems } from "../../db/schema/bills.js";
import { NotFoundError, BusinessRuleError } from "../../utils/errors.js";
import type { ProcessExitDto, ExitPreviewDto } from "./exits.schema.js";
import type { ExitSettlementDto } from "@hosmos/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getHostellerLookupCondition(identifier: string) {
  return UUID_REGEX.test(identifier)
    ? or(eq(hostellers.id, identifier), eq(hostellers.nameSlug, identifier))
    : eq(hostellers.nameSlug, identifier);
}

export class ExitsService {
  async markExitPending(hostelId: string, hostellerId: string, userId: string) {
    const [hosteller] = await db
      .select()
      .from(hostellers)
      .where(and(getHostellerLookupCondition(hostellerId), eq(hostellers.hostelId, hostelId)));

    if (!hosteller) {
      throw new NotFoundError("Hosteller not found");
    }

    const actualHostellerId = hosteller.id;

    if (hosteller.status === "removed") {
      throw new BusinessRuleError("ALREADY_REMOVED", "Hosteller has already exited and been removed");
    }

    const [updated] = await db
      .update(hostellers)
      .set({
        status: "exit_pending",
        updatedAt: new Date(),
      })
      .where(eq(hostellers.id, actualHostellerId))
      .returning();

    return {
      message: "Hosteller notice recorded; status changed to exit pending",
      hosteller: {
        id: updated!.id,
        name: updated!.name,
        status: updated!.status,
      },
    };
  }

  async getExitPreview(hostelId: string, hostellerId: string, previewDto: ExitPreviewDto) {
    const [hosteller] = await db
      .select()
      .from(hostellers)
      .where(and(getHostellerLookupCondition(hostellerId), eq(hostellers.hostelId, hostelId)));

    if (!hosteller) {
      throw new NotFoundError("Hosteller not found");
    }

    const actualHostellerId = hosteller.id;

    if (hosteller.status === "removed") {
      throw new BusinessRuleError("ALREADY_REMOVED", "Hosteller has already exited");
    }

    // Active occupancy and room
    const [occupancy] = await db
      .select({
        id: roomOccupancies.id,
        roomId: roomOccupancies.roomId,
        roomNumber: rooms.roomNumber,
        monthlyRentPaise: pricingModels.monthlyAmountPaise,
      })
      .from(roomOccupancies)
      .innerJoin(rooms, eq(roomOccupancies.roomId, rooms.id))
      .innerJoin(pricingModels, eq(rooms.pricingModelId, pricingModels.id))
      .where(
        and(
          eq(roomOccupancies.hostellerId, actualHostellerId),
          isNull(roomOccupancies.effectiveTo)
        )
      );

    // Security deposit
    const [deposit] = await db
      .select()
      .from(securityDeposits)
      .where(and(eq(securityDeposits.hostellerId, actualHostellerId), eq(securityDeposits.hostelId, hostelId)));

    const depositAmountPaise = deposit?.originalAmountPaise || 0;

    // Unpaid bills
    const unpaidBills = await db
      .select()
      .from(bills)
      .where(and(eq(bills.hostellerId, actualHostellerId), eq(bills.status, "unpaid")));

    const outstandingBalancePaise = unpaidBills.reduce((acc, b) => acc + b.totalAmountPaise, 0);

    // Calculate exit type specific adjustments
    let extraRentPaise = 0;
    let refundCreditPaise = 0;

    const exitDateObj = new Date(previewDto.exit_date);
    const exitDay = exitDateObj.getDate();
    const exitMonth = exitDateObj.getMonth() + 1;
    const exitYear = exitDateObj.getFullYear();
    const daysInMonth = new Date(exitYear, exitMonth, 0).getDate();

    if (previewDto.exit_type === "without_notice") {
      // 1 additional month rent charge
      extraRentPaise = occupancy ? occupancy.monthlyRentPaise : 0;
    } else if (previewDto.exit_type === "early_approved") {
      // Prorate refund credit for unused days of the current month
      if (occupancy && exitDay < daysInMonth) {
        const unusedDays = daysInMonth - exitDay;
        refundCreditPaise = Math.round((occupancy.monthlyRentPaise / daysInMonth) * unusedDays);
      }
    }

    const totalLiabilities = outstandingBalancePaise + extraRentPaise - refundCreditPaise;
    const netRefundPaise = depositAmountPaise - previewDto.damage_deductions_paise - totalLiabilities;

    return {
      hosteller_id: hosteller.id,
      hosteller_name: hosteller.name,
      room_number: occupancy?.roomNumber || "N/A",
      exit_date: previewDto.exit_date,
      exit_type: previewDto.exit_type,
      original_deposit_paise: depositAmountPaise,
      damage_deductions_paise: previewDto.damage_deductions_paise,
      outstanding_balance_paise: outstandingBalancePaise,
      extra_rent_paise: extraRentPaise,
      refund_credit_paise: refundCreditPaise,
      net_refund_paise: netRefundPaise,
      unpaid_bills: unpaidBills.map(b => ({
        id: b.id,
        year: b.billingPeriodYear,
        month: b.billingPeriodMonth,
        amount_paise: b.totalAmountPaise,
      })),
    };
  }

  async processExit(hostelId: string, dto: ProcessExitDto, userId: string): Promise<ExitSettlementDto> {
    return await db.transaction(async (tx) => {
      const [hosteller] = await tx
        .select()
        .from(hostellers)
        .where(and(getHostellerLookupCondition(dto.hosteller_id), eq(hostellers.hostelId, hostelId)));

      if (!hosteller) {
        throw new NotFoundError("Hosteller not found");
      }

      const actualHostellerId = hosteller.id;

      if (hosteller.status === "removed") {
        throw new BusinessRuleError("ALREADY_REMOVED", "Hosteller has already exited");
      }

      const [deposit] = await tx
        .select()
        .from(securityDeposits)
        .where(and(eq(securityDeposits.hostellerId, actualHostellerId), eq(securityDeposits.hostelId, hostelId)));

      if (!deposit) {
        throw new NotFoundError("Security deposit record not found for this hosteller");
      }

      if (deposit.status === "settled") {
        throw new BusinessRuleError("ALREADY_SETTLED", "Security deposit is already settled");
      }

      const [occupancy] = await tx
        .select({
          id: roomOccupancies.id,
          monthlyRentPaise: pricingModels.monthlyAmountPaise,
        })
        .from(roomOccupancies)
        .innerJoin(rooms, eq(roomOccupancies.roomId, rooms.id))
        .innerJoin(pricingModels, eq(rooms.pricingModelId, pricingModels.id))
        .where(
          and(
            eq(roomOccupancies.hostellerId, actualHostellerId),
            isNull(roomOccupancies.effectiveTo)
          )
        );

      // Handle adjustments
      const exitDateObj = new Date(dto.exit_date);
      const exitDay = exitDateObj.getDate();
      const exitMonth = exitDateObj.getMonth() + 1;
      const exitYear = exitDateObj.getFullYear();
      const daysInMonth = new Date(exitYear, exitMonth, 0).getDate();

      let extraRentPaise = 0;
      let refundCreditPaise = 0;

      if (dto.exit_type === "without_notice") {
        extraRentPaise = occupancy ? occupancy.monthlyRentPaise : 0;
        if (extraRentPaise > 0) {
          // Create extra month penalty bill
          const [penaltyBill] = await tx
            .insert(bills)
            .values({
              hostelId,
              hostellerId: actualHostellerId,
              billingPeriodYear: exitYear,
              billingPeriodMonth: exitMonth,
              status: "unpaid",
              totalAmountPaise: extraRentPaise,
              createdBy: userId,
            })
            .returning();

          await tx.insert(billItems).values({
            billId: penaltyBill!.id,
            hostelId,
            itemType: "rent",
            description: "Notice period penalty (1 month rent without notice)",
            amountPaise: extraRentPaise,
            createdBy: userId,
          });
        }
      } else if (dto.exit_type === "early_approved") {
        if (occupancy && exitDay < daysInMonth) {
          const unusedDays = daysInMonth - exitDay;
          refundCreditPaise = Math.round((occupancy.monthlyRentPaise / daysInMonth) * unusedDays);
        }
      }

      // Fetch all unpaid bills (including any penalty bill created)
      const unpaidBills = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.hostellerId, actualHostellerId), eq(bills.status, "unpaid")));

      const outstandingBalancePaise = unpaidBills.reduce((acc, b) => acc + b.totalAmountPaise, 0);

      // Final net refund calculation
      const totalLiabilities = outstandingBalancePaise - refundCreditPaise;
      const netRefundPaise = deposit.originalAmountPaise - dto.damage_deductions_paise - totalLiabilities;

      // Settle unpaid bills if deposit absorbs them
      if (deposit.originalAmountPaise - dto.damage_deductions_paise >= totalLiabilities) {
        if (unpaidBills.length > 0) {
          await tx
            .update(bills)
            .set({
              status: "paid",
              paidAt: new Date(),
              updatedBy: userId,
              updatedAt: new Date(),
            })
            .where(inArray(bills.id, unpaidBills.map(b => b.id)));
        }
      }

      // Update Security Deposit
      const [updatedDeposit] = await tx
        .update(securityDeposits)
        .set({
          deductionsPaise: dto.damage_deductions_paise,
          refundedAmountPaise: Math.max(0, netRefundPaise),
          settlementDate: dto.exit_date,
          settlementNotes: dto.deduction_notes || null,
          status: "settled",
          updatedAt: new Date(),
        })
        .where(eq(securityDeposits.id, deposit.id))
        .returning();

      // Vacate active room occupancy
      if (occupancy) {
        await tx
          .update(roomOccupancies)
          .set({
            effectiveTo: dto.exit_date,
          })
          .where(eq(roomOccupancies.id, occupancy.id));
      }

      // Mark hosteller as removed
      await tx
        .update(hostellers)
        .set({
          status: "removed",
          updatedAt: new Date(),
        })
        .where(eq(hostellers.id, actualHostellerId));

      return {
        hosteller_id: actualHostellerId,
        exit_date: dto.exit_date,
        exit_type: dto.exit_type,
        security_deposit: {
          id: updatedDeposit!.id,
          hosteller_id: updatedDeposit!.hostellerId,
          hostel_id: updatedDeposit!.hostelId,
          original_amount_paise: updatedDeposit!.originalAmountPaise,
          deductions_paise: updatedDeposit!.deductionsPaise,
          refunded_amount_paise: updatedDeposit!.refundedAmountPaise,
          settlement_date: updatedDeposit!.settlementDate,
          settlement_notes: updatedDeposit!.settlementNotes,
          status: updatedDeposit!.status,
          created_at: updatedDeposit!.createdAt.toISOString(),
          updated_at: updatedDeposit!.updatedAt.toISOString(),
        },
        outstanding_balance_paise: outstandingBalancePaise,
        damage_deductions_paise: dto.damage_deductions_paise,
        net_refund_paise: netRefundPaise,
      };
    });
  }

  async getExits(hostelId: string) {
    const records = await db
      .select({
        deposit: securityDeposits,
        hostellerName: hostellers.name,
        hostellerEmail: hostellers.email,
        hostellerPhone: hostellers.phone,
      })
      .from(securityDeposits)
      .innerJoin(hostellers, eq(securityDeposits.hostellerId, hostellers.id))
      .where(and(eq(securityDeposits.hostelId, hostelId), eq(securityDeposits.status, "settled")))
      .orderBy(sql`${securityDeposits.settlementDate} DESC`);

    return records.map(r => ({
      id: r.deposit.id,
      hosteller_id: r.deposit.hostellerId,
      hosteller_name: r.hostellerName,
      hosteller_email: r.hostellerEmail,
      hosteller_phone: r.hostellerPhone,
      original_amount_paise: r.deposit.originalAmountPaise,
      deductions_paise: r.deposit.deductionsPaise,
      refunded_amount_paise: r.deposit.refundedAmountPaise,
      settlement_date: r.deposit.settlementDate,
      settlement_notes: r.deposit.settlementNotes,
    }));
  }

  async getExitById(hostelId: string, id: string) {
    const [record] = await db
      .select({
        deposit: securityDeposits,
        hostellerName: hostellers.name,
        hostellerEmail: hostellers.email,
        hostellerPhone: hostellers.phone,
      })
      .from(securityDeposits)
      .innerJoin(hostellers, eq(securityDeposits.hostellerId, hostellers.id))
      .where(and(eq(securityDeposits.id, id), eq(securityDeposits.hostelId, hostelId)));

    if (!record) {
      throw new NotFoundError("Exit settlement record not found");
    }

    return {
      id: record.deposit.id,
      hosteller_id: record.deposit.hostellerId,
      hosteller_name: record.hostellerName,
      hosteller_email: record.hostellerEmail,
      hosteller_phone: record.hostellerPhone,
      original_amount_paise: record.deposit.originalAmountPaise,
      deductions_paise: record.deposit.deductionsPaise,
      refunded_amount_paise: record.deposit.refundedAmountPaise,
      settlement_date: record.deposit.settlementDate,
      settlement_notes: record.deposit.settlementNotes,
    };
  }
}

export const exitsService = new ExitsService();
