import { Role } from "@prisma/client";
import prisma from "../prismaClient";

interface CreateCustomerData {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  branchId: string;
  currentOfficerId?: string;
}

interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  branchId?: string;
  currentOfficerId?: string;
}

interface GetCustomersFilters {
  page?: number;
  limit?: number;
  branchId?: string;
  currentOfficerId?: string;
  search?: string;
}

export class CustomerService {
  static async createCustomer(data: CreateCustomerData, creatorId: string) {
    // Validate branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: data.branchId },
    });

    if (!branch || branch.deletedAt) {
      throw new Error("Branch not found");
    }

    // Validate officer if provided
    if (data.currentOfficerId) {
      const officer = await prisma.user.findUnique({
        where: { id: data.currentOfficerId },
      });

      if (!officer || officer.deletedAt) {
        throw new Error("Officer not found");
      }

      if (officer.role === Role.ADMIN) {
        throw new Error("Admin cannot be assigned as customer officer");
      }

      if (officer.branchId !== data.branchId) {
        throw new Error("Officer must belong to the same branch as customer");
      }
    }

    // Check if email exists
    if (data.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
        },
      });

      if (existingCustomer) {
        throw new Error("Email already exists");
      }
    }

    // Generate customer code
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { createdAt: "desc" },
      where: { code: { not: null } },
    });

    let nextNumber = 1;
    if (lastCustomer?.code) {
      const lastNumber = parseInt(lastCustomer.code.replace("CUST", ""));
      nextNumber = lastNumber + 1;
    }

    const code = `CUST${String(nextNumber).padStart(6, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        ...data,
        code,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        currentOfficer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return customer;
  }

  static async getCustomers(
    filters: GetCustomersFilters,
    userRole: Role,
    userBranchId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    // Branch managers and credit officers can only see customers from their branch
    if (userRole !== Role.ADMIN && userBranchId) {
      where.branchId = userBranchId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.currentOfficerId) {
      where.currentOfficerId = filters.currentOfficerId;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
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
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  static async getCustomerById(
    id: string,
    userRole: Role,
    userBranchId?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        currentOfficer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        loans: {
          where: { deletedAt: null },
          select: {
            id: true,
            loanNumber: true,
            principalAmount: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        documents: {
          where: { deletedAt: null },
          select: {
            id: true,
            documentType: true,
            fileUrl: true,
            verified: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        _count: {
          select: {
            loans: true,
            documents: true,
            reassignments: true,
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Branch managers and credit officers can only view customers from their branch
    if (
      userRole !== Role.ADMIN &&
      userBranchId &&
      customer.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to view this customer");
    }

    return customer;
  }

  static async updateCustomer(
    id: string,
    data: UpdateCustomerData,
    userRole: Role,
    userBranchId?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Check permissions
    if (
      userRole !== Role.ADMIN &&
      userBranchId &&
      customer.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to update this customer");
    }

    // Validate branch if changing
    if (data.branchId && data.branchId !== customer.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });

      if (!branch || branch.deletedAt) {
        throw new Error("Branch not found");
      }
    }

    // Validate officer if changing
    if (data.currentOfficerId) {
      const officer = await prisma.user.findUnique({
        where: { id: data.currentOfficerId },
      });

      if (!officer || officer.deletedAt) {
        throw new Error("Officer not found");
      }

      const targetBranchId = data.branchId || customer.branchId;
      if (officer.branchId !== targetBranchId) {
        throw new Error("Officer must belong to the same branch as customer");
      }
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== customer.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingCustomer) {
        throw new Error("Email already exists");
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        currentOfficer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updatedCustomer;
  }

  static async deleteCustomer(
    id: string,
    userRole: Role,
    userBranchId?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loans: true,
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    // Check permissions
    if (
      userRole !== Role.ADMIN &&
      userBranchId &&
      customer.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to delete this customer");
    }

    // Check if customer has active loans
    const activeLoans = await prisma.loan.count({
      where: {
        customerId: id,
        status: { in: ["ACTIVE", "PENDING_APPROVAL", "APPROVED"] },
        deletedAt: null,
      },
    });

    if (activeLoans > 0) {
      throw new Error("Cannot delete customer with active loans");
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async reassignCustomer(
    id: string,
    newBranchId: string | undefined,
    newOfficerId: string | undefined,
    reason: string | undefined,
    changedById: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    const oldBranchId = customer.branchId;
    const oldOfficerId = customer.currentOfficerId;

    // Validate new branch
    if (newBranchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: newBranchId },
      });

      if (!branch || branch.deletedAt) {
        throw new Error("New branch not found");
      }
    }

    // Validate new officer
    if (newOfficerId) {
      const officer = await prisma.user.findUnique({
        where: { id: newOfficerId },
      });

      if (!officer || officer.deletedAt) {
        throw new Error("New officer not found");
      }

      const targetBranchId = newBranchId || customer.branchId;
      if (officer.branchId !== targetBranchId) {
        throw new Error("Officer must belong to the target branch");
      }
    }

    // Update customer and create reassignment record
    const [updatedCustomer] = await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: {
          branchId: newBranchId || customer.branchId,
          currentOfficerId: newOfficerId,
        },
        include: {
          branch: true,
          currentOfficer: true,
        },
      }),
      prisma.customerReassignment.create({
        data: {
          customerId: id,
          oldBranchId,
          newBranchId: newBranchId || oldBranchId,
          oldOfficerId,
          newOfficerId,
          changedByUserId: changedById,
          reason,
          previousOfficerEndAt: new Date(),
          newOfficerStartAt: new Date(),
        },
      }),
    ]);

    return updatedCustomer;
  }

  static async getCustomerLoans(
    id: string,
    userRole: Role,
    userBranchId?: string
  ) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new Error("Customer not found");
    }

    if (
      userRole !== Role.ADMIN &&
      userBranchId &&
      customer.branchId !== userBranchId
    ) {
      throw new Error("You do not have permission to view this customer");
    }

    const loans = await prisma.loan.findMany({
      where: {
        customerId: id,
        deletedAt: null,
      },
      include: {
        loanType: true,
        assignedOfficer: {
          select: {
            id: true,
            email: true,
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
    });

    return loans;
  }
}
