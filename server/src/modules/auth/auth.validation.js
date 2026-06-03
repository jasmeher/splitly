import { registerSchema, loginSchema } from '../../validators/auth.validator.js';

export const validateRegister = (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  
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

export const validateLogin = (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  
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
