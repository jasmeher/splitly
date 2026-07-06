import Settlement from '../../models/Settlement.js';
import Expense from '../../models/Expense.js';
import ExpenseSplit from '../../models/ExpenseSplit.js';
import Group from '../../models/Group.js';
import GroupMember from '../../models/GroupMember.js';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import { simplifyDebts } from '../../utils/calculateBalances.js';

/**
 * Creates a new settlement record and sequentially resolves outstanding ExpenseSplits.
 */
export const createSettlement = async (settlementData, creatorId) => {
  const { group, fromUser, toUser, amount, paymentMethod, transactionReference, note } = settlementData;

  // 1. Basic user existence verification
  const payerExists = await User.findById(fromUser);
  const payeeExists = await User.findById(toUser);
  if (!payerExists || !payeeExists) {
    throw new ApiError(404, 'Payer or Payee user not found');
  }

  // 2. Scoped group membership checks
  if (group) {
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      throw new ApiError(404, 'Group not found');
    }

    const activeMembers = await GroupMember.find({ group, isActive: true }).select('user');
    const memberIds = activeMembers.map(m => m.user.toString());

    if (!memberIds.includes(fromUser.toString()) || !memberIds.includes(toUser.toString())) {
      throw new ApiError(400, 'Both fromUser and toUser must be active members of the associated group');
    }
  }

  // 3. Create the Settlement document
  const settlement = await Settlement.create({
    group: group || null,
    fromUser,
    toUser,
    amount,
    paymentMethod: paymentMethod || 'CASH',
    transactionReference: transactionReference || '',
    note: note || '',
    createdBy: creatorId
  });

  // 4. Sequential Split Resolution
  // Find all active expenses paid by the payee (toUser)
  const expensesQuery = {
    paidBy: toUser,
    isDeleted: { $ne: true }
  };
  if (group) {
    expensesQuery.group = group;
  } else {
    expensesQuery.group = null; // Scope to personal/direct splits if group is null
  }

  const expenses = await Expense.find(expensesQuery);
  const expenseIds = expenses.map(e => e._id);

  // Find outstanding splits belonging to the payer (fromUser) for these expenses
  const splits = await ExpenseSplit.find({
    expense: { $in: expenseIds },
    user: fromUser,
    settlementStatus: { $ne: 'SETTLED' }
  }).populate('expense');

  // Sort splits chronologically (oldest expenses first)
  splits.sort((a, b) => new Date(a.expense.expenseDate) - new Date(b.expense.expenseDate));

  let remainingPayment = amount;
  for (const split of splits) {
    const unpaid = Math.round((split.amountOwed - split.settledAmount) * 100) / 100;
    if (unpaid <= 0) continue;

    if (remainingPayment >= unpaid) {
      split.settledAmount = split.amountOwed;
      split.settlementStatus = 'SETTLED';
      remainingPayment = Math.round((remainingPayment - unpaid) * 100) / 100;
      await split.save();
    } else {
      split.settledAmount = Math.round((split.settledAmount + remainingPayment) * 100) / 100;
      split.settlementStatus = 'PARTIAL';
      remainingPayment = 0;
      await split.save();
      break;
    }
  }

  return Settlement.findById(settlement._id)
    .populate('fromUser', 'name email avatar')
    .populate('toUser', 'name email avatar')
    .populate('group', 'name');
};

/**
 * Lists settlements based on query.
 */
export const getSettlements = async (query) => {
  return Settlement.find(query)
    .populate('fromUser', 'name email avatar')
    .populate('toUser', 'name email avatar')
    .populate('group', 'name')
    .sort({ settledAt: -1 });
};

/**
 * Calculates and returns optimized simplified group debt transaction paths.
 */
export const getSimplifiedDebtsForGroup = async (groupId, userId) => {
  // 1. Authorization check: Is user an active member of this group?
  const membership = await GroupMember.findOne({ group: groupId, user: userId, isActive: true });
  if (!membership) {
    throw new ApiError(403, 'You must be an active member of this group to view its balances');
  }

  // 2. Fetch all active expenses inside the group
  const expenses = await Expense.find({ group: groupId, isDeleted: { $ne: true } });
  const expenseIds = expenses.map(e => e._id);

  // 3. Fetch splits for those expenses
  const splits = await ExpenseSplit.find({ expense: { $in: expenseIds } }).populate('expense');

  // 4. Build raw transacting legs
  const rawTransactions = [];
  splits.forEach(split => {
    const outstanding = Math.round((split.amountOwed - split.settledAmount) * 100) / 100;
    if (outstanding > 0) {
      const debtor = split.user.toString();
      const creditor = split.expense.paidBy.toString();
      if (debtor !== creditor) {
        rawTransactions.push({
          from: debtor,
          to: creditor,
          amount: outstanding
        });
      }
    }
  });

  // 5. Optimize via Greedy Debt Simplifier
  const optimized = simplifyDebts(rawTransactions);

  // 6. Populate user profiles
  const uniqueUserIds = [...new Set(optimized.flatMap(t => [t.from, t.to]))];
  const users = await User.find({ _id: { $in: uniqueUserIds } }).select('name email avatar');
  const userMap = users.reduce((acc, u) => {
    acc[u._id.toString()] = u;
    return acc;
  }, {});

  return optimized.map(t => ({
    from: userMap[t.from] || { _id: t.from, name: 'Unknown User' },
    to: userMap[t.to] || { _id: t.to, name: 'Unknown User' },
    amount: t.amount
  }));
};
