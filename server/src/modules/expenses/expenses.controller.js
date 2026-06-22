import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} from './expenses.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const handleCreateExpense = async (req, res, next) => {
  try {
    const result = await createExpense(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, result, 'Expense logged successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetExpenses = async (req, res, next) => {
  try {
    const result = await getExpenses(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Expenses retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetExpenseById = async (req, res, next) => {
  try {
    const result = await getExpenseById(req.params.expenseId, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Expense details retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateExpense = async (req, res, next) => {
  try {
    const result = await updateExpense(req.params.expenseId, req.body, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Expense updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteExpense = async (req, res, next) => {
  try {
    await deleteExpense(req.params.expenseId, req.user.id);
    res.status(200).json(new ApiResponse(200, null, 'Expense deleted successfully'));
  } catch (error) {
    next(error);
  }
};
