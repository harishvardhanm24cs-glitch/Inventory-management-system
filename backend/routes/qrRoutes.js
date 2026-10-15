import express from 'express';
import { 
  generateQR, 
  bulkGenerateQR, 
  getQrCodesList, 
  getQrTrace, 
  getQrHistory, 
  getQrHistoryByBarcode,
  getTrafficAnalytics 
} from '../controllers/qrController.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, anyRole, generateQR);
router.post('/generate', protect, anyRole, generateQR);

router.post('/bulk-generate', protect, anyRole, bulkGenerateQR);

router.get('/list', protect, anyRole, getQrCodesList);

router.get('/traffic-analytics', protect, anyRole, getTrafficAnalytics);

router.get('/history', protect, anyRole, getQrHistory);
router.get('/history/:barcode_id', protect, anyRole, getQrHistoryByBarcode);

router.get('/trace/:barcode_id', protect, anyRole, getQrTrace);

export default router;
