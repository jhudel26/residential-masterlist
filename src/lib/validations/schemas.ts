import { z } from "zod";

export const UserRoleSchema = z.enum(["super_admin", "admin", "user"]);

export const OwnershipTypeSchema = z.enum(["Owner", "Renter"]);

export const GenderTypeSchema = z.enum(["Male", "Female", "Other"]);

export const RecordStatusSchema = z.enum(["Active", "Inactive"]);

export const UserPermissionsSchema = z.object({
  can_create_homeowner: z.boolean().default(false),
  can_edit_homeowner: z.boolean().default(false),
  can_delete_homeowner: z.boolean().default(false),
  can_view_homeowner: z.boolean().default(true),
  can_export_excel: z.boolean().default(false),
  can_manage_users: z.boolean().default(false),
  can_grant_permissions: z.boolean().default(false),
  can_view_dashboard_stats: z.boolean().default(true),
});

export const CreateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("A valid email address is required")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["admin", "user"]).default("user"),
  permissions: UserPermissionsSchema.optional(),
});

export const HouseholdMemberSchema = z.object({
  id: z.string().optional(),
  homeowner_id: z.string().optional(),
  member_name: z.string().trim().min(1, "Member name is required"),
  relationship: z.string().trim().min(1, "Relationship is required"),
});

export const HomeownerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name is required (at least 2 characters)"),
  ownership_type: OwnershipTypeSchema,
  gender: GenderTypeSchema,
  birthdate: z.string().optional().nullable(),
  age: z.number().int().min(0).max(130).optional().nullable(),
  household_count: z.number().int().min(1, "At least 1 person must reside in the property"),
  ga_proxy_name: z.string().optional().nullable(),
  ga_proxy_relationship: z.string().optional().nullable(),
  contact_mobile: z
    .string()
    .trim()
    .regex(/^(\+?63|0)9\d{9}$/, "Must be a valid Philippine mobile number (e.g. 09171234567)")
    .or(z.literal("")),
  contact_email: z
    .string()
    .trim()
    .email("Invalid email format")
    .or(z.literal(""))
    .optional()
    .nullable(),
  address: z.string().trim().min(3, "Complete address is required"),
  pet_count: z.number().int().min(0, "Pet count cannot be negative").default(0),
  status: RecordStatusSchema.default("Active"),
  household_members: z.array(HouseholdMemberSchema).optional().default([]),
});

export const BulkImportRowSchema = z.object({
  full_name: z.string().trim().min(2, "Full Name is required"),
  ownership_type: z.enum(["Owner", "Renter"]).default("Owner"),
  gender: z.enum(["Male", "Female", "Other"]).default("Male"),
  birthdate: z.string().optional().default(""),
  address: z.string().trim().min(3, "Address is required"),
  household_count: z.coerce.number().int().min(1).default(1),
  contact_mobile: z.string().trim().optional().default(""),
  contact_email: z.string().trim().optional().default(""),
  pet_count: z.coerce.number().int().min(0).default(0),
  ga_proxy_name: z.string().optional().default(""),
  ga_proxy_relationship: z.string().optional().default(""),
  status: z.enum(["Active", "Inactive"]).default("Active"),
  household_members: z.string().optional().default(""),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type HomeownerInput = z.infer<typeof HomeownerSchema>;
export type HouseholdMemberInput = z.infer<typeof HouseholdMemberSchema>;
export type BulkImportRowInput = z.infer<typeof BulkImportRowSchema>;