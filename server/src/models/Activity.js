import mongoose from 'mongoose';

/**
 * Activity Schema definition
 */
const activitySchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null // null if the activity is outside a group (e.g. general friend activities)
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User who initiated the action is required']
  },
  action: {
    type: String,
    enum: [
      'GROUP_CREATED',
      'GROUP_UPDATED',
      'GROUP_DELETED',
      'MEMBER_ADDED',
      'MEMBER_REMOVED',
      'EXPENSE_CREATED',
      'EXPENSE_UPDATED',
      'EXPENSE_DELETED',
      'SETTLEMENT_CREATED',
      'SETTLEMENT_UPDATED'
    ],
    required: [true, 'Activity action type is required']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {} // Dynamic object storing relevant contextual details (e.g. names, amounts, titles)
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // only need createdAt for activities
});

// Explicit Indexes for fast feed rendering
activitySchema.index({ group: 1 });
activitySchema.index({ user: 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
