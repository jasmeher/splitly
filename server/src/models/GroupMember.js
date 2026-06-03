import mongoose from 'mongoose';

/**
 * GroupMember Schema definition
 */
const groupMemberSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group reference is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  role: {
    type: String,
    enum: ['OWNER', 'ADMIN', 'MEMBER'],
    default: 'MEMBER'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate user memberships in the same group
groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

const GroupMember = mongoose.model('GroupMember', groupMemberSchema);
export default GroupMember;
