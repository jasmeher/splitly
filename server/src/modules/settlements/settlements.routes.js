import express from 'express';
import { handleCreateSettlement, handleGetSettlements } from './settlements.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validateSettlementCreate } from './settlements.validation.js';

const router = express.Router();

router.post('/', protect, validateSettlementCreate, handleCreateSettlement);
router.get('/', protect, handleGetSettlements);

export default router;
