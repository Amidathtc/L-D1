import { Role } from "@prisma/client";
import prisma from "../prismaClient";
import { PasswordUtil } from "../utils/password.util";

interface CreateUserData {
  email: string;
  password: string;
  role: Role;
  branchId?: string;
}

interface UpdateUserData {
  email?: string;
  role?: Role;
  branchId?: string | null;
  isActive?: boolean;
}

interface GetUsersFilters {
  page?: number;
  limit?: number;
  role?: Role;
  branchId?: string;
  isActive?: boolean;
  search?: string;
}

export class UserService {
  static async createUser(data: CreateUserData, creatorRole: Role) {
    // Validate email doesn't exist
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Validate password
    const validation = PasswordUtil.validate(data.password);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Validate branch assignment for non-admin roles
    if (data.role !== Role.ADMIN && !data.branchId) {
      throw new Error(
        "Branch Manager and Credit Officer must be assigned to a branch"
      );
    }

    // Validate branch exists
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });

      if (!branch || branch.deletedAt) {
        throw new Error("Branch not found");
      }
    }

    const passwordHash = await PasswordUtil.hash(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        branchId: data.branchId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdAt: true,
      },
    });

    return user;
  }

  static async getUsers(filters: GetUsersFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.email = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          branchId: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        managedBranch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            createdLoans: true,
            assignedLoans: true,
            repayments: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    return user;
  }

  static async updateUser(id: string, data: UpdateUserData, updaterId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    // Prevent users from deactivating themselves
    if (id === updaterId && data.isActive === false) {
      throw new Error("You cannot deactivate your own account");
    }

    // Validate email if changing
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error("Email already exists");
      }
    }

    // Validate branch if changing role
    if (
      data.role &&
      data.role !== Role.ADMIN &&
      !data.branchId &&
      !user.branchId
    ) {
      throw new Error(
        "Branch Manager and Credit Officer must be assigned to a branch"
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        role: data.role,
        branchId: data.branchId,
        isActive: data.isActive,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  static async deleteUser(id: string, deleterId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    // Prevent users from deleting themselves
    if (id === deleterId) {
      throw new Error("You cannot delete your own account");
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Revoke all sessions
    await prisma.staffSession.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  static async resetUserPassword(id: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    const validation = PasswordUtil.validate(newPassword);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const passwordHash = await PasswordUtil.hash(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke all existing sessions
    await prisma.staffSession.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
