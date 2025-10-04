import { Router } from "express";
import { BranchController } from "../controllers/branch.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createBranchSchema,
  updateBranchSchema,
} from "../validators/branch.validator";
import {
  requireAdmin,
  requireBranchManager,
  requireStaff,
} from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireAdmin,
  validate(createBranchSchema),
  auditLog("BRANCH_CREATED", "Branch"),
  BranchController.createBranch
);

router.get("/", requireStaff, BranchController.getBranches);

router.get("/:id", requireStaff, BranchController.getBranchById);

router.get("/:id/stats", requireBranchManager, BranchController.getBranchStats);

router.put(
  "/:id",
  requireAdmin,
  validate(updateBranchSchema),
  auditLog("BRANCH_UPDATED", "Branch"),
  BranchController.updateBranch
);

router.delete(
  "/:id",
  requireAdmin,
  auditLog("BRANCH_DELETED", "Branch"),
  BranchController.deleteBranch
);

export default router;
