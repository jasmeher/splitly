import mongoose from 'mongoose';

/**
 * RefreshToken Schema definition
 */
const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  token: {
    type: String,
    required: [true, 'Token string is required'],
    unique: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration timestamp is required']
  },
  revokedAt: {
    type: Date,
    default: null
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


/**
 * MongoDB TTL Index to automatically delete expired tokens from the collection.
 * expireAfterSeconds: 0 instructs MongoDB to delete the document when the current time is past 'expiresAt'.
 */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
