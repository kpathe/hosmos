import { z } from "zod";
import { billItemTypeEnum } from "../../db/schema/bills.js";

export const generateBillsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

export type GenerateBillsDto = z.infer<typeof generateBillsSchema>;

export const addBillItemSchema = z.object({
  item_type: z.enum(billItemTypeEnum.enumValues),
  description: z.string().min(1),
  amount_paise: z.number().int(),
});

export type AddBillItemDto = z.infer<typeof addBillItemSchema>;

export const updateBillItemSchema = z.object({
  description: z.string().min(1).optional(),
  amount_paise: z.number().int().optional(),
});

export type UpdateBillItemDto = z.infer<typeof updateBillItemSchema>;
