import type { Request, Response, NextFunction } from "express";
import { hostelsService } from "./hostels.service.js";
import type { CreateHostelRequest, UpdateHostelRequest, ApiSuccessResponse, ApiCollectionResponse, HostelDto } from "@hosmos/types";

export class HostelsController {
  
  /**
   * GET /api/v1/hostels
   * Returns all hostels owned by the authenticated owner.
   */
  async getHostels(req: Request, res: Response<ApiCollectionResponse<HostelDto>>, next: NextFunction) {
    try {
      const ownerId = req.user!.sub;
      const hostels = await hostelsService.getHostelsByOwner(ownerId);
      
      res.status(200).json({
        data: hostels,
        meta: {
          total: hostels.length,
          page: 1,
          per_page: hostels.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hostels/:id
   * Returns a specific hostel by ID.
   */
  async getHostelById(req: Request, res: Response<ApiSuccessResponse<HostelDto>>, next: NextFunction) {
    try {
      const hostelId = req.params["id"] as string;
      const hostel = await hostelsService.getHostelById(hostelId);
      
      res.status(200).json({ data: hostel });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/hostels
   * Creates a new hostel for the authenticated owner.
   */
  async createHostel(req: Request<{}, {}, CreateHostelRequest>, res: Response<ApiSuccessResponse<HostelDto>>, next: NextFunction) {
    try {
      const ownerId = req.user!.sub;
      const hostel = await hostelsService.createHostel(ownerId, req.body);
      
      res.status(201).json({ data: hostel });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/hostels/:id
   * Updates an existing hostel.
   */
  async updateHostel(req: Request<{ id: string }, {}, UpdateHostelRequest>, res: Response<ApiSuccessResponse<HostelDto>>, next: NextFunction) {
    try {
      const ownerId = req.user!.sub;
      const hostelId = req.params.id as string;
      
      const hostel = await hostelsService.updateHostel(hostelId, ownerId, req.body);
      
      res.status(200).json({ data: hostel });
    } catch (error) {
      next(error);
    }
  }
}

export const hostelsController = new HostelsController();
