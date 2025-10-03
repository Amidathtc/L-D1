import { Role } from "@prisma/client";
import prisma from "../prismaClient";

interface CreateBranchData {
  name: string;
  code: string;
  managerId?: string;
}

interface UpdateBranchData {
  name?: string;
  code?: string;
  managerId?: string | null;
}

export class BranchService {
  static async createBranch(data: CreateBranchData) {
    // Check if code already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { code: data.code },
    });

    if (existingBranch) {
      throw new Error("Branch code already exists");
    }

    // Validate manager if provided
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
      });

      if (!manager || manager.deletedAt) {
        throw new Error("Manager not found");
      }

      if (manager.role !== Role.BRANCH_MANAGER && manager.role !== Role.ADMIN) {
        throw new Error(
          "User must be a Branch Manager or Admin to manage a branch"
        );
      }

      // Check if manager is already managing another branch
      const existingManagement = await prisma.branch.findFirst({
        where: {
          managerId: data.managerId,
          deletedAt: null,
        },
      });

      if (existingManagement) {
        throw new Error("Manager is already assigned to another branch");
      }
    }

    const branch = await prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        managerId: data.managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            loans: true,
          },
        },
      },
    });

    return branch;
  }

  static async getBranches(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              users: true,
              customers: true,
              loans: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.branch.count({ where }),
    ]);

    return { branches, total, page, limit };
  }

  static async getBranchById(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            customers: true,
            loans: true,
          },
        },
      },
    });

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    return branch;
  }

  static async updateBranch(id: string, data: UpdateBranchData) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== branch.code) {
      const existingBranch = await prisma.branch.findUnique({
        where: { code: data.code },
      });

      if (existingBranch) {
        throw new Error("Branch code already exists");
      }
    }

    // Validate manager if changing
    if (data.managerId !== undefined) {
      if (data.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: data.managerId },
        });

        if (!manager || manager.deletedAt) {
          throw new Error("Manager not found");
        }

        if (
          manager.role !== Role.BRANCH_MANAGER &&
          manager.role !== Role.ADMIN
        ) {
          throw new Error("User must be a Branch Manager or Admin");
        }

        // Check if manager is already managing another branch
        const existingManagement = await prisma.branch.findFirst({
          where: {
            managerId: data.managerId,
            deletedAt: null,
            id: { not: id },
          },
        });

        if (existingManagement) {
          throw new Error("Manager is already assigned to another branch");
        }
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        managerId: data.managerId,
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            customers: true,
            loans: true,
          },
        },
      },
    });

    return updatedBranch;
  }

  static async deleteBranch(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            loans: true,
          },
        },
      },
    });

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    // Check if branch has active loans
    const activeLoans = await prisma.loan.count({
      where: {
        branchId: id,
        status: {
          in: ["ACTIVE", "PENDING_APPROVAL", "APPROVED"],
        },
        deletedAt: null,
      },
    });

    if (activeLoans > 0) {
      throw new Error("Cannot delete branch with active loans");
    }

    // Soft delete
    await prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async getBranchStats(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    const [
      totalCustomers,
      totalLoans,
      activeLoans,
      totalDisbursed,
      totalRepaid,
    ] = await Promise.all([
      prisma.customer.count({
        where: { branchId: id, deletedAt: null },
      }),
      prisma.loan.count({
        where: { branchId: id, deletedAt: null },
      }),
      prisma.loan.count({
        where: {
          branchId: id,
          status: "ACTIVE",
          deletedAt: null,
        },
      }),
      prisma.loan.aggregate({
        where: {
          branchId: id,
          status: { in: ["ACTIVE", "COMPLETED"] },
          deletedAt: null,
        },
        _sum: { principalAmount: true },
      }),
      prisma.repayment.aggregate({
        where: {
          loan: { branchId: id },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      branchId: id,
      branchName: branch.name,
      totalCustomers,
      totalLoans,
      activeLoans,
      totalDisbursed: totalDisbursed._sum.principalAmount || 0,
      totalRepaid: totalRepaid._sum.amount || 0,
    };
  }
}
