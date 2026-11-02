import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hostellers } from "../../db/schema/hostellers.js";
import { hostels } from "../../db/schema/hostels.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { rooms } from "../../db/schema/rooms.js";
import { pricingModels } from "../../db/schema/pricing-models.js";
import { bills, billItems } from "../../db/schema/bills.js";
import { payments } from "../../db/schema/payments.js";
import { securityDeposits } from "../../db/schema/security-deposits.js";
import { meterReadings } from "../../db/schema/meter-readings.js";
import { NotFoundError } from "../../utils/errors.js";
import type {
  BillDto,
  PaymentDto,
  PortalProfileDto,
  PortalRoomDto,
  HostellerDto,
  HostelDto,
  SecurityDepositDto,
} from "@hosmos/types";

function mapHostellerToDto(record: typeof hostellers.$inferSelect): HostellerDto {
  return {
    id: record.id,
    hostel_id: record.hostelId,
    name: record.name,
    name_slug: record.nameSlug,
    email: record.email,
    phone: record.phone,
    father_name: record.fatherName,
    address: record.address,
    college: record.college,
    branch: record.branch,
    admission_date: record.admissionDate,
    status: record.status,
    created_at: record.createdAt.toISOString(),
  };
}

function mapHostelToDto(record: typeof hostels.$inferSelect): HostelDto {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    address: record.address,
    electricity_rate_paise: record.electricityRatePaise,
    security_deposit_amount_paise: record.securityDepositAmountPaise,
    late_fine_amount_paise: record.lateFineAmountPaise,
    created_at: record.createdAt.toISOString(),
  };
}

function mapDepositToDto(record: typeof securityDeposits.$inferSelect): SecurityDepositDto {
  return {
    id: record.id,
    original_amount_paise: record.originalAmountPaise,
    deductions_paise: record.deductionsPaise,
    refunded_amount_paise: record.refundedAmountPaise,
    settlement_date: record.settlementDate,
    settlement_notes: record.settlementNotes,
    status: record.status,
  };
}

function mapPaymentToDto(
  record: typeof payments.$inferSelect,
  hostellerName: string
): PaymentDto {
  return {
    id: record.id,
    hostel_id: record.hostelId,
    hosteller_id: record.hostellerId,
    hosteller_name: hostellerName,
    bill_id: record.billId,
    record_number: record.recordNumber,
    payment_date: record.paymentDate,
    amount_paise: record.amountPaise,
    mode: record.mode,
    description: record.description,
    reference: record.reference,
    created_at: record.createdAt.toISOString(),
  };
}

export class PortalService {
  /**
   * Get hosteller's comprehensive dashboard profile.
   */
  async getProfile(hostellerId: string): Promise<PortalProfileDto> {
    const [hostellerRecord] = await db
      .select()
      .from(hostellers)
      .where(eq(hostellers.id, hostellerId));

    if (!hostellerRecord) {
      throw new NotFoundError("Hosteller account not found");
    }

    const [hostelRecord] = await db
      .select()
      .from(hostels)
      .where(eq(hostels.id, hostellerRecord.hostelId));

    if (!hostelRecord) {
      throw new NotFoundError("Hostel record not found");
    }

    // Current Room Occupancy
    const [currentOccupancy] = await db
      .select({
        room: rooms,
      })
      .from(roomOccupancies)
      .innerJoin(rooms, eq(rooms.id, roomOccupancies.roomId))
      .where(
        and(
          eq(roomOccupancies.hostellerId, hostellerId),
          isNull(roomOccupancies.effectiveTo)
        )
      );

    // Security Deposit
    const [depositRecord] = await db
      .select()
      .from(securityDeposits)
      .where(eq(securityDeposits.hostellerId, hostellerId));

    // Outstanding unpaid bills
    const unpaidBills = await db
      .select()
      .from(bills)
      .where(
        and(
          eq(bills.hostellerId, hostellerId),
          eq(bills.status, "unpaid")
        )
      );

    const totalOutstandingPaise = unpaidBills.reduce(
      (sum, b) => sum + b.totalAmountPaise,
      0
    );

    // Last recorded payment
    const [lastPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.hostellerId, hostellerId))
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
      .limit(1);

    return {
      hosteller: mapHostellerToDto(hostellerRecord),
      hostel: mapHostelToDto(hostelRecord),
      security_deposit: depositRecord ? mapDepositToDto(depositRecord) : null,
      current_room: currentOccupancy
        ? {
            id: currentOccupancy.room.id,
            room_number: currentOccupancy.room.roomNumber,
            floor: currentOccupancy.room.floor,
            capacity: currentOccupancy.room.capacity,
          }
        : null,
      active_bill_count: unpaidBills.length,
      total_outstanding_paise: totalOutstandingPaise,
      last_payment: lastPayment
        ? mapPaymentToDto(lastPayment, hostellerRecord.name)
        : null,
    };
  }

  /**
   * Get hosteller's room info, current roommates, and meter readings history.
   */
  async getRoomDetails(hostellerId: string): Promise<PortalRoomDto> {
    const [currentOccupancy] = await db
      .select({
        room: rooms,
      })
      .from(roomOccupancies)
      .innerJoin(rooms, eq(rooms.id, roomOccupancies.roomId))
      .where(
        and(
          eq(roomOccupancies.hostellerId, hostellerId),
          isNull(roomOccupancies.effectiveTo)
        )
      );

    if (!currentOccupancy) {
      throw new NotFoundError("No active room assignment found for this hosteller");
    }

    const roomId = currentOccupancy.room.id;

    // Pricing Model details
    let pricingModelInfo: PortalRoomDto["pricing_model"] = null;
    if (currentOccupancy.room.pricingModelId) {
      const [pm] = await db
        .select()
        .from(pricingModels)
        .where(eq(pricingModels.id, currentOccupancy.room.pricingModelId));

      if (pm) {
        pricingModelInfo = {
          name: pm.name,
          monthly_amount_paise: pm.monthlyAmountPaise,
        };
      }
    }

    // Room occupants currently active in this room
    const roommateRecords = await db
      .select({
        hosteller: hostellers,
      })
      .from(roomOccupancies)
      .innerJoin(hostellers, eq(hostellers.id, roomOccupancies.hostellerId))
      .where(
        and(
          eq(roomOccupancies.roomId, roomId),
          isNull(roomOccupancies.effectiveTo)
        )
      );

    const totalOccupants = roommateRecords.length;

    // Filter out the hosteller themselves so roommates only contains fellow occupants
    const roommates = roommateRecords
      .filter((r) => r.hosteller.id !== hostellerId)
      .map((r) => ({
        id: r.hosteller.id,
        name: r.hosteller.name,
        admission_date: r.hosteller.admissionDate,
        phone: r.hosteller.phone,
      }));

    // Sub-meter readings for this room
    const readings = await db
      .select()
      .from(meterReadings)
      .where(eq(meterReadings.roomId, roomId))
      .orderBy(desc(meterReadings.readingDate))
      .limit(12);

    return {
      room: {
        id: currentOccupancy.room.id,
        room_number: currentOccupancy.room.roomNumber,
        floor: currentOccupancy.room.floor,
        capacity: currentOccupancy.room.capacity,
        active_occupant_count: totalOccupants,
      },
      pricing_model: pricingModelInfo,
      roommates,
      meter_readings: readings.map((r) => ({
        id: r.id,
        room_id: r.roomId,
        room_number: currentOccupancy.room.roomNumber,
        reading_value: Number(r.readingValue),
        reading_date: r.readingDate,
        is_reset: r.isReset,
        notes: r.notes,
        recorded_at: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get hosteller's pending and paid bills with line items breakdown.
   */
  async getBills(hostellerId: string): Promise<BillDto[]> {
    const [hostellerRecord] = await db
      .select()
      .from(hostellers)
      .where(eq(hostellers.id, hostellerId));

    const hostellerName = hostellerRecord?.name || "Hosteller";

    const hostellerBills = await db
      .select()
      .from(bills)
      .where(eq(bills.hostellerId, hostellerId))
      .orderBy(desc(bills.billingPeriodYear), desc(bills.billingPeriodMonth));

    const result: BillDto[] = [];

    for (const b of hostellerBills) {
      const items = await db
        .select()
        .from(billItems)
        .where(eq(billItems.billId, b.id));

      result.push({
        id: b.id,
        hostel_id: b.hostelId,
        hosteller_id: b.hostellerId,
        hosteller_name: hostellerName,
        billing_period_year: b.billingPeriodYear,
        billing_period_month: b.billingPeriodMonth,
        total_amount_paise: b.totalAmountPaise,
        status: b.status,
        items: items.map((item) => ({
          id: item.id,
          item_type: item.itemType,
          description: item.description,
          amount_paise: item.amountPaise,
          created_at: item.createdAt.toISOString(),
        })),
        generated_at: b.generatedAt.toISOString(),
        paid_at: b.paidAt?.toISOString() ?? null,
      });
    }

    return result;
  }

  /**
   * Get hosteller's payment history.
   */
  async getPayments(hostellerId: string): Promise<PaymentDto[]> {
    const [hostellerRecord] = await db
      .select()
      .from(hostellers)
      .where(eq(hostellers.id, hostellerId));

    const hostellerName = hostellerRecord?.name || "Hosteller";

    const hostellerPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.hostellerId, hostellerId))
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt));

    return hostellerPayments.map((p) => mapPaymentToDto(p, hostellerName));
  }
}

export const portalService = new PortalService();

