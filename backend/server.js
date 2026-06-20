import express from 'express';
// Trigger reload for email env recreation
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from './config/db.js'; // Imports pool and verifies db connection
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Enable express.json() for request parsing
app.use(express.json());

// Ensure uploads folder exists directly inside backend root
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
console.log('uploads folder detected');

// Statically serve uploads folder (placed BEFORE all routes)
app.use('/uploads', express.static(uploadsPath));
console.log('static route active');

// Ensure reports folder exists directly inside backend root
const reportsPath = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsPath)) {
  fs.mkdirSync(reportsPath, { recursive: true });
}

// Statically serve reports folder
app.use('/reports', express.static(reportsPath));
console.log('reports static route active');

// Fallback handler for missing uploads (placed BEFORE all routes)
app.use('/uploads', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Requested QR code asset not found on server disk.'
  });
});

// Health Check route
// GET /health
app.get('/health', async (req, res) => {
  try {
    // Verify database connectivity
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.status(200).json({
      status: "OK",
      db: "connected"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      db: "disconnected",
      message: error.message
    });
  }
});

// Health Check route
// GET /api/health
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

// Connect Routes
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

// Catch-all route for unhandled requests (404)
app.use((req, res, next) => {
  const error = new Error('Resource Not Found');
  error.statusCode = 404;
  next(error);
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack || err.message || err);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || 'Internal Server Error'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
