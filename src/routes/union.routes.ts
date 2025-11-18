import { Router } from "express";
import { UnionController } from "../controllers/union.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole, requireAdmin } from "../middlewares/role.middleware";
import { Role } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create union (admin, supervisor)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.SUPERVISOR),
  UnionController.createUnion
);

// Get all unions (all roles)
router.get("/", UnionController.getUnions);

// Get union by ID (all roles)
router.get("/:id", UnionController.getUnionById);

// Update union (admin only)
router.put(
  "/:id",
  requireAdmin,
  UnionController.updateUnion
);

// Delete union (admin only)
router.delete(
  "/:id",
  requireAdmin,
  UnionController.deleteUnion
);

// Reassign union to another credit officer (admin only)
router.post(
  "/:unionId/assign",
  requireAdmin,
  UnionController.assignUnionToCreditOfficer
);

// Export unions (all roles)
router.get("/export/csv", UnionController.exportUnions);

export default router;
