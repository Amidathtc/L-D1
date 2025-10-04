import { Router } from "express";
import { BranchTransferController } from "../controllers/branch-transfer.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireAdmin,
  requireAdminOrManager,
} from "../middlewares/role.middleware";
import { Role } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create branch transfer (Admin only)
router.post("/", requireAdmin, BranchTransferController.createTransfer);

// Execute branch transfer (Admin only)
router.post(
  "/:id/execute",
  requireAdmin,
  BranchTransferController.executeTransfer
);

// Cancel branch transfer (Admin only)
router.post(
  "/:id/cancel",
  requireAdmin,
  BranchTransferController.cancelTransfer
);

// Get all branch transfers (Admin and Branch Manager)
router.get("/", requireAdminOrManager, BranchTransferController.getTransfers);

// Get specific branch transfer (Admin and Branch Manager)
router.get(
  "/:id",
  requireAdminOrManager,
  BranchTransferController.getTransferById
);

export default router;
