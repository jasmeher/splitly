// Validation schemas for Group creation and modification
import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema defining the validation rules for creating a Group.
 */
export const createGroupSchema = z.object({
  name: z.string()
    .min(1, 'Group name is required')
    .max(100, 'Group name cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(255, 'Description cannot exceed 255 characters')
    .trim()
    .optional()
    .default(''),
  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .uppercase()
    .trim()
    .optional()
    .default('INR'),
  category: z.string()
    .trim()
    .optional()
    .default('Other')
});

/**
 * Zod schema defining the validation rules for updating a Group.
 */
export const updateGroupSchema = createGroupSchema.partial();

/**
 * Zod schema for adding a member to a group.
 * Validates that either an email or a userId is provided, but not blank.
 */
export const addMemberSchema = z.object({
  email: z.string()
    .email('Invalid email address format')
    .toLowerCase()
    .trim()
    .optional(),
  userId: z.string()
    .regex(objectIdRegex, 'Invalid User ID format')
    .optional(),
  role: z.enum(['ADMIN', 'MEMBER'])
    .optional()
    .default('MEMBER')
}).refine(data => data.email || data.userId, {
  message: "Either 'email' or 'userId' must be provided to add a group member",
  path: ['email']
});
