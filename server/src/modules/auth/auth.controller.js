import { registerUser, loginUser, rotateTokens, logoutUser } from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

// Secure cookie config settings for cross-site cookie mitigation
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (matching token expiry)
};

export const handleRegister = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    
    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    res.status(201).json(new ApiResponse(201, {
      user: result.user,
      accessToken: result.accessToken
    }, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleLogin = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    res.status(200).json(new ApiResponse(200, {
      user: result.user,
      accessToken: result.accessToken
    }, 'Logged in successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleRefreshToken = async (req, res, next) => {
  try {
    // Read from cookies, or fall back to request body payload
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    const result = await rotateTokens(token);

    // Set the new rotated refresh token in HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, cookieOptions);

    res.status(200).json(new ApiResponse(200, {
      accessToken: result.accessToken
    }, 'Access token refreshed successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleLogout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (token) {
      await logoutUser(token);
    }
    
    // Clear cookie from client browser
    res.clearCookie('refreshToken', { 
      httpOnly: true, 
      secure: cookieOptions.secure, 
      sameSite: cookieOptions.sameSite 
    });

    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};
