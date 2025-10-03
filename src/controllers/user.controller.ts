import type { Request, Response, NextFunction } from "express";
import { UserService } from "../service/user.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body, req.user!.role);

      return ApiResponseUtil.success(res, user, "User created successfully");
    } catch (error: any) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.getUsers(req.query);

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
      const user = await UserService.getUserById(req.params.id!);

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
      await UserService.deleteUser(req.params.id!, req.user!.id);

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
}
