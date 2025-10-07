import prisma from "../prismaClient";
import { ApiResponseUtil } from "../utils/apiResponse.util";

interface BranchTransferData {
  userId: string;
  fromBranchId?: string;
  toBranchId: string;
  reason?: string;
  effectiveDate: Date;
  createdByUserId: string;
  notes?: string;
}

interface BranchTransferFilters {
  page?: number;
  limit?: number;
  userId?: string;
  fromBranchId?: string;
  toBranchId?: string;
  status?: string;
  search?: string;
}

export class BranchTransferService {
  static async createTransfer(data: BranchTransferData) {
    try {
      // Validate user exists and is not admin
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { branch: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.role === "ADMIN") {
        throw new Error("Cannot transfer admin users");
      }

      // Validate branches
      if (data.fromBranchId) {
        const fromBranch = await prisma.branch.findUnique({
          where: { id: data.fromBranchId },
        });
        if (!fromBranch) {
          throw new Error("Source branch not found");
        }
      }

      const toBranch = await prisma.branch.findUnique({
        where: { id: data.toBranchId },
      });
      if (!toBranch) {
        throw new Error("Destination branch not found");
      }

      // Check if user is already in the destination branch
      if (user.branchId === data.toBranchId) {
        throw new Error("User is already in the destination branch");
      }

      // Create transfer record
      const transfer = await prisma.branchTransfer.create({
        data: {
          userId: data.userId,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          reason: data.reason,
          effectiveDate: data.effectiveDate,
          createdByUserId: data.createdByUserId,
          notes: data.notes,
          status: "PENDING",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              branch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return transfer;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create branch transfer");
    }
  }

  static async executeTransfer(transferId: string, executedByUserId: string) {
    try {
      const transfer = await prisma.branchTransfer.findUnique({
        where: { id: transferId },
        include: {
          user: true,
          fromBranch: true,
          toBranch: true,
        },
      });

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "PENDING") {
        throw new Error("Transfer is not pending");
      }

      // Start transaction for data migration
      const result = await prisma.$transaction(async (tx: any) => {
        // Update user's branch
        await tx.user.update({
          where: { id: transfer.userId },
          data: { branchId: transfer.toBranchId },
        });

        // Transfer customers
        const customersTransferred = await tx.customer.updateMany({
          where: { currentOfficerId: transfer.userId },
          data: { branchId: transfer.toBranchId },
        });

        // Transfer loans
        const loansTransferred = await tx.loan.updateMany({
          where: { assignedOfficerId: transfer.userId },
          data: { branchId: transfer.toBranchId },
        });

        // Note: Repayments don't have branchId field - they inherit branch from loan
        // So we don't need to update repayments directly
        const repaymentsTransferred = { count: 0 };

        // Update transfer status
        const updatedTransfer = await tx.branchTransfer.update({
          where: { id: transferId },
          data: {
            status: "COMPLETED",
            customersTransferred: customersTransferred.count,
            loansTransferred: loansTransferred.count,
            repaymentsTransferred: repaymentsTransferred.count,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            fromBranch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            toBranch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        return updatedTransfer;
      });

      return result;
    } catch (error: any) {
      throw new Error(error.message || "Failed to execute branch transfer");
    }
  }

  static async getTransfers(filters: BranchTransferFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.fromBranchId) {
        where.fromBranchId = filters.fromBranchId;
      }

      if (filters.toBranchId) {
        where.toBranchId = filters.toBranchId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where.OR = [
          {
            user: {
              email: {
                contains: filters.search,
                mode: "insensitive",
              },
            },
          },
          {
            reason: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        ];
      }

      const [transfers, total] = await Promise.all([
        prisma.branchTransfer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
            fromBranch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            toBranch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        }),
        prisma.branchTransfer.count({ where }),
      ]);

      return {
        transfers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      console.error("BranchTransferService.getTransfers error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        meta: error.meta,
        filters: filters,
      });
      throw new Error(error.message || "Failed to fetch branch transfers");
    }
  }

  static async getTransferById(id: string) {
    try {
      const transfer = await prisma.branchTransfer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      return transfer;
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch transfer");
    }
  }

  static async cancelTransfer(transferId: string, cancelledByUserId: string) {
    try {
      const transfer = await prisma.branchTransfer.findUnique({
        where: { id: transferId },
      });

      if (!transfer) {
        throw new Error("Transfer not found");
      }

      if (transfer.status !== "PENDING") {
        throw new Error("Only pending transfers can be cancelled");
      }

      const updatedTransfer = await prisma.branchTransfer.update({
        where: { id: transferId },
        data: {
          status: "CANCELLED",
          notes: transfer.notes
            ? `${transfer.notes}\n[Cancelled by user ${cancelledByUserId}]`
            : `[Cancelled by user ${cancelledByUserId}]`,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          fromBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          toBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return updatedTransfer;
    } catch (error: any) {
      throw new Error(error.message || "Failed to cancel transfer");
    }
  }
}
