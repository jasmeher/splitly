import { getUserProfile, updateUserProfile } from './users.service.js';

export const handleGetProfile = async (req, res, next) => {
  try {
    const result = await getUserProfile(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleUpdateProfile = async (req, res, next) => {
  try {
    const result = await updateUserProfile(req.user.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
