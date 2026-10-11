import { Router } from "express";
import { roomsController } from "./rooms.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";

const router = Router();

// All room routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Owners and managers can manage rooms
router.post(
  "/",
  requireRole(["owner", "manager"]),
  roomsController.createRoom.bind(roomsController)
);

router.post(
  "/bulk",
  requireRole(["owner", "manager"]),
  roomsController.createRoomsBulk.bind(roomsController)
);

router.put(
  "/:id",
  requireRole(["owner", "manager"]),
  roomsController.updateRoom.bind(roomsController)
);

router.get(
  "/",
  requireRole(["owner", "manager"]),
  roomsController.getRooms.bind(roomsController)
);

// Only owners can delete rooms
router.delete(
  "/:id",
  requireRole(["owner"]),
  roomsController.deleteRoom.bind(roomsController)
);

export { router as roomsRouter };
