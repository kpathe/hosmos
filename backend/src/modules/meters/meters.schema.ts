import { z } from "zod";

export const recordMeterReadingSchema = z.object({
  room_id: z.string().uuid(),
  reading_value: z.number().nonnegative(),
  reading_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  is_reset: z.boolean().default(false),
  notes: z.string().optional(),
});

export const assignElectricitySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

export type RecordMeterReadingDto = z.infer<typeof recordMeterReadingSchema>;
export type AssignElectricityDto = z.infer<typeof assignElectricitySchema>;
