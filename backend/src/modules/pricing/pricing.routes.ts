import { Router } from "express";
import { pricingController } from "./pricing.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// All pricing routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Only owners can create and update pricing models
router.post(
  "/",
  requireRole(["owner"]),
  pricingController.createPricingModel.bind(pricingController)
);

router.put(
  "/:id",
  requireRole(["owner"]),
  pricingController.updatePricingModel.bind(pricingController)
);

// Owners and managers can view pricing models
router.get(
  "/",
  requireRole(["owner", "manager"]),
  pricingController.getPricingModels.bind(pricingController)
);

router.get(
  "/:id",
  requireRole(["owner", "manager"]),
  pricingController.getPricingModelById.bind(pricingController)
);

export { router as pricingRouter };
