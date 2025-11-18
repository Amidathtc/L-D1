import { Router } from "express";
import { UserActivityController } from "../controllers/user-activity.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireAdmin,
  requireAdminOrManager,
} from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Update user activity (All authenticated users)
router.post("/update", UserActivityController.updateActivity);

// Get login history (Admin and Branch Manager)
router.get(
  "/login-history",
  requireAdminOrManager,
  UserActivityController.getLoginHistory
);

// Get user activity summary (Admin and Branch Manager)
router.get(
  "/user/:userId/summary",
  requireAdminOrManager,
  UserActivityController.getUserActivitySummary
);

// Get union activity summary (Admin and Supervisor)
router.get(
  "/union/:unionId/summary",
  requireAdminOrManager,
  UserActivityController.getUnionActivitySummary
);

// Get system activity summary (Admin only)
router.get(
  "/system/summary",
  requireAdmin,
  UserActivityController.getSystemActivitySummary
);

export default router;
