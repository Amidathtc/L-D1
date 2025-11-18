import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  requireAdmin,
  requireBranchManager,
  requireStaff,
} from "../middlewares/role.middleware";
import {
  createCustomerSchema,
  updateCustomerSchema,
  reassignCustomerSchema,
} from "../validators/customer.validator";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

router.use(authenticate);

// Configure multer for profile uploads
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
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
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

router.post(
  "/",
  requireStaff,
  validate(createCustomerSchema),
  auditLog("CUSTOMER_CREATED", "Customer"),
  CustomerController.createCustomer
);

router.get("/", requireStaff, CustomerController.getCustomers);

router.get("/:id", requireStaff, CustomerController.getCustomerById);

router.get("/:id/loans", requireStaff, CustomerController.getCustomerLoans);

router.put(
  "/:id",
  requireStaff,
  validate(updateCustomerSchema),
  auditLog("CUSTOMER_UPDATED", "Customer"),
  CustomerController.updateCustomer
);

router.post(
  "/:id/reassign",
  requireBranchManager,
  validate(reassignCustomerSchema),
  auditLog("CUSTOMER_REASSIGNED", "Customer"),
  CustomerController.reassignCustomer
);

router.delete(
  "/:id",
  requireAdmin,
  auditLog("CUSTOMER_DELETED", "Customer"),
  CustomerController.deleteCustomer
);

// Profile upload route
router.post(
  "/:id/profile",
  requireStaff,
  upload.single("file"),
  CustomerController.uploadProfile
);

export default router;
