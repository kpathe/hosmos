import type { Request, Response } from "express";
import { exitsService } from "./exits.service.js";
import { processExitSchema, exitPreviewSchema } from "./exits.schema.js";
import { ValidationError } from "../../utils/errors.js";

export class ExitsController {
  async markExitPending(req: Request, res: Response): Promise<void> {
    const hostelId = req.headers["x-hostel-id"] as string;
    const hostellerId = req.params["hostellerId"] as string;
    const userId = req.user!.sub;

    if (!hostelId) throw new ValidationError("Missing hostel context");
    if (!hostellerId) throw new ValidationError("Missing hosteller ID");

    const result = await exitsService.markExitPending(hostelId, hostellerId, userId);
    res.status(200).json({ data: result });
  }

  async getExitPreview(req: Request, res: Response): Promise<void> {
    const hostelId = req.headers["x-hostel-id"] as string;
    const hostellerId = req.params["hostellerId"] as string;

    if (!hostelId) throw new ValidationError("Missing hostel context");
    if (!hostellerId) throw new ValidationError("Missing hosteller ID");

    const parsed = exitPreviewSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message || "Invalid preview parameters");
    }

    const preview = await exitsService.getExitPreview(hostelId, hostellerId, parsed.data);
    res.status(200).json({ data: preview });
  }

  async processExit(req: Request, res: Response): Promise<void> {
    const hostelId = req.headers["x-hostel-id"] as string;
    const userId = req.user!.sub;

    if (!hostelId) throw new ValidationError("Missing hostel context");

    const parsed = processExitSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message || "Invalid exit data");
    }

    const settlement = await exitsService.processExit(hostelId, parsed.data, userId);
    res.status(200).json({ data: settlement });
  }

  async getExits(req: Request, res: Response): Promise<void> {
    const hostelId = req.headers["x-hostel-id"] as string;
    if (!hostelId) throw new ValidationError("Missing hostel context");

    const exits = await exitsService.getExits(hostelId);
    res.status(200).json({ data: exits });
  }

  async getExitById(req: Request, res: Response): Promise<void> {
    const hostelId = req.headers["x-hostel-id"] as string;
    const id = req.params["id"] as string;

    if (!hostelId) throw new ValidationError("Missing hostel context");
    if (!id) throw new ValidationError("Missing exit ID");

    const exit = await exitsService.getExitById(hostelId, id);
    res.status(200).json({ data: exit });
  }
}

export const exitsController = new ExitsController();
