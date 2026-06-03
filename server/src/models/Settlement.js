import mongoose from 'mongoose';

/**
 * Settlement Schema definition
 */
const settlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null // null indicates direct friend-to-friend settlement outside of any group
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer (fromUser) is required']
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payee (toUser) is required']
  },
  amount: {
    type: Number,
    required: [true, 'Settlement amount is required'],
    min: [0.01, 'Settlement amount must be greater than 0']
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER'],
    default: 'CASH'
  },
  transactionReference: {
    type: String,
    trim: true,
    default: ''
  },
  note: {
    type: String,
    trim: true,
    maxlength: [255, 'Note cannot exceed 255 characters'],
    default: ''
  },
  settledAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator reference is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Explicit Indexes for quick queries and balance calculations
settlementSchema.index({ group: 1 });
settlementSchema.index({ fromUser: 1 });
settlementSchema.index({ toUser: 1 });
settlementSchema.index({ settledAt: -1 });

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
