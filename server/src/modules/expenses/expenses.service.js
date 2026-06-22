import Expense from '../../models/Expense.js';
import ExpenseSplit from '../../models/ExpenseSplit.js';
import Group from '../../models/Group.js';
import GroupMember from '../../models/GroupMember.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Validates splits and calculates amountOwed for each participant based on splitType.
 */
const validateAndCalculateSplits = (amount, splitType, splits) => {
  if (!splits || splits.length === 0) {
    throw new ApiError(400, 'Splits are required and cannot be empty');
  }

  const count = splits.length;

  if (splitType === 'EQUAL') {
    const equalShare = Math.round((amount / count) * 100) / 100;
    let runningSum = 0;
    splits.forEach((split, idx) => {
      if (idx === count - 1) {
        split.amountOwed = Math.round((amount - runningSum) * 100) / 100;
      } else {
        split.amountOwed = equalShare;
        runningSum += equalShare;
      }
    });
  } else if (splitType === 'EXACT') {
    const sum = splits.reduce((acc, split) => acc + (split.amountOwed || 0), 0);
    if (Math.round(sum * 100) / 100 !== Math.round(amount * 100) / 100) {
      throw new ApiError(400, `Sum of individual splits (${sum}) does not equal total expense amount (${amount})`);
    }
  } else if (splitType === 'PERCENTAGE') {
    const totalPct = splits.reduce((acc, split) => acc + (split.percentage || 0), 0);
    if (Math.round(totalPct * 100) / 100 !== 100) {
      throw new ApiError(400, `Sum of percentages (${totalPct}%) must equal exactly 100%`);
    }
    let runningSum = 0;
    splits.forEach((split, idx) => {
      if (idx === count - 1) {
        split.amountOwed = Math.round((amount - runningSum) * 100) / 100;
      } else {
        const calculated = Math.round(((split.percentage / 100) * amount) * 100) / 100;
        split.amountOwed = calculated;
        runningSum += calculated;
      }
    });
  } else if (splitType === 'SHARES') {
    const totalShares = splits.reduce((acc, split) => acc + (split.shares || 0), 0);
    if (totalShares <= 0) {
      throw new ApiError(400, 'Total shares must be greater than 0');
    }
    let runningSum = 0;
    splits.forEach((split, idx) => {
      if (idx === count - 1) {
        split.amountOwed = Math.round((amount - runningSum) * 100) / 100;
      } else {
        const calculated = Math.round(((split.shares / totalShares) * amount) * 100) / 100;
        split.amountOwed = calculated;
        runningSum += calculated;
      }
    });
  } else {
    throw new ApiError(400, `Invalid split type: ${splitType}`);
  }
};

/**
 * Creates a new expense, runs group checks, validates math, and inserts split records.
 */
export const createExpense = async (expenseData, creatorId) => {
  const { splits, group, amount, splitType, paidBy, ...rest } = expenseData;

  // 1. Group membership checks
  if (group) {
    const groupDoc = await Group.findById(group);
    if (!groupDoc) {
      throw new ApiError(404, 'Group not found');
    }

    const activeMembers = await GroupMember.find({ group, isActive: true }).select('user');
    const memberIds = activeMembers.map(m => m.user.toString());

    if (!memberIds.includes(creatorId.toString())) {
      throw new ApiError(403, 'You must be an active member of this group to create expenses');
    }
    if (!memberIds.includes(paidBy.toString())) {
      throw new ApiError(400, 'The payer must be an active member of this group');
    }

    // Verify all split participants are members
    for (const split of splits) {
      if (!memberIds.includes(split.user.toString())) {
        throw new ApiError(400, `Split participant ${split.user} is not an active member of this group`);
      }
    }
  }

  // 2. Validate and calculate split shares
  validateAndCalculateSplits(amount, splitType, splits);

  // 3. Create the Expense document
  const expense = await Expense.create({
    ...rest,
    group,
    amount,
    splitType,
    paidBy,
    createdBy: creatorId
  });

  // 4. Create ExpenseSplits
  const splitDocs = splits.map(split => ({
    expense: expense._id,
    user: split.user,
    amountOwed: split.amountOwed,
    percentage: split.percentage,
    shares: split.shares,
    settlementStatus: 'PENDING',
    settledAmount: 0
  }));
  await ExpenseSplit.insertMany(splitDocs);

  return Expense.findById(expense._id).populate('splits');
};

/**
 * Lists expenses matching query, ignoring soft-deleted ones.
 */
export const getExpenses = async (query) => {
  const finalQuery = { ...query, isDeleted: { $ne: true } };
  return Expense.find(finalQuery).populate('splits');
};

/**
 * Fetches an expense by ID, verifying that the user is authorized (involved or group member).
 */
export const getExpenseById = async (expenseId, userId) => {
  const expense = await Expense.findOne({ _id: expenseId, isDeleted: { $ne: true } }).populate('splits');
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  let isAuthorized = false;
  if (expense.paidBy.toString() === userId.toString() || expense.createdBy.toString() === userId.toString()) {
    isAuthorized = true;
  } else {
    const isInSplits = expense.splits.some(s => s.user.toString() === userId.toString());
    if (isInSplits) {
      isAuthorized = true;
    } else if (expense.group) {
      const membership = await GroupMember.findOne({ group: expense.group, user: userId, isActive: true });
      if (membership) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw new ApiError(403, 'You are not authorized to view this expense');
  }

  return expense;
};

/**
 * Updates an expense. Recalculates splits if critical fields change.
 */
export const updateExpense = async (expenseId, updateData, userId) => {
  const expense = await Expense.findOne({ _id: expenseId, isDeleted: { $ne: true } }).populate('splits');
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  if (expense.createdBy.toString() !== userId.toString() && expense.paidBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only the creator or the payer can update this expense');
  }

  const { splits, amount, splitType, paidBy, group, ...rest } = updateData;

  // Track if we need to rebuild splits
  const shouldRebuildSplits = splits !== undefined || amount !== undefined || splitType !== undefined || paidBy !== undefined || group !== undefined;

  if (shouldRebuildSplits) {
    const finalAmount = amount !== undefined ? amount : expense.amount;
    const finalSplitType = splitType !== undefined ? splitType : expense.splitType;
    const finalGroup = group !== undefined ? group : expense.group;
    const finalPaidBy = paidBy !== undefined ? paidBy : expense.paidBy;
    const finalSplits = splits !== undefined ? splits : expense.splits.map(s => ({
      user: s.user,
      amountOwed: s.amountOwed,
      percentage: s.percentage,
      shares: s.shares
    }));

    // Group checks
    if (finalGroup) {
      const groupDoc = await Group.findById(finalGroup);
      if (!groupDoc) {
        throw new ApiError(404, 'Group not found');
      }

      const activeMembers = await GroupMember.find({ group: finalGroup, isActive: true }).select('user');
      const memberIds = activeMembers.map(m => m.user.toString());

      if (!memberIds.includes(userId.toString())) {
        throw new ApiError(403, 'You must be an active member of the target group to modify this expense');
      }
      if (!memberIds.includes(finalPaidBy.toString())) {
        throw new ApiError(400, 'The payer must be an active member of the target group');
      }

      for (const split of finalSplits) {
        if (!memberIds.includes(split.user.toString())) {
          throw new ApiError(400, `Split participant ${split.user} is not an active member of the target group`);
        }
      }
    }

    validateAndCalculateSplits(finalAmount, finalSplitType, finalSplits);

    // Save changes to Expense fields
    if (amount !== undefined) expense.amount = amount;
    if (splitType !== undefined) expense.splitType = splitType;
    if (group !== undefined) expense.group = group;
    if (paidBy !== undefined) expense.paidBy = paidBy;

    // Delete old splits and insert new ones
    await ExpenseSplit.deleteMany({ expense: expenseId });
    const splitDocs = finalSplits.map(split => ({
      expense: expenseId,
      user: split.user,
      amountOwed: split.amountOwed,
      percentage: split.percentage,
      shares: split.shares,
      settlementStatus: 'PENDING',
      settledAmount: 0
    }));
    await ExpenseSplit.insertMany(splitDocs);
  }

  // Update other attributes
  Object.assign(expense, rest);
  await expense.save();

  return Expense.findById(expenseId).populate('splits');
};

/**
 * Soft-deletes an expense and deletes its split records to clear outstanding balances.
 */
export const deleteExpense = async (expenseId, userId) => {
  const expense = await Expense.findOne({ _id: expenseId, isDeleted: { $ne: true } });
  if (!expense) {
    throw new ApiError(404, 'Expense not found');
  }

  if (expense.createdBy.toString() !== userId.toString() && expense.paidBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Only the creator or the payer can delete this expense');
  }

  expense.isDeleted = true;
  await expense.save();

  // Delete matching splits to clear the balance ledger
  await ExpenseSplit.deleteMany({ expense: expenseId });

  return expense;
};
