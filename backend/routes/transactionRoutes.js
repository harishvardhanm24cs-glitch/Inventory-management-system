import express from 'express';
import db from '../config/db.js';
import { protect, anyRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/transactions
// Retrieves all stock adjustment logs (inward/outward) joined with material info
router.get('/', protect, anyRole, async (req, res, next) => {
  try {
    const [transactions] = await db.query(
      `SELECT t.id, t.transaction_type, t.quantity, t.created_at, m.material_name, m.barcode, m.batch_number, m.id as material_id, r.rack_code, u.name AS user_name
       FROM transactions t 
       JOIN materials m ON t.material_id = m.id 
       LEFT JOIN racks r ON r.material_name = m.material_name
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    
    res.status(200).json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    next(error);
  }
});

export default router;
