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

const router = Router();

router.use(authenticate);

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

export default router;
