import mongoose from 'mongoose';

/**
 * Expense Schema definition
 */
const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [255, 'Description cannot exceed 255 characters'],
    default: ''
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null // null indicates a personal/non-group expense (direct friend-to-friend split)
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  splitType: {
    type: String,
    enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'],
    required: [true, 'Split type is required']
  },
  receiptUrl: {
    type: String,
    default: ''
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator reference is required']
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Explicit Indexes for performance
expenseSchema.index({ group: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ isDeleted: 1 });

/**
 * Virtual to populate all splits associated with this expense
 */
expenseSchema.virtual('splits', {
  ref: 'ExpenseSplit',
  localField: '_id',
  foreignField: 'expense'
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
