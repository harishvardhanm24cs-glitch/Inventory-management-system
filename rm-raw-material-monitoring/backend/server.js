require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('./config/db'); 

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(require('./middleware/thresholdChecker'));

app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/scan', require('./routes/scanRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/rack-inventory', require('./routes/rackInventoryRoutes'));
app.use('/api/racks', require('./routes/racksRoutes'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
