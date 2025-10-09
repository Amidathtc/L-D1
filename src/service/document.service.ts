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

  static async createDocumentType(data: {
    name: string;
    description?: string;
  }) {
    // Generate a unique code based on the name
    const generateCode = (name: string): string => {
      // Convert name to uppercase, remove spaces and special characters
      const baseCode = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 8); // Limit to 8 characters

      return baseCode;
    };

    let code = generateCode(data.name);
    let counter = 1;
    let finalCode = code;

    // Check if code already exists and generate unique one
    while (true) {
      const existingType = await prisma.documentType.findFirst({
        where: {
          code: finalCode,
          deletedAt: null,
        },
      });

      if (!existingType) {
        break;
      }

      // If code exists, append a number
      finalCode = `${code}${counter.toString().padStart(2, "0")}`;
      counter++;
    }

    // Check if document type with same name already exists
    const existingName = await prisma.documentType.findFirst({
      where: {
        name: data.name,
        deletedAt: null,
      },
    });

    if (existingName) {
      throw new Error("Document type with this name already exists");
    }

    const documentType = await prisma.documentType.create({
      data: {
        name: data.name,
        code: finalCode,
        description: data.description,
        isActive: true,
      },
    });

    return documentType;
  }

  static async updateDocumentType(
    id: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const existingType = await prisma.documentType.findUnique({
      where: { id },
    });

    if (!existingType || existingType.deletedAt) {
      throw new Error("Document type not found");
    }

    // Check for conflicts if name or code is being updated
    if (data.name || data.code) {
      const conflictType = await prisma.documentType.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.name ? [{ name: data.name }] : []),
                ...(data.code ? [{ code: data.code }] : []),
              ],
            },
          ],
          deletedAt: null,
        },
      });

      if (conflictType) {
        throw new Error("Document type with this name or code already exists");
      }
    }

    const updatedType = await prisma.documentType.update({
      where: { id },
      data,
    });

    return updatedType;
  }

  static async deleteDocumentType(id: string) {
    const existingType = await prisma.documentType.findUnique({
      where: { id },
    });

    if (!existingType || existingType.deletedAt) {
      throw new Error("Document type not found");
    }

    // Check if document type is being used by any documents
    const customerDocsCount = await prisma.customerDocument.count({
      where: {
        documentTypeId: id,
        deletedAt: null,
      },
    });

    const loanDocsCount = await prisma.loanDocument.count({
      where: {
        documentTypeId: id,
        deletedAt: null,
      },
    });

    if (customerDocsCount > 0 || loanDocsCount > 0) {
      throw new Error(
        "Cannot delete document type that is being used by existing documents"
      );
    }

    // Soft delete
    const deletedType = await prisma.documentType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return deletedType;
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

  static async uploadGuarantorDocument(
    loanId: string,
    guarantorId: string,
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

    // For now, we'll store guarantor documents as loan documents with a special identifier
    // In a more complex system, you might have a separate GuarantorDocument model
    const document = await prisma.loanDocument.create({
      data: {
        loanId,
        documentTypeId,
        fileUrl,
        uploadedByUserId,
        issuingAuthority: metadata?.issuingAuthority,
        issueDate: metadata?.issueDate,
        expiryDate: metadata?.expiryDate,
        // Store guarantor ID in verification notes for now
        verificationNotes: `GUARANTOR_ID:${guarantorId}`,
      },
      include: {
        documentType: true,
        loan: true,
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

  static async getGuarantorDocuments(loanId: string, guarantorId: string) {
    const documents = await prisma.loanDocument.findMany({
      where: {
        loanId,
        verificationNotes: {
          startsWith: `GUARANTOR_ID:${guarantorId}`,
        },
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
}
