import ExpenseSplit from '../../models/ExpenseSplit.js';

export const getDashboardSummary = async (userId) => {
  const splits = await ExpenseSplit.find({ user: userId });
  const totalOwed = splits.reduce((acc, split) => acc + (split.amountOwed - split.settledAmount), 0);

  return {
    totalOwedToYou: 0,
    totalYouOwe: totalOwed,
    netBalance: -totalOwed
  };
};
