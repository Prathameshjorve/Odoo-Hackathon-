import { Service, User } from '../models/index.js';
import { sendResponse, sendError } from '../utils/helpers.js';
import { Op } from 'sequelize';

export async function createService(req, res) {
  try {
    const {
      name,
      description,
      category,
      duration,
      price,
      maxCapacity,
      image,
      workingHours,
      daysAvailable,
      bufferTime,
      requiresAdvancePayment,
    } = req.body;

    if (!name || !description || !category || !duration || !price) {
      return sendError(res, 400, 'Please provide all required fields');
    }

    const service = await Service.create({
      name,
      description,
      category,
      duration,
      price,
      maxCapacity: maxCapacity || 1,
      image,
      organiserId: req.userId,
      workingHours: workingHours || { start: '09:00', end: '17:00' },
      daysAvailable: daysAvailable || [1, 2, 3, 4, 5],
      bufferTime: bufferTime || 0,
      requiresAdvancePayment: requiresAdvancePayment || false,
    });

    sendResponse(res, 201, true, service, 'Service created successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getAllServices(req, res) {
  try {
    const { category, search } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
    ];

    const services = await Service.findAll({ where, include: [{ model: User, as: 'organiser', attributes: ['id', 'name', 'email', 'avatar', 'phone'] }], order: [['createdAt', 'DESC']] });

    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getServiceById(req, res) {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByPk(serviceId, { include: [{ model: User, as: 'organiser', attributes: ['id', 'name', 'email', 'avatar', 'phone'] }] });
    if (!service) return sendError(res, 404, 'Service not found');
    sendResponse(res, 200, true, service, 'Service fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getMyServices(req, res) {
  try {
    const services = await Service.findAll({ where: { organiserId: req.userId }, order: [['createdAt', 'DESC']] });
    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function updateService(req, res) {
  try {
    const { serviceId } = req.params;
    const { name, description, category, duration, price, maxCapacity, workingHours, daysAvailable, bufferTime, isActive } = req.body;

    const service = await Service.findByPk(serviceId);
    if (!service) return sendError(res, 404, 'Service not found');

    if (service.organiserId.toString() !== req.userId.toString()) return sendError(res, 403, 'Not authorized to update this service');

    await service.update({ name, description, category, duration, price, maxCapacity, workingHours, daysAvailable, bufferTime, isActive });

    sendResponse(res, 200, true, service, 'Service updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function deleteService(req, res) {
  try {
    const { serviceId } = req.params;

    const service = await Service.findByPk(serviceId);
    if (!service) return sendError(res, 404, 'Service not found');
    if (service.organiserId.toString() !== req.userId.toString()) return sendError(res, 403, 'Not authorized to delete this service');
    await service.update({ isActive: false });
    sendResponse(res, 200, true, null, 'Service deleted successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getServicesByOrganiser(req, res) {
  try {
    const { organiserId } = req.params;

    const services = await Service.findAll({ where: { organiserId: organiserId, isActive: true }, include: [{ model: User, as: 'organiser', attributes: ['id','name','email','avatar','phone'] }], order: [['createdAt','DESC']] });
    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
