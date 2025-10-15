import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { Role } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// All settings routes require authentication
router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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

// File Upload - Admin only
router.post(
  "/upload",
  requireRole(Role.ADMIN),
  upload.single("file"),
  SettingsController.uploadFile
);

export default router;
