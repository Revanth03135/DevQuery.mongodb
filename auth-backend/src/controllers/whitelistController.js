const WhitelistManager = require('../models/WhitelistManager');
const logger = require('../utils/logger');

const whitelistManager = new WhitelistManager();

class WhitelistController {
  /**
   * Verify user is authenticated
   */
  static verifyUserAuth(req) {
    return req.user && req.user.id;
  }

  /**
   * GET /api/whitelist/:connectionId
   * Get whitelist configuration for a connection
   * Requires authentication
   */
  static async getWhitelist(req, res) {
    try {
      const { connectionId } = req.params;
      const userId = req.user?.id;

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'connectionId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whitelist = whitelistManager.getWhitelist(connectionId);

      logger.info(`User ${userId} fetched whitelist for connection ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist
      });
    } catch (error) {
      logger.error('Error getting whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get whitelist'
      });
    }
  }

  /**
   * POST /api/whitelist/:connectionId/enable
   * Enable/disable whitelist for a connection
   * Requires authentication
   */
  static async enableWhitelist(req, res) {
    try {
      const { connectionId } = req.params;
      const { enabled } = req.body;
      const userId = req.user?.id;

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'connectionId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whitelist = whitelistManager.setWhitelistEnabled(connectionId, enabled);

      logger.info(`User ${userId} ${enabled ? 'enabled' : 'disabled'} whitelist for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: `Whitelist ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      logger.error('Error enabling/disabling whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to enable/disable whitelist'
      });
    }
  }

  /**
   * POST /api/whitelist/:connectionId/table
   * Add table to whitelist
   * Requires authentication
   */
  static async addTable(req, res) {
    try {
      const { connectionId } = req.params;
      const { tableName, allowedColumns } = req.body;
      const userId = req.user?.id;

      if (!connectionId || !tableName) {
        return res.status(400).json({
          success: false,
          message: 'connectionId and tableName are required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whitelist = whitelistManager.addTable(connectionId, tableName, allowedColumns);

      logger.info(`User ${userId} added table '${tableName}' to whitelist for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: `Table '${tableName}' added to whitelist`
      });
    } catch (error) {
      logger.error('Error adding table to whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add table to whitelist'
      });
    }
  }

  /**
   * DELETE /api/whitelist/:connectionId/table/:tableName
   * Remove table from whitelist
   * Requires authentication
   */
  static async removeTable(req, res) {
    try {
      const { connectionId, tableName } = req.params;
      const userId = req.user?.id;

      if (!connectionId || !tableName) {
        return res.status(400).json({
          success: false,
          message: 'connectionId and tableName are required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whitelist = whitelistManager.removeTable(connectionId, tableName);

      logger.info(`User ${userId} removed table '${tableName}' from whitelist for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: `Table '${tableName}' removed from whitelist`
      });
    } catch (error) {
      logger.error('Error removing table from whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove table from whitelist'
      });
    }
  }

  /**
   * POST /api/whitelist/:connectionId/table/:tableName/columns
   * Add columns to a table in whitelist
   * Requires authentication
   * Empty columns array = all columns allowed
   */
  static async addColumnsToTable(req, res) {
    try {
      const { connectionId, tableName } = req.params;
      const { allowedColumns } = req.body;
      const userId = req.user?.id;

      if (!connectionId || !tableName) {
        return res.status(400).json({
          success: false,
          message: 'connectionId and tableName are required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const whitelist = whitelistManager.addColumnsToTable(
        connectionId,
        tableName,
        allowedColumns || []
      );

      logger.info(`User ${userId} added columns to table '${tableName}' for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: `Columns added to table '${tableName}'`
      });
    } catch (error) {
      logger.error('Error adding columns to table:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add columns to table'
      });
    }
  }

  /**
   * POST /api/whitelist/:connectionId/table/:tableName/columns/remove
   * Remove columns from a table in whitelist
   * Requires authentication
   */
  static async removeColumnsFromTable(req, res) {
    try {
      const { connectionId, tableName } = req.params;
      const { columnNames } = req.body;
      const userId = req.user?.id;

      if (!connectionId || !tableName) {
        return res.status(400).json({
          success: false,
          message: 'connectionId and tableName are required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!Array.isArray(columnNames)) {
        return res.status(400).json({
          success: false,
          message: 'columnNames must be an array'
        });
      }

      const whitelist = whitelistManager.removeColumnsFromTable(
        connectionId,
        tableName,
        columnNames
      );

      logger.info(`User ${userId} removed columns from table '${tableName}' for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: `Columns removed from table '${tableName}'`
      });
    } catch (error) {
      logger.error('Error removing columns from table:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove columns from table'
      });
    }
  }

  /**
   * GET /api/whitelist/:connectionId/export
   * Export whitelist configuration (for backup)
   * Requires authentication
   */
  static async exportWhitelist(req, res) {
    try {
      const { connectionId } = req.params;
      const userId = req.user?.id;

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'connectionId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const config = whitelistManager.exportWhitelist(connectionId);

      logger.info(`User ${userId} exported whitelist for connection ${connectionId}`);
      return res.json({
        success: true,
        data: config
      });
    } catch (error) {
      logger.error('Error exporting whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export whitelist'
      });
    }
  }

  /**
   * POST /api/whitelist/:connectionId/import
   * Import whitelist configuration (for restore)
   * Requires authentication
   */
  static async importWhitelist(req, res) {
    try {
      const { connectionId } = req.params;
      const { configuration } = req.body;
      const userId = req.user?.id;

      if (!connectionId) {
        return res.status(400).json({
          success: false,
          message: 'connectionId is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!configuration || typeof configuration !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'configuration is required and must be an object'
        });
      }

      const whitelist = whitelistManager.importWhitelist(connectionId, configuration);

      logger.info(`User ${userId} imported whitelist for connection: ${connectionId}`);
      return res.json({
        success: true,
        data: whitelist,
        message: 'Whitelist imported successfully'
      });
    } catch (error) {
      logger.error('Error importing whitelist:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to import whitelist'
      });
    }
  }

  /**
   * Check if AI operation is allowed
   * Used internally by AI controller
   */
  static checkOperationAllowed(connectionId, operation, tableName, columnNames = []) {
    try {
      if (operation === 'read') {
        return whitelistManager.isReadAllowed(connectionId, tableName, columnNames);
      } else if (operation === 'write') {
        return whitelistManager.isWriteAllowed(connectionId, tableName, columnNames);
      }
      return false;
    } catch (error) {
      logger.error('Error checking operation allowed:', error);
      return false;
    }
  }

  /**
   * Get whitelist manager instance (for use in other controllers)
   */
  static getManager() {
    return whitelistManager;
  }
}

module.exports = WhitelistController;
