const UserManager = require('../models/UserManager');
const dbManager = require('../utils/dbManager');
const logger = require('../utils/logger');

const userManager = new UserManager();

class AdminController {
  static async getAllUsers(req, res) {
    try {
      const { subscriptionType, isActive, page = 1, limit = 20 } = req.query;
      const filters = {};
      if (subscriptionType) filters.subscriptionType = subscriptionType;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const users = await userManager.getAllUsers(filters);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit, 10);
      const paginatedUsers = users.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          users: paginatedUsers,
          pagination: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total: users.length,
            totalPages: Math.ceil(users.length / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get all users failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users'
      });
    }
  }

  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      const connections = dbManager.getUserConnections(userId);

      res.json({
        success: true,
        data: {
          userId,
          connections,
          connectionCount: connections.length
        }
      });
    } catch (error) {
      logger.error('Get user details failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user details'
      });
    }
  }

  static async disconnectUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason = 'Admin action' } = req.body;

      await dbManager.disconnectUser(userId);
      const result = await userManager.disconnectUser(userId, reason);

      logger.info(`Admin ${req.user.userId} disconnected user ${userId}: ${reason}`);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Admin disconnect user failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect user'
      });
    }
  }

  static async updateUserSubscription(req, res) {
    try {
      const { userId } = req.params;
      const { subscriptionType, expiresAt } = req.body;

      await userManager.updateSubscription(userId, subscriptionType, expiresAt);

      logger.info(`Admin ${req.user.userId} updated subscription for user ${userId} to ${subscriptionType}`);

      res.json({
        success: true,
        message: 'User subscription updated successfully'
      });
    } catch (error) {
      logger.error('Update user subscription failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user subscription'
      });
    }
  }

  static async getSystemStats(req, res) {
    try {
      const totalConnections = dbManager.activeConnections.size;
      const cachedConnections = dbManager.connections.keys().length;

      const stats = await userManager.getSystemStats({ totalConnections, cachedConnections });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get system stats failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system statistics'
      });
    }
  }

  static async getConnectionAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      const analytics = await userManager.getConnectionAnalytics(timeRange);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Get connection analytics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection analytics'
      });
    }
  }

  static async cleanupConnections(req, res) {
    try {
      dbManager.cleanupExpiredConnections();

      res.json({
        success: true,
        message: 'Connection cleanup completed'
      });
    } catch (error) {
      logger.error('Connection cleanup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Connection cleanup failed'
      });
    }
  }

  static async getLogs(req, res) {
    try {
      const logs = await userManager.getLogs(req.query);
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      logger.error('Get logs failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve logs'
      });
    }
  }

  static async createAdmin(req, res) {
    try {
      const { username, email, password, fullName, permissions } = req.body;
      await userManager.createAdmin({ username, email, password, fullName, permissions });

      logger.info(`Admin ${req.user.userId} created new admin: ${username}`);

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully'
      });
    } catch (error) {
      logger.error('Create admin failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin user'
      });
    }
  }
}

module.exports = AdminController;
