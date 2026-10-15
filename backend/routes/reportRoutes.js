import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect, anyRole } from '../middleware/authMiddleware.js';
import {
  getInventoryReport,
  getRacksReport,
  getAlertsReport,
  getQrRegistryReport,
  getWarehouseSummaryReport,
  getTransactionsReport,
  getMovementReport,
  getAiRecommendationsReport,
  getWarehouseHealthReport
} from '../controllers/reportController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportsDir);
  },
  filename: (req, file, cb) => {
    
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF reports are allowed!'));
    }
  }
});

const router = express.Router();

router.post('/upload', protect, anyRole, upload.single('report'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
  }
  res.status(200).json({
    status: 'success',
    message: 'Report uploaded successfully.',
    filename: req.file.filename,
    url: `/reports/${req.file.filename}`
  });
});

router.get('/', protect, anyRole, (req, res) => {
  try {
    const files = fs.readdirSync(reportsDir);
    const reports = files
      .filter(f => {
        const lower = f.toLowerCase();
        return lower.endsWith('.pdf') || lower.endsWith('.csv') || lower.endsWith('.xls');
      })
      .map(filename => {
        const filePath = path.join(reportsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created_at: stats.mtime,
          url: `/reports/${filename}`
        };
      })
      .sort((a, b) => b.created_at - a.created_at); 

    res.status(200).json({
      status: 'success',
      data: reports
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/inventory', protect, anyRole, getInventoryReport);
router.get('/racks', protect, anyRole, getRacksReport);
router.get('/alerts', protect, anyRole, getAlertsReport);
router.get('/qr-registry', protect, anyRole, getQrRegistryReport);
router.get('/warehouse-summary', protect, anyRole, getWarehouseSummaryReport);
router.get('/transactions', protect, anyRole, getTransactionsReport);
router.get('/movement', protect, anyRole, getMovementReport);
router.get('/ai-recommendations', protect, anyRole, getAiRecommendationsReport);
router.get('/warehouse-health', protect, anyRole, getWarehouseHealthReport);

router.delete('/:filename', protect, anyRole, (req, res) => {
  try {
    const { filename } = req.params;
    
    const safeFilename = path.basename(filename);
    const filePath = path.join(reportsDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.status(200).json({ status: 'success', message: 'Report deleted successfully.' });
    } else {
      res.status(404).json({ status: 'error', message: 'Report not found.' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
