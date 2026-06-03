import { createExpense, getExpenses } from './expenses.service.js';

export const handleCreateExpense = async (req, res, next) => {
  try {
    const result = await createExpense(req.body, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleGetExpenses = async (req, res, next) => {
  try {
    const result = await getExpenses(req.query);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
