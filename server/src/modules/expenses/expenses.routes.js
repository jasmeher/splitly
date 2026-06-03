import express from 'express';
import { handleCreateExpense, handleGetExpenses } from './expenses.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import { validateExpenseCreate } from './expenses.validation.js';

const router = express.Router();

router.post('/', protect, validateExpenseCreate, handleCreateExpense);
router.get('/', protect, handleGetExpenses);

export default router;
