import { Router } from "express";
import { metersController } from "./meters.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// All meter routes require at least manager access and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);
router.use(requireRole(["owner", "manager"]));

router.post("/", metersController.recordReading);
router.get("/", metersController.getReadings);
router.post("/assign", metersController.assignElectricityCosts);

export const metersRouter = router;
