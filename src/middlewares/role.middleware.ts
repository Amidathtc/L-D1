import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ApiResponseUtil.error(res, "Unauthorized", 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponseUtil.error(
        res,
        "Forbidden: Insufficient permissions",
        403
      );
    }

    next();
  };
};

export const requireAdmin = requireRole(Role.ADMIN);
export const requireBranchManager = requireRole(
  Role.ADMIN,
  Role.BRANCH_MANAGER
);
