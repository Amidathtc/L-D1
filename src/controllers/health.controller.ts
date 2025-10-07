import { Request, Response } from "express";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export class HealthController {
  /**
   * Health check endpoint for keepalive service
   */
  static async healthCheck(req: Request, res: Response) {
    try {
      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0",
      };

      return ApiResponseUtil.success(res, healthData, "Server is healthy");
    } catch (error: any) {
      console.error("Health check error:", error);
      return ApiResponseUtil.error(res, "Health check failed", 500);
    }
  }

  /**
   * Simple ping endpoint
   */
  static async ping(req: Request, res: Response) {
    try {
      return ApiResponseUtil.success(
        res,
        {
          message: "pong",
          timestamp: new Date().toISOString(),
        },
        "Server is alive"
      );
    } catch (error: any) {
      console.error("Ping error:", error);
      return ApiResponseUtil.error(res, "Ping failed", 500);
    }
  }
}
