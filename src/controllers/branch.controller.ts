import { Request, Response, NextFunction } from "express";
import { BranchService } from "../service/branch.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class BranchController {
  static async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const branch = await BranchService.createBranch(req.body);

      return ApiResponseUtil.success(
        res,
        branch,
        "Branch created successfully",
        201
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const search = req.query.search as string;

      const result = await BranchService.getBranches(page, limit, search);

      return ApiResponseUtil.paginated(
        res,
        result.branches,
        result.page,
        result.limit,
        result.total,
        "Branches retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getBranchById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Branch ID is required", 400);
      }

      const branch = await BranchService.getBranchById(id);

      return ApiResponseUtil.success(res, branch);
    } catch (error: any) {
      next(error);
    }
  }

  static async updateBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Branch ID is required", 400);
      }

      const branch = await BranchService.updateBranch(id, req.body);

      return ApiResponseUtil.success(
        res,
        branch,
        "Branch updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Branch ID is required", 400);
      }

      await BranchService.deleteBranch(id);

      return ApiResponseUtil.success(res, null, "Branch deleted successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async getBranchStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        return ApiResponseUtil.error(res, "Branch ID is required", 400);
      }

      const stats = await BranchService.getBranchStats(id);

      return ApiResponseUtil.success(res, stats);
    } catch (error: any) {
      next(error);
    }
  }
}
