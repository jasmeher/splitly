import ExpenseSplit from '../../models/ExpenseSplit.js';
import Expense from '../../models/Expense.js';
import GroupMember from '../../models/GroupMember.js';
import Activity from '../../models/Activity.js';

/**
 * Calculates user dashboard statistics: total you owe, total you are owed,
 * net balance, and a breakdown of net balances on a per-friend basis.
 */
export const getDashboardSummary = async (userId) => {
  // 1. Fetch splits where the user is the debtor (we owe money)
  // Populate the parent expense and the payer (creditor)
  const splitsOwedByMe = await ExpenseSplit.find({
    user: userId,
    settlementStatus: { $ne: 'SETTLED' }
  }).populate({
    path: 'expense',
    populate: {
      path: 'paidBy',
      select: 'fullName email avatar'
    }
  });

  let totalYouOwe = 0;
  const friendsMap = {};

  // Helper to initialize friend entries
  const getOrInitFriend = (userDoc) => {
    const fId = userDoc._id.toString();
    if (!friendsMap[fId]) {
      friendsMap[fId] = {
        user: {
          _id: userDoc._id,
          fullName: userDoc.fullName,
          email: userDoc.email,
          avatar: userDoc.avatar
        },
        netBalance: 0
      };
    }
    return friendsMap[fId];
  };

  splitsOwedByMe.forEach(split => {
    // Ignore if parent expense is deleted or if we paid it (self-debt)
    if (split.expense && !split.expense.isDeleted && split.expense.paidBy) {
      const creditorDoc = split.expense.paidBy;
      if (creditorDoc._id.toString() !== userId.toString()) {
        const outstanding = Math.round((split.amountOwed - split.settledAmount) * 100) / 100;
        if (outstanding > 0) {
          totalYouOwe += outstanding;
          const friend = getOrInitFriend(creditorDoc);
          friend.netBalance = Math.round((friend.netBalance - outstanding) * 100) / 100;
        }
      }
    }
  });

  // 2. Fetch expenses paid by the user to calculate credits (others owe us)
  const myPaidExpenses = await Expense.find({ paidBy: userId, isDeleted: { $ne: true } });
  const myPaidExpenseIds = myPaidExpenses.map(e => e._id);

  // Find splits on those expenses belonging to other users
  const splitsOwedToMe = await ExpenseSplit.find({
    expense: { $in: myPaidExpenseIds },
    user: { $ne: userId },
    settlementStatus: { $ne: 'SETTLED' }
  }).populate('user', 'fullName email avatar');

  let totalOwedToYou = 0;
  splitsOwedToMe.forEach(split => {
    if (split.user) {
      const outstanding = Math.round((split.amountOwed - split.settledAmount) * 100) / 100;
      if (outstanding > 0) {
        totalOwedToYou += outstanding;
        const friend = getOrInitFriend(split.user);
        friend.netBalance = Math.round((friend.netBalance + outstanding) * 100) / 100;
      }
    }
  });

  // Filter out friends with perfectly zeroed-out net balances
  const friendsBreakdown = Object.values(friendsMap).filter(f => f.netBalance !== 0);

  return {
    totalYouOwe: Math.round(totalYouOwe * 100) / 100,
    totalOwedToYou: Math.round(totalOwedToYou * 100) / 100,
    netBalance: Math.round((totalOwedToYou - totalYouOwe) * 100) / 100,
    friendsBreakdown
  };
};

/**
 * Retrieves the consolidated activity feed for a user (activities in their groups
 * or initiated by the user).
 */
export const getActivityFeed = async (userId) => {
  // Find all groups the user belongs to
  const memberships = await GroupMember.find({ user: userId, isActive: true }).select('group');
  const groupIds = memberships.map(m => m.group);

  // Query activities matching groups OR initiated by user
  return Activity.find({
    $or: [
      { group: { $in: groupIds } },
      { user: userId }
    ]
  })
    .populate('user', 'fullName email avatar')
    .populate('group', 'name')
    .sort({ createdAt: -1 })
    .limit(50);
};
