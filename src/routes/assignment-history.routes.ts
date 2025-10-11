import { Router } from "express";
import { AssignmentHistoryController } from "../controllers/assignment-history.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBranchManager } from "../middlewares/role.middleware";

const router = Router();

// Get assignment history (Admin and Branch Manager only)
router.get(
  "/",
  authenticate,
  requireBranchManager,
  AssignmentHistoryController.getAssignmentHistory
);

export default router;
