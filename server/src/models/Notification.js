import mongoose from 'mongoose';

/**
 * Notification Schema definition
 */
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient user is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['EXPENSE', 'SETTLEMENT', 'GROUP', 'INVITE', 'SYSTEM'],
    required: [true, 'Notification type is required']
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  relatedEntityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  relatedEntityType: {
    type: String,
    enum: ['Expense', 'Settlement', 'Group', 'User', null],
    default: null
  }
}, {
  timestamps: true
});

// Explicit composite/single indexes for fast queries
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
