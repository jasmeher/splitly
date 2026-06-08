import { createExpenseSchema } from '../../validators/expense.validator.js';

/**
 * Express middleware to validate incoming request bodies for Expense creation.
 * It parses payload values against createExpenseSchema and rejects requests on failure.
 */
export const validateExpenseCreate = (req, res, next) => {
  // safeParse runs validation without throwing exceptions. Returns an object:
  // { success: true, data: parsedObject } OR { success: false, error: ZodError }
  const result = createExpenseSchema.safeParse(req.body);
  
  if (!result.success) {
    // Format Zod's error array into a readable format for API clients
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'), // Maps path array (e.g. ['splits', '0', 'user']) to dot-path strings
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }
  
  // Important: replace req.body with the sanitized and coerced data returned by Zod
  req.body = result.data;
  next();
};
