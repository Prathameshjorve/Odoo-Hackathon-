import express from 'express';
import {
  getAvailableSlotsByService,
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  confirmAppointment,
  getAppointmentStats,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/slots/available', getAvailableSlotsByService);

// Protected routes
router.post('/', protect, createAppointment);
router.get('/my-appointments', protect, getMyAppointments);
router.get('/stats', protect, getAppointmentStats);
router.get('/:appointmentId', protect, getAppointmentById);
router.put('/:appointmentId/cancel', protect, cancelAppointment);
router.put('/:appointmentId/reschedule', protect, rescheduleAppointment);
router.put('/:appointmentId/confirm', protect, confirmAppointment);

export default router;
