import { Router } from "express";
import { DocumentController, upload } from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  requireBranchManager,
  requireRole,
  requireStaff,
} from "../middlewares/role.middleware";
import { auditLog } from "../middlewares/audit.middleware";
import { Role } from "@prisma/client";

const router = Router();

router.use(authenticate);

// Document types routes
router.get("/types", requireStaff, DocumentController.getDocumentTypes);
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
  requireStaff,
  upload.single("file"),
  auditLog("CUSTOMER_DOCUMENT_UPLOADED", "CustomerDocument"),
  DocumentController.uploadCustomerDocument
);

router.get(
  "/customer/:customerId",
  requireStaff,
  DocumentController.getCustomerDocuments
);

// Document serving route
router.get(
  "/serve/:documentId",
  requireStaff,
  DocumentController.serveDocument
);

router.post(
  "/loan/:loanId",
  requireStaff,
  upload.single("file"),
  auditLog("LOAN_DOCUMENT_UPLOADED", "LoanDocument"),
  DocumentController.uploadLoanDocument
);

router.get("/loan/:loanId", requireStaff, DocumentController.getLoanDocuments);

// Guarantor document routes
router.post(
  "/loan/:loanId/guarantor/:guarantorId",
  requireStaff,
  upload.single("file"),
  auditLog("GUARANTOR_DOCUMENT_UPLOADED", "LoanDocument"),
  DocumentController.uploadGuarantorDocument
);

router.get(
  "/loan/:loanId/guarantor/:guarantorId",
  requireStaff,
  DocumentController.getGuarantorDocuments
);

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
