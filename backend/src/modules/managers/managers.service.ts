import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { managers, hostelManagers } from "../../db/schema/managers.js";
import type { 
  CreateManagerRequest, 
  UpdateManagerRequest, 
  ManagerDto 
} from "@hosmos/types";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { hashPassword } from "../../utils/crypto.js";

function mapManagerToDto(record: typeof managers.$inferSelect): ManagerDto {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: null,
    created_at: record.createdAt.toISOString(),
  };
}

export class ManagersService {
  async getManagersByHostel(hostelId: string): Promise<ManagerDto[]> {
    const records = await db
      .select({ manager: managers })
      .from(hostelManagers)
      .innerJoin(managers, eq(managers.id, hostelManagers.managerId))
      .where(eq(hostelManagers.hostelId, hostelId));

    return records.map(r => mapManagerToDto(r.manager));
  }

  async createManager(hostelId: string, ownerId: string, payload: CreateManagerRequest): Promise<ManagerDto> {
    // Basic transaction to create manager and link to hostel
    try {
      const result = await db.transaction(async (tx) => {
        // Create the manager
        const passwordHash = await hashPassword(payload.password_plain);
        
        const [managerRecord] = await tx
          .insert(managers)
          .values({
            name: payload.name,
            email: payload.email,
            passwordHash,
          })
          .returning();

        // Link manager to hostel
        await tx
          .insert(hostelManagers)
          .values({
            hostelId,
            managerId: managerRecord!.id,
            assignedBy: ownerId,
          });

        return managerRecord;
      });

      return mapManagerToDto(result!);
    } catch (error: any) {
      if (error.code === "23505") { // unique violation
        throw new ValidationError("Manager with this email already exists");
      }
      throw error;
    }
  }

  async updateManager(id: string, hostelId: string, payload: UpdateManagerRequest): Promise<ManagerDto> {
    // First verify this manager belongs to this hostel
    const [link] = await db
      .select()
      .from(hostelManagers)
      .where(and(eq(hostelManagers.managerId, id), eq(hostelManagers.hostelId, hostelId)));

    if (!link) {
      throw new NotFoundError("Manager not found in this hostel");
    }

    const updates: any = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.password_plain) {
      updates.passwordHash = await hashPassword(payload.password_plain);
    }
    updates.updatedAt = new Date();

    const [updatedRecord] = await db
      .update(managers)
      .set(updates)
      .where(eq(managers.id, id))
      .returning();

    return mapManagerToDto(updatedRecord!);
  }

  async removeManager(id: string, hostelId: string): Promise<void> {
    // Remove the link to the hostel
    const [deleted] = await db
      .delete(hostelManagers)
      .where(and(eq(hostelManagers.managerId, id), eq(hostelManagers.hostelId, hostelId)))
      .returning();

    if (!deleted) {
      throw new NotFoundError("Manager not found in this hostel");
    }
    
    // Note: We might want to keep the manager record around, or delete if they have no other hostels.
    // We'll leave the manager record intact for now.
  }
}

export const managersService = new ManagersService();
