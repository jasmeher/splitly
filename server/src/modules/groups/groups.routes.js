import express from 'express';
import {
  handleCreateGroup,
  handleGetGroups,
  handleGetGroupById,
  handleUpdateGroup,
  handleAddMember,
  handleRemoveMember,
  handleGetGroupMembers
} from './groups.controller.js';
import { protect } from '../../middleware/auth.middleware.js';
import {
  validateGroupCreate,
  validateGroupUpdate,
  validateAddMember
} from './groups.validation.js';

const router = express.Router();

router.post('/', protect, validateGroupCreate, handleCreateGroup);
router.get('/', protect, handleGetGroups);
router.get('/:groupId', protect, handleGetGroupById);
router.put('/:groupId', protect, validateGroupUpdate, handleUpdateGroup);

router.post('/:groupId/members', protect, validateAddMember, handleAddMember);
router.get('/:groupId/members', protect, handleGetGroupMembers);
router.delete('/:groupId/members/:userId', protect, handleRemoveMember);

export default router;
