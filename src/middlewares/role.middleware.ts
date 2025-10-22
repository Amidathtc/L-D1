import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ApiResponseUtil } from "../utils/apiResponse.util";

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.log("Role middleware: No user found in request");
      return ApiResponseUtil.error(res, "Unauthorized", 401);
    }

    console.log(
      "Role middleware: User role:",
      req.user.role,
      "Required roles:",
      roles
    );

    if (!roles.includes(req.user.role)) {
      console.log(
        "Role middleware: Access denied. User role:",
        req.user.role,
        "Required roles:",
        roles
      );
      return ApiResponseUtil.error(
        res,
        "Forbidden: Insufficient permissions",
        403
      );
    }

    console.log(
      "Role middleware: Access granted for user role:",
      req.user.role
    );
    next();
  };
};

export const requireAdmin = requireRole(Role.ADMIN);
export const requireBranchManager = requireRole(
  Role.ADMIN,
  Role.BRANCH_MANAGER
);
export const requireAdminOrManager = requireRole(
  Role.ADMIN,
  Role.BRANCH_MANAGER
);
export const requireStaff = requireRole(
  Role.ADMIN,
  Role.BRANCH_MANAGER,
  Role.CREDIT_OFFICER
);

export const requireAdminOrBranchManager = requireRole(
  Role.ADMIN,
  Role.BRANCH_MANAGER
);

export const requireAdminOrSelf = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    console.log("Role middleware: No user found in request for self-check");
    return ApiResponseUtil.error(res, "Unauthorized", 401);
  }

  const targetUserId = req.params?.id;

  if (
    req.user.role === Role.ADMIN ||
    (targetUserId && req.user.id === targetUserId)
  ) {
    console.log(
      "Role middleware: Self or admin access granted",
      req.user.id,
      "->",
      targetUserId
    );
    return next();
  }

  console.log(
    "Role middleware: Access denied for user",
    req.user.id,
    "attempting to modify",
    targetUserId
  );
  return ApiResponseUtil.error(
    res,
    "Forbidden: You do not have permission to perform this action",
    403
  );
};
