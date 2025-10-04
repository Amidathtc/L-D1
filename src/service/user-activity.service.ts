import prisma from "../prismaClient";

interface UserActivityFilters {
  page?: number;
  limit?: number;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  activityType?: string;
  search?: string;
}

export class UserActivityService {
  static async trackLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    failureReason?: string
  ) {
    try {
      // Create login history record
      await prisma.userLoginHistory.create({
        data: {
          userId,
          ipAddress,
          userAgent,
          success,
          failureReason,
        },
      });

      // Update user's last login and activity
      if (success) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lastLoginAt: new Date(),
            lastActivityAt: new Date(),
            loginCount: {
              increment: 1,
            },
          },
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to track login:", error);
      return { success: false, error: error.message };
    }
  }

  static async updateActivity(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastActivityAt: new Date(),
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Failed to update activity:", error);
      return { success: false, error: error.message };
    }
  }

  static async getLoginHistory(filters: UserActivityFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.startDate || filters.endDate) {
        where.loginAt = {};
        if (filters.startDate) {
          where.loginAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.loginAt.lte = filters.endDate;
        }
      }

      if (filters.activityType === "success") {
        where.success = true;
      } else if (filters.activityType === "failure") {
        where.success = false;
      }

      const [loginHistory, total] = await Promise.all([
        prisma.userLoginHistory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { loginAt: "desc" },
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
          },
        }),
        prisma.userLoginHistory.count({ where }),
      ]);

      return {
        loginHistory,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch login history");
    }
  }

  static async getUserActivitySummary(
    userId: string,
    period: "day" | "week" | "month" = "month"
  ) {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [totalLogins, successfulLogins, failedLogins, lastLogin] =
        await Promise.all([
          prisma.userLoginHistory.count({
            where: {
              userId,
              loginAt: {
                gte: startDate,
              },
            },
          }),
          prisma.userLoginHistory.count({
            where: {
              userId,
              loginAt: {
                gte: startDate,
              },
              success: true,
            },
          }),
          prisma.userLoginHistory.count({
            where: {
              userId,
              loginAt: {
                gte: startDate,
              },
              success: false,
            },
          }),
          prisma.userLoginHistory.findFirst({
            where: {
              userId,
              success: true,
            },
            orderBy: { loginAt: "desc" },
            select: {
              loginAt: true,
              ipAddress: true,
              userAgent: true,
            },
          }),
        ]);

      return {
        period,
        totalLogins,
        successfulLogins,
        failedLogins,
        successRate:
          totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 0,
        lastLogin,
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch user activity summary");
    }
  }

  static async getBranchActivitySummary(
    branchId: string,
    period: "day" | "week" | "month" = "month"
  ) {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get users in the branch
      const branchUsers = await prisma.user.findMany({
        where: {
          branchId,
          deletedAt: null,
        },
        select: { id: true },
      });

      const userIds = branchUsers.map((user: any) => user.id);

      const [totalLogins, successfulLogins, failedLogins, activeUsers] =
        await Promise.all([
          prisma.userLoginHistory.count({
            where: {
              userId: { in: userIds },
              loginAt: {
                gte: startDate,
              },
            },
          }),
          prisma.userLoginHistory.count({
            where: {
              userId: { in: userIds },
              loginAt: {
                gte: startDate,
              },
              success: true,
            },
          }),
          prisma.userLoginHistory.count({
            where: {
              userId: { in: userIds },
              loginAt: {
                gte: startDate,
              },
              success: false,
            },
          }),
          prisma.userLoginHistory.findMany({
            where: {
              userId: { in: userIds },
              loginAt: {
                gte: startDate,
              },
              success: true,
            },
            select: { userId: true },
            distinct: ["userId"],
          }),
        ]);

      return {
        period,
        totalUsers: userIds.length,
        activeUsers: activeUsers.length,
        totalLogins,
        successfulLogins,
        failedLogins,
        successRate:
          totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 0,
        activityRate:
          userIds.length > 0 ? (activeUsers.length / userIds.length) * 100 : 0,
      };
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch branch activity summary"
      );
    }
  }

  static async getSystemActivitySummary(
    period: "day" | "week" | "month" = "month"
  ) {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case "day":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        totalLogins,
        successfulLogins,
        failedLogins,
        activeUsers,
        totalUsers,
      ] = await Promise.all([
        prisma.userLoginHistory.count({
          where: {
            loginAt: {
              gte: startDate,
            },
          },
        }),
        prisma.userLoginHistory.count({
          where: {
            loginAt: {
              gte: startDate,
            },
            success: true,
          },
        }),
        prisma.userLoginHistory.count({
          where: {
            loginAt: {
              gte: startDate,
            },
            success: false,
          },
        }),
        prisma.userLoginHistory.findMany({
          where: {
            loginAt: {
              gte: startDate,
            },
            success: true,
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        prisma.user.count({
          where: {
            deletedAt: null,
          },
        }),
      ]);

      return {
        period,
        totalUsers,
        activeUsers: activeUsers.length,
        totalLogins,
        successfulLogins,
        failedLogins,
        successRate:
          totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 0,
        activityRate:
          totalUsers > 0 ? (activeUsers.length / totalUsers) * 100 : 0,
      };
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch system activity summary"
      );
    }
  }
}
