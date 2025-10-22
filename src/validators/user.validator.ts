import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.nativeEnum(Role),
    branchId: z.string().optional(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").optional(),
    role: z.nativeEnum(Role).optional(),
    branchId: z
      .union([z.string(), z.null(), z.literal("null"), z.literal("")])
      .optional(),
    isActive: z
      .union([
        z.boolean(),
        z.enum(["true", "false"], {
          invalid_type_error: "Invalid boolean value",
        }),
      ])
      .optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    profileImage: z.string().optional(),
    removeProfileImage: z.enum(["true", "false"]).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const getUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.string().optional(), // Changed from z.nativeEnum(Role) to z.string()
    branchId: z.string().optional(),
    isActive: z.string().optional(),
    search: z.string().optional(),
  }),
});
