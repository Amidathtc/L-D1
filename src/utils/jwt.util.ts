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

    // Ensure we have valid JWT configuration
    const secret = config.jwt.secret || "fallback-secret-key";
    const expiresIn = "7d"; // Use a hardcoded valid value

    console.log("JWT Config:", {
      secret: secret ? "***" : "MISSING",
      expiresIn: expiresIn,
      refreshSecret: config.jwt.refreshSecret ? "***" : "MISSING",
    });

    try {
      const token = jwt.sign({ ...payload, jwtId }, secret, {
        expiresIn: expiresIn,
      });
      return { token, jwtId };
    } catch (error) {
      console.error("JWT Generation Error:", error);
      throw new Error("Failed to generate access token");
    }
  }

  static generateRefreshToken(payload: Omit<JwtPayload, "jwtId">): string {
    const refreshSecret = config.jwt.refreshSecret || "fallback-refresh-secret";
    const expiresIn = "30d"; // Use a hardcoded valid value

    try {
      return jwt.sign(payload, refreshSecret, {
        expiresIn: expiresIn,
      });
    } catch (error) {
      console.error("Refresh Token Generation Error:", error);
      throw new Error("Failed to generate refresh token");
    }
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
