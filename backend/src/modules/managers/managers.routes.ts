import { Router } from "express";
import { managersController } from "./managers.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// All manager routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Only owners can manage managers
router.post(
  "/",
  requireRole(["owner"]),
  managersController.createManager.bind(managersController)
);

router.get(
  "/",
  requireRole(["owner"]),
  managersController.getManagers.bind(managersController)
);

router.put(
  "/:id",
  requireRole(["owner"]),
  managersController.updateManager.bind(managersController)
);

router.delete(
  "/:id",
  requireRole(["owner"]),
  managersController.removeManager.bind(managersController)
);

export { router as managersRouter };
