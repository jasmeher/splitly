import { createExpenseSchema, updateExpenseSchema } from '../../validators/expense.validator.js';

/**
 * Helper middleware generator for Zod validation on Expense payloads.
 */
const validateSchema = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }
  req.body = result.data;
  next();
};

export const validateExpenseCreate = validateSchema(createExpenseSchema);
export const validateExpenseUpdate = validateSchema(updateExpenseSchema);
