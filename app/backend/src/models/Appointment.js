import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema(
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
    customer: {
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
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },
    paymentAmount: {
      type: Number,
      required: true,
    },
    notes: String,
    location: String,
    cancellationReason: String,
    cancelledBy: {
      type: String,
      enum: ['customer', 'organiser', 'system'],
    },
    cancelledAt: Date,
    rescheduleCount: {
      type: Number,
      default: 0,
    },
    previousAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    reminderSentAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
AppointmentSchema.index({ customer: 1, status: 1 });
AppointmentSchema.index({ organiser: 1, status: 1 });
AppointmentSchema.index({ date: 1, service: 1 });
AppointmentSchema.index({ status: 1 });

export default mongoose.model('Appointment', AppointmentSchema);
