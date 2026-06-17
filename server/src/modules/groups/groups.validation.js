import { createGroupSchema, updateGroupSchema, addMemberSchema } from '../../validators/group.validator.js';

/**
 * Helper middleware generator for Zod validation.
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

export const validateGroupCreate = validateSchema(createGroupSchema);
export const validateGroupUpdate = validateSchema(updateGroupSchema);
export const validateAddMember = validateSchema(addMemberSchema);
