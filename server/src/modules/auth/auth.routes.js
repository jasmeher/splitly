import express from 'express';
import { handleRegister, handleLogin } from './auth.controller.js';
import { validateRegister, validateLogin } from './auth.validation.js';

const router = express.Router();

router.post('/register', validateRegister, handleRegister);
router.post('/login', validateLogin, handleLogin);

export default router;
