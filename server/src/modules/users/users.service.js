import User from '../../models/User.js';

export const getUserProfile = async (userId) => {
  return User.findById(userId).select('-password');
};

export const updateUserProfile = async (userId, updateData) => {
  return User.findByIdAndUpdate(userId, updateData, { new: true });
};
