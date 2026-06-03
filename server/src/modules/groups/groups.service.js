import Group from '../../models/Group.js';
import GroupMember from '../../models/GroupMember.js';

export const createGroup = async (groupData, creatorId) => {
  const group = await Group.create({ ...groupData, createdBy: creatorId });
  await GroupMember.create({
    group: group._id,
    user: creatorId,
    role: 'OWNER'
  });
  return group;
};

export const getGroupsByUser = async (userId) => {
  const memberships = await GroupMember.find({ user: userId, isActive: true }).populate('group');
  return memberships.map(m => m.group);
};
