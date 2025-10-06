import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prismaClient";

// Define enums locally since Prisma client seems to have issues
enum RepaymentMethod {
  CASH = "CASH",
  TRANSFER = "TRANSFER",
  POS = "POS",
  MOBILE = "MOBILE",
  USSD = "USSD",
  OTHER = "OTHER",
}

enum ScheduleStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}

enum Role {
  ADMIN = "ADMIN",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  CREDIT_OFFICER = "CREDIT_OFFICER",
}

enum LoanStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  DEFAULTED = "DEFAULTED",
  WRITTEN_OFF = "WRITTEN_OFF",
  CANCELED = "CANCELED",
}

interface CreateRepaymentData {
  loanId: string;
  amount: number;
  paidAt?: string;
  method: RepaymentMethod;
  reference?: string;
  notes?: string;
}

export class RepaymentService {
  static async createRepayment(
    data: CreateRepaymentData,
    receivedByUserId: string
  ) {
    // Validate loan
    const loan = await prisma.loan.findUnique({
      where: { id: data.loanId },
      include: {
        scheduleItems: {
          where: { deletedAt: null },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new Error("Can only make payments on active loans");
    }

    const amount = new Decimal(data.amount);
    const paidAt = data.paidAt ? new Date(data.paidAt) : new Date();

    // Create repayment
    const repayment = await prisma.repayment.create({
      data: {
        loanId: data.loanId,
        receivedByUserId,
        amount,
        paidAt,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
      include: {
        loan: {
          include: {
            customer: true,
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
    });

    // Allocate payment to schedule items
    await this.allocatePayment(repayment.id, data.loanId, amount);

    // Check if loan is fully paid
    await this.checkLoanCompletion(data.loanId);

    return repayment;
  }

  static async allocatePayment(
    repaymentId: string,
    loanId: string,
    amount: Decimal
  ) {
    // Get pending and partial schedule items ordered by due date
    const scheduleItems = await prisma.repaymentScheduleItem.findMany({
      where: {
        loanId,
        status: {
          in: [
            ScheduleStatus.PENDING,
            ScheduleStatus.PARTIAL,
            ScheduleStatus.OVERDUE,
          ],
        },
        deletedAt: null,
      },
      orderBy: { dueDate: "asc" },
    });

    let remainingAmount = amount;
    const allocations = [];

    for (const item of scheduleItems) {
      if (remainingAmount.lte(0)) break;

      const itemOutstanding = item.totalDue.minus(item.paidAmount);

      if (itemOutstanding.lte(0)) continue;

      const allocationAmount = remainingAmount.gte(itemOutstanding)
        ? itemOutstanding
        : remainingAmount;

      allocations.push({
        repaymentId,
        scheduleItemId: item.id,
        amount: allocationAmount,
      });

      const newPaidAmount = item.paidAmount.plus(allocationAmount);
      const newStatus = newPaidAmount.gte(item.totalDue)
        ? ScheduleStatus.PAID
        : ScheduleStatus.PARTIAL;

      await prisma.repaymentScheduleItem.update({
        where: { id: item.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          closedAt: newStatus === ScheduleStatus.PAID ? new Date() : null,
        },
      });

      remainingAmount = remainingAmount.minus(allocationAmount);
    }

    // Create allocation records
    if (allocations.length > 0) {
      await prisma.repaymentAllocation.createMany({
        data: allocations,
      });
    }
  }

  static async checkLoanCompletion(loanId: string) {
    const pendingItems = await prisma.repaymentScheduleItem.count({
      where: {
        loanId,
        status: { notIn: [ScheduleStatus.PAID] },
        deletedAt: null,
      },
    });

    if (pendingItems === 0) {
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: "COMPLETED",
          closedAt: new Date(),
        },
      });
    }
  }

  static async getRepayments(
    filters: {
      page?: number;
      limit?: number;
      loanId?: string;
      receivedByUserId?: string;
      method?: RepaymentMethod;
      dateFrom?: string;
      dateTo?: string;
    },
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    // Role-based filtering
    if (userRole === Role.ADMIN) {
      // ADMIN can see all repayments - no additional filtering
      console.log("ADMIN user - showing all repayments");
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only see repayments from their branch
      where.loan = {
        branchId: userBranchId,
        deletedAt: null,
      };
      console.log("BRANCH_MANAGER user - filtering by branchId:", userBranchId);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can see repayments for loans they created or are assigned to
      where.loan = {
        OR: [{ assignedOfficerId: userId }, { createdByUserId: userId }],
        deletedAt: null,
      };
      console.log(
        "CREDIT_OFFICER user - filtering by assignedOfficerId or createdByUserId:",
        userId
      );
    } else {
      // Unknown role - restrict access
      where.loan = {
        id: "non-existent-id", // This will return no results
      };
      console.log("Unknown user role - restricting access");
    }

    if (filters.loanId) {
      where.loanId = filters.loanId;
    }

    if (filters.receivedByUserId) {
      where.receivedByUserId = filters.receivedByUserId;
    }

    if (filters.method) {
      where.method = filters.method;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) {
        where.paidAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.paidAt.lte = new Date(filters.dateTo);
      }
    }

    const [repayments, total] = await Promise.all([
      prisma.repayment.findMany({
        where,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              customer: {
                select: {
                  id: true,
                  code: true,
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
          allocations: {
            include: {
              scheduleItem: {
                select: {
                  id: true,
                  sequence: true,
                  dueDate: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { paidAt: "desc" },
      }),
      prisma.repayment.count({ where }),
    ]);

    return { repayments, total, page, limit };
  }

  static async getRepaymentById(
    id: string,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    console.log("getRepaymentById called with:", {
      id,
      userRole,
      userBranchId,
      userId,
    });

    const repayment = await prisma.repayment.findUnique({
      where: {
        id,
        deletedAt: null, // Only get non-deleted repayments
      },
      include: {
        loan: {
          include: {
            customer: true,
            branch: true,
            assignedOfficer: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                email: true,
                role: true,
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
        allocations: {
          include: {
            scheduleItem: true,
          },
        },
      },
    });

    if (!repayment) {
      console.log("Repayment not found for ID:", id);
      throw new Error("Repayment not found");
    }

    console.log("Repayment found:", {
      id: repayment.id,
      loanId: repayment.loanId,
      loanBranchId: repayment.loan.branchId,
      assignedOfficerId: repayment.loan.assignedOfficerId,
      createdByUserId: repayment.loan.createdByUserId,
    });

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can view any repayment
      console.log("ADMIN user - allowing access to repayment:", id);
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only view repayments from their branch
      if (repayment.loan.branchId !== userBranchId) {
        console.log("BRANCH_MANAGER access denied - branch mismatch:", {
          userBranchId,
          loanBranchId: repayment.loan.branchId,
        });
        throw new Error("You do not have permission to view this repayment");
      }
      console.log(
        "BRANCH_MANAGER user - allowing access to repayment in branch:",
        userBranchId
      );
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can view repayments for loans they created or are assigned to
      if (
        repayment.loan.assignedOfficerId !== userId &&
        repayment.loan.createdByUserId !== userId
      ) {
        console.log(
          "CREDIT_OFFICER access denied - not assigned or created by user:",
          {
            userId,
            assignedOfficerId: repayment.loan.assignedOfficerId,
            createdByUserId: repayment.loan.createdByUserId,
          }
        );
        throw new Error("You do not have permission to view this repayment");
      }
      console.log(
        "CREDIT_OFFICER user - allowing access to repayment for loan created/assigned to:",
        userId
      );
    } else {
      // Unknown role - deny access
      console.log("Unknown user role - denying access");
      throw new Error("You do not have permission to view this repayment");
    }

    return repayment;
  }

  static async updateRepayment(
    id: string,
    data: {
      method?: RepaymentMethod;
      reference?: string;
      notes?: string;
    },
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const repayment = await prisma.repayment.findUnique({
      where: { id },
      include: {
        loan: true,
      },
    });

    if (!repayment || repayment.deletedAt) {
      throw new Error("Repayment not found");
    }

    // Permission check
    if (
      userRole === Role.CREDIT_OFFICER &&
      repayment.loan.assignedOfficerId !== userId
    ) {
      throw new Error("You do not have permission to update this repayment");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      repayment.loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to update this repayment");
    }

    // Only allow updates within 24 hours of creation
    const hoursSinceCreation =
      (Date.now() - repayment.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new Error("Cannot update repayment after 24 hours");
    }

    const updatedRepayment = await prisma.repayment.update({
      where: { id },
      data: {
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
      include: {
        loan: {
          include: {
            customer: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updatedRepayment;
  }

  static async deleteRepayment(
    id: string,
    userRole: Role,
    userBranchId?: string
  ) {
    const repayment = await prisma.repayment.findUnique({
      where: { id },
      include: {
        loan: true,
        allocations: true,
      },
    });

    if (!repayment || repayment.deletedAt) {
      throw new Error("Repayment not found");
    }

    // Only admins and branch managers can delete repayments
    if (userRole === Role.CREDIT_OFFICER) {
      throw new Error("Credit officers cannot delete repayments");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      repayment.loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to delete this repayment");
    }

    // Only allow deletion within 24 hours
    const hoursSinceCreation =
      (Date.now() - repayment.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new Error("Cannot delete repayment after 24 hours. Contact admin.");
    }

    // Reverse allocations
    for (const allocation of repayment.allocations) {
      const scheduleItem = await prisma.repaymentScheduleItem.findUnique({
        where: { id: allocation.scheduleItemId },
      });

      if (scheduleItem) {
        const newPaidAmount = scheduleItem.paidAmount.minus(allocation.amount);
        const newStatus = newPaidAmount.lte(0)
          ? ScheduleStatus.PENDING
          : newPaidAmount.lt(scheduleItem.totalDue)
          ? ScheduleStatus.PARTIAL
          : ScheduleStatus.PAID;

        await prisma.repaymentScheduleItem.update({
          where: { id: allocation.scheduleItemId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            closedAt: null,
          },
        });
      }
    }

    // Soft delete repayment
    await prisma.repayment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Recheck loan status
    const pendingItems = await prisma.repaymentScheduleItem.count({
      where: {
        loanId: repayment.loanId,
        status: { notIn: [ScheduleStatus.PAID] },
        deletedAt: null,
      },
    });

    if (pendingItems > 0) {
      await prisma.loan.update({
        where: { id: repayment.loanId },
        data: {
          status: "ACTIVE",
          closedAt: null,
        },
      });
    }
  }

  static async getRepaymentSchedules(
    filters: {
      page: number;
      limit: number;
      loanId?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    console.log("getRepaymentSchedules called with filters:", filters);
    console.log(
      "User role:",
      userRole,
      "branchId:",
      userBranchId,
      "userId:",
      userId
    );

    const skip = (filters.page - 1) * filters.limit;

    const where: any = {
      deletedAt: null,
    };

    // Apply basic filters first
    if (filters.loanId) {
      where.loanId = filters.loanId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.dueDate = {};
      if (filters.dateFrom) {
        where.dueDate.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.dueDate.lte = new Date(filters.dateTo);
      }
    }

    // Apply role-based filtering - temporarily disabled for debugging
    console.log("Role-based filtering temporarily disabled for debugging");
    console.log(
      "User role:",
      userRole,
      "User ID:",
      userId,
      "Branch ID:",
      userBranchId
    );
    // if (userRole === Role.ADMIN) {
    //   // ADMIN can see all schedules - no additional filtering
    //   console.log("ADMIN user - showing all repayment schedules");
    // } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
    //   // BRANCH_MANAGER can only see schedules for loans in their branch
    //   where.loan = {
    //     branchId: userBranchId,
    //     deletedAt: null,
    //   };
    //   console.log("BRANCH_MANAGER user - filtering by branchId:", userBranchId);
    // } else if (userRole === Role.CREDIT_OFFICER) {
    //   // CREDIT_OFFICER can only see schedules for loans they created or are assigned to
    //   where.loan = {
    //     OR: [{ createdByUserId: userId }, { assignedOfficerId: userId }],
    //     deletedAt: null,
    //   };
    //   console.log(
    //     "CREDIT_OFFICER user - filtering by createdByUserId or assignedOfficerId:",
    //     userId
    //   );
    // } else {
    //   // Unknown role - restrict access
    //   where.loan = {
    //     id: "non-existent-id", // This will return no results
    //   };
    //   console.log("Unknown user role - restricting access");
    // }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    // Debug: Check if there are any repayment schedule items at all
    const totalScheduleItems = await prisma.repaymentScheduleItem.count();
    console.log(
      "Total repayment schedule items in database:",
      totalScheduleItems
    );

    const totalActiveScheduleItems = await prisma.repaymentScheduleItem.count({
      where: { deletedAt: null },
    });
    console.log(
      "Total active repayment schedule items:",
      totalActiveScheduleItems
    );

    // Debug: Check what the query will return
    const testQuery = await prisma.repaymentScheduleItem.findMany({
      where,
      take: 5,
      select: {
        id: true,
        loanId: true,
        sequence: true,
        status: true,
        loan: {
          select: {
            id: true,
            loanNumber: true,
            assignedOfficerId: true,
            createdByUserId: true,
            branchId: true,
          },
        },
      },
    });
    console.log("Test query results (first 5):", testQuery);

    const [schedules, total] = await Promise.all([
      prisma.repaymentScheduleItem.findMany({
        where,
        include: {
          loan: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
              assignedOfficer: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          allocations: {
            include: {
              repayment: {
                select: {
                  id: true,
                  amount: true,
                  method: true,
                  paidAt: true,
                },
              },
            },
          },
        },
        skip,
        take: filters.limit,
        orderBy: { dueDate: "asc" },
      }),
      prisma.repaymentScheduleItem.count({ where }),
    ]);

    console.log("Query results:", {
      schedulesFound: schedules.length,
      totalCount: total,
      firstSchedule: schedules[0] || null,
    });

    return {
      schedules,
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  static async getRepaymentScheduleByLoan(
    loanId: string,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    // Verify loan access
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        customer: true,
        branch: true,
        assignedOfficer: true,
      },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Check permissions
    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error(
        "You do not have permission to view this loan's schedule"
      );
    }

    if (userRole === Role.CREDIT_OFFICER && loan.assignedOfficerId !== userId) {
      throw new Error(
        "You do not have permission to view this loan's schedule"
      );
    }

    const schedule = await prisma.repaymentScheduleItem.findMany({
      where: {
        loanId,
        deletedAt: null,
      },
      include: {
        allocations: {
          include: {
            repayment: {
              select: {
                id: true,
                amount: true,
                method: true,
                paidAt: true,
                reference: true,
                notes: true,
                receivedBy: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { sequence: "asc" },
    });

    return {
      loan,
      schedule,
    };
  }

  static async getRepaymentSummary(
    filters: {
      loanId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const where: any = {
      deletedAt: null,
    };

    // Apply filters
    if (filters.loanId) {
      where.loanId = filters.loanId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) {
        where.paidAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.paidAt.lte = new Date(filters.dateTo);
      }
    }

    // Apply role-based filtering
    if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      where.loan = {
        branchId: userBranchId,
      };
    } else if (userRole === Role.CREDIT_OFFICER) {
      where.loan = {
        assignedOfficerId: userId,
      };
    }

    const [totalRepayments, totalAmount, methodBreakdown, recentRepayments] =
      await Promise.all([
        prisma.repayment.count({ where }),
        prisma.repayment.aggregate({
          where,
          _sum: { amount: true },
        }),
        prisma.repayment.groupBy({
          by: ["method"],
          where,
          _sum: { amount: true },
          _count: true,
        }),
        prisma.repayment.findMany({
          where,
          include: {
            loan: {
              include: {
                customer: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          orderBy: { paidAt: "desc" },
          take: 5,
        }),
      ]);

    return {
      totalRepayments,
      totalAmount: totalAmount._sum.amount || 0,
      methodBreakdown,
      recentRepayments,
    };
  }
}
