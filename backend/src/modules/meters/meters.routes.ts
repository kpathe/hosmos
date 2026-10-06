import { Router } from "express";
import { metersController } from "./meters.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRoles } from "../../middlewares/role.middleware.js";
import { requireHostelAccess } from "../../middlewares/hostel.middleware.js";

const router = Router();

// All meter routes require at least manager access
router.use(requireAuth);
router.use(requireRoles(["owner", "manager"]));
router.use(requireHostelAccess);

router.post("/", metersController.recordReading);
router.get("/", metersController.getReadings);
router.post("/assign", metersController.assignElectricityCosts);

export const metersRouter = router;
