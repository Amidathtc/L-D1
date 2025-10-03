import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { Logger } from "../utils/logger.util";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Logger.error("Error occurred:", err);

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return ApiResponseUtil.error(
        res,
        "A record with this value already exists",
        409
      );
    }
    if (err.code === "P2025") {
      return ApiResponseUtil.error(res, "Record not found", 404);
    }
    if (err.code === "P2003") {
      return ApiResponseUtil.error(res, "Foreign key constraint failed", 400);
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return ApiResponseUtil.error(res, "Invalid data provided", 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return ApiResponseUtil.error(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return ApiResponseUtil.error(res, "Token expired", 401);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  return ApiResponseUtil.error(res, message, statusCode, err);
};

export const notFoundHandler = (req: Request, res: Response) => {
  return ApiResponseUtil.error(res, `Route ${req.originalUrl} not found`, 404);
};
