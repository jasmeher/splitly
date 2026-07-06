import express from 'express';
import {
  handleCreateSettlement,
  handleGetSettlements,
  handleGetSimplifiedDebts
} from './settlements.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validateSettlementCreate } from './settlements.validation.js';

const router = express.Router();

router.post('/', protect, validateSettlementCreate, handleCreateSettlement);
router.get('/', protect, handleGetSettlements);
router.get('/simplified/:groupId', protect, handleGetSimplifiedDebts);

export default router;
