import { Router } from "express";
import { UserActivityController } from "../controllers/user-activity.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Update user activity (All authenticated users)
router.post("/update", UserActivityController.updateActivity);

// Get login history (Admin and Branch Manager)
router.get(
  "/login-history",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  UserActivityController.getLoginHistory
);

// Get user activity summary (Admin and Branch Manager)
router.get(
  "/user/:userId/summary",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  UserActivityController.getUserActivitySummary
);

// Get branch activity summary (Admin and Branch Manager)
router.get(
  "/branch/:branchId/summary",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  UserActivityController.getBranchActivitySummary
);

// Get system activity summary (Admin only)
router.get(
  "/system/summary",
  requireRole(["ADMIN"]),
  UserActivityController.getSystemActivitySummary
);

export default router;
