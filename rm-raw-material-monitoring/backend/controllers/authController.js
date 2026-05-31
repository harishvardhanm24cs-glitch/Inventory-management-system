const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Validate role
  const assignedRole = ['manager', 'engineer', 'worker'].includes(role) ? role : 'worker';

  // Create user
  const insertId = await User.create(name, email, hashedPassword, assignedRole);

  if (insertId) {
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: insertId,
        name,
        email,
        role: assignedRole,
        token: generateToken(insertId),
      }
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findByEmail(email);

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      }
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
