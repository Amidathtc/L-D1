import { z } from "zod";
import { LoanStatus, TermUnit } from "@prisma/client";

export const createLoanSchema = z.object({
  body: z.object({
    customerId: z.string(),
    loanTypeId: z.string().optional(),
    principalAmount: z.number().positive("Principal amount must be positive"),
    termCount: z
      .number()
      .int()
      .positive("Term count must be a positive integer"),
    termUnit: z.nativeEnum(TermUnit),
    startDate: z.string().datetime(),
    processingFeeAmount: z.number().min(0),
    penaltyFeePerDayAmount: z.number().min(0),
    interestRate: z.number().min(0).max(100).optional(), // Annual interest rate percentage
    notes: z.string().optional(),
  }),
});

export const updateLoanSchema = z.object({
  body: z.object({
    loanTypeId: z.string().optional(),
    principalAmount: z.number().positive().optional(),
    termCount: z.number().int().positive().optional(),
    termUnit: z.nativeEnum(TermUnit).optional(),
    startDate: z.string().datetime().optional(),
    processingFeeAmount: z.number().min(0).optional(),
    penaltyFeePerDayAmount: z.number().min(0).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const updateLoanStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(LoanStatus),
    notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const disburseLoanSchema = z.object({
  body: z.object({
    disbursedAt: z.string().datetime().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const assignLoanSchema = z.object({
  body: z.object({
    assignedOfficerId: z.string(),
    reason: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
