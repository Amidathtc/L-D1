import { Role } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import prisma from "../prismaClient";

export class DocumentService {
  static async getDocumentTypes() {
    const documentTypes = await prisma.documentType.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return documentTypes;
  }

  static async uploadCustomerDocument(
    customerId: string,
    documentTypeId: string,
    fileUrl: string,
    uploadedByUserId: string,
    metadata?: {
      issuingAuthority?: string;
      issueDate?: Date;
      expiryDate?: Date;
    }
  ) {
    // Validate customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Validate document type
    const documentType = await prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType || documentType.deletedAt || !documentType.isActive) {
      throw new Error("Document type not found or inactive");
    }

    const document = await prisma.customerDocument.create({
      data: {
        customerId,
        documentTypeId,
        fileUrl,
        uploadedByUserId,
        issuingAuthority: metadata?.issuingAuthority,
        issueDate: metadata?.issueDate,
        expiryDate: metadata?.expiryDate,
      },
      include: {
        documentType: true,
        uploadedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  static async uploadLoanDocument(
    loanId: string,
    documentTypeId: string,
    fileUrl: string,
    uploadedByUserId: string,
    metadata?: {
      issuingAuthority?: string;
      issueDate?: Date;
      expiryDate?: Date;
    }
  ) {
    // Validate loan
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Validate document type
    const documentType = await prisma.documentType.findUnique({
      where: { id: documentTypeId },
    });

    if (!documentType || documentType.deletedAt || !documentType.isActive) {
      throw new Error("Document type not found or inactive");
    }

    const document = await prisma.loanDocument.create({
      data: {
        loanId,
        documentTypeId,
        fileUrl,
        uploadedByUserId,
        issuingAuthority: metadata?.issuingAuthority,
        issueDate: metadata?.issueDate,
        expiryDate: metadata?.expiryDate,
      },
      include: {
        documentType: true,
        uploadedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return document;
  }

  static async getCustomerDocuments(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    const documents = await prisma.customerDocument.findMany({
      where: {
        customerId,
        deletedAt: null,
      },
      include: {
        documentType: true,
        uploadedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return documents;
  }

  static async getLoanDocuments(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    const documents = await prisma.loanDocument.findMany({
      where: {
        loanId,
        deletedAt: null,
      },
      include: {
        documentType: true,
        uploadedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return documents;
  }

  static async deleteDocument(id: string, type: "customer" | "loan") {
    if (type === "customer") {
      const document = await prisma.customerDocument.findUnique({
        where: { id },
      });

      if (!document || document.deletedAt) {
        throw new Error("Document not found");
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), document.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error("Error deleting file:", error);
      }

      await prisma.customerDocument.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } else {
      const document = await prisma.loanDocument.findUnique({
        where: { id },
      });

      if (!document || document.deletedAt) {
        throw new Error("Document not found");
      }

      // Delete file from filesystem
      try {
        const filePath = path.join(process.cwd(), document.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error("Error deleting file:", error);
      }

      await prisma.loanDocument.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }
  }

  static async verifyDocument(
    id: string,
    type: "customer" | "loan",
    verified: boolean,
    verificationNotes?: string
  ) {
    if (type === "customer") {
      const document = await prisma.customerDocument.update({
        where: { id },
        data: {
          verified,
          verificationNotes,
        },
        include: {
          documentType: true,
          customer: true,
        },
      });

      return document;
    } else {
      const document = await prisma.loanDocument.update({
        where: { id },
        data: {
          verified,
          verificationNotes,
        },
        include: {
          documentType: true,
          loan: true,
        },
      });

      return document;
    }
  }
}
