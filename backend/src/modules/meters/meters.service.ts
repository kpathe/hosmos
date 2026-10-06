import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { meterReadings } from "../../db/schema/meter-readings.js";
import { rooms } from "../../db/schema/rooms.js";
import { hostels } from "../../db/schema/hostels.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { bills, billItems } from "../../db/schema/bills.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { NotFoundError, BusinessRuleError } from "../../utils/errors.js";
import type { RecordMeterReadingDto, AssignElectricityDto } from "./meters.schema.js";
import type { MeterReadingDto } from "@hosmos/types";

function mapMeterReadingToDto(record: typeof meterReadings.$inferSelect, roomNumber: string): MeterReadingDto {
  return {
    id: record.id,
    room_id: record.roomId,
    room_number: roomNumber,
    reading_value: Number.parseFloat(record.readingValue),
    reading_date: record.readingDate,
    is_reset: record.isReset,
    notes: record.notes,
    recorded_at: record.createdAt.toISOString(),
  };
}

export class MetersService {
  async recordReading(hostelId: string, dto: RecordMeterReadingDto, userId: string): Promise<MeterReadingDto> {
    const [room] = await db
      .select({ roomNumber: rooms.roomNumber })
      .from(rooms)
      .where(and(eq(rooms.id, dto.room_id), eq(rooms.hostelId, hostelId)));

    if (!room) {
      throw new NotFoundError("Room not found");
    }

    // Check if reading already exists for this room on this date
    const [existing] = await db
      .select()
      .from(meterReadings)
      .where(
        and(
          eq(meterReadings.roomId, dto.room_id),
          eq(meterReadings.readingDate, dto.reading_date)
        )
      );

    if (existing) {
      throw new BusinessRuleError("READING_EXISTS", "A reading already exists for this room on this date.");
    }

    const [reading] = await db
      .insert(meterReadings)
      .values({
        hostelId,
        roomId: dto.room_id,
        readingValue: dto.reading_value.toString(),
        readingDate: dto.reading_date,
        isReset: dto.is_reset,
        notes: dto.notes || null,
        recordedBy: userId,
      })
      .returning();

    return mapMeterReadingToDto(reading!, room.roomNumber);
  }

  async getReadings(hostelId: string, roomId?: string): Promise<MeterReadingDto[]> {
    const conditions = [eq(meterReadings.hostelId, hostelId)];
    if (roomId) conditions.push(eq(meterReadings.roomId, roomId));

    const records = await db
      .select({
        reading: meterReadings,
        roomNumber: rooms.roomNumber,
      })
      .from(meterReadings)
      .innerJoin(rooms, eq(meterReadings.roomId, rooms.id))
      .where(and(...conditions))
      .orderBy(desc(meterReadings.readingDate));

    // To calculate consumption, we need the previous reading.
    // For simplicity, we just return the raw readings here. 
    // The frontend can display it, or we could join the previous row.
    return records.map(r => mapMeterReadingToDto(r.reading, r.roomNumber));
  }

  async assignElectricityCosts(hostelId: string, dto: AssignElectricityDto, userId: string) {
    const targetDate = `${dto.year}-${dto.month.toString().padStart(2, "0")}-01`;
    
    // Find the previous month date
    const prevMonthDateObj = new Date(targetDate);
    prevMonthDateObj.setMonth(prevMonthDateObj.getMonth() - 1);
    const prevDate = prevMonthDateObj.toISOString().slice(0, 10);
    const prevYear = prevMonthDateObj.getFullYear();
    const prevMonth = prevMonthDateObj.getMonth() + 1; // 1-12

    return await db.transaction(async (tx) => {
      // 1. Get hostel electricity rate
      const [hostel] = await tx
        .select({ rate: hostels.electricityRatePaise })
        .from(hostels)
        .where(eq(hostels.id, hostelId));

      if (!hostel) throw new NotFoundError("Hostel not found");
      if (hostel.rate <= 0) return { assigned: 0, skipped: 0, message: "Electricity rate is 0." };

      // 2. Get all target readings for this month
      const currentReadings = await tx
        .select()
        .from(meterReadings)
        .where(and(eq(meterReadings.hostelId, hostelId), eq(meterReadings.readingDate, targetDate)));

      if (currentReadings.length === 0) {
        return { assigned: 0, skipped: 0, message: "No readings found for the target month." };
      }

      // 3. Get all previous readings for the previous month
      const previousReadings = await tx
        .select()
        .from(meterReadings)
        .where(and(eq(meterReadings.hostelId, hostelId), eq(meterReadings.readingDate, prevDate)));

      const previousMap = new Map(previousReadings.map(r => [r.roomId, r]));

      let assignedCount = 0;
      let skippedCount = 0;

      for (const curr of currentReadings) {
        if (curr.isReset) {
          skippedCount++;
          continue; // Cannot calculate consumption if meter was reset
        }

        const prev = previousMap.get(curr.roomId);
        if (!prev) {
          skippedCount++;
          continue; // No previous reading to compare with
        }

        const consumption = Number.parseFloat(curr.readingValue) - Number.parseFloat(prev.readingValue);
        if (consumption < 0) {
          skippedCount++;
          continue; // Invalid reading?
        }

        if (consumption === 0) {
          skippedCount++;
          continue; // No usage
        }

        const totalCostPaise = Math.round(consumption * hostel.rate);

        // Find active occupants for this room for the PREVIOUS month.
        // Electricity is billed in arrears. e.g. Nov 1 reading covers October consumption.
        // So we bill the occupants who were active in October (prevYear, prevMonth).
        
        // Wait, what defines an active occupant? 
        // We can just find room_occupancies that overlapped with October.
        // For simplicity, let's find hostellers who are currently in the room, 
        // or just use room_occupancies where effectiveFrom <= targetDate and effectiveTo >= prevDate (or null).
        const occupants = await tx
          .select({ hostellerId: roomOccupancies.hostellerId })
          .from(roomOccupancies)
          .innerJoin(hostellers, eq(roomOccupancies.hostellerId, hostellers.id))
          .where(
            and(
              eq(roomOccupancies.roomId, curr.roomId),
              sql`${roomOccupancies.effectiveFrom} < ${targetDate}::date`,
              sql`(${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} >= ${prevDate}::date)`,
              // ensure hosteller is still active/admitted/exit_pending (optional, they might have exited, but we should bill them)
            )
          );

        if (occupants.length === 0) {
          skippedCount++;
          continue;
        }

        // Divide cost equally
        const perOccupantCost = Math.round(totalCostPaise / occupants.length);

        for (const occ of occupants) {
          // Find the bill for the PREVIOUS month (since electricity is for that month)
          const [bill] = await tx
            .select()
            .from(bills)
            .where(
              and(
                eq(bills.hostellerId, occ.hostellerId),
                eq(bills.billingPeriodYear, prevYear),
                eq(bills.billingPeriodMonth, prevMonth)
              )
            );

          if (!bill) {
            skippedCount++;
            continue; // No bill generated for that month yet
          }

          if (bill.status === "paid") {
            skippedCount++;
            continue; // Cannot modify paid bills
          }

          // Insert bill item
          await tx.insert(billItems).values({
            billId: bill.id,
            hostelId,
            itemType: "electricity",
            description: `Electricity Share - ${prevMonth}/${prevYear}`,
            amountPaise: perOccupantCost,
            createdBy: userId,
          });

          // Update bill total
          await tx
            .update(bills)
            .set({ 
              totalAmountPaise: bill.totalAmountPaise + perOccupantCost,
              updatedAt: new Date(),
              updatedBy: userId
            })
            .where(eq(bills.id, bill.id));
            
          assignedCount++;
        }
      }

      return { assigned: assignedCount, skipped: skippedCount, message: "Success" };
    });
  }
}

export const metersService = new MetersService();
