import { Router } from "express";
import { BranchAnalyticsController } from "../controllers/branch-analytics.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireAdminOrManager,
  requireAdmin,
} from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate branch analytics (Admin and Branch Manager)
router.post(
  "/branch/:branchId/generate",
  requireAdminOrManager,
  BranchAnalyticsController.generateAnalytics
);

// Get branch analytics (Admin and Branch Manager)
router.get(
  "/branch",
  requireAdminOrManager,
  BranchAnalyticsController.getAnalytics
);

// Get branch performance comparison (Admin only)
router.post(
  "/comparison",
  requireAdmin,
  BranchAnalyticsController.getPerformanceComparison
);

// Get system analytics (Admin only)
router.get(
  "/system",
  requireAdmin,
  BranchAnalyticsController.getSystemAnalytics
);

export default router;
