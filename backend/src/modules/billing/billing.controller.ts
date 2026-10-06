import { Request, Response, NextFunction } from "express";
import { billingService } from "./billing.service.js";
import {
  generateBillsSchema,
  addBillItemSchema,
  updateBillItemSchema,
} from "./billing.schema.js";
import { ValidationError } from "../../utils/errors.js";

export class BillingController {
  async generateBills(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      const parseResult = generateBillsSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      
      const result = await billingService.generateMonthlyBills(
        hostelId,
        parseResult.data.year,
        parseResult.data.month,
        userId
      );
      
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBills(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      const filters: { hostellerId?: string; year?: number; month?: number; status?: string } = {};
      if (req.query.hosteller_id) filters.hostellerId = req.query.hosteller_id as string;
      if (req.query.year) filters.year = Number.parseInt(req.query.year as string);
      if (req.query.month) filters.month = Number.parseInt(req.query.month as string);
      if (req.query.status) filters.status = req.query.status as string;
      
      const bills = await billingService.getBills(hostelId, filters);
      res.status(200).json({ data: bills });
    } catch (error) {
      next(error);
    }
  }

  async getBillById(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      const billId = req.params.id as string;
      
      const bill = await billingService.getBillById(billId, hostelId);
      res.status(200).json({ data: bill });
    } catch (error) {
      next(error);
    }
  }

  async addBillItem(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      const billId = req.params.id as string;
      const parseResult = addBillItemSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      
      const item = await billingService.addBillItem(
        billId,
        hostelId,
        parseResult.data,
        userId
      );
      
      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  }

  async updateBillItem(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      const billId = req.params.id as string;
      const itemId = req.params.itemId as string;
      const parseResult = updateBillItemSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      
      const item = await billingService.updateBillItem(
        billId,
        itemId,
        hostelId,
        parseResult.data,
        userId
      );
      
      res.status(200).json({ data: item });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();
