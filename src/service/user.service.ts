import { Role } from "@prisma/client";
import prisma from "../prismaClient";
import { PasswordUtil } from "../utils/password.util";

interface CreateUserData {
  email: string;
  password: string;
  role: Role;
  branchId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

interface UpdateUserData {
  email?: string;
  role?: Role;
  branchId?: string | null;
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

interface BulkUserOperation {
  userIds: string[];
  operation:
    | "activate"
    | "deactivate"
    | "changeRole"
    | "assignBranch"
    | "unassignBranch";
  data?: {
    role?: Role;
    branchId?: string;
  };
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

    // Branch assignment is optional - users can be created without branches
    // and assigned to branches later
    if (data.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });

      if (!branch || branch.deletedAt) {
        throw new Error("Branch not found");
      }

      // Check if branch manager already exists for this branch
      if (data.role === Role.BRANCH_MANAGER) {
        const existingManager = await prisma.user.findFirst({
          where: {
            role: Role.BRANCH_MANAGER,
            branchId: data.branchId,
            deletedAt: null,
          },
        });

        if (existingManager) {
          throw new Error("Branch already has a manager");
        }
      }
    }

    const passwordHash = await PasswordUtil.hash(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
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

  static async bulkUserOperation(
    operation: BulkUserOperation,
    operatorId: string
  ) {
    try {
      const { userIds, operation: op, data } = operation;

      if (!userIds || userIds.length === 0) {
        throw new Error("No users selected for operation");
      }

      // Validate operator permissions
      const operator = await prisma.user.findUnique({
        where: { id: operatorId },
        select: { role: true },
      });

      if (!operator || operator.role !== "ADMIN") {
        throw new Error("Only admins can perform bulk operations");
      }

      // Validate all users exist
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          deletedAt: null,
        },
        select: { id: true, email: true, role: true },
      });

      if (users.length !== userIds.length) {
        throw new Error("Some users not found");
      }

      let updateData: any = {};
      let result: any = {};

      switch (op) {
        case "activate":
          updateData = { isActive: true };
          result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
          });
          break;

        case "deactivate":
          updateData = { isActive: false };
          result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
          });
          break;

        case "changeRole":
          if (!data?.role) {
            throw new Error("Role is required for changeRole operation");
          }
          updateData = { role: data.role };
          result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
          });
          break;

        case "assignBranch":
          if (!data?.branchId) {
            throw new Error("Branch ID is required for assignBranch operation");
          }
          // Validate branch exists
          const branch = await prisma.branch.findUnique({
            where: { id: data.branchId },
          });
          if (!branch) {
            throw new Error("Branch not found");
          }
          updateData = { branchId: data.branchId };
          result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
          });
          break;

        case "unassignBranch":
          updateData = { branchId: null };
          result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updateData,
          });
          break;

        default:
          throw new Error("Invalid operation");
      }

      return {
        success: true,
        operation: op,
        affectedUsers: result.count,
        userIds,
      };
    } catch (error: any) {
      throw new Error(error.message || "Bulk operation failed");
    }
  }

  static async exportUsers(filters: GetUsersFilters) {
    try {
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
        where.OR = [
          {
            email: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            firstName: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          role: true,
          isActive: true,
          branchId: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return users;
    } catch (error: any) {
      throw new Error(error.message || "Failed to export users");
    }
  }

  static async importUsers(usersData: any[], importerId: string) {
    try {
      // Validate importer permissions
      const importer = await prisma.user.findUnique({
        where: { id: importerId },
        select: { role: true },
      });

      if (!importer || importer.role !== "ADMIN") {
        throw new Error("Only admins can import users");
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const userData of usersData) {
        try {
          // Validate required fields
          if (!userData.email || !userData.password || !userData.role) {
            results.failed++;
            results.errors.push(
              `User ${userData.email || "unknown"}: Missing required fields`
            );
            continue;
          }

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
          });

          if (existingUser) {
            results.failed++;
            results.errors.push(`User ${userData.email}: Email already exists`);
            continue;
          }

          // Validate password
          const validation = PasswordUtil.validate(userData.password);
          if (!validation.valid) {
            results.failed++;
            results.errors.push(
              `User ${userData.email}: ${validation.message}`
            );
            continue;
          }

          // Validate branch if provided
          if (userData.branchId) {
            const branch = await prisma.branch.findUnique({
              where: { id: userData.branchId },
            });
            if (!branch) {
              results.failed++;
              results.errors.push(`User ${userData.email}: Branch not found`);
              continue;
            }
          }

          // Create user
          await prisma.user.create({
            data: {
              email: userData.email,
              passwordHash: await PasswordUtil.hash(userData.password),
              role: userData.role,
              branchId: userData.branchId,
              firstName: userData.firstName,
              lastName: userData.lastName,
              phone: userData.phone,
              address: userData.address,
            },
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(
            `User ${userData.email || "unknown"}: ${error.message}`
          );
        }
      }

      return results;
    } catch (error: any) {
      throw new Error(error.message || "Failed to import users");
    }
  }
}
