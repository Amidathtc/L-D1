import { Request, Response, NextFunction } from "express";
import { DocumentService } from "../service/document.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";
import { uploadDocument, handleDocumentUpload } from "../utils/upload.helper";
import { CloudinaryService } from "../utils/cloudinary.service";
import * as path from "path";
import * as fs from "fs";

// Export the updated upload middleware
export const upload = uploadDocument;

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

  static async createDocumentType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return ApiResponseUtil.error(res, "Name is required", 400);
      }

      const documentType = await DocumentService.createDocumentType({
        name,
        description,
      });

      return ApiResponseUtil.success(
        res,
        documentType,
        "Document type created successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async updateDocumentType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { name, code, description, isActive } = req.body;

      if (!id) {
        return ApiResponseUtil.error(res, "Document type ID is required", 400);
      }

      const documentType = await DocumentService.updateDocumentType(id, {
        name,
        code,
        description,
        isActive,
      });

      return ApiResponseUtil.success(
        res,
        documentType,
        "Document type updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteDocumentType(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Document type ID is required", 400);
      }

      await DocumentService.deleteDocumentType(id);

      return ApiResponseUtil.success(
        res,
        null,
        "Document type deleted successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async uploadUnionMemberDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        return ApiResponseUtil.error(res, "No file uploaded", 400);
      }

      const { unionMemberId } = req.params;
      const { documentTypeId, issuingAuthority, issueDate, expiryDate } =
        req.body;

      if (!unionMemberId) {
        return ApiResponseUtil.error(res, "Union Member ID is required", 400);
      }

      // Upload to Cloudinary or local storage
      const uploadResult = await handleDocumentUpload(
        req.file,
        `documents/union-members/${unionMemberId}`
      );

      const metadata: {
        issuingAuthority?: string;
        issueDate?: Date;
        expiryDate?: Date;
        provider?: "cloudinary" | "local";
        publicId?: string;
      } = {
        provider: uploadResult.provider,
      };

      if (uploadResult.publicId) {
        metadata.publicId = uploadResult.publicId;
      }

      if (issuingAuthority) metadata.issuingAuthority = issuingAuthority;
      if (issueDate) metadata.issueDate = new Date(issueDate);
      if (expiryDate) metadata.expiryDate = new Date(expiryDate);

      const document = await DocumentService.uploadUnionMemberDocument(
        unionMemberId,
        documentTypeId,
        uploadResult.url,
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

  static async getUnionMemberDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { unionMemberId } = req.params;

      if (!unionMemberId) {
        return ApiResponseUtil.error(res, "Union Member ID is required", 400);
      }

      const documents = await DocumentService.getUnionMemberDocuments(
        unionMemberId
      );

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

      // Upload to Cloudinary or local storage
      const uploadResult = await handleDocumentUpload(
        req.file,
        `documents/loans/${loanId}`
      );

      const metadata: {
        issuingAuthority?: string;
        issueDate?: Date;
        expiryDate?: Date;
        provider?: "cloudinary" | "local";
        publicId?: string;
      } = {
        provider: uploadResult.provider,
      };

      if (uploadResult.publicId) {
        metadata.publicId = uploadResult.publicId;
      }

      if (issuingAuthority) metadata.issuingAuthority = issuingAuthority;
      if (issueDate) metadata.issueDate = new Date(issueDate);
      if (expiryDate) metadata.expiryDate = new Date(expiryDate);

      const document = await DocumentService.uploadLoanDocument(
        loanId,
        documentTypeId,
        uploadResult.url,
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

      if (type !== "unionMember" && type !== "loan") {
        return ApiResponseUtil.error(
          res,
          "Invalid document type. Use 'unionMember' or 'loan'",
          400
        );
      }

      await DocumentService.deleteDocument(id, type as "unionMember" | "loan");

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

      if (type !== "unionMember" && type !== "loan") {
        return ApiResponseUtil.error(
          res,
          "Invalid document type. Use 'unionMember' or 'loan'",
          400
        );
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

  static async uploadGuarantorDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.file) {
        return ApiResponseUtil.error(res, "No file uploaded", 400);
      }

      const { loanId, guarantorId } = req.params;
      const { documentTypeId, issuingAuthority, issueDate, expiryDate } =
        req.body;

      if (!loanId) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      if (!guarantorId) {
        return ApiResponseUtil.error(res, "Guarantor ID is required", 400);
      }

      // Upload to Cloudinary or local storage
      const uploadResult = await handleDocumentUpload(
        req.file,
        `documents/guarantors/${loanId}/${guarantorId}`
      );

      const metadata: {
        issuingAuthority?: string;
        issueDate?: Date;
        expiryDate?: Date;
        provider?: "cloudinary" | "local";
        publicId?: string;
      } = {
        provider: uploadResult.provider,
      };

      if (uploadResult.publicId) {
        metadata.publicId = uploadResult.publicId;
      }

      if (issuingAuthority) metadata.issuingAuthority = issuingAuthority;
      if (issueDate) metadata.issueDate = new Date(issueDate);
      if (expiryDate) metadata.expiryDate = new Date(expiryDate);

      const document = await DocumentService.uploadGuarantorDocument(
        loanId,
        guarantorId,
        documentTypeId,
        uploadResult.url,
        req.user!.id,
        metadata
      );

      return ApiResponseUtil.success(
        res,
        document,
        "Guarantor document uploaded successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getGuarantorDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { loanId, guarantorId } = req.params;

      if (!loanId) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      if (!guarantorId) {
        return ApiResponseUtil.error(res, "Guarantor ID is required", 400);
      }

      const documents = await DocumentService.getGuarantorDocuments(
        loanId,
        guarantorId
      );

      return ApiResponseUtil.success(res, documents);
    } catch (error: any) {
      next(error);
    }
  }

  static async serveDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { documentId } = req.params;

      if (!documentId) {
        return ApiResponseUtil.error(res, "Document ID is required", 400);
      }

      // Get document from database
      const document = await DocumentService.getDocumentById(documentId);

      if (!document) {
        return ApiResponseUtil.error(res, "Document not found", 404);
      }

      const fileUrl = document.fileUrl;
      console.log(`Serving document: ${documentId}, URL: ${fileUrl}`);

      // Check if it's a Cloudinary URL
      if (
        fileUrl.includes("cloudinary.com") ||
        fileUrl.startsWith("https://")
      ) {
        // For Cloudinary URLs, redirect to the secure URL
        // The frontend can handle displaying it
        return ApiResponseUtil.success(res, {
          url: fileUrl,
          type: "remote",
          provider: "cloudinary",
        });
      }

      // Local file serving
      let filePath = fileUrl;

      // Log for debugging
      console.log(`Attempting to serve local document: ${documentId}`);
      console.log(`Stored path: ${filePath}`);
      console.log(`File exists at stored path: ${fs.existsSync(filePath)}`);

      if (!fs.existsSync(filePath)) {
        // Try with process.cwd() prefix if not already there
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), filePath);
        console.log(`Trying absolute path: ${absolutePath}`);
        console.log(
          `File exists at absolute path: ${fs.existsSync(absolutePath)}`
        );

        if (fs.existsSync(absolutePath)) {
          filePath = absolutePath;
        } else {
          console.error(
            `Document file not found - Document ID: ${documentId}, Original path: ${filePath}`
          );
          return ApiResponseUtil.error(
            res,
            "Document file not found. The file may have been deleted or the storage was cleared.",
            404
          );
        }
      }

      // Set appropriate headers
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();

      let contentType = "application/octet-stream";
      if (ext === ".pdf") contentType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".doc") contentType = "application/msword";
      else if (ext === ".docx")
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.on("error", (error: any) => {
        console.error(`Error reading file: ${error.message}`);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ success: false, message: "Error reading file" });
        }
      });
      fileStream.pipe(res);
    } catch (error: any) {
      next(error);
    }
  }
}
