import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAdminStats,
  getDashboardData,
  deactivateUser,
  activateUser,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes are protected
router.use(protect, authorize('admin'));

router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId/status', updateUserStatus);
router.put('/users/:userId/deactivate', deactivateUser);
router.put('/users/:userId/activate', activateUser);
router.get('/stats', getAdminStats);
router.get('/dashboard/data', getDashboardData);

export default router;
