import { createGroup, getGroupsByUser } from './groups.service.js';

export const handleCreateGroup = async (req, res, next) => {
  try {
    const result = await createGroup(req.body, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const handleGetGroups = async (req, res, next) => {
  try {
    const result = await getGroupsByUser(req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
