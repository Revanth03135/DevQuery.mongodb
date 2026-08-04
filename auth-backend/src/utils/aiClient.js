const logger = require('./logger');

class MissingGeminiKeyError extends Error {
  constructor(message = 'Gemini API key not configured') {
    super(message);
    this.name = 'MissingGeminiKeyError';
    this.code = 'AI_CONFIG_MISSING';
  }
}

class GeminiRequestError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'GeminiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_BASE = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

let fetchImpl = typeof fetch === 'function' ? fetch.bind(global) : null;

const ensureFetch = async () => {
  if (fetchImpl) {
    return fetchImpl;
  }

  const mod = await import('node-fetch');
  fetchImpl = mod.default;
  return fetchImpl;
};

const hasGeminiConfig = () => Boolean(GEMINI_API_KEY);

// Maximum number of retry attempts for transient Gemini errors
const GEMINI_MAX_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES, 10) || 3;
// Base delay in ms for exponential backoff (doubles on each attempt)
const GEMINI_RETRY_BASE_MS = parseInt(process.env.GEMINI_RETRY_BASE_MS, 10) || 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGemini = async ({
  prompt,
  systemPrompt,
  temperature = 0.1,
  topK = 32,
  topP = 0.9,
  maxOutputTokens = 2048,
  responseMimeType = 'application/json'
}) => {
  if (!hasGeminiConfig()) {
    throw new MissingGeminiKeyError();
  }

  const fetchFn = await ensureFetch();
  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Prepend system prompt to the user message for v1beta API compatibility
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }]
      }
    ]
  };

  let lastError;

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    let response;
    let payload;

    try {
      response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (error) {
      logger.error('Gemini API request failed to send:', error);
      throw new GeminiRequestError('Failed to reach Gemini API', undefined, { message: error.message });
    }

    try {
      payload = await response.json();
    } catch (error) {
      logger.error('Failed to parse Gemini response JSON:', error);
      throw new GeminiRequestError('Failed to parse Gemini response', response.status);
    }

    if (!response.ok) {
      const errorMessage = payload?.error?.message || `Gemini API request failed with status ${response.status}`;
      const err = new GeminiRequestError(errorMessage, response.status, payload);

      if (response.status === 401 || response.status === 403) {
        err.code = 'AI_AUTH_FAILED';
        throw err; // Auth errors are not retryable
      }

      if (response.status === 429) {
        err.code = 'AI_RATE_LIMIT';
        lastError = err;
        if (attempt < GEMINI_MAX_RETRIES) {
          const delay = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
          logger.warn(`Gemini rate-limited (429). Retrying in ${delay}ms (attempt ${attempt + 1}/${GEMINI_MAX_RETRIES})...`);
          await sleep(delay);
          continue;
        }
        throw err; // Exhausted retries
      }

      if (response.status >= 500) {
        lastError = err;
        if (attempt < GEMINI_MAX_RETRIES) {
          const delay = GEMINI_RETRY_BASE_MS * Math.pow(2, attempt);
          logger.warn(`Gemini server error (${response.status}). Retrying in ${delay}ms (attempt ${attempt + 1}/${GEMINI_MAX_RETRIES})...`);
          await sleep(delay);
          continue;
        }
      }

      throw err;
    }

    const parts = payload?.candidates?.[0]?.content?.parts || [];
    const combined = parts.map((part) => part.text || '').join('').trim();

    if (!combined) {
      throw new GeminiRequestError('Gemini API returned an empty response', response.status, payload);
    }

    return {
      text: combined,
      raw: payload,
      model: payload?.model || GEMINI_MODEL
    };
  }

  throw lastError || new GeminiRequestError('Gemini API call failed after retries');
};

const collectColumnSummary = (columns = [], maxColumns = 10) => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return 'no column details';
  }

  const limited = columns.slice(0, maxColumns).map((column) => {
    if (typeof column === 'string') {
      return column;
    }

    const name = column.name || column.column_name || column.columnName || column.field || 'unknown';
    const type = column.type || column.data_type || column.dataType || column.fieldType;
    return type ? `${name} (${type})` : name;
  });

  const suffix = columns.length > maxColumns ? ' …' : '';
  return `${limited.join(', ')}${suffix}`;
};

const summarizeSchemaForPrompt = (schema, { maxTables = 18, maxColumns = 10 } = {}) => {
  if (!schema) {
    return '';
  }

  const summaries = [];

  if (Array.isArray(schema)) {
    if (schema.length === 0) {
      return '';
    }

    const first = schema[0];

    if (first && first.columns) {
      schema.slice(0, maxTables).forEach((table) => {
        const tableName = table.table_name || table.name;
        summaries.push(`${tableName}: ${collectColumnSummary(table.columns, maxColumns)}`);
      });
    } else if (first && (first.table_name || first.tableName)) {
      const grouped = new Map();
      schema.forEach((row) => {
        const tableName = row.table_name || row.tableName || row.name;
        if (!grouped.has(tableName)) {
          grouped.set(tableName, []);
        }
        grouped.get(tableName).push({
          name: row.column_name || row.columnName || row.name,
          type: row.data_type || row.dataType || row.type,
          nullable: row.is_nullable || row.nullable
        });
      });

      Array.from(grouped.entries())
        .slice(0, maxTables)
        .forEach(([tableName, columns]) => {
          summaries.push(`${tableName}: ${collectColumnSummary(columns, maxColumns)}`);
        });
    } else {
      // Fallback: attempt to stringify objects
      schema.slice(0, maxTables).forEach((table, index) => {
        try {
          summaries.push(`Entry ${index + 1}: ${collectColumnSummary(Object.values(table || {}), maxColumns)}`);
        } catch (error) {
          summaries.push(`Entry ${index + 1}: [unavailable]`);
        }
      });
    }
  } else if (schema.collections && typeof schema.collections === 'object') {
    const collectionEntries = Object.entries(schema.collections).slice(0, maxTables);
    collectionEntries.forEach(([collectionName, meta]) => {
      summaries.push(`${collectionName}: ${collectColumnSummary(meta.fields, maxColumns)}`);
    });
  }

  return summaries.join('\n');
};

const sanitizeIntent = (intent) => {
  const allowed = new Set(['execute_query', 'generate_sql', 'reply_only', 'execute_write', 'require_confirmation']);
  if (!intent || typeof intent !== 'string') {
    return 'reply_only';
  }
  const normalized = intent.toLowerCase();
  return allowed.has(normalized) ? normalized : 'reply_only';
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (item === null || item === undefined) return null;
      return item.toString().trim();
    })
    .filter(Boolean);
};

// Maximum number of chatHistory messages to include in each prompt.
// Keeps Gemini token usage predictable; older context is trimmed from the start.
const CHAT_HISTORY_WINDOW = parseInt(process.env.CHAT_HISTORY_WINDOW, 10) || 12;

const interpretChatIntent = async ({ message, schema, connection = {}, runQuery = true, chatHistory = [], queryHistory = [], savedQueries = [] }) => {
  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) {
    return {
      intent: 'reply_only',
      message: 'I need a question to help with.',
      explanation: null,
      sql: null,
      cautions: []
    };
  }

  // Issue 7 fix: cap history to last N messages to avoid oversized prompts
  const cappedHistory = Array.isArray(chatHistory) ? chatHistory.slice(-CHAT_HISTORY_WINDOW) : [];

  const schemaSummary = summarizeSchemaForPrompt(schema);
  const isMongoDB = connection.type === 'mongodb';

  // Issue 4 fix: debug logging gated behind non-production env only
  if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_SCHEMA) {
    logger.info('[DEBUG] Schema passed to interpretChatIntent:', {
      schemaExists: !!schema,
      schemaType: typeof schema,
      isArray: Array.isArray(schema),
      schemaLength: Array.isArray(schema) ? schema.length : 'N/A',
      schemaSummaryLength: schemaSummary.length,
      schemaSummaryPreview: schemaSummary.substring(0, 200),
      databaseType: connection.type
    });
  }
  
  const connectionDetails = [
    `Connection available: ${connection.connected ? 'true' : 'false'}`,
    connection.type ? `Database type: ${connection.type}` : null,
    connection.database ? `Database name: ${connection.database}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = isMongoDB ?
    [
      'You are DevQuery, a MongoDB assistant inside a developer tool.',
      'You receive user questions about their MongoDB database and must decide whether to generate MongoDB queries, execute them, or reply conversationally.',
      'You must ALWAYS return valid JSON (no Markdown).',
      'Generate MongoDB shell commands (e.g., db.collection.find(), db.collection.aggregate()) or JSON format queries.',
      'For simple queries use find(), for analytics/aggregation use aggregate() with pipelines.',
      'Use .limit() to restrict results when query could return many documents.',
      'Only set intent "execute_query" when you are confident the query is safe and the user provided enough detail.',
      'If the schema is missing or incomplete, explain assumptions and prefer "generate_sql" (we use "sql" field for MongoDB queries too).',
      'If the user asks non-database questions, answer conversationally with intent "reply_only".',
      '',
      '🔥 CRITICAL: CONVERSATION MEMORY - YOU MUST USE CHAT HISTORY!',
      '- You HAVE FULL ACCESS to previous conversation history below',
      '- When user asks "what did I ask before?" or "last time" - SEARCH THE HISTORY and tell them exactly what they asked',
      '- When user says "that collection", "above query", "previous question" - REFERENCE the specific message from history',
      '- If user asks about something from earlier in conversation, cite the exact question/answer from history',
      '- NEVER say "I don\'t have access to history" - you DO have it in the "Previous conversation" section below',
      '',
      'MongoDB Query Examples:',
      '- Find all: db.users.find({})',
      '- Find with filter: db.users.find({age: {$gt: 18}})',
      '- Aggregation: db.orders.aggregate([{$group: {_id: "$status", count: {$sum: 1}}}])',
      '- Count: db.products.countDocuments({category: "electronics"})',
      '',
      'IMPORTANT: Use MongoDB operators: $gt, $lt, $gte, $lte, $eq, $ne, $in, $nin, $and, $or, etc.',
      'For aggregation: $match, $group, $sort, $limit, $project, $unwind, $lookup, etc.'
    ].join('\n')
    :
    [
      'You are DevQuery, an SQL assistant inside a developer tool.',
      'You receive user questions about their database schema and must decide whether to generate SQL, execute it, or reply conversationally.',
      'You must ALWAYS return valid JSON (no Markdown).',
      'You can handle both READ (SELECT) and WRITE (INSERT, UPDATE, DELETE) operations.',
      'Prefer adding LIMIT clauses when the query could return many rows.',
      'Only set intent "execute_query" or "execute_write" when you are confident the query is safe and the user provided enough detail.',
      'For write operations, ALWAYS use "require_confirmation" to ask user approval first.',
      'If the schema is missing or incomplete, explain assumptions and prefer "generate_sql" unless the intent is clear.',
      'If the user asks non-database questions, answer conversationally with intent "reply_only".',
      '',
      '🔥 CRITICAL: CONVERSATION MEMORY - YOU MUST USE CHAT HISTORY!',
      '- You HAVE FULL ACCESS to previous conversation history below',
      '- When user asks "what did I ask before?" or "last time" - SEARCH THE HISTORY and tell them exactly what they asked',
      '- When user says "that table", "above query", "previous question" - REFERENCE the specific message from history',
      '- If user asks about something from earlier in conversation, cite the exact question/answer from history',
      '- NEVER say "I don\'t have access to history" - you DO have it in the "Previous conversation" section below',
      '- Example: User asks "what did I ask last time?" → You respond: "You asked me \'[exact previous question]\'"',
      '',
      'IMPORTANT WHITELIST RULES:',
      '- The schema below shows ONLY the tables you have access to (whitelisted tables)',
      '- If a user asks about a table not in the schema, politely inform them you can only access the tables listed in your schema',
      '- Do NOT try to query tables that are not shown in your schema - they are restricted',
      '- When listing available tables, only mention tables from your schema',
      '',
      'IMPORTANT RULES FOR COLUMN QUERIES:',
      '- When user asks about a column (type, data type, format, etc.), extract the exact column name and table name',
      '- Look at the schema overview below to find the exact data type',
      '- ALWAYS respond with the actual column type from the schema',
      '- Do not say "schema is unavailable" if schema is provided below',
      '- If user mentions a column name, search the schema to find which table it belongs to',
      '- Respond with the EXACT type shown in the schema (e.g., "varchar", "bigint", "text", etc.)',
      '- Include nullable status (YES/NO) in your response',
      '',
      'IMPORTANT RULES FOR INSERT OPERATIONS:',
      '- When user wants to add/create/insert data, carefully examine the table schema',
      '- Match user provided values to the correct columns based on schema',
      '- Handle data type conversions properly (text needs quotes, numbers do not)',
      '- If user provides invalid data format (e.g., multiple @ in email), politely explain the error',
      '- For INSERT operations, ALWAYS use "require_confirmation" intent',
      '- Generate complete INSERT statements with proper column names and value formats',
      '- If required columns are missing, ask user to provide them instead of assuming values',
      '- Use proper escaping for string values (escape single quotes)'
    ].join('\n');

  const schemaSection = schemaSummary
    ? `Database Schema (${isMongoDB ? 'Collections and Fields' : 'Tables and Columns'}):\n${schemaSummary}`
    : 'Database Schema: No schema available - the database may be empty or connection may not have schema visibility.';

  const runCapability = runQuery && connection.connected ? 'true' : 'false';

  // Format chat history for context - Make it VERY prominent
  const chatHistorySection = cappedHistory.length > 0
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 CONVERSATION HISTORY (Last ${cappedHistory.length} messages):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cappedHistory
  .map((msg, idx) => {
    const role = msg.role === 'assistant' ? '🤖 Assistant' : '👤 User';
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    const preview = content.length > 300 ? content.substring(0, 300) + '...' : content;
    return `[Message ${idx + 1}] ${role}:\n${preview}`;
  })
  .join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  USE THE ABOVE HISTORY to answer questions about "what I asked before", "last time", etc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    : '\n(No previous conversation history)\n';

  // Format query history for context
  const queryHistorySection = Array.isArray(queryHistory) && queryHistory.length > 0
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 QUERY EXECUTION HISTORY (Last ${queryHistory.length} executed queries):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${queryHistory
  .map((q, idx) => {
    const executedTime = q.executedAt ? new Date(q.executedAt).toLocaleString() : 'N/A';
    const statusIcon = q.status === 'success' ? '✅' : '❌';
    return `[Query ${idx + 1}] ${statusIcon} ${q.status.toUpperCase()} - ${executedTime}
SQL: ${q.sql}
${q.explanation ? `Explanation: ${q.explanation}` : ''}
${q.status === 'success' ? `Results: ${q.resultCount || 0} rows in ${q.executionTime || 0}ms` : ''}
${q.errorMessage ? `Error: ${q.errorMessage}` : ''}`;
  })
  .join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 USE THIS HISTORY when user asks "show me my recent queries", "what queries failed?", etc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    : '\n(No query execution history available)\n';

  // Format saved queries for context
  const savedQueriesSection = Array.isArray(savedQueries) && savedQueries.length > 0
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 SAVED QUERIES (${savedQueries.length} bookmarked queries):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${savedQueries
  .map((q, idx) => {
    const createdTime = q.createdAt ? new Date(q.createdAt).toLocaleString() : 'N/A';
    return `[Saved Query ${idx + 1}] 📌 ${q.name || 'Unnamed Query'} - ${createdTime}
SQL: ${q.sql}
${q.explanation ? `Explanation: ${q.explanation}` : ''}`;
  })
  .join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 USE THESE when user asks "show my saved queries", "run my saved query about X", etc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
    : '\n(No saved queries available)\n';

  const userPrompt = [
    connectionDetails,
    schemaSection,
    chatHistorySection,
    queryHistorySection,
    savedQueriesSection,
    `Assistant capabilities: { canExecuteQuery: ${runCapability}, canExecuteWrite: ${runCapability} }`,
    '',
    '🎯 SPECIAL INSTRUCTIONS FOR MEMORY-BASED QUERIES:',
    '- If user asks "what did I ask?" → Set intent: "reply_only", extract their question from CONVERSATION HISTORY',
    '- If user asks "re-run that query" → Set intent: "execute_query", copy the SQL from QUERY HISTORY',
    '- If user asks "what was the last query?" → Set intent: "reply_only", quote the SQL from QUERY HISTORY',
    '- If user asks "show my saved queries" → Set intent: "reply_only", list queries from SAVED QUERIES section',
    '- If user asks "run my saved query about X" → Set intent: "execute_query", find matching SQL in SAVED QUERIES',
    '- If user asks "what queries failed?" → Set intent: "reply_only", filter failed queries from QUERY HISTORY',
    '- If user asks "show recent queries" → Set intent: "reply_only", list queries from QUERY HISTORY',
    '- Always check CONVERSATION HISTORY, QUERY HISTORY, and SAVED QUERIES FIRST before saying you don\'t have information',
    '',
    'Return a JSON object with the following shape:',
    '{',
    '  "intent": "execute_query" | "generate_sql" | "execute_write" | "require_confirmation" | "reply_only",',
    '  "assistant_message": "plain text response",',
    '  "sql": "SQL string or empty",',
    '  "explanation": "describe what the SQL does",',
    '  "operation_type": "read" | "write" or null',
    '  "affected_table": "table name or null",',
    '  "affected_columns": ["column names"] or null,',
    '  "cautions": ["list of warnings"],',
    '  "confidence": "low" | "medium" | "high",',
    '  "follow_up": ["optional follow up suggestions"]',
    '}',
    'User question:',
    trimmedMessage,
    'Remember: respond with JSON only. No Markdown, no commentary.'
  ].filter(Boolean).join('\n\n');

  const response = await callGemini({ prompt: userPrompt, systemPrompt });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    logger.error('Gemini returned invalid JSON for chat interpretation:', { raw: response.text });
    throw new GeminiRequestError('Gemini returned invalid JSON for chat interpretation', undefined, { raw: response.text });
  }

  const intent = sanitizeIntent(parsed.intent);
  const normalizedIntent = runQuery && connection.connected ? intent : intent === 'execute_query' || intent === 'execute_write' ? 'generate_sql' : intent;
  const sql = typeof parsed.sql === 'string' ? parsed.sql.trim() : '';
  const assistantMessage = typeof parsed.assistant_message === 'string' ? parsed.assistant_message.trim() : '';
  const explanation = typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '';

  return {
    intent: normalizedIntent,
    message: assistantMessage || explanation || 'Here is what I found.',
    sql,
    explanation,
    operationType: parsed.operation_type || null,
    affectedTable: parsed.affected_table || null,
    affectedColumns: normalizeStringArray(parsed.affected_columns),
    cautions: normalizeStringArray(parsed.cautions),
    confidence: parsed.confidence || null,
    followUp: normalizeStringArray(parsed.follow_up),
    provider: 'gemini',
    model: response.model || GEMINI_MODEL
  };
};

const generateSqlFromDescription = async ({ description, schema, connection = {}, includeExplanation = true }) => {
  const trimmedDescription = (description || '').trim();
  if (!trimmedDescription) {
    throw new Error('Description is required to generate SQL');
  }

  const schemaSummary = summarizeSchemaForPrompt(schema);
  const isMongoDB = connection.type === 'mongodb';

  const systemPrompt = isMongoDB ?
    [
      'You are DevQuery, an expert MongoDB query generator.',
      'Produce safe, read-only MongoDB queries that match the user description.',
      'Only output find(), aggregate(), or countDocuments() queries. Never mutate data.',
      'Use aggregation pipeline for complex queries with grouping, sorting, or calculations.',
      'Use simple find() for basic queries.',
      'Return JSON only. No Markdown.'
    ].join('\n')
    :
    [
      'You are DevQuery, an expert SQL generator.',
      'Produce safe, read-only SQL queries that match the user description.',
      'Only output SELECT or WITH queries. Never mutate data.',
      'Prefer including LIMIT when the request could return many rows.',
      'Return JSON only. No Markdown.'
    ].join('\n');

  const userPrompt = isMongoDB ?
    [
      `Database type: MongoDB`,
      connection.database ? `Database name: ${connection.database}` : null,
      schemaSummary ? `Collections and Fields (partial):\n${schemaSummary}` : 'Schema overview: unavailable',
      `Task: Generate a MongoDB query for the following description: ${trimmedDescription}`,
      'Examples:',
      '- Simple find: db.users.find({age: {$gt: 18}}).limit(10)',
      '- Aggregation: db.orders.aggregate([{$group: {_id: "$status", count: {$sum: 1}}}, {$sort: {count: -1}}])',
      '- Count: db.products.countDocuments({category: "electronics"})',
      'Return a JSON object with keys { sql, explanation, cautions, confidence, estimated_row_count }.',
      'IMPORTANT: Put the complete MongoDB shell command in the "sql" field.'
    ]
      .filter(Boolean)
      .join('\n\n')
    :
    [
      connection.type ? `Database type: ${connection.type}` : null,
      connection.database ? `Database name: ${connection.database}` : null,
      schemaSummary ? `Schema overview (partial):\n${schemaSummary}` : 'Schema overview: unavailable',
      `Task: Generate a SQL query for the following description: ${trimmedDescription}`,
      'Return a JSON object with keys { sql, explanation, cautions, confidence, estimated_row_count }.'
    ]
      .filter(Boolean)
      .join('\n\n');

  const response = await callGemini({ prompt: userPrompt, systemPrompt });

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    logger.error('Gemini returned invalid JSON for SQL generation:', { raw: response.text });
    throw new GeminiRequestError('Gemini returned invalid JSON for SQL generation', undefined, { raw: response.text });
  }

  const sql = typeof parsed.sql === 'string' ? parsed.sql.trim() : '';
  if (!sql) {
    throw new GeminiRequestError('Gemini did not return SQL', undefined, { parsed });
  }

  return {
    sql,
    explanation: includeExplanation ? (parsed.explanation || '').trim() : '',
    cautions: normalizeStringArray(parsed.cautions),
    confidence: parsed.confidence || null,
    estimatedRows: parsed.estimated_row_count || parsed.estimatedRows || null,
    provider: 'gemini',
    model: response.model || GEMINI_MODEL
  };
};

/**
 * Check if SQL is a write operation (INSERT, UPDATE, DELETE)
 */
const isWriteOperation = (sql) => {
  if (!sql || typeof sql !== 'string') {
    return false;
  }
  const trimmed = sql.trim();
  const writePattern = /^(insert|update|delete)\b/i;
  return writePattern.test(trimmed);
};

/**
 * Check if SQL is a read operation (SELECT, WITH)
 */
const isReadOperation = (sql) => {
  if (!sql || typeof sql !== 'string') {
    return false;
  }
  const trimmed = sql.trim();
  const readPattern = /^(select|with)\b/i;
  return readPattern.test(trimmed);
};

/**
 * Extract table name from SQL query
 * Works for basic INSERT, UPDATE, DELETE, SELECT statements
 */
const extractTableFromSql = (sql) => {
  if (!sql || typeof sql !== 'string') {
    return null;
  }
  
  const trimmed = sql.trim();
  
  // INSERT INTO table_name
  const insertMatch = /^insert\s+into\s+[`"']?(\w+)[`"']?/i.exec(trimmed);
  if (insertMatch) return insertMatch[1];
  
  // UPDATE table_name
  const updateMatch = /^update\s+[`"']?(\w+)[`"']?/i.exec(trimmed);
  if (updateMatch) return updateMatch[1];
  
  // DELETE FROM table_name
  const deleteMatch = /^delete\s+from\s+[`"']?(\w+)[`"']?/i.exec(trimmed);
  if (deleteMatch) return deleteMatch[1];
  
  // SELECT from table_name (simplified)
  const selectMatch = /from\s+[`"']?(\w+)[`"']?/i.exec(trimmed);
  if (selectMatch) return selectMatch[1];
  
  return null;
};

/**
 * Extract column names from SQL query
 * Simplified extraction - gets column names from SELECT and INSERT/UPDATE
 */
const extractColumnsFromSql = (sql) => {
  if (!sql || typeof sql !== 'string') {
    return [];
  }
  
  const columns = [];
  const trimmed = sql.trim();
  
  // For INSERT: INSERT INTO table (col1, col2, ...) VALUES
  const insertMatch = /^insert\s+into\s+\w+\s*\((.*?)\)\s*values/i.exec(trimmed);
  if (insertMatch) {
    return insertMatch[1]
      .split(',')
      .map(col => col.trim().replace(/[`"']/g, ''))
      .filter(Boolean);
  }
  
  // For UPDATE: UPDATE table SET col1=..., col2=...
  const updateMatch = /^update\s+\w+\s+set\s+(.*?)(?:where|$)/i.exec(trimmed);
  if (updateMatch) {
    return updateMatch[1]
      .split(',')
      .map(part => part.split('=')[0].trim().replace(/[`"']/g, ''))
      .filter(Boolean);
  }
  
  // For SELECT: SELECT col1, col2, ...
  const selectMatch = /^select\s+(.*?)\s+from/i.exec(trimmed);
  if (selectMatch) {
    const columnPart = selectMatch[1];
    if (columnPart.trim() === '*') {
      return ['*'];
    }
    return columnPart
      .split(',')
      .map(col => col.trim().split(/\s+as\s+/i)[0].replace(/[`"']/g, ''))
      .filter(Boolean);
  }
  
  return columns;
};

/**
 * Generate analytics query and chart specification using Gemini AI
 * @param {string} naturalLanguageQuery - User's analytics question
 * @param {Array} tables - Database schema tables
 * @param {string} dbType - Database type (postgresql, mysql, etc.)
 * @returns {Promise<{sql: string, chartType: string, labels: string, values: string, explanation: string}>}
 */
const generateAnalyticsQuery = async (naturalLanguageQuery, tables = [], dbType = 'postgresql') => {
  if (!hasGeminiConfig()) {
    throw new MissingGeminiKeyError();
  }

  const schemaContext = summarizeSchemaForPrompt(tables);
  const isMongoDB = dbType === 'mongodb';

  const systemPrompt = isMongoDB ? 
    `You are an expert data analyst and MongoDB specialist. 
Your task is to convert natural language analytics questions into executable MongoDB queries and specify appropriate chart visualizations.

Database Type: MongoDB
Collections and Fields:
${schemaContext}

IMPORTANT RULES:
1. Generate ONLY valid MongoDB shell commands or aggregation pipelines
2. Use aggregation pipeline for complex analytics: $group, $sort, $limit, $project
3. Use simple find() queries for basic data retrieval
4. Limit results to reasonable amounts (10-20 for charts)
5. Return data in format suitable for charts (labels and numeric values)
6. Use $match for filtering, $group for aggregation
7. Choose the most appropriate chart type based on the data

MongoDB Query Formats:
- Simple find: db.collection.find({query}, {projection}).limit(10)
- Aggregation: db.collection.aggregate([{$group: {...}}, {$sort: {...}}, {$limit: 10}])
- Count by field: db.collection.aggregate([{$group: {_id: "$field", count: {$sum: 1}}}, {$sort: {count: -1}}, {$limit: 10}])

Chart Types Available:
- line: For trends over time
- bar: For comparing categories
- pie: For showing composition/distribution
- area: For cumulative trends

Response Format (JSON):
{
  "sql": "db.products.aggregate([{$group: {_id: '$category', count: {$sum: 1}}}, {$sort: {count: -1}}, {$limit: 10}])",
  "chartType": "bar",
  "explanation": "This aggregation counts products by category and is best visualized as a bar chart",
  "labelColumn": "_id",
  "valueColumn": "count",
  "suggestedTitle": "Products by Category"
}

CRITICAL: The "sql" field should contain the complete MongoDB shell command as shown above.`
    :
    `You are an expert data analyst and SQL specialist. 
Your task is to convert natural language analytics questions into executable SQL queries and specify appropriate chart visualizations.

Database Type: ${dbType}
Schema Context:
${schemaContext}

IMPORTANT RULES:
1. Generate ONLY valid SQL that will return data for visualization
2. Use aggregation functions (COUNT, SUM, AVG, MAX, MIN) when appropriate
3. Include GROUP BY for categorical analysis
4. Limit results to reasonable amounts (TOP 10-20 for charts)
5. Return data in format suitable for charts (labels and numeric values)
6. Use date functions for time-series analysis
7. Choose the most appropriate chart type based on the data

Chart Types Available:
- line: For trends over time
- bar: For comparing categories
- pie: For showing composition/distribution
- area: For cumulative trends
- scatter: For correlation analysis

Response Format (JSON):
{
  "sql": "SELECT category, COUNT(*) as count FROM table GROUP BY category ORDER BY count DESC LIMIT 10",
  "chartType": "bar",
  "explanation": "This query counts records by category and is best visualized as a bar chart for comparison",
  "labelColumn": "category",
  "valueColumn": "count",
  "suggestedTitle": "Distribution by Category"
}`;

  const userPrompt = `Analytics Question: "${naturalLanguageQuery}"

Generate an appropriate ${isMongoDB ? 'MongoDB query' : 'SQL query'} and chart specification for this analytics question.
Consider the database schema and choose the best visualization method.

Return ONLY valid JSON with sql, chartType, explanation, labelColumn, valueColumn, and suggestedTitle.`;

  try {
    const response = await callGemini({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json'
    });

    let result;
    try {
      result = JSON.parse(response);
    } catch (parseError) {
      logger.error('Failed to parse Gemini analytics response as JSON:', parseError);
      throw new Error('AI returned invalid JSON response');
    }

    // Validate required fields
    if (!result.sql || !result.chartType) {
      throw new Error('AI response missing required fields (sql or chartType)');
    }

    logger.info(`Generated analytics query for: "${naturalLanguageQuery}" (${dbType})`);
    return result;
  } catch (error) {
    logger.error('Error generating analytics query with Gemini:', error);
    throw error;
  }
};

module.exports = {
  hasGeminiConfig,
  callGemini,
  summarizeSchemaForPrompt,
  interpretChatIntent,
  generateSqlFromDescription,
  generateAnalyticsQuery,
  isWriteOperation,
  isReadOperation,
  extractTableFromSql,
  extractColumnsFromSql,
  MissingGeminiKeyError,
  GeminiRequestError
};
