import { Role } from "@prisma/client";
import prisma from "../prismaClient";
import * as bcrypt from "bcryptjs";

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  address?: string;
  password?: string;
  supervisorId?: string;
  isActive?: boolean;
}

interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  phone?: string;
  address?: string;
  password?: string;
  supervisorId?: string;
  isActive?: boolean;
  profileImage?: string;
}

interface GetUsersFilters {
  page?: number;
  limit?: number;
  role?: Role;
  supervisorId?: string;
  isActive?: boolean;
  search?: string;
}

interface BulkOperationData {
  userIds: string[];
  operation: "activate" | "deactivate" | "changeRole" | "delete";
  data?: any;
}

export class UserService {
  /**
   * Create a new user with role-based validation
   */
  static async createUser(data: CreateUserData, creatorRole: Role) {
    console.log("UserService.createUser: Creating user with email:", data.email);

    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName || !data.role) {
      throw new Error("Email, firstName, lastName, and role are required");
    }

    // Normalize email
    const email = data.email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new Error("User with this email already exists");
    }

    // Permission checks
    if (creatorRole === Role.CREDIT_OFFICER) {
      throw new Error("Credit officers cannot create users");
    }

    // Supervisors can only create CREDIT_OFFICER roles
    if (creatorRole === Role.SUPERVISOR && data.role !== Role.CREDIT_OFFICER) {
      throw new Error("Supervisors can only create Credit Officers");
    }

    // If creating a SUPERVISOR or assigning a supervisor
    if (data.role === Role.SUPERVISOR && data.supervisorId) {
      // Verify supervisor exists and is ADMIN or SUPERVISOR
      const supervisor = await prisma.user.findUnique({
        where: { id: data.supervisorId },
      });

      if (!supervisor || supervisor.deletedAt) {
        throw new Error("Assigned supervisor not found");
      }

      if (supervisor.role !== Role.ADMIN && supervisor.role !== Role.SUPERVISOR) {
        throw new Error("Supervisor must have ADMIN or SUPERVISOR role");
      }
    }

    // If creating a CREDIT_OFFICER and supervisor is provided
    if (data.role === Role.CREDIT_OFFICER && data.supervisorId) {
      const supervisor = await prisma.user.findUnique({
        where: { id: data.supervisorId },
      });

      if (!supervisor || supervisor.deletedAt) {
        throw new Error("Assigned supervisor not found");
      }

      if (supervisor.role !== Role.ADMIN && supervisor.role !== Role.SUPERVISOR) {
        throw new Error("Supervisor must have ADMIN or SUPERVISOR role");
      }
    }

    // Hash password
    const password = data.password || "DefaultPassword@123";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: data.role,
        passwordHash,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        supervisorId: data.supervisorId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        isActive: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    console.log("UserService.createUser: User created successfully:", user.id);
    return user;
  }

  /**
   * Get users with role-based filtering
   */
  static async getUsers(
    filters: GetUsersFilters,
    userRole: Role,
    userSupervisorId: string | undefined,
    userId: string
  ) {
    console.log("UserService.getUsers: Fetching users with filters:", {
      role: filters.role,
      page: filters.page,
      limit: filters.limit,
    });

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause based on role
    const where: any = { deletedAt: null };

    // Apply role filtering if provided
    if (filters.role) {
      where.role = filters.role;
    }

    // Apply search filtering
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Apply active status filtering
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Permission-based filtering
    if (userRole === Role.CREDIT_OFFICER) {
      // Credit officers can only see themselves
      where.id = userId;
    } else if (userRole === Role.SUPERVISOR) {
      // Supervisors can see themselves and their credit officers
      where.OR = [
        { id: userId },
        { supervisorId: userId },
      ];
    }
    // ADMIN can see all users (no additional filtering)

    // Get total count
    const total = await prisma.user.count({ where });

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        isActive: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        loginCount: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return {
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single user by ID with permission checking
   */
  static async getUserById(
    userId: string,
    requesterRole: Role,
    requesterSupervisorId: string | undefined,
    requesterId?: string
  ) {
    console.log("UserService.getUserById: Fetching user:", userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        profileImage: true,
        isActive: true,
        supervisorId: true,
        deletedAt: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creditOfficers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        loginCount: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    // Permission check
    if (requesterRole === Role.CREDIT_OFFICER) {
      // Credit officers can only see themselves
      if (userId !== requesterId) {
        throw new Error("You can only view your own profile");
      }
    } else if (requesterRole === Role.SUPERVISOR) {
      // Supervisors can see themselves and their credit officers
      if (userId !== requesterId && user.supervisorId !== requesterId) {
        throw new Error("You can only view your own profile or your credit officers");
      }
    }
    // ADMIN can see any user

    return user;
  }

  /**
   * Update a user with role-based validation
   */
  static async updateUser(
    userId: string,
    data: UpdateUserData,
    updaterId: string,
    updaterRole: Role
  ) {
    console.log("UserService.updateUser: Updating user:", userId);

    // Get the user being updated
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, supervisorId: true, deletedAt: true },
    });

    if (!targetUser || targetUser.deletedAt) {
      throw new Error("User not found");
    }

    // Permission checks
    if (updaterRole === Role.CREDIT_OFFICER) {
      // Credit officers can only update themselves
      if (userId !== updaterId) {
        throw new Error("You can only update your own profile");
      }
      // Credit officers can only update certain fields
      const allowedFields = ["firstName", "lastName", "phone", "address", "profileImage"];
      const attemptedFields = Object.keys(data);
      const disallowedFields = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowedFields.length > 0) {
        throw new Error(`Credit officers cannot update: ${disallowedFields.join(", ")}`);
      }
    } else if (updaterRole === Role.SUPERVISOR) {
      // Supervisors can update themselves and their credit officers
      if (userId !== updaterId && targetUser.supervisorId !== updaterId) {
        throw new Error("You can only update your own profile or your credit officers");
      }

      // Supervisors cannot change role
      if (data.role && data.role !== targetUser.role) {
        throw new Error("Supervisors cannot change user roles");
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (data.email !== undefined) {
      const email = data.email.toLowerCase().trim();
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser && existingUser.id !== userId && !existingUser.deletedAt) {
        throw new Error("This email is already in use");
      }
      updateData.email = email;
    }

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }

    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone ? data.phone.trim() : null;
    }

    if (data.address !== undefined) {
      updateData.address = data.address ? data.address.trim() : null;
    }

    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage || null;
    }

    if (data.role !== undefined && updaterRole === Role.ADMIN) {
      updateData.role = data.role;
    }

    if (data.isActive !== undefined && updaterRole === Role.ADMIN) {
      updateData.isActive = data.isActive;
    }

    // Handle supervisor assignment (ADMIN only)
    if (data.supervisorId !== undefined && updaterRole === Role.ADMIN) {
      if (data.supervisorId === null) {
        updateData.supervisorId = null;
      } else {
        const supervisor = await prisma.user.findUnique({
          where: { id: data.supervisorId },
        });

        if (!supervisor || supervisor.deletedAt) {
          throw new Error("Assigned supervisor not found");
        }

        if (supervisor.role !== Role.ADMIN && supervisor.role !== Role.SUPERVISOR) {
          throw new Error("Supervisor must have ADMIN or SUPERVISOR role");
        }

        updateData.supervisorId = data.supervisorId;
      }
    }

    // Handle password change (ADMIN only via this method)
    if (data.password !== undefined && updaterRole === Role.ADMIN) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      updateData.passwordHash = passwordHash;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        profileImage: true,
        isActive: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("UserService.updateUser: User updated successfully:", userId);
    return updatedUser;
  }

  /**
   * Soft delete a user (mark as deleted)
   */
  static async deleteUser(
    userId: string,
    deleterId: string,
    deleterRole: Role,
    deleterSupervisorId: string | undefined
  ) {
    console.log("UserService.deleteUser: Deleting user:", userId);

    if (deleterRole !== Role.ADMIN) {
      throw new Error("Only admins can delete users");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.deletedAt) {
      throw new Error("User is already deleted");
    }

    // Soft delete: set deletedAt timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    console.log("UserService.deleteUser: User soft-deleted successfully:", userId);
  }

  /**
   * Reset user password (ADMIN only)
   */
  static async resetUserPassword(userId: string, newPassword: string) {
    console.log("UserService.resetUserPassword: Resetting password for user:", userId);

    if (!newPassword || newPassword.trim().length === 0) {
      throw new Error("New password is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new Error("User not found");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    console.log("UserService.resetUserPassword: Password reset successfully");
  }

  /**
   * Bulk operations on users (ADMIN only)
   */
  static async bulkUserOperation(
    operationData: BulkOperationData,
    operatorId: string
  ) {
    console.log("UserService.bulkUserOperation: Performing bulk operation:", {
      operation: operationData.operation,
      userCount: operationData.userIds.length,
    });

    // Verify operator is admin
    const operator = await prisma.user.findUnique({
      where: { id: operatorId },
    });

    if (!operator || operator.role !== Role.ADMIN) {
      throw new Error("Only admins can perform bulk operations");
    }

    const { userIds, operation, data } = operationData;

    if (!userIds || userIds.length === 0) {
      throw new Error("No users specified for bulk operation");
    }

    let updateData: any = {};
    let affectedCount = 0;

    switch (operation) {
      case "activate":
        updateData = { isActive: true };
        break;

      case "deactivate":
        updateData = { isActive: false };
        break;

      case "changeRole":
        if (!data?.role) {
          throw new Error("Role is required for changeRole operation");
        }
        updateData = { role: data.role };
        break;

      case "delete":
        updateData = { deletedAt: new Date() };
        break;

      default:
        throw new Error("Invalid bulk operation");
    }

    // Execute bulk update
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        deletedAt: null,
      },
      data: updateData,
    });

    affectedCount = result.count;

    console.log(
      `UserService.bulkUserOperation: Bulk operation completed, affected: ${affectedCount}`
    );

    return {
      operation,
      requestedCount: userIds.length,
      affectedCount,
      message: `${affectedCount} user(s) ${operation} successfully`,
    };
  }

  /**
   * Export users (with role-based filtering)
   */
  static async exportUsers(
    filters: any,
    userRole: Role,
    userSupervisorId: string | undefined,
    userId: string
  ) {
    console.log("UserService.exportUsers: Exporting users");

    const where: any = { deletedAt: null };

    // Apply role filtering if provided
    if (filters.role) {
      where.role = filters.role;
    }

    // Apply search filtering
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Apply active status filtering
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive === "true" || filters.isActive === true;
    }

    // Permission-based filtering
    if (userRole === Role.CREDIT_OFFICER) {
      where.id = userId;
    } else if (userRole === Role.SUPERVISOR) {
      where.OR = [
        { id: userId },
        { supervisorId: userId },
      ];
    }
    // ADMIN can export all users

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        isActive: true,
        supervisorId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users;
  }

  /**
   * Import users (bulk create/update)
   */
  static async importUsers(users: CreateUserData[], importerId: string) {
    console.log("UserService.importUsers: Importing users, count:", users.length);

    // Verify importer is admin
    const importer = await prisma.user.findUnique({
      where: { id: importerId },
    });

    if (!importer || importer.role !== Role.ADMIN) {
      throw new Error("Only admins can import users");
    }

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error("No users provided for import");
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const userData of users) {
      try {
        const email = userData.email.toLowerCase().trim();

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser && !existingUser.deletedAt) {
          // Update existing user
          await prisma.user.update({
            where: { email },
            data: {
              firstName: userData.firstName?.trim(),
              lastName: userData.lastName?.trim(),
              role: userData.role,
              phone: userData.phone?.trim() || null,
              address: userData.address?.trim() || null,
              isActive: userData.isActive !== undefined ? userData.isActive : true,
              supervisorId: userData.supervisorId || null,
            },
          });
          results.updated++;
        } else {
          // Create new user
          const password = userData.password || "DefaultPassword@123";
          const passwordHash = await bcrypt.hash(password, 10);

          await prisma.user.create({
            data: {
              email,
              firstName: userData.firstName?.trim(),
              lastName: userData.lastName?.trim(),
              role: userData.role,
              passwordHash,
              phone: userData.phone?.trim() || null,
              address: userData.address?.trim() || null,
              isActive: userData.isActive !== undefined ? userData.isActive : true,
              supervisorId: userData.supervisorId || null,
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          email: userData.email,
          error: error.message,
        });
        console.error("UserService.importUsers: Error importing user:", error);
      }
    }

    console.log("UserService.importUsers: Import completed:", results);
    return results;
  }
}
