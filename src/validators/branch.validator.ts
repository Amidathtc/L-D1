import { z } from "zod";

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Branch name must be at least 3 characters"),
    code: z
      .string()
      .min(2, "Branch code must be at least 2 characters")
      .max(10),
    managerId: z.string().optional(),
  }),
});

export const updateBranchSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    code: z.string().min(2).max(10).optional(),
    managerId: z.string().nullable().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
