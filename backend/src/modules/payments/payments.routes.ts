import { Router } from "express";
import { paymentsController } from "./payments.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router({ mergeParams: true });

// All payments routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Owners and managers can record payments
router.post(
  "/",
  requireRole(["owner", "manager"]),
  paymentsController.recordPayment.bind(paymentsController)
);

// Owners and managers can view payments
router.get(
  "/",
  requireRole(["owner", "manager"]),
  paymentsController.getPayments.bind(paymentsController)
);

export { router as paymentsRouter };
