import express from 'express';
import {
  createService,
  getAllServices,
  getServiceById,
  getMyServices,
  updateService,
  deleteService,
  getServicesByOrganiser,
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllServices);
router.get('/:serviceId', getServiceById);
router.get('/organiser/:organiserId', getServicesByOrganiser);

// Protected routes
router.post('/', protect, authorize('organiser', 'admin'), createService);
router.get('/my-services', protect, getMyServices);
router.put('/:serviceId', protect, authorize('organiser', 'admin'), updateService);
router.delete('/:serviceId', protect, authorize('organiser', 'admin'), deleteService);

export default router;
