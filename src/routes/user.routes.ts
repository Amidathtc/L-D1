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
import { requireAdmin } from "../middlewares/role.middleware";

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate, requireAdmin);

router
  .route("/")
  .post(
    validate(createUserSchema),
    auditLog("USER_CREATED", "User"),
    UserController.createUser
  );

router.route("/").get(validate(getUsersSchema), UserController.getUsers);

router.route("/:id").get(UserController.getUserById);

router
  .route("/:id")
  .put(
    validate(updateUserSchema),
    auditLog("USER_UPDATED", "User"),
    UserController.updateUser
  );

router
  .route("/:id")
  .delete(auditLog("USER_DELETED", "User"), UserController.deleteUser);

router
  .route("/:id/reset-password")
  .put(auditLog("PASSWORD_RESET", "User"), UserController.resetPassword);

export default router;
