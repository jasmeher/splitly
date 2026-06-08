import express from 'express';
import { handleRegister, handleLogin, handleRefreshToken, handleLogout } from './auth.controller.js';
import { validateRegister, validateLogin } from './auth.validation.js';

const router = express.Router();

router.post('/register', validateRegister, handleRegister);
router.post('/login', validateLogin, handleLogin);
router.post('/refresh', handleRefreshToken);
router.post('/logout', handleLogout);

export default router;
