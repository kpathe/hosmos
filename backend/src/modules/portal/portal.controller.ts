import type { Request, Response, NextFunction } from "express";
import { portalService } from "./portal.service.js";
import type {
  ApiSuccessResponse,
  ApiCollectionResponse,
  PortalProfileDto,
  PortalRoomDto,
  BillDto,
  PaymentDto,
} from "@hosmos/types";

export class PortalController {
  async getProfile(
    req: Request,
    res: Response<ApiSuccessResponse<PortalProfileDto>>,
    next: NextFunction
  ) {
    try {
      const hostellerId = req.user!.sub;
      const profile = await portalService.getProfile(hostellerId);
      res.status(200).json({ data: profile });
    } catch (error) {
      next(error);
    }
  }

  async getRoomDetails(
    req: Request,
    res: Response<ApiSuccessResponse<PortalRoomDto>>,
    next: NextFunction
  ) {
    try {
      const hostellerId = req.user!.sub;
      const room = await portalService.getRoomDetails(hostellerId);
      res.status(200).json({ data: room });
    } catch (error) {
      next(error);
    }
  }

  async getBills(
    req: Request,
    res: Response<ApiCollectionResponse<BillDto>>,
    next: NextFunction
  ) {
    try {
      const hostellerId = req.user!.sub;
      const bills = await portalService.getBills(hostellerId);
      res.status(200).json({
        data: bills,
        meta: { total: bills.length, page: 1, per_page: bills.length },
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(
    req: Request,
    res: Response<ApiCollectionResponse<PaymentDto>>,
    next: NextFunction
  ) {
    try {
      const hostellerId = req.user!.sub;
      const payments = await portalService.getPayments(hostellerId);
      res.status(200).json({
        data: payments,
        meta: { total: payments.length, page: 1, per_page: payments.length },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const portalController = new PortalController();

