import { PasswordUtil } from "../utils/password.util";
import { JwtUtil } from "../utils/jwt.util";
import prisma from "../prismaClient";

// Define Role enum locally to avoid import issues
enum Role {
  ADMIN = "ADMIN",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  CREDIT_OFFICER = "CREDIT_OFFICER",
}

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
    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: true },
    });

    if (!user || user.deletedAt) {
      throw new Error("Invalid credentials");
    }

    if (!user.isActive) {
      throw new Error("Account is inactive");
    }

    const isPasswordValid = await PasswordUtil.compare(
      password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };

    const { token: accessToken, jwtId } =
      JwtUtil.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtil.generateRefreshToken(tokenPayload);

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.staffSession.create({
      data: {
        userId: user.id,
        jwtId,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
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
      branchId: user.branchId,
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
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
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
