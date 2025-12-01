import prisma from "../prismaClient";
import { Prisma, ReportType } from "@prisma/client";

interface SupervisorDashboardFilters {
  supervisorId: string;
  periodStart?: Date;
  periodEnd?: Date;
}

interface OfficerPerformance {
  officerId: string;
  officerName: string;
  email: string;
  totalUnions: number;
  totalMembers: number;
  verifiedMembers: number;
  pendingMembers: number;
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalOutstanding: number;
  collectionRate: number;
  lastActivityAt: Date | null;
}

interface SupervisorDashboardData {
  supervisor: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    totalOfficers: number;
    totalUnions: number;
    totalMembers: number;
    verifiedMembers: number;
    pendingMembers: number;
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    totalDisbursed: number;
    totalRepaid: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  officerPerformance: OfficerPerformance[];
  loanStatusDistribution: {
    status: string;
    count: number;
    amount: number;
  }[];
  monthlyTrends: {
    month: string;
    disbursed: number;
    repaid: number;
    newLoans: number;
    newMembers: number;
  }[];
}

export class SupervisorReportsService {
  /**
   * Get real-time dashboard data for a supervisor
   */
  static async getSupervisorDashboard(
    filters: SupervisorDashboardFilters
  ): Promise<SupervisorDashboardData> {
    const { supervisorId, periodStart, periodEnd } = filters;

    // Get supervisor info
    const supervisor = await prisma.user.findUnique({
      where: { id: supervisorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!supervisor) {
      throw new Error("Supervisor not found");
    }

    if (supervisor.role !== "SUPERVISOR" && supervisor.role !== "ADMIN") {
      throw new Error("User is not a supervisor");
    }

    // Get all credit officers under this supervisor
    const creditOfficers = await prisma.user.findMany({
      where: {
        supervisorId: supervisorId,
        role: "CREDIT_OFFICER",
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lastActivityAt: true,
      },
    });

    const officerIds = creditOfficers.map((o) => o.id);

    // Date filter for loans
    const dateFilter: any = {};
    if (periodStart) {
      dateFilter.createdAt = { ...dateFilter.createdAt, gte: periodStart };
    }
    if (periodEnd) {
      dateFilter.createdAt = { ...dateFilter.createdAt, lte: periodEnd };
    }

    // Get all unions managed by these credit officers
    const unions = await prisma.union.findMany({
      where: {
        creditOfficerId: { in: officerIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        creditOfficerId: true,
      },
    });

    const unionIds = unions.map((u) => u.id);

    // Get all union members in these unions
    const members = await prisma.unionMember.findMany({
      where: {
        unionId: { in: unionIds },
        deletedAt: null,
      },
      select: {
        id: true,
        unionId: true,
        isVerified: true,
      },
    });

    // Get all loans for these unions
    const loans = await prisma.loan.findMany({
      where: {
        unionId: { in: unionIds },
        deletedAt: null,
        ...dateFilter,
      },
      select: {
        id: true,
        unionId: true,
        status: true,
        principalAmount: true,
        createdAt: true,
      },
    });

    // Get repayments for these loans
    const loanIds = loans.map((l) => l.id);
    const repayments = await prisma.repayment.findMany({
      where: {
        loanId: { in: loanIds },
        deletedAt: null,
      },
      select: {
        loanId: true,
        amount: true,
        paidAt: true,
      },
    });

    // Calculate officer performance
    const officerPerformance: OfficerPerformance[] = creditOfficers.map(
      (officer) => {
        const officerUnions = unions.filter(
          (u) => u.creditOfficerId === officer.id
        );
        const officerUnionIds = officerUnions.map((u) => u.id);
        const officerMembers = members.filter((m) =>
          officerUnionIds.includes(m.unionId)
        );
        const officerLoans = loans.filter((l) =>
          officerUnionIds.includes(l.unionId)
        );
        const officerLoanIds = officerLoans.map((l) => l.id);
        const officerRepayments = repayments.filter((r) =>
          officerLoanIds.includes(r.loanId)
        );

        const totalDisbursed = officerLoans.reduce(
          (sum, l) => sum + Number(l.principalAmount),
          0
        );
        const totalRepaid = officerRepayments.reduce(
          (sum, r) => sum + Number(r.amount),
          0
        );
        const activeLoans = officerLoans.filter(
          (l) => l.status === "ACTIVE"
        ).length;
        const completedLoans = officerLoans.filter(
          (l) => l.status === "COMPLETED"
        ).length;
        const defaultedLoans = officerLoans.filter(
          (l) => l.status === "DEFAULTED" || l.status === "WRITTEN_OFF"
        ).length;

        return {
          officerId: officer.id,
          officerName:
            `${officer.firstName || ""} ${officer.lastName || ""}`.trim() ||
            "Unknown",
          email: officer.email,
          totalUnions: officerUnions.length,
          totalMembers: officerMembers.length,
          verifiedMembers: officerMembers.filter((m) => m.isVerified).length,
          pendingMembers: officerMembers.filter((m) => !m.isVerified).length,
          totalLoans: officerLoans.length,
          activeLoans,
          completedLoans,
          defaultedLoans,
          totalDisbursed,
          totalRepaid,
          totalOutstanding: totalDisbursed - totalRepaid,
          collectionRate:
            totalDisbursed > 0 ? (totalRepaid / totalDisbursed) * 100 : 0,
          lastActivityAt: officer.lastActivityAt,
        };
      }
    );

    // Calculate summary
    const totalDisbursed = loans.reduce(
      (sum, l) => sum + Number(l.principalAmount),
      0
    );
    const totalRepaid = repayments.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    const summary = {
      totalOfficers: creditOfficers.length,
      totalUnions: unions.length,
      totalMembers: members.length,
      verifiedMembers: members.filter((m) => m.isVerified).length,
      pendingMembers: members.filter((m) => !m.isVerified).length,
      totalLoans: loans.length,
      activeLoans: loans.filter((l) => l.status === "ACTIVE").length,
      completedLoans: loans.filter((l) => l.status === "COMPLETED").length,
      defaultedLoans: loans.filter(
        (l) => l.status === "DEFAULTED" || l.status === "WRITTEN_OFF"
      ).length,
      totalDisbursed,
      totalRepaid,
      totalOutstanding: totalDisbursed - totalRepaid,
      collectionRate:
        totalDisbursed > 0 ? (totalRepaid / totalDisbursed) * 100 : 0,
    };

    // Loan status distribution
    const statusCounts: Record<string, { count: number; amount: number }> = {};
    loans.forEach((loan) => {
      if (!statusCounts[loan.status]) {
        statusCounts[loan.status] = { count: 0, amount: 0 };
      }
      statusCounts[loan.status].count++;
      statusCounts[loan.status].amount += Number(loan.principalAmount);
    });

    const loanStatusDistribution = Object.entries(statusCounts).map(
      ([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount,
      })
    );

    // Monthly trends (last 6 months)
    const monthlyTrends = await this.getMonthlyTrends(unionIds, 6);

    return {
      supervisor: {
        id: supervisor.id,
        name:
          `${supervisor.firstName || ""} ${supervisor.lastName || ""}`.trim() ||
          "Unknown",
        email: supervisor.email,
      },
      summary,
      officerPerformance,
      loanStatusDistribution,
      monthlyTrends,
    };
  }

  /**
   * Get monthly trends for loans and members
   */
  private static async getMonthlyTrends(unionIds: string[], months: number) {
    const trends: {
      month: string;
      disbursed: number;
      repaid: number;
      newLoans: number;
      newMembers: number;
    }[] = [];

    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthName = startOfMonth.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      // Get loans created in this month
      const monthLoans = await prisma.loan.findMany({
        where: {
          unionId: { in: unionIds },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          principalAmount: true,
        },
      });

      const loanIds = monthLoans.map((l) => l.id);

      // Get repayments in this month
      const monthRepayments = await prisma.repayment.aggregate({
        where: {
          loan: {
            unionId: { in: unionIds },
          },
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedAt: null,
        },
        _sum: {
          amount: true,
        },
      });

      // Get new members in this month
      const newMembers = await prisma.unionMember.count({
        where: {
          unionId: { in: unionIds },
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedAt: null,
        },
      });

      trends.push({
        month: monthName,
        disbursed: monthLoans.reduce(
          (sum, l) => sum + Number(l.principalAmount),
          0
        ),
        repaid: Number(monthRepayments._sum.amount || 0),
        newLoans: monthLoans.length,
        newMembers,
      });
    }

    return trends;
  }

  /**
   * Generate and save a report session
   */
  static async generateReportSession(
    supervisorId: string,
    reportType: ReportType,
    periodStart: Date,
    periodEnd: Date,
    title?: string
  ) {
    // Get dashboard data
    const dashboardData = await this.getSupervisorDashboard({
      supervisorId,
      periodStart,
      periodEnd,
    });

    // Create report session
    const reportSession = await prisma.reportSession.create({
      data: {
        supervisorId,
        reportType,
        title:
          title ||
          `${reportType} Report - ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
        periodStart,
        periodEnd,
        totalOfficers: dashboardData.summary.totalOfficers,
        totalUnions: dashboardData.summary.totalUnions,
        totalMembers: dashboardData.summary.totalMembers,
        totalLoans: dashboardData.summary.totalLoans,
        activeLoans: dashboardData.summary.activeLoans,
        completedLoans: dashboardData.summary.completedLoans,
        defaultedLoans: dashboardData.summary.defaultedLoans,
        totalDisbursed: new Prisma.Decimal(
          dashboardData.summary.totalDisbursed
        ),
        totalRepaid: new Prisma.Decimal(dashboardData.summary.totalRepaid),
        totalOutstanding: new Prisma.Decimal(
          dashboardData.summary.totalOutstanding
        ),
        collectionRate: new Prisma.Decimal(
          dashboardData.summary.collectionRate
        ),
        reportData: dashboardData as unknown as Prisma.InputJsonValue,
        officerMetrics:
          dashboardData.officerPerformance as unknown as Prisma.InputJsonValue,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return reportSession;
  }

  /**
   * Get all report sessions for a supervisor
   */
  static async getReportSessions(
    supervisorId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.reportSession.findMany({
        where: { supervisorId },
        skip,
        take: limit,
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          reportType: true,
          title: true,
          periodStart: true,
          periodEnd: true,
          totalOfficers: true,
          totalUnions: true,
          totalMembers: true,
          totalLoans: true,
          totalDisbursed: true,
          totalRepaid: true,
          collectionRate: true,
          generatedAt: true,
        },
      }),
      prisma.reportSession.count({ where: { supervisorId } }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single report session by ID
   */
  static async getReportSessionById(id: string, supervisorId: string) {
    const report = await prisma.reportSession.findFirst({
      where: {
        id,
        supervisorId,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    return report;
  }

  /**
   * Delete a report session
   */
  static async deleteReportSession(id: string, supervisorId: string) {
    const report = await prisma.reportSession.findFirst({
      where: {
        id,
        supervisorId,
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    await prisma.reportSession.delete({
      where: { id },
    });

    return { success: true, message: "Report deleted successfully" };
  }

  /**
   * Get credit officers under a supervisor
   */
  static async getCreditOfficers(supervisorId: string) {
    const officers = await prisma.user.findMany({
      where: {
        supervisorId,
        role: "CREDIT_OFFICER",
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        lastActivityAt: true,
        loginCount: true,
        _count: {
          select: {
            unions: true,
          },
        },
      },
    });

    return officers.map((officer) => ({
      ...officer,
      name:
        `${officer.firstName || ""} ${officer.lastName || ""}`.trim() ||
        "Unknown",
      unionCount: officer._count.unions,
    }));
  }
}
