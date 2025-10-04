import { Router } from "express";
import { DocumentController, upload } from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireBranchManager,
  requireRole,
} from "../middlewares/role.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Document types routes
router.get("/types", DocumentController.getDocumentTypes);
router.post(
  "/types",
  requireRole(Role.ADMIN),
  DocumentController.createDocumentType
);
router.put(
  "/types/:id",
  requireRole(Role.ADMIN),
  DocumentController.updateDocumentType
);
router.delete(
  "/types/:id",
  requireRole(Role.ADMIN),
  DocumentController.deleteDocumentType
);

router.post(
  "/customer/:customerId",
  upload.single("file"),
  auditLog("CUSTOMER_DOCUMENT_UPLOADED", "CustomerDocument"),
  DocumentController.uploadCustomerDocument
);

router.get("/customer/:customerId", DocumentController.getCustomerDocuments);

router.post(
  "/loan/:loanId",
  upload.single("file"),
  auditLog("LOAN_DOCUMENT_UPLOADED", "LoanDocument"),
  DocumentController.uploadLoanDocument
);

router.get("/loan/:loanId", DocumentController.getLoanDocuments);

router.put(
  "/:id/verify",
  requireBranchManager,
  auditLog("DOCUMENT_VERIFIED", "Document"),
  DocumentController.verifyDocument
);

router.delete(
  "/:id",
  requireBranchManager,
  auditLog("DOCUMENT_DELETED", "Document"),
  DocumentController.deleteDocument
);

export default router;
