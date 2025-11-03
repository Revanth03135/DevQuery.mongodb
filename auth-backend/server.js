require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const connectMongo = require('./config/mongo');
const authRoutes = require('./src/routes/authRoutes');
const databaseRoutes = require('./src/routes/databaseRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const assistantRoutes = require('./src/routes/assistantRoutes');
const whitelistRoutes = require('./src/routes/whitelistRoutes');
const logger = require('./src/utils/logger');
const dbManager = require('./src/utils/dbManager');

const app = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration - MUST be before routes
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'null'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', authRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/whitelist', whitelistRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'home.html'));
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DevQuery MongoDB API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'DevQuery MongoDB API v1.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'Logout',
        'POST /api/auth/re-authenticate': 'Re-authenticate user',
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
      whitelist: {
        'GET /api/whitelist/:connectionId': 'Get whitelist configuration',
        'POST /api/whitelist/:connectionId/enable': 'Enable/disable whitelist',
        'POST /api/whitelist/:connectionId/table': 'Add table to whitelist',
        'DELETE /api/whitelist/:connectionId/table/:tableName': 'Remove table from whitelist',
        'POST /api/whitelist/:connectionId/table/:tableName/columns': 'Add columns to table',
        'POST /api/whitelist/:connectionId/table/:tableName/columns/remove': 'Remove columns from table',
        'GET /api/whitelist/:connectionId/export': 'Export whitelist configuration',
        'POST /api/whitelist/:connectionId/import': 'Import whitelist configuration'
      },
      admin: {
        'GET /api/admin/users': 'Get all users',
        'GET /api/admin/stats': 'Get system statistics',
        'POST /api/admin/users/:id/disconnect': 'Disconnect user'
      },
      assistant: {
        'POST /api/assistant/chat': 'Chat with AI assistant for SQL automation'
      }
    }
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

setInterval(() => {
  dbManager.cleanupExpiredConnections();
}, 5 * 60 * 1000);

const startServer = async () => {
  try {
    await connectMongo();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`DevQuery MongoDB API server running on port ${PORT}`);
      console.log(`🚀 DevQuery MongoDB API running at http://localhost:${PORT}`);
      console.log(`💊 Health Check: http://localhost:${PORT}/health`);
      console.log(`📖 API Docs: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
