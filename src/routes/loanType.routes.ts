import { Router } from "express";
import { LoanTypeController } from "../controllers/loanType.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin, requireStaff } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createLoanTypeSchema,
  updateLoanTypeSchema,
} from "../validators/loanType.validator";

const router = Router();

router.use(authenticate);

// All staff can view loan types
router.get("/", requireStaff, LoanTypeController.getLoanTypes);
router.get("/:id", requireStaff, LoanTypeController.getLoanTypeById);

// Only admins can manage loan types
router.post(
  "/",
  requireAdmin,
  validate(createLoanTypeSchema),
  auditLog("LOAN_TYPE_CREATED", "LoanType"),
  LoanTypeController.createLoanType
);

router.put(
  "/:id",
  requireAdmin,
  validate(updateLoanTypeSchema),
  auditLog("LOAN_TYPE_UPDATED", "LoanType"),
  LoanTypeController.updateLoanType
);

router.put(
  "/:id/toggle-status",
  requireAdmin,
  auditLog("LOAN_TYPE_STATUS_TOGGLED", "LoanType"),
  LoanTypeController.toggleLoanTypeStatus
);

router.delete(
  "/:id",
  requireAdmin,
  auditLog("LOAN_TYPE_DELETED", "LoanType"),
  LoanTypeController.deleteLoanType
);

export default router;
