import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import {
  createCustomerSchema,
  updateCustomerSchema,
  reassignCustomerSchema,
} from "../validators/customer.validator";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  validate(createCustomerSchema),
  auditLog("CUSTOMER_CREATED", "Customer"),
  CustomerController.createCustomer
);

router.get("/", CustomerController.getCustomers);

router.get("/:id", CustomerController.getCustomerById);

router.get("/:id/loans", CustomerController.getCustomerLoans);

router.put(
  "/:id",
  validate(updateCustomerSchema),
  auditLog("CUSTOMER_UPDATED", "Customer"),
  CustomerController.updateCustomer
);

router.post(
  "/:id/reassign",
  validate(reassignCustomerSchema),
  auditLog("CUSTOMER_REASSIGNED", "Customer"),
  CustomerController.reassignCustomer
);

router.delete(
  "/:id",
  auditLog("CUSTOMER_DELETED", "Customer"),
  CustomerController.deleteCustomer
);

export default router;
