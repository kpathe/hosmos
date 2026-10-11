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

  async getRoomElectricityShare(
    tx: any,
    hostelId: string,
    roomId: string,
    year: number,
    month: number
  ): Promise<{ units: number; perOccupantCostPaise: number; occupantsCount: number; periodLabel: string } | null> {
    // Current bill month reading is the end reading (e.g., Oct 1 reading)
    const endDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    // Previous month reading is the start reading (e.g., Sep 1 reading)
    const prevDateObj = new Date(year, month - 2, 1);
    const prevYear = prevDateObj.getFullYear();
    const prevMonth = prevDateObj.getMonth() + 1;
    const startDate = `${prevYear}-${prevMonth.toString().padStart(2, "0")}-01`;

    const [hostel] = await tx
      .select({ rate: hostels.electricityRatePaise })
      .from(hostels)
      .where(eq(hostels.id, hostelId));

    if (!hostel || hostel.rate <= 0) return null;

    const [startReading] = await tx
      .select()
      .from(meterReadings)
      .where(and(eq(meterReadings.roomId, roomId), eq(meterReadings.readingDate, startDate)));

    const [endReading] = await tx
      .select()
      .from(meterReadings)
      .where(and(eq(meterReadings.roomId, roomId), eq(meterReadings.readingDate, endDate)));

    if (!startReading || !endReading) return null;
    if (endReading.isReset) return null;

    const units = Number.parseFloat(endReading.readingValue) - Number.parseFloat(startReading.readingValue);
    if (units <= 0) return null;

    const totalCostPaise = Math.round(units * hostel.rate);

    const occupants = await tx
      .select({ hostellerId: roomOccupancies.hostellerId })
      .from(roomOccupancies)
      .where(
        and(
          eq(roomOccupancies.roomId, roomId),
          sql`${roomOccupancies.effectiveFrom} < ${endDate}::date`,
          sql`(${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} >= ${startDate}::date)`
        )
      );

    if (occupants.length === 0) return null;

    const perOccupantCostPaise = Math.round(totalCostPaise / occupants.length);

    return {
      units,
      perOccupantCostPaise,
      occupantsCount: occupants.length,
      periodLabel: `${prevMonth}/${prevYear}`,
    };
  }

  async assignElectricityCosts(hostelId: string, dto: AssignElectricityDto, userId: string) {
    return await db.transaction(async (tx) => {
      // Find all rooms in this hostel
      const hostelRooms = await tx
        .select({ id: rooms.id })
        .from(rooms)
        .where(eq(rooms.hostelId, hostelId));

      let assignedCount = 0;
      let skippedCount = 0;

      for (const room of hostelRooms) {
        const share = await this.getRoomElectricityShare(tx, hostelId, room.id, dto.year, dto.month);
        if (!share) {
          skippedCount++;
          continue;
        }

        const endDate = `${dto.year}-${dto.month.toString().padStart(2, "0")}-01`;
        const prevDateObj = new Date(dto.year, dto.month - 2, 1);
        const startDate = `${prevDateObj.getFullYear()}-${(prevDateObj.getMonth() + 1).toString().padStart(2, "0")}-01`;

        const occupants = await tx
          .select({ hostellerId: roomOccupancies.hostellerId })
          .from(roomOccupancies)
          .where(
            and(
              eq(roomOccupancies.roomId, room.id),
              sql`${roomOccupancies.effectiveFrom} < ${endDate}::date`,
              sql`(${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} >= ${startDate}::date)`
            )
          );

        for (const occ of occupants) {
          const [bill] = await tx
            .select()
            .from(bills)
            .where(
              and(
                eq(bills.hostellerId, occ.hostellerId),
                eq(bills.billingPeriodYear, dto.year),
                eq(bills.billingPeriodMonth, dto.month)
              )
            );

          if (!bill) {
            skippedCount++;
            continue; // No bill generated yet
          }

          if (bill.status === "paid") {
            skippedCount++;
            continue; // Cannot modify paid bills
          }

          // Check if electricity item already exists for this bill
          const [existingItem] = await tx
            .select({ id: billItems.id })
            .from(billItems)
            .where(and(eq(billItems.billId, bill.id), eq(billItems.itemType, "electricity")));

          if (existingItem) {
            skippedCount++;
            continue; // Already assigned
          }

          // Insert bill item
          await tx.insert(billItems).values({
            billId: bill.id,
            hostelId,
            itemType: "electricity",
            description: `Electricity Share - ${dto.month}/${dto.year} (${share.units} units)`,
            amountPaise: share.perOccupantCostPaise,
            createdBy: userId,
          });

          // Update bill total
          await tx
            .update(bills)
            .set({
              totalAmountPaise: bill.totalAmountPaise + share.perOccupantCostPaise,
              updatedAt: new Date(),
              updatedBy: userId,
            })
            .where(eq(bills.id, bill.id));

          assignedCount++;
        }
      }

      return { assigned: assignedCount, skipped: skippedCount, message: "Electricity assignment complete" };
    });
  }
}

export const metersService = new MetersService();
