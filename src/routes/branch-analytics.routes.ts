import { Router } from "express";
import { BranchAnalyticsController } from "../controllers/branch-analytics.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate branch analytics (Admin and Branch Manager)
router.post(
  "/branch/:branchId/generate",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  BranchAnalyticsController.generateAnalytics
);

// Get branch analytics (Admin and Branch Manager)
router.get(
  "/branch",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  BranchAnalyticsController.getAnalytics
);

// Get branch performance comparison (Admin only)
router.post(
  "/comparison",
  requireRole(["ADMIN"]),
  BranchAnalyticsController.getPerformanceComparison
);

// Get system analytics (Admin only)
router.get(
  "/system",
  requireRole(["ADMIN"]),
  BranchAnalyticsController.getSystemAnalytics
);

export default router;
