import { Router } from "express";
import { admissionsController } from "./admissions.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// Admissions require auth and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Owners and managers can admit hostellers
router.post(
  "/",
  requireRole(["owner", "manager"]),
  admissionsController.admitHosteller.bind(admissionsController)
);

export { router as admissionsRouter };
