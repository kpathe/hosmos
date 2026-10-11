import { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service.js";
import { monthlyLedgerSchema } from "./reports.schema.js";
import { ValidationError } from "../../utils/errors.js";

export class ReportsController {
  async getMonthlyLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const yearStr = req.query.year as string;
      const monthStr = req.query.month as string;

      const parseResult = monthlyLedgerSchema.safeParse({
        year: yearStr ? Number.parseInt(yearStr, 10) : undefined,
        month: monthStr ? Number.parseInt(monthStr, 10) : undefined,
      });

      if (!parseResult.success) {
        throw new ValidationError("Invalid query parameters", parseResult.error.format());
      }

      const ledger = await reportsService.getMonthlyLedger(hostelId, parseResult.data);
      
      res.status(200).json({ data: ledger });
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
