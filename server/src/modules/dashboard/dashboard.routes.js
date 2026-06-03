import express from 'express';
import { handleGetDashboard } from './dashboard.controller.js';
import { protect } from '../../middleware/auth.middleware.js';

const router = Router();

function Router() {
  return express.Router();
}

router.get('/', protect, handleGetDashboard);

export default router;
