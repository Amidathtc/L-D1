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
import { requireAdmin, requireStaff } from "../middlewares/role.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Read operations - allow all staff (admin, branch manager, credit officer)
router.route("/").get(validate(getUsersSchema), UserController.getUsers);
router.route("/:id").get(UserController.getUserById);

// Write operations - admin only
router
  .route("/")
  .post(
    requireAdmin,
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

export default router;
