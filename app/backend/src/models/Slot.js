import mongoose from 'mongoose';

const SlotSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // HH:mm format
      required: true,
    },
    endTime: {
      type: String, // HH:mm format
      required: true,
    },
    maxCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    appointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
SlotSchema.index({ service: 1, date: 1 });
SlotSchema.index({ organiser: 1, date: 1 });
SlotSchema.index({ isAvailable: 1 });

export default mongoose.model('Slot', SlotSchema);
