import User from '../../models/User.js';
import RefreshToken from '../../models/RefreshToken.js';
import ApiError from '../../utils/ApiError.js';
import { generateAccessAndRefreshTokens } from '../../utils/generateTokens.js';
import { verifyRefreshToken } from '../../services/jwt.service.js';

export const registerUser = async (userData) => {
  const { email, username, fullName, password, phoneNumber } = userData;

  // Check for duplicate email or username
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(400, 'A user with this email address already exists');
    }
    throw new ApiError(400, 'A user with this username already exists');
  }

  // Create new user (pre-save hook hashes password)
  const user = await User.create({
    fullName,
    username,
    email,
    password,
    phoneNumber
  });

  const userResponse = user.toObject();
  delete userResponse.password;

  // Generate tokens
  const tokens = await generateAccessAndRefreshTokens(user._id);

  return { user: userResponse, ...tokens };
};

export const loginUser = async (loginData) => {
  const { email, password } = loginData;

  // Look up user and explicitly select password field (which is select: false by default)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status === 'SUSPENDED') {
    throw new ApiError(403, 'Your account has been suspended. Please contact support.');
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  const userResponse = user.toObject();
  delete userResponse.password;

  // Generate tokens
  const tokens = await generateAccessAndRefreshTokens(user._id);

  return { user: userResponse, ...tokens };
};

export const rotateTokens = async (tokenString) => {
  if (!tokenString) {
    throw new ApiError(400, 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(tokenString);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  // Look up token in DB to ensure it exists and isn't revoked/expired
  const dbToken = await RefreshToken.findOne({ token: tokenString });
  if (!dbToken || dbToken.isRevoked || dbToken.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token is invalid, expired, or has been revoked');
  }

  // Revoke the old refresh token
  dbToken.isRevoked = true;
  dbToken.revokedAt = new Date();
  await dbToken.save();

  // Generate new token pair
  const tokens = await generateAccessAndRefreshTokens(decoded.id);

  return tokens;
};

export const logoutUser = async (tokenString) => {
  if (!tokenString) {
    throw new ApiError(400, 'Refresh token is required');
  }

  const dbToken = await RefreshToken.findOne({ token: tokenString });
  if (dbToken) {
    dbToken.isRevoked = true;
    dbToken.revokedAt = new Date();
    await dbToken.save();
  }
  return { success: true, message: 'Logged out successfully' };
};
