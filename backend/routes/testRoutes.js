import express from 'express';

const router = express.Router();

// GET /api/test
router.get('/test', (req, res) => {
  res.status(200).json({
    message: "RM Backend API working"
  });
});

export default router;
