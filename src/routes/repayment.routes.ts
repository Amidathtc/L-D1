import { Router } from "express";
import { RepaymentController } from "../controllers/repayment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireBranchManager,
  requireStaff,
} from "../middlewares/role.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createRepaymentSchema,
  updateRepaymentSchema,
} from "../validators/repayment.validator";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  requireStaff,
  validate(createRepaymentSchema),
  auditLog("REPAYMENT_CREATED", "Repayment"),
  RepaymentController.createRepayment
);

router.get("/", requireStaff, RepaymentController.getRepayments);

router.get("/:id", requireStaff, RepaymentController.getRepaymentById);

router.put(
  "/:id",
  requireStaff,
  validate(updateRepaymentSchema),
  auditLog("REPAYMENT_UPDATED", "Repayment"),
  RepaymentController.updateRepayment
);

router.delete(
  "/:id",
  requireBranchManager,
  auditLog("REPAYMENT_DELETED", "Repayment"),
  RepaymentController.deleteRepayment
);

// Repayment schedule routes
router.get(
  "/schedules",
  requireStaff,
  RepaymentController.getRepaymentSchedules
);
router.get(
  "/schedules/:loanId",
  requireStaff,
  RepaymentController.getRepaymentScheduleByLoan
);
router.get("/summary", requireStaff, RepaymentController.getRepaymentSummary);

export default router;
