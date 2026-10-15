import express from 'express';

import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from './config/db.js'; 
import testRoutes from './routes/testRoutes.js';
import authRoutes from './routes/authRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import rackRoutes from './routes/rackRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import scannerRoutes from './routes/scannerRoutes.js';
import warehouseRoutes from './routes/warehouseRoutes.js';
import digitalTwinRoutes from './routes/digitalTwinRoutes.js';
import rackInventoryRoutes from './routes/rackInventoryRoutes.js';
import materialLocatorRoutes from './routes/materialLocatorRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import movementRoutes from './routes/movementRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import aiApiRoutes from './routes/aiApiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
console.log('uploads folder detected');

app.use('/uploads', express.static(uploadsPath));
console.log('static route active');

const reportsPath = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsPath)) {
  fs.mkdirSync(reportsPath, { recursive: true });
}

app.use('/reports', express.static(reportsPath));
console.log('reports static route active');

app.use('/uploads', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Requested QR code asset not found on server disk.'
  });
});

app.get('/health', async (req, res) => {
  try {
    
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.status(200).json({
      status: "OK",
      db: "connected"
    });
  } catch (error) {
    console.warn('[Health Check Warning] Database disconnected:', error.message);
    res.status(200).json({
      status: "DEGRADED",
      db: "disconnected",
      diagnostic: error.message || 'MySQL Offline'
    });
  }
});

app.get('/api/health', (req, res) => {
  try {
    res.status(200).json({
      status: "Backend running"
    });
  } catch (error) {
    res.status(500).json({
      status: "Backend error",
      error: error.message
    });
  }
});

app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/logs', transactionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/racks', rackRoutes);
app.use('/api/generate-qr', qrRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/digital-twin', digitalTwinRoutes);
app.use('/api/rack-inventory', rackInventoryRoutes);
app.use('/api/material-locator', materialLocatorRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/v1/ai', aiApiRoutes);

app.use((req, res, next) => {
  const error = new Error('Resource Not Found');
  error.statusCode = 404;
  next(error);
});

app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack || err.message || err);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
