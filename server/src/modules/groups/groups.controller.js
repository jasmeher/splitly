import {
  createGroup,
  getGroupsByUser,
  getGroupById,
  updateGroup,
  addMember,
  removeMember,
  getGroupMembers
} from './groups.service.js';
import ApiResponse from '../../utils/ApiResponse.js';

export const handleCreateGroup = async (req, res, next) => {
  try {
    const result = await createGroup(req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, result, 'Group created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetGroups = async (req, res, next) => {
  try {
    const result = await getGroupsByUser(req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Groups retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetGroupById = async (req, res, next) => {
  try {
    const result = await getGroupById(req.params.groupId, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Group retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateGroup = async (req, res, next) => {
  try {
    const result = await updateGroup(req.params.groupId, req.body, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Group updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleAddMember = async (req, res, next) => {
  try {
    const result = await addMember(req.params.groupId, req.body, req.user.id);
    res.status(201).json(new ApiResponse(201, result, 'Member added successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleRemoveMember = async (req, res, next) => {
  try {
    await removeMember(req.params.groupId, req.params.userId, req.user.id);
    res.status(200).json(new ApiResponse(200, null, 'Member removed successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetGroupMembers = async (req, res, next) => {
  try {
    const result = await getGroupMembers(req.params.groupId, req.user.id);
    res.status(200).json(new ApiResponse(200, result, 'Group members retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
