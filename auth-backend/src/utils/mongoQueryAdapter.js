/**
 * MongoDB Query Adapter
 * 
 * Provides a unified interface for MongoDB operations that can work alongside SQL databases.
 * Converts natural language or simple query structures into MongoDB operations.
 */

const logger = require('./logger');

class MongoQueryAdapter {
  /**
   * Parse and execute a MongoDB-style query or JSON query
   * @param {Object} db - MongoDB database instance
   * @param {String} queryInput - Query string (JSON or natural language)
   * @returns {Promise<Object>} - Query results
   */
  static async executeMongoQuery(db, queryInput) {
    try {
      // Try to parse as JSON first (MongoDB shell format)
      if (queryInput.trim().startsWith('{') || queryInput.trim().startsWith('[')) {
        return await this.executeJSONQuery(db, queryInput);
      }
      
      // Try to parse as MongoDB shell command
      if (queryInput.includes('db.') || queryInput.includes('.find') || queryInput.includes('.aggregate')) {
        return await this.executeShellCommand(db, queryInput);
      }
      
      // Otherwise, interpret as natural language
      return await this.executeNaturalLanguage(db, queryInput);
    } catch (error) {
      logger.error('MongoDB query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute MongoDB shell-style command
   * Example: db.users.find({age: {$gt: 18}}).limit(10)
   */
  static async executeShellCommand(db, command) {
    try {
      const cleanCommand = command.trim();
      
      // Extract collection name
      const collMatch = cleanCommand.match(/db\.(\w+)\./);
      if (!collMatch) {
        throw new Error('Invalid MongoDB command: collection name not found');
      }
      
      const collectionName = collMatch[1];
      const collection = db.collection(collectionName);
      
      // Detect operation type
      if (cleanCommand.includes('.find(')) {
        return await this.executeFindCommand(collection, cleanCommand);
      } else if (cleanCommand.includes('.aggregate(')) {
        return await this.executeAggregateCommand(collection, cleanCommand);
      } else if (cleanCommand.includes('.insertOne(') || cleanCommand.includes('.insertMany(')) {
        return await this.executeInsertCommand(collection, cleanCommand);
      } else if (cleanCommand.includes('.updateOne(') || cleanCommand.includes('.updateMany(')) {
        return await this.executeUpdateCommand(collection, cleanCommand);
      } else if (cleanCommand.includes('.deleteOne(') || cleanCommand.includes('.deleteMany(')) {
        return await this.executeDeleteCommand(collection, cleanCommand);
      } else if (cleanCommand.includes('.count(')) {
        return await this.executeCountCommand(collection, cleanCommand);
      }
      
      throw new Error('Unsupported MongoDB operation');
    } catch (error) {
      logger.error('Shell command execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute find operation
   */
  static async executeFindCommand(collection, command) {
    // Extract query and options from find()
    const findMatch = command.match(/\.find\((.*?)\)/);
    if (!findMatch) {
      throw new Error('Invalid find command');
    }
    
    let query = {};
    let projection = {};
    
    const params = this.parseParameters(findMatch[1]);
    if (params[0]) query = params[0];
    if (params[1]) projection = params[1];
    
    // Build query
    let cursor = collection.find(query);
    
    if (Object.keys(projection).length > 0) {
      cursor = cursor.project(projection);
    }
    
    // Check for chained methods
    const limitMatch = command.match(/\.limit\((\d+)\)/);
    if (limitMatch) {
      cursor = cursor.limit(parseInt(limitMatch[1]));
    }
    
    const skipMatch = command.match(/\.skip\((\d+)\)/);
    if (skipMatch) {
      cursor = cursor.skip(parseInt(skipMatch[1]));
    }
    
    const sortMatch = command.match(/\.sort\((.*?)\)/);
    if (sortMatch) {
      const sortObj = this.parseJSON(sortMatch[1]);
      cursor = cursor.sort(sortObj);
    }
    
    const results = await cursor.toArray();
    
    return {
      rows: results,
      rowCount: results.length,
      collection: collection.collectionName,
      operation: 'find'
    };
  }

  /**
   * Execute aggregate operation
   */
  static async executeAggregateCommand(collection, command) {
    const aggMatch = command.match(/\.aggregate\((.*)\)/s);
    if (!aggMatch) {
      throw new Error('Invalid aggregate command');
    }
    
    const pipelineStr = aggMatch[1].trim();
    const pipeline = this.parseJSON(pipelineStr);
    
    const results = await collection.aggregate(pipeline).toArray();
    
    return {
      rows: results,
      rowCount: results.length,
      collection: collection.collectionName,
      operation: 'aggregate'
    };
  }

  /**
   * Execute insert operation
   */
  static async executeInsertCommand(collection, command) {
    if (command.includes('.insertOne(')) {
      const match = command.match(/\.insertOne\((.*?)\)/s);
      const doc = this.parseJSON(match[1]);
      const result = await collection.insertOne(doc);
      
      return {
        rows: [{ insertedId: result.insertedId }],
        rowCount: 1,
        affectedRows: 1,
        insertedId: result.insertedId,
        collection: collection.collectionName,
        operation: 'insertOne'
      };
    } else {
      const match = command.match(/\.insertMany\((.*?)\)/s);
      const docs = this.parseJSON(match[1]);
      const result = await collection.insertMany(docs);
      
      return {
        rows: result.insertedIds,
        rowCount: result.insertedCount,
        affectedRows: result.insertedCount,
        collection: collection.collectionName,
        operation: 'insertMany'
      };
    }
  }

  /**
   * Execute update operation
   */
  static async executeUpdateCommand(collection, command) {
    const isUpdateMany = command.includes('.updateMany(');
    const match = command.match(isUpdateMany ? /\.updateMany\((.*?)\)/s : /\.updateOne\((.*?)\)/s);
    
    const params = this.parseParameters(match[1]);
    const filter = params[0] || {};
    const update = params[1] || {};
    
    const result = isUpdateMany 
      ? await collection.updateMany(filter, update)
      : await collection.updateOne(filter, update);
    
    return {
      rows: [{ 
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId
      }],
      rowCount: result.modifiedCount,
      affectedRows: result.modifiedCount,
      collection: collection.collectionName,
      operation: isUpdateMany ? 'updateMany' : 'updateOne'
    };
  }

  /**
   * Execute delete operation
   */
  static async executeDeleteCommand(collection, command) {
    const isDeleteMany = command.includes('.deleteMany(');
    const match = command.match(isDeleteMany ? /\.deleteMany\((.*?)\)/s : /\.deleteOne\((.*?)\)/s);
    
    const filter = this.parseJSON(match[1]);
    
    const result = isDeleteMany 
      ? await collection.deleteMany(filter)
      : await collection.deleteOne(filter);
    
    return {
      rows: [{ deletedCount: result.deletedCount }],
      rowCount: result.deletedCount,
      affectedRows: result.deletedCount,
      collection: collection.collectionName,
      operation: isDeleteMany ? 'deleteMany' : 'deleteOne'
    };
  }

  /**
   * Execute count operation
   */
  static async executeCountCommand(collection, command) {
    const match = command.match(/\.count\((.*?)\)/);
    const filter = match[1] ? this.parseJSON(match[1]) : {};
    
    const count = await collection.countDocuments(filter);
    
    return {
      rows: [{ count }],
      rowCount: 1,
      collection: collection.collectionName,
      operation: 'count'
    };
  }

  /**
   * Execute JSON query
   */
  static async executeJSONQuery(db, queryInput) {
    const queryObj = this.parseJSON(queryInput);
    
    if (!queryObj.collection) {
      throw new Error('Collection name is required in JSON query');
    }
    
    const collection = db.collection(queryObj.collection);
    const operation = queryObj.operation || 'find';
    const query = queryObj.query || {};
    const options = queryObj.options || {};
    
    switch (operation) {
      case 'find':
        const results = await collection.find(query, options).toArray();
        return {
          rows: results,
          rowCount: results.length,
          collection: queryObj.collection,
          operation: 'find'
        };
      
      case 'aggregate':
        const aggResults = await collection.aggregate(query).toArray();
        return {
          rows: aggResults,
          rowCount: aggResults.length,
          collection: queryObj.collection,
          operation: 'aggregate'
        };
      
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Execute natural language query (simplified)
   */
  static async executeNaturalLanguage(db, query) {
    const lowerQuery = query.toLowerCase();
    
    // Extract collection name
    const collections = await db.listCollections().toArray();
    let targetCollection = null;
    
    for (const coll of collections) {
      if (lowerQuery.includes(coll.name.toLowerCase())) {
        targetCollection = coll.name;
        break;
      }
    }
    
    if (!targetCollection && collections.length > 0) {
      targetCollection = collections[0].name;
    }
    
    if (!targetCollection) {
      throw new Error('No collections found in database');
    }
    
    const collection = db.collection(targetCollection);
    
    // Simple patterns
    if (/show|list|get|all|find/.test(lowerQuery)) {
      const limit = this.extractLimit(query) || 50;
      const results = await collection.find({}).limit(limit).toArray();
      
      return {
        rows: results,
        rowCount: results.length,
        collection: targetCollection,
        operation: 'find',
        note: 'Natural language query interpreted as find all'
      };
    }
    
    if (/count/.test(lowerQuery)) {
      const count = await collection.countDocuments({});
      
      return {
        rows: [{ count, collection: targetCollection }],
        rowCount: 1,
        collection: targetCollection,
        operation: 'count'
      };
    }
    
    // Default: return sample documents
    const results = await collection.find({}).limit(10).toArray();
    return {
      rows: results,
      rowCount: results.length,
      collection: targetCollection,
      operation: 'find',
      note: 'Showing sample documents'
    };
  }

  /**
   * Helper: Parse JSON safely
   */
  static parseJSON(str) {
    if (!str || str.trim() === '') return {};
    
    try {
      // Handle MongoDB extended JSON (convert to standard JSON)
      const cleaned = str
        .replace(/ObjectId\("([^"]+)"\)/g, '"$1"')
        .replace(/ISODate\("([^"]+)"\)/g, '"$1"')
        .replace(/NumberLong\((\d+)\)/g, '$1')
        .replace(/NumberInt\((\d+)\)/g, '$1')
        .replace(/Timestamp\((\d+),\s*(\d+)\)/g, '{"t":$1,"i":$2}');
      
      return JSON.parse(cleaned);
    } catch (error) {
      logger.error('JSON parse failed:', error.message);
      logger.error('Input string:', str);
      // Don't use eval - it's a security risk
      throw new Error(`Invalid JSON syntax: ${error.message}. Use valid JSON or MongoDB shell syntax.`);
    }
  }

  /**
   * Helper: Parse function parameters
   */
  static parseParameters(paramStr) {
    if (!paramStr || paramStr.trim() === '') return [];
    
    const params = [];
    let depth = 0;
    let currentParam = '';
    
    for (let i = 0; i < paramStr.length; i++) {
      const char = paramStr[i];
      
      if (char === '{' || char === '[') depth++;
      if (char === '}' || char === ']') depth--;
      
      if (char === ',' && depth === 0) {
        params.push(this.parseJSON(currentParam.trim()));
        currentParam = '';
      } else {
        currentParam += char;
      }
    }
    
    if (currentParam.trim()) {
      params.push(this.parseJSON(currentParam.trim()));
    }
    
    return params;
  }

  /**
   * Helper: Extract LIMIT value from query
   */
  static extractLimit(query) {
    const match = query.match(/limit\s+(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }
}

module.exports = MongoQueryAdapter;
