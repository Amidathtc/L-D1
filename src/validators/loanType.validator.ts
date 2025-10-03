import { z } from "zod";

export const createLoanTypeSchema = z.object({
  body: z
    .object({
      name: z.string().min(3, "Loan type name must be at least 3 characters"),
      description: z.string().optional(),
      minAmount: z.number().positive("Minimum amount must be positive"),
      maxAmount: z.number().positive("Maximum amount must be positive"),
    })
    .refine((data) => data.maxAmount > data.minAmount, {
      message: "Maximum amount must be greater than minimum amount",
      path: ["maxAmount"],
    }),
});

export const updateLoanTypeSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
