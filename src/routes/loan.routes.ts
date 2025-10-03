import { Router } from "express";
import { LoanController } from "../controllers/loan.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBranchManager } from "../middlewares/role.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createLoanSchema,
  updateLoanSchema,
  updateLoanStatusSchema,
  disburseLoanSchema,
  assignLoanSchema,
} from "../validators/loan.validator";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  validate(createLoanSchema),
  auditLog("LOAN_CREATED", "Loan"),
  LoanController.createLoan
);

router.get("/", LoanController.getLoans);

router.get("/:id", LoanController.getLoanById);

router.get("/:id/schedule", LoanController.getLoanSchedule);

router.get("/:id/summary", LoanController.getLoanSummary);

router.put(
  "/:id",
  validate(updateLoanSchema),
  auditLog("LOAN_UPDATED", "Loan"),
  LoanController.updateLoan
);

router.put(
  "/:id/status",
  requireBranchManager,
  validate(updateLoanStatusSchema),
  auditLog("LOAN_STATUS_UPDATED", "Loan"),
  LoanController.updateLoanStatus
);

router.post(
  "/:id/disburse",
  requireBranchManager,
  validate(disburseLoanSchema),
  auditLog("LOAN_DISBURSED", "Loan"),
  LoanController.disburseLoan
);

router.post(
  "/:id/assign",
  requireBranchManager,
  validate(assignLoanSchema),
  auditLog("LOAN_ASSIGNED", "Loan"),
  LoanController.assignLoan
);

router.delete(
  "/:id",
  auditLog("LOAN_DELETED", "Loan"),
  LoanController.deleteLoan
);

export default router;
