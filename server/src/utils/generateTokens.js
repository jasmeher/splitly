import { signAccessToken, signRefreshToken } from '../services/jwt.service.js';
import RefreshToken from '../models/RefreshToken.js';

export const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);

    // Save refresh token to database with expiration
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days matching token expiry

    await RefreshToken.create({
      user: userId,
      token: refreshToken,
      expiresAt: expiryDate
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new Error('Failed to generate authentication tokens');
  }
};
