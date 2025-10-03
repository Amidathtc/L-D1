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

router.post(
  "/",
  validate(createUserSchema),
  auditLog("USER_CREATED", "User"),
  UserController.createUser
);

router.get("/", validate(getUsersSchema), UserController.getUsers);

router.get("/:id", UserController.getUserById);

router.put(
  "/:id",
  validate(updateUserSchema),
  auditLog("USER_UPDATED", "User"),
  UserController.updateUser
);

router.delete(
  "/:id",
  auditLog("USER_DELETED", "User"),
  UserController.deleteUser
);

router.put(
  "/:id/reset-password",
  auditLog("PASSWORD_RESET", "User"),
  UserController.resetPassword
);

export default router;
