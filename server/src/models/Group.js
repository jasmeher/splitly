import mongoose from 'mongoose';

/**
 * Group Schema definition
 */
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters'],
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true,
    maxlength: [3, 'Currency code must be exactly 3 characters'],
    minlength: [3, 'Currency code must be exactly 3 characters']
  },
  category: {
    type: String,
    default: 'Other',
    trim: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  memberCount: {
    type: Number,
    default: 1,
    min: [0, 'Member count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Explicit Indexes for performant queries
groupSchema.index({ createdBy: 1 });
groupSchema.index({ isArchived: 1 });

/**
 * Virtual to populate the group's members from the GroupMember collection
 */
groupSchema.virtual('members', {
  ref: 'GroupMember',
  localField: '_id',
  foreignField: 'group'
});

/**
 * Virtual to populate the group's expenses
 */
groupSchema.virtual('expenses', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'group'
});

/**
 * Virtual to populate the group's settlements
 */
groupSchema.virtual('settlements', {
  ref: 'Settlement',
  localField: '_id',
  foreignField: 'group'
});

const Group = mongoose.model('Group', groupSchema);
export default Group;
