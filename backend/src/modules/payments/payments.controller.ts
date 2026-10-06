import { Request, Response, NextFunction } from "express";
import { paymentsService } from "./payments.service.js";
import { recordPaymentSchema } from "./payments.schema.js";
import { ValidationError } from "../../utils/errors.js";

export class PaymentsController {
  async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const parseResult = recordPaymentSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      const payment = await paymentsService.recordPayment(hostelId, parseResult.data, userId);
      
      res.status(201).json({ data: payment });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const filters = {
        hostellerId: req.query.hosteller_id as string,
        billId: req.query.bill_id as string,
      };
      
      const payments = await paymentsService.getPayments(hostelId, filters);
      res.status(200).json({ data: payments });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
