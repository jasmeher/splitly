import express from 'express';
import { handleGetProfile, handleUpdateProfile } from './users.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validateUserUpdate } from './users.validation.js';

const router = express.Router();

router.get('/profile', protect, handleGetProfile);
router.put('/profile', protect, validateUserUpdate, handleUpdateProfile);

export default router;
