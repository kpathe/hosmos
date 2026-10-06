import { Request, Response, NextFunction } from "express";
import { metersService } from "./meters.service.js";
import { recordMeterReadingSchema, assignElectricitySchema } from "./meters.schema.js";
import { ValidationError } from "../../utils/errors.js";

export class MetersController {
  async recordReading(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      
      const parseResult = recordMeterReadingSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      const reading = await metersService.recordReading(hostelId, parseResult.data, userId);
      
      res.status(201).json({ data: reading });
    } catch (error) {
      next(error);
    }
  }

  async getReadings(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      
      const roomId = req.query.room_id as string | undefined;
      const readings = await metersService.getReadings(hostelId, roomId);
      
      res.status(200).json({ data: readings });
    } catch (error) {
      next(error);
    }
  }

  async assignElectricityCosts(req: Request, res: Response, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");
      
      const parseResult = assignElectricitySchema.safeParse(req.body);
      if (!parseResult.success) {
        throw new ValidationError("Invalid request body", parseResult.error.format());
      }
      
      const userId = req.user!.sub;
      const result = await metersService.assignElectricityCosts(hostelId, parseResult.data, userId);
      
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const metersController = new MetersController();
