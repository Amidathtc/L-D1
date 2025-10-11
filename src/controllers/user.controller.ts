import type { Request, Response, NextFunction } from "express";
import { UserService } from "../service/user.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("UserController.createUser: Request body:", req.body);
      console.log("UserController.createUser: User role:", req.user!.role);

      const user = await UserService.createUser(req.body, req.user!.role);

      console.log(
        "UserController.createUser: User created successfully:",
        user
      );
      return ApiResponseUtil.success(res, user, "User created successfully");
    } catch (error: any) {
      console.error("UserController.createUser: Error:", error);
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        role: req.query.role as any,
        branchId: req.query.branchId as string,
        isActive: req.query.isActive
          ? req.query.isActive === "true"
          : undefined,
        search: req.query.search as string,
      };

      const users = await UserService.getUsers(
        filters,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(
        res,
        users,
        "Users retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(
        req.params.id!,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, user, "User retrieved successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateUser(
        req.params.id!,
        req.body,
        req.user!.id
      );

      return ApiResponseUtil.success(res, user, "User updated successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await UserService.deleteUser(
        req.params.id!,
        req.user!.id,
        req.user!.role,
        req.user!.branchId || undefined
      );

      return ApiResponseUtil.success(res, null, "User deleted successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body;

      await UserService.resetUserPassword(req.params.id!, newPassword);

      return ApiResponseUtil.success(res, null, "Password reset successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async bulkUserOperation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userIds, operation, data } = req.body;
      const operatorId = req.user!.id;

      const result = await UserService.bulkUserOperation(
        { userIds, operation, data },
        operatorId
      );

      return ApiResponseUtil.success(
        res,
        result,
        "Bulk operation completed successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async exportUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.exportUsers(
        req.query,
        req.user!.role,
        req.user!.branchId || undefined,
        req.user!.id
      );

      return ApiResponseUtil.success(res, users, "Users exported successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async importUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { users } = req.body;
      const importerId = req.user!.id;

      const result = await UserService.importUsers(users, importerId);

      return ApiResponseUtil.success(res, result, "Users import completed");
    } catch (error: any) {
      next(error);
    }
  }
}
