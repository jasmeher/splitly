import mongoose from 'mongoose';

/**
 * ExpenseSplit Schema definition
 */
const expenseSplitSchema = new mongoose.Schema({
  expense: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: [true, 'Expense reference is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  amountOwed: {
    type: Number,
    required: [true, 'Amount owed is required'],
    min: [0, 'Amount owed cannot be negative']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  shares: {
    type: Number,
    min: [0, 'Shares cannot be negative']
  },
  settlementStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'SETTLED'],
    default: 'PENDING'
  },
  settledAmount: {
    type: Number,
    default: 0,
    min: [0, 'Settled amount cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to ensure a user only has one split record per expense
expenseSplitSchema.index({ expense: 1, user: 1 }, { unique: true });

const ExpenseSplit = mongoose.model('ExpenseSplit', expenseSplitSchema);
export default ExpenseSplit;
