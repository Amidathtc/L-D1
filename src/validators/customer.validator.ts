import { z } from "zod";

export const createCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phone: z.string().min(1, "Phone number is required"),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    address: z.string().optional(),
    dateOfBirth: z.date().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    company: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    note: z.string().optional(),
    branchId: z.string(),
    currentOfficerId: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().min(1, "Phone number is required").optional(),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
    address: z.string().optional(),
    dateOfBirth: z.date().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    profession: z.string().optional(),
    company: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
    note: z.string().optional(),
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
