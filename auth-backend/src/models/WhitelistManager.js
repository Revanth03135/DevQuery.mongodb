const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Lazy-load UserConnection to avoid circular-dependency issues at startup
const getUserConnection = () => require('./UserConnection');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

class WhitelistManager {
  constructor() {
    this.whitelists = new Map(); // connectionId -> whitelist config (in-memory cache)
    // Hash admin password with bcrypt (async – resolved lazily on first verify)
    this._adminPasswordHashPromise = bcrypt.hash(
      process.env.WHITELIST_ADMIN_PASSWORD || 'default-secure-password',
      BCRYPT_ROUNDS
    );
  }

  /**
   * Hash password using bcrypt (secure, slow hash)
   */
  async hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify password using bcrypt.compare (timing-safe)
   */
  async verifyPassword(inputPassword, storedHash) {
    return bcrypt.compare(inputPassword, storedHash);
  }

  /**
   * Verify the whitelist admin password
   */
  async verifyAdminPassword(inputPassword) {
    const hash = await this._adminPasswordHashPromise;
    return bcrypt.compare(inputPassword, hash);
  }

  /**
   * Initialize whitelist for a connection (if not exists).
   * Tries to load persisted config from MongoDB first.
   * If no whitelist is set, all tables/columns are accessible.
   */
  async initializeWhitelist(connectionId, whitelist = null) {
    if (!this.whitelists.has(connectionId)) {
      // Try to load from MongoDB
      const persisted = await this._loadFromDb(connectionId);
      if (persisted) {
        this.whitelists.set(connectionId, persisted);
        logger.info(`Whitelist loaded from DB for connection: ${connectionId}`);
      } else {
        this.whitelists.set(connectionId, {
          connectionId,
          enabled: false,
          tables: {}, // { tableName: { allowed: boolean, columns: { columnName: boolean } } }
          createdAt: new Date(),
          updatedAt: new Date()
        });
        logger.info(`Whitelist initialized (new) for connection: ${connectionId}`);
      }
    }
    return this.whitelists.get(connectionId);
  }

  /**
   * Get whitelist for a connection (async — may load from DB)
   */
  async getWhitelist(connectionId) {
    return this.initializeWhitelist(connectionId);
  }

  /**
   * Synchronous in-memory getter (use only when async is not possible)
   */
  getWhitelistSync(connectionId) {
    return this.whitelists.get(connectionId) || {
      connectionId,
      enabled: false,
      tables: {}
    };
  }

  /**
   * Update whitelist configuration and persist to MongoDB
   */
  async updateWhitelist(connectionId, whitelistConfig) {
    const whitelist = await this.initializeWhitelist(connectionId);
    Object.assign(whitelist, {
      ...whitelistConfig,
      connectionId,
      updatedAt: new Date()
    });
    this.whitelists.set(connectionId, whitelist);
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Whitelist updated for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Enable/disable whitelist for a connection and persist
   */
  async setWhitelistEnabled(connectionId, enabled) {
    const whitelist = await this.initializeWhitelist(connectionId);
    whitelist.enabled = Boolean(enabled);
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Whitelist ${enabled ? 'enabled' : 'disabled'} for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Add table to whitelist
   */
  async addTable(connectionId, tableName, allowedColumns = null) {
    const whitelist = await this.initializeWhitelist(connectionId);
    if (!whitelist.tables[tableName]) {
      whitelist.tables[tableName] = {
        allowed: true,
        columns: allowedColumns ? this._normalizeColumns(allowedColumns) : {}
      };
    }
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Table '${tableName}' added to whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Remove table from whitelist
   */
  async removeTable(connectionId, tableName) {
    const whitelist = await this.initializeWhitelist(connectionId);
    delete whitelist.tables[tableName];
    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Table '${tableName}' removed from whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Add columns to a table in whitelist.
   * If allowedColumns is empty or null, all columns are allowed.
   */
  async addColumnsToTable(connectionId, tableName, allowedColumns = []) {
    const whitelist = await this.initializeWhitelist(connectionId);
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
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Columns added to table '${tableName}' in whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Remove columns from a table
   */
  async removeColumnsFromTable(connectionId, tableName, columnNames = []) {
    const whitelist = await this.initializeWhitelist(connectionId);
    if (!whitelist.tables[tableName]) {
      return whitelist;
    }

    columnNames.forEach(col => {
      delete whitelist.tables[tableName].columns[col];
    });

    whitelist.updatedAt = new Date();
    this.whitelists.set(connectionId, whitelist);
    await this._saveToDb(connectionId, whitelist);
    logger.info(`Columns removed from table '${tableName}' in whitelist for connection: ${connectionId}`);
    return whitelist;
  }

  /**
   * Check if READ operation on table is allowed.
   * Uses synchronous in-memory cache for hot path.
   */
  isReadAllowed(connectionId, tableName, columnNames = []) {
    const whitelist = this.getWhitelistSync(connectionId);

    if (!whitelist.enabled) return true;
    if (!whitelist.tables[tableName]) return false;
    if (Object.keys(whitelist.tables[tableName].columns).length === 0) return true;

    if (Array.isArray(columnNames) && columnNames.length > 0) {
      return columnNames.every(col => whitelist.tables[tableName].columns[col] === true);
    }

    return true;
  }

  /**
   * Check if WRITE operation on table/columns is allowed.
   */
  isWriteAllowed(connectionId, tableName, columnNames = []) {
    const whitelist = this.getWhitelistSync(connectionId);

    if (!whitelist.enabled) return true;
    if (!whitelist.tables[tableName]) return false;
    if (Object.keys(whitelist.tables[tableName].columns).length === 0) return true;

    if (Array.isArray(columnNames) && columnNames.length > 0) {
      return columnNames.every(col => whitelist.tables[tableName].columns[col] === true);
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
   * Persist whitelist config into the UserConnection MongoDB document
   */
  async _saveToDb(connectionId, whitelist) {
    try {
      const UserConnection = getUserConnection();
      await UserConnection.updateOne(
        { connectionId },
        {
          $set: {
            whitelistConfig: {
              enabled: whitelist.enabled,
              tables: whitelist.tables,
              updatedAt: whitelist.updatedAt
            }
          }
        }
      );
    } catch (err) {
      // Non-fatal — in-memory cache is still authoritative for this session
      logger.warn(`Failed to persist whitelist for connection ${connectionId}:`, err.message);
    }
  }

  /**
   * Load persisted whitelist config from MongoDB
   */
  async _loadFromDb(connectionId) {
    try {
      const UserConnection = getUserConnection();
      const record = await UserConnection.findOne({ connectionId }, 'whitelistConfig').lean();
      if (record && record.whitelistConfig) {
        return {
          connectionId,
          enabled: record.whitelistConfig.enabled || false,
          tables: record.whitelistConfig.tables || {},
          createdAt: record.createdAt || new Date(),
          updatedAt: record.whitelistConfig.updatedAt || new Date()
        };
      }
      return null;
    } catch (err) {
      logger.warn(`Failed to load whitelist from DB for connection ${connectionId}:`, err.message);
      return null;
    }
  }

  /**
   * Get whitelist status for all cached connections
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
  async exportWhitelist(connectionId) {
    const whitelist = await this.getWhitelist(connectionId);
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
  async importWhitelist(connectionId, config) {
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
