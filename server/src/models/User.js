import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * Sub-schema for User Notification Preferences
 */
const notificationPreferencesSchema = new mongoose.Schema({
  email: { 
    type: Boolean, 
    default: true 
  },
  push: { 
    type: Boolean, 
    default: true 
  },
  inApp: { 
    type: Boolean, 
    default: true 
  }
}, { _id: false });

/**
 * User Schema definition
 */
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_.]+$/, 'Username can only contain alphanumeric characters, underscores, and periods']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Excluded from query results by default for security
  },
  avatar: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid E.164 phone number']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true,
    maxlength: [3, 'Currency code must be exactly 3 characters (e.g., USD, INR)'],
    minlength: [3, 'Currency code must be exactly 3 characters (e.g., USD, INR)']
  },
  timezone: {
    type: String,
    default: 'UTC',
    trim: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date
  },
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({})
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Note: Unique indexes for email and username are automatically created by Mongoose due to the 'unique: true' field constraints.

/**
 * Pre-save middleware to hash password if modified
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

/**
 * Custom helper method to compare incoming passwords
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Virtual to populate user's group memberships
 */
userSchema.virtual('memberships', {
  ref: 'GroupMember',
  localField: '_id',
  foreignField: 'user'
});

const User = mongoose.model('User', userSchema);
export default User;
