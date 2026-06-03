import mongoose from 'mongoose';

/**
 * Category Schema definition
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  icon: {
    type: String,
    required: [true, 'Category icon is required'],
    trim: true,
    default: 'tag' // fallback icon
  },
  color: {
    type: String,
    default: '#808080',
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color code']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ isDefault: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;
