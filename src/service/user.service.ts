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
    console.log("UserService.createUser: Creating user with data:", {
      email: data.email,
      role: data.role,
      branchId: data.branchId,
      creatorRole: creatorRole,
    });

    // Role-based permission validation
    if (creatorRole === Role.BRANCH_MANAGER && data.role === Role.ADMIN) {
      throw new Error("Branch managers cannot create admin users");
    }

    if (creatorRole === Role.CREDIT_OFFICER) {
      throw new Error("Credit officers cannot create users");
    }

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

  static async getUsers(
    filters: GetUsersFilters,
    userRole: Role,
    userBranchId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    console.log("UserService.getUsers: Request from user:", {
      userRole,
      userBranchId,
      filters,
    });

    const where: any = {
      deletedAt: null,
    };

    // Branch managers can only see users from their branch
    if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      where.branchId = userBranchId;
      console.log(
        "UserService.getUsers: BRANCH_MANAGER filtering by branchId:",
        userBranchId
      );
    }
    // Credit officers can only see users from their branch
    else if (userRole === Role.CREDIT_OFFICER && userBranchId) {
      where.branchId = userBranchId;
      console.log(
        "UserService.getUsers: CREDIT_OFFICER filtering by branchId:",
        userBranchId
      );
    }
    // Admins can see all users
    else if (userRole === Role.ADMIN) {
      console.log("UserService.getUsers: ADMIN - no branch filtering applied");
    }

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
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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

  static async getUserById(id: string, userRole: Role, userBranchId?: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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

    // Role-based access restrictions
    if (userRole === Role.ADMIN) {
      // ADMIN can view any user
      console.log("ADMIN user - allowing access to user:", id);
    } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
      // Branch managers can view users from their branch or unassigned users
      if (user.branchId && user.branchId !== userBranchId) {
        throw new Error("You can only view users from your own branch");
      }
      console.log(
        "BRANCH_MANAGER user - allowing access to user in branch:",
        userBranchId
      );
    } else if (userRole === Role.CREDIT_OFFICER && userBranchId) {
      // Credit officers can view users from their branch or unassigned users
      if (user.branchId && user.branchId !== userBranchId) {
        throw new Error("You can only view users from your own branch");
      }
      console.log(
        "CREDIT_OFFICER user - allowing access to user in branch:",
        userBranchId
      );
    } else {
      // Unknown role - deny access
      throw new Error("You do not have permission to view this user");
    }

    return user;
  }

  static async updateUser(id: string, data: UpdateUserData, updaterId: string) {
    console.log(`Updating user ${id} with data:`, data);

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    console.log(`Current user data:`, {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

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

    // Validate branch assignment
    if (data.branchId) {
      // Validate that the branch exists and is active
      const branch = await prisma.branch.findUnique({
        where: { id: data.branchId },
      });

      if (!branch || branch.deletedAt || !branch.isActive) {
        throw new Error("Invalid or inactive branch");
      }
    }

    // Validate role and branch combination
    if (data.role && data.role !== Role.ADMIN) {
      // For non-admin roles, ensure they have a branch
      const targetBranchId = data.branchId || user.branchId;
      if (!targetBranchId) {
        throw new Error(
          "Branch Manager and Credit Officer must be assigned to a branch"
        );
      }
    }

    // If we're only updating branchId (not role), allow unassignment
    // This allows users to be unassigned from branches temporarily
    if (data.branchId === null && !data.role) {
      // Allow unassignment - user can be reassigned later
      console.log(`Allowing branch unassignment for user ${id}`);
    }

    // Check if user is being unassigned from a branch and is currently a manager
    let managedBranch: { id: string; name: string; code: string } | null = null;
    if (data.branchId === null && user.branchId) {
      // User is being unassigned from a branch, check if they're managing it
      managedBranch = await prisma.branch.findFirst({
        where: {
          managerId: id,
          deletedAt: null,
        },
        select: { id: true, name: true, code: true },
      });
    }

    // Use transaction to update user and unassign from branch management
    const updatedUser = await prisma.$transaction(async (tx: any) => {
      // Update the user
      const user = await tx.user.update({
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

      // If user was managing a branch, unassign them as manager
      if (managedBranch) {
        await tx.branch.update({
          where: { id: managedBranch.id },
          data: { managerId: null },
        });
        console.log(
          `Unassigned user ${id} as manager from branch ${managedBranch.name} (${managedBranch.code})`
        );
      }

      return user;
    });

    console.log(`User updated successfully:`, {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      branchId: updatedUser.branchId,
      branch: updatedUser.branch,
    });

    return updatedUser;
  }

  static async deleteUser(
    id: string,
    deleterId: string,
    deleterRole: Role,
    deleterBranchId?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    // Prevent users from deleting themselves
    if (id === deleterId) {
      throw new Error("You cannot delete your own account");
    }

    // Role-based deletion restrictions
    if (deleterRole === Role.CREDIT_OFFICER) {
      throw new Error("Credit officers cannot delete users");
    }

    if (deleterRole === Role.BRANCH_MANAGER) {
      // Branch managers can only delete users from their branch
      if (user.branchId !== deleterBranchId) {
        throw new Error("You can only delete users from your own branch");
      }
      // Branch managers cannot delete other admins
      if (user.role === Role.ADMIN) {
        throw new Error("Branch managers cannot delete admin users");
      }
    }

    // Admins can delete anyone (including other admins)
    // No additional restrictions for admins

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
