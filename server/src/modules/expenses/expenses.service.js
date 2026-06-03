import Expense from '../../models/Expense.js';
import ExpenseSplit from '../../models/ExpenseSplit.js';

export const createExpense = async (expenseData, creatorId) => {
  const { splits, ...rest } = expenseData;
  const expense = await Expense.create({ ...rest, createdBy: creatorId });

  if (splits && splits.length > 0) {
    const splitDocs = splits.map(split => ({
      ...split,
      expense: expense._id
    }));
    await ExpenseSplit.insertMany(splitDocs);
  }

  return expense;
};

export const getExpenses = async (query) => {
  return Expense.find(query).populate('splits');
};
