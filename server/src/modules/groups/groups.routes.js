import express from 'express';
import { handleCreateGroup, handleGetGroups } from './groups.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validateGroupCreate } from './groups.validation.js';

const router = express.Router();

router.post('/', protect, validateGroupCreate, handleCreateGroup);
router.get('/', protect, handleGetGroups);

export default router;
