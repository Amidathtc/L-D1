import { z } from "zod";

export const createCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    address: z.string().optional(),
    branchId: z.string(),
    currentOfficerId: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    branchId: z.string().optional(),
    currentOfficerId: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

export const reassignCustomerSchema = z.object({
  body: z.object({
    newBranchId: z.string().optional(),
    newOfficerId: z.string().optional(),
    reason: z.string().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});
