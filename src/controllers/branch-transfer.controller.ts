import { Request, Response } from "express";
import { BranchTransferService } from "../service/branch-transfer.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class BranchTransferController {
  static async createTransfer(req: Request, res: Response) {
    try {
      const { userId, fromBranchId, toBranchId, reason, effectiveDate, notes } =
        req.body;
      const createdByUserId = req.user?.id;

      if (!createdByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      if (!userId || !toBranchId || !effectiveDate) {
        return ApiResponseUtil.error(res, "Missing required fields", 400);
      }

      const transfer = await BranchTransferService.createTransfer({
        userId,
        fromBranchId,
        toBranchId,
        reason,
        effectiveDate: new Date(effectiveDate),
        createdByUserId,
        notes,
      });

      return ApiResponseUtil.success(
        res,
        transfer,
        "Branch transfer created successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async executeTransfer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const executedByUserId = req.user?.id;

      if (!executedByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const transfer = await BranchTransferService.executeTransfer(
        id,
        executedByUserId
      );

      return ApiResponseUtil.success(
        res,
        transfer,
        "Branch transfer executed successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getTransfers(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        fromBranchId,
        toBranchId,
        status,
        search,
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        fromBranchId: fromBranchId as string,
        toBranchId: toBranchId as string,
        status: status as string,
        search: search as string,
      };

      const result = await BranchTransferService.getTransfers(filters);

      return ApiResponseUtil.success(
        res,
        result,
        "Branch transfers fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async getTransferById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const transfer = await BranchTransferService.getTransferById(id);

      return ApiResponseUtil.success(
        res,
        transfer,
        "Branch transfer fetched successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }

  static async cancelTransfer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cancelledByUserId = req.user?.id;

      if (!cancelledByUserId) {
        return ApiResponseUtil.error(res, "User not authenticated", 401);
      }

      const transfer = await BranchTransferService.cancelTransfer(
        id,
        cancelledByUserId
      );

      return ApiResponseUtil.success(
        res,
        transfer,
        "Branch transfer cancelled successfully"
      );
    } catch (error: any) {
      return ApiResponseUtil.error(res, error.message, 400);
    }
  }
}
