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

// Generate QR Code and register material
router.post('/', protect, anyRole, generateQR);
router.post('/generate', protect, anyRole, generateQR);

// Bulk generate QR Codes
router.post('/bulk-generate', protect, anyRole, bulkGenerateQR);

// Get paginated and filterable list of generated QR codes
router.get('/list', protect, anyRole, getQrCodesList);

// Get warehouse traffic analytics
router.get('/traffic-analytics', protect, anyRole, getTrafficAnalytics);

// Get QR Code history logs
router.get('/history', protect, anyRole, getQrHistory);
router.get('/history/:barcode_id', protect, anyRole, getQrHistoryByBarcode);

// Get QR Code Traceability history
router.get('/trace/:barcode_id', protect, anyRole, getQrTrace);

export default router;
