import { Request, Response, NextFunction } from "express";
import { AssignmentHistoryService } from "../service/assignment-history.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class AssignmentHistoryController {
  static async getAssignmentHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.user) {
        return ApiResponseUtil.error(res, "Authentication required", 401);
      }

      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        type: req.query.type as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        search: req.query.search as string,
      };

      const result = await AssignmentHistoryService.getAssignmentHistory(
        filters,
        req.user.role as any,
        req.user.branchId || undefined,
        req.user.id
      );

      return ApiResponseUtil.paginated(
        res,
        result.history,
        result.page,
        result.limit,
        result.total,
        "Assignment history retrieved successfully"
      );
    } catch (error: unknown) {
      console.error("Error in getAssignmentHistory controller:", error);
      if (error instanceof Error) {
        return ApiResponseUtil.error(res, error.message, 500);
      }
      return ApiResponseUtil.error(res, "Internal server error", 500);
    }
  }
}
