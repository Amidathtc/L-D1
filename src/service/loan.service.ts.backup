import { Decimal } from "@prisma/client/runtime/library";
import { Role, LoanStatus, TermUnit, ScheduleStatus } from "@prisma/client";
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
  assignedOfficerId?: string; // Add assigned officer ID
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
    userBranchId: string | null,
    userRole: Role
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

    // Validate assigned officer if provided
    if (data.assignedOfficerId) {
      const assignedOfficer = await prisma.user.findUnique({
        where: { id: data.assignedOfficerId },
        include: { branch: true },
      });

      if (!assignedOfficer || assignedOfficer.deletedAt) {
        throw new Error("Assigned officer not found");
      }

      if (
        assignedOfficer.role !== Role.CREDIT_OFFICER &&
        assignedOfficer.role !== Role.BRANCH_MANAGER
      ) {
        throw new Error(
          "Assigned officer must be a credit officer or branch manager"
        );
      }

      // Ensure assigned officer belongs to the same branch as the customer
      if (assignedOfficer.branchId !== customer.branchId) {
        throw new Error(
          "Assigned officer must belong to the same branch as the customer"
        );
      }
    }

    // Check for active loans for this customer
    const activeLoan = await prisma.loan.findFirst({
      where: {
        customerId: data.customerId,
        status: {
          in: [
            LoanStatus.ACTIVE,
            LoanStatus.PENDING_APPROVAL,
            LoanStatus.APPROVED,
          ],
        },
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

    // Determine initial loan status based on user role
    let initialStatus: LoanStatus = LoanStatus.DRAFT;
    if (userRole === Role.ADMIN) {
      initialStatus = LoanStatus.APPROVED;
    } else if (
      userRole === Role.BRANCH_MANAGER ||
      userRole === Role.CREDIT_OFFICER
    ) {
      initialStatus = LoanStatus.PENDING_APPROVAL;
    }

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
        status: initialStatus,
        createdByUserId,
        assignedOfficerId:
          data.assignedOfficerId ||
          customer.currentOfficerId ||
          createdByUserId,
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
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Generate repayment schedule
    try {
      console.log("Generating repayment schedule for loan:", loan.id);
      console.log("Loan data:", {
        principalAmount: data.principalAmount,
        termCount: data.termCount,
        termUnit: data.termUnit,
        startDate: startDate,
        interestRate: 0, // Default interest rate since it's not stored in the loan model
      });

      await this.generateRepaymentSchedule(
        loan.id,
        data.principalAmount,
        data.termCount,
        data.termUnit,
        startDate,
        0 // Default interest rate since it's not stored in the loan model
      );

      console.log(
        "✅ Repayment schedule generated successfully for loan:",
        loan.id
      );
    } catch (error) {
      console.error(
        "❌ Failed to generate repayment schedule for loan:",
        loan.id,
        error
      );
      console.error("Error details:", error);

      // For now, don't throw error to prevent loan creation from failing
      // The repayment schedule can be generated later using the generateMissingSchedules method
      // TODO: Consider making schedule generation mandatory for certain loan statuses
    }

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
    console.log("generateRepaymentSchedule called with:", {
      loanId,
      principalAmount,
      termCount,
      termUnit,
      startDate,
      interestRate,
    });

    const principal = new Decimal(principalAmount);
    const principalPerPayment = principal.div(termCount);

    // Calculate total interest
    const annualRate = new Decimal(interestRate).div(100);
    const totalInterest = principal
      .mul(annualRate)
      .mul(this.getYearFraction(termCount, termUnit));
    const interestPerPayment = totalInterest.div(termCount);

    console.log("Calculated values:", {
      principal: principal.toString(),
      principalPerPayment: principalPerPayment.toString(),
      annualRate: annualRate.toString(),
      totalInterest: totalInterest.toString(),
      interestPerPayment: interestPerPayment.toString(),
    });

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

    console.log(
      "Creating repayment schedule items:",
      scheduleItems.length,
      "items"
    );
    console.log("First few items:", scheduleItems.slice(0, 3));

    const result = await prisma.repaymentScheduleItem.createMany({
      data: scheduleItems,
    });

    console.log(
      "Repayment schedule items created:",
      result.count,
      "items for loan:",
      loanId
    );
  }

  static getYearFraction(termCount: number, termUnit: TermUnit): Decimal {
    switch (termUnit) {
      case TermUnit.DAY:
        return new Decimal(termCount).div(365);
      case TermUnit.WEEK:
        return new Decimal(termCount).mul(7).div(365);
      case TermUnit.MONTH:
        return new Decimal(termCount).div(12);
      default:
        return new Decimal(termCount).div(365); // Default to daily
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
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
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

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can view all loans - no restrictions
      console.log("ADMIN user - allowing access to loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can only view loans they are assigned to
      if (loan.assignedOfficerId !== userId) {
        throw new Error("You do not have permission to view this loan");
      }
      console.log(
        "CREDIT_OFFICER user - allowing access to assigned loan:",
        id
      );
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only view loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to view this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing access to loan in branch:",
        userBranchId
      );
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

    // Only drafts and pending approval loans can be updated
    if (
      loan.status !== LoanStatus.DRAFT &&
      loan.status !== LoanStatus.PENDING_APPROVAL
    ) {
      throw new Error("Only draft and pending approval loans can be updated");
    }

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can update all loans - no restrictions
      console.log("ADMIN user - allowing update to loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can only update loans they are assigned to
      if (loan.assignedOfficerId !== userId) {
        throw new Error("You do not have permission to update this loan");
      }
      console.log(
        "CREDIT_OFFICER user - allowing update to assigned loan:",
        id
      );
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only update loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to update this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing update to loan in branch:",
        userBranchId
      );
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
            firstName: true,
            lastName: true,
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

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can update status of all loans - no restrictions
      console.log("ADMIN user - allowing status update of loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER cannot change loan status
      throw new Error(
        "Credit officers cannot change loan status. Contact your branch manager."
      );
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only update status of loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to update this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing status update of loan in branch:",
        userBranchId
      );
    }

    // Validate status transitions
    this.validateStatusTransition(loan.status, newStatus);

    const updateData: any = {
      status: newStatus,
    };

    if (notes) {
      updateData.notes = loan.notes ? `${loan.notes}\n\n${notes}` : notes;
    }

    // Set processingFeeCollected to true when loan is approved
    if (newStatus === LoanStatus.APPROVED) {
      updateData.processingFeeCollected = true;
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
      DRAFT: [
        LoanStatus.PENDING_APPROVAL,
        LoanStatus.APPROVED,
        LoanStatus.CANCELED,
      ],
      PENDING_APPROVAL: [LoanStatus.APPROVED, LoanStatus.CANCELED],
      APPROVED: [LoanStatus.ACTIVE, LoanStatus.CANCELED],
      ACTIVE: [
        LoanStatus.COMPLETED,
        LoanStatus.DEFAULTED,
        LoanStatus.WRITTEN_OFF,
      ],
      COMPLETED: [],
      DEFAULTED: [LoanStatus.WRITTEN_OFF, LoanStatus.ACTIVE],
      WRITTEN_OFF: [],
      CANCELED: [],
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

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can disburse all loans - no restrictions
      console.log("ADMIN user - allowing disbursement of loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER cannot disburse loans
      throw new Error("Only branch managers and admins can disburse loans");
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only disburse loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to disburse this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing disbursement of loan in branch:",
        userBranchId
      );
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

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can reassign all loans - no restrictions
      console.log("ADMIN user - allowing reassignment of loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER cannot reassign loans
      throw new Error("Credit officers cannot reassign loans");
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only reassign loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to reassign this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing reassignment of loan in branch:",
        userBranchId
      );
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
      loan.status !== LoanStatus.DRAFT &&
      loan.status !== LoanStatus.PENDING_APPROVAL
    ) {
      throw new Error("Only draft or pending approval loans can be deleted");
    }

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can delete all loans - no restrictions
      console.log("ADMIN user - allowing delete of loan:", id);
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can only delete loans they are assigned to
      if (loan.assignedOfficerId !== userId) {
        throw new Error("You do not have permission to delete this loan");
      }
      console.log(
        "CREDIT_OFFICER user - allowing delete of assigned loan:",
        id
      );
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only delete loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to delete this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing delete of loan in branch:",
        userBranchId
      );
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

    // Permission check based on role
    if (userRole === Role.ADMIN) {
      // ADMIN can view all loans
      console.log("ADMIN user - allowing access to loan:", id);
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // BRANCH_MANAGER can only view loans in their branch
      if (loan.branchId !== userBranchId) {
        throw new Error("You do not have permission to view this loan");
      }
      console.log(
        "BRANCH_MANAGER user - allowing access to loan in branch:",
        userBranchId
      );
    } else if (userRole === Role.CREDIT_OFFICER) {
      // CREDIT_OFFICER can view loans they created or are assigned to
      if (
        loan.createdByUserId !== userId &&
        loan.assignedOfficerId !== userId
      ) {
        throw new Error("You do not have permission to view this loan");
      }
      console.log(
        "CREDIT_OFFICER user - allowing access to loan created by or assigned to:",
        userId
      );
    } else {
      // Unknown role - deny access
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

    // Debug logging
    console.log("=== getLoanSummary DEBUG ===");
    console.log("Loan ID:", id);
    console.log("Schedule Items count:", loan.scheduleItems.length);
    console.log("Repayments count:", loan.repayments.length);

    // Calculate total paid from schedule items (this is the source of truth for paid amounts)
    // The paidAmount field on RepaymentScheduleItem gets updated when allocations are made
    const totalPaidFromSchedule = loan.scheduleItems.reduce(
      (sum: Decimal, item: any) => {
        const paidAmount = new Decimal(item.paidAmount || 0);
        console.log(
          `Schedule Item ${
            item.sequence
          }: paidAmount = ${paidAmount.toString()}`
        );
        return sum.plus(paidAmount);
      },
      new Decimal(0)
    );

    console.log(
      "Total paid (from schedule items):",
      totalPaidFromSchedule.toString()
    );

    // Also log repayments for verification
    const repaymentTotal = loan.repayments.reduce(
      (sum: Decimal, payment: any) =>
        sum.plus(new Decimal(payment.amount || 0)),
      new Decimal(0)
    );
    console.log(
      "Total from repayments table (for verification):",
      repaymentTotal.toString()
    );

    // Total outstanding = Principal Amount - Total Paid
    const totalOutstanding = new Decimal(loan.principalAmount).minus(
      totalPaidFromSchedule
    );

    // Total expected = Principal + all interest and fees from schedule items
    const totalExpected = loan.scheduleItems.reduce(
      (sum: Decimal, item: any) => sum.plus(item.totalDue),
      new Decimal(0)
    );

    const overdueItems = loan.scheduleItems.filter(
      (item: any) => item.status === ScheduleStatus.OVERDUE
    );

    const overdueAmount = overdueItems.reduce(
      (sum: Decimal, item: any) =>
        sum.plus(item.totalDue.minus(item.paidAmount)),
      new Decimal(0)
    );

    // Convert Decimal values to numbers for JSON serialization
    const result = {
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      principalAmount: parseFloat(new Decimal(loan.principalAmount).toString()),
      totalExpected: parseFloat(totalExpected.toString()),
      totalPaid: parseFloat(totalPaidFromSchedule.toString()),
      totalOutstanding: parseFloat(totalOutstanding.toString()),
      overdueAmount: parseFloat(overdueAmount.toString()),
      overdueCount: overdueItems.length,
      completionPercentage: new Decimal(loan.principalAmount).gt(0)
        ? parseFloat(
            totalPaidFromSchedule
              .div(new Decimal(loan.principalAmount))
              .mul(100)
              .toFixed(2)
          )
        : 0,
      status: loan.status,
    };

    console.log("=== getLoanSummary FINAL RESULT ===");
    console.log("Final summary:", result);

    return result;
  }

  static async generateMissingSchedules() {
    console.log("Checking for loans without repayment schedules...");

    // Find loans that don't have repayment schedules
    const loansWithoutSchedules = await prisma.loan.findMany({
      where: {
        deletedAt: null,
        scheduleItems: {
          none: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        loanNumber: true,
        principalAmount: true,
        termCount: true,
        termUnit: true,
        startDate: true,
        status: true,
      },
    });

    console.log(
      `Found ${loansWithoutSchedules.length} loans without repayment schedules`
    );

    let generatedCount = 0;
    let errorCount = 0;

    for (const loan of loansWithoutSchedules) {
      try {
        console.log(
          `Generating schedule for loan ${loan.loanNumber} (${loan.id})`
        );

        await this.generateRepaymentSchedule(
          loan.id,
          loan.principalAmount.toNumber(),
          loan.termCount,
          loan.termUnit,
          loan.startDate,
          0 // Default interest rate since it's not stored in the loan model
        );

        generatedCount++;
        console.log(
          `✅ Successfully generated schedule for loan ${loan.loanNumber}`
        );
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to generate schedule for loan ${loan.loanNumber}:`,
          error
        );
      }
    }

    console.log(
      `Schedule generation complete: ${generatedCount} successful, ${errorCount} failed`
    );

    return {
      totalLoans: loansWithoutSchedules.length,
      generatedCount,
      errorCount,
    };
  }
}
