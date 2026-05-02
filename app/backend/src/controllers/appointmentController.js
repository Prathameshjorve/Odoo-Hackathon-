import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Slot from '../models/Slot.js';
import User from '../models/User.js';
import { sendResponse, sendError, getAvailableSlots, isWorkingDay } from '../utils/helpers.js';

export async function getAvailableSlotsByService(req, res) {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return sendError(res, 400, 'Please provide serviceId and date');
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return sendError(res, 404, 'Service not found');
    }

    // Check if it's a working day
    if (!isWorkingDay(date, service.daysAvailable)) {
      return sendResponse(res, 200, true, [], 'No slots available on this day');
    }

    // Get booked appointments for this date
    const bookedAppointments = await Appointment.find({
      service: serviceId,
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
      status: { $ne: 'cancelled' },
    });

    const bookedSlots = bookedAppointments.map((apt) => apt.startTime);

    // Generate available slots
    const availableSlots = getAvailableSlots(service.workingHours, service.bufferTime, service.duration, bookedSlots);

    sendResponse(res, 200, true, availableSlots, 'Available slots fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function createAppointment(req, res) {
  try {
    const { serviceId, date, startTime, endTime, notes, location } = req.body;
    const customerId = req.userId;

    if (!serviceId || !date || !startTime || !endTime) {
      return sendError(res, 400, 'Please provide all required fields');
    }

    // Get service details
    const service = await Service.findById(serviceId).populate('organiser');
    if (!service) {
      return sendError(res, 404, 'Service not found');
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      service: serviceId,
      date: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
      startTime,
      status: { $ne: 'cancelled' },
    });

    if (existingAppointment) {
      return sendError(res, 400, 'This slot is already booked');
    }

    // Create appointment
    const appointment = await Appointment.create({
      service: serviceId,
      organiser: service.organiser._id,
      customer: customerId,
      date: new Date(date),
      startTime,
      endTime,
      paymentAmount: service.price,
      notes,
      location: location || 'Not specified',
      status: 'pending',
    });

    // Populate appointment details
    await appointment.populate([
      { path: 'service', select: 'name duration price' },
      { path: 'organiser', select: 'name email phone' },
      { path: 'customer', select: 'name email phone' },
    ]);

    sendResponse(res, 201, true, appointment, 'Appointment created successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getMyAppointments(req, res) {
  try {
    const userId = req.userId;
    const { status, role } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    // Determine if user is customer or organiser
    if (role === 'organiser') {
      query.organiser = userId;
    } else {
      query.customer = userId;
    }

    const appointments = await Appointment.find(query)
      .populate('service', 'name price duration')
      .populate('organiser', 'name email phone avatar')
      .populate('customer', 'name email phone')
      .sort({ date: -1 });

    sendResponse(res, 200, true, appointments, 'Appointments fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAppointmentById(req, res) {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('service')
      .populate('organiser', 'name email phone avatar')
      .populate('customer', 'name email phone');

    if (!appointment) {
      return sendError(res, 404, 'Appointment not found');
    }

    sendResponse(res, 200, true, appointment, 'Appointment fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function cancelAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const userId = req.userId;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return sendError(res, 404, 'Appointment not found');
    }

    // Check if user is customer or organiser
    if (appointment.customer.toString() !== userId && appointment.organiser.toString() !== userId) {
      return sendError(res, 403, 'Not authorized to cancel this appointment');
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = reason || 'No reason provided';
    appointment.cancelledBy = appointment.customer.toString() === userId ? 'customer' : 'organiser';
    appointment.cancelledAt = new Date();
    await appointment.save();

    sendResponse(res, 200, true, appointment, 'Appointment cancelled successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function rescheduleAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { newDate, newStartTime, newEndTime } = req.body;
    const userId = req.userId;

    if (!newDate || !newStartTime || !newEndTime) {
      return sendError(res, 400, 'Please provide newDate, newStartTime, and newEndTime');
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return sendError(res, 404, 'Appointment not found');
    }

    if (appointment.customer.toString() !== userId && appointment.organiser.toString() !== userId) {
      return sendError(res, 403, 'Not authorized to reschedule this appointment');
    }

    // Check if new slot is available
    const existingAppointment = await Appointment.findOne({
      service: appointment.service,
      _id: { $ne: appointmentId },
      date: {
        $gte: new Date(newDate),
        $lt: new Date(new Date(newDate).getTime() + 24 * 60 * 60 * 1000),
      },
      startTime: newStartTime,
      status: { $ne: 'cancelled' },
    });

    if (existingAppointment) {
      return sendError(res, 400, 'This slot is already booked');
    }

    // Store previous appointment details
    const previousAppointmentData = {
      oldDate: appointment.date,
      oldStartTime: appointment.startTime,
      oldEndTime: appointment.endTime,
    };

    appointment.date = new Date(newDate);
    appointment.startTime = newStartTime;
    appointment.endTime = newEndTime;
    appointment.status = 'pending';
    appointment.rescheduleCount += 1;
    appointment.previousAppointment = appointmentId; // Self-reference for tracking

    await appointment.save();

    await appointment.populate([
      { path: 'service', select: 'name duration price' },
      { path: 'organiser', select: 'name email phone' },
      { path: 'customer', select: 'name email phone' },
    ]);

    sendResponse(res, 200, true, { ...appointment.toObject(), previousAppointmentData }, 'Appointment rescheduled successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function confirmAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return sendError(res, 404, 'Appointment not found');
    }

    // Only organiser can confirm
    if (appointment.organiser.toString() !== userId) {
      return sendError(res, 403, 'Only organiser can confirm appointments');
    }

    appointment.status = 'confirmed';
    await appointment.save();

    await appointment.populate([
      { path: 'service', select: 'name duration price' },
      { path: 'organiser', select: 'name email phone' },
      { path: 'customer', select: 'name email phone' },
    ]);

    sendResponse(res, 200, true, appointment, 'Appointment confirmed successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAppointmentStats(req, res) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    let stats = {};

    if (user.role === 'organiser') {
      const totalAppointments = await Appointment.countDocuments({ organiser: userId });
      const confirmedAppointments = await Appointment.countDocuments({ organiser: userId, status: 'confirmed' });
      const pendingAppointments = await Appointment.countDocuments({ organiser: userId, status: 'pending' });
      const completedAppointments = await Appointment.countDocuments({ organiser: userId, status: 'completed' });

      stats = {
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        completedAppointments,
      };
    } else {
      const totalAppointments = await Appointment.countDocuments({ customer: userId });
      const confirmedAppointments = await Appointment.countDocuments({ customer: userId, status: 'confirmed' });
      const completedAppointments = await Appointment.countDocuments({ customer: userId, status: 'completed' });
      const cancelledAppointments = await Appointment.countDocuments({ customer: userId, status: 'cancelled' });

      stats = {
        totalAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
      };
    }

    sendResponse(res, 200, true, stats, 'Stats fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
