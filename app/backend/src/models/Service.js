import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a service name'],
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Beauty', 'Healthcare', 'Coaching', 'Wellness', 'Finance', 'Other'],
      required: true,
    },
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      min: 15,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    maxCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    image: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00', // HH:mm format
      },
      end: {
        type: String,
        default: '17:00', // HH:mm format
      },
    },
    daysAvailable: {
      type: [Number], // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      default: [1, 2, 3, 4, 5], // Monday to Friday
    },
    bufferTime: {
      type: Number, // in minutes between appointments
      default: 0,
    },
    requiresAdvancePayment: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ServiceSchema.index({ organiser: 1, isActive: 1 });
ServiceSchema.index({ category: 1 });

export default mongoose.model('Service', ServiceSchema);
