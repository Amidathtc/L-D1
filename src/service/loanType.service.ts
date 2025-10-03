import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prismaClient";

interface CreateLoanTypeData {
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
}

interface UpdateLoanTypeData {
  name?: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  isActive?: boolean;
}

export class LoanTypeService {
  static async createLoanType(data: CreateLoanTypeData) {
    // Check if name already exists
    const existingLoanType = await prisma.loanType.findUnique({
      where: { name: data.name },
    });

    if (existingLoanType) {
      throw new Error("Loan type with this name already exists");
    }

    const loanType = await prisma.loanType.create({
      data: {
        name: data.name,
        description: data.description,
        minAmount: new Decimal(data.minAmount),
        maxAmount: new Decimal(data.maxAmount),
      },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    return loanType;
  }

  static async getLoanTypes(
    page = 1,
    limit = 20,
    isActive?: boolean,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [loanTypes, total] = await Promise.all([
      prisma.loanType.findMany({
        where,
        include: {
          _count: {
            select: {
              loans: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.loanType.count({ where }),
    ]);

    return { loanTypes, total, page, limit };
  }

  static async getLoanTypeById(id: string) {
    const loanType = await prisma.loanType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    if (!loanType || loanType.deletedAt) {
      throw new Error("Loan type not found");
    }

    return loanType;
  }

  static async updateLoanType(id: string, data: UpdateLoanTypeData) {
    const loanType = await prisma.loanType.findUnique({
      where: { id },
    });

    if (!loanType || loanType.deletedAt) {
      throw new Error("Loan type not found");
    }

    // Check name uniqueness if changing
    if (data.name && data.name !== loanType.name) {
      const existingLoanType = await prisma.loanType.findUnique({
        where: { name: data.name },
      });

      if (existingLoanType) {
        throw new Error("Loan type with this name already exists");
      }
    }

    // Validate min/max amounts
    const minAmount =
      data.minAmount !== undefined
        ? new Decimal(data.minAmount)
        : loanType.minAmount;
    const maxAmount =
      data.maxAmount !== undefined
        ? new Decimal(data.maxAmount)
        : loanType.maxAmount;

    if (maxAmount.lte(minAmount)) {
      throw new Error("Maximum amount must be greater than minimum amount");
    }

    const updatedLoanType = await prisma.loanType.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        minAmount:
          data.minAmount !== undefined
            ? new Decimal(data.minAmount)
            : undefined,
        maxAmount:
          data.maxAmount !== undefined
            ? new Decimal(data.maxAmount)
            : undefined,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    return updatedLoanType;
  }

  static async deleteLoanType(id: string) {
    const loanType = await prisma.loanType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    if (!loanType || loanType.deletedAt) {
      throw new Error("Loan type not found");
    }

    // Check if loan type has active loans
    const activeLoans = await prisma.loan.count({
      where: {
        loanTypeId: id,
        status: { in: ["ACTIVE", "PENDING_APPROVAL", "APPROVED"] },
        deletedAt: null,
      },
    });

    if (activeLoans > 0) {
      throw new Error(
        "Cannot delete loan type with active loans. Consider deactivating instead."
      );
    }

    // Soft delete
    await prisma.loanType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  static async toggleLoanTypeStatus(id: string) {
    const loanType = await prisma.loanType.findUnique({
      where: { id },
    });

    if (!loanType || loanType.deletedAt) {
      throw new Error("Loan type not found");
    }

    const updatedLoanType = await prisma.loanType.update({
      where: { id },
      data: {
        isActive: !loanType.isActive,
      },
    });

    return updatedLoanType;
  }
}
