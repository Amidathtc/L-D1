import type { Request, Response, NextFunction } from "express";
import { JwtUtil } from "../utils/jwt.util";
import { ApiResponseUtil } from "../utils/apiResponse.util";
import prisma from "../prismaClient";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponseUtil.error(res, "No token provided", 401);
    }

    const token = authHeader.substring(7);

    const decoded = JwtUtil.verifyAccessToken(token);

    // Check if session is still valid
    const session = await prisma.staffSession.findFirst({
      where: {
        jwtId: decoded.jwtId,
        userId: decoded.userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!session) {
      return ApiResponseUtil.error(res, "Invalid or expired session", 401);
    }

    // Check if user is still active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt) {
      return ApiResponseUtil.error(res, "User account is inactive", 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };

    next();
  } catch (error) {
    return ApiResponseUtil.error(res, "Invalid token", 401);
  }
};
