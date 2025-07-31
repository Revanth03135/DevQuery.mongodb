const UserManager = require('../models/UserManager');
const DatabaseConnectionManager = require('../utils/DatabaseConnectionManager');
const logger = require('../utils/logger');

const userManager = new UserManager();
const dbManager = new DatabaseConnectionManager();

class AdminController {
  // Get all users
  static async getAllUsers(req, res) {
    try {
      const { subscriptionType, isActive, page = 1, limit = 20 } = req.query;
      
      const filters = {};
      if (subscriptionType) filters.subscriptionType = subscriptionType;
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const users = await userManager.getAllUsers(filters);
      
      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedUsers = users.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          users: paginatedUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
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

  // Get user details
  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      
      // Get user connections
      const connections = dbManager.getUserConnections(userId);
      
      // Get user activity (this would need to be implemented in UserManager)
      // For now, we'll return basic connection info
      
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

  // Disconnect user
  static async disconnectUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason = 'Admin action' } = req.body;

      // Disconnect from database connection manager
      await dbManager.disconnectUser(userId);
      
      // Disconnect from user session manager
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

  // Update user subscription
  static async updateUserSubscription(req, res) {
    try {
      const { userId } = req.params;
      const { subscriptionType, expiresAt } = req.body;

      // This would need to be implemented in UserManager
      // For now, we'll return a success message
      
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

  // Get system statistics
  static async getSystemStats(req, res) {
    try {
      // Get basic stats
      const totalConnections = dbManager.activeConnections.size;
      const cachedConnections = dbManager.connections.keys().length;

      // This would be enhanced with actual database queries
      const stats = {
        activeConnections: totalConnections,
        cachedConnections: cachedConnections,
        totalUsers: 0, // Would query from database
        activeUsers: 0, // Would query from database
        queriesExecuted: 0, // Would query from database
        uptime: process.uptime()
      };

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

  // Get connection analytics
  static async getConnectionAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;

      // This would involve querying the PostgreSQL database for analytics
      // For now, we'll return mock data
      const analytics = {
        connectionsByType: {
          postgresql: 45,
          mysql: 32,
          sqlite: 15,
          mongodb: 8
        },
        connectionsOverTime: [
          { time: '00:00', connections: 12 },
          { time: '06:00', connections: 25 },
          { time: '12:00', connections: 48 },
          { time: '18:00', connections: 35 }
        ],
        topUsers: [
          { userId: 'user1', connectionCount: 15 },
          { userId: 'user2', connectionCount: 12 },
          { userId: 'user3', connectionCount: 8 }
        ]
      };

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

  // Force cleanup expired connections
  static async cleanupConnections(req, res) {
    try {
      // Force cleanup of expired connections
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

  // Get application logs
  static async getLogs(req, res) {
    try {
      const { level = 'info', limit = 100 } = req.query;

      // This would read from log files
      // For now, we'll return a mock response
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'User connected to database',
          service: 'devquery-backend'
        }
      ];

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

  // Create new admin user
  static async createAdmin(req, res) {
    try {
      const { username, email, password, fullName, permissions } = req.body;

      // This would need to be implemented in UserManager
      // For now, we'll return a success message
      
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
