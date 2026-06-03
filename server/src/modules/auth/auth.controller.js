import { registerUser, loginUser } from './auth.service.js';

export const handleRegister = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleLogin = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
