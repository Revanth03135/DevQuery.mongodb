const express = require('express');
const DatabaseController = require('../controllers/databaseController');
const { 
  authenticateUser, 
  checkSubscription, 
  checkConnectionPermissions 
} = require('../middleware/auth');
const { 
  validateDatabaseConnection, 
  validateSQLQuery, 
  validateNLQuery 
} = require('../middleware/validation');

const router = express.Router();

// All database routes require authentication
router.use(authenticateUser);
router.use(checkSubscription);

// Test database connection
router.post('/test-connection', validateDatabaseConnection, DatabaseController.testConnection);

// Connect to database
router.post('/connect', validateDatabaseConnection, checkConnectionPermissions, DatabaseController.connect);

// Get user's database connections
router.get('/connections', DatabaseController.getUserConnections);

// Get connection status
router.get('/connections/:connectionId/status', DatabaseController.getConnectionStatus);

// Get database schema
router.get('/connections/:connectionId/schema', DatabaseController.getSchema);

// Execute SQL query
router.post('/connections/:connectionId/query', validateSQLQuery, DatabaseController.executeQuery);

// Generate SQL from natural language
router.post('/connections/:connectionId/generate-sql', validateNLQuery, DatabaseController.generateSQL);

// Disconnect from database
router.delete('/connections/:connectionId', DatabaseController.disconnect);

// Disconnect all user connections
router.delete('/connections', DatabaseController.disconnectAll);

module.exports = router;
