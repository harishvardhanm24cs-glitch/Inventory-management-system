import express from 'express';
import { 
  getAuditLogs, 
  getRecentAuditLogs, 
  exportAuditLogs 
} from '../controllers/auditLogController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, anyRole, getAuditLogs);

router.get('/recent', protect, anyRole, getRecentAuditLogs);

router.get('/export', protect, anyRole, exportAuditLogs);

export default router;
