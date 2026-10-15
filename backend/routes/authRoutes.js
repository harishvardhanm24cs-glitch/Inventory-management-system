import express from 'express';
import { register, login, getProfile, logout } from '../controllers/authController.js';
import { protect, managerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);

router.post('/login', login);

router.get('/profile', protect, getProfile);

router.post('/logout', protect, logout);

router.get('/manager-only', protect, managerOnly, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome Manager! You have access to this resource.'
  });
});

router.get('/worker-only', protect, workerOnly, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome Worker! You have access to this resource.'
  });
});

export default router;
