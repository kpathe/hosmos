import type { Request, Response, NextFunction } from "express";
import { managersService } from "./managers.service.js";
import type { 
  CreateManagerRequest, 
  UpdateManagerRequest, 
  ApiSuccessResponse, 
  ApiCollectionResponse, 
  ManagerDto 
} from "@hosmos/types";
import { ValidationError } from "../../utils/errors.js";

export class ManagersController {
  
  async getManagers(req: Request, res: Response<ApiCollectionResponse<ManagerDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const managers = await managersService.getManagersByHostel(hostelId);
      
      res.status(200).json({
        data: managers,
        meta: { total: managers.length, page: 1, per_page: managers.length }
      });
    } catch (error) {
      next(error);
    }
  }

  async createManager(req: Request<{}, {}, CreateManagerRequest>, res: Response<ApiSuccessResponse<ManagerDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const ownerId = req.user!.sub;
      const manager = await managersService.createManager(hostelId, ownerId, req.body);
      
      res.status(201).json({ data: manager });
    } catch (error) {
      next(error);
    }
  }

  async updateManager(req: Request<{ id: string }, {}, UpdateManagerRequest>, res: Response<ApiSuccessResponse<ManagerDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const id = req.params.id as string;
      const manager = await managersService.updateManager(id, hostelId, req.body);
      
      res.status(200).json({ data: manager });
    } catch (error) {
      next(error);
    }
  }

  async removeManager(req: Request<{ id: string }>, res: Response<ApiSuccessResponse<null>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const id = req.params.id as string;
      await managersService.removeManager(id, hostelId);
      
      res.status(200).json({ data: null });
    } catch (error) {
      next(error);
    }
  }
}

export const managersController = new ManagersController();
