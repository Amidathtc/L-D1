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
      const sanitizeString = (value: any) => {
        if (value === undefined || value === null) {
          return undefined;
        }
        if (typeof value !== "string") {
          return value;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : "";
      };

      const parseOptionalBoolean = (value: any): boolean | undefined => {
        if (value === undefined || value === null) {
          return undefined;
        }
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "string") {
          if (value.toLowerCase() === "true") return true;
          if (value.toLowerCase() === "false") return false;
        }
        return undefined;
      };

      const normalizedBody: any = {};

      if (req.body.firstName !== undefined) {
        const firstName = sanitizeString(req.body.firstName);
        if (firstName !== undefined) normalizedBody.firstName = firstName;
      }

      if (req.body.lastName !== undefined) {
        const lastName = sanitizeString(req.body.lastName);
        if (lastName !== undefined) normalizedBody.lastName = lastName;
      }

      if (req.body.phone !== undefined) {
        const phone = sanitizeString(req.body.phone);
        if (phone !== undefined) normalizedBody.phone = phone || null;
      }

      if (req.body.address !== undefined) {
        const address = sanitizeString(req.body.address);
        if (address !== undefined) normalizedBody.address = address || null;
      }

      if (req.body.email !== undefined) {
        const emailValue = sanitizeString(req.body.email);
        if (emailValue) normalizedBody.email = emailValue.toLowerCase();
      }

      if (req.body.role !== undefined) {
        normalizedBody.role = req.body.role;
      }

      if (req.body.branchId !== undefined) {
        const branchVal = req.body.branchId;
        if (
          branchVal === null ||
          branchVal === "null" ||
          branchVal === "" ||
          branchVal === undefined
        ) {
          normalizedBody.branchId = null;
        } else {
          normalizedBody.branchId = branchVal;
        }
      }

      if (req.body.isActive !== undefined) {
        const boolVal = parseOptionalBoolean(req.body.isActive);
        if (boolVal !== undefined) {
          normalizedBody.isActive = boolVal;
        }
      }

      if (req.body.removeProfileImage === "true") {
        normalizedBody.profileImage = null;
      }

      if (
        req.body.profileImage &&
        typeof req.body.profileImage === "string" &&
        req.body.profileImage.startsWith("http")
      ) {
        normalizedBody.profileImage = req.body.profileImage;
      }

      if (req.file) {
        const configuredBase = process.env.API_BASE_URL?.replace(/\/$/, "");
        const requestBase = `${req.protocol}://${req.get("host")}`;
        const baseUrl = (configuredBase || requestBase).replace(/\/$/, "");
        normalizedBody.profileImage = `${baseUrl}/uploads/profiles/${req.file.filename}`;
      }

      const user = await UserService.updateUser(
        req.params.id!,
        normalizedBody,
        req.user!.id,
        req.user!.role
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
