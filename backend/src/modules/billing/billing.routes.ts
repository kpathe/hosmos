import { Router } from "express";
import { billingController } from "./billing.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router({ mergeParams: true });

// All billing routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Only owners can generate bills
router.post(
  "/generate",
  requireRole(["owner"]),
  billingController.generateBills.bind(billingController)
);

// Owners can view bills
router.get(
  "/",
  requireRole(["owner"]),
  billingController.getBills.bind(billingController)
);

router.get(
  "/:id",
  requireRole(["owner"]),
  billingController.getBillById.bind(billingController)
);

// Owners can add items to an unpaid bill
router.post(
  "/:id/items",
  requireRole(["owner"]),
  billingController.addBillItem.bind(billingController)
);

// Owners can update items on an unpaid bill
router.patch(
  "/:id/items/:itemId",
  requireRole(["owner"]),
  billingController.updateBillItem.bind(billingController)
);

export { router as billingRouter };
