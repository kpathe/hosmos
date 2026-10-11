import { Router } from "express";
import { reportsController } from "./reports.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// Ledger is financial data, for managers/owners with tenant context
router.use(requireAuth);
router.use(tenantMiddleware);
router.use(requireRole(["owner", "manager"]));

router.get("/ledger", reportsController.getMonthlyLedger);

export const reportsRouter = router;
