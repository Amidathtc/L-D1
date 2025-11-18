import { PasswordUtil } from "../utils/password.util";
import { JwtUtil } from "../utils/jwt.util";
import { UserActivityService } from "./user-activity.service";
import { Role } from "@prisma/client";
import prisma from "../prismaClient";

export class AuthService {
  static async register(email: string, password: string) {
    // Check if maximum admin limit (6) has been reached
    const adminCount = await prisma.user.count({
      where: {
        role: Role.ADMIN,
        deletedAt: null,
      },
    });

    if (adminCount >= 6) {
      throw new Error(
        "Admin registration is not allowed. Maximum of 6 admins already exist."
      );
    }

    // Validate email doesn't exist
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Validate password
    const validation = PasswordUtil.validate(password);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const passwordHash = await PasswordUtil.hash(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      message: "Admin registered successfully",
    };
  }

  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    console.log("AuthService.login: Attempting login for email:", email);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    console.log("AuthService.login: User found:", {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      isActive: user?.isActive,
      deletedAt: user?.deletedAt,
      supervisorId: user?.supervisorId,
    });

    if (!user || user.deletedAt) {
      console.log("AuthService.login: User not found or deleted");
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      console.log("AuthService.login: User account is inactive");
      throw new Error("Account is inactive");
    }

    const isPasswordValid = await PasswordUtil.compare(
      password,
      user.passwordHash
    );

    console.log(
      "AuthService.login: Password validation result:",
      isPasswordValid
    );

    if (!isPasswordValid) {
      console.log("AuthService.login: Invalid password provided");
      // Track failed login attempt
      await UserActivityService.trackLogin(
        user.id,
        ipAddress,
        userAgent,
        false,
        "Invalid password"
      );
      throw new Error("Invalid credentials");
    }

    console.log("AuthService.login: Password valid, proceeding with login");

    // Track successful login
    await UserActivityService.trackLogin(user.id, ipAddress, userAgent, true);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    console.log(
      "AuthService.login: Generating tokens with payload:",
      tokenPayload
    );

    const { token: accessToken, jwtId } =
      JwtUtil.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

    console.log("AuthService.login: Tokens generated successfully");

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log(
      "AuthService.login: Creating session with expiresAt:",
      expiresAt
    );

    await prisma.staffSession.create({
      data: {
        userId: user.id,
        jwtId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    console.log("AuthService.login: Session created successfully");

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  static async logout(userId: string, jwtId: string) {
    await prisma.staffSession.updateMany({
      where: {
        userId,
        jwtId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  static async refreshToken(refreshToken: string) {
    const decoded = JwtUtil.verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new Error("Invalid user");
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const { token: accessToken, jwtId } =
      JwtUtil.generateAccessToken(tokenPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.staffSession.create({
      data: {
        userId: user.id,
        jwtId,
        expiresAt,
      },
    });

    return { accessToken };
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await PasswordUtil.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const validation = PasswordUtil.validate(newPassword);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const passwordHash = await PasswordUtil.hash(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all existing sessions
    await prisma.staffSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        profileImage: true,
        role: true,
        isActive: true,
        supervisorId: true,
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
