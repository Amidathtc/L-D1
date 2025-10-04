import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../prismaClient";

// Optimized query builder for common operations
export class OptimizedQueryService {
  // Optimized user queries with proper includes
  static async getUsersWithBranch(filters: {
    page?: number;
    limit?: number;
    role?: string;
    branchId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, branchId, isActive, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(role && { role: role as any }),
      ...(branchId && { branchId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [{ email: { contains: search, mode: "insensitive" } }],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Optimized customer queries with proper includes
  static async getCustomersWithRelations(filters: {
    page?: number;
    limit?: number;
    branchId?: string;
    currentOfficerId?: string;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      branchId,
      currentOfficerId,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(branchId && { branchId }),
      ...(currentOfficerId && { currentOfficerId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          currentOfficer: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              loans: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Optimized loan queries with proper includes
  static async getLoansWithRelations(filters: {
    page?: number;
    limit?: number;
    status?: string;
    branchId?: string;
    assignedOfficerId?: string;
    customerId?: string;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      branchId,
      assignedOfficerId,
      customerId,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(status && { status: status as any }),
      ...(branchId && { branchId }),
      ...(assignedOfficerId && { assignedOfficerId }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { loanNumber: { contains: search, mode: "insensitive" } },
          {
            customer: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          { loanType: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          loanType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          assignedOfficer: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              repayments: true,
              scheduleItems: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.loan.count({ where }),
    ]);

    return {
      loans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Optimized branch queries with statistics
  static async getBranchesWithStats(filters: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, isActive, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { code: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.branch.count({ where }),
    ]);

    return {
      branches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Optimized dashboard statistics
  static async getDashboardStats() {
    const [
      totalUsers,
      totalCustomers,
      totalLoans,
      totalBranches,
      activeLoans,
      overdueLoans,
      totalLoanAmount,
      totalRepaidAmount,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.loan.count({ where: { deletedAt: null } }),
      prisma.branch.count({ where: { deletedAt: null } }),
      prisma.loan.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
        },
      }),
      prisma.loan.count({
        where: {
          deletedAt: null,
          status: { in: ["OVERDUE", "DEFAULTED"] },
        },
      }),
      prisma.loan.aggregate({
        where: { deletedAt: null },
        _sum: { principalAmount: true },
      }),
      prisma.repayment.aggregate({
        where: { deletedAt: null },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      totalCustomers,
      totalLoans,
      totalBranches,
      activeLoans,
      overdueLoans,
      totalLoanAmount: totalLoanAmount._sum.principalAmount || 0,
      totalRepaidAmount: totalRepaidAmount._sum.amount || 0,
    };
  }

  // Optimized audit log queries
  static async getAuditLogs(filters: {
    page?: number;
    limit?: number;
    entityName?: string;
    entityId?: string;
    actorUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      page = 1,
      limit = 10,
      entityName,
      entityId,
      actorUserId,
      startDate,
      endDate,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      ...(entityName && { entityName }),
      ...(entityId && { entityId }),
      ...(actorUserId && { actorUserId }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actorUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Optimized repayment queries
  static async getRepaymentsWithRelations(filters: {
    page?: number;
    limit?: number;
    loanId?: string;
    method?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const {
      page = 1,
      limit = 10,
      loanId,
      method,
      startDate,
      endDate,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(loanId && { loanId }),
      ...(method && { method: method as any }),
      ...(startDate &&
        endDate && {
          paidAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    const [repayments, total] = await Promise.all([
      prisma.repayment.findMany({
        where,
        skip,
        take: limit,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              principalAmount: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          receivedByUser: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.repayment.count({ where }),
    ]);

    return {
      repayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
