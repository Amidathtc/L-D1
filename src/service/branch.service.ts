import { Role } from "@prisma/client";
import prisma from "../prismaClient";

interface CreateBranchData {
  name: string;
  managerId?: string;
}

interface UpdateBranchData {
  name?: string;
  code?: string;
  managerId?: string | null;
  isActive?: boolean;
}

export class BranchService {
  static async createBranch(data: CreateBranchData) {
    // Generate unique branch code
    const code = await this.generateBranchCode();

    // Validate manager if provided
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: {
          id: true,
          email: true,
          role: true,
          deletedAt: true,
          isActive: true,
        },
      });

      if (!manager) {
        throw new Error(`Manager with ID ${data.managerId} not found`);
      }

      if (manager.deletedAt) {
        throw new Error("Manager account has been deleted");
      }

      if (!manager.isActive) {
        throw new Error("Manager account is inactive");
      }

      if (manager.role !== Role.BRANCH_MANAGER && manager.role !== Role.ADMIN) {
        throw new Error(
          `User ${manager.email} must be a Branch Manager or Admin to manage a branch. Current role: ${manager.role}`
        );
      }

      // Check if manager is already managing another branch
      const existingManagement = await prisma.branch.findFirst({
        where: {
          managerId: data.managerId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      if (existingManagement) {
        throw new Error(
          `Manager ${manager.email} is already assigned to branch ${existingManagement.name} (${existingManagement.code})`
        );
      }
    }

    try {
      const branch = await prisma.branch.create({
        data: {
          name: data.name,
          code: code,
          managerId: data.managerId || null, // Explicitly set to null if not provided
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
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new Error(
          `Foreign key constraint violation: The manager ID ${data.managerId} does not exist or is invalid`
        );
      }
      throw error;
    }
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
          select: {
            id: true,
            email: true,
            role: true,
            deletedAt: true,
            isActive: true,
          },
        });

        if (!manager) {
          throw new Error(`Manager with ID ${data.managerId} not found`);
        }

        if (manager.deletedAt) {
          throw new Error("Manager account has been deleted");
        }

        if (!manager.isActive) {
          throw new Error("Manager account is inactive");
        }

        if (
          manager.role !== Role.BRANCH_MANAGER &&
          manager.role !== Role.ADMIN
        ) {
          throw new Error(
            `User ${manager.email} must be a Branch Manager or Admin. Current role: ${manager.role}`
          );
        }

        // Check if manager is already managing another branch
        const existingManagement = await prisma.branch.findFirst({
          where: {
            managerId: data.managerId,
            deletedAt: null,
            id: { not: id },
          },
          select: {
            id: true,
            name: true,
            code: true,
          },
        });

        if (existingManagement) {
          throw new Error(
            `Manager ${manager.email} is already assigned to branch ${existingManagement.name} (${existingManagement.code})`
          );
        }
      }
    }

    try {
      const updatedBranch = await prisma.branch.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code,
          managerId: data.managerId || null, // Explicitly set to null if not provided
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
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new Error(
          `Foreign key constraint violation: The manager ID ${data.managerId} does not exist or is invalid`
        );
      }
      throw error;
    }
  }

  static async toggleBranchStatus(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, email: true, isActive: true },
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

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    const newStatus = !branch.isActive;

    // If disabling branch, also disable all users in that branch
    if (!newStatus && branch.users.length > 0) {
      await prisma.user.updateMany({
        where: {
          branchId: id,
          deletedAt: null,
        },
        data: {
          isActive: false,
        },
      });
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        isActive: newStatus,
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

  // Generate unique branch code
  private static async generateBranchCode(): Promise<string> {
    let code: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate code based on current count + 1
      const branchCount = await prisma.branch.count({
        where: { deletedAt: null },
      });

      const nextNumber = branchCount + 1;
      code = `BR${nextNumber.toString().padStart(3, "0")}`;

      // Check if code already exists
      const existingBranch = await prisma.branch.findUnique({
        where: { code },
      });

      isUnique = !existingBranch;
      attempts++;

      if (!isUnique && attempts < maxAttempts) {
        // If code exists, try with timestamp suffix
        const timestamp = Date.now().toString().slice(-3);
        code = `BR${nextNumber.toString().padStart(2, "0")}${timestamp}`;

        const existingBranchWithTimestamp = await prisma.branch.findUnique({
          where: { code },
        });

        isUnique = !existingBranchWithTimestamp;
      }
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error("Unable to generate unique branch code");
    }

    return code;
  }
}
