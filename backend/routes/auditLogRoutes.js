import express from 'express';
import { 
  getAuditLogs, 
  getRecentAuditLogs, 
  exportAuditLogs 
} from '../controllers/auditLogController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get filterable and paginated logs
router.get('/', protect, anyRole, getAuditLogs);

// Get recent logs
router.get('/recent', protect, anyRole, getRecentAuditLogs);

// Export audit logs (returns all records matching filters)
router.get('/export', protect, anyRole, exportAuditLogs);

export default router;
