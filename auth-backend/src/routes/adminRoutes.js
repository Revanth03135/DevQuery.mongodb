const express = require('express');
const AdminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticateAdmin);

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:userId', AdminController.getUserDetails);
router.post('/users/:userId/disconnect', AdminController.disconnectUser);
router.put('/users/:userId/subscription', AdminController.updateUserSubscription);

// System monitoring
router.get('/stats', AdminController.getSystemStats);
router.get('/analytics/connections', AdminController.getConnectionAnalytics);
router.get('/logs', AdminController.getLogs);

// System maintenance
router.post('/cleanup-connections', AdminController.cleanupConnections);

// Admin management
router.post('/admins', AdminController.createAdmin);

module.exports = router;
