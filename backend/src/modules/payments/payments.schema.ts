import { z } from "zod";
import { paymentModeEnum } from "../../db/schema/payments.js";

export const recordPaymentSchema = z.object({
  hosteller_id: z.string().uuid(),
  bill_id: z.string().uuid(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  amount_paise: z.number().int().positive(),
  mode: z.enum(paymentModeEnum.enumValues),
  description: z.string().optional(),
  reference: z.string().optional(),
});

export type RecordPaymentDto = z.infer<typeof recordPaymentSchema>;
