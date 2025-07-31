const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const oracledb = require('oracledb');
const { MongoClient } = require('mongodb');
const { Connection, Request } = require('tedious');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DatabaseConnectionManager {
  constructor() {
    this.connections = new NodeCache({ 
      stdTTL: parseInt(process.env.CACHE_TTL) || 1800,
      checkperiod: 120 
    });
    this.activeConnections = new Map();
    this.connectionPools = new Map();
  }

  // Generate unique connection ID
  generateConnectionId(userId, dbConfig) {
    const configHash = crypto
      .createHash('md5')
      .update(JSON.stringify({
        type: dbConfig.type,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username
      }))
      .digest('hex');
    return `${userId}_${configHash}`;
  }

  // Create PostgreSQL connection
  async createPostgreSQLConnection(config) {
    const pool = new Pool({
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return {
      pool,
      type: 'postgresql',
      query: async (text, params) => {
        const client = await pool.connect();
        try {
          const result = await client.query(text, params);
          return result;
        } finally {
          client.release();
        }
      },
      close: () => pool.end()
    };
  }

  // Create MySQL connection
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
      acquireTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    });

    // Test connection
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

  // Create SQLite connection
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
              return new Promise((resolve, reject) => {
                db.all(text, params, (err, rows) => {
                  if (err) reject(err);
                  else resolve({ rows });
                });
              });
            },
            close: () => {
              return new Promise((resolve) => {
                db.close(resolve);
              });
            }
          });
        }
      });
    });
  }

  // Create SQL Server connection
  async createSQLServerConnection(config) {
    const connectionConfig = {
      server: config.host,
      options: {
        database: config.database,
        port: config.port || 1433,
        encrypt: true,
        trustServerCertificate: true,
      },
      authentication: {
        type: 'default',
        options: {
          userName: config.username,
          password: config.password,
        },
      },
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
            query: (text, params = []) => {
              return new Promise((resolve, reject) => {
                const request = new Request(text, (err, rowCount) => {
                  if (err) reject(err);
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
                  resolve({ rows });
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

  // Create Oracle connection
  async createOracleConnection(config) {
    const connectionConfig = {
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${config.port || 1521}/${config.database}`,
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

  // Create MongoDB connection
  async createMongoDBConnection(config) {
    const url = `mongodb://${config.username ? `${config.username}:${config.password}@` : ''}${config.host}:${config.port || 27017}/${config.database}`;
    const client = new MongoClient(url);
    
    await client.connect();
    const db = client.db(config.database);

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

  // Main connection factory
  async createConnection(config) {
    switch (config.type.toLowerCase()) {
      case 'postgresql':
      case 'postgres':
        return await this.createPostgreSQLConnection(config);
      case 'mysql':
        return await this.createMySQLConnection(config);
      case 'sqlite':
        return await this.createSQLiteConnection(config);
      case 'sqlserver':
      case 'mssql':
        return await this.createSQLServerConnection(config);
      case 'oracle':
        return await this.createOracleConnection(config);
      case 'mongodb':
      case 'mongo':
        return await this.createMongoDBConnection(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  // Connect to database with session management
  async connect(userId, dbConfig) {
    try {
      const connectionId = this.generateConnectionId(userId, dbConfig);
      
      // Check if connection already exists
      if (this.activeConnections.has(connectionId)) {
        logger.info(`Reusing existing connection for user ${userId}`);
        return {
          success: true,
          connectionId,
          message: 'Connected to existing session'
        };
      }

      // Create new connection
      const connection = await this.createConnection(dbConfig);
      
      // Store connection
      this.activeConnections.set(connectionId, {
        connection,
        userId,
        config: { ...dbConfig, password: undefined }, // Don't store password
        createdAt: new Date(),
        lastUsed: new Date()
      });

      // Cache connection metadata
      this.connections.set(connectionId, {
        userId,
        type: dbConfig.type,
        database: dbConfig.database,
        host: dbConfig.host,
        connected: true
      });

      logger.info(`New database connection created for user ${userId}, type: ${dbConfig.type}`);

      return {
        success: true,
        connectionId,
        message: 'Connected successfully',
        dbType: dbConfig.type,
        database: dbConfig.database
      };

    } catch (error) {
      logger.error(`Database connection failed for user ${userId}:`, error);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  // Execute query on existing connection
  async executeQuery(connectionId, query, params = []) {
    const connectionData = this.activeConnections.get(connectionId);
    
    if (!connectionData) {
      throw new Error('Connection not found or expired');
    }

    try {
      // Update last used timestamp
      connectionData.lastUsed = new Date();
      
      const startTime = Date.now();
      const result = await connectionData.connection.query(query, params);
      const executionTime = Date.now() - startTime;

      logger.info(`Query executed in ${executionTime}ms for connection ${connectionId}`);

      return {
        success: true,
        data: result,
        executionTime,
        rowCount: result.rows ? result.rows.length : result.rowCount || 0
      };

    } catch (error) {
      logger.error(`Query execution failed for connection ${connectionId}:`, error);
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  // Get database schema
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

        case 'sqlite':
          // SQLite requires multiple queries for schema
          const tables = await connection.query("SELECT name FROM sqlite_master WHERE type='table'");
          const schema = [];
          
          for (const table of tables.rows) {
            const columns = await connection.query(`PRAGMA table_info(${table.name})`);
            schema.push({
              table_name: table.name,
              columns: columns.rows
            });
          }
          
          return { success: true, schema };

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

        default:
          throw new Error(`Schema retrieval not supported for ${connection.type}`);
      }

      const result = await connection.query(query);
      return { success: true, schema: result.rows };

    } catch (error) {
      logger.error(`Schema retrieval failed for connection ${connectionId}:`, error);
      throw new Error(`Schema retrieval failed: ${error.message}`);
    }
  }

  // Disconnect specific connection
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

  // Disconnect all user connections
  async disconnectUser(userId) {
    const userConnections = Array.from(this.activeConnections.entries())
      .filter(([_, data]) => data.userId === userId);

    const disconnectPromises = userConnections.map(([connectionId]) => 
      this.disconnect(connectionId)
    );

    await Promise.all(disconnectPromises);
    
    logger.info(`All connections for user ${userId} have been disconnected`);
    return { success: true, message: `Disconnected ${userConnections.length} connections` };
  }

  // Get connection status
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

  // Get all user connections
  getUserConnections(userId) {
    const userConnections = Array.from(this.activeConnections.entries())
      .filter(([_, data]) => data.userId === userId)
      .map(([connectionId, data]) => ({
        connectionId,
        type: data.connection.type,
        database: data.config.database,
        host: data.config.host,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed
      }));

    return userConnections;
  }

  // Cleanup expired connections
  cleanupExpiredConnections() {
    const now = new Date();
    const expiredConnections = [];

    for (const [connectionId, data] of this.activeConnections.entries()) {
      const timeSinceLastUse = now - data.lastUsed;
      if (timeSinceLastUse > parseInt(process.env.SESSION_TIMEOUT) || 3600000) {
        expiredConnections.push(connectionId);
      }
    }

    expiredConnections.forEach(connectionId => {
      this.disconnect(connectionId).catch(err => 
        logger.error(`Error cleaning up expired connection ${connectionId}:`, err)
      );
    });

    if (expiredConnections.length > 0) {
      logger.info(`Cleaned up ${expiredConnections.length} expired connections`);
    }
  }
}

module.exports = DatabaseConnectionManager;
