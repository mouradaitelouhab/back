// Serveur principal pour ALMAS & DIMAS

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');

// Middleware imports
const { sanitizeInput } = require('./middleware/validation');
const { connectDB } = require('./config/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS Configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://frontend2-81g7.onrender.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(helmet());
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Try again later.",
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize input
app.use(sanitizeInput);

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ALMAS & DIMAS API operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Global Error:', error);

  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ success: false, message: 'Invalid data', errors });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Start Server
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost';
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Server running!
📍 Port: ${PORT}
🌍 Env: ${process.env.NODE_ENV || 'development'}
🔗 Base: http://${HOST}:${PORT}
🏥 Health: http://${HOST}:${PORT}/health
  `);
});

// Graceful Shutdown
const shutdown = () => {
  console.log('🛑 Shutting down...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  shutdown();
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  shutdown();
});

module.exports = app;
