import { Request, Response, NextFunction } from "express";
import { LoanService } from "../service/loan.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class LoanController {
  static async createLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await LoanService.createLoan(
        req.body,
        req.user!.id,
        req.user!.branchId
      );

      return ApiResponseUtil.success(
        res,
        loan,
        "Loan created successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        status: req.query.status as any,
        branchId: req.query.branchId as string,
        assignedOfficerId: req.query.assignedOfficerId as string,
        customerId: req.query.customerId as string,
        search: req.query.search as string,
      };

      const result = await LoanService.getLoans(
        filters,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.paginated(
        res,
        result.loans,
        result.page,
        result.limit,
        result.total,
        "Loans retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const loan = await LoanService.getLoanById(
        id,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, loan);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const loan = await LoanService.updateLoan(
        id,
        req.body,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, loan, "Loan updated successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async updateLoanStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const loan = await LoanService.updateLoanStatus(
        id,
        status,
        notes,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        loan,
        "Loan status updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async disburseLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const disbursedAt = req.body.disbursedAt
        ? new Date(req.body.disbursedAt)
        : undefined;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const loan = await LoanService.disburseLoan(
        id,
        disbursedAt,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, loan, "Loan disbursed successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async assignLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { assignedOfficerId, reason } = req.body;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const loan = await LoanService.assignLoan(
        id,
        assignedOfficerId,
        reason,
        req.user!.id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, loan, "Loan assigned successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteLoan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      await LoanService.deleteLoan(
        id,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, null, "Loan deleted successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const schedule = await LoanService.getLoanSchedule(
        id,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, schedule);
    } catch (error: any) {
      next(error);
    }
  }

  static async getLoanSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Loan ID is required", 400);
      }

      const summary = await LoanService.getLoanSummary(id);

      return ApiResponseUtil.success(res, summary);
    } catch (error: any) {
      next(error);
    }
  }
}
