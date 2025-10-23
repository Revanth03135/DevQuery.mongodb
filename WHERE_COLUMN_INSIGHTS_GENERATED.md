# 🔍 Where Generated Insights for Columns Are Processed

**Overview:** Trace of how column insights are generated and where the code is located

---

## 📍 Complete Flow & File Locations

### 1️⃣ Frontend - User Interaction
**File:** `frontend/src/components/Dashboard.jsx`  
**Lines:** 916-937

```javascript
const handleGenerateColumnInsight = async (tableName, column) => {
  if (!dbConnection?.connectionId || !tableName || !column) return;
  
  try {
    setLoading(true);
    
    // Send to backend
    const response = await api.post(
      `/api/database/connections/${dbConnection.connectionId}/generate-sql`,
      {
        description: `Provide insights or useful query for column ${column.name} in table ${tableName}.`
      }
    );
    
    // Handle response
    if (response.data?.success) {
      const { sql, explanation } = response.data.data;
      setGeneratedSQL(sql);
      setExplanation(explanation || `Insight for ${tableName}.${column.name}`);
      setActiveTab('sql');
      showNotification(`Insight generated for ${column.name}`, 'success');
    }
  } catch (error) {
    // Error handling
    showNotification('Failed to generate column insight.', 'error');
  }
};
```

**What happens:**
- User clicks 💡 lightbulb on column
- Function captures: tableName, column info
- Sends POST request with description

---

### 2️⃣ Backend Route
**File:** `auth-backend/src/routes/databaseRoutes.js`  
**Line:** 18

```javascript
router.post('/connections/:connectionId/generate-sql', validateNLQuery, DatabaseController.generateSQL);
```

**Route Details:**
- **Endpoint:** `POST /api/database/connections/{connectionId}/generate-sql`
- **Middleware:** `validateNLQuery` (validates natural language input)
- **Controller:** `DatabaseController.generateSQL`

---

### 3️⃣ Backend Controller
**File:** `auth-backend/src/controllers/databaseController.js`  
**Lines:** 233-293

```javascript
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

    // Get connection status
    const connectionStatus = dbManager.getConnectionStatus(connectionId);
    
    // Get schema
    let schema = {};
    try {
      const schemaResult = await dbManager.getSchema(connectionId);
      schema = schemaResult.schema;
    } catch (error) {
      logger.warn('Schema retrieval failed for SQL generation:', error.message);
    }

    // Call AI to generate SQL
    let sqlResult;
    try {
      sqlResult = await generateSqlFromDescription({
        description,           // "Provide insights for column email..."
        schema,                // Database schema
        connection: connectionStatus
      });
    } catch (error) {
      // Fallback to mock SQL generation
      sqlResult = DatabaseController.generateMockSQL(description, schema, tableContext);
    }

    // Sanitize and validate
    const sanitizedSql = DatabaseController.sanitizeSqlCandidate(sqlResult?.sql);
    const isSafe = DatabaseController.isSafeReadOnlySql(sanitizedSql);

    // Return response
    const responsePayload = {
      sql: sanitizedSql,
      explanation: sqlResult.explanation || 'SQL generated successfully.',
      confidence: sqlResult.confidence || null,
    };

    return res.json({
      success: true,
      data: responsePayload
    });
  } catch (error) {
    // Error response
  }
}
```

**What happens:**
- Extract connectionId from URL params
- Extract description from request body
- Get database connection status
- Get schema information
- Call AI client to generate SQL
- Sanitize and validate SQL
- Return SQL + explanation to frontend

---

### 4️⃣ AI Client - Core Logic
**File:** `auth-backend/src/utils/aiClient.js`  
**Lines:** 340-391

```javascript
const generateSqlFromDescription = async ({ 
  description,           // Natural language description
  schema,               // Database schema
  connection = {},      // Connection info
  includeExplanation = true
}) => {
  const trimmedDescription = (description || '').trim();
  
  if (!trimmedDescription) {
    throw new Error('Description is required to generate SQL');
  }

  // Summarize schema for prompt
  const schemaSummary = summarizeSchemaForPrompt(schema);

  // System prompt - instructs Gemini to be an SQL generator
  const systemPrompt = [
    'You are DevQuery, an expert SQL generator.',
    'Produce safe, read-only SQL queries that match the user description.',
    'Only output SELECT or WITH queries. Never mutate data.',
    'Prefer including LIMIT when the request could return many rows.',
    'Return JSON only. No Markdown.'
  ].join('\n');

  // User prompt - contains context and task
  const userPrompt = [
    connection.type ? `Database type: ${connection.type}` : null,
    connection.database ? `Database name: ${connection.database}` : null,
    schemaSummary ? `Schema overview (partial):\n${schemaSummary}` : 'Schema overview: unavailable',
    `Task: Generate a SQL query for the following description: ${trimmedDescription}`,
    'Return a JSON object with keys { sql, explanation, cautions, confidence, estimated_row_count }.'
  ]
    .filter(Boolean)
    .join('\n\n');

  // Call Gemini API
  const response = await callGemini({ prompt: userPrompt, systemPrompt });

  // Parse response
  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch (error) {
    throw new GeminiRequestError('Gemini returned invalid JSON for SQL generation');
  }

  const sql = typeof parsed.sql === 'string' ? parsed.sql.trim() : '';
  
  if (!sql) {
    throw new GeminiRequestError('Gemini did not return SQL');
  }

  return {
    sql,
    explanation: includeExplanation ? (parsed.explanation || '').trim() : '',
    cautions: normalizeStringArray(parsed.cautions),
    confidence: parsed.confidence || null,
    estimatedRows: parsed.estimated_row_count || null,
    provider: 'gemini',
    model: response.model || GEMINI_MODEL
  };
};
```

**What happens:**
- Receive description and schema
- Build system prompt (instructions for Gemini)
- Build user prompt (context + task)
- Call Gemini API with prompts
- Parse JSON response from Gemini
- Extract SQL, explanation, confidence
- Return structured result

---

### 5️⃣ Gemini API Call
**File:** `auth-backend/src/utils/aiClient.js`  
**Lines:** 30-100

```javascript
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

  // Combine system prompt with user prompt
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: fullPrompt }]
      }
    ]
  };

  // Make API request
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // Parse response
  const payload = await response.json();

  // Extract text from Gemini response
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const combined = parts.map((part) => part.text || '').join('').trim();

  if (!combined) {
    throw new GeminiRequestError('Gemini API returned an empty response');
  }

  return {
    text: combined,  // The generated SQL + explanation in JSON
    raw: payload,
    model: payload?.model || GEMINI_MODEL
  };
};
```

**What happens:**
- Validates GEMINI_API_KEY exists
- Builds request body with system + user prompts
- Makes POST request to Gemini API
- Receives response with generated text
- Extracts and returns text

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Dashboard.jsx)                                    │
├─────────────────────────────────────────────────────────────┤
│ User clicks 💡 on email column                              │
│ └─ handleGenerateColumnInsight(tableName, column)           │
│    └─ POST /api/database/connections/{id}/generate-sql      │
│       └─ { description: "Provide insights..." }             │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend Route (databaseRoutes.js)                           │
├─────────────────────────────────────────────────────────────┤
│ router.post('/generate-sql', validateNLQuery, ...)          │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend Controller (databaseController.js)                  │
├─────────────────────────────────────────────────────────────┤
│ static async generateSQL(req, res) {                        │
│   - Extract connectionId, description                       │
│   - Get connection status                                   │
│   - Get database schema                                     │
│   - Call generateSqlFromDescription()                       │
│   - Sanitize and validate SQL                               │
│   - Return response                                         │
│ }                                                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ AI Client (aiClient.js)                                     │
├─────────────────────────────────────────────────────────────┤
│ generateSqlFromDescription() {                              │
│   - Build system prompt (instructions)                      │
│   - Build user prompt (schema + task)                       │
│   - Call callGemini()                                       │
│   - Parse JSON response                                     │
│   - Return { sql, explanation, confidence }                 │
│ }                                                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Gemini API (External)                                       │
├─────────────────────────────────────────────────────────────┤
│ callGemini() {                                              │
│   - Validate API key                                        │
│   - Build HTTP request                                      │
│   - POST to Gemini: "Generate SQL for email column"         │
│   - Receive JSON response with SQL                          │
│   - Return parsed response                                  │
│ }                                                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend Response (databaseController.js)                    │
├─────────────────────────────────────────────────────────────┤
│ {                                                            │
│   success: true,                                            │
│   data: {                                                   │
│     sql: "SELECT email, COUNT(*) ...",                      │
│     explanation: "Find duplicate emails..."                 │
│   }                                                          │
│ }                                                            │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend Response Handler (Dashboard.jsx)                   │
├─────────────────────────────────────────────────────────────┤
│ - setGeneratedSQL(sql)                                      │
│ - setExplanation(explanation)                               │
│ - setActiveTab('sql')                                       │
│ - showNotification("Insight generated...")                  │
│                                                              │
│ User sees SQL & explanation in UI                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
DevQuery.mongodb/
├── frontend/
│   └── src/
│       └── components/
│           └── Dashboard.jsx (Line 916)
│               └── handleGenerateColumnInsight()
│
└── auth-backend/
    └── src/
        ├── routes/
        │   └── databaseRoutes.js (Line 18)
        │       └── POST /connections/:connectionId/generate-sql
        │
        ├── controllers/
        │   └── databaseController.js (Line 233)
        │       └── static async generateSQL(req, res)
        │
        └── utils/
            └── aiClient.js
                ├── Line 340: generateSqlFromDescription()
                └── Line 30: callGemini()
```

---

## 🔄 Request/Response Example

### Request to Backend
```javascript
POST /api/database/connections/conn-123/generate-sql

Body:
{
  "description": "Provide insights or useful query for column email in table users."
}
```

### Backend Processing
```javascript
1. Extract: connectionId = "conn-123"
2. Extract: description = "Provide insights..."
3. Get schema for database
4. Call Gemini API with:
   - System: "You are an SQL generator..."
   - User: "Schema: {table definitions}...
            Task: Generate query for: Provide insights for column email..."
5. Receive from Gemini:
   {
     "sql": "SELECT email, COUNT(*) as duplicates FROM users GROUP BY email HAVING count > 1",
     "explanation": "This query identifies duplicate email addresses...",
     "confidence": "high"
   }
6. Sanitize SQL
7. Return response
```

### Response to Frontend
```json
{
  "success": true,
  "data": {
    "sql": "SELECT email, COUNT(*) as duplicates FROM users GROUP BY email HAVING count > 1",
    "explanation": "This query identifies duplicate email addresses...",
    "confidence": "high"
  }
}
```

### Frontend Display
```javascript
- SQL shown in SQL Generator tab
- Explanation shown in Explanation tab
- User sees: "Insight generated for email"
- User can run, edit, or copy the query
```

---

## ⚙️ Key Functions

### Frontend
**Function:** `handleGenerateColumnInsight`  
**Location:** Dashboard.jsx:916  
**Purpose:** Handle click on column lightbulb, send request to backend

### Backend Controller
**Function:** `generateSQL`  
**Location:** databaseController.js:233  
**Purpose:** Receive request, get schema, call AI, return response

### AI Client
**Function:** `generateSqlFromDescription`  
**Location:** aiClient.js:340  
**Purpose:** Build prompts, call Gemini, parse response

### Gemini Caller
**Function:** `callGemini`  
**Location:** aiClient.js:30  
**Purpose:** Make HTTP request to Gemini API

---

## 🔐 Security & Validation

### Input Validation
- ✅ Description required (checked in controller)
- ✅ ConnectionId required (from URL params)
- ✅ validateNLQuery middleware checks input

### SQL Validation
- ✅ `sanitizeSqlCandidate()` - removes dangerous patterns
- ✅ `isSafeReadOnlySql()` - ensures SELECT only
- ✅ Fallback to mock SQL if unsafe

### Error Handling
- ✅ Try-catch around Gemini API
- ✅ Fallback to mock SQL generation
- ✅ Error messages returned to frontend

---

## 💾 Storage

**Currently:** ❌ No persistent storage
- Insights generated on-demand
- Not saved to database
- Regenerated each time

**Potential Enhancement:** ✨ Cache insights
- Store generated queries
- Reuse for same column
- Track popular insights

---

## 🔧 Configuration

### Backend Environment Variables
```bash
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta
```

### API Settings
- Temperature: 0.1 (precise, not creative)
- TopK: 32
- TopP: 0.9
- Max tokens: 2048

---

## 📊 Summary

**Where Insights Are Generated:**

1. **Frontend:** User clicks → sends request
2. **Route:** POST /generate-sql endpoint
3. **Controller:** Receives request → orchestrates process
4. **AI Client:** Builds prompt → calls Gemini
5. **Gemini API:** Generates SQL → returns JSON
6. **Backend:** Validates → returns to frontend
7. **Frontend:** Displays SQL + explanation

**Key Files:**
- `Dashboard.jsx` - User interaction
- `databaseRoutes.js` - API endpoint
- `databaseController.js` - Request handling
- `aiClient.js` - Gemini integration

**Key Functions:**
- `handleGenerateColumnInsight()` - Frontend
- `generateSQL()` - Backend controller
- `generateSqlFromDescription()` - AI logic
- `callGemini()` - API call

**Data Format:**
- Input: Column name, table name, database schema
- Processing: Gemini generates JSON
- Output: SQL query + explanation + confidence

---

**Quick Answer:**
✅ Generated in **aiClient.js** (function: `generateSqlFromDescription`)  
✅ Controlled by **databaseController.js** (function: `generateSQL`)  
✅ Called from **Dashboard.jsx** via API endpoint

Not stored anywhere - generated fresh each time!
