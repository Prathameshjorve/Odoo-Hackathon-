import { User, Appointment, Service } from '../models/index.js';
import { sendResponse, sendError } from '../utils/helpers.js';
import { Op } from 'sequelize';

export async function getAllUsers(req, res) {
  try {
    const { role, status } = req.query;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const users = await User.findAll({ where, order: [['createdAt','DESC']] });
    sendResponse(res, 200, true, users, 'Users fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return sendError(res, 404, 'User not found');
    sendResponse(res, 200, true, user, 'User fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    const user = await User.findByPk(userId);
    if (!user) return sendError(res, 404, 'User not found');
    await user.update({ status });
    sendResponse(res, 200, true, user, 'User status updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAdminStats(req, res) {
  try {
    const totalUsers = await User.count();
    const totalCustomers = await User.count({ where: { role: 'customer' } });
    const totalOrganisers = await User.count({ where: { role: 'organiser' } });
    const totalAppointments = await Appointment.count();
    const confirmedAppointments = await Appointment.count({ where: { status: 'confirmed' } });
    const completedAppointments = await Appointment.count({ where: { status: 'completed' } });
    const totalServices = await Service.count({ where: { isActive: true } });

    const totalRevenue = await Appointment.sum('paymentAmount', { where: { status: { [Op.in]: ['completed', 'confirmed'] } } }) || 0;

    const stats = { totalUsers, totalCustomers, totalOrganisers, totalAppointments, confirmedAppointments, completedAppointments, totalServices, totalRevenue };
    sendResponse(res, 200, true, stats, 'Admin stats fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getDashboardData(req, res) {
  try {
    // Recent appointments
    const recentAppointments = await Appointment.findAll({ include: [ { model: Service, as: 'service', attributes: ['name','price'] }, { model: User, as: 'customer', attributes: ['name','email'] }, { model: User, as: 'organiser', attributes: ['name','email'] } ], order: [['createdAt','DESC']], limit: 10 });
    const topServices = await Service.findAll({ where: { isActive: true }, order: [['rating','DESC'], ['reviewCount','DESC']], limit: 5 });

    // Revenue by month (last 12 months)
    const { fn, col } = require('sequelize');
    const revenueByMonthRaw = await Appointment.findAll({ attributes: [[fn('MONTH', col('createdAt')), 'month'], [fn('SUM', col('paymentAmount')), 'revenue'], [fn('COUNT', col('id')), 'count']], where: { status: { [Op.in]: ['completed','confirmed'] } }, group: ['month'], order: [['month','ASC']] });
    const revenueByMonth = revenueByMonthRaw.map(r => ({ month: r.get('month'), revenue: parseFloat(r.get('revenue')), count: parseInt(r.get('count')) }));

    // Peak booking hours: group by hour from startTime (assuming HH:mm)
    const peakRaw = await Appointment.findAll({ attributes: [[fn('SUBSTRING', col('startTime'), 1, 2), 'hour'], [fn('COUNT', col('id')), 'count']], group: ['hour'], order: [[fn('COUNT', col('id')), 'DESC']], limit: 5 });
    const peakHours = peakRaw.map(p => ({ hour: p.get('hour'), count: parseInt(p.get('count')) }));

    const dashboardData = { recentAppointments, topServices, revenueByMonth, peakHours };
    sendResponse(res, 200, true, dashboardData, 'Dashboard data fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function deactivateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return sendError(res, 404, 'User not found');
    await user.update({ status: 'inactive' });
    sendResponse(res, 200, true, user, 'User deactivated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function activateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) return sendError(res, 404, 'User not found');
    await user.update({ status: 'active' });
    sendResponse(res, 200, true, user, 'User activated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
