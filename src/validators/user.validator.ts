import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.nativeEnum(Role),
    branchId: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").optional(),
    role: z.nativeEnum(Role).optional(),
    branchId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const getUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    branchId: z.string().optional(),
    isActive: z.string().optional(),
    search: z.string().optional(),
  }),
});
