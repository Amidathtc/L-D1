import type { Response } from "express";
import type { ApiResponse } from "../types/index";

export class ApiResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    message = "Success",
    statusCode = 200
  ) {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, statusCode = 400, error?: any) {
    const response: ApiResponse = {
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error : undefined,
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = "Success"
  ) {
    const response: ApiResponse<T[]> = {
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return res.status(200).json(response);
  }
}
