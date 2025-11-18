import { Role } from "@prisma/client";
import prisma from "../prismaClient";

interface CreateUnionData {
  name: string;
  location?: string;
  address?: string;
  creditOfficerId: string;
}

interface UpdateUnionData {
  name?: string;
  location?: string;
  address?: string;
  creditOfficerId?: string;
}

interface GetUnionsFilters {
  page?: number;
  limit?: number;
  creditOfficerId?: string;
  isActive?: boolean;
  search?: string;
}

export class UnionService {
  static async createUnion(data: CreateUnionData, creatorRole: Role) {
    console.log("UnionService.createUnion: Creating union with data:", {
      name: data.name,
      creditOfficerId: data.creditOfficerId,
      creatorRole,
    });

    // Only admins and supervisors can create unions
    if (creatorRole !== Role.ADMIN && creatorRole !== Role.SUPERVISOR) {
      throw new Error(
        "Only admins and supervisors can create unions"
      );
    }

    // Validate credit officer exists and has the correct role
    const creditOfficer = await prisma.user.findUnique({
      where: { id: data.creditOfficerId },
    });

    if (!creditOfficer || creditOfficer.deletedAt) {
      throw new Error("Credit Officer not found");
    }

    if (creditOfficer.role !== Role.CREDIT_OFFICER) {
      throw new Error("Assigned user must have CREDIT_OFFICER role");
    }

    // Check if supervisor can assign this credit officer (if supervisor is creating)
    if (creatorRole === Role.SUPERVISOR) {
      if (creditOfficer.supervisorId !== creditOfficer.id) {
        // The credit officer must be under this supervisor
        throw new Error(
          "You can only assign credit officers assigned to you"
        );
      }
    }

    const union = await prisma.union.create({
      data: {
        name: data.name,
        location: data.location,
        address: data.address,
        creditOfficerId: data.creditOfficerId,
      },
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        creditOfficerId: true,
        creditOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            unionMembers: true,
            loans: true,
          },
        },
        createdAt: true,
      },
    });

    return union;
  }

  static async getUnions(
    filters: GetUnionsFilters,
    userRole: Role,
    userId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    console.log("UnionService.getUnions: Request from user:", {
      userRole,
      userId,
      filters,
    });

    const where: any = {
      deletedAt: null,
    };

    // Credit officers can only see their assigned unions
    if (userRole === Role.CREDIT_OFFICER && userId) {
      where.creditOfficerId = userId;
      console.log(
        "UnionService.getUnions: CREDIT_OFFICER filtering by assigned unions"
      );
    }
    // Supervisors can see unions of their assigned credit officers
    else if (userRole === Role.SUPERVISOR && userId) {
      where.creditOfficer = {
        supervisorId: userId,
      };
      console.log(
        "UnionService.getUnions: SUPERVISOR filtering by supervised credit officers' unions"
      );
    }
    // Admins can see all unions
    else if (userRole === Role.ADMIN) {
      console.log("UnionService.getUnions: ADMIN - no filtering applied");
    }

    if (filters.creditOfficerId) {
      where.creditOfficerId = filters.creditOfficerId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [unions, total] = await Promise.all([
      prisma.union.findMany({
        where,
        select: {
          id: true,
          name: true,
          location: true,
          address: true,
          creditOfficerId: true,
          creditOfficer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              unionMembers: true,
              loans: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.union.count({ where }),
    ]);

    return { unions, total, page, limit };
  }

  static async getUnionById(id: string, userRole: Role, userId?: string) {
    const union = await prisma.union.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        creditOfficerId: true,
        creditOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            supervisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            unionMembers: true,
            loans: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!union || union.deletedAt) {
      throw new Error("Union not found");
    }

    // Role-based access restrictions
    if (userRole === Role.ADMIN) {
      console.log("ADMIN user - allowing access to union:", id);
    } else if (userRole === Role.CREDIT_OFFICER && userId) {
      // Credit officers can only view their own unions
      if (union.creditOfficerId !== userId) {
        throw new Error("You can only view your assigned unions");
      }
      console.log("CREDIT_OFFICER user - allowing access to own union");
    } else if (userRole === Role.SUPERVISOR && userId) {
      // Supervisors can view unions of their supervised credit officers
      if (union.creditOfficer.supervisor?.id !== userId) {
        throw new Error(
          "You can only view unions assigned to your credit officers"
        );
      }
      console.log("SUPERVISOR user - allowing access to supervised union");
    } else {
      throw new Error("You do not have permission to view this union");
    }

    return union;
  }

  static async updateUnion(
    id: string,
    data: UpdateUnionData,
    updaterId: string,
    updaterRole: Role
  ) {
    console.log(`Updating union ${id} with data:`, data);

    const union = await prisma.union.findUnique({
      where: { id },
    });

    if (!union || union.deletedAt) {
      throw new Error("Union not found");
    }

    // Only admins can update unions
    if (updaterRole !== Role.ADMIN) {
      throw new Error("You do not have permission to update this union");
    }

    const updatePayload: UpdateUnionData = {};

    if (data.name !== undefined) {
      updatePayload.name = data.name.trim();
    }

    if (data.location !== undefined) {
      updatePayload.location = data.location ? data.location.trim() : undefined;
    }

    if (data.address !== undefined) {
      updatePayload.address = data.address ? data.address.trim() : undefined;
    }

    if (data.creditOfficerId !== undefined) {
      const creditOfficer = await prisma.user.findUnique({
        where: { id: data.creditOfficerId },
      });

      if (!creditOfficer || creditOfficer.deletedAt) {
        throw new Error("Credit Officer not found");
      }

      if (creditOfficer.role !== Role.CREDIT_OFFICER) {
        throw new Error("Assigned user must have CREDIT_OFFICER role");
      }

      updatePayload.creditOfficerId = data.creditOfficerId;

      // Record the assignment history
      await prisma.unionAssignmentHistory.create({
        data: {
          unionId: id,
          oldOfficerId: union.creditOfficerId,
          newOfficerId: data.creditOfficerId,
          changedByUserId: updaterId,
          reason: "Union reassignment",
          changedAt: new Date(),
        },
      });
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("No updatable fields provided; returning current union data");
      return prisma.union.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          location: true,
          address: true,
          creditOfficerId: true,
          creditOfficer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          updatedAt: true,
          createdAt: true,
        },
      });
    }

    const updatedUnion = await prisma.union.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        creditOfficerId: true,
        creditOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            unionMembers: true,
            loans: true,
          },
        },
        updatedAt: true,
        createdAt: true,
      },
    });

    console.log(`Union updated successfully:`, {
      id: updatedUnion.id,
      name: updatedUnion.name,
      creditOfficerId: updatedUnion.creditOfficerId,
    });

    return updatedUnion;
  }

  static async deleteUnion(
    id: string,
    deleterId: string,
    deleterRole: Role
  ) {
    const union = await prisma.union.findUnique({
      where: { id },
    });

    if (!union || union.deletedAt) {
      throw new Error("Union not found");
    }

    // Only admins can delete unions
    if (deleterRole !== Role.ADMIN) {
      throw new Error("You do not have permission to delete this union");
    }

    // Check if union has any members or loans
    const memberCount = await prisma.unionMember.count({
      where: { unionId: id, deletedAt: null },
    });

    const loanCount = await prisma.loan.count({
      where: { unionId: id, deletedAt: null },
    });

    if (memberCount > 0 || loanCount > 0) {
      throw new Error(
        "Cannot delete union with existing members or loans. Please reassign them first."
      );
    }

    // Soft delete
    await prisma.union.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async assignUnionToCreditOfficer(
    unionId: string,
    creditOfficerId: string,
    assignerId: string,
    assignerRole: Role,
    reason?: string
  ) {
    console.log(
      `UnionService.assignUnionToCreditOfficer: Assigning union ${unionId} to officer ${creditOfficerId}`
    );

    // Only admins can reassign unions
    if (assignerRole !== Role.ADMIN) {
      throw new Error("Only admins can reassign unions");
    }

    const union = await prisma.union.findUnique({
      where: { id: unionId },
    });

    if (!union || union.deletedAt) {
      throw new Error("Union not found");
    }

    const creditOfficer = await prisma.user.findUnique({
      where: { id: creditOfficerId },
    });

    if (!creditOfficer || creditOfficer.deletedAt) {
      throw new Error("Credit Officer not found");
    }

    if (creditOfficer.role !== Role.CREDIT_OFFICER) {
      throw new Error("Target user must have CREDIT_OFFICER role");
    }

    const oldOfficerId = union.creditOfficerId;

    // Update union
    await prisma.union.update({
      where: { id: unionId },
      data: { creditOfficerId },
    });

    // Record assignment history
    await prisma.unionAssignmentHistory.create({
      data: {
        unionId,
        oldOfficerId,
        newOfficerId: creditOfficerId,
        changedByUserId: assignerId,
        reason: reason || "Union reassignment",
        changedAt: new Date(),
      },
    });

    return await this.getUnionById(unionId, Role.ADMIN);
  }

  static async exportUnions(
    filters: GetUnionsFilters,
    userRole: Role,
    userId?: string
  ) {
    console.log("UnionService.exportUnions: Request from user:", {
      userRole,
      userId,
      filters,
    });

    const where: any = {
      deletedAt: null,
    };

    // Apply same filtering as getUnions
    if (userRole === Role.CREDIT_OFFICER && userId) {
      where.creditOfficerId = userId;
    } else if (userRole === Role.SUPERVISOR && userId) {
      where.creditOfficer = {
        supervisorId: userId,
      };
    }

    if (filters.creditOfficerId) {
      where.creditOfficerId = filters.creditOfficerId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const unions = await prisma.union.findMany({
      where,
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        creditOfficerId: true,
        creditOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            unionMembers: true,
            loans: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return unions;
  }
}
