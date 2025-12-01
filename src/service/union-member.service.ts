import { Role } from "@prisma/client";
import prisma from "../prismaClient";
import path from "path";
import fs from "fs";

interface CreateUnionMemberData {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  note?: string;
  unionId: string;
  currentOfficerId?: string;
}

interface UpdateUnionMemberData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  note?: string;
  unionId?: string;
  currentOfficerId?: string;
}

interface GetUnionMembersFilters {
  page?: number;
  limit?: number;
  unionId?: string;
  currentOfficerId?: string;
  search?: string;
}

interface ReassignUnionMemberData {
  newUnionId: string;
  reason?: string;
}

export class UnionMemberService {
  static async emailExists(email: string): Promise<boolean> {
    const member = await prisma.unionMember.findFirst({
      where: { email, deletedAt: null },
    });
    return !!member;
  }
  static async createUnionMember(
    data: CreateUnionMemberData,
    creatorId: string,
    creatorRole: Role
  ) {
    console.log("UnionMemberService.createUnionMember: Creating member:", {
      firstName: data.firstName,
      lastName: data.lastName,
      unionId: data.unionId,
    });

    // Validate union exists
    const union = await prisma.union.findUnique({
      where: { id: data.unionId },
    });

    if (!union || union.deletedAt) {
      throw new Error("Union not found");
    }

    // Validate creator has permission
    if (creatorRole === Role.CREDIT_OFFICER) {
      if (union.creditOfficerId !== creatorId) {
        throw new Error(
          "Credit officers can only create members for their own unions"
        );
      }
    } else if (creatorRole === Role.SUPERVISOR) {
      // Check if supervisor manages the credit officer of this union
      const creditOfficer = await prisma.user.findUnique({
        where: { id: union.creditOfficerId },
      });

      if (!creditOfficer || creditOfficer.supervisorId !== creatorId) {
        throw new Error(
          "You can only create members for unions under your supervision"
        );
      }
    } else if (creatorRole !== Role.ADMIN) {
      throw new Error("Insufficient permissions");
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
        throw new Error("Admin cannot be assigned as union member officer");
      }

      // Officer must match the union's credit officer
      if (officer.id !== union.creditOfficerId) {
        throw new Error(
          "Officer must be the credit officer assigned to this union"
        );
      }
    }

    // Check if email exists (only if email is provided)
    if (data.email && data.email.trim()) {
      const existingMember = await prisma.unionMember.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
        },
      });

      if (existingMember) {
        throw new Error("Email already exists");
      }
    }

    // Generate member code
    const lastMember = await prisma.unionMember.findFirst({
      orderBy: { createdAt: "desc" },
      where: { code: { not: null } },
    });

    let memberCode: string;
    if (lastMember && lastMember.code) {
      const lastNumber = parseInt(lastMember.code.replace("MEM", ""));
      memberCode = `MEM${String(lastNumber + 1).padStart(6, "0")}`;
    } else {
      memberCode = "MEM000001";
    }

    const member = await prisma.unionMember.create({
      data: {
        code: memberCode,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone ? data.phone.trim() : null,
        email: data.email ? data.email.toLowerCase().trim() : null,
        address: data.address ? data.address.trim() : null,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender ? data.gender.trim() : null,
        maritalStatus: data.maritalStatus ? data.maritalStatus.trim() : null,
        profession: data.profession ? data.profession.trim() : null,
        company: data.company ? data.company.trim() : null,
        city: data.city ? data.city.trim() : null,
        state: data.state ? data.state.trim() : null,
        country: data.country ? data.country.trim() : null,
        zipCode: data.zipCode ? data.zipCode.trim() : null,
        note: data.note ? data.note.trim() : null,
        unionId: data.unionId,
        currentOfficerId: data.currentOfficerId || union.creditOfficerId,
      },
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        profession: true,
        company: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        note: true,
        unionId: true,
        union: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        currentOfficerId: true,
        currentOfficer: {
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

    return member;
  }

  static async getUnionMembers(
    filters: GetUnionMembersFilters,
    userRole: Role,
    userId?: string
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    console.log("UnionMemberService.getUnionMembers: Request from user:", {
      userRole,
      userId,
      filters,
    });

    const where: any = {
      deletedAt: null,
    };

    // Credit officers can only see members from their unions
    if (userRole === Role.CREDIT_OFFICER && userId) {
      where.union = {
        creditOfficerId: userId,
      };
      console.log(
        "UnionMemberService: CREDIT_OFFICER filtering by their unions"
      );
    }
    // Supervisors can see members from unions of their credit officers
    else if (userRole === Role.SUPERVISOR && userId) {
      where.union = {
        creditOfficer: {
          supervisorId: userId,
        },
      };
      console.log(
        "UnionMemberService: SUPERVISOR filtering by supervised credit officers' unions"
      );
    }
    // Admins can see all members
    else if (userRole === Role.ADMIN) {
      console.log("UnionMemberService: ADMIN - no filtering");
    }

    if (filters.unionId) {
      where.unionId = filters.unionId;
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

    const [members, total] = await Promise.all([
      prisma.unionMember.findMany({
        where,
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          dateOfBirth: true,
          gender: true,
          maritalStatus: true,
          profession: true,
          company: true,
          city: true,
          state: true,
          country: true,
          zipCode: true,
          note: true,
          unionId: true,
          union: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          currentOfficerId: true,
          currentOfficer: {
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
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.unionMember.count({ where }),
    ]);

    return { members, total, page, limit };
  }

  static async getUnionMemberById(id: string, userRole: Role, userId?: string) {
    const member = await prisma.unionMember.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        profession: true,
        company: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        note: true,
        profileImage: true,
        isVerified: true,
        unionId: true,
        union: {
          select: {
            id: true,
            name: true,
            location: true,
            creditOfficerId: true,
            creditOfficer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                supervisorId: true,
              },
            },
          },
        },
        currentOfficerId: true,
        currentOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            loans: true,
            documents: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!member || member.deletedAt) {
      throw new Error("Union member not found");
    }

    // Role-based access restrictions
    if (userRole === Role.ADMIN) {
      console.log("ADMIN - allowing access to member:", id);
    } else if (userRole === Role.CREDIT_OFFICER && userId) {
      if (member.union.creditOfficerId !== userId) {
        throw new Error("You can only view members from your assigned unions");
      }
      console.log("CREDIT_OFFICER - allowing access to member in own union");
    } else if (userRole === Role.SUPERVISOR && userId) {
      if (member.union.creditOfficer.supervisorId !== userId) {
        throw new Error("You can only view members under your supervision");
      }
      console.log("SUPERVISOR - allowing access to supervised member");
    } else {
      throw new Error("You do not have permission to view this member");
    }

    return member;
  }

  static async updateUnionMember(
    id: string,
    data: UpdateUnionMemberData,
    updaterId: string,
    updaterRole: Role
  ) {
    console.log(`Updating union member ${id} with data:`, {
      firstName: data.firstName,
      lastName: data.lastName,
    });

    const member = await prisma.unionMember.findUnique({
      where: { id },
      include: { union: true },
    });

    if (!member || member.deletedAt) {
      throw new Error("Union member not found");
    }

    // Check permission
    if (updaterRole === Role.CREDIT_OFFICER) {
      if (member.union.creditOfficerId !== updaterId) {
        throw new Error(
          "Credit officers can only update members from their unions"
        );
      }
    } else if (updaterRole === Role.SUPERVISOR) {
      const creditOfficer = await prisma.user.findUnique({
        where: { id: member.union.creditOfficerId },
      });

      if (!creditOfficer || creditOfficer.supervisorId !== updaterId) {
        throw new Error("You can only update members under your supervision");
      }
    } else if (updaterRole !== Role.ADMIN) {
      throw new Error("Insufficient permissions");
    }

    const updatePayload: any = {};

    const sanitizeField = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    if (data.firstName !== undefined) {
      updatePayload.firstName = data.firstName.trim();
    }

    if (data.lastName !== undefined) {
      updatePayload.lastName = data.lastName.trim();
    }

    if (data.phone !== undefined) {
      updatePayload.phone = sanitizeField(data.phone);
    }

    if (data.email !== undefined) {
      if (data.email) {
        const lowerEmail = data.email.toLowerCase().trim();
        if (lowerEmail !== member.email) {
          const existingMember = await prisma.unionMember.findFirst({
            where: { email: lowerEmail, deletedAt: null },
          });
          if (existingMember) {
            throw new Error("Email already exists");
          }
        }
        updatePayload.email = lowerEmail;
      } else {
        updatePayload.email = null;
      }
    }

    if (data.address !== undefined) {
      updatePayload.address = sanitizeField(data.address);
    }

    if (data.dateOfBirth !== undefined) {
      updatePayload.dateOfBirth = data.dateOfBirth;
    }

    if (data.gender !== undefined) {
      updatePayload.gender = sanitizeField(data.gender);
    }

    if (data.maritalStatus !== undefined) {
      updatePayload.maritalStatus = sanitizeField(data.maritalStatus);
    }

    if (data.profession !== undefined) {
      updatePayload.profession = sanitizeField(data.profession);
    }

    if (data.company !== undefined) {
      updatePayload.company = sanitizeField(data.company);
    }

    if (data.city !== undefined) {
      updatePayload.city = sanitizeField(data.city);
    }

    if (data.state !== undefined) {
      updatePayload.state = sanitizeField(data.state);
    }

    if (data.country !== undefined) {
      updatePayload.country = sanitizeField(data.country);
    }

    if (data.zipCode !== undefined) {
      updatePayload.zipCode = sanitizeField(data.zipCode);
    }

    if (data.note !== undefined) {
      updatePayload.note = sanitizeField(data.note);
    }

    // Handle union reassignment (only for admins)
    if (data.unionId !== undefined && updaterRole === Role.ADMIN) {
      if (data.unionId !== member.unionId) {
        const newUnion = await prisma.union.findUnique({
          where: { id: data.unionId },
        });

        if (!newUnion || newUnion.deletedAt) {
          throw new Error("Target union not found");
        }

        updatePayload.unionId = data.unionId;
        updatePayload.currentOfficerId = newUnion.creditOfficerId;

        // Record reassignment
        await prisma.unionMemberReassignment.create({
          data: {
            unionMemberId: id,
            oldUnionId: member.unionId,
            newUnionId: data.unionId,
            oldOfficerId: member.union.creditOfficerId,
            newOfficerId: newUnion.creditOfficerId,
            changedByUserId: updaterId,
            reason: "Union reassignment",
            changedAt: new Date(),
          },
        });
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("No updatable fields provided");
      return this.getUnionMemberById(id, updaterRole, updaterId);
    }

    const updatedMember = await prisma.unionMember.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        profession: true,
        company: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        note: true,
        unionId: true,
        union: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        currentOfficerId: true,
        currentOfficer: {
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

    console.log(`Union member updated successfully:`, {
      id: updatedMember.id,
      firstName: updatedMember.firstName,
      lastName: updatedMember.lastName,
    });

    return updatedMember;
  }

  static async deleteUnionMember(
    id: string,
    deleterId: string,
    deleterRole: Role
  ) {
    const member = await prisma.unionMember.findUnique({
      where: { id },
      include: { union: true },
    });

    if (!member || member.deletedAt) {
      throw new Error("Union member not found");
    }

    // Check permission
    if (deleterRole === Role.CREDIT_OFFICER) {
      if (member.union.creditOfficerId !== deleterId) {
        throw new Error(
          "Credit officers can only delete members from their unions"
        );
      }
    } else if (deleterRole === Role.SUPERVISOR) {
      const creditOfficer = await prisma.user.findUnique({
        where: { id: member.union.creditOfficerId },
      });

      if (!creditOfficer || creditOfficer.supervisorId !== deleterId) {
        throw new Error("You can only delete members under your supervision");
      }
    } else if (deleterRole !== Role.ADMIN) {
      throw new Error("Insufficient permissions");
    }

    // Check if member has active loans
    const activeLoans = await prisma.loan.count({
      where: {
        unionMemberId: id,
        deletedAt: null,
        status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE"] },
      },
    });

    if (activeLoans > 0) {
      throw new Error(
        "Cannot delete member with active loans. Please resolve loans first."
      );
    }

    // Soft delete
    await prisma.unionMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    console.log(`Union member deleted: ${id}`);
  }

  static async toggleVerification(
    memberId: string,
    userId: string,
    userRole: Role
  ) {
    console.log(
      `UnionMemberService.toggleVerification: Toggling verification for member ${memberId}`
    );

    const member = await prisma.unionMember.findUnique({
      where: { id: memberId },
      include: { union: true },
    });

    if (!member || member.deletedAt) {
      throw new Error("Union member not found");
    }

    // Check permission - only ADMIN and SUPERVISOR can toggle verification
    if (userRole === Role.SUPERVISOR) {
      const creditOfficer = await prisma.user.findUnique({
        where: { id: member.union.creditOfficerId },
      });

      if (!creditOfficer || creditOfficer.supervisorId !== userId) {
        throw new Error(
          "You can only toggle verification for members under your supervision"
        );
      }
    } else if (userRole !== Role.ADMIN) {
      throw new Error(
        "Only admins and supervisors can toggle verification status"
      );
    }

    // Toggle the isVerified status
    const updatedMember = await prisma.unionMember.update({
      where: { id: memberId },
      data: { isVerified: !member.isVerified },
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isVerified: true,
        unionId: true,
        union: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        currentOfficerId: true,
        currentOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updatedAt: true,
      },
    });

    console.log(
      `Union member verification toggled: ${memberId}, now isVerified: ${updatedMember.isVerified}`
    );

    return updatedMember;
  }

  static async reassignUnionMember(
    memberId: string,
    data: ReassignUnionMemberData,
    reassignerId: string,
    reassignerRole: Role
  ) {
    console.log(
      `UnionMemberService.reassignUnionMember: Reassigning member ${memberId} to union ${data.newUnionId}`
    );

    const member = await prisma.unionMember.findUnique({
      where: { id: memberId },
      include: { union: true },
    });

    if (!member || member.deletedAt) {
      throw new Error("Union member not found");
    }

    // Only admins can reassign members
    if (reassignerRole !== Role.ADMIN) {
      throw new Error("Only admins can reassign members");
    }

    const newUnion = await prisma.union.findUnique({
      where: { id: data.newUnionId },
    });

    if (!newUnion || newUnion.deletedAt) {
      throw new Error("Target union not found");
    }

    if (data.newUnionId === member.unionId) {
      throw new Error("Member is already in this union");
    }

    // Update member
    await prisma.unionMember.update({
      where: { id: memberId },
      data: {
        unionId: data.newUnionId,
        currentOfficerId: newUnion.creditOfficerId,
      },
    });

    // Record reassignment
    await prisma.unionMemberReassignment.create({
      data: {
        unionMemberId: memberId,
        oldUnionId: member.unionId,
        newUnionId: data.newUnionId,
        oldOfficerId: member.union.creditOfficerId,
        newOfficerId: newUnion.creditOfficerId,
        changedByUserId: reassignerId,
        reason: data.reason || "Member reassignment",
        changedAt: new Date(),
      },
    });

    return await this.getUnionMemberById(memberId, Role.ADMIN, reassignerId);
  }

  static async exportUnionMembers(
    filters: GetUnionMembersFilters,
    userRole: Role,
    userId?: string
  ) {
    console.log("UnionMemberService.exportUnionMembers: Request from user:", {
      userRole,
      userId,
      filters,
    });

    const where: any = {
      deletedAt: null,
    };

    // Apply same filtering as getUnionMembers
    if (userRole === Role.CREDIT_OFFICER && userId) {
      where.union = {
        creditOfficerId: userId,
      };
    } else if (userRole === Role.SUPERVISOR && userId) {
      where.union = {
        creditOfficer: {
          supervisorId: userId,
        },
      };
    }

    if (filters.unionId) {
      where.unionId = filters.unionId;
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

    const members = await prisma.unionMember.findMany({
      where,
      select: {
        id: true,
        code: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        dateOfBirth: true,
        gender: true,
        maritalStatus: true,
        profession: true,
        company: true,
        city: true,
        state: true,
        country: true,
        zipCode: true,
        note: true,
        unionId: true,
        union: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        currentOfficerId: true,
        currentOfficer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return members;
  }
}
