import { z } from "zod";

export const createLoanTypeSchema = z.object({
  body: z
    .object({
      name: z.string().min(3, "Loan type name must be at least 3 characters"),
      description: z.string().optional(),
      minAmount: z.number().positive("Minimum amount must be positive"),
      maxAmount: z.number().positive("Maximum amount must be positive"),
      termUnit: z.enum(["DAY", "WEEK", "MONTH"], {
        errorMap: () => ({ message: "Term unit must be DAY, WEEK, or MONTH" }),
      }),
      minTerm: z.number().int().min(1, "Minimum term must be at least 1"),
      maxTerm: z.number().int().min(1, "Maximum term must be at least 1"),
    })
    .refine((data) => data.maxAmount > data.minAmount, {
      message: "Maximum amount must be greater than minimum amount",
      path: ["maxAmount"],
    })
    .refine((data) => data.maxTerm >= data.minTerm, {
      message: "Maximum term must be greater than or equal to minimum term",
      path: ["maxTerm"],
    }),
});

export const updateLoanTypeSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    description: z.string().optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    termUnit: z.enum(["DAY", "WEEK", "MONTH"]).optional(),
    minTerm: z.number().int().min(1).optional(),
    maxTerm: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
