import { z } from 'zod';

// Regular expression to validate MongoDB's 24-character hexadecimal ObjectId format
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema defining the validation rules for logging a Settlement.
 */
export const createSettlementSchema = z.object({
  group: z.string()
    .regex(objectIdRegex, 'Invalid Group ID format')
    .nullable()
    .optional()
    .default(null),
  fromUser: z.string()
    .regex(objectIdRegex, 'Invalid Payer (fromUser) ID format'),
  toUser: z.string()
    .regex(objectIdRegex, 'Invalid Payee (toUser) ID format'),
  amount: z.number()
    .positive('Settlement amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'])
    .optional()
    .default('CASH'),
  transactionReference: z.string()
    .trim()
    .optional()
    .default(''),
  note: z.string()
    .max(255, 'Note cannot exceed 255 characters')
    .trim()
    .optional()
    .default('')
});
