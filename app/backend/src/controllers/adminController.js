import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import { sendResponse, sendError } from '../utils/helpers.js';

export async function getAllUsers(req, res) {
  try {
    const { role, status } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    sendResponse(res, 200, true, users, 'Users fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

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

    const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendResponse(res, 200, true, user, 'User status updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAdminStats(req, res) {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalOrganisers = await User.countDocuments({ role: 'organiser' });
    const totalAppointments = await Appointment.countDocuments();
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const totalServices = await Service.countDocuments({ isActive: true });

    // Calculate revenue
    const revenue = await Appointment.aggregate([
      { $match: { status: { $in: ['completed', 'confirmed'] } } },
      { $group: { _id: null, total: { $sum: '$paymentAmount' } } },
    ]);

    const totalRevenue = revenue.length > 0 ? revenue[0].total : 0;

    const stats = {
      totalUsers,
      totalCustomers,
      totalOrganisers,
      totalAppointments,
      confirmedAppointments,
      completedAppointments,
      totalServices,
      totalRevenue,
    };

    sendResponse(res, 200, true, stats, 'Admin stats fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getDashboardData(req, res) {
  try {
    // Recent appointments
    const recentAppointments = await Appointment.find()
      .populate('service', 'name price')
      .populate('customer', 'name email')
      .populate('organiser', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top services
    const topServices = await Service.find({ isActive: true })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(5);

    // Revenue by month (last 12 months)
    const revenueByMonth = await Appointment.aggregate([
      { $match: { status: { $in: ['completed', 'confirmed'] } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$paymentAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Peak booking hours
    const peakHours = await Appointment.aggregate([
      {
        $group: {
          _id: { $substr: ['$startTime', 0, 2] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const dashboardData = {
      recentAppointments,
      topServices,
      revenueByMonth,
      peakHours,
    };

    sendResponse(res, 200, true, dashboardData, 'Dashboard data fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function deactivateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(userId, { status: 'inactive' }, { new: true });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendResponse(res, 200, true, user, 'User deactivated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function activateUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(userId, { status: 'active' }, { new: true });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendResponse(res, 200, true, user, 'User activated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
