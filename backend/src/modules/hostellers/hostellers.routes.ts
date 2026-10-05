import { Router } from "express";
import { hostellersController } from "./hostellers.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(tenantMiddleware);

router.get(
  "/",
  requireRole(["owner", "manager"]),
  hostellersController.getHostellers.bind(hostellersController)
);

// Details route must come BEFORE /:id to avoid conflict
router.get(
  "/:id/details",
  requireRole(["owner", "manager"]),
  hostellersController.getHostellerDetails.bind(hostellersController)
);

router.get(
  "/:id",
  requireRole(["owner", "manager"]),
  hostellersController.getHostellerById.bind(hostellersController)
);

export { router as hostellersRouter };
