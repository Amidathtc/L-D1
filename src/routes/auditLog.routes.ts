import { Router } from "express";
import { AuditLogController } from "../controllers/auditLog.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireBranchManager } from "../middlewares/role.middleware";

const router = Router();

router.use(authenticate, requireBranchManager);

router.get("/", AuditLogController.getAuditLogs);

router.get("/:id", AuditLogController.getAuditLogById);

router.get(
  "/entity/:entityName/:entityId",
  AuditLogController.getEntityAuditTrail
);

export default router;
