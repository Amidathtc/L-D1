import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  loginSchema,
  changePasswordSchema,
  registerSchema,
} from "../validators/auth.validator";

const router = Router();

// Test route to verify auth routes are working
router.route("/test").get((req, res) => {
  res.json({
    message: "Auth routes are working",
    timestamp: new Date().toISOString(),
  });
});

router
  .route("/register")
  .post(validate(registerSchema), AuthController.register);
router.route("/login").post(validate(loginSchema), AuthController.login);
router.route("/logout").post(authenticate, AuthController.logout);
router.route("/refresh").post(AuthController.refreshToken);
router.route("/me").get(authenticate, AuthController.getProfile);
router
  .route("/change-password")
  .put(
    authenticate,
    validate(changePasswordSchema),
    AuthController.changePassword
  );

export default router;
