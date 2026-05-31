import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware to verify JWT token and protect routes.
 * Expects Authorization header in the format: Bearer <token>
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rm_secret_key');

      // Attach user details to request object
      req.user = decoded;

      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, token is invalid or expired'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized, no token provided'
    });
  }
};

/**
 * Middleware to authorize specific user roles.
 * @param {...string} roles - Array of permitted roles (e.g. 'manager', 'worker')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: role '${req.user?.role || 'unknown'}' is not allowed to access this resource`
      });
    }
    next();
  };
};

// Role check aliases
export const managerOnly = authorize('manager');
export const workerOnly = authorize('worker');
export const anyRole = authorize('manager', 'worker');
