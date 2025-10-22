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

  let response;
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

  let payload;
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
    } else if (response.status === 429) {
      err.code = 'AI_RATE_LIMIT';
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

const interpretChatIntent = async ({ message, schema, connection = {}, runQuery = true }) => {
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

  const schemaSummary = summarizeSchemaForPrompt(schema);
  
  // DEBUG: Log schema summary
  if (process.env.DEBUG_SCHEMA) {
    console.log('[DEBUG] Schema passed to interpretChatIntent:', {
      schemaExists: !!schema,
      schemaType: typeof schema,
      isArray: Array.isArray(schema),
      schemaLength: Array.isArray(schema) ? schema.length : 'N/A',
      schemaSummaryLength: schemaSummary.length,
      schemaSummaryPreview: schemaSummary.substring(0, 200)
    });
  }
  
  const connectionDetails = [
    `Connection available: ${connection.connected ? 'true' : 'false'}`,
    connection.type ? `Database type: ${connection.type}` : null,
    connection.database ? `Database name: ${connection.database}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const systemPrompt = [
    'You are DevQuery, an SQL assistant inside a developer tool.',
    'You receive user questions about their database schema and must decide whether to generate SQL, execute it, or reply conversationally.',
    'You must ALWAYS return valid JSON (no Markdown).',
    'You can handle both READ (SELECT) and WRITE (INSERT, UPDATE, DELETE) operations.',
    'Prefer adding LIMIT clauses when the query could return many rows.',
    'Only set intent "execute_query" or "execute_write" when you are confident the query is safe and the user provided enough detail.',
    'For write operations, prefer "require_confirmation" to ask user approval first.',
    'If the schema is missing or incomplete, explain assumptions and prefer "generate_sql" unless the intent is clear.',
    'If the user asks non-database questions, answer conversationally with intent "reply_only".',
    '',
    'IMPORTANT RULES FOR COLUMN QUERIES:',
    '- When user asks about a column (type, data type, format, etc.), extract the exact column name and table name',
    '- Look at the schema overview below to find the exact data type',
    '- ALWAYS respond with the actual column type from the schema',
    '- Do not say "schema is unavailable" if schema is provided below',
    '- If user mentions a column name, search the schema to find which table it belongs to',
    '- Respond with the EXACT type shown in the schema (e.g., "varchar", "bigint", "text", etc.)',
    '- Include nullable status (YES/NO) in your response'
  ].join('\n');

  const schemaSection = schemaSummary
    ? `Database Schema (Tables and Columns):\n${schemaSummary}`
    : 'Database Schema: No schema available - the database may be empty or connection may not have schema visibility.';

  const runCapability = runQuery && connection.connected ? 'true' : 'false';

  const userPrompt = [
    connectionDetails,
    schemaSection,
    `Assistant capabilities: { canExecuteQuery: ${runCapability}, canExecuteWrite: ${runCapability} }`,
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
  ].join('\n\n');

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

  const systemPrompt = [
    'You are DevQuery, an expert SQL generator.',
    'Produce safe, read-only SQL queries that match the user description.',
    'Only output SELECT or WITH queries. Never mutate data.',
    'Prefer including LIMIT when the request could return many rows.',
    'Return JSON only. No Markdown.'
  ].join('\n');

  const userPrompt = [
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

module.exports = {
  hasGeminiConfig,
  callGemini,
  summarizeSchemaForPrompt,
  interpretChatIntent,
  generateSqlFromDescription,
  isWriteOperation,
  isReadOperation,
  extractTableFromSql,
  extractColumnsFromSql,
  MissingGeminiKeyError,
  GeminiRequestError
};
