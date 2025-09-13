const DatabaseConnectionManager = require('../utils/DatabaseConnectionManager');
const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');

const dbManager = new DatabaseConnectionManager();
const userManager = new UserManager();

class DatabaseController {
  // Connect to database
  static async connect(req, res) {
    try {
      const { connectionString, type, host, port, database, username, password, ssl, connectionName } = req.body;
      let dbConfig;
      if (connectionString) {
        dbConfig = { connectionString };
      } else {
        dbConfig = { type, host, port, database, username, password, ssl };
      }

      // Connect to database
      const connectionResult = await dbManager.connect(req.user.userId, dbConfig);

      // Track connection in PostgreSQL
      await userManager.trackConnection({
        connectionId: connectionResult.connectionId,
        userId: req.user.userId,
        sessionId: req.user.sessionId,
        dbType: type,
        dbHost: host,
        dbName: database,
        dbPort: port
      });

      res.json({
        success: true,
        message: connectionResult.message,
        data: {
          connectionId: connectionResult.connectionId,
          dbType: connectionResult.dbType,
          database: connectionResult.database,
          connectionName: connectionName || `${type}_${database}`
        }
      });

    } catch (error) {
      logger.error('Database connection failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Database connection failed'
      });
    }
  }

  // Test database connection
  static async testConnection(req, res) {
    try {
      const { connectionString, type, host, port, database, username, password, ssl } = req.body;
      let dbConfig;
      if (connectionString) {
        dbConfig = { connectionString };
      } else {
        dbConfig = { type, host, port, database, username, password, ssl };
      }

      // Create temporary connection for testing
      const connection = await dbManager.createConnection(dbConfig);
      await connection.close();

      res.json({
        success: true,
        message: 'Connection test successful'
      });

    } catch (error) {
      logger.error('Database connection test failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Connection test failed'
      });
    }
  }

  // Execute SQL query
  static async executeQuery(req, res) {
    try {
      const { connectionId } = req.params;
      const { query, params, limit } = req.body;

      // Add LIMIT if specified and not already present
      let finalQuery = query;
      if (limit && !query.toLowerCase().includes('limit')) {
        finalQuery += ` LIMIT ${limit}`;
      }

      const startTime = Date.now();
      const result = await dbManager.executeQuery(connectionId, finalQuery, params);
      
      // Track query execution
      await userManager.trackQuery(connectionId, {
        executionTime: result.executionTime,
        rowCount: result.rowCount
      });

      res.json({
        success: true,
        message: 'Query executed successfully',
        data: {
          result: result.data,
          executionTime: result.executionTime,
          rowCount: result.rowCount
        }
      });

    } catch (error) {
      logger.error('Query execution failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Query execution failed'
      });
    }
  }

  // Generate SQL from natural language
  static async generateSQL(req, res) {
    try {
      const { connectionId } = req.params;
      const { description, tableContext } = req.body;

      if (!description) {
        return res.status(400).json({
          success: false,
          message: 'Description is required'
        });
      }

      // Get database schema for context
      let schema = {};
      try {
        const schemaResult = await dbManager.getSchema(connectionId);
        schema = schemaResult.schema;
      } catch (error) {
        logger.warn('Could not retrieve schema for SQL generation:', error.message);
      }

      // Generate SQL using improved NLP processing
      const sqlResult = await DatabaseController.generateMockSQL(description, schema);

      res.json({
        success: true,
        message: 'SQL generated successfully',
        data: {
          query: sqlResult.query,
          confidence: sqlResult.confidence,
          explanation: sqlResult.explanation,
          estimatedRows: Math.floor(Math.random() * 1000) + 1,
          tables: sqlResult.tables || []
        }
      });

    } catch (error) {
      logger.error('SQL generation failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'SQL generation failed'
      });
    }
  }

  // Get database schema
  static async getSchema(req, res) {
    try {
      const { connectionId } = req.params;
      
      const schemaResult = await dbManager.getSchema(connectionId);
      
      res.json({
        success: true,
        message: 'Schema retrieved successfully',
        data: schemaResult.schema
      });

    } catch (error) {
      logger.error('Schema retrieval failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Schema retrieval failed'
      });
    }
  }

  // Get connection status
  static async getConnectionStatus(req, res) {
    try {
      const { connectionId } = req.params;
      
      const status = dbManager.getConnectionStatus(connectionId);
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Get connection status failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get connection status'
      });
    }
  }

  // Get all user connections
  static async getUserConnections(req, res) {
    try {
      const connections = dbManager.getUserConnections(req.user.userId);
      
      res.json({
        success: true,
        data: connections
      });

    } catch (error) {
      logger.error('Get user connections failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user connections'
      });
    }
  }

  // Disconnect from database
  static async disconnect(req, res) {
    try {
      const { connectionId } = req.params;
      
      const result = await dbManager.disconnect(connectionId);
      
      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Database disconnect failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Disconnect failed'
      });
    }
  }

  // Disconnect all user connections
  static async disconnectAll(req, res) {
    try {
      const result = await dbManager.disconnectUser(req.user.userId);
      
      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      logger.error('Disconnect all failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect all connections'
      });
    }
  }

  // Generate SQL from natural language (placeholder for AI integration)
  static async generateSQL(req, res) {
    try {
      const { description, context, includeExplanation } = req.body;
      const { connectionId } = req.params;

      // Get database schema for context
      const schemaResult = await dbManager.getSchema(connectionId);
      
      // This is where you would integrate with your AI/NLP service
      // For now, we'll return a mock response
      const mockSQL = DatabaseController.generateMockSQL(description, schemaResult.schema);
      
      const response = {
        sql: mockSQL.query,
        confidence: mockSQL.confidence,
        estimatedRows: Math.floor(Math.random() * 1000)
      };

      if (includeExplanation) {
        response.explanation = mockSQL.explanation;
      }

      res.json({
        success: true,
        message: 'SQL generated successfully',
        data: response
      });

    } catch (error) {
      logger.error('SQL generation failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'SQL generation failed'
      });
    }
  }

  // Enhanced SQL generation (replace with actual AI integration)
  static generateMockSQL(description, schema = {}) {
    const lowerDesc = description.toLowerCase();
    const tables = Object.keys(schema.tables || {});
    
    // Extract table names from description or use first available table
    let targetTable = null;
    if (tables.length > 0) {
      // Try to find table name in description
      for (const table of tables) {
        if (lowerDesc.includes(table.toLowerCase())) {
          targetTable = table;
          break;
        }
      }
      // If no table found in description, use first available
      if (!targetTable) {
        targetTable = tables[0];
      }
    }
    
    // Default to 'users' if no schema available
    if (!targetTable) {
      targetTable = 'users';
    }

    // Pattern matching for different query types
    if (lowerDesc.includes('count') || lowerDesc.includes('total') || lowerDesc.includes('number')) {
      return {
        query: `SELECT COUNT(*) as total FROM ${targetTable}`,
        confidence: 0.90,
        explanation: `This query counts the total number of records in the ${targetTable} table.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('recent') || lowerDesc.includes('latest') || lowerDesc.includes('newest')) {
      return {
        query: `SELECT * FROM ${targetTable} ORDER BY created_at DESC LIMIT 10`,
        confidence: 0.85,
        explanation: `This query retrieves the most recent records from ${targetTable}, ordered by creation date.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('oldest') || lowerDesc.includes('first')) {
      return {
        query: `SELECT * FROM ${targetTable} ORDER BY created_at ASC LIMIT 10`,
        confidence: 0.85,
        explanation: `This query retrieves the oldest records from ${targetTable}, ordered by creation date.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('all') || lowerDesc.includes('everything')) {
      return {
        query: `SELECT * FROM ${targetTable} LIMIT 100`,
        confidence: 0.80,
        explanation: `This query retrieves all records from ${targetTable} with a safety limit of 100 rows.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('insert') || lowerDesc.includes('add') || lowerDesc.includes('create')) {
      return {
        query: `INSERT INTO ${targetTable} (column1, column2) VALUES ('value1', 'value2')`,
        confidence: 0.70,
        explanation: `Template for inserting a new record into ${targetTable}. Replace column names and values as needed.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('update') || lowerDesc.includes('modify') || lowerDesc.includes('change')) {
      return {
        query: `UPDATE ${targetTable} SET column_name = 'new_value' WHERE condition`,
        confidence: 0.70,
        explanation: `Template for updating records in ${targetTable}. Specify the column, new value, and condition.`,
        tables: [targetTable]
      };
    }
    
    if (lowerDesc.includes('delete') || lowerDesc.includes('remove')) {
      return {
        query: `DELETE FROM ${targetTable} WHERE condition`,
        confidence: 0.75,
        explanation: `Template for deleting records from ${targetTable}. Be sure to specify a proper WHERE condition.`,
        tables: [targetTable]
      };
    }
    
    // Default fallback
    return {
      query: `SELECT * FROM ${targetTable} LIMIT 10`,
      confidence: 0.60,
      explanation: `Generic query to retrieve sample data from ${targetTable}. Please provide more specific requirements for better results.`,
      tables: [targetTable]
    };
  }
}

module.exports = DatabaseController;
