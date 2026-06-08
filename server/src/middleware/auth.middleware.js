import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'access_secret');
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        throw new ApiError(401, 'User associated with this token no longer exists');
      }
      if (req.user.status === 'SUSPENDED') {
        throw new ApiError(403, 'Your account has been suspended');
      }
      return next();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, 'Not authorized, token failed or expired');
    }
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized, no token provided');
  }
});
