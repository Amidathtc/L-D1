import type { Request, Response, NextFunction } from "express";
import { Logger } from "../utils/logger.util";
import prisma from "../prismaClient";

export const auditLog = (action: string, entityName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json.bind(res);

    res.json = function (data: any) {
      // Log audit after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || data?.data?.id || "unknown";

        prisma.auditLog
          .create({
            data: {
              actorUserId: req.user?.id,
              action,
              entityName,
              entityId,
              before: req.body?._before || null,
              after: data?.data || null,
              metadata: {
                method: req.method,
                path: req.path,
                query: req.query,
              },
              ipAddress: req.ip,
              userAgent: req.get("user-agent"),
            },
          })
          .catch((err: any) => Logger.error("Audit log failed:", err));
      }

      return originalSend(data);
    };

    next();
  };
};
