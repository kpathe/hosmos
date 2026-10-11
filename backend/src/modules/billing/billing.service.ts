import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { bills, billItems } from "../../db/schema/bills.js";
import { advanceRentAllocations } from "../../db/schema/advance-rent-allocations.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { rooms } from "../../db/schema/rooms.js";
import { pricingModels } from "../../db/schema/pricing-models.js";
import { NotFoundError, BusinessRuleError } from "../../utils/errors.js";
import type { AddBillItemDto, UpdateBillItemDto } from "./billing.schema.js";
import type { BillDto, BillItemDto } from "@hosmos/types";
import { metersService } from "../meters/meters.service.js";

function mapBillItemToDto(record: typeof billItems.$inferSelect): BillItemDto {
  return {
    id: record.id,
    item_type: record.itemType,
    description: record.description,
    amount_paise: record.amountPaise,
    created_at: record.createdAt.toISOString(),
  };
}

function mapBillToDto(bill: typeof bills.$inferSelect, hostellerName: string, items: typeof billItems.$inferSelect[]): BillDto {
  return {
    id: bill.id,
    hostel_id: bill.hostelId,
    hosteller_id: bill.hostellerId,
    hosteller_name: hostellerName,
    billing_period_year: bill.billingPeriodYear,
    billing_period_month: bill.billingPeriodMonth,
    status: bill.status,
    total_amount_paise: bill.totalAmountPaise,
    items: items.map(mapBillItemToDto),
    generated_at: bill.generatedAt.toISOString(),
    paid_at: bill.paidAt ? bill.paidAt.toISOString() : null,
  };
}

export class BillingService {
  async generateMonthlyBills(hostelId: string, year: number, month: number, userId: string) {
    // 1. Get all eligible hostellers
    const eligibleHostellers = await db
      .select({ id: hostellers.id })
      .from(hostellers)
      .where(
        and(
          eq(hostellers.hostelId, hostelId),
          inArray(hostellers.status, ["admitted", "active", "exit_pending"])
        )
      );

    let billsCreated = 0;
    let billsSkipped = 0;

    for (const h of eligibleHostellers) {
      await db.transaction(async (tx) => {
        // Check if bill already exists for this period
        const [existingBill] = await tx
          .select({ id: bills.id })
          .from(bills)
          .where(
            and(
              eq(bills.hostellerId, h.id),
              eq(bills.billingPeriodYear, year),
              eq(bills.billingPeriodMonth, month)
            )
          );

        if (existingBill) {
          billsSkipped++;
          return;
        }

        // Check if advance rent covers this period
        const [advance] = await tx
          .select({ amountPaise: advanceRentAllocations.amountPaise })
          .from(advanceRentAllocations)
          .where(
            and(
              eq(advanceRentAllocations.hostellerId, h.id),
              eq(advanceRentAllocations.billingPeriodYear, year),
              eq(advanceRentAllocations.billingPeriodMonth, month)
            )
          );

        // Get active occupancy to determine rent amount and room
        const [occupancyData] = await tx
          .select({
            roomId: roomOccupancies.roomId,
            monthlyAmountPaise: pricingModels.monthlyAmountPaise,
          })
          .from(roomOccupancies)
          .innerJoin(rooms, eq(roomOccupancies.roomId, rooms.id))
          .innerJoin(pricingModels, eq(rooms.pricingModelId, pricingModels.id))
          .where(
            and(
              eq(roomOccupancies.hostellerId, h.id),
              isNull(roomOccupancies.effectiveTo)
            )
          );

        if (!occupancyData) {
          billsSkipped++;
          return;
        }

        let rentAmountPaise = occupancyData.monthlyAmountPaise;

        // If advance covers this month, rent is logically covered.
        let includeRent = true;
        if (advance && advance.amountPaise >= rentAmountPaise) {
          includeRent = false;
        } else if (advance) {
          rentAmountPaise -= advance.amountPaise;
        }

        // Check if electricity readings are available for this period
        const electricityShare = await metersService.getRoomElectricityShare(
          tx,
          hostelId,
          occupancyData.roomId,
          year,
          month
        );

        let totalAmountPaise = includeRent ? rentAmountPaise : 0;
        if (electricityShare && electricityShare.perOccupantCostPaise > 0) {
          totalAmountPaise += electricityShare.perOccupantCostPaise;
        }

        const [newBill] = await tx
          .insert(bills)
          .values({
            hostelId,
            hostellerId: h.id,
            billingPeriodYear: year,
            billingPeriodMonth: month,
            status: "unpaid",
            totalAmountPaise,
            createdBy: userId,
          })
          .returning();

        if (includeRent) {
          await tx.insert(billItems).values({
            billId: newBill!.id,
            hostelId,
            itemType: "rent",
            description: `Rent - ${month}/${year}`,
            amountPaise: rentAmountPaise,
            createdBy: userId,
          });
        }

        if (electricityShare && electricityShare.perOccupantCostPaise > 0) {
          await tx.insert(billItems).values({
            billId: newBill!.id,
            hostelId,
            itemType: "electricity",
            description: `Electricity Share - ${month}/${year} (${electricityShare.units} units)`,
            amountPaise: electricityShare.perOccupantCostPaise,
            createdBy: userId,
          });
        }
        
        billsCreated++;
      });
    }

    return { billsCreated, billsSkipped };
  }

  async getBills(hostelId: string, filters: { hostellerId?: string, year?: number, month?: number, status?: string }) {
    const conditions = [eq(bills.hostelId, hostelId)];
    
    if (filters.hostellerId) conditions.push(eq(bills.hostellerId, filters.hostellerId));
    if (filters.year) conditions.push(eq(bills.billingPeriodYear, filters.year));
    if (filters.month) conditions.push(eq(bills.billingPeriodMonth, filters.month));
    if (filters.status) conditions.push(eq(bills.status, filters.status as "paid" | "unpaid"));

    const records = await db
      .select({
        bill: bills,
        hostellerName: hostellers.name,
      })
      .from(bills)
      .innerJoin(hostellers, eq(bills.hostellerId, hostellers.id))
      .where(and(...conditions))
      .orderBy(sql`${bills.billingPeriodYear} DESC`, sql`${bills.billingPeriodMonth} DESC`);
      
    return records.map(r => mapBillToDto(r.bill, r.hostellerName, []));
  }

  async getBillById(id: string, hostelId: string) {
    const [record] = await db
      .select({
        bill: bills,
        hostellerName: hostellers.name,
      })
      .from(bills)
      .innerJoin(hostellers, eq(bills.hostellerId, hostellers.id))
      .where(and(eq(bills.id, id), eq(bills.hostelId, hostelId)));

    if (!record) {
      throw new NotFoundError("Bill not found");
    }

    const items = await db
      .select()
      .from(billItems)
      .where(eq(billItems.billId, id));

    return mapBillToDto(record.bill, record.hostellerName, items);
  }

  async addBillItem(billId: string, hostelId: string, dto: AddBillItemDto, userId: string) {
    return await db.transaction(async (tx) => {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.hostelId, hostelId)));

      if (!bill) throw new NotFoundError("Bill not found");
      if (bill.status === "paid") {
        throw new BusinessRuleError("BILL_ALREADY_PAID", "Cannot adjust a paid bill");
      }

      const [newItem] = await tx
        .insert(billItems)
        .values({
          billId,
          hostelId,
          itemType: dto.item_type,
          description: dto.description,
          amountPaise: dto.amount_paise,
          createdBy: userId,
        })
        .returning();

      // Update total
      const newTotal = bill.totalAmountPaise + dto.amount_paise;
      await tx
        .update(bills)
        .set({ totalAmountPaise: newTotal, updatedBy: userId, updatedAt: new Date() })
        .where(eq(bills.id, billId));

      return mapBillItemToDto(newItem!);
    });
  }

  async updateBillItem(billId: string, itemId: string, hostelId: string, dto: UpdateBillItemDto, userId: string) {
    return await db.transaction(async (tx) => {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(and(eq(bills.id, billId), eq(bills.hostelId, hostelId)));

      if (!bill) throw new NotFoundError("Bill not found");
      if (bill.status === "paid") {
        throw new BusinessRuleError("BILL_ALREADY_PAID", "Cannot adjust a paid bill");
      }

      const [item] = await tx
        .select()
        .from(billItems)
        .where(and(eq(billItems.id, itemId), eq(billItems.billId, billId)));

      if (!item) throw new NotFoundError("Bill item not found");

      const updates: any = {};
      let diff = 0;
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.amount_paise !== undefined) {
        updates.amountPaise = dto.amount_paise;
        diff = dto.amount_paise - item.amountPaise;
      }

      if (Object.keys(updates).length === 0) return mapBillItemToDto(item);

      const [updatedItem] = await tx
        .update(billItems)
        .set(updates)
        .where(eq(billItems.id, itemId))
        .returning();

      if (diff !== 0) {
        const newTotal = bill.totalAmountPaise + diff;
        await tx
          .update(bills)
          .set({ totalAmountPaise: newTotal, updatedBy: userId, updatedAt: new Date() })
          .where(eq(bills.id, billId));
      }

      return mapBillItemToDto(updatedItem!);
    });
  }
}

export const billingService = new BillingService();
