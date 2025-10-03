import {
  RepaymentMethod,
  ScheduleStatus,
  Role,
  LoanStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prismaClient";

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
    if (userRole === Role.CREDIT_OFFICER) {
      where.loan = {
        assignedOfficerId: userId,
      };
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      where.loan = {
        branchId: userBranchId,
      };
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
    const repayment = await prisma.repayment.findUnique({
      where: { id },
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

    if (!repayment || repayment.deletedAt) {
      throw new Error("Repayment not found");
    }

    // Permission check
    if (
      userRole === Role.CREDIT_OFFICER &&
      repayment.loan.assignedOfficerId !== userId
    ) {
      throw new Error("You do not have permission to view this repayment");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      repayment.loan.branchId !== userBranchId
    ) {
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
}
