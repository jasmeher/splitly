import express from 'express';
import {
  handleCreateExpense,
  handleGetExpenses,
  handleGetExpenseById,
  handleUpdateExpense,
  handleDeleteExpense
} from './expenses.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import {
  validateExpenseCreate,
  validateExpenseUpdate
} from './expenses.validation.js';

const router = express.Router();

router.post('/', protect, validateExpenseCreate, handleCreateExpense);
router.get('/', protect, handleGetExpenses);
router.get('/:expenseId', protect, handleGetExpenseById);
router.put('/:expenseId', protect, validateExpenseUpdate, handleUpdateExpense);
router.delete('/:expenseId', protect, handleDeleteExpense);

export default router;
