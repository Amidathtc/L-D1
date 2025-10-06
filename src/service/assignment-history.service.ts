import prisma from "../prismaClient";
import { Role } from "@prisma/client";

export interface AssignmentHistoryEntry {
  id: string;
  type: "USER_ASSIGNMENT" | "MANAGER_ASSIGNMENT";
  userId?: string;
  branchId?: string;
  oldBranchId?: string;
  newBranchId?: string;
  oldManagerId?: string;
  newManagerId?: string;
  changedByUserId: string;
  reason?: string;
  timestamp: string;
  userEmail?: string;
  branchName?: string;
  oldBranchName?: string;
  newBranchName?: string;
  oldManagerEmail?: string;
  newManagerEmail?: string;
  changedByEmail?: string;
}

export class AssignmentHistoryService {
  static async getAssignmentHistory(
    filters: {
      page?: number;
      limit?: number;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    },
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    try {
      // Get loan assignment history
      const loanHistoryWhere: any = {};

      // Role-based filtering for loan assignments
      if (userRole === Role.BRANCH_MANAGER && userBranchId) {
        loanHistoryWhere.loan = {
          branchId: userBranchId,
          deletedAt: null,
        };
      } else if (userRole === Role.CREDIT_OFFICER) {
        loanHistoryWhere.loan = {
          OR: [{ assignedOfficerId: userId }, { createdByUserId: userId }],
          deletedAt: null,
        };
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        loanHistoryWhere.changedAt = {};
        if (filters.dateFrom) {
          loanHistoryWhere.changedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          loanHistoryWhere.changedAt.lte = new Date(filters.dateTo);
        }
      }

      const [loanHistory, loanCount] = await Promise.all([
        prisma.loanAssignmentHistory.findMany({
          where: loanHistoryWhere,
          include: {
            loan: {
              select: {
                id: true,
                loanNumber: true,
              },
            },
            oldOfficer: {
              select: {
                id: true,
                email: true,
              },
            },
            newOfficer: {
              select: {
                id: true,
                email: true,
              },
            },
            oldBranch: {
              select: {
                id: true,
                name: true,
              },
            },
            newBranch: {
              select: {
                id: true,
                name: true,
              },
            },
            changedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { changedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.loanAssignmentHistory.count({ where: loanHistoryWhere }),
      ]);

      // Get customer reassignment history
      const customerHistoryWhere: any = {};

      // Role-based filtering for customer assignments
      if (userRole === Role.BRANCH_MANAGER && userBranchId) {
        customerHistoryWhere.customer = {
          branchId: userBranchId,
          deletedAt: null,
        };
      } else if (userRole === Role.CREDIT_OFFICER) {
        customerHistoryWhere.customer = {
          OR: [{ currentOfficerId: userId }],
          deletedAt: null,
        };
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        customerHistoryWhere.changedAt = {};
        if (filters.dateFrom) {
          customerHistoryWhere.changedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          customerHistoryWhere.changedAt.lte = new Date(filters.dateTo);
        }
      }

      const [customerHistory, customerCount] = await Promise.all([
        prisma.customerReassignment.findMany({
          where: customerHistoryWhere,
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                firstName: true,
                lastName: true,
              },
            },
            oldOfficer: {
              select: {
                id: true,
                email: true,
              },
            },
            newOfficer: {
              select: {
                id: true,
                email: true,
              },
            },
            oldBranch: {
              select: {
                id: true,
                name: true,
              },
            },
            newBranch: {
              select: {
                id: true,
                name: true,
              },
            },
            changedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { changedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.customerReassignment.count({ where: customerHistoryWhere }),
      ]);

      // Get branch manager assignment history
      const branchHistoryWhere: any = {};

      // Role-based filtering for branch assignments
      if (userRole === Role.BRANCH_MANAGER && userBranchId) {
        branchHistoryWhere.branchId = userBranchId;
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        branchHistoryWhere.changedAt = {};
        if (filters.dateFrom) {
          branchHistoryWhere.changedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          branchHistoryWhere.changedAt.lte = new Date(filters.dateTo);
        }
      }

      const [branchHistory, branchCount] = await Promise.all([
        prisma.branch.findMany({
          where: {
            ...branchHistoryWhere,
            deletedAt: null,
          },
          include: {
            manager: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.branch.count({
          where: {
            ...branchHistoryWhere,
            deletedAt: null,
          },
        }),
      ]);

      // Transform loan history
      const transformedLoanHistory: AssignmentHistoryEntry[] = loanHistory.map(
        (entry: any) => ({
          id: entry.id,
          type: "USER_ASSIGNMENT" as const,
          userId: entry.newOfficerId,
          oldBranchId: entry.oldBranchId || undefined,
          newBranchId: entry.newBranchId || undefined,
          oldManagerId: entry.oldOfficerId || undefined,
          newManagerId: entry.newOfficerId,
          changedByUserId: entry.changedByUserId,
          reason: entry.reason || undefined,
          timestamp: entry.changedAt.toISOString(),
          userEmail: entry.newOfficer?.email,
          oldBranchName: entry.oldBranch?.name,
          newBranchName: entry.newBranch?.name,
          oldManagerEmail: entry.oldOfficer?.email,
          newManagerEmail: entry.newOfficer?.email,
          changedByEmail: entry.changedBy?.email,
        })
      );

      // Transform customer history
      const transformedCustomerHistory: AssignmentHistoryEntry[] =
        customerHistory.map((entry: any) => ({
          id: entry.id,
          type: "USER_ASSIGNMENT" as const,
          userId: entry.newOfficerId,
          oldBranchId: entry.oldBranchId || undefined,
          newBranchId: entry.newBranchId || undefined,
          oldManagerId: entry.oldOfficerId || undefined,
          newManagerId: entry.newOfficerId,
          changedByUserId: entry.changedByUserId,
          reason: entry.reason || undefined,
          timestamp: entry.changedAt.toISOString(),
          userEmail: entry.newOfficer?.email,
          oldBranchName: entry.oldBranch?.name,
          newBranchName: entry.newBranch?.name,
          oldManagerEmail: entry.oldOfficer?.email,
          newManagerEmail: entry.newOfficer?.email,
          changedByEmail: entry.changedBy?.email,
        }));

      // Transform branch history (manager assignments)
      const transformedBranchHistory: AssignmentHistoryEntry[] = branchHistory
        .filter((branch: any) => branch.manager) // Only include branches with managers
        .map((branch: any) => ({
          id: branch.id,
          type: "MANAGER_ASSIGNMENT" as const,
          branchId: branch.id,
          newManagerId: branch.managerId || undefined,
          changedByUserId: branch.managerId || "", // This is a limitation - we don't track who assigned the manager
          timestamp: branch.updatedAt.toISOString(),
          branchName: branch.name,
          newManagerEmail: branch.manager?.email,
          changedByEmail: branch.manager?.email, // This is a limitation
        }));

      // Combine and sort all history
      const allHistory = [
        ...transformedLoanHistory,
        ...transformedCustomerHistory,
        ...transformedBranchHistory,
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply type filter
      const filteredHistory =
        filters.type && filters.type !== "all"
          ? allHistory.filter((entry) => entry.type === filters.type)
          : allHistory;

      // Apply search filter
      const searchFilteredHistory = filters.search
        ? filteredHistory.filter(
            (entry) =>
              entry.userEmail
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.branchName
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.oldBranchName
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.newBranchName
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.oldManagerEmail
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.newManagerEmail
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.changedByEmail
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase()) ||
              entry.reason
                ?.toLowerCase()
                .includes(filters.search!.toLowerCase())
          )
        : filteredHistory;

      // Paginate the final results
      const paginatedHistory = searchFilteredHistory.slice(skip, skip + limit);
      const totalCount = searchFilteredHistory.length;

      return {
        history: paginatedHistory,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error: unknown) {
      console.error("Error fetching assignment history:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch assignment history: ${error.message}`);
      }
      throw new Error("Failed to fetch assignment history: Unknown error");
    }
  }
}
