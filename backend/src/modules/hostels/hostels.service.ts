import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../db/index.js";
import { hostels } from "../../db/schema/hostels.js";
import type { 
  CreateHostelRequest, 
  UpdateHostelRequest, 
  HostelDto 
} from "@hosmos/types";
import { NotFoundError } from "../../utils/errors.js";

/**
 * Maps the database hostel record to the shared HostelDto.
 */
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

export class HostelsService {
  /**
   * Retrieves all hostels owned by the specified owner.
   */
  async getHostelsByOwner(ownerId: string): Promise<HostelDto[]> {
    const records = await db
      .select()
      .from(hostels)
      .where(eq(hostels.ownerId, ownerId));

    return records.map(mapHostelToDto);
  }

  /**
   * Retrieves a single hostel by Slug.
   */
  async getHostelBySlug(slug: string): Promise<HostelDto> {
    const [record] = await db
      .select()
      .from(hostels)
      .where(eq(hostels.slug, slug));

    if (!record) {
      throw new NotFoundError("Hostel not found");
    }

    return mapHostelToDto(record);
  }

  /**
   * Creates a new hostel for the specified owner.
   */
  async createHostel(ownerId: string, payload: CreateHostelRequest): Promise<HostelDto> {
    const baseSlug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const uniqueSuffix = randomUUID().split('-')[0];
    const finalSlug = payload.slug || `${baseSlug}-${uniqueSuffix}`;

    const [record] = await db
      .insert(hostels)
      .values({
        ownerId,
        slug: finalSlug,
        name: payload.name,
        address: payload.address ?? null,
        electricityRatePaise: payload.electricity_rate_paise ?? 0,
        securityDepositAmountPaise: payload.security_deposit_amount_paise ?? 0,
        lateFineAmountPaise: payload.late_fine_amount_paise ?? 0,
      })
      .returning();

    return mapHostelToDto(record!);
  }

  /**
   * Updates an existing hostel by slug. 
   * Validates that the ownerId matches if provided.
   */
  async updateHostel(slug: string, ownerId: string, payload: UpdateHostelRequest): Promise<HostelDto> {
    // Verify existence and ownership
    const [existing] = await db
      .select({ ownerId: hostels.ownerId, id: hostels.id })
      .from(hostels)
      .where(eq(hostels.slug, slug));

    if (!existing) {
      throw new NotFoundError("Hostel not found");
    }
    
    if (existing.ownerId !== ownerId) {
      throw new NotFoundError("Hostel not found"); // Mask authorization as not found
    }

    const updates: any = {};
    if (payload.slug !== undefined) updates.slug = payload.slug;
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.address !== undefined) updates.address = payload.address;
    if (payload.electricity_rate_paise !== undefined) updates.electricityRatePaise = payload.electricity_rate_paise;
    if (payload.security_deposit_amount_paise !== undefined) updates.securityDepositAmountPaise = payload.security_deposit_amount_paise;
    if (payload.late_fine_amount_paise !== undefined) updates.lateFineAmountPaise = payload.late_fine_amount_paise;
    updates.updatedAt = new Date();

    const [updatedRecord] = await db
      .update(hostels)
      .set(updates)
      .where(eq(hostels.slug, slug))
      .returning();

    return mapHostelToDto(updatedRecord!);
  }
}

export const hostelsService = new HostelsService();
