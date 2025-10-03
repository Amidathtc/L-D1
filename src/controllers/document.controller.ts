import { Request, Response, NextFunction } from "express";
import { DocumentService } from "../service/document.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = req.path.includes("customer")
      ? "uploads/customer-documents"
      : "uploads/loan-documents";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images, PDFs, and Word documents are allowed!"));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

export class DocumentController {
  static async getDocumentTypes(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const documentTypes = await DocumentService.getDocumentTypes();

      return ApiResponseUtil.success(res, documentTypes);
    } catch (error: any) {
      next(error);
    }
  }

  static async uploadCustomerDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        return ApiResponseUtil.error(res, "No file uploaded", 400);
      }

      const { customerId } = req.params;
      const { documentTypeId, issuingAuthority, issueDate, expiryDate } =
        req.body;

      if (!customerId) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const fileUrl = req.file.path;

      const metadata: {
        issuingAuthority?: string;
        issueDate?: Date;
        expiryDate?: Date;
      } = {};

      if (issuingAuthority) metadata.issuingAuthority = issuingAuthority;
      if (issueDate) metadata.issueDate = new Date(issueDate);
      if (expiryDate) metadata.expiryDate = new Date(expiryDate);

      const document = await DocumentService.uploadCustomerDocument(
        customerId,
        documentTypeId,
        fileUrl,
        req.user!.id,
        metadata
      );

      return ApiResponseUtil.success(
        res,
        document,
        "Document uploaded successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getCustomerDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return ApiResponseUtil.error(res, "Customer ID is required", 400);
      }

      const documents = await DocumentService.getCustomerDocuments(customerId);

      return ApiResponseUtil.success(res, documents);
    } catch (error: any) {
      next(error);
    }
  }

  static async uploadLoanDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        return ApiResponseUtil.error(res, "No file uploaded", 400);
      }

      const { loanId } = req.params;
      const { documentTypeId, issuingAuthority, issueDate, expiryDate } =
        req.body;

      if (!loanId) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const fileUrl = req.file.path;

      const metadata: {
        issuingAuthority?: string;
        issueDate?: Date;
        expiryDate?: Date;
      } = {};

      if (issuingAuthority) metadata.issuingAuthority = issuingAuthority;
      if (issueDate) metadata.issueDate = new Date(issueDate);
      if (expiryDate) metadata.expiryDate = new Date(expiryDate);

      const document = await DocumentService.uploadLoanDocument(
        loanId,
        documentTypeId,
        fileUrl,
        req.user!.id,
        metadata
      );

      return ApiResponseUtil.success(
        res,
        document,
        "Document uploaded successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { loanId } = req.params;

      if (!loanId) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const documents = await DocumentService.getLoanDocuments(loanId);

      return ApiResponseUtil.success(res, documents);
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { type } = req.query;

      if (!id) {
        return ApiResponseUtil.error(res, "Document ID is required", 400);
      }

      if (type !== "customer" && type !== "loan") {
        return ApiResponseUtil.error(res, "Invalid document type", 400);
      }

      await DocumentService.deleteDocument(id, type as "customer" | "loan");

      return ApiResponseUtil.success(
        res,
        null,
        "Document deleted successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { type, verified, verificationNotes } = req.body;

      if (!id) {
        return ApiResponseUtil.error(res, "Document ID is required", 400);
      }

      if (type !== "customer" && type !== "loan") {
        return ApiResponseUtil.error(res, "Invalid document type", 400);
      }

      const document = await DocumentService.verifyDocument(
        id,
        type,
        verified,
        verificationNotes
      );

      return ApiResponseUtil.success(
        res,
        document,
        "Document verification updated"
      );
    } catch (error: any) {
      next(error);
    }
  }
}
