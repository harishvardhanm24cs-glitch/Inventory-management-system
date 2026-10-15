const asyncHandler = require('express-async-handler');
const Transaction = require('../models/transactionModel');

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
