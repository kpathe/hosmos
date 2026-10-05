import type { Request, Response, NextFunction } from "express";
import { admissionsService } from "./admissions.service.js";
import type { 
  CreateAdmissionRequest, 
  ApiSuccessResponse, 
  AdmissionResultDto 
} from "@hosmos/types";
import { ValidationError } from "../../utils/errors.js";

export class AdmissionsController {
  
  async admitHosteller(req: Request<{}, {}, CreateAdmissionRequest>, res: Response<ApiSuccessResponse<AdmissionResultDto>>, next: NextFunction) {
    try {
      const hostelId = req.headers["x-hostel-id"];
      if (typeof hostelId !== "string") throw new ValidationError("x-hostel-id header is required");

      const createdBy = req.user!.sub;
      const admissionResult = await admissionsService.admitHosteller(hostelId, createdBy, req.body);
      
      res.status(201).json({ data: admissionResult });
    } catch (error) {
      next(error);
    }
  }

}

export const admissionsController = new AdmissionsController();
