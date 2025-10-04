import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { Role } from "@prisma/client";

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Company Settings - Admin only
router.get(
  "/company",
  requireRole(Role.ADMIN),
  SettingsController.getCompanySettings
);
router.put(
  "/company",
  requireRole(Role.ADMIN),
  SettingsController.updateCompanySettings
);

// Email Settings - Admin only
router.get(
  "/email",
  requireRole(Role.ADMIN),
  SettingsController.getEmailSettings
);
router.put(
  "/email",
  requireRole(Role.ADMIN),
  SettingsController.updateEmailSettings
);
router.post(
  "/email/test",
  requireRole(Role.ADMIN),
  SettingsController.testEmailSettings
);

// General Settings - Admin only
router.get(
  "/general",
  requireRole(Role.ADMIN),
  SettingsController.getGeneralSettings
);
router.put(
  "/general",
  requireRole(Role.ADMIN),
  SettingsController.updateGeneralSettings
);

// Password Settings - All authenticated users
router.put("/password", SettingsController.changePassword);

// System Settings - Admin only
router.get(
  "/system",
  requireRole(Role.ADMIN),
  SettingsController.getSystemSettings
);
router.put(
  "/system",
  requireRole(Role.ADMIN),
  SettingsController.updateSystemSettings
);

export default router;
