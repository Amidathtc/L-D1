import { z } from "zod";
import { RepaymentMethod } from "@prisma/client";

export const createRepaymentSchema = z.object({
  body: z.object({
    loanId: z.string(),
    amount: z.number().positive("Amount must be positive"),
    paidAt: z.string().datetime().optional(),
    method: z.nativeEnum(RepaymentMethod),
    reference: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateRepaymentSchema = z.object({
  body: z.object({
    method: z.nativeEnum(RepaymentMethod).optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
