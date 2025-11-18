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
export const requireSupervisor = requireRole(Role.ADMIN, Role.SUPERVISOR);
export const requireAdminOrSupervisor = requireRole(
  Role.ADMIN,
  Role.SUPERVISOR
);
export const requireStaff = requireRole(
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.CREDIT_OFFICER
);

// Backward compatibility - BRANCH_MANAGER is now SUPERVISOR
export const requireBranchManager = requireRole(
  Role.ADMIN,
  Role.SUPERVISOR
);
export const requireAdminOrManager = requireRole(
  Role.ADMIN,
  Role.SUPERVISOR
);
export const requireAdminOrBranchManager = requireRole(
  Role.ADMIN,
  Role.SUPERVISOR
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
