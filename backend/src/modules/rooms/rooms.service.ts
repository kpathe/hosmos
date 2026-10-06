import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { rooms } from "../../db/schema/rooms.js";
import { roomOccupancies } from "../../db/schema/room-occupancies.js";
import { pricingModels } from "../../db/schema/pricing-models.js";
import type { 
  CreateRoomRequest, 
  CreateRoomsBulkRequest,
  UpdateRoomRequest, 
  RoomDto 
} from "@hosmos/types";
import { NotFoundError, ValidationError } from "../../utils/errors.js";

function mapRoomToDto(record: any, activeOccupantCount: number = 0): RoomDto {
  return {
    id: record.id,
    hostel_id: record.hostelId,
    room_number: record.roomNumber,
    floor: record.floor,
    capacity: record.capacity,
    pricing_model_id: record.pricingModelId,
    pricing_model: record.pricingModel ? {
      id: record.pricingModel.id,
      hostel_id: record.pricingModel.hostelId,
      name: record.pricingModel.name,
      charging_basis: record.pricingModel.chargingBasis,
      monthly_amount_paise: record.pricingModel.monthlyAmountPaise,
      compatible_capacity: record.pricingModel.compatibleCapacity,
      compatible_floors: record.pricingModel.compatibleFloors,
      is_active: record.pricingModel.isActive,
      created_at: record.pricingModel.createdAt.toISOString(),
    } : null,
    active_occupant_count: activeOccupantCount,
    created_at: record.createdAt.toISOString(),
  };
}

export class RoomsService {
  async getRoomsByHostel(hostelId: string): Promise<RoomDto[]> {
    // In a real app we'd aggregate active_occupant_count in the DB directly
    // using a left join and group by, but for simplicity here we query rooms with pricing models
    const roomRecords = await db.query.rooms.findMany({
      where: eq(rooms.hostelId, hostelId),
      with: {
        pricingModel: true,
      },
    });

    // Fetch active occupancies (where effectiveTo is null or in the future)
    const occupancies = await db
      .select({ roomId: roomOccupancies.roomId })
      .from(roomOccupancies)
      .where(
        and(
          eq(roomOccupancies.hostelId, hostelId),
          sql`${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} > NOW()`
        )
      );

    const occupancyMap = new Map<string, number>();
    for (const occ of occupancies) {
      occupancyMap.set(occ.roomId, (occupancyMap.get(occ.roomId) || 0) + 1);
    }

    return roomRecords.map((r) => mapRoomToDto(r, occupancyMap.get(r.id) || 0));
  }

  async createRoom(hostelId: string, payload: CreateRoomRequest): Promise<RoomDto> {
    const [record] = await db
      .insert(rooms)
      .values({
        hostelId,
        roomNumber: payload.room_number,
        floor: payload.floor,
        capacity: payload.capacity,
        pricingModelId: payload.pricing_model_id ?? null,
      })
      .returning();

    return mapRoomToDto(record!);
  }

  async createRoomsBulk(hostelId: string, payload: CreateRoomsBulkRequest): Promise<RoomDto[]> {
    if (payload.end_number < payload.start_number) {
      throw new ValidationError("End number cannot be less than start number");
    }
    if (payload.end_number - payload.start_number > 200) {
      throw new ValidationError("Cannot bulk create more than 200 rooms at once");
    }

    const valuesToInsert = [];
    for (let i = payload.start_number; i <= payload.end_number; i++) {
      const roomNumber = `${payload.prefix || ""}${i}`;
      valuesToInsert.push({
        hostelId,
        roomNumber,
        floor: payload.floor,
        capacity: payload.capacity,
        pricingModelId: payload.pricing_model_id ?? null,
      });
    }

    const inserted = await db.insert(rooms).values(valuesToInsert).returning();
    return inserted.map(r => mapRoomToDto(r));
  }

  async updateRoom(id: string, hostelId: string, payload: UpdateRoomRequest): Promise<RoomDto> {
    const [existing] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.hostelId, hostelId)));

    if (!existing) {
      throw new NotFoundError("Room not found");
    }

    if (payload.pricing_model_id !== undefined) {
      const activeOccupants = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(roomOccupancies)
        .where(
          and(
            eq(roomOccupancies.roomId, id),
            sql`${roomOccupancies.effectiveTo} IS NULL OR ${roomOccupancies.effectiveTo} > NOW()`
          )
        );

      if ((activeOccupants[0]?.count ?? 0) > 0) {
        throw new ValidationError("Cannot change pricing model for a room with active occupants.");
      }
    }

    const updates: any = {};
    if (payload.pricing_model_id !== undefined) updates.pricingModelId = payload.pricing_model_id;

    if (Object.keys(updates).length > 0) {
      await db
        .update(rooms)
        .set(updates)
        .where(eq(rooms.id, id));
    }

    const roomRecords = await this.getRoomsByHostel(hostelId);
    return roomRecords.find(r => r.id === id)!;
  }

  async deleteRoom(id: string, hostelId: string): Promise<void> {
    const [deleted] = await db
      .delete(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.hostelId, hostelId)))
      .returning();
      
    if (!deleted) {
      throw new ValidationError("Room not found or unauthorized");
    }
  }
}

export const roomsService = new RoomsService();
