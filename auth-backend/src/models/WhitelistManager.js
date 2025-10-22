const crypto = require('crypto');
const logger = require('../utils/logger');

class WhitelistManager {
  constructor() {
    this.whitelists = new Map(); // connectionId -> whitelist config
    this.adminPasswordHash = this.hashPassword(process.env.WHITELIST_ADMIN_PASSWORD || 'default-secure-password');
  }

  /**
   * Hash password using SHA-256
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Verify password
   */
  verifyPassword(inputPassword, storedHash) {
    const inputHash = this.hashPassword(inputPassword);
    return inputHash === storedHash;
  }

  /**
   * Initialize whitelist for a connection (if not exists)
   * If no whitelist is set, all tables/columns are accessible
   */
  initializeWhitelist(connectionId, whitelist = null) {
    if (!this.whitelists.has(connectionId)) {
      this.whitelists.set(connectionId, {
        connectionId,
        enabled: false,
        tables: {}, // { tableName: { allowed: boolean, columns: { columnName: boolean } } }
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Whitelist initialized for connection: ${connectionId}`);
    }
    return this.whitelists.get(connectionId);
  }

  /**
   * Get whitelist for a connection
   */
  getWhitelist(connectionId) {
    this.initializeWhitelist(connectionId);
    return this.whitelists.get(connectionId);
  }

  /**
   * Update whitelist configuration
   */
  updateWhitelist(connectionId, whitelistConfig) {
    const whitelist = this.initializeWhitelist(connectionId);
    Object.assign(whitelist, {
      ...whitelistConfig,
      connectionId,
      updatedAt: new Date()
    });
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Whitelist updated for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Enable/disable whitelist for a connection
   * If disabled, all tables/columns are accessible
   */
  setWhitelistEnabled(connectionId, enabled) {
    const whitelist = this.initializeWhitelist(connectionId);
    whitelist.enabled = Boolean(enabled);
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Whitelist ${enabled ? 'enabled' : 'disabled'} for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Add table to whitelist
   */
  addTable(connectionId, tableName, allowedColumns = null) {
    const whitelist = this.initializeWhitelist(connectionId);
    if (!whitelist.tables[tableName]) {
      whitelist.tables[tableName] = {
        allowed: true,
        columns: allowedColumns ? this._normalizeColumns(allowedColumns) : {}
      };
    }
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Table '${tableName}' added to whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Remove table from whitelist
   */
  removeTable(connectionId, tableName) {
    const whitelist = this.initializeWhitelist(connectionId);
    delete whitelist.tables[tableName];
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Table '${tableName}' removed from whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Add columns to a table in whitelist
   * If allowedColumns is empty or null, all columns are allowed
   */
  addColumnsToTable(connectionId, tableName, allowedColumns = []) {
    const whitelist = this.initializeWhitelist(connectionId);
    if (!whitelist.tables[tableName]) {
      whitelist.tables[tableName] = {
        allowed: true,
        columns: {}
      };
    }
    
    if (Array.isArray(allowedColumns) && allowedColumns.length > 0) {
      const normalized = this._normalizeColumns(allowedColumns);
      whitelist.tables[tableName].columns = {
        ...whitelist.tables[tableName].columns,
        ...normalized
      };
    } else {
      // Empty columns = all columns allowed
      whitelist.tables[tableName].columns = {};
    }
    
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Columns added to table '${tableName}' in whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Remove columns from a table
   */
  removeColumnsFromTable(connectionId, tableName, columnNames = []) {
    const whitelist = this.initializeWhitelist(connectionId);
    if (!whitelist.tables[tableName]) {
      return whitelist;
    }

    columnNames.forEach(col => {
      delete whitelist.tables[tableName].columns[col];
    });
    
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    logger.info(`Columns removed from table '${tableName}' in whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Check if READ operation on table is allowed
   * If whitelist is disabled, returns true (all reads allowed)
   * If whitelist is enabled but table not in whitelist, returns false
   * If whitelist is enabled and table is in whitelist, returns true
   */
  isReadAllowed(connectionId, tableName, columnNames = []) {
    const whitelist = this.getWhitelist(connectionId);

    // If whitelist is disabled, all reads are allowed
    if (!whitelist.enabled) {
      return true;
    }

    // If table not in whitelist, deny
    if (!whitelist.tables[tableName]) {
      return false;
    }

    // If table has no column restrictions, all columns in this table allowed
    if (Object.keys(whitelist.tables[tableName].columns).length === 0) {
      return true;
    }

    // Check if specific columns are allowed
    if (Array.isArray(columnNames) && columnNames.length > 0) {
      return columnNames.every(col => 
        whitelist.tables[tableName].columns[col] === true
      );
    }

    return true;
  }

  /**
   * Check if WRITE operation on table/columns is allowed
   * If whitelist is disabled, returns true (all writes allowed)
   * For writes, we check both table AND columns
   */
  isWriteAllowed(connectionId, tableName, columnNames = []) {
    const whitelist = this.getWhitelist(connectionId);

    // If whitelist is disabled, all writes are allowed
    if (!whitelist.enabled) {
      return true;
    }

    // If table not in whitelist, deny write
    if (!whitelist.tables[tableName]) {
      return false;
    }

    // If table has no column restrictions, all writes allowed for this table
    if (Object.keys(whitelist.tables[tableName].columns).length === 0) {
      return true;
    }

    // Check if specific columns are allowed for write
    if (Array.isArray(columnNames) && columnNames.length > 0) {
      return columnNames.every(col => 
        whitelist.tables[tableName].columns[col] === true
      );
    }

    return true;
  }

  /**
   * Normalize column array to object format
   */
  _normalizeColumns(columns = []) {
    const normalized = {};
    if (Array.isArray(columns)) {
      columns.forEach(col => {
        normalized[col] = true;
      });
    }
    return normalized;
  }

  /**
   * Get whitelist status for all connections
   */
  getAllWhitelists() {
    return Array.from(this.whitelists.values());
  }

  /**
   * Clear all whitelists (for testing)
   */
  clearAll() {
    this.whitelists.clear();
    logger.info('All whitelists cleared');
  }

  /**
   * Export whitelist configuration (for debugging/backup)
   */
  exportWhitelist(connectionId) {
    const whitelist = this.getWhitelist(connectionId);
    return {
      connectionId: whitelist.connectionId,
      enabled: whitelist.enabled,
      tables: whitelist.tables,
      createdAt: whitelist.createdAt,
      updatedAt: whitelist.updatedAt
    };
  }

  /**
   * Import whitelist configuration
   */
  importWhitelist(connectionId, config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid whitelist configuration');
    }
    return this.updateWhitelist(connectionId, {
      enabled: config.enabled || false,
      tables: config.tables || {}
    });
  }
}

module.exports = WhitelistManager;
