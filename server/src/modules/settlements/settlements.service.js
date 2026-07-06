import Settlement from '../../models/Settlement.js';
import Expense from '../../models/Expense.js';
import ExpenseSplit from '../../models/ExpenseSplit.js';
import Group from '../../models/Group.js';
import GroupMember from '../../models/GroupMember.js';
import User from '../../models/User.js';
import Activity from '../../models/Activity.js';
import ApiError from '../../utils/ApiError.js';
import { simplifyDebts } from '../../utils/calculateBalances.js';

/**
 * Creates a new settlement record and sequentially resolves outstanding ExpenseSplits.
 */
export const createSettlement = async (settlementData, creatorId) => {
  const { group, fromUser, toUser, amount, paymentMethod, transactionReference, note } = settlementData;

  const payerExists = await User.findById(fromUser);
  const payeeExists = await User.findById(toUser);
  if (!payerExists || !payeeExists) {
    throw new ApiError(404, 'Payer or Payee user not found');
  }

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

  const expensesQuery = {
    paidBy: toUser,
    isDeleted: { $ne: true }
  };
  if (group) {
    expensesQuery.group = group;
  } else {
    expensesQuery.group = null;
  }

  const expenses = await Expense.find(expensesQuery);
  const expenseIds = expenses.map(e => e._id);

  const splits = await ExpenseSplit.find({
    expense: { $in: expenseIds },
    user: fromUser,
    settlementStatus: { $ne: 'SETTLED' }
  }).populate('expense');

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

  // Log activity
  await Activity.create({
    group: group || null,
    user: creatorId,
    action: 'SETTLEMENT_CREATED',
    metadata: {
      amount,
      fromUserName: payerExists.fullName,
      toUserName: payeeExists.fullName,
      fromUserId: fromUser,
      toUserId: toUser
    }
  });

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
  const membership = await GroupMember.findOne({ group: groupId, user: userId, isActive: true });
  if (!membership) {
    throw new ApiError(403, 'You must be an active member of this group to view its balances');
  }

  const expenses = await Expense.find({ group: groupId, isDeleted: { $ne: true } });
  const expenseIds = expenses.map(e => e._id);

  const splits = await ExpenseSplit.find({ expense: { $in: expenseIds } }).populate('expense');

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

  const optimized = simplifyDebts(rawTransactions);

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
