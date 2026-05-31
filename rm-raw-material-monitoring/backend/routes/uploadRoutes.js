const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/upload
// @desc    Upload a document or image (e.g., invoices)
// @access  Private
router.post('/', protect, upload.single('document'), (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  res.status(200).json({
    success: true,
    message: 'File uploaded successfully',
    data: {
      filePath: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      size: req.file.size
    }
  });
});

module.exports = router;
