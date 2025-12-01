import { Router } from "express";
import { UnionMemberController } from "../controllers/union-member.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole, requireAdmin } from "../middlewares/role.middleware";
import { Role } from "@prisma/client";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create union member (admin, supervisor, credit officer)
router.post(
  "/",
  requireRole(Role.ADMIN, Role.SUPERVISOR, Role.CREDIT_OFFICER),
  UnionMemberController.createUnionMember
);

// Get all union members (all roles)
router.get("/", UnionMemberController.getUnionMembers);

// Get union member by ID (all roles)
router.get("/:id", UnionMemberController.getUnionMemberById);

// Update union member (admin, supervisor, credit officer)
router.put(
  "/:id",
  requireRole(Role.ADMIN, Role.SUPERVISOR, Role.CREDIT_OFFICER),
  UnionMemberController.updateUnionMember
);

// Delete union member (admin, supervisor, credit officer)
router.delete(
  "/:id",
  requireRole(Role.ADMIN, Role.SUPERVISOR, Role.CREDIT_OFFICER),
  UnionMemberController.deleteUnionMember
);

// Toggle member verification/approval status (admin, supervisor)
router.patch(
  "/:id/toggle-verification",
  requireRole(Role.ADMIN, Role.SUPERVISOR),
  UnionMemberController.toggleVerification
);

// Reassign union member to another union (admin only)
router.post(
  "/:id/reassign",
  requireAdmin,
  UnionMemberController.reassignUnionMember
);

// Export union members (all roles)
router.get("/export/csv", UnionMemberController.exportUnionMembers);

// Check email uniqueness for union members
router.get("/check-email", UnionMemberController.checkEmailUnique);

export default router;
