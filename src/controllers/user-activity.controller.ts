import { Request, Response } from "express";
import { UserActivityService } from "../service/user-activity.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class UserActivityController {
  static async getLoginHistory(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        startDate,
        endDate,
        activityType,
        search,
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        activityType: activityType as string,
        search: search as string,
      };

      const result = await UserActivityService.getLoginHistory(filters);

      return ApiResponseUtil.success(
        res,
        result,
        "Login history fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getUserActivitySummary(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { period = "month" } = req.query;

      const summary = await UserActivityService.getUserActivitySummary(
        userId,
        period as "day" | "week" | "month"
      );

      return ApiResponseUtil.success(
        res,
        summary,
        "User activity summary fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getUnionActivitySummary(req: Request, res: Response) {
    try {
      const { unionId } = req.params;
      const { period = "month" } = req.query;

      const summary = await UserActivityService.getUnionActivitySummary(
        unionId,
        period as "day" | "week" | "month"
      );

      return ApiResponseUtil.success(
        res,
        summary,
        "Branch activity summary fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getSystemActivitySummary(req: Request, res: Response) {
    try {
      const { period = "month" } = req.query;

      const summary = await UserActivityService.getSystemActivitySummary(
        period as "day" | "week" | "month"
      );

      return ApiResponseUtil.success(
        res,
        summary,
        "System activity summary fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async updateActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const result = await UserActivityService.updateActivity(userId);

      return ApiResponseUtil.success(
        res,
        result,
        "Activity updated successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }
}
