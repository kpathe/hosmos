import { Request, Response, NextFunction } from "express";
import { hostellersService } from "./hostellers.service.js";
import type { ApiCollectionResponse, ApiSuccessResponse, HostellerDto } from "@hosmos/types";
import type { HostellerDetailsDto } from "./hostellers.service.js";
import { NotFoundError } from "../../utils/errors.js";

class HostellersController {
  /**
   * GET /api/v1/hostellers
   * Query params:
   *  - room_id: optional, filter by room
   */
  async getHostellers(req: Request, res: Response<ApiCollectionResponse<HostellerDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"] as string;
      const roomId = req.query.room_id as string | undefined;

      const hostellers = await hostellersService.getHostellers(hostelId, roomId);

      res.status(200).json({
        data: hostellers,
        meta: {
          total: hostellers.length,
          page: 1,
          per_page: hostellers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getHostellerById(req: Request, res: Response<ApiSuccessResponse<HostellerDto>>, next: NextFunction) {
    try {
      const hostellerId = req.params["id"] as string;
      const hosteller = await hostellersService.getHostellerById(hostellerId);

      if (!hosteller) {
        throw new NotFoundError("Hosteller not found");
      }

      res.status(200).json({ data: hosteller });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/hostellers/:id/details
   * Full hosteller profile with bills, payments, security deposit, current room
   */
  async getHostellerDetails(req: Request, res: Response<ApiSuccessResponse<HostellerDetailsDto>>, next: NextFunction) {
    try {
      const hostellerId = req.params["id"] as string;
      const details = await hostellersService.getHostellerDetails(hostellerId);

      if (!details) {
        throw new NotFoundError("Hosteller not found");
      }

      res.status(200).json({ data: details });
    } catch (error) {
      next(error);
    }
  }
}

export const hostellersController = new HostellersController();
