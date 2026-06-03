import express from 'express';
import { handleGetNotifications, handleMarkAsRead } from './notifications.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', protect, handleGetNotifications);
router.put('/:id/read', protect, handleMarkAsRead);

export default router;
