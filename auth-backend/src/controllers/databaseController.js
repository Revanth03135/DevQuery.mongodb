const dbManager = require('../utils/dbManager');
const UserManager = require('../models/UserManager');
const logger = require('../utils/logger');
const {
  generateSqlFromDescription,
  MissingGeminiKeyError,
  GeminiRequestError
} = require('../utils/aiClient');

const userManager = new UserManager();

class DatabaseController {
  static getResolvedType(dbConfig, connectionResult) {
    if (dbConfig.type) {
      return dbConfig.type;
    }
    if (connectionResult?.dbType) {
      return connectionResult.dbType;
    }
    const connStr = dbConfig.connectionString || '';
    if (connStr.startsWith('mongodb')) return 'mongodb';
    if (connStr.startsWith('postgres')) return 'postgresql';
    if (connStr.startsWith('mysql')) return 'mysql';
    if (connStr.startsWith('mssql')) return 'sqlserver';
    if (connStr.startsWith('oracle')) return 'oracle';
    return 'unknown';
  }

  static sanitizeSqlCandidate(sql) {
    if (!sql || typeof sql !== 'string') {
      return '';
    }
    return sql.replace(/;\s*$/g, '').trim();
  }

  static isSafeReadOnlySql(sql) {
    if (!sql || typeof sql !== 'string') {
      return false;
    }
    const trimmed = sql.trim();
    if (!/^(select|with)\b/i.test(trimmed)) {
      return false;
    }
    if (/;/.test(trimmed)) {
      return false;
    }
    const forbidden = /(insert|update|delete|drop|alter|truncate|create|replace|merge)\b/i;
    return !forbidden.test(trimmed);
  }

  static normalizeQueryResult(resultData) {
    const normalizeRow = (row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return { value: row };
      }
      return Object.fromEntries(Object.entries(row));
    };

    const extractColumnNames = (source) => {
      if (!Array.isArray(source)) {
        return [];
      }
      return source
        .map((col) => col && (col.name || col.columnName || col.column || col.field || col.alias))
        .filter(Boolean);
    };

    if (!resultData) {
      return { rows: [], columns: [], rowCount: 0 };
    }

    let rawRows = null;
    let columns = [];

    if (Array.isArray(resultData.rows)) {
      rawRows = resultData.rows;
      columns = extractColumnNames(resultData.fields);
    } else if (Array.isArray(resultData)) {
      rawRows = resultData;
    } else if (Array.isArray(resultData.recordset)) {
      rawRows = resultData.recordset;
      columns = extractColumnNames(resultData.columns || resultData.meta || resultData.metaData);
    } else if (Array.isArray(resultData.recordsets) && resultData.recordsets.length) {
      rawRows = resultData.recordsets[0];
      columns = extractColumnNames(resultData.columns || resultData.meta || resultData.metaData);
    } else if (Array.isArray(resultData.records)) {
      rawRows = resultData.records;
    } else if (Array.isArray(resultData.result)) {
      rawRows = resultData.result;
    }

    if (!rawRows && Array.isArray(resultData.rowsArray)) {
      rawRows = resultData.rowsArray;
    }

    if (Array.isArray(resultData.metaData) && !columns.length) {
      columns = extractColumnNames(resultData.metaData);
    }

    if (!Array.isArray(rawRows)) {
      rawRows = [];
    }

    const rows = rawRows.map(normalizeRow);

    if (!columns.length && rows.length) {
      const seen = new Set();
      rows.forEach((row) => {
        Object.keys(row || {}).forEach((key) => seen.add(key));
      });
      columns = Array.from(seen);
    }

    return {
      rows,
      columns,
      rowCount: rows.length
    };
  }

  static async connect(req, res) {
    try {
      const { connectionString, type, host, port, database, username, password, ssl, connectionName } = req.body;
      let dbConfig;
      if (connectionString) {
        dbConfig = { connectionString, type };
      } else {
        dbConfig = { type, host, port, database, username, password, ssl };
      }

      const connectionResult = await dbManager.connect(req.user.userId, dbConfig);
      const resolvedType = DatabaseController.getResolvedType(dbConfig, connectionResult);

      await userManager.trackConnection({
        connectionId: connectionResult.connectionId,
        userId: req.user.userId,
        sessionId: req.user.sessionId,
        dbType: resolvedType,
        dbHost: host,
        dbName: database,
        dbPort: port,
        connectionConfig: dbConfig
      });

      res.json({
        success: true,
        message: connectionResult.message,
        data: {
          connectionId: connectionResult.connectionId,
          dbType: resolvedType,
          database: connectionResult.database || database,
          connectionName: connectionName || `${resolvedType}_${database || 'connection'}`
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

  static async testConnection(req, res) {
    try {
      const { connectionString, type, host, port, database, username, password, ssl } = req.body;
      let dbConfig;
      if (connectionString) {
        dbConfig = { connectionString, type };
      } else {
        dbConfig = { type, host, port, database, username, password, ssl };
      }

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

  static async executeQuery(req, res) {
    try {
      const { connectionId } = req.params;
      const { query, params, limit } = req.body;

      const status = dbManager.getConnectionStatus(connectionId);
      const isMongoDB = status?.type === 'mongodb';

      let finalQuery = query;
      
      // Only add LIMIT for SQL databases, not MongoDB
      if (limit && typeof query === 'string' && !isMongoDB && !query.toLowerCase().includes('limit')) {
        finalQuery += ` LIMIT ${limit}`;
      }

      const execution = await dbManager.executeQuery(connectionId, finalQuery, params);
      const normalized = DatabaseController.normalizeQueryResult(execution.data);

      await userManager.trackQuery(connectionId, {
        userId: req.user.userId,
        sessionId: req.user.sessionId,
        dbType: status?.type,
        executionTime: execution.executionTime,
        rowCount: normalized.rowCount
      });

      res.json({
        success: true,
        message: 'Query executed successfully',
        data: {
          rows: normalized.rows,
          columns: normalized.columns,
          executionTime: execution.executionTime,
          rowCount: normalized.rowCount,
          provider: 'manual',
          intent: 'manual_execute'
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

      const connectionStatus = dbManager.getConnectionStatus(connectionId);
      let schema = {};
      try {
        const schemaResult = await dbManager.getSchema(connectionId);
        schema = schemaResult.schema;
      } catch (error) {
        logger.warn('Schema retrieval failed for SQL generation:', error.message);
      }

      let sqlResult;
      let provider = 'gemini';
      let isFallback = false;

      try {
        sqlResult = await generateSqlFromDescription({
          description,
          schema,
          connection: connectionStatus
        });
      } catch (error) {
        if (error instanceof MissingGeminiKeyError) {
          logger.warn('Gemini API key missing, falling back to heuristic SQL generation');
          sqlResult = DatabaseController.generateMockSQL(description, schema, tableContext);
          provider = 'mock';
          isFallback = true;
        } else if (error instanceof GeminiRequestError) {
          logger.error('Gemini SQL generation failed:', error);
          sqlResult = DatabaseController.generateMockSQL(description, schema, tableContext);
          provider = 'mock';
          isFallback = true;
        } else {
          throw error;
        }
      }

      const sanitizedSql = DatabaseController.sanitizeSqlCandidate(sqlResult?.sql || sqlResult?.query);
      const isSafe = DatabaseController.isSafeReadOnlySql(sanitizedSql);

      if (!isSafe) {
        logger.warn('Generated SQL was unsafe, reverting to fallback template');
        sqlResult = DatabaseController.generateMockSQL(description, schema, tableContext);
        provider = 'mock';
        isFallback = true;
      }

      const responsePayload = {
        sql: DatabaseController.sanitizeSqlCandidate(sqlResult.sql || sqlResult.query),
        explanation: sqlResult.explanation || 'SQL generated successfully.',
        confidence: sqlResult.confidence || null,
        estimatedRows: sqlResult.estimatedRows || null,
        cautions: Array.isArray(sqlResult.cautions) ? sqlResult.cautions : [],
        provider: sqlResult.provider || provider,
        model: sqlResult.model || null,
        isFallback
      };

      res.json({
        success: true,
        message: isFallback
          ? 'SQL generated using fallback strategy. Configure Gemini for AI-powered queries.'
          : 'SQL generated successfully',
        data: responsePayload
      });
    } catch (error) {
      logger.error('SQL generation failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'SQL generation failed'
      });
    }
  }

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

  static async disconnect(req, res) {
    try {
      const { connectionId } = req.params;
      const result = await dbManager.disconnect(connectionId);
      await userManager.endConnection(connectionId, 'user_disconnect');

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

  static async disconnectAll(req, res) {
    try {
      const result = await dbManager.disconnectUser(req.user.userId);
      await userManager.endAllConnectionsForUser(req.user.userId, 'user_disconnect_all');

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

  static generateMockSQL(description, schema = {}, tableContext = {}) {
    const lowerDesc = (description || '').toLowerCase();

    const tableCandidates = new Set();
    if (Array.isArray(schema)) {
      schema.forEach((item) => {
        const tableName = item?.table_name || item?.tableName || item?.name;
        if (tableName) {
          tableCandidates.add(tableName);
        }
      });
    } else if (Array.isArray(schema?.tables)) {
      schema.tables.forEach((table) => {
        const tableName = table?.table_name || table?.name;
        if (tableName) {
          tableCandidates.add(tableName);
        }
      });
    } else if (schema && typeof schema === 'object' && schema.collections) {
      Object.keys(schema.collections).forEach((collectionName) => tableCandidates.add(collectionName));
    }

    Object.keys(tableContext || {}).forEach((name) => tableCandidates.add(name));

    const candidates = Array.from(tableCandidates);

    const matchByDescription = candidates.find((table) => lowerDesc.includes(table.toLowerCase()));
    let targetTable = matchByDescription || candidates[0] || 'records';

    const sanitizeIdentifier = (value) => value.replace(/[^a-zA-Z0-9_]/g, '');
    targetTable = sanitizeIdentifier(targetTable) || 'records';

    const buildResponse = (sql, explanation, { estimatedRows = '~50', confidence = 0.6, cautions = [] } = {}) => {
      const baseCautions = ['Review and adjust this template before executing.'];
      const uniqueCautions = Array.from(new Set([...baseCautions, ...cautions].filter(Boolean)));
      return {
        sql,
        query: sql,
        explanation,
        confidence,
        estimatedRows,
        provider: 'mock',
        cautions: uniqueCautions
      };
    };

    if (lowerDesc.includes('count') || lowerDesc.includes('total') || lowerDesc.includes('number')) {
      const sql = `SELECT COUNT(*) AS total_count FROM ${targetTable}`;
      return buildResponse(sql, `Counts total records in the ${targetTable} table.`, {
        estimatedRows: '1',
        confidence: 0.85
      });
    }

    if (lowerDesc.includes('recent') || lowerDesc.includes('latest') || lowerDesc.includes('newest')) {
      const sql = `SELECT * FROM ${targetTable} ORDER BY created_at DESC LIMIT 10`;
      return buildResponse(sql, `Fetches the most recent records from ${targetTable}.`, {
        estimatedRows: '10',
        confidence: 0.8
      });
    }

    if (lowerDesc.includes('oldest') || lowerDesc.includes('first')) {
      const sql = `SELECT * FROM ${targetTable} ORDER BY created_at ASC LIMIT 10`;
      return buildResponse(sql, `Fetches the oldest records from ${targetTable}.`, {
        estimatedRows: '10',
        confidence: 0.8
      });
    }

    if (lowerDesc.includes('top') || lowerDesc.includes('highest') || lowerDesc.includes('most')) {
      const sql = `SELECT * FROM ${targetTable} ORDER BY updated_at DESC LIMIT 10`;
      return buildResponse(sql, `Returns top-ranked records from ${targetTable} by latest update time.`, {
        estimatedRows: '10',
        confidence: 0.7
      });
    }

    if (lowerDesc.includes('average') || lowerDesc.includes('avg')) {
      const sql = `SELECT AVG(numeric_column) AS average_value FROM ${targetTable}`;
      return buildResponse(sql, `Calculates an average value from ${targetTable}. Replace numeric_column with the appropriate field.`, {
        estimatedRows: '1',
        confidence: 0.55,
        cautions: ['Replace numeric_column with an existing numeric field name.']
      });
    }

    if (lowerDesc.includes('sum')) {
      const sql = `SELECT SUM(numeric_column) AS total_value FROM ${targetTable}`;
      return buildResponse(sql, `Sums a numeric column in ${targetTable}. Replace numeric_column with the appropriate field.`, {
        estimatedRows: '1',
        confidence: 0.55,
        cautions: ['Replace numeric_column with an existing numeric field name.']
      });
    }

    if (lowerDesc.includes('insert') || lowerDesc.includes('update') || lowerDesc.includes('delete') || lowerDesc.includes('remove')) {
      const sql = `SELECT * FROM ${targetTable} LIMIT 25`;
      return buildResponse(sql, `Data modification requests require manual review. Showing a limited preview of ${targetTable} instead.`, {
        estimatedRows: '25',
        confidence: 0.4,
        cautions: ['This assistant only generates read-only queries automatically.']
      });
    }

    const fallbackSql = `SELECT * FROM ${targetTable} LIMIT 50`;
    return buildResponse(fallbackSql, `Default query returning data from ${targetTable} with a 50 row safety limit.`, {
      estimatedRows: '50',
      confidence: 0.6
    });
  }

  // ============= Schema Explorer Endpoints =============

  /**
   * Get all tables in the connected database
   */
  static async getTables(req, res) {
    try {
      const { connectionId } = req.params;
      const result = await dbManager.getTables(connectionId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Tables retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Get tables failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tables'
      });
    }
  }

  /**
   * Get all columns in a specific table with their types
   */
  static async getTableColumns(req, res) {
    try {
      const { connectionId, tableName } = req.params;
      const result = await dbManager.getTableColumns(connectionId, tableName);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Table columns retrieved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Get table columns failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get table columns'
      });
    }
  }

  /**
   * Get detailed metadata about a specific column
   */
  static async getColumnMetadata(req, res) {
    try {
      const { connectionId, tableName, columnName } = req.params;
      const result = await dbManager.getColumnMetadata(connectionId, tableName, columnName);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Column metadata retrieved successfully',
        data: result.data
      });
    } catch (error) {
      logger.error('Get column metadata failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get column metadata'
      });
    }
  }

  /**
   * Get the data type of a specific column
   */
  static async getColumnType(req, res) {
    try {
      const { connectionId, tableName, columnName } = req.params;
      const result = await dbManager.getColumnType(connectionId, tableName, columnName);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Column type retrieved successfully',
        data: result.data
      });
    } catch (error) {
      logger.error('Get column type failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get column type'
      });
    }
  }

  /**
   * Search for columns by name pattern
   */
  static async findColumns(req, res) {
    try {
      const { connectionId } = req.params;
      const { pattern } = req.query;

      if (!pattern) {
        return res.status(400).json({
          success: false,
          message: 'Column name pattern is required'
        });
      }

      const result = await dbManager.findColumnsByName(connectionId, pattern);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Column search completed',
        data: result
      });
    } catch (error) {
      logger.error('Find columns failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find columns'
      });
    }
  }

  /**
   * Get schema statistics (table count, column count, type distribution)
   */
  static async getSchemaStats(req, res) {
    try {
      const { connectionId } = req.params;
      const result = await dbManager.getSchemaStats(connectionId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: true,
        message: 'Schema statistics retrieved successfully',
        data: result.stats
      });
    } catch (error) {
      logger.error('Get schema stats failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get schema statistics'
      });
    }
  }
}

module.exports = DatabaseController;
