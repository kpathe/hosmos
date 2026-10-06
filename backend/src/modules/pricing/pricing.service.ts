import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pricingModels } from "../../db/schema/pricing-models.js";
import type { 
  CreatePricingModelRequest, 
  UpdatePricingModelRequest, 
  PricingModelDto 
} from "@hosmos/types";
import { NotFoundError } from "../../utils/errors.js";

function mapPricingModelToDto(record: typeof pricingModels.$inferSelect): PricingModelDto {
  return {
    id: record.id,
    hostel_id: record.hostelId,
    name: record.name,
    charging_basis: record.chargingBasis,
    monthly_amount_paise: record.monthlyAmountPaise,
    compatible_capacity: record.compatibleCapacity,
    compatible_floors: record.compatibleFloors,
    is_active: record.isActive,
    created_at: record.createdAt.toISOString(),
  };
}

export class PricingService {
  async getPricingModelsByHostel(hostelId: string): Promise<PricingModelDto[]> {
    const records = await db
      .select()
      .from(pricingModels)
      .where(eq(pricingModels.hostelId, hostelId));

    return records.map(mapPricingModelToDto);
  }

  async getPricingModelById(id: string, hostelId: string): Promise<PricingModelDto> {
    const [record] = await db
      .select()
      .from(pricingModels)
      .where(and(eq(pricingModels.id, id), eq(pricingModels.hostelId, hostelId)));

    if (!record) {
      throw new NotFoundError("Pricing model not found");
    }

    return mapPricingModelToDto(record);
  }

  async createPricingModel(hostelId: string, payload: CreatePricingModelRequest): Promise<PricingModelDto> {
    const [record] = await db
      .insert(pricingModels)
      .values({
        hostelId,
        name: payload.name,
        chargingBasis: payload.charging_basis,
        monthlyAmountPaise: payload.monthly_amount_paise,
        compatibleCapacity: payload.compatible_capacity,
        compatibleFloors: payload.compatible_floors ?? [],
        isActive: payload.is_active ?? true,
      })
      .returning();

    return mapPricingModelToDto(record!);
  }

  async updatePricingModel(id: string, hostelId: string, payload: UpdatePricingModelRequest): Promise<PricingModelDto> {
    const [existing] = await db
      .select({ id: pricingModels.id })
      .from(pricingModels)
      .where(and(eq(pricingModels.id, id), eq(pricingModels.hostelId, hostelId)));

    if (!existing) {
      throw new NotFoundError("Pricing model not found");
    }

    const updates: any = {};
    if (payload.monthly_amount_paise !== undefined) {
      updates.monthlyAmountPaise = payload.monthly_amount_paise;
    }
    updates.updatedAt = new Date();

    const [updatedRecord] = await db
      .update(pricingModels)
      .set(updates)
      .where(eq(pricingModels.id, id))
      .returning();

    return mapPricingModelToDto(updatedRecord!);
  }

  async deletePricingModel(id: string, hostelId: string): Promise<void> {
    const [deleted] = await db
      .delete(pricingModels)
      .where(and(eq(pricingModels.id, id), eq(pricingModels.hostelId, hostelId)))
      .returning();
      
    if (!deleted) {
      throw new NotFoundError("Pricing model not found or unauthorized");
    }
  }
}

export const pricingService = new PricingService();
