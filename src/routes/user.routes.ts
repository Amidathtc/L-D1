import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
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
  requireAdminOrBranchManager,
  requireAdminOrSelf,
} from "../middlewares/role.middleware";

const router = Router();

// All user routes require authentication
router.use(authenticate);

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "profiles");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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
    requireAdminOrSelf,
    profileUpload.single("profileImage"),
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
