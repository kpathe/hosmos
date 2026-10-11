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
      const userId = req.user!.sub;
      const role = req.user!.role;
      const hostels = await hostelsService.getHostelsForUser(userId, role);
      
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
   * GET /api/v1/hostels/:slug
   * Returns a specific hostel by slug.
   */
  async getHostelBySlug(req: Request, res: Response<ApiSuccessResponse<HostelDto>>, next: NextFunction) {
    try {
      const slug = req.params["slug"] as string;
      const hostel = await hostelsService.getHostelBySlug(slug);
      
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
   * PUT /api/v1/hostels/:slug
   * Updates an existing hostel.
   */
  async updateHostel(req: Request<{ slug: string }, {}, UpdateHostelRequest>, res: Response<ApiSuccessResponse<HostelDto>>, next: NextFunction) {
    try {
      const ownerId = req.user!.sub;
      const slug = req.params.slug as string;
      
      const hostel = await hostelsService.updateHostel(slug, ownerId, req.body);
      
      res.status(200).json({ data: hostel });
    } catch (error) {
      next(error);
    }
  }
}

export const hostelsController = new HostelsController();
