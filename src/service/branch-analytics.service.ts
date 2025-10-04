import prisma from "../prismaClient";

interface BranchAnalyticsFilters {
  branchId?: string;
  periodType?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate?: Date;
  endDate?: Date;
}

export class BranchAnalyticsService {
  static async generateBranchAnalytics(
    branchId: string,
    periodType:
      | "daily"
      | "weekly"
      | "monthly"
      | "quarterly"
      | "yearly" = "monthly"
  ) {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        throw new Error("Branch not found");
      }

      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      switch (periodType) {
        case "daily":
          periodStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          const startOfWeek = now.getDate() - now.getDay();
          periodStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            startOfWeek
          );
          periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "quarterly":
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
          break;
        case "yearly":
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear() + 1, 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      // Get branch users
      const branchUsers = await prisma.user.findMany({
        where: {
          branchId,
          deletedAt: null,
        },
        select: { id: true, isActive: true },
      });

      const userIds = branchUsers.map((user: any) => user.id);

      // Calculate metrics
      const [
        totalUsers,
        activeUsers,
        totalCustomers,
        totalLoans,
        activeLoans,
        totalLoanAmount,
        outstandingAmount,
        monthlyRevenue,
        quarterlyRevenue,
        yearlyRevenue,
        dailyLogins,
        weeklyLogins,
        monthlyLogins,
        overdueLoans,
        defaultedLoans,
      ] = await Promise.all([
        // User metrics
        branchUsers.length,
        branchUsers.filter((user: any) => user.isActive).length,

        // Customer metrics
        prisma.customer.count({
          where: {
            branchId,
            deletedAt: null,
          },
        }),

        // Loan metrics
        prisma.loan.count({
          where: {
            branchId,
            deletedAt: null,
          },
        }),

        prisma.loan.count({
          where: {
            branchId,
            deletedAt: null,
            status: {
              in: ["ACTIVE", "PENDING_APPROVAL"],
            },
          },
        }),

        // Financial metrics
        prisma.loan
          .aggregate({
            where: {
              branchId,
              deletedAt: null,
            },
            _sum: {
              principalAmount: true,
            },
          })
          .then((result: any) => result._sum.principalAmount || 0),

        prisma.loan
          .aggregate({
            where: {
              branchId,
              deletedAt: null,
              status: {
                in: ["ACTIVE", "PENDING_APPROVAL"],
              },
            },
            _sum: {
              principalAmount: true,
            },
          })
          .then((result: any) => result._sum.principalAmount || 0),

        // Revenue calculations (simplified - you might want to calculate from repayments)
        prisma.repayment
          .aggregate({
            where: {
              loan: {
                branchId,
              },
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), 1),
                lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
              },
            },
            _sum: {
              amount: true,
            },
          })
          .then((result: any) => result._sum.amount || 0),

        prisma.repayment
          .aggregate({
            where: {
              loan: {
                branchId,
              },
              createdAt: {
                gte: new Date(
                  now.getFullYear(),
                  Math.floor(now.getMonth() / 3) * 3,
                  1
                ),
                lt: new Date(
                  now.getFullYear(),
                  (Math.floor(now.getMonth() / 3) + 1) * 3,
                  1
                ),
              },
            },
            _sum: {
              amount: true,
            },
          })
          .then((result: any) => result._sum.amount || 0),

        prisma.repayment
          .aggregate({
            where: {
              loan: {
                branchId,
              },
              createdAt: {
                gte: new Date(now.getFullYear(), 0, 1),
                lt: new Date(now.getFullYear() + 1, 0, 1),
              },
            },
            _sum: {
              amount: true,
            },
          })
          .then((result: any) => result._sum.amount || 0),

        // Activity metrics
        prisma.userLoginHistory.count({
          where: {
            userId: { in: userIds },
            loginAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            },
            success: true,
          },
        }),

        prisma.userLoginHistory.count({
          where: {
            userId: { in: userIds },
            loginAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
            success: true,
          },
        }),

        prisma.userLoginHistory.count({
          where: {
            userId: { in: userIds },
            loginAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
            success: true,
          },
        }),

        // Collection metrics
        prisma.loan.count({
          where: {
            branchId,
            deletedAt: null,
            status: "DEFAULTED",
            endDate: {
              lt: now,
            },
          },
        }),

        prisma.loan.count({
          where: {
            branchId,
            deletedAt: null,
            status: "DEFAULTED",
          },
        }),
      ]);

      // Calculate collection rate
      const totalRepayments = await prisma.repayment.aggregate({
        where: {
          loan: {
            branchId,
          },
          createdAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const expectedRepayments = await prisma.repaymentScheduleItem.aggregate({
        where: {
          loan: {
            branchId,
          },
          dueDate: {
            gte: periodStart,
            lt: periodEnd,
          },
        },
        _sum: {
          principalDue: true,
          interestDue: true,
        },
      });

      const expectedAmount =
        Number(expectedRepayments._sum.principalDue || 0) +
        Number(expectedRepayments._sum.interestDue || 0);
      const actualAmount = Number(totalRepayments._sum.amount || 0);
      const collectionRate =
        expectedAmount > 0 ? (actualAmount / expectedAmount) * 100 : 0;

      // Create or update analytics record
      const existingAnalytics = await prisma.branchAnalytics.findFirst({
        where: {
          branchId,
          periodType,
          periodStart,
        },
      });

      let analytics;
      if (existingAnalytics) {
        analytics = await prisma.branchAnalytics.update({
          where: { id: existingAnalytics.id },
          data: {
            totalUsers,
            activeUsers,
            totalCustomers,
            totalLoans,
            activeLoans,
            totalLoanAmount,
            outstandingAmount,
            monthlyRevenue,
            quarterlyRevenue,
            yearlyRevenue,
            dailyLogins,
            weeklyLogins,
            monthlyLogins,
            collectionRate,
            overdueLoans,
            defaultedLoans,
            periodEnd,
          },
        });
      } else {
        analytics = await prisma.branchAnalytics.create({
          data: {
            branchId,
            totalUsers,
            activeUsers,
            totalCustomers,
            totalLoans,
            activeLoans,
            totalLoanAmount,
            outstandingAmount,
            monthlyRevenue,
            quarterlyRevenue,
            yearlyRevenue,
            dailyLogins,
            weeklyLogins,
            monthlyLogins,
            collectionRate,
            overdueLoans,
            defaultedLoans,
            periodStart,
            periodEnd,
            periodType,
          },
        });
      }

      return {
        ...analytics,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate branch analytics");
    }
  }

  static async getBranchAnalytics(filters: any) {
    try {
      const where: any = {};

      if (filters.branchId) {
        where.branchId = filters.branchId;
      }

      if (filters.periodType) {
        where.periodType = filters.periodType;
      }

      if (filters.startDate || filters.endDate) {
        where.periodStart = {};
        if (filters.startDate) {
          where.periodStart.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.periodStart.lte = filters.endDate;
        }
      }

      const analytics = await prisma.branchAnalytics.findMany({
        where,
        orderBy: [{ branchId: "asc" }, { periodStart: "desc" }],
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return analytics;
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch branch analytics");
    }
  }

  static async getBranchPerformanceComparison(
    branchIds: string[],
    periodType: string = "monthly"
  ) {
    try {
      const now = new Date();
      let periodStart: Date;

      switch (periodType) {
        case "daily":
          periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarterly":
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "yearly":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const analytics = await prisma.branchAnalytics.findMany({
        where: {
          branchId: { in: branchIds },
          periodType,
          periodStart: {
            gte: periodStart,
          },
        },
        orderBy: [{ totalLoanAmount: "desc" }, { collectionRate: "desc" }],
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return analytics;
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to fetch branch performance comparison"
      );
    }
  }

  static async getSystemAnalytics(periodType: string = "monthly") {
    try {
      const now = new Date();
      let periodStart: Date;

      switch (periodType) {
        case "daily":
          periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "weekly":
          periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "monthly":
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarterly":
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case "yearly":
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const analytics = await prisma.branchAnalytics.findMany({
        where: {
          periodType,
          periodStart: {
            gte: periodStart,
          },
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      // Aggregate system-wide metrics
      const systemMetrics = analytics.reduce(
        (acc: any, analytics: any) => ({
          totalUsers: acc.totalUsers + analytics.totalUsers,
          activeUsers: acc.activeUsers + analytics.activeUsers,
          totalCustomers: acc.totalCustomers + analytics.totalCustomers,
          totalLoans: acc.totalLoans + analytics.totalLoans,
          activeLoans: acc.activeLoans + analytics.activeLoans,
          totalLoanAmount:
            acc.totalLoanAmount + Number(analytics.totalLoanAmount),
          outstandingAmount:
            acc.outstandingAmount + Number(analytics.outstandingAmount),
          monthlyRevenue: acc.monthlyRevenue + Number(analytics.monthlyRevenue),
          quarterlyRevenue:
            acc.quarterlyRevenue + Number(analytics.quarterlyRevenue),
          yearlyRevenue: acc.yearlyRevenue + Number(analytics.yearlyRevenue),
          dailyLogins: acc.dailyLogins + analytics.dailyLogins,
          weeklyLogins: acc.weeklyLogins + analytics.weeklyLogins,
          monthlyLogins: acc.monthlyLogins + analytics.monthlyLogins,
          overdueLoans: acc.overdueLoans + analytics.overdueLoans,
          defaultedLoans: acc.defaultedLoans + analytics.defaultedLoans,
          totalCollectionRate:
            acc.totalCollectionRate + Number(analytics.collectionRate),
        }),
        {
          totalUsers: 0,
          activeUsers: 0,
          totalCustomers: 0,
          totalLoans: 0,
          activeLoans: 0,
          totalLoanAmount: 0,
          outstandingAmount: 0,
          monthlyRevenue: 0,
          quarterlyRevenue: 0,
          yearlyRevenue: 0,
          dailyLogins: 0,
          weeklyLogins: 0,
          monthlyLogins: 0,
          overdueLoans: 0,
          defaultedLoans: 0,
          totalCollectionRate: 0,
        }
      );

      // Calculate average collection rate
      const averageCollectionRate =
        analytics.length > 0
          ? systemMetrics.totalCollectionRate / analytics.length
          : 0;

      return {
        periodType,
        periodStart,
        branches: analytics.length,
        metrics: {
          ...systemMetrics,
          averageCollectionRate,
        },
        branchAnalytics: analytics,
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch system analytics");
    }
  }
}
