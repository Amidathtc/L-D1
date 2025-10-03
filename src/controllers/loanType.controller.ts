import { Request, Response, NextFunction } from "express";
import { LoanTypeService } from "../service/loanType.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class LoanTypeController {
  static async createLoanType(req: Request, res: Response, next: NextFunction) {
    try {
      const loanType = await LoanTypeService.createLoanType(req.body);

      return ApiResponseUtil.success(
        res,
        loanType,
        "Loan type created successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const isActive =
        req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
          ? false
          : undefined;
      const search = req.query.search as string;

      const result = await LoanTypeService.getLoanTypes(
        page,
        limit,
        isActive,
        search
      );

      return ApiResponseUtil.paginated(
        res,
        result.loanTypes,
        result.page,
        result.limit,
        result.total,
        "Loan types retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanTypeById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan Type ID is required", 400);
      }

      const loanType = await LoanTypeService.getLoanTypeById(id);

      return ApiResponseUtil.success(res, loanType);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateLoanType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan Type ID is required", 400);
      }

      const loanType = await LoanTypeService.updateLoanType(id, req.body);

      return ApiResponseUtil.success(
        res,
        loanType,
        "Loan type updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteLoanType(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan Type ID is required", 400);
      }

      await LoanTypeService.deleteLoanType(id);

      return ApiResponseUtil.success(
        res,
        null,
        "Loan type deleted successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async toggleLoanTypeStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan Type ID is required", 400);
      }

      const loanType = await LoanTypeService.toggleLoanTypeStatus(id);

      return ApiResponseUtil.success(
        res,
        loanType,
        `Loan type ${
          loanType.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error: any) {
      next(error);
    }
  }
}
