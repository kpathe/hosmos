import { eq, asc, desc, and, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { bills, billItems } from "../../db/schema/bills.js";
import { payments } from "../../db/schema/payments.js";
import { securityDeposits } from "../../db/schema/security-deposits.js";
import { rooms } from "../../db/schema/rooms.js";
import type { HostellerDto, BillDto, PaymentDto, SecurityDepositDto, RoomOccupancyDto } from "@hosmos/types";

export interface HostellerDetailsDto {
  hosteller: HostellerDto;
  current_room: RoomOccupancyDto | null;
  security_deposit: SecurityDepositDto | null;
  bills: BillDto[];
  payments: PaymentDto[];
}

class HostellersService {
  /**
   * List hostellers for a given hostel.
   * Can optionally filter by room ID.
   * Returned sorted alphabetically by name.
   */
  async getHostellers(hostelId: string, roomId?: string): Promise<HostellerDto[]> {
    if (roomId) {
      // Only active occupants of the room
      const records = await db
        .select({ hosteller: hostellers })
        .from(roomOccupancies)
        .innerJoin(hostellers, eq(roomOccupancies.hostelerId, hostellers.id))
        .where(
          and(
            eq(roomOccupancies.roomId, roomId),
            eq(hostellers.hostelId, hostelId),
            isNull(roomOccupancies.effectiveTo)
          )
        )
        .orderBy(asc(hostellers.name));

      return records.map(r => this.mapToDto(r.hosteller));
    } else {
      const records = await db.query.hostellers.findMany({
        where: eq(hostellers.hostelId, hostelId),
        orderBy: [asc(hostellers.name)],
      });

      return records.map(this.mapToDto);
    }
  }

  async getHostellerById(hostellerId: string): Promise<HostellerDto | null> {
    const record = await db.query.hostellers.findFirst({
      where: eq(hostellers.id, hostellerId),
    });
    return record ? this.mapToDto(record) : null;
  }

  /**
   * Get full hosteller details: profile + room + bills + payments + security deposit
   */
  async getHostellerDetails(hostellerId: string): Promise<HostellerDetailsDto | null> {
    const record = await db.query.hostellers.findFirst({
      where: eq(hostellers.id, hostellerId),
    });
    if (!record) return null;

    // Current active room occupancy
    const occupancyRows = await db
      .select({ occupancy: roomOccupancies, room: rooms })
      .from(roomOccupancies)
      .innerJoin(rooms, eq(roomOccupancies.roomId, rooms.id))
      .where(
        and(
          eq(roomOccupancies.hostelerId, hostellerId),
          isNull(roomOccupancies.effectiveTo)
        )
      )
      .limit(1);

    const currentOccupancy = occupancyRows[0] ?? null;

    // All bills with items
    const billRows = await db.query.bills.findMany({
      where: eq(bills.hostelerId, hostellerId),
      with: { billItems: true },
      orderBy: [desc(bills.billingPeriodYear), desc(bills.billingPeriodMonth)],
    });

    // All payments
    const paymentRows = await db.query.payments.findMany({
      where: eq(payments.hostelerId, hostellerId),
      orderBy: [desc(payments.paymentDate)],
    });

    // Security deposit
    const depositRow = await db.query.securityDeposits.findFirst({
      where: eq(securityDeposits.hostelerId, hostellerId),
    });

    return {
      hosteller: this.mapToDto(record),
      current_room: currentOccupancy
        ? {
            id: currentOccupancy.occupancy.id,
            room_id: currentOccupancy.occupancy.roomId,
            room_number: currentOccupancy.room.roomNumber,
            floor: currentOccupancy.room.floor,
            hosteller_id: currentOccupancy.occupancy.hostelerId,
            effective_from: currentOccupancy.occupancy.effectiveFrom,
            effective_to: currentOccupancy.occupancy.effectiveTo,
          }
        : null,
      security_deposit: depositRow
        ? {
            id: depositRow.id,
            original_amount_paise: depositRow.originalAmountPaise,
            deductions_paise: depositRow.deductionsPaise,
            refunded_amount_paise: depositRow.refundedAmountPaise,
            settlement_date: depositRow.settlementDate,
            settlement_notes: depositRow.settlementNotes,
            status: depositRow.status,
          }
        : null,
      bills: billRows.map(b => ({
        id: b.id,
        hostel_id: b.hostelId,
        hosteller_id: b.hostelerId,
        hosteller_name: record.name,
        billing_period_year: b.billingPeriodYear,
        billing_period_month: b.billingPeriodMonth,
        status: b.status,
        total_amount_paise: b.totalAmountPaise,
        items: b.billItems.map(i => ({
          id: i.id,
          item_type: i.itemType,
          description: i.description,
          amount_paise: i.amountPaise,
          created_at: i.createdAt.toISOString(),
        })),
        generated_at: b.generatedAt.toISOString(),
        paid_at: b.paidAt?.toISOString() ?? null,
      })),
      payments: paymentRows.map(p => ({
        id: p.id,
        hostel_id: p.hostelId,
        hosteller_id: p.hostelerId,
        hosteller_name: record.name,
        bill_id: p.billId,
        record_number: p.recordNumber,
        payment_date: p.paymentDate,
        amount_paise: p.amountPaise,
        mode: p.mode,
        description: p.description,
        reference: p.reference,
        created_at: p.createdAt.toISOString(),
      })),
    };
  }

  mapToDto(record: typeof hostellers.$inferSelect): HostellerDto {
    return {
      id: record.id,
      hostel_id: record.hostelId,
      name: record.name,
      father_name: record.fatherName,
      email: record.email,
      phone: record.phone,
      college: record.college,
      branch: record.branch,
      address: record.address,
      admission_date: record.admissionDate,
      status: record.status,
      username: record.username,
      created_at: record.createdAt.toISOString(),
    };
  }
}

export const hostellersService = new HostellersService();
