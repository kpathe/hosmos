import { z } from "zod";

export const monthlyLedgerSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
});

export type MonthlyLedgerRequest = z.infer<typeof monthlyLedgerSchema>;
