import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiResponseUtil } from "../utils/apiResponse.util";

// Generic validation middleware
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return ApiResponseUtil.error(res, "Validation failed", 400, {
          errors: errorMessages,
        });
      }

      return ApiResponseUtil.error(res, "Invalid request data", 400);
    }
  };
};

// Sanitize input middleware
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Basic XSS protection
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  };

  // Sanitize body
  if (req.body && typeof req.body === "object") {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === "string") {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      if (obj && typeof obj === "object") {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    for (const key in req.query) {
      if (typeof req.query[key] === "string") {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }

  next();
};

// File upload validation
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number = 5 * 1024 * 1024
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files
      ? Array.isArray(req.files)
        ? req.files
        : [req.files]
      : req.file
      ? [req.file]
      : [];

    for (const file of files) {
      // Check if file is valid
      if (
        !file ||
        typeof file.mimetype !== "string" ||
        typeof file.size !== "number"
      ) {
        continue;
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return ApiResponseUtil.error(
          res,
          `Invalid file type. Allowed types: ${allowedTypes.join(", ")}`,
          400
        );
      }

      // Check file size
      if (file.size > maxSize) {
        return ApiResponseUtil.error(
          res,
          `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
          400
        );
      }
    }

    next();
  };
};
