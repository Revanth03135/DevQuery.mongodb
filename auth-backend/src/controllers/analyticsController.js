const DatabaseController = require('./databaseController');
const logger = require('../utils/logger');
const { generateAnalyticsQuery } = require('../utils/aiClient');
const dbManager = require('../utils/dbManager');

// Schema-based query generator (fallback when AI fails)
const generateSchemaBasedQuery = (query, tables, dbType) => {
  if (!tables || tables.length === 0) return null;
  
  const lowerQuery = query.toLowerCase();
  
  // Find relevant table based on query keywords
  let targetTable = null;
  let labelColumn = null;
  let valueColumn = null;
  let chartType = 'bar';
  
  // Look for product-related queries
  if (/product/i.test(query)) {
    targetTable = tables.find(t => /product/i.test(t.table_name || t.name));
    
    if (targetTable) {
      const cols = targetTable.columns || [];
      
      // Find name column
      labelColumn = cols.find(c => /name|title|product_name/i.test(c.column_name || c.name))?.column_name || 
                    cols.find(c => /name|title|product_name/i.test(c.column_name || c.name))?.name ||
                    cols[0]?.column_name || cols[0]?.name;
      
      // Find price column
      if (/price/i.test(query)) {
        valueColumn = cols.find(c => /price|cost|amount/i.test(c.column_name || c.name))?.column_name ||
                     cols.find(c => /price|cost|amount/i.test(c.column_name || c.name))?.name;
        chartType = 'line'; // Line chart for prices
      } else if (/quantity|stock|count/i.test(query)) {
        valueColumn = cols.find(c => /quantity|stock|count|qty/i.test(c.column_name || c.name))?.column_name ||
                     cols.find(c => /quantity|stock|count|qty/i.test(c.column_name || c.name))?.name;
      }
      
      if (!valueColumn && cols.length > 1) {
        // Find numeric column
        valueColumn = cols.find(c => {
          const type = (c.data_type || c.type || '').toLowerCase();
          return /int|number|numeric|decimal|float|double|price|amount/i.test(type);
        })?.column_name || cols.find(c => {
          const type = (c.data_type || c.type || '').toLowerCase();
          return /int|number|numeric|decimal|float|double|price|amount/i.test(type);
        })?.name || cols[1]?.column_name || cols[1]?.name;
      }
    }
  }
  
  // Look for user/customer queries
  else if (/user|customer|account/i.test(query)) {
    targetTable = tables.find(t => /user|customer|account/i.test(t.table_name || t.name));
    
    if (targetTable) {
      const cols = targetTable.columns || [];
      labelColumn = cols.find(c => /name|username|email/i.test(c.column_name || c.name))?.column_name ||
                    cols.find(c => /name|username|email/i.test(c.column_name || c.name))?.name ||
                    cols[0]?.column_name || cols[0]?.name;
      
      if (/count|total|number/i.test(query)) {
        // Aggregate query
        valueColumn = 'count';
      }
    }
  }
  
  // Look for order/sales queries
  else if (/order|sale|transaction/i.test(query)) {
    targetTable = tables.find(t => /order|sale|transaction/i.test(t.table_name || t.name));
    
    if (targetTable) {
      const cols = targetTable.columns || [];
      
      if (/amount|revenue|total/i.test(query)) {
        labelColumn = cols.find(c => /date|created|time/i.test(c.column_name || c.name))?.column_name ||
                      cols.find(c => /date|created|time/i.test(c.column_name || c.name))?.name;
        valueColumn = cols.find(c => /amount|total|revenue|price/i.test(c.column_name || c.name))?.column_name ||
                     cols.find(c => /amount|total|revenue|price/i.test(c.column_name || c.name))?.name;
        chartType = 'line';
      }
    }
  }
  
  // If no specific table found, try first table with relevant columns
  if (!targetTable && tables.length > 0) {
    targetTable = tables[0];
    const cols = targetTable.columns || [];
    
    if (cols.length >= 2) {
      labelColumn = cols[0]?.column_name || cols[0]?.name;
      valueColumn = cols.find(c => {
        const type = (c.data_type || c.type || '').toLowerCase();
        return /int|number|numeric|decimal|float|double/i.test(type);
      })?.column_name || cols.find(c => {
        const type = (c.data_type || c.type || '').toLowerCase();
        return /int|number|numeric|decimal|float|double/i.test(type);
      })?.name || cols[1]?.column_name || cols[1]?.name;
    }
  }
  
  if (!targetTable || !labelColumn || !valueColumn) {
    return null;
  }
  
  const tableName = targetTable.table_name || targetTable.name;
  
  // Detect chart type from query
  if (/line\s+chart/i.test(query)) chartType = 'line';
  else if (/bar\s+chart/i.test(query)) chartType = 'bar';
  else if (/pie\s+chart/i.test(query)) chartType = 'pie';
  
  // Build SQL based on database type
  let sql;
  const limit = 50; // Reasonable limit for charts
  
  // Quote identifiers based on database type
  const quote = (identifier) => {
    switch (dbType) {
      case 'postgresql':
        return `"${identifier}"`;
      case 'mysql':
        return `\`${identifier}\``;
      case 'sqlserver':
        return `[${identifier}]`;
      case 'oracle':
        return `"${identifier}"`;
      case 'mongodb':
        // MongoDB uses different syntax, handled separately
        return identifier;
      default:
        return identifier; // No quotes for SQLite and unknown types
    }
  };
  
  // Handle MongoDB separately (uses aggregation pipeline)
  if (dbType === 'mongodb') {
    if (valueColumn === 'count') {
      sql = `db.${tableName}.aggregate([
  { $group: { _id: "$${labelColumn}", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: ${limit} }
])`;
    } else {
      sql = `db.${tableName}.find({}, { ${labelColumn}: 1, ${valueColumn}: 1 }).limit(${limit})`;
    }
  } 
  // SQL databases
  else {
    const quotedTable = quote(tableName);
    const quotedLabel = quote(labelColumn);
    const quotedValue = quote(valueColumn);
    
    if (valueColumn === 'count') {
      // Aggregation query
      if (dbType === 'oracle') {
        // Oracle uses FETCH FIRST instead of LIMIT
        sql = `SELECT ${quotedLabel}, COUNT(*) as count FROM ${quotedTable} GROUP BY ${quotedLabel} ORDER BY count DESC FETCH FIRST ${limit} ROWS ONLY`;
      } else if (dbType === 'sqlserver') {
        // SQL Server uses TOP
        sql = `SELECT TOP ${limit} ${quotedLabel}, COUNT(*) as count FROM ${quotedTable} GROUP BY ${quotedLabel} ORDER BY count DESC`;
      } else {
        // PostgreSQL, MySQL, SQLite
        sql = `SELECT ${quotedLabel}, COUNT(*) as count FROM ${quotedTable} GROUP BY ${quotedLabel} ORDER BY count DESC LIMIT ${limit}`;
      }
      valueColumn = 'count';
    } else {
      // Simple select
      if (dbType === 'oracle') {
        sql = `SELECT ${quotedLabel}, ${quotedValue} FROM ${quotedTable} ORDER BY ${quotedLabel} FETCH FIRST ${limit} ROWS ONLY`;
      } else if (dbType === 'sqlserver') {
        sql = `SELECT TOP ${limit} ${quotedLabel}, ${quotedValue} FROM ${quotedTable} ORDER BY ${quotedLabel}`;
      } else {
        sql = `SELECT ${quotedLabel}, ${quotedValue} FROM ${quotedTable} ORDER BY ${quotedLabel} LIMIT ${limit}`;
      }
    }
  }
  
  return {
    sql,
    labelColumn,
    valueColumn,
    chartType,
    title: `${tableName} - ${labelColumn} vs ${valueColumn}`,
    dbType
  };
};

const nlQuery = async (req, res) => {
  const { query, connectionId } = req.body || {};
  if (!query) return res.status(400).json({ message: 'query required' });

  let sql;
  let columns;
  let rows;
  let chart;
  let useRealData = false;

  try {
    // If connectionId is provided, try to get real data from the database
    if (connectionId) {
      logger.info(`Analytics query received with connectionId: ${connectionId}`);
      useRealData = true;
      
      // Get the active connection from dbManager
      const connectionData = dbManager.activeConnections.get(connectionId);
      
      if (connectionData && connectionData.connection) {
        const connection = connectionData.connection;
        logger.info(`Connection found for ${connectionId}, type: ${connection.type}`);
        
        // Get database schema for AI context
        const schemaResult = await dbManager.getSchema(connectionId);
        const tables = schemaResult.schema || [];
        logger.info(`Schema retrieved: ${tables.length} tables found`);

        // Check for special analytics patterns that use localStorage data
        const isQueryHistory = /query.*history|recent.*queries/i.test(query);
        const isSavedQueries = /saved.*queries|bookmarked/i.test(query);
        const isSchemaStats = /table.*count|schema.*stats|column.*types/i.test(query);

        if (isQueryHistory) {
          // Query history analysis from localStorage
          const queryHistory = JSON.parse(req.body.queryHistory || '[]');
          const last7Days = queryHistory.filter(q => {
            const qDate = new Date(q.executedAt);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return qDate >= weekAgo;
          });
          
          sql = '-- Query History Analytics (from localStorage)';
          columns = ['date', 'query_count', 'success_rate'];
          
          const byDay = {};
          last7Days.forEach(q => {
            const day = new Date(q.executedAt).toLocaleDateString();
            if (!byDay[day]) byDay[day] = { total: 0, success: 0 };
            byDay[day].total++;
            if (q.status === 'success') byDay[day].success++;
          });
          
          rows = Object.keys(byDay).map(day => ({
            date: day,
            query_count: byDay[day].total,
            success_rate: Math.round((byDay[day].success / byDay[day].total) * 100)
          }));
          
          chart = {
            labels: rows.map(r => r.date),
            values: rows.map(r => r.query_count),
            secondaryValues: rows.map(r => r.success_rate)
          };
        }
        else if (isSavedQueries) {
          // Saved queries analysis from localStorage
          const savedQueries = JSON.parse(req.body.savedQueries || '[]');
          
          sql = '-- Saved Queries Analytics';
          columns = ['query_name', 'created_date', 'query_preview'];
          
          rows = savedQueries.slice(0, 10).map((q, idx) => ({
            query_name: q.name || `Query ${idx + 1}`,
            created_date: new Date(q.createdAt).toLocaleDateString(),
            query_preview: (q.sql || '').substring(0, 50) + '...'
          }));
          
          chart = {
            labels: rows.map((r, i) => `Query ${i + 1}`),
            values: rows.map((r, i) => savedQueries.length - i)
          };
        }
        else if (isSchemaStats) {
          // Schema statistics from database
          const typeCount = {};
          tables.forEach(table => {
            (table.columns || []).forEach(col => {
              const baseType = (col.type || 'unknown').split('(')[0].toLowerCase();
              typeCount[baseType] = (typeCount[baseType] || 0) + 1;
            });
          });
          
          sql = '-- Schema Analysis: Column Types';
          columns = ['table_name', 'column_count'];
          rows = tables.slice(0, 10).map(table => ({
            table_name: table.table_name || table.name,
            column_count: (table.columns || []).length
          }));
          
          chart = {
            labels: rows.map(r => r.table_name),
            values: rows.map(r => r.column_count)
          };
        }
        else {
          // 🚀 USE GEMINI AI FOR ALL OTHER ANALYTICS QUERIES!
          try {
            logger.info(`Using Gemini AI for analytics query: "${query}"`);
            
            const aiResult = await generateAnalyticsQuery(query, tables, connection.type);
            
            // Execute the AI-generated SQL query
            sql = aiResult.sql;
            logger.info(`AI generated SQL: ${sql}`);
            
            try {
              let queryResult;
              
              // Handle MongoDB vs SQL differently
              if (connection.type === 'mongodb') {
                const MongoQueryAdapter = require('../utils/mongoQueryAdapter');
                queryResult = await MongoQueryAdapter.executeMongoQuery(connection.db, sql);
                rows = queryResult.rows || [];
              } else {
                queryResult = await connection.query(sql);
                rows = queryResult.rows || queryResult;
              }
              
              // Extract columns from query results
              if (rows && rows.length > 0) {
                columns = Object.keys(rows[0]);
                
                // Determine label and value columns
                const labelCol = aiResult.labelColumn || columns[0];
                const valueCol = aiResult.valueColumn || columns[1];
                
                chart = {
                  labels: rows.map(r => String(r[labelCol])),
                  values: rows.map(r => Number(r[valueCol]) || 0),
                  chartType: aiResult.chartType || 'bar',
                  title: aiResult.suggestedTitle || query
                };
                
                logger.info(`✅ AI analytics executed successfully: ${rows.length} rows returned`);
              } else {
                // No results from query
                logger.warn('Query returned no results');
                columns = [];
                rows = [];
                chart = {
                  labels: ['No Data'],
                  values: [0],
                  chartType: 'bar'
                };
              }
            } catch (sqlError) {
              logger.error('❌ SQL execution failed:', sqlError.message);
              logger.error('Failed SQL:', sql);
              
              // Try fallback: execute user's direct query
              const isDirectSQL = /^SELECT\s+/i.test(query);
              const isDirectMongo = connection.type === 'mongodb' && (query.includes('db.') || query.trim().startsWith('{'));
              
              if (isDirectSQL || isDirectMongo) {
                logger.info('Attempting to execute query as direct query...');
                try {
                  let directResult;
                  
                  if (connection.type === 'mongodb') {
                    const MongoQueryAdapter = require('../utils/mongoQueryAdapter');
                    directResult = await MongoQueryAdapter.executeMongoQuery(connection.db, query);
                    rows = directResult.rows || [];
                  } else {
                    directResult = await connection.query(query);
                    rows = directResult.rows || directResult;
                  }
                  
                  sql = query;
                  
                  if (rows && rows.length > 0) {
                    columns = Object.keys(rows[0]);
                    chart = {
                      labels: rows.map(r => String(r[columns[0]])),
                      values: rows.map(r => Number(r[columns[1]]) || 0),
                      chartType: 'bar',
                      title: 'Direct Query Results'
                    };
                    logger.info(`✅ Direct query executed successfully: ${rows.length} rows`);
                  }
                } catch (directError) {
                  logger.error('❌ Direct query also failed:', directError.message);
                  throw sqlError; // Throw original error
                }
              } else {
                throw sqlError;
              }
            }
          } catch (aiError) {
            logger.error('❌ Gemini AI analytics failed:', aiError.message);
            logger.error('Error details:', {
              name: aiError.name,
              message: aiError.message,
              stack: aiError.stack?.split('\n')[0]
            });
            
            // Try schema-based fallback
            logger.info('Attempting schema-based fallback...');
            const fallbackResult = generateSchemaBasedQuery(query, tables, connection.type);
            
            if (fallbackResult) {
              try {
                sql = fallbackResult.sql;
                logger.info(`Schema-based fallback SQL: ${sql}`);
                
                let queryResult;
                
                // Handle MongoDB vs SQL
                if (connection.type === 'mongodb') {
                  const MongoQueryAdapter = require('../utils/mongoQueryAdapter');
                  queryResult = await MongoQueryAdapter.executeMongoQuery(connection.db, sql);
                  rows = queryResult.rows || [];
                } else {
                  queryResult = await connection.query(sql);
                  rows = queryResult.rows || queryResult;
                }
                
                if (rows && rows.length > 0) {
                  columns = Object.keys(rows[0]);
                  chart = {
                    labels: rows.map(r => String(r[fallbackResult.labelColumn || columns[0]])),
                    values: rows.map(r => Number(r[fallbackResult.valueColumn || columns[1]]) || 0),
                    chartType: fallbackResult.chartType || 'bar',
                    title: fallbackResult.title || query
                  };
                  logger.info(`✅ Schema-based fallback executed: ${rows.length} rows`);
                } else {
                  logger.warn('Schema-based query returned no results');
                  useRealData = false;
                }
              } catch (fallbackError) {
                logger.error('❌ Schema-based fallback failed:', fallbackError.message);
                useRealData = false;
              }
            } else {
              logger.warn('No schema-based fallback available');
              useRealData = false;
            }
          }
        }
      } else {
        logger.warn(`Connection not found for connectionId: ${connectionId}`);
        logger.warn(`Available connections: ${Array.from(dbManager.activeConnections.keys()).join(', ')}`);
        useRealData = false;
      }
    } else {
      logger.info('No connectionId provided in request');
    }

    // Sample data patterns if no real data available or AI failed
    if (!useRealData) {
      if (/sales.*region/i.test(query)) {
        sql = 'SELECT region, SUM(sales) as total_sales FROM orders WHERE order_date >= DATE_SUB(NOW(), INTERVAL 1 MONTH) GROUP BY region';
        columns = ['region', 'total_sales'];
        rows = [
          { region: 'North America', total_sales: 45000 },
          { region: 'Europe', total_sales: 38500 },
          { region: 'Asia Pacific', total_sales: 32800 },
          { region: 'Latin America', total_sales: 21700 },
          { region: 'Middle East', total_sales: 15600 }
        ];
        chart = {
          labels: rows.map((r) => r.region),
          values: rows.map((r) => r.total_sales)
        };
      } else if (/users.*last month|last month users|monthly users|signups.*last month/i.test(query)) {
        sql = 'SELECT DATE(created_at) as day, COUNT(*) as signups FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) GROUP BY day';
        columns = ['day', 'signups'];
        rows = Array.from({ length: 30 }, (_, i) => ({ 
          day: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          signups: Math.floor(Math.random() * 35 + 10) 
        }));
        chart = {
          labels: rows.map((r) => r.day),
          values: rows.map((r) => r.signups)
        };
      } else if (/top.*products|best.*selling|popular.*products/i.test(query)) {
        sql = 'SELECT product_name, SUM(quantity) as total_sold, SUM(revenue) as total_revenue FROM sales GROUP BY product_name ORDER BY total_sold DESC LIMIT 10';
        columns = ['product_name', 'total_sold', 'total_revenue'];
        rows = [
          { product_name: 'Premium Subscription', total_sold: 3280, total_revenue: 98400 },
          { product_name: 'Enterprise Plan', total_sold: 2150, total_revenue: 129000 },
          { product_name: 'Professional Tools', total_sold: 1890, total_revenue: 56700 },
          { product_name: 'Analytics Package', total_sold: 1650, total_revenue: 49500 },
          { product_name: 'Starter Kit', total_sold: 1420, total_revenue: 28400 },
          { product_name: 'Developer Suite', total_sold: 1280, total_revenue: 51200 },
          { product_name: 'Business Bundle', total_sold: 1150, total_revenue: 46000 },
          { product_name: 'Basic Plan', total_sold: 980, total_revenue: 19600 },
          { product_name: 'Pro Add-ons', total_sold: 875, total_revenue: 26250 },
          { product_name: 'Team License', total_sold: 720, total_revenue: 36000 }
        ];
        chart = {
          labels: rows.map((r) => r.product_name),
          values: rows.map((r) => r.total_sold),
          secondaryValues: rows.map((r) => r.total_revenue)
        };
      } else if (/active.*users.*today|today.*active|current.*users/i.test(query)) {
        sql = 'SELECT HOUR(last_active) as hour, COUNT(*) as active_users FROM user_sessions WHERE last_active >= CURDATE() GROUP BY hour';
        columns = ['hour', 'active_users'];
        rows = Array.from({ length: 24 }, (_, i) => ({ 
          hour: `${i}:00`,
          active_users: Math.floor(Math.random() * 150 + 20) 
        }));
        chart = {
          labels: rows.map((r) => r.hour),
          values: rows.map((r) => r.active_users)
        };
      } else if (/performance|response.*time|query.*speed|execution.*time/i.test(query)) {
        sql = 'SELECT query_type, AVG(execution_time) as avg_time FROM query_logs GROUP BY query_type';
        columns = ['query_type', 'avg_time_ms', 'count'];
        rows = [
          { query_type: 'SELECT', avg_time_ms: 45, count: 8420 },
          { query_type: 'INSERT', avg_time_ms: 78, count: 3210 },
          { query_type: 'UPDATE', avg_time_ms: 92, count: 1890 },
          { query_type: 'DELETE', avg_time_ms: 65, count: 450 },
          { query_type: 'JOIN', avg_time_ms: 156, count: 2340 }
        ];
        chart = {
          labels: rows.map((r) => r.query_type),
          values: rows.map((r) => r.avg_time_ms)
        };
      } else if (/revenue|earnings|income|sales.*total/i.test(query)) {
        sql = 'SELECT MONTH(order_date) as month, SUM(amount) as revenue FROM orders WHERE YEAR(order_date) = YEAR(NOW()) GROUP BY month';
        columns = ['month', 'revenue'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        rows = months.map((month, i) => ({
          month,
          revenue: Math.floor(Math.random() * 50000 + 80000)
        }));
        chart = {
          labels: rows.map((r) => r.month),
          values: rows.map((r) => r.revenue)
        };
      } else if (/user.*growth|growth.*rate|trends/i.test(query)) {
        sql = 'SELECT DATE(created_at) as week, COUNT(*) as new_users FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK) GROUP BY WEEK(created_at)';
        columns = ['week', 'new_users', 'growth_rate'];
        rows = Array.from({ length: 12 }, (_, i) => {
          const newUsers = Math.floor(Math.random() * 200 + 150);
          const prevUsers = i > 0 ? rows[i-1].new_users : 150;
          return {
            week: `Week ${i + 1}`,
            new_users: newUsers,
            growth_rate: Math.round(((newUsers - prevUsers) / prevUsers) * 100)
          };
        });
        chart = {
          labels: rows.map((r) => r.week),
          values: rows.map((r) => r.new_users),
          secondaryValues: rows.map((r) => r.growth_rate)
        };
      } else {
        // Fallback default query
        sql = 'SELECT category, COUNT(*) as count FROM data GROUP BY category LIMIT 10';
        columns = ['category', 'count'];
        rows = [
          { category: 'Category A', count: 234 },
          { category: 'Category B', count: 189 },
          { category: 'Category C', count: 156 },
          { category: 'Category D', count: 142 },
          { category: 'Category E', count: 98 }
        ];
        chart = {
          labels: rows.map((r) => r.category),
          values: rows.map((r) => r.count)
        };
      }
    }

    res.json({ sql, columns, rows, chart, useRealData });
  } catch (error) {
    logger.error('Analytics NL Query error:', error);
    res.status(500).json({ 
      message: 'Error processing analytics query',
      error: error.message 
    });
  }
};

const getOverview = async (req, res) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthly_signups = [12, 18, 25, 22, 30, 28, 35, 40, 38, 45, 50, 48];
  const revenue_monthly = [1200, 1500, 1700, 1600, 1800, 2100, 2300, 2500, 2400, 2600, 2800, 3000];
  const regions = [
    { name: 'North', count: 420 },
    { name: 'South', count: 312 },
    { name: 'East', count: 210 },
    { name: 'West', count: 150 }
  ];

  const daily = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    values: Array.from({ length: 30 }, () => Math.floor(50 + Math.random() * 300))
  };

  res.json({
    users: 12420,
    active_users: 834,
    months,
    monthly_signups,
    revenue_monthly,
    regions,
    daily
  });
};

const queryMetric = async (req, res) => {
  const { metric } = req.body || {};

  if (!metric) return res.status(400).json({ message: 'metric required' });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (metric) {
    case 'monthly_signups':
      return res.json({ labels: months, values: [12, 18, 25, 22, 30, 28, 35, 40, 38, 45, 50, 48] });
    case 'daily_active':
      return res.json({
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        values: Array.from({ length: 30 }, () => Math.floor(50 + Math.random() * 300))
      });
    case 'region_breakdown':
      return res.json({ labels: ['North', 'South', 'East', 'West'], values: [420, 312, 210, 150] });
    case 'revenue_monthly':
      return res.json({ labels: months, values: [1200, 1500, 1700, 1600, 1800, 2100, 2300, 2500, 2400, 2600, 2800, 3000] });
    default:
      return res.status(400).json({ message: 'unknown metric' });
  }
};

module.exports = { getOverview, queryMetric, nlQuery };
