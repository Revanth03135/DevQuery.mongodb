const express = require('express');
const DatabaseController = require('../controllers/databaseController');
const { authenticateUser, checkSubscription, checkConnectionPermissions } = require('../middleware/auth');
const { validateDatabaseConnection, validateSQLQuery, validateNLQuery } = require('../middleware/validation');
const whitelistRoutes = require('./whitelistRoutes');

const router = express.Router();

router.use(authenticateUser);
router.use(checkSubscription);

router.post('/test-connection', validateDatabaseConnection, DatabaseController.testConnection);
router.post('/connect', validateDatabaseConnection, checkConnectionPermissions, DatabaseController.connect);
router.get('/connections', DatabaseController.getUserConnections);
router.get('/connections/:connectionId/status', DatabaseController.getConnectionStatus);
router.get('/connections/:connectionId/schema', DatabaseController.getSchema);
router.post('/connections/:connectionId/query', validateSQLQuery, DatabaseController.executeQuery);
router.post('/connections/:connectionId/generate-sql', validateNLQuery, DatabaseController.generateSQL);
router.delete('/connections/:connectionId', DatabaseController.disconnect);
router.delete('/connections', DatabaseController.disconnectAll);

// Schema Explorer Routes
router.get('/connections/:connectionId/explorer/tables', DatabaseController.getTables);
router.get('/connections/:connectionId/explorer/stats', DatabaseController.getSchemaStats);
router.get('/connections/:connectionId/explorer/tables/:tableName/columns', DatabaseController.getTableColumns);
router.get('/connections/:connectionId/explorer/tables/:tableName/columns/:columnName', DatabaseController.getColumnMetadata);
router.get('/connections/:connectionId/explorer/tables/:tableName/columns/:columnName/type', DatabaseController.getColumnType);
router.get('/connections/:connectionId/explorer/search-columns', DatabaseController.findColumns);

// Whitelist management routes
router.use('/whitelist', whitelistRoutes);

module.exports = router;
