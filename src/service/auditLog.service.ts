import { Role } from "@prisma/client";
import prisma from "../prismaClient";

interface GetAuditLogsFilters {
  page?: number;
  limit?: number;
  entityName?: string;
  entityId?: string;
  actorUserId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AuditLogService {
  static async getAuditLogs(filters: GetAuditLogsFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.entityName) {
      where.entityName = filters.entityName;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: "insensitive" };
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  static async getAuditLogById(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw new Error("Audit log not found");
    }

    return log;
  }

  static async getEntityAuditTrail(entityName: string, entityId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityName,
        entityId,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return logs;
  }
}
