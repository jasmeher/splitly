import { createSettlementSchema } from '../../validators/settlement.validator.js';

/**
 * Express middleware to validate incoming request bodies for Settlement creation.
 */
export const validateSettlementCreate = (req, res, next) => {
  const result = createSettlementSchema.safeParse(req.body);
  
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
