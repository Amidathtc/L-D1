import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Company Settings - Admin only
router.get(
  "/company",
  requireRole(["ADMIN"]),
  SettingsController.getCompanySettings
);
router.put(
  "/company",
  requireRole(["ADMIN"]),
  SettingsController.updateCompanySettings
);

// Email Settings - Admin only
router.get(
  "/email",
  requireRole(["ADMIN"]),
  SettingsController.getEmailSettings
);
router.put(
  "/email",
  requireRole(["ADMIN"]),
  SettingsController.updateEmailSettings
);
router.post(
  "/email/test",
  requireRole(["ADMIN"]),
  SettingsController.testEmailSettings
);

// General Settings - Admin only
router.get(
  "/general",
  requireRole(["ADMIN"]),
  SettingsController.getGeneralSettings
);
router.put(
  "/general",
  requireRole(["ADMIN"]),
  SettingsController.updateGeneralSettings
);

// Password Settings - All authenticated users
router.put("/password", SettingsController.changePassword);

// System Settings - Admin only
router.get(
  "/system",
  requireRole(["ADMIN"]),
  SettingsController.getSystemSettings
);
router.put(
  "/system",
  requireRole(["ADMIN"]),
  SettingsController.updateSystemSettings
);

export default router;
