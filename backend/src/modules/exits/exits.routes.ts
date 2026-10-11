import { Router } from "express";
import { exitsController } from "./exits.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// Only owners can process exits and settlements
router.use(requireAuth);
router.use(tenantMiddleware);
router.use(requireRole(["owner"]));

router.post("/", exitsController.processExit.bind(exitsController));
router.get("/", exitsController.getExits.bind(exitsController));
router.get("/preview/:hostellerId", exitsController.getExitPreview.bind(exitsController));
router.post("/:hostellerId/mark-pending", exitsController.markExitPending.bind(exitsController));
router.get("/:id", exitsController.getExitById.bind(exitsController));

export const exitsRouter = router;
