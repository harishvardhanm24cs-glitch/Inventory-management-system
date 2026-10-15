import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from '../config/db.js';

dotenv.config();

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      
      token = req.headers.authorization.split(' ')[1];

      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rm_secret_key');

      
      const [users] = await db.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
      const databaseRole = users.length > 0 ? users[0].role : null;
      req.databaseRole = databaseRole;

      const currentTokenRole = decoded.role;

      
      if (databaseRole && databaseRole !== currentTokenRole) {
        console.log(`[AUTH DEBUG] Role mismatch! Token role: '${currentTokenRole}', Database role: '${databaseRole}'. Forcing logout.`);
        return res.status(401).json({
          status: 'error',
          message: 'Not authorized, role has changed. Please log in again.'
        });
      }

      
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
 * @param {...string} roles - Array of permitted roles (e.g. 'manager', 'worker', 'admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    const currentTokenRole = req.user ? req.user.role : 'unknown';
    const databaseRole = req.databaseRole || currentTokenRole;

    console.log(`[AUTH DEBUG] req.user:`, req.user);
    console.log(`[AUTH DEBUG] req.user.role:`, currentTokenRole);
    console.log(`[AUTH DEBUG] requiredRole:`, roles);
    console.log(`[AUTH DEBUG] current token role:`, currentTokenRole);
    console.log(`[AUTH DEBUG] database role:`, databaseRole);

    const isAllowed = req.user && roles.includes(currentTokenRole);
    console.log(`[AUTH DEBUG] authorization decision:`, isAllowed ? 'ALLOWED' : 'DENIED');

    if (!isAllowed) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: role '${currentTokenRole}' is not allowed to access this resource`
      });
    }
    next();
  };
};

export const managerOnly = authorize('manager', 'admin');
export const workerOnly = authorize('worker');
export const anyRole = authorize('manager', 'worker', 'admin');
export const adminOnly = authorize('admin', 'manager');

export const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rm_secret_key');
      req.user = decoded;
    } catch (e) {
      
    }
  }
  return next();
};

