import express from 'express';
import { handleGetSummary, handleGetActivity } from './dashboard.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, handleGetSummary);
router.get('/activity', protect, handleGetActivity);

export default router;
