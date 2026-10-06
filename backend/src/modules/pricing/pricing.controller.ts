import type { Request, Response, NextFunction } from "express";
import { pricingService } from "./pricing.service.js";
import type { 
  CreatePricingModelRequest, 
  UpdatePricingModelRequest, 
  ApiSuccessResponse, 
  ApiCollectionResponse, 
  PricingModelDto 
} from "@hosmos/types";
import { ValidationError } from "../../utils/errors.js";

export class PricingController {
  
  async getPricingModels(req: Request, res: Response<ApiCollectionResponse<PricingModelDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const models = await pricingService.getPricingModelsByHostel(hostelId);
      
      res.status(200).json({
        data: models,
        meta: { total: models.length, page: 1, per_page: models.length }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPricingModelById(req: Request, res: Response<ApiSuccessResponse<PricingModelDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const id = req.params["id"] as string;
      const model = await pricingService.getPricingModelById(id, hostelId);
      
      res.status(200).json({ data: model });
    } catch (error) {
      next(error);
    }
  }

  async createPricingModel(req: Request<{}, {}, CreatePricingModelRequest>, res: Response<ApiSuccessResponse<PricingModelDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const model = await pricingService.createPricingModel(hostelId, req.body);
      
      res.status(201).json({ data: model });
    } catch (error) {
      next(error);
    }
  }

  async updatePricingModel(req: Request<{ id: string }, {}, UpdatePricingModelRequest>, res: Response<ApiSuccessResponse<PricingModelDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const id = req.params.id as string;
      const model = await pricingService.updatePricingModel(id, hostelId, req.body);
      
      res.status(200).json({ data: model });
    } catch (error) {
      next(error);
    }
  }

  async deletePricingModel(req: Request<{ id: string }>, res: Response<ApiSuccessResponse<{ success: boolean }>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      if (!hostelId) throw new ValidationError("x-hostel-id header is required");

      const id = req.params.id as string;
      await pricingService.deletePricingModel(id, hostelId);
      
      res.status(200).json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  }
}

export const pricingController = new PricingController();
