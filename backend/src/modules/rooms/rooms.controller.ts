import type { Request, Response, NextFunction } from "express";
import { roomsService } from "./rooms.service.js";
import type { 
  CreateRoomRequest, 
  CreateRoomsBulkRequest,
  UpdateRoomRequest, 
  ApiSuccessResponse, 
  ApiCollectionResponse, 
  RoomDto 
} from "@hosmos/types";
import { ValidationError } from "../../utils/errors.js";

export class RoomsController {
  
  async getRooms(req: Request, res: Response<ApiCollectionResponse<RoomDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const rooms = await roomsService.getRoomsByHostel(hostelId);
      
      res.status(200).json({
        data: rooms,
        meta: { total: rooms.length, page: 1, per_page: rooms.length }
      });
    } catch (error) {
      next(error);
    }
  }

  async createRoom(req: Request<{}, {}, CreateRoomRequest>, res: Response<ApiSuccessResponse<RoomDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const room = await roomsService.createRoom(hostelId, req.body);
      
      res.status(201).json({ data: room });
    } catch (error) {
      next(error);
    }
  }

  async createRoomsBulk(req: Request<{}, {}, CreateRoomsBulkRequest>, res: Response<ApiCollectionResponse<RoomDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const rooms = await roomsService.createRoomsBulk(hostelId, req.body);
      
      res.status(201).json({
        data: rooms,
        meta: { total: rooms.length, page: 1, per_page: rooms.length }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRoom(req: Request<{ id: string }, {}, UpdateRoomRequest>, res: Response<ApiSuccessResponse<RoomDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const id = req.params.id as string;
      const room = await roomsService.updateRoom(id, hostelId, req.body);
      
      res.status(200).json({ data: room });
    } catch (error) {
      next(error);
    }
  }
}

export const roomsController = new RoomsController();
