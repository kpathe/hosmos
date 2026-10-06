import { Router } from "express";
import { paymentsController } from "./payments.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router({ mergeParams: true });

// All payments routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Only owners can record payments
router.post(
  "/",
  requireRole(["owner"]),
  paymentsController.recordPayment.bind(paymentsController)
);

// Owners can view payments
router.get(
  "/",
  requireRole(["owner"]),
  paymentsController.getPayments.bind(paymentsController)
);

export { router as paymentsRouter };
