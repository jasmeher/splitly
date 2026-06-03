import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters')
    .trim(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain alphanumeric characters, underscores, and periods')
    .toLowerCase()
    .trim(),
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
});

export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
});

export const refreshSchema = z.object({
  token: z.string().min(1, 'Refresh token is required')
});
