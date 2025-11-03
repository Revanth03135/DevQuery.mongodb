const dbManager = require('../utils/dbManager');
const DatabaseController = require('./databaseController');
const WhitelistController = require('./whitelistController');
const logger = require('../utils/logger');
const {
  interpretChatIntent,
  MissingGeminiKeyError,
  GeminiRequestError,
  isWriteOperation,
  extractTableFromSql,
  extractColumnsFromSql
} = require('../utils/aiClient');

class AssistantController {
  static formatMessage(role, type, content) {
    if (!content) {
      return null;
    }
    return {
      role,
      type,
      content,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Debug endpoint to check schema availability
   */
  static async debugSchema(req, res) {
    const { connectionId } = req.params;
    
    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: 'connectionId is required'
      });
    }

    try {
      // Get connection status
      const connectionStatus = dbManager.getConnectionStatus(connectionId);
      
      if (!connectionStatus.connected) {
        return res.status(400).json({
          success: false,
          message: 'Connection not active',
          connectionStatus
        });
      }

      // Try to get schema
      const schemaResult = await dbManager.getSchema(connectionId);
      
      res.json({
        success: true,
        connectionStatus,
        schemaRetrieved: !!schemaResult.schema,
        schemaLength: Array.isArray(schemaResult.schema) ? schemaResult.schema.length : 0,
        schema: schemaResult.schema,
        debug: {
          schemaExists: !!schemaResult.schema,
          isArray: Array.isArray(schemaResult.schema),
          firstTableName: schemaResult.schema && schemaResult.schema[0] ? schemaResult.schema[0].table_name : null,
          firstTableColumns: schemaResult.schema && schemaResult.schema[0] && schemaResult.schema[0].columns ? schemaResult.schema[0].columns.length : 0
        }
      });
    } catch (error) {
      logger.error('Debug schema failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve schema for debugging',
        error: error.message
      });
    }
  }

  static sanitizeCautions(cautions = []) {
    if (!Array.isArray(cautions)) {
      return [];
    }
    return cautions
      .map((item) => (item === null || item === undefined ? null : item.toString().trim()))
      .filter(Boolean);
  }

  static async handleChat(req, res) {
    const { message, connectionId, options = {}, chatHistory = [], queryHistory = [], savedQueries = [] } = req.body;
    const trimmedMessage = (message || '').trim();

    // DEBUG: Log chat history to verify it's being received
    logger.info(`Chat request received with ${chatHistory.length} history messages`);
    if (chatHistory.length > 0) {
      logger.info(`Last history message: ${JSON.stringify(chatHistory[chatHistory.length - 1])}`);
    }
    logger.info(`Query history: ${queryHistory.length} queries, Saved queries: ${savedQueries.length} queries`);

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const runQuery = options.runQuery !== false;
    const messages = [];
    let connectionStatus = { connected: false };
    let schema = null;

    if (connectionId) {
      try {
        connectionStatus = dbManager.getConnectionStatus(connectionId);
      } catch (error) {
        logger.warn('Could not read connection status for assistant chat:', error.message);
        connectionStatus = { connected: false };
      }

      if (connectionStatus.connected) {
        try {
          const schemaResult = await dbManager.getSchema(connectionId);
          schema = schemaResult.schema;
          
          // Filter schema by whitelist if enabled
          if (Array.isArray(schema)) {
            const whitelistManager = WhitelistController.getManager();
            const whitelist = whitelistManager.getWhitelist(connectionId);
            
            if (whitelist.enabled && Object.keys(whitelist.tables).length > 0) {
              // Filter to only include whitelisted tables
              schema = schema.filter(table => {
                const tableName = table.table_name || table.name;
                return Object.keys(whitelist.tables).includes(tableName);
              }).map(table => {
                const tableName = table.table_name || table.name;
                const whitelistedTable = whitelist.tables[tableName];
                
                // If specific columns are whitelisted, filter columns
                if (whitelistedTable && whitelistedTable.columns && Object.keys(whitelistedTable.columns).length > 0) {
                  const allowedColumns = Object.keys(whitelistedTable.columns);
                  return {
                    ...table,
                    columns: (table.columns || []).filter(col => 
                      allowedColumns.includes(col.name || col.column_name)
                    )
                  };
                }
                
                return table;
              });
              
              logger.info(`Schema filtered by whitelist for connectionId ${connectionId}:`, {
                originalTableCount: schemaResult.schema.length,
                filteredTableCount: schema.length,
                whitelistedTables: Object.keys(whitelist.tables)
              });
            }
          }
          
          // DEBUG: Log schema retrieval
          logger.info(`Schema retrieved for connectionId ${connectionId}:`, {
            success: schemaResult.success,
            schemaExists: !!schema,
            schemaLength: Array.isArray(schema) ? schema.length : 'not-array',
            schemaType: typeof schema,
            firstTable: Array.isArray(schema) && schema[0] ? { name: schema[0].table_name, columns: schema[0].columns?.length } : null
          });
        } catch (error) {
          logger.warn('Schema retrieval failed for assistant chat:', error.message);
          logger.error('Schema retrieval error details:', error);
        }
      }
    }

    let interpretation;

    try {
      interpretation = await interpretChatIntent({
        message: trimmedMessage,
        schema,
        connection: connectionStatus,
        runQuery,
        chatHistory,
        queryHistory,
        savedQueries
      });
    } catch (error) {
      if (error instanceof MissingGeminiKeyError) {
        return res.status(503).json({
          success: false,
          code: error.code,
          message: 'AI assistant is not configured. Please set GEMINI_API_KEY on the server.'
        });
      }

      if (error instanceof GeminiRequestError) {
        logger.error('Gemini failed to interpret assistant chat:', error);
        return res.status(502).json({
          success: false,
          code: 'AI_UNAVAILABLE',
          message: 'AI assistant is temporarily unavailable. Please try again in a moment.'
        });
      }

      logger.error('Assistant interpretation failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Assistant failed to process the request'
      });
    }

    let sanitizedSql = DatabaseController.sanitizeSqlCandidate(interpretation.sql);
    let finalIntent = interpretation.intent;
    let executionResult = null;
    let normalizedResult = null;
    let executionMeta = null;
    let requiresConfirmation = false;
    let operationMetadata = null;

    // Check if this is a write operation
    const isWriteOp = isWriteOperation(sanitizedSql);
    const affectedTable = extractTableFromSql(sanitizedSql);
    const affectedColumns = extractColumnsFromSql(sanitizedSql);

    // Validate write operations
    if (isWriteOp) {
      // For write operations, check whitelist permissions
      const isAllowed = WhitelistController.checkOperationAllowed(
        connectionId,
        'write',
        affectedTable,
        affectedColumns
      );

      if (!isAllowed) {
        // Get whitelist status to provide better error message
        const whitelistManager = WhitelistController.getManager();
        const whitelist = whitelistManager.getWhitelist(connectionId);
        
        let errorMessage;
        if (whitelist.enabled && Object.keys(whitelist.tables).length === 0) {
          errorMessage = `Whitelist is enabled but no tables are whitelisted. Please add '${affectedTable}' to the whitelist to perform write operations.`;
        } else if (whitelist.enabled) {
          const whitelistedTables = Object.keys(whitelist.tables).join(', ');
          errorMessage = `Table '${affectedTable}' is not in the whitelist. Currently whitelisted tables: [${whitelistedTables}]. Please add '${affectedTable}' to the whitelist to perform write operations.`;
        } else {
          errorMessage = `Write operation on table '${affectedTable}' is not permitted.`;
        }
        
        messages.push(
          AssistantController.formatMessage(
            'assistant',
            'note',
            errorMessage
          )
        );
        sanitizedSql = '';
        finalIntent = 'reply_only';
      } else if (finalIntent === 'execute_write' || finalIntent === 'require_confirmation') {
        // Write operations require user confirmation
        requiresConfirmation = true;
        operationMetadata = {
          type: 'write',
          table: affectedTable,
          columns: affectedColumns,
          sql: sanitizedSql
        };
        finalIntent = 'require_confirmation';
      }
    } else if (sanitizedSql && !DatabaseController.isSafeReadOnlySql(sanitizedSql)) {
      // Invalid SQL detected
      messages.push(
        AssistantController.formatMessage(
          'assistant',
          'note',
          'The generated SQL was discarded because it was not valid. Please review manually.'
        )
      );
      sanitizedSql = '';
      finalIntent = 'reply_only';
    }

    if (finalIntent === 'execute_query' && (!connectionStatus.connected || !runQuery)) {
      finalIntent = sanitizedSql ? 'generate_sql' : 'reply_only';
    }

    if (finalIntent === 'execute_query' && sanitizedSql) {
      try {
        const execution = await dbManager.executeQuery(connectionId, sanitizedSql);
        normalizedResult = DatabaseController.normalizeQueryResult(execution.data);
        executionResult = {
          rows: normalizedResult.rows,
          columns: normalizedResult.columns,
          executionTime: execution.executionTime,
          rowCount: normalizedResult.rowCount
        };
        executionMeta = {
          provider: interpretation.provider,
          model: interpretation.model,
          confidence: interpretation.confidence || null
        };
      } catch (error) {
        logger.error('Assistant query execution failed:', error);
        messages.push(
          AssistantController.formatMessage(
            'assistant',
            'note',
            'I generated SQL but could not execute it automatically. Please review and run it manually.'
          )
        );
        finalIntent = 'generate_sql';
      }
    }

    const cautions = AssistantController.sanitizeCautions(interpretation.cautions);

    // Handle write operation confirmation - return early if requires confirmation
    if (requiresConfirmation) {
      const confirmationMessage = interpretation.message || 
        `I've prepared an INSERT statement to add the user. Please review and confirm to proceed.`;
      
      const resultPayload = {
        intent: 'require_confirmation',
        sql: sanitizedSql,
        explanation: interpretation.explanation || 'This operation will insert a new record into the database.',
        operationType: 'write',
        affectedTable: affectedTable,
        affectedColumns: affectedColumns,
        cautions: cautions,
        requiresUserApproval: true,
        message: confirmationMessage,
        provider: interpretation.provider,
        model: interpretation.model,
        confidence: interpretation.confidence || null
      };

      // Add formatted message to messages array
      messages.push(
        AssistantController.formatMessage('assistant', 'text', confirmationMessage)
      );
      
      if (sanitizedSql) {
        messages.push(AssistantController.formatMessage('assistant', 'sql', sanitizedSql));
      }

      if (cautions.length) {
        messages.push(
          AssistantController.formatMessage('assistant', 'note', cautions.join(' '))
        );
      }

      return res.json({
        success: true,
        data: {
          messages: messages.filter(Boolean),
          result: resultPayload
        },
        meta: {
          intent: 'require_confirmation',
          executed: false,
          provider: interpretation.provider,
          model: interpretation.model,
          requiresConfirmation: true
        }
      });
    }

    let primaryMessage = interpretation.message;
    if (executionResult) {
      const rowPhrase = executionResult.rowCount === 0
        ? 'The SQL ran successfully but returned no rows.'
        : `The SQL ran successfully and returned ${executionResult.rowCount} rows.`;
      primaryMessage = primaryMessage ? `${primaryMessage} ${rowPhrase}` : rowPhrase;
    }

    if (!primaryMessage) {
      if (finalIntent === 'generate_sql' && sanitizedSql) {
        primaryMessage = 'Here is a SQL query you can run against your database.';
      } else {
        primaryMessage = 'Here is what I found.';
      }
    }

    const mainMessage = AssistantController.formatMessage('assistant', 'text', primaryMessage);
    if (mainMessage) {
      messages.push(mainMessage);
    }

    if (sanitizedSql) {
      messages.push(AssistantController.formatMessage('assistant', 'sql', sanitizedSql));
    }

    if (cautions.length) {
      messages.push(
        AssistantController.formatMessage(
          'assistant',
          'note',
          cautions.join(' ')
        )
      );
    }

    const resultPayload = (() => {
      if (executionResult) {
        return {
          intent: 'execute_query',
          sql: sanitizedSql,
          explanation: interpretation.explanation || null,
          rows: executionResult.rows,
          columns: executionResult.columns,
          rowCount: executionResult.rowCount,
          executionTime: executionResult.executionTime,
          cautions,
          provider: interpretation.provider,
          model: interpretation.model,
          confidence: interpretation.confidence || null
        };
      }

      if (sanitizedSql) {
        return {
          intent: finalIntent,
          sql: sanitizedSql,
          explanation: interpretation.explanation || null,
          cautions,
          provider: interpretation.provider,
          model: interpretation.model,
          confidence: interpretation.confidence || null
        };
      }

      return null;
    })();

    return res.json({
      success: true,
      data: {
        messages: messages.filter(Boolean),
        result: resultPayload
      },
      meta: {
        intent: executionResult ? 'execute_query' : finalIntent,
        executed: Boolean(executionResult),
        provider: interpretation.provider,
        model: interpretation.model,
        execution: executionMeta
      }
    });
  }
  /**
   * Handle write operation execution with user confirmation
   * POST /api/assistant/confirm-write
   */
  static async confirmWriteOperation(req, res) {
    const { connectionId, sql, confirmed } = req.body;

    if (!connectionId || !sql) {
      return res.status(400).json({
        success: false,
        message: 'connectionId and sql are required'
      });
    }

    if (confirmed !== true) {
      return res.json({
        success: true,
        message: 'Write operation cancelled by user',
        executed: false
      });
    }

    // Extract operation details
    const affectedTable = extractTableFromSql(sql);
    const affectedColumns = extractColumnsFromSql(sql);

    // Double-check whitelist permission
    const isAllowed = WhitelistController.checkOperationAllowed(
      connectionId,
      'write',
      affectedTable,
      affectedColumns
    );

    if (!isAllowed) {
      logger.warn(`Write operation rejected for table '${affectedTable}': not in whitelist`);
      return res.status(403).json({
        success: false,
        message: `Write operation on table '${affectedTable}' is not permitted`
      });
    }

    let connectionStatus = { connected: false };
    try {
      connectionStatus = dbManager.getConnectionStatus(connectionId);
    } catch (error) {
      logger.warn('Could not read connection status for write confirmation:', error.message);
    }

    if (!connectionStatus.connected) {
      return res.status(400).json({
        success: false,
        message: 'Database connection is not available'
      });
    }

    try {
      const execution = await dbManager.executeQuery(connectionId, sql);
      
      // For write operations, use affectedRows directly from execution result
      const affectedRows = execution.affectedRows || execution.rowCount || 0;
      const insertId = execution.insertId || null;

      logger.info(`Write operation executed on table '${affectedTable}' for connection ${connectionId}`, {
        affectedRows,
        insertId,
        executionTime: execution.executionTime
      });

      return res.json({
        success: true,
        executed: true,
        message: `Operation completed successfully`,
        result: {
          rowsAffected: affectedRows,
          affectedRows: affectedRows,
          insertId: insertId,
          executionTime: execution.executionTime
        }
      });
    } catch (error) {
      logger.error('Write operation execution failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to execute write operation',
        error: error.message
      });
    }
  }
}

module.exports = AssistantController;
