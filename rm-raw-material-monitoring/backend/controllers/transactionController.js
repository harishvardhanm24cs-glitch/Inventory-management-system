const asyncHandler = require('express-async-handler');
const Transaction = require('../models/transactionModel');

// @desc    Get all transactions (History)
// @route   GET /api/transactions
// @access  Private (Manager & Engineer)
const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.getHistory();
  
  res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions
  });
});

module.exports = {
  getTransactions
};
