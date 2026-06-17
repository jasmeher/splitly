import Group from '../../models/Group.js';
import GroupMember from '../../models/GroupMember.js';
import User from '../../models/User.js';
import Expense from '../../models/Expense.js';
import ExpenseSplit from '../../models/ExpenseSplit.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Creates a new group and automatically adds the creator as the OWNER member.
 */
export const createGroup = async (groupData, creatorId) => {
  const group = await Group.create({ ...groupData, createdBy: creatorId });
  
  await GroupMember.create({
    group: group._id,
    user: creatorId,
    role: 'OWNER',
    isActive: true
  });
  
  return group;
};

/**
 * Fetches all groups that the user is an active member of.
 */
export const getGroupsByUser = async (userId) => {
  const memberships = await GroupMember.find({ user: userId, isActive: true })
    .populate({
      path: 'group',
      populate: {
        path: 'createdBy',
        select: 'name email avatar'
      }
    });
  
  return memberships.map(m => m.group).filter(Boolean);
};

/**
 * Fetches group details by ID, verifying that the requesting user is a member.
 */
export const getGroupById = async (groupId, userId) => {
  const membership = await GroupMember.findOne({ group: groupId, user: userId, isActive: true });
  if (!membership) {
    throw new ApiError(403, 'You are not an active member of this group');
  }
  
  const group = await Group.findById(groupId).populate('createdBy', 'name email avatar');
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }
  
  return group;
};

/**
 * Updates a group's details. Only OWNER or ADMIN members can perform this action.
 */
export const updateGroup = async (groupId, groupData, userId) => {
  const membership = await GroupMember.findOne({ group: groupId, user: userId, isActive: true });
  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    throw new ApiError(403, 'Only group owners or administrators can update group details');
  }
  
  const group = await Group.findByIdAndUpdate(groupId, groupData, { new: true, runValidators: true });
  if (!group) {
    throw new ApiError(404, 'Group not found');
  }
  
  return group;
};

/**
 * Adds a user as a member to a group, resolving user by email or userId.
 * Only active members can add other members.
 */
export const addMember = async (groupId, { email, userId, role }, requesterId) => {
  const requesterMembership = await GroupMember.findOne({ group: groupId, user: requesterId, isActive: true });
  if (!requesterMembership) {
    throw new ApiError(403, 'You must be an active member of this group to add other members');
  }
  
  let userToAdd = null;
  if (userId) {
    userToAdd = await User.findById(userId);
    if (!userToAdd) {
      throw new ApiError(404, 'User to add not found');
    }
  } else if (email) {
    userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) {
      throw new ApiError(404, `No user found with email address: ${email}`);
    }
  }
  
  if (!userToAdd) {
    throw new ApiError(400, 'Either email or userId must be provided');
  }
  
  const existingMember = await GroupMember.findOne({ group: groupId, user: userToAdd._id });
  if (existingMember) {
    if (existingMember.isActive) {
      throw new ApiError(400, 'User is already an active member of this group');
    } else {
      // Reactivate membership
      existingMember.isActive = true;
      if (role) {
        existingMember.role = role;
      }
      await existingMember.save();
      
      // Increment memberCount
      await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: 1 } });
      return existingMember;
    }
  }
  
  const newMember = await GroupMember.create({
    group: groupId,
    user: userToAdd._id,
    role: role || 'MEMBER',
    isActive: true
  });
  
  // Increment memberCount
  await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: 1 } });
  
  return newMember;
};

/**
 * Removes a member from the group.
 * - An OWNER cannot be removed (must transfer ownership first).
 * - A member can leave by removing themselves.
 * - Otherwise, only OWNER or ADMIN can remove other members (with role hierarchy checks).
 * - A member cannot be removed if they have unsettled balances.
 */
export const removeMember = async (groupId, userIdToRemove, requesterId) => {
  // Check if member to remove exists in the group
  const targetMember = await GroupMember.findOne({ group: groupId, user: userIdToRemove, isActive: true });
  if (!targetMember) {
    throw new ApiError(404, 'Member to remove is not an active member of this group');
  }
  
  if (targetMember.role === 'OWNER') {
    throw new ApiError(400, 'Group owner cannot be removed. Transfer ownership first.');
  }
  
  // Authorization checks
  if (requesterId.toString() !== userIdToRemove.toString()) {
    // Requester is removing someone else
    const requesterMember = await GroupMember.findOne({ group: groupId, user: requesterId, isActive: true });
    if (!requesterMember) {
      throw new ApiError(403, 'You are not a member of this group');
    }
    
    if (requesterMember.role === 'MEMBER') {
      throw new ApiError(403, 'Only group owners or administrators can remove members');
    }
    
    if (requesterMember.role === 'ADMIN' && targetMember.role === 'ADMIN') {
      throw new ApiError(403, 'Administrators cannot remove other administrators');
    }
  }
  
  // Check unsettled balances for the member to be removed
  const groupExpenses = await Expense.find({ group: groupId, isDeleted: { $ne: true } });
  const expenseIds = groupExpenses.map(e => e._id);
  const paidExpenseIds = groupExpenses.filter(e => e.paidBy.toString() === userIdToRemove.toString()).map(e => e._id);
  
  // 1. Check if they owe money on any expense split in the group
  const oweSplit = await ExpenseSplit.findOne({
    expense: { $in: expenseIds },
    user: userIdToRemove,
    $expr: { $gt: ['$amountOwed', '$settledAmount'] }
  });
  
  // 2. Check if they are owed money on any expense they paid in the group
  const owedSplit = await ExpenseSplit.findOne({
    expense: { $in: paidExpenseIds },
    user: { $ne: userIdToRemove },
    $expr: { $gt: ['$amountOwed', '$settledAmount'] }
  });
  
  if (oweSplit || owedSplit) {
    throw new ApiError(400, 'Member cannot be removed because they have unsettled balances in this group');
  }
  
  // Deactivate group member
  targetMember.isActive = false;
  await targetMember.save();
  
  // Decrement memberCount
  await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: -1 } });
  
  return targetMember;
};

/**
 * Retrieves all active members of a group, verifying that the requester has access.
 */
export const getGroupMembers = async (groupId, userId) => {
  const requesterMembership = await GroupMember.findOne({ group: groupId, user: userId, isActive: true });
  if (!requesterMembership) {
    throw new ApiError(403, 'You must be an active member of this group to view its members');
  }
  
  const members = await GroupMember.find({ group: groupId, isActive: true })
    .populate('user', 'name email avatar');
  
  return members;
};
