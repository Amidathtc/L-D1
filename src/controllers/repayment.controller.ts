import { Request, Response, NextFunction } from "express";
import { RepaymentService } from "../service/repayment.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class RepaymentController {
  static async createRepayment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const repayment = await RepaymentService.createRepayment(
        req.body,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        repayment,
        "Repayment recorded successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getRepayments(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        loanId: req.query.loanId as string,
        receivedByUserId: req.query.receivedByUserId as string,
        method: req.query.method as any,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
      };

      const result = await RepaymentService.getRepayments(
        filters,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.paginated(
        res,
        result.repayments,
        result.page,
        result.limit,
        result.total,
        "Repayments retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getRepaymentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Repayment ID is required", 400);
      }

      const repayment = await RepaymentService.getRepaymentById(
        id,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, repayment);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateRepayment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Repayment ID is required", 400);
      }

      const repayment = await RepaymentService.updateRepayment(
        id,
        req.body,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        repayment,
        "Repayment updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteRepayment(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Repayment ID is required", 400);
      }

      await RepaymentService.deleteRepayment(
        id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(
        res,
        null,
        "Repayment deleted successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }
}
