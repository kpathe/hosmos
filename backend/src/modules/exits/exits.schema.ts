import { z } from "zod";

export const processExitSchema = z.object({
  hosteller_id: z.string().uuid(),
  exit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  exit_type: z.enum(["normal", "without_notice", "early_approved"]),
  damage_deductions_paise: z.number().int().min(0).default(0),
  deduction_notes: z.string().optional(),
});

export const exitPreviewSchema = z.object({
  exit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  exit_type: z.enum(["normal", "without_notice", "early_approved"]).default("normal"),
  damage_deductions_paise: z.coerce.number().int().min(0).default(0),
});

export type ProcessExitDto = z.infer<typeof processExitSchema>;
export type ExitPreviewDto = z.infer<typeof exitPreviewSchema>;
