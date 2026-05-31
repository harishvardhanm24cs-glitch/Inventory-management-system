import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { protect, managerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// Protected routes
// GET /api/auth/profile
router.get('/profile', protect, getProfile);

// Role authorization testing routes
// GET /api/auth/manager-only
router.get('/manager-only', protect, managerOnly, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome Manager! You have access to this resource.'
  });
});

// GET /api/auth/worker-only
router.get('/worker-only', protect, workerOnly, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome Worker! You have access to this resource.'
  });
});

export default router;
