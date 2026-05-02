import { Appointment, Service, Slot, User } from '../models/index.js';
import { sendResponse, sendError, getAvailableSlots, isWorkingDay } from '../utils/helpers.js';
import { Op } from 'sequelize';

export async function getAvailableSlotsByService(req, res) {
  try {
    const { serviceId, date } = req.query;

    if (!serviceId || !date) {
      return sendError(res, 400, 'Please provide serviceId and date');
    }

    const service = await Service.findByPk(serviceId);
    if (!service) return sendError(res, 404, 'Service not found');

    // Check if it's a working day
    if (!isWorkingDay(date, service.daysAvailable)) {
      return sendResponse(res, 200, true, [], 'No slots available on this day');
    }

    // Get booked appointments for this date
    const start = new Date(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const bookedAppointments = await Appointment.findAll({ where: { serviceId: serviceId, date: { [Op.gte]: start, [Op.lt]: end }, status: { [Op.ne]: 'cancelled' } } });
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
    const service = await Service.findByPk(serviceId, { include: [{ model: User, as: 'organiser' }] });
    if (!service) return sendError(res, 404, 'Service not found');

    // Check if slot is already booked
    const start = new Date(date);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const existingAppointment = await Appointment.findOne({ where: { serviceId: serviceId, date: { [Op.gte]: start, [Op.lt]: end }, startTime, status: { [Op.ne]: 'cancelled' } } });

    if (existingAppointment) {
      return sendError(res, 400, 'This slot is already booked');
    }

    // Create appointment
    const appointment = await Appointment.create({
      serviceId: serviceId,
      organiserId: service.organiser.id,
      customerId,
      date: new Date(date),
      startTime,
      endTime,
      paymentAmount: service.price,
      notes,
      location: location || 'Not specified',
      status: 'pending',
    });

    const created = await Appointment.findByPk(appointment.id, { include: [
      { model: Service, as: 'service', attributes: ['id','name','duration','price'] },
      { model: User, as: 'organiser', attributes: ['id','name','email','phone'] },
      { model: User, as: 'customer', attributes: ['id','name','email','phone'] },
    ] });

    sendResponse(res, 201, true, created, 'Appointment created successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getMyAppointments(req, res) {
  try {
    const userId = req.userId;
    const { status, role } = req.query;

    const where = {};
    if (status) where.status = status;
    if (role === 'organiser') where.organiserId = userId; else where.customerId = userId;

    const appointments = await Appointment.findAll({ where, include: [
      { model: Service, as: 'service', attributes: ['id','name','price','duration'] },
      { model: User, as: 'organiser', attributes: ['id','name','email','phone','avatar'] },
      { model: User, as: 'customer', attributes: ['id','name','email','phone'] },
    ], order: [['date','DESC']] });

    sendResponse(res, 200, true, appointments, 'Appointments fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAppointmentById(req, res) {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findByPk(appointmentId, { include: [
      { model: Service, as: 'service' },
      { model: User, as: 'organiser', attributes: ['id','name','email','phone','avatar'] },
      { model: User, as: 'customer', attributes: ['id','name','email','phone'] },
    ] });
    if (!appointment) return sendError(res, 404, 'Appointment not found');
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

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) return sendError(res, 404, 'Appointment not found');
    if (appointment.customerId.toString() !== userId && appointment.organiserId.toString() !== userId) return sendError(res, 403, 'Not authorized to cancel this appointment');

    await appointment.update({ status: 'cancelled', cancellationReason: reason || 'No reason provided', cancelledBy: appointment.customerId.toString() === userId ? 'customer' : 'organiser', cancelledAt: new Date() });
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

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) return sendError(res, 404, 'Appointment not found');
    if (appointment.customerId.toString() !== userId && appointment.organiserId.toString() !== userId) return sendError(res, 403, 'Not authorized to reschedule this appointment');

    const start = new Date(newDate);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const existingAppointment = await Appointment.findOne({ where: { serviceId: appointment.serviceId, id: { [Op.ne]: appointmentId }, date: { [Op.gte]: start, [Op.lt]: end }, startTime: newStartTime, status: { [Op.ne]: 'cancelled' } } });
    if (existingAppointment) return sendError(res, 400, 'This slot is already booked');

    const previousAppointmentData = { oldDate: appointment.date, oldStartTime: appointment.startTime, oldEndTime: appointment.endTime };

    await appointment.update({ date: new Date(newDate), startTime: newStartTime, endTime: newEndTime, status: 'pending', rescheduleCount: (appointment.rescheduleCount || 0) + 1, previousAppointmentId: appointmentId });

    const updated = await Appointment.findByPk(appointment.id, { include: [ { model: Service, as: 'service', attributes: ['name','duration','price'] }, { model: User, as: 'organiser', attributes: ['name','email','phone'] }, { model: User, as: 'customer', attributes: ['name','email','phone'] } ] });

    sendResponse(res, 200, true, { ...updated.get({ plain: true }), previousAppointmentData }, 'Appointment rescheduled successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function confirmAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const userId = req.userId;

    const appointment = await Appointment.findByPk(appointmentId);
    if (!appointment) return sendError(res, 404, 'Appointment not found');
    if (appointment.organiserId.toString() !== userId) return sendError(res, 403, 'Only organiser can confirm appointments');
    await appointment.update({ status: 'confirmed' });
    const updated = await Appointment.findByPk(appointment.id, { include: [ { model: Service, as: 'service', attributes: ['name','duration','price'] }, { model: User, as: 'organiser', attributes: ['name','email','phone'] }, { model: User, as: 'customer', attributes: ['name','email','phone'] } ] });
    sendResponse(res, 200, true, updated, 'Appointment confirmed successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAppointmentStats(req, res) {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) return sendError(res, 404, 'User not found');
    let stats = {};
    if (user.role === 'organiser') {
      const totalAppointments = await Appointment.count({ where: { organiserId: userId } });
      const confirmedAppointments = await Appointment.count({ where: { organiserId: userId, status: 'confirmed' } });
      const pendingAppointments = await Appointment.count({ where: { organiserId: userId, status: 'pending' } });
      const completedAppointments = await Appointment.count({ where: { organiserId: userId, status: 'completed' } });
      stats = { totalAppointments, confirmedAppointments, pendingAppointments, completedAppointments };
    } else {
      const totalAppointments = await Appointment.count({ where: { customerId: userId } });
      const confirmedAppointments = await Appointment.count({ where: { customerId: userId, status: 'confirmed' } });
      const completedAppointments = await Appointment.count({ where: { customerId: userId, status: 'completed' } });
      const cancelledAppointments = await Appointment.count({ where: { customerId: userId, status: 'cancelled' } });
      stats = { totalAppointments, confirmedAppointments, completedAppointments, cancelledAppointments };
    }

    sendResponse(res, 200, true, stats, 'Stats fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
