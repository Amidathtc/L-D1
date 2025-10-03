import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  loginSchema,
  changePasswordSchema,
} from "../validators/auth.validator";

const router = Router();

router.post("/login", validate(loginSchema), AuthController.login);
router.post("/logout", authenticate, AuthController.logout);
router.post("/refresh", AuthController.refreshToken);
router.get("/me", authenticate, AuthController.getProfile);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword
);

export default router;
