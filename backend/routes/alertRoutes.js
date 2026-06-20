import express from 'express';
import db from '../config/db.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/alerts
// Retrieves all active and resolved inventory alerts with associated material details
router.get('/', protect, anyRole, async (req, res, next) => {
  try {
    const [alerts] = await db.query(
      `SELECT a.id, a.message, a.alert_status, a.created_at, m.material_name, m.barcode, m.batch_number 
       FROM alerts a 
       LEFT JOIN materials m ON a.material_id = m.id 
       ORDER BY a.created_at DESC`
    );
    
    res.status(200).json({
      status: 'success',
      data: alerts
    });
  } catch (error) {
    next(error);
  }
});

export default router;
