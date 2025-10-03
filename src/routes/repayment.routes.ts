import { Router } from "express";
import { RepaymentController } from "../controllers/repayment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBranchManager } from "../middlewares/role.middleware";
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
  validate(createRepaymentSchema),
  auditLog("REPAYMENT_CREATED", "Repayment"),
  RepaymentController.createRepayment
);

router.get("/", RepaymentController.getRepayments);

router.get("/:id", RepaymentController.getRepaymentById);

router.put(
  "/:id",
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

export default router;
