import { Request, Response, NextFunction } from "express";
import { SettingsService } from "../service/settings.service";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class SettingsController {
  // Company Settings
  static async getCompanySettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.getCompanySettings();
      return ApiResponseUtil.success(
        res,
        settings,
        "Company settings retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async updateCompanySettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.updateCompanySettings(req.body);
      return ApiResponseUtil.success(
        res,
        settings,
        "Company settings updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  // Email Settings
  static async getEmailSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.getEmailSettings();
      return ApiResponseUtil.success(
        res,
        settings,
        "Email settings retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async updateEmailSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.updateEmailSettings(req.body);
      return ApiResponseUtil.success(
        res,
        settings,
        "Email settings updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async testEmailSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await SettingsService.testEmailSettings(req.body);
      return ApiResponseUtil.success(
        res,
        result,
        "Test email sent successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  // General Settings
  static async getGeneralSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.getGeneralSettings();
      return ApiResponseUtil.success(
        res,
        settings,
        "General settings retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async updateGeneralSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.updateGeneralSettings(req.body);
      return ApiResponseUtil.success(
        res,
        settings,
        "General settings updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  // Password Settings
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      await SettingsService.changePassword(
        userId,
        currentPassword,
        newPassword
      );
      return ApiResponseUtil.success(
        res,
        null,
        "Password changed successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  // System Settings
  static async getSystemSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.getSystemSettings();
      return ApiResponseUtil.success(
        res,
        settings,
        "System settings retrieved successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }

  static async updateSystemSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const settings = await SettingsService.updateSystemSettings(req.body);
      return ApiResponseUtil.success(
        res,
        settings,
        "System settings updated successfully"
      );
    } catch (error: any) {
      next(error);
    }
  }
}
