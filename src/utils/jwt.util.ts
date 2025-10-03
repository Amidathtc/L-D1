import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config } from "../config/env";

interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  branchId?: string | null;
  jwtId: string;
}

export class JwtUtil {
  static generateAccessToken(payload: Omit<JwtPayload, "jwtId">): {
    token: string;
    jwtId: string;
  } {
    const jwtId = this.generateJwtId();
    const token = jwt.sign({ ...payload, jwtId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
    return { token, jwtId };
  }

  static generateRefreshToken(payload: Omit<JwtPayload, "jwtId">): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  }

  private static generateJwtId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
