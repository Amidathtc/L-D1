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
      // Get union assignment history
      const assignmentWhere: any = {};

      // Role-based filtering for union assignments
      if (userRole === Role.SUPERVISOR && userBranchId) {
        assignmentWhere.unionId = userBranchId;
      } else if (userRole === Role.CREDIT_OFFICER) {
        // Credit officers can see assignments for their unions
        assignmentWhere.newOfficerId = userId;
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        assignmentWhere.changedAt = {};
        if (filters.dateFrom) {
          assignmentWhere.changedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          assignmentWhere.changedAt.lte = new Date(filters.dateTo);
        }
      }

      const [loanHistory, loanCount] = await Promise.all([
        prisma.unionAssignmentHistory.findMany({
          where: assignmentWhere,
          include: {
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
        prisma.unionAssignmentHistory.count({ where: assignmentWhere }),
      ]);

      // Get union member reassignment history
      const reassignmentWhere: any = {};

      // Role-based filtering for union member assignments
      if (userRole === Role.SUPERVISOR && userBranchId) {
        reassignmentWhere.newUnion = {
          id: userBranchId,
          deletedAt: null,
        };
      } else if (userRole === Role.CREDIT_OFFICER) {
        reassignmentWhere.newOfficerId = userId;
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        reassignmentWhere.changedAt = {};
        if (filters.dateFrom) {
          reassignmentWhere.changedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          reassignmentWhere.changedAt.lte = new Date(filters.dateTo);
        }
      }

      const [customerHistory, customerCount] = await Promise.all([
        prisma.unionMemberReassignment.findMany({
          where: reassignmentWhere,
          include: {
            unionMember: {
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
            oldUnion: {
              select: {
                id: true,
                name: true,
              },
            },
            newUnion: {
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
        prisma.unionMemberReassignment.count({ where: reassignmentWhere }),
      ]);

      // Get union history (with credit officer assignments)
      const branchHistoryWhere: any = {};

      // Role-based filtering for union assignments
      if (userRole === Role.SUPERVISOR && userBranchId) {
        branchHistoryWhere.id = userBranchId;
      }

      // Date filtering
      if (filters.dateFrom || filters.dateTo) {
        branchHistoryWhere.updatedAt = {};
        if (filters.dateFrom) {
          branchHistoryWhere.updatedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          branchHistoryWhere.updatedAt.lte = new Date(filters.dateTo);
        }
      }

      const [branchHistory, branchCount] = await Promise.all([
        prisma.union.findMany({
          where: {
            ...branchHistoryWhere,
            deletedAt: null,
          },
          include: {
            creditOfficer: {
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
        prisma.union.count({
          where: {
            ...branchHistoryWhere,
            deletedAt: null,
          },
        }),
      ]);

      // Transform union assignment history
      const transformedLoanHistory: AssignmentHistoryEntry[] = loanHistory.map(
        (entry: any) => ({
          id: entry.id,
          type: "USER_ASSIGNMENT" as const,
          userId: entry.newOfficerId,
          oldManagerId: entry.oldOfficerId || undefined,
          newManagerId: entry.newOfficerId,
          changedByUserId: entry.changedByUserId,
          reason: entry.reason || undefined,
          timestamp: entry.changedAt.toISOString(),
          userEmail: entry.newOfficer?.email,
          oldManagerEmail: entry.oldOfficer?.email,
          newManagerEmail: entry.newOfficer?.email,
          changedByEmail: entry.changedBy?.email,
        })
      );

      // Transform union member reassignment history
      const transformedCustomerHistory: AssignmentHistoryEntry[] =
        customerHistory.map((entry: any) => ({
          id: entry.id,
          type: "USER_ASSIGNMENT" as const,
          userId: entry.newOfficerId,
          oldBranchId: entry.oldUnionId || undefined,
          newBranchId: entry.newUnionId || undefined,
          oldManagerId: entry.oldOfficerId || undefined,
          newManagerId: entry.newOfficerId || undefined,
          changedByUserId: entry.changedByUserId,
          reason: entry.reason || undefined,
          timestamp: entry.changedAt.toISOString(),
          userEmail: entry.unionMember?.code,
          oldBranchName: entry.oldUnion?.name,
          newBranchName: entry.newUnion?.name,
          oldManagerEmail: entry.oldOfficer?.email,
          newManagerEmail: entry.newOfficer?.email,
          changedByEmail: entry.changedBy?.email,
        }));

      // Transform union history (credit officer assignments)
      const transformedBranchHistory: AssignmentHistoryEntry[] = branchHistory
        .filter((union: any) => union.creditOfficer) // Only include unions with credit officers
        .map((union: any) => ({
          id: union.id,
          type: "MANAGER_ASSIGNMENT" as const,
          branchId: union.id,
          newManagerId: union.creditOfficerId || undefined,
          changedByUserId: union.creditOfficerId || "", // This is a limitation - we don't track who assigned the officer
          timestamp: union.updatedAt.toISOString(),
          branchName: union.name,
          newManagerEmail: union.creditOfficer?.email,
          changedByEmail: union.creditOfficer?.email, // This is a limitation
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
