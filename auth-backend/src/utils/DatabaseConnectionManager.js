const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const oracledb = require('oracledb');
const { MongoClient } = require('mongodb');
const { Connection, Request } = require('tedious');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const logger = require('./logger');

const extractMongoFields = (doc, parentPath, fields) => {
  if (!doc || typeof doc !== 'object') {
    return;
  }

  Object.entries(doc).forEach(([key, value]) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const fieldMeta = fields.get(path) || {
      types: new Set(),
      nullable: false,
      sample: null
    };

    if (value === null || value === undefined) {
      fieldMeta.nullable = true;
    } else {
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      fieldMeta.types.add(valueType);
      if (fieldMeta.sample === null) {
        fieldMeta.sample = Array.isArray(value) ? value.slice(0, 3) : value;
      }

      if (valueType === 'object') {
        extractMongoFields(value, path, fields);
      }

      if (Array.isArray(value)) {
        value.slice(0, 5).forEach((item, index) => {
          const itemType = Array.isArray(item) ? 'array' : typeof item;
          fieldMeta.types.add(`array<${itemType}>`);
          if (item && typeof item === 'object') {
            extractMongoFields(item, `${path}[${index}]`, fields);
          }
        });
      }
    }

    fields.set(path, fieldMeta);
  });
};

class DatabaseConnectionManager {
  constructor() {
    this.connections = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL, 10) || 1800,
      checkperiod: 120
    });
    this.activeConnections = new Map();
    this.connectionPools = new Map();
  }

  detectTypeFromConnectionString(connectionString = '') {
    if (!connectionString) return undefined;
    const lower = connectionString.toLowerCase();
    if (lower.startsWith('postgres://') || lower.startsWith('postgresql://')) return 'postgresql';
    if (lower.startsWith('mysql://')) return 'mysql';
    if (lower.startsWith('mssql://')) return 'sqlserver';
    if (lower.startsWith('oracle://')) return 'oracle';
    if (lower.startsWith('sqlite://')) return 'sqlite';
    if (lower.startsWith('mongodb://') || lower.startsWith('mongodb+srv://')) return 'mongodb';
    return undefined;
  }

  generateConnectionId(userId, dbConfig) {
    const configHash = crypto
      .createHash('md5')
      .update(
        JSON.stringify({
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username
        })
      )
      .digest('hex');
    return `${userId}_${configHash}`;
  }

  async createPostgreSQLConnection(config) {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 30000
    });

    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return {
      pool,
      type: 'postgresql',
      query: async (text, params) => {
        const pgClient = await pool.connect();
        try {
          const result = await pgClient.query(text, params);
          return result;
        } finally {
          pgClient.release();
        }
      },
      close: () => pool.end()
    };
  }

  async createMySQLConnection(config) {
    const pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      database: config.database,
      user: config.username,
      password: config.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 30000
    });

    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();

    return {
      pool,
      type: 'mysql',
      query: async (text, params) => {
        const [rows, fields] = await pool.execute(text, params);
        return { rows, fields };
      },
      close: () => pool.end()
    };
  }

  async createSQLiteConnection(config) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(config.database, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            db,
            type: 'sqlite',
            query: (text, params = []) => {
              return new Promise((resolveQuery, rejectQuery) => {
                db.all(text, params, (error, rows) => {
                  if (error) rejectQuery(error);
                  else resolveQuery({ rows });
                });
              });
            },
            close: () =>
              new Promise((resolveClose) => {
                db.close(resolveClose);
              })
          });
        }
      });
    });
  }

  async createSQLServerConnection(config) {
    const connectionConfig = {
      server: config.host,
      options: {
        database: config.database,
        port: config.port || 1433,
        encrypt: true,
        trustServerCertificate: true
      },
      authentication: {
        type: 'default',
        options: {
          userName: config.username,
          password: config.password
        }
      }
    };

    return new Promise((resolve, reject) => {
      const connection = new Connection(connectionConfig);

      connection.on('connect', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            connection,
            type: 'sqlserver',
            query: (text) => {
              return new Promise((resolveQuery, rejectQuery) => {
                const request = new Request(text, (error) => {
                  if (error) rejectQuery(error);
                });

                const rows = [];
                request.on('row', (columns) => {
                  const row = {};
                  columns.forEach((column) => {
                    row[column.metadata.colName] = column.value;
                  });
                  rows.push(row);
                });

                request.on('requestCompleted', () => {
                  resolveQuery({ rows });
                });

                connection.execSql(request);
              });
            },
            close: () => connection.close()
          });
        }
      });

      connection.connect();
    });
  }

  async createOracleConnection(config) {
    const connectionConfig = {
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${config.port || 1521}/${config.database}`
    };

    const connection = await oracledb.getConnection(connectionConfig);

    return {
      connection,
      type: 'oracle',
      query: async (text, params = []) => {
        const result = await connection.execute(text, params);
        return { rows: result.rows, metaData: result.metaData };
      },
      close: () => connection.close()
    };
  }

  async createMongoDBConnection(config) {
    let url;
    let dbName;

    if (config.connectionString) {
      url = config.connectionString;
      const match = url.match(/mongodb(?:\+srv)?:\/\/[^\/]+\/([^?]+)/);
      dbName = match ? match[1] : undefined;
    } else {
      url = `mongodb://${config.username ? `${config.username}:${config.password}@` : ''}${config.host}:${config.port || 27017}/${config.database}`;
      dbName = config.database;
    }

    if (!dbName) {
      dbName = 'test';
    }

    const client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    await client.connect();
    const db = client.db(dbName);

    return {
      client,
      db,
      type: 'mongodb',
      query: async (collection, operation, query = {}, options = {}) => {
        const coll = db.collection(collection);
        switch (operation) {
          case 'find':
            return await coll.find(query, options).toArray();
          case 'findOne':
            return await coll.findOne(query, options);
          case 'insertOne':
            return await coll.insertOne(query);
          case 'insertMany':
            return await coll.insertMany(query);
          case 'updateOne':
            return await coll.updateOne(query, options);
          case 'updateMany':
            return await coll.updateMany(query, options);
          case 'deleteOne':
            return await coll.deleteOne(query);
          case 'deleteMany':
            return await coll.deleteMany(query);
          default:
            throw new Error(`Unsupported MongoDB operation: ${operation}`);
        }
      },
      close: () => client.close()
    };
  }

  async createConnection(config) {
    if (config.connectionString) {
      const connStr = config.connectionString;
      if (connStr.startsWith('mongodb://') || connStr.startsWith('mongodb+srv://')) {
        return this.createMongoDBConnection({ connectionString: connStr });
      }
      if (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://')) {
        return this.createPostgreSQLConnection({ connectionString: connStr });
      }
      if (connStr.startsWith('mysql://')) {
        return this.createMySQLConnection({ connectionString: connStr });
      }
      if (connStr.startsWith('mssql://')) {
        return this.createSQLServerConnection({ connectionString: connStr });
      }
      if (connStr.startsWith('oracle://')) {
        return this.createOracleConnection({ connectionString: connStr });
      }
      throw new Error('Unsupported or invalid connection string');
    }

    switch ((config.type || '').toLowerCase()) {
      case 'postgresql':
      case 'postgres':
        return this.createPostgreSQLConnection(config);
      case 'mysql':
        return this.createMySQLConnection(config);
      case 'sqlite':
        return this.createSQLiteConnection(config);
      case 'sqlserver':
      case 'mssql':
        return this.createSQLServerConnection(config);
      case 'oracle':
        return this.createOracleConnection(config);
      case 'mongodb':
      case 'mongo':
        return this.createMongoDBConnection(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  async connect(userId, dbConfig) {
    try {
      const connectionId = this.generateConnectionId(userId, dbConfig);

      if (this.activeConnections.has(connectionId)) {
        logger.info(`Reusing existing connection for user ${userId}`);
        return {
          success: true,
          connectionId,
          message: 'Connected to existing session'
        };
      }

      const connection = await this.createConnection(dbConfig);
      const resolvedType = connection.type || dbConfig.type || this.detectTypeFromConnectionString(dbConfig.connectionString);
      const resolvedDatabase = dbConfig.database || connection.database || connection.db?.databaseName;
      const resolvedHost = dbConfig.host || connection.host || connection.config?.host || connection.client?.s?.options?.srvHost;

      this.activeConnections.set(connectionId, {
        connection,
        userId,
        config: { ...dbConfig, type: resolvedType, database: resolvedDatabase, host: resolvedHost, password: undefined },
        createdAt: new Date(),
        lastUsed: new Date()
      });

      this.connections.set(connectionId, {
        userId,
        type: resolvedType,
        database: resolvedDatabase,
        host: resolvedHost,
        connected: true
      });

      logger.info(`New database connection created for user ${userId}, type: ${resolvedType}`);

      return {
        success: true,
        connectionId,
        message: 'Connected successfully',
        dbType: resolvedType,
        database: resolvedDatabase
      };
    } catch (error) {
      logger.error(`Database connection failed for user ${userId}:`, error);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async executeQuery(connectionId, query, params = []) {
    const connectionData = this.activeConnections.get(connectionId);

    if (!connectionData) {
      throw new Error('Connection not found or expired');
    }

    try {
      connectionData.lastUsed = new Date();

      const startTime = Date.now();
      const result = await connectionData.connection.query(query, params);
      const executionTime = Date.now() - startTime;

      logger.info(`Query executed in ${executionTime}ms for connection ${connectionId}`);

      // Determine row count based on query type
      // For SELECT: result.rows.length
      // For INSERT/UPDATE/DELETE: result.affectedRows (MySQL) or result.rowCount (PostgreSQL)
      const rowCount = result.rows 
        ? result.rows.length 
        : result.affectedRows 
        ? result.affectedRows 
        : result.rowCount || 0;

      return {
        success: true,
        data: result,
        executionTime,
        rowCount: rowCount,
        affectedRows: result.affectedRows || result.rowCount || 0,
        insertId: result.insertId || null
      };
    } catch (error) {
      logger.error(`Query execution failed for connection ${connectionId}:`, error);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  async getSchema(connectionId) {
    const connectionData = this.activeConnections.get(connectionId);

    if (!connectionData) {
      throw new Error('Connection not found or expired');
    }

    const { connection } = connectionData;
    let query;

    try {
      switch (connection.type) {
        case 'postgresql':
          query = `
            SELECT 
              table_name,
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position
          `;
          break;
        case 'mysql':
          query = `
            SELECT 
              table_name,
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns 
            WHERE table_schema = DATABASE()
            ORDER BY table_name, ordinal_position
          `;
          break;
        case 'sqlite': {
          const tables = await connection.query("SELECT name FROM sqlite_master WHERE type='table'");
          const schema = [];

          for (const table of tables.rows) {
            const columns = await connection.query(`PRAGMA table_info(${table.name})`);
            schema.push({
              table_name: table.name,
              columns: columns.rows.map(col => ({
                name: col.name,
                type: col.type,
                is_nullable: col.notnull === 0,
                column_name: col.name,
                data_type: col.type
              }))
            });
          }

          return { success: true, schema };
        }
        case 'sqlserver':
          query = `
            SELECT 
              t.table_name,
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default
            FROM information_schema.tables t
            INNER JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
          `;
          break;
        case 'oracle':
          query = `
            SELECT 
              table_name,
              column_name,
              data_type,
              nullable,
              data_default as column_default
            FROM user_tab_columns
            ORDER BY table_name, column_id
          `;
          break;
        case 'mongodb': {
          const collections = await connection.db.collections();
          const schema = [];

          for (const coll of collections) {
            const sampleDocs = await coll.find({}).limit(25).toArray();
            const fields = new Map();

            sampleDocs.forEach((doc) => {
              extractMongoFields(doc, '', fields);
            });

            schema.push({
              table_name: coll.collectionName,
              columns: Array.from(fields.entries()).map(([path, meta]) => ({
                name: path,
                type: meta.types.size === 1 ? Array.from(meta.types)[0] : Array.from(meta.types).join(' | '),
                is_nullable: meta.nullable,
                column_name: path,
                data_type: meta.types.size === 1 ? Array.from(meta.types)[0] : Array.from(meta.types).join(' | '),
                sample: meta.sample
              }))
            });
          }

          return { success: true, schema };
        }
        default:
          throw new Error(`Schema retrieval not supported for ${connection.type}`);
      }

      const result = await connection.query(query);
      
      // Normalize SQL database schemas to grouped table format
      const grouped = new Map();
      result.rows.forEach((row) => {
        const tableName = row.table_name || row.tableName;
        if (!grouped.has(tableName)) {
          grouped.set(tableName, []);
        }
        grouped.get(tableName).push({
          name: row.column_name || row.columnName,
          column_name: row.column_name || row.columnName,
          type: row.data_type || row.dataType,
          data_type: row.data_type || row.dataType,
          is_nullable: row.is_nullable === true || row.is_nullable === 'YES' || row.is_nullable === 1,
          nullable: row.is_nullable === true || row.is_nullable === 'YES' || row.is_nullable === 1,
          column_default: row.column_default || row.columnDefault || null
        });
      });

      const schema = Array.from(grouped.entries()).map(([tableName, columns]) => ({
        table_name: tableName,
        columns
      }));

      return { success: true, schema };
    } catch (error) {
      logger.error(`Schema retrieval failed for connection ${connectionId}:`, error);
      throw new Error(`Schema retrieval failed: ${error.message}`);
    }
  }

  async disconnect(connectionId) {
    const connectionData = this.activeConnections.get(connectionId);

    if (connectionData) {
      try {
        await connectionData.connection.close();
        this.activeConnections.delete(connectionId);
        this.connections.del(connectionId);

        logger.info(`Connection ${connectionId} disconnected successfully`);
        return { success: true, message: 'Disconnected successfully' };
      } catch (error) {
        logger.error(`Error disconnecting ${connectionId}:`, error);
        throw new Error(`Disconnect failed: ${error.message}`);
      }
    }

    return { success: true, message: 'Connection already closed' };
  }

  async disconnectUser(userId) {
    const userConnections = Array.from(this.activeConnections.entries()).filter(([, data]) => data.userId === userId);

    const disconnectPromises = userConnections.map(([connectionId]) => this.disconnect(connectionId));
    await Promise.all(disconnectPromises);

    logger.info(`All connections for user ${userId} have been disconnected`);
    return { success: true, message: `Disconnected ${userConnections.length} connections` };
  }

  getConnectionStatus(connectionId) {
    const cached = this.connections.get(connectionId);
    const active = this.activeConnections.get(connectionId);

    if (!cached || !active) {
      return { connected: false, message: 'Connection not found' };
    }

    return {
      connected: true,
      type: cached.type,
      database: cached.database,
      host: cached.host,
      createdAt: active.createdAt,
      lastUsed: active.lastUsed
    };
  }

  getUserConnections(userId) {
    return Array.from(this.activeConnections.entries())
      .filter(([, data]) => data.userId === userId)
      .map(([connectionId, data]) => ({
        connectionId,
        type: data.connection.type,
        database: data.config.database,
        host: data.config.host,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed
      }));
  }

  cleanupExpiredConnections() {
    const now = new Date();
    const expiredConnections = [];

    for (const [connectionId, data] of this.activeConnections.entries()) {
      const timeSinceLastUse = now - data.lastUsed;
      const timeout = parseInt(process.env.SESSION_TIMEOUT, 10) || 3600000;
      if (timeSinceLastUse > timeout) {
        expiredConnections.push(connectionId);
      }
    }

    expiredConnections.forEach((connectionId) => {
      this.disconnect(connectionId).catch((err) => logger.error(`Error cleaning up expired connection ${connectionId}:`, err));
    });

    if (expiredConnections.length > 0) {
      logger.info(`Cleaned up ${expiredConnections.length} expired connections`);
    }
  }

  // ============= Column Insight & Analysis Functions =============

  /**
   * Get detailed metadata about a specific column
   * @param {string} connectionId - Connection identifier
   * @param {string} tableName - Table/collection name
   * @param {string} columnName - Column name
   * @returns {Promise<Object>} Column metadata including type, constraints, etc.
   */
  async getColumnMetadata(connectionId, tableName, columnName) {
    try {
      const schema = await this.getSchema(connectionId);
      if (!schema.success) {
        throw new Error('Failed to retrieve schema');
      }

      const table = schema.schema.find(t => t.table_name === tableName);
      if (!table) {
        return { success: false, message: `Table '${tableName}' not found` };
      }

      const column = table.columns.find(c => c.name === columnName || c.column_name === columnName);
      if (!column) {
        return { success: false, message: `Column '${columnName}' not found in table '${tableName}'` };
      }

      return {
        success: true,
        data: {
          tableName,
          columnName: column.name || column.column_name,
          dataType: column.data_type || column.type,
          isNullable: column.is_nullable || column.nullable,
          defaultValue: column.column_default || null,
          sample: column.sample || null
        }
      };
    } catch (error) {
      logger.error(`Failed to get column metadata for ${tableName}.${columnName}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get the data type of a specific column
   * @param {string} connectionId - Connection identifier
   * @param {string} tableName - Table/collection name
   * @param {string} columnName - Column name
   * @returns {Promise<Object>} Column type information
   */
  async getColumnType(connectionId, tableName, columnName) {
    try {
      const metadata = await this.getColumnMetadata(connectionId, tableName, columnName);
      if (!metadata.success) {
        return metadata;
      }

      return {
        success: true,
        data: {
          tableName,
          columnName: metadata.data.columnName,
          type: metadata.data.dataType,
          nullable: metadata.data.isNullable
        }
      };
    } catch (error) {
      logger.error(`Failed to get column type:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all columns in a table with their types
   * @param {string} connectionId - Connection identifier
   * @param {string} tableName - Table/collection name
   * @returns {Promise<Object>} Array of columns with types
   */
  async getTableColumns(connectionId, tableName) {
    try {
      const schema = await this.getSchema(connectionId);
      if (!schema.success) {
        throw new Error('Failed to retrieve schema');
      }

      const table = schema.schema.find(t => t.table_name === tableName);
      if (!table) {
        return { success: false, message: `Table '${tableName}' not found` };
      }

      return {
        success: true,
        tableName,
        columns: table.columns.map(col => ({
          name: col.name || col.column_name,
          type: col.data_type || col.type,
          nullable: col.is_nullable || col.nullable,
          default: col.column_default || null
        }))
      };
    } catch (error) {
      logger.error(`Failed to get table columns for ${tableName}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all tables in the database
   * @param {string} connectionId - Connection identifier
   * @returns {Promise<Object>} Array of table names
   */
  async getTables(connectionId) {
    try {
      const schema = await this.getSchema(connectionId);
      if (!schema.success) {
        throw new Error('Failed to retrieve schema');
      }

      return {
        success: true,
        tables: schema.schema.map(t => ({
          name: t.table_name,
          columnCount: (t.columns || []).length,
          columns: (t.columns || []).map(c => c.name || c.column_name)
        }))
      };
    } catch (error) {
      logger.error(`Failed to get tables:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Search for columns by name across all tables
   * @param {string} connectionId - Connection identifier
   * @param {string} columnNamePattern - Partial or full column name
   * @returns {Promise<Object>} Array of matching columns
   */
  async findColumnsByName(connectionId, columnNamePattern) {
    try {
      const schema = await this.getSchema(connectionId);
      if (!schema.success) {
        throw new Error('Failed to retrieve schema');
      }

      const pattern = columnNamePattern.toLowerCase();
      const results = [];

      schema.schema.forEach(table => {
        (table.columns || []).forEach(col => {
          const colName = (col.name || col.column_name).toLowerCase();
          if (colName.includes(pattern)) {
            results.push({
              tableName: table.table_name,
              columnName: col.name || col.column_name,
              dataType: col.data_type || col.type,
              nullable: col.is_nullable || col.nullable
            });
          }
        });
      });

      return {
        success: true,
        pattern: columnNamePattern,
        count: results.length,
        results
      };
    } catch (error) {
      logger.error(`Failed to find columns by name:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get schema statistics (tables count, total columns, etc.)
   * @param {string} connectionId - Connection identifier
   * @returns {Promise<Object>} Schema statistics
   */
  async getSchemaStats(connectionId) {
    try {
      const schema = await this.getSchema(connectionId);
      if (!schema.success) {
        throw new Error('Failed to retrieve schema');
      }

      let totalColumns = 0;
      const typeDistribution = {};

      schema.schema.forEach(table => {
        totalColumns += (table.columns || []).length;
        (table.columns || []).forEach(col => {
          const type = col.data_type || col.type || 'unknown';
          typeDistribution[type] = (typeDistribution[type] || 0) + 1;
        });
      });

      return {
        success: true,
        stats: {
          tableCount: schema.schema.length,
          totalColumns,
          uniqueTypes: Object.keys(typeDistribution).length,
          typeDistribution
        }
      };
    } catch (error) {
      logger.error(`Failed to get schema stats:`, error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = DatabaseConnectionManager;
