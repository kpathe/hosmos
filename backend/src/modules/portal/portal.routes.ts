import { Router } from "express";
import { portalController } from "./portal.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

const router = Router();

// All portal routes require authentication as a hosteller
router.use(requireAuth);
router.use(requireRole(["hosteller"]));

router.get("/me", portalController.getProfile.bind(portalController));
router.get("/room", portalController.getRoomDetails.bind(portalController));
router.get("/bills", portalController.getBills.bind(portalController));
router.get("/payments", portalController.getPayments.bind(portalController));

export { router as portalRouter };
