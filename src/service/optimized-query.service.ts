import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../prismaClient";

// Optimized query builder for common operations
export class OptimizedQueryService {
  // Optimized user queries with proper includes
  static async getUsersWithRelations(filters: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, isActive, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(role && { role: role as any }),
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
          supervisor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
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

  // Optimized union member queries with proper includes
  static async getUnionMembersWithRelations(filters: {
    page?: number;
    limit?: number;
    unionId?: string;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      unionId,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(unionId && { unionId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [unionMembers, total] = await Promise.all([
      prisma.unionMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          union: {
            select: {
              id: true,
              name: true,
              location: true,
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
      prisma.unionMember.count({ where }),
    ]);

    return {
      unionMembers,
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
    unionId?: string;
    unionMemberId?: string;
    search?: string;
  }) {
    const {
      page = 1,
      limit = 10,
      status,
      unionId,
      unionMemberId,
      search,
    } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(status && status !== "OVERDUE" && { status: status as any }),
      ...(status === "OVERDUE" && {
        AND: [
          { status: { not: "COMPLETED" } },
          {
            OR: [
              {
                scheduleItems: {
                  some: {
                    AND: [
                      { dueDate: { lt: new Date() } },
                      { status: { not: "PAID" } },
                    ],
                  },
                },
              },
            ],
          },
        ],
      }),
      ...(unionId && { unionId }),
      ...(unionMemberId && { unionMemberId }),
      ...(search && {
        OR: [
          { loanNumber: { contains: search, mode: "insensitive" } },
          {
            unionMember: {
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
          unionMember: {
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
          union: {
            select: {
              id: true,
              name: true,
              location: true,
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

  // Optimized union queries with statistics
  static async getUnionsWithStats(filters: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [unions, total] = await Promise.all([
      prisma.union.findMany({
        where,
        skip,
        take: limit,
        include: {
          creditOfficer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              unionMembers: true,
              loans: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.union.count({ where }),
    ]);

    return {
      unions,
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
      totalUnionMembers,
      totalLoans,
      totalUnions,
      activeLoans,
      overdueLoans,
      totalLoanAmount,
      totalRepaidAmount,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.unionMember.count({ where: { deletedAt: null } }),
      prisma.loan.count({ where: { deletedAt: null } }),
      prisma.union.count({ where: { deletedAt: null } }),
      prisma.loan.count({
        where: {
          deletedAt: null,
          status: "ACTIVE",
        },
      }),
      prisma.loan.count({
        where: {
          deletedAt: null,
          status: { in: ["DEFAULTED", "WRITTEN_OFF"] },
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
      totalUnionMembers,
      totalLoans,
      totalUnions,
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
          actor: {
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
              unionMember: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          receivedBy: {
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
