import Service from '../models/Service.js';
import { sendResponse, sendError } from '../utils/helpers.js';

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
      organiser: req.userId,
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
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const services = await Service.find(query)
      .populate('organiser', 'name email avatar phone')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getServiceById(req, res) {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId).populate('organiser', 'name email avatar phone');
    if (!service) {
      return sendError(res, 404, 'Service not found');
    }

    sendResponse(res, 200, true, service, 'Service fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getMyServices(req, res) {
  try {
    const services = await Service.find({ organiser: req.userId }).sort({ createdAt: -1 });

    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function updateService(req, res) {
  try {
    const { serviceId } = req.params;
    const { name, description, category, duration, price, maxCapacity, workingHours, daysAvailable, bufferTime, isActive } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return sendError(res, 404, 'Service not found');
    }

    // Check if user is the service owner
    if (service.organiser.toString() !== req.userId) {
      return sendError(res, 403, 'Not authorized to update this service');
    }

    // Update fields
    if (name) service.name = name;
    if (description) service.description = description;
    if (category) service.category = category;
    if (duration) service.duration = duration;
    if (price) service.price = price;
    if (maxCapacity) service.maxCapacity = maxCapacity;
    if (workingHours) service.workingHours = workingHours;
    if (daysAvailable) service.daysAvailable = daysAvailable;
    if (bufferTime !== undefined) service.bufferTime = bufferTime;
    if (isActive !== undefined) service.isActive = isActive;

    await service.save();

    sendResponse(res, 200, true, service, 'Service updated successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function deleteService(req, res) {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return sendError(res, 404, 'Service not found');
    }

    // Check if user is the service owner
    if (service.organiser.toString() !== req.userId) {
      return sendError(res, 403, 'Not authorized to delete this service');
    }

    // Soft delete - mark as inactive instead of removing
    service.isActive = false;
    await service.save();

    sendResponse(res, 200, true, null, 'Service deleted successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}

export async function getServicesByOrganiser(req, res) {
  try {
    const { organiserId } = req.params;

    const services = await Service.find({ organiser: organiserId, isActive: true })
      .populate('organiser', 'name email avatar phone')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, services, 'Services fetched successfully');
  } catch (error) {
    sendError(res, 500, error.message);
  }
}
