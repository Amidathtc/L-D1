import { Router } from "express";
import { BranchTransferController } from "../controllers/branch-transfer.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create branch transfer (Admin only)
router.post(
  "/",
  requireRole(["ADMIN"]),
  BranchTransferController.createTransfer
);

// Execute branch transfer (Admin only)
router.post(
  "/:id/execute",
  requireRole(["ADMIN"]),
  BranchTransferController.executeTransfer
);

// Cancel branch transfer (Admin only)
router.post(
  "/:id/cancel",
  requireRole(["ADMIN"]),
  BranchTransferController.cancelTransfer
);

// Get all branch transfers (Admin and Branch Manager)
router.get(
  "/",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  BranchTransferController.getTransfers
);

// Get specific branch transfer (Admin and Branch Manager)
router.get(
  "/:id",
  requireRole(["ADMIN", "BRANCH_MANAGER"]),
  BranchTransferController.getTransferById
);

export default router;
