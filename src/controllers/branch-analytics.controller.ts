import { Request, Response } from "express";
import { BranchAnalyticsService } from "../service/branch-analytics.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class BranchAnalyticsController {
  static async generateAnalytics(req: Request, res: Response) {
    try {
      const { branchId } = req.params;
      const { periodType = "monthly" } = req.query;

      const analytics = await BranchAnalyticsService.generateBranchAnalytics(
        branchId,
        periodType as "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
      );

      return ApiResponseUtil.success(res, analytics, "Branch analytics generated successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getAnalytics(req: Request, res: Response) {
    try {
      const {
        branchId,
        periodType,
        startDate,
        endDate,
      } = req.query;

      const filters = {
        branchId: branchId as string,
        periodType: periodType as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await BranchAnalyticsService.getBranchAnalytics(filters);

      return ApiResponseUtil.success(res, analytics, "Branch analytics fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getPerformanceComparison(req: Request, res: Response) {
    try {
      const { branchIds } = req.body;
      const { periodType = "monthly" } = req.query;

      if (!branchIds || !Array.isArray(branchIds)) {
        return ApiResponseUtil.error(res, "Branch IDs array is required", 400);
      }

      const comparison = await BranchAnalyticsService.getBranchPerformanceComparison(
        branchIds,
        periodType as "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
      );

      return ApiResponseUtil.success(res, comparison, "Branch performance comparison fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getSystemAnalytics(req: Request, res: Response) {
    try {
      const { periodType = "monthly" } = req.query;

      const analytics = await BranchAnalyticsService.getSystemAnalytics(
        periodType as "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
      );

      return ApiResponseUtil.success(res, analytics, "System analytics fetched successfully");
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }
}
