import { Router } from "express";
import { hostelsController } from "./hostels.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";

const router = Router();

// All hostel routes require authentication
router.use(requireAuth);

// Routes specifically for Owners
router.post(
  "/",
  requireRole(["owner"]),
  hostelsController.createHostel.bind(hostelsController)
);

router.get(
  "/",
  requireRole(["owner"]),
  hostelsController.getHostels.bind(hostelsController)
);

router.put(
  "/:slug",
  requireRole(["owner"]),
  hostelsController.updateHostel.bind(hostelsController)
);

// Routes for both Owners and Managers
// Later we will add TenantMiddleware to ensure managers can only access their assigned hostel
router.get(
  "/:slug",
  requireRole(["owner", "manager"]),
  hostelsController.getHostelBySlug.bind(hostelsController)
);

export { router as hostelsRouter };
