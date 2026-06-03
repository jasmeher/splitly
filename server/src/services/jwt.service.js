import jwt from 'jsonwebtoken';

export const signAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.ACCESS_TOKEN_SECRET || 'access_secret', {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m'
  });
};

export const signRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret', {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'access_secret');
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret');
};
