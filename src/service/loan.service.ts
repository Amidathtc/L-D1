import { LoanStatus, TermUnit, ScheduleStatus, Role } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../prismaClient";

interface CreateLoanData {
  customerId: string;
  loanTypeId?: string;
  principalAmount: number;
  termCount: number;
  termUnit: TermUnit;
  startDate: string;
  processingFeeAmount: number;
  penaltyFeePerDayAmount: number;
  interestRate?: number;
  notes?: string;
}

interface UpdateLoanData {
  loanTypeId?: string;
  principalAmount?: number;
  termCount?: number;
  termUnit?: TermUnit;
  startDate?: string;
  processingFeeAmount?: number;
  penaltyFeePerDayAmount?: number;
  notes?: string;
}

export class LoanService {
  static async createLoan(
    data: CreateLoanData,
    createdByUserId: string,
    userBranchId: string | null
  ) {
    // Validate customer
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      include: { branch: true },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Validate loan type if provided
    if (data.loanTypeId) {
      const loanType = await prisma.loanType.findUnique({
        where: { id: data.loanTypeId },
      });

      if (!loanType || loanType.deletedAt || !loanType.isActive) {
        throw new Error("Loan type not found or inactive");
      }

      // Validate amount within loan type limits
      const amount = new Decimal(data.principalAmount);
      if (amount.lt(loanType.minAmount) || amount.gt(loanType.maxAmount)) {
        throw new Error(
          `Principal amount must be between ${loanType.minAmount} and ${loanType.maxAmount}`
        );
      }
    }

    // Check for active loans for this customer
    const activeLoan = await prisma.loan.findFirst({
      where: {
        customerId: data.customerId,
        status: { in: ["ACTIVE", "PENDING_APPROVAL", "APPROVED"] },
        deletedAt: null,
      },
    });

    if (activeLoan) {
      throw new Error("Customer already has an active loan");
    }

    // Generate loan number
    const lastLoan = await prisma.loan.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastLoan?.loanNumber) {
      const lastNumber = parseInt(lastLoan.loanNumber.replace("LN", ""));
      nextNumber = lastNumber + 1;
    }

    const loanNumber = `LN${String(nextNumber).padStart(8, "0")}`;

    // Calculate end date
    const startDate = new Date(data.startDate);
    const endDate = this.calculateEndDate(
      startDate,
      data.termCount,
      data.termUnit
    );

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        loanNumber,
        customerId: data.customerId,
        branchId: customer.branchId,
        loanTypeId: data.loanTypeId,
        principalAmount: new Decimal(data.principalAmount),
        termCount: data.termCount,
        termUnit: data.termUnit,
        startDate,
        endDate,
        processingFeeAmount: new Decimal(data.processingFeeAmount),
        penaltyFeePerDayAmount: new Decimal(data.penaltyFeePerDayAmount),
        status: LoanStatus.DRAFT,
        createdByUserId,
        assignedOfficerId: customer.currentOfficerId || createdByUserId,
        notes: data.notes,
      },
      include: {
        customer: true,
        loanType: true,
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
    });

    // Generate repayment schedule
    await this.generateRepaymentSchedule(
      loan.id,
      data.principalAmount,
      data.termCount,
      data.termUnit,
      startDate,
      data.interestRate || 0
    );

    return loan;
  }

  static calculateEndDate(
    startDate: Date,
    termCount: number,
    termUnit: TermUnit
  ): Date {
    const endDate = new Date(startDate);

    switch (termUnit) {
      case TermUnit.DAY:
        endDate.setDate(endDate.getDate() + termCount);
        break;
      case TermUnit.WEEK:
        endDate.setDate(endDate.getDate() + termCount * 7);
        break;
      case TermUnit.MONTH:
        endDate.setMonth(endDate.getMonth() + termCount);
        break;
    }

    return endDate;
  }

  static async generateRepaymentSchedule(
    loanId: string,
    principalAmount: number,
    termCount: number,
    termUnit: TermUnit,
    startDate: Date,
    interestRate: number
  ) {
    const principal = new Decimal(principalAmount);
    const principalPerPayment = principal.div(termCount);

    // Calculate total interest
    const annualRate = new Decimal(interestRate).div(100);
    const totalInterest = principal
      .mul(annualRate)
      .mul(this.getYearFraction(termCount, termUnit));
    const interestPerPayment = totalInterest.div(termCount);

    const scheduleItems = [];

    for (let i = 1; i <= termCount; i++) {
      const dueDate = new Date(startDate);

      switch (termUnit) {
        case TermUnit.DAY:
          dueDate.setDate(dueDate.getDate() + i);
          break;
        case TermUnit.WEEK:
          dueDate.setDate(dueDate.getDate() + i * 7);
          break;
        case TermUnit.MONTH:
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
      }

      const totalDue = principalPerPayment.plus(interestPerPayment);

      scheduleItems.push({
        loanId,
        sequence: i,
        dueDate,
        principalDue: principalPerPayment,
        interestDue: interestPerPayment,
        feeDue: new Decimal(0),
        totalDue,
        paidAmount: new Decimal(0),
        status: ScheduleStatus.PENDING,
      });
    }

    await prisma.repaymentScheduleItem.createMany({
      data: scheduleItems,
    });
  }

  static getYearFraction(termCount: number, termUnit: TermUnit): Decimal {
    switch (termUnit) {
      case TermUnit.DAY:
        return new Decimal(termCount).div(365);
      case TermUnit.WEEK:
        return new Decimal(termCount).mul(7).div(365);
      case TermUnit.MONTH:
        return new Decimal(termCount).div(12);
    }
  }

  static async getLoans(
    filters: {
      page?: number;
      limit?: number;
      status?: LoanStatus;
      branchId?: string;
      assignedOfficerId?: string;
      customerId?: string;
      search?: string;
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
      where.assignedOfficerId = userId;
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      where.branchId = userBranchId;
    }

    // Apply additional filters
    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.assignedOfficerId) {
      where.assignedOfficerId = filters.assignedOfficerId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.search) {
      where.OR = [
        { loanNumber: { contains: filters.search, mode: "insensitive" } },
        {
          customer: {
            firstName: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          customer: {
            lastName: { contains: filters.search, mode: "insensitive" },
          },
        },
        {
          customer: { code: { contains: filters.search, mode: "insensitive" } },
        },
      ];
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
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
          _count: {
            select: {
              repayments: true,
              scheduleItems: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.loan.count({ where }),
    ]);

    return { loans, total, page, limit };
  }

  static async getLoanById(
    id: string,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        loanType: true,
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
        scheduleItems: {
          where: { deletedAt: null },
          orderBy: { sequence: "asc" },
        },
        repayments: {
          where: { deletedAt: null },
          include: {
            receivedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { paidAt: "desc" },
          take: 10,
        },
        documents: {
          where: { deletedAt: null },
          include: {
            documentType: true,
          },
        },
        _count: {
          select: {
            repayments: true,
            scheduleItems: true,
            documents: true,
          },
        },
      },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER && loan.assignedOfficerId !== userId) {
      throw new Error("You do not have permission to view this loan");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to view this loan");
    }

    return loan;
  }

  static async updateLoan(
    id: string,
    data: UpdateLoanData,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Only drafts can be updated
    if (loan.status !== LoanStatus.DRAFT) {
      throw new Error("Only draft loans can be updated");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER && loan.assignedOfficerId !== userId) {
      throw new Error("You do not have permission to update this loan");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to update this loan");
    }

    // Validate loan type if changing
    if (data.loanTypeId) {
      const loanType = await prisma.loanType.findUnique({
        where: { id: data.loanTypeId },
      });

      if (!loanType || loanType.deletedAt || !loanType.isActive) {
        throw new Error("Loan type not found or inactive");
      }

      const amount = data.principalAmount
        ? new Decimal(data.principalAmount)
        : loan.principalAmount;
      if (amount.lt(loanType.minAmount) || amount.gt(loanType.maxAmount)) {
        throw new Error(
          `Principal amount must be between ${loanType.minAmount} and ${loanType.maxAmount}`
        );
      }
    }

    const updateData: any = {};

    if (data.loanTypeId) updateData.loanTypeId = data.loanTypeId;
    if (data.principalAmount)
      updateData.principalAmount = new Decimal(data.principalAmount);
    if (data.termCount) updateData.termCount = data.termCount;
    if (data.termUnit) updateData.termUnit = data.termUnit;
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
      updateData.endDate = this.calculateEndDate(
        new Date(data.startDate),
        data.termCount || loan.termCount,
        data.termUnit || loan.termUnit
      );
    }
    if (data.processingFeeAmount !== undefined)
      updateData.processingFeeAmount = new Decimal(data.processingFeeAmount);
    if (data.penaltyFeePerDayAmount !== undefined)
      updateData.penaltyFeePerDayAmount = new Decimal(
        data.penaltyFeePerDayAmount
      );
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        loanType: true,
        branch: true,
        assignedOfficer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Regenerate schedule if amount or terms changed
    if (
      data.principalAmount ||
      data.termCount ||
      data.termUnit ||
      data.startDate
    ) {
      await prisma.repaymentScheduleItem.deleteMany({
        where: { loanId: id },
      });

      await this.generateRepaymentSchedule(
        id,
        updatedLoan.principalAmount.toNumber(),
        updatedLoan.termCount,
        updatedLoan.termUnit,
        updatedLoan.startDate,
        0
      );
    }

    return updatedLoan;
  }
  static async updateLoanStatus(
    id: string,
    newStatus: LoanStatus,
    notes: string | undefined,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER) {
      throw new Error(
        "Credit officers cannot change loan status. Contact your branch manager."
      );
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to update this loan");
    }

    // Validate status transitions
    this.validateStatusTransition(loan.status, newStatus);

    const updateData: any = {
      status: newStatus,
    };

    if (notes) {
      updateData.notes = loan.notes ? `${loan.notes}\n\n${notes}` : notes;
    }

    if (
      newStatus === LoanStatus.COMPLETED ||
      newStatus === LoanStatus.WRITTEN_OFF ||
      newStatus === LoanStatus.CANCELED
    ) {
      updateData.closedAt = new Date();
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        loanType: true,
        assignedOfficer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updatedLoan;
  }

  static validateStatusTransition(
    currentStatus: LoanStatus,
    newStatus: LoanStatus
  ) {
    const validTransitions: Record<LoanStatus, LoanStatus[]> = {
      [LoanStatus.DRAFT]: [LoanStatus.PENDING_APPROVAL, LoanStatus.CANCELED],
      [LoanStatus.PENDING_APPROVAL]: [LoanStatus.APPROVED, LoanStatus.CANCELED],
      [LoanStatus.APPROVED]: [LoanStatus.ACTIVE, LoanStatus.CANCELED],
      [LoanStatus.ACTIVE]: [
        LoanStatus.COMPLETED,
        LoanStatus.DEFAULTED,
        LoanStatus.WRITTEN_OFF,
      ],
      [LoanStatus.COMPLETED]: [],
      [LoanStatus.DEFAULTED]: [LoanStatus.WRITTEN_OFF, LoanStatus.ACTIVE],
      [LoanStatus.WRITTEN_OFF]: [],
      [LoanStatus.CANCELED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  static async disburseLoan(
    id: string,
    disbursedAt: Date | undefined,
    userRole: Role,
    userBranchId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    if (loan.status !== LoanStatus.APPROVED) {
      throw new Error("Only approved loans can be disbursed");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER) {
      throw new Error("Only branch managers and admins can disburse loans");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to disburse this loan");
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.ACTIVE,
        disbursedAt: disbursedAt || new Date(),
      },
      include: {
        customer: true,
        loanType: true,
        assignedOfficer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updatedLoan;
  }

  static async assignLoan(
    id: string,
    newOfficerId: string,
    reason: string | undefined,
    changedByUserId: string,
    userRole: Role,
    userBranchId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER) {
      throw new Error("Credit officers cannot reassign loans");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to reassign this loan");
    }

    // Validate new officer
    const newOfficer = await prisma.user.findUnique({
      where: { id: newOfficerId },
    });

    if (!newOfficer || newOfficer.deletedAt || !newOfficer.isActive) {
      throw new Error("Officer not found or inactive");
    }

    if (newOfficer.role === Role.ADMIN) {
      throw new Error("Cannot assign loan to an admin");
    }

    if (newOfficer.branchId !== loan.branchId) {
      throw new Error("Officer must belong to the same branch as the loan");
    }

    const oldOfficerId = loan.assignedOfficerId;

    // Update loan and create assignment history
    const [updatedLoan] = await prisma.$transaction([
      prisma.loan.update({
        where: { id },
        data: {
          assignedOfficerId: newOfficerId,
        },
        include: {
          customer: true,
          assignedOfficer: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.loanAssignmentHistory.create({
        data: {
          loanId: id,
          oldOfficerId,
          newOfficerId,
          oldBranchId: loan.branchId,
          newBranchId: loan.branchId,
          changedByUserId,
          reason,
        },
      }),
    ]);

    return updatedLoan;
  }

  static async deleteLoan(
    id: string,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Only drafts and pending approvals can be deleted
    if (
      loan.status !== LoanStatus.DRAFT && loan.status !== LoanStatus.PENDING_APPROVAL
    ) {
      throw new Error("Only draft or pending approval loans can be deleted");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER && loan.assignedOfficerId !== userId) {
      throw new Error("You do not have permission to delete this loan");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to delete this loan");
    }

    // Soft delete
    await prisma.loan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async getLoanSchedule(
    id: string,
    userRole: Role,
    userBranchId?: string,
    userId?: string
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    // Permission check
    if (userRole === Role.CREDIT_OFFICER && loan.assignedOfficerId !== userId) {
      throw new Error("You do not have permission to view this loan");
    }

    if (
      userRole === Role.BRANCH_MANAGER &&
      userBranchId &&
      loan.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to view this loan");
    }

    const scheduleItems = await prisma.repaymentScheduleItem.findMany({
      where: {
        loanId: id,
        deletedAt: null,
      },
      include: {
        allocations: {
          include: {
            repayment: {
              select: {
                id: true,
                amount: true,
                paidAt: true,
                method: true,
              },
            },
          },
        },
      },
      orderBy: { sequence: "asc" },
    });

    return scheduleItems;
  }

  static async getLoanSummary(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        scheduleItems: {
          where: { deletedAt: null },
        },
        repayments: {
          where: { deletedAt: null },
        },
      },
    });

    if (!loan || loan.deletedAt) {
      throw new Error("Loan not found");
    }

    const totalExpected = loan.scheduleItems.reduce(
      (sum: Decimal, item: any) => sum.plus(item.totalDue),
      new Decimal(0)
    );

    const totalPaid = loan.repayments.reduce(
      (sum: Decimal, payment: any) => sum.plus(payment.amount),
      new Decimal(0)
    );

    const totalOutstanding = totalExpected.minus(totalPaid);

    const overdueItems = loan.scheduleItems.filter(
      (item: any) => item.status === ScheduleStatus.OVERDUE
    );

    const overdueAmount = overdueItems.reduce(
      (sum: Decimal, item: any) =>
        sum.plus(item.totalDue.minus(item.paidAmount)),
      new Decimal(0)
    );

    return {
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      principalAmount: loan.principalAmount,
      totalExpected,
      totalPaid,
      totalOutstanding,
      overdueAmount,
      overdueCount: overdueItems.length,
      completionPercentage: totalExpected.gt(0)
        ? totalPaid.div(totalExpected).mul(100).toFixed(2)
        : "0.00",
      status: loan.status,
    };
  }
}
