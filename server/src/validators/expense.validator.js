import { z } from 'zod';

// Regular expression to validate MongoDB's 24-character hexadecimal ObjectId format
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema defining the shape and constraints of an individual split record.
 * This is nested inside the main createExpenseSchema.
 */
export const splitSchema = z.object({
  // Validate that the user ID string matches a 24-character hex MongoDB ObjectId format
  user: z.string().regex(objectIdRegex, 'Invalid User ID format'),
  
  // Validate that the user's portion of the bill is non-negative
  amountOwed: z.number().min(0, 'Amount owed cannot be negative'),
  
  // Validate optional fields required by custom split types (e.g. PERCENTAGE/SHARES)
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100').optional(),
  shares: z.number().min(0, 'Shares cannot be negative').optional()
});

/**
 * Zod schema defining the validation rules for creating a new Expense.
 * It enforces type checking, constraints, and custom default fallbacks.
 */
export const createExpenseSchema = z.object({
  title: z.string()
    .min(1, 'Expense title is required')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  description: z.string()
    .max(255, 'Description cannot exceed 255 characters')
    .trim()
    .optional()
    .default(''),
  amount: z.number()
    .positive('Expense amount must be greater than 0'),
  // Group can be null for direct friend-to-friend personal expenses
  group: z.string()
    .regex(objectIdRegex, 'Invalid Group ID format')
    .nullable()
    .optional()
    .default(null),
  paidBy: z.string()
    .regex(objectIdRegex, 'Invalid Payer User ID format'),
  category: z.string()
    .regex(objectIdRegex, 'Invalid Category ID format'),
  // Restricts split types to valid enums
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  receiptUrl: z.string()
    .trim()
    .optional()
    .default(''),
  // Flexible validator: parses ISO date strings, JS Dates, or transforms normal strings to Dates
  expenseDate: z.string()
    .datetime({ message: 'Invalid expense date format' })
    .or(z.date())
    .or(z.string().transform(val => new Date(val)))
    .optional(),
  notes: z.string()
    .trim()
    .optional()
    .default(''),
  // Validates the nested array of split values
  splits: z.array(splitSchema)
    .min(1, 'At least one split record is required')
});

// Update schema represents a partial copy of create schema where all fields are optional
export const updateExpenseSchema = createExpenseSchema.partial();
