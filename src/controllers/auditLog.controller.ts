import { Request, Response, NextFunction } from "express";
import { AuditLogService } from "../service/auditLog.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class AuditLogController {
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        entityName: req.query.entityName as string,
        entityId: req.query.entityId as string,
        actorUserId: req.query.actorUserId as string,
        action: req.query.action as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      };

      const result = await AuditLogService.getAuditLogs(filters);

      return ApiResponseUtil.paginated(
        res,
        result.logs,
        result.page,
        result.limit,
        result.total,
        "Audit logs retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getAuditLogById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Audit Log ID is required", 400);
      }

      const log = await AuditLogService.getAuditLogById(id);

      return ApiResponseUtil.success(res, log);
    } catch (error: any) {
      next(error);
    }
  }

  static async getEntityAuditTrail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { entityName, entityId } = req.params;

      if (!entityName || !entityId) {
        return ApiResponseUtil.error(
          res,
          "Entity name and ID are required",
          400
        );
      }

      const logs = await AuditLogService.getEntityAuditTrail(
        entityName,
        entityId
      );

      return ApiResponseUtil.success(res, logs);
    } catch (error: any) {
      next(error);
    }
  }
}
