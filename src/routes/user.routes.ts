import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createUserSchema,
  updateUserSchema,
  getUsersSchema,
} from "../validators/user.validator";
import {
  requireAdmin,
  requireStaff,
  requireAdminOrBranchManager,
} from "../middlewares/role.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Read operations - allow all staff (admin, branch manager, credit officer)
router.route("/").get(validate(getUsersSchema), UserController.getUsers);
router.route("/:id").get(UserController.getUserById);

// Write operations - admin and branch managers can create users
router.route("/").post(
  requireAdminOrBranchManager, // Allow admin and branch managers only
  validate(createUserSchema),
  auditLog("USER_CREATED", "User"),
  UserController.createUser
);

router
  .route("/:id")
  .put(
    requireAdmin,
    validate(updateUserSchema),
    auditLog("USER_UPDATED", "User"),
    UserController.updateUser
  );

router
  .route("/:id")
  .delete(
    requireAdmin,
    auditLog("USER_DELETED", "User"),
    UserController.deleteUser
  );

router
  .route("/:id/reset-password")
  .put(
    requireAdmin,
    auditLog("PASSWORD_RESET", "User"),
    UserController.resetPassword
  );

// Bulk operations - admin only
router.post(
  "/bulk-operation",
  requireAdmin,
  auditLog("BULK_USER_OPERATION", "User"),
  UserController.bulkUserOperation
);

// Export/Import operations - admin only
router.get("/export", requireAdmin, UserController.exportUsers);

router.post(
  "/import",
  requireAdmin,
  auditLog("USERS_IMPORTED", "User"),
  UserController.importUsers
);

export default router;
