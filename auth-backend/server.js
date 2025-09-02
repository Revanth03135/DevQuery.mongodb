const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const databaseRoutes = require('./src/routes/databaseRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const logger = require('./src/utils/logger');
const DatabaseConnectionManager = require('./src/utils/DatabaseConnectionManager');

const app = express();

// Initialize database connection manager
const dbManager = new DatabaseConnectionManager();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000', 
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3000',
    'http://localhost:5173', // React dev server
    'http://localhost:5174', // Alternative React dev server
    'null' // Allow file:// protocol for local development
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Serve static files from the parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'home.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'home.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'DevQuery API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'DevQuery API v1.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/admin/login': 'Admin login',
        'POST /api/auth/logout': 'Logout',
        'GET /api/auth/profile': 'Get user profile',
        'GET /api/auth/validate': 'Validate token'
      },
      database: {
        'POST /api/database/test-connection': 'Test database connection',
        'POST /api/database/connect': 'Connect to database',
        'GET /api/database/connections': 'Get user connections',
        'GET /api/database/connections/:id/schema': 'Get database schema',
        'POST /api/database/connections/:id/query': 'Execute SQL query',
        'POST /api/database/connections/:id/generate-sql': 'Generate SQL from natural language',
        'DELETE /api/database/connections/:id': 'Disconnect from database'
      },
      admin: {
        'GET /api/admin/users': 'Get all users',
        'GET /api/admin/stats': 'Get system statistics',
        'POST /api/admin/users/:id/disconnect': 'Disconnect user'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Cleanup expired connections every 5 minutes
setInterval(() => {
  dbManager.cleanupExpiredConnections();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  // Close all database connections
  for (const [connectionId] of dbManager.activeConnections) {
    try {
      await dbManager.disconnect(connectionId);
    } catch (error) {
      logger.error(`Error closing connection ${connectionId}:`, error);
    }
  }
  
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`DevQuery API server running on port ${PORT}`);
  console.log(`🚀 DevQuery API is running on http://localhost:${PORT}/home`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💊 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
