# Schema Explorer & Column Insight System

## Overview

The Schema Explorer is a comprehensive system that allows the DevQuery chatbot and users to interact with database schemas, discover column metadata, and perform intelligent schema-based queries. This system has been fully implemented to fix the core issue where the chatbot couldn't read database schemas.

## What Was Fixed

### Issue
- **Symptom**: "I cannot tell you the type of the 'id' column because the database schema information is currently unavailable"
- **Root Cause**: The `getSchema()` method was returning inconsistent schema formats for different database types, causing the AI interpreter to fail when processing schema information
- **Impact**: Chatbot could not understand database structure, making intelligent query generation impossible

### Solution
The schema retrieval system has been completely refactored to:

1. **Normalize all database schemas** to a consistent format
2. **Implement column analysis functions** for detailed metadata extraction
3. **Create REST endpoints** for schema exploration
4. **Build UI components** for visual schema browsing
5. **Enable AI chatbot** to access and understand database structures

---

## Architecture

### 1. Backend Schema System

#### DatabaseConnectionManager.js - Schema Methods

**getSchema(connectionId)**
- Retrieves the complete database schema
- Normalizes output to consistent format: `{ table_name, columns: [{ name, type, nullable, ... }] }`
- Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle, MongoDB
- Returns: `{ success: true, schema: [...] }`

```javascript
// Example Output
{
  success: true,
  schema: [
    {
      table_name: 'users',
      columns: [
        { name: 'id', type: 'bigint', nullable: false, column_default: null },
        { name: 'email', type: 'varchar', nullable: false, column_default: null },
        { name: 'created_at', type: 'timestamp', nullable: true, column_default: null }
      ]
    },
    ...
  ]
}
```

**getColumnMetadata(connectionId, tableName, columnName)**
- Retrieves detailed metadata for a specific column
- Returns: `{ success: true, data: { tableName, columnName, dataType, isNullable, defaultValue, sample } }`

**getColumnType(connectionId, tableName, columnName)**
- Quick lookup of a column's data type
- Returns: `{ success: true, data: { tableName, columnName, type, nullable } }`

**getTableColumns(connectionId, tableName)**
- Gets all columns in a table with their types
- Returns: `{ success: true, tableName, columns: [...] }`

**getTables(connectionId)**
- Lists all tables in the database
- Returns: `{ success: true, tables: [{ name, columnCount, columns }] }`

**findColumnsByName(connectionId, columnNamePattern)**
- Searches for columns matching a pattern
- Returns: `{ success: true, pattern, count, results: [...] }`

**getSchemaStats(connectionId)**
- Provides schema statistics (table count, column count, type distribution)
- Returns: `{ success: true, stats: { tableCount, totalColumns, uniqueTypes, typeDistribution } }`

### 2. REST API Endpoints

All endpoints require authentication via Bearer token.

#### Schema Retrieval
```
GET /api/database/connections/:connectionId/schema
Returns: Full normalized schema for all tables
```

#### Schema Explorer Endpoints
```
GET /api/database/connections/:connectionId/explorer/tables
Returns: List of all tables with column counts

GET /api/database/connections/:connectionId/explorer/stats
Returns: Schema statistics and type distribution

GET /api/database/connections/:connectionId/explorer/tables/:tableName/columns
Returns: All columns in a table with detailed info

GET /api/database/connections/:connectionId/explorer/tables/:tableName/columns/:columnName
Returns: Detailed metadata for a specific column

GET /api/database/connections/:connectionId/explorer/tables/:tableName/columns/:columnName/type
Returns: Data type information for a column

GET /api/database/connections/:connectionId/explorer/search-columns?pattern=<pattern>
Returns: Columns matching the search pattern
```

### 3. AI Chatbot Integration

**assistantController.js** now:
1. Fetches the normalized schema for the connection
2. Passes it to `interpretChatIntent()` in `aiClient.js`
3. AI summarizes schema using `summarizeSchemaForPrompt()`
4. Includes schema context in all Gemini API calls

**Example Chat Interactions:**
```
User: "What is the type of the 'id' column in the users table?"
AI: "The 'id' column in the users table is of type bigint (NOT NULL)."

User: "Show me columns containing 'email'"
AI: "Found columns: users.email (varchar), 
            employees.work_email (varchar), 
            contacts.secondary_email (varchar)"

User: "How many tables are in my database?"
AI: "Your database has 8 tables with a total of 42 columns."
```

### 4. Frontend Schema Explorer Component

**SchemaExplorer.jsx** - Interactive UI for schema browsing

Features:
- **Tables View**: Browse all tables, expandable with column preview
- **Columns View**: Detailed column information for selected table
- **Search View**: Find columns across all tables by name pattern
- **Stats View**: Database statistics and data type distribution

#### Usage Example:
```jsx
import SchemaExplorer from './components/SchemaExplorer';

// Render the explorer
<SchemaExplorer 
  connectionId={activeConnectionId} 
  onClose={() => setShowExplorer(false)} 
/>
```

---

## Database-Specific Schema Queries

### PostgreSQL
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position
```

### MySQL
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = DATABASE()
ORDER BY table_name, ordinal_position
```

### SQLite
```sql
PRAGMA table_info(table_name)
-- Returns: cid, name, type, notnull, dflt_value, pk
```

### SQL Server
```sql
SELECT t.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
FROM information_schema.tables t
INNER JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_type = 'BASE TABLE'
```

### Oracle
```sql
SELECT table_name, column_name, data_type, nullable, data_default
FROM user_tab_columns
ORDER BY table_name, column_id
```

### MongoDB
Introspects collection documents to determine field types and nullability by analyzing sample documents (max 25 per collection).

---

## Schema Normalization Format

All databases now return schema in this unified format:

```javascript
{
  success: true,
  schema: [
    {
      table_name: 'string',        // Table or collection name
      columns: [
        {
          name: 'string',          // Column/field name
          column_name: 'string',   // Duplicate for compatibility
          type: 'string',          // Data type (e.g., 'bigint', 'varchar', 'object')
          data_type: 'string',     // Duplicate for compatibility
          is_nullable: boolean,    // Whether NULL is allowed
          nullable: boolean,       // Duplicate for compatibility
          column_default: string|null,  // Default value if any
          sample: any              // Sample value (for MongoDB)
        },
        ...
      ]
    },
    ...
  ]
}
```

---

## How the Chatbot Now Reads Schema

### Flow Diagram

```
User Chat Message
    ↓
assistantController.handleChat()
    ↓
Fetch Connection Status
    ↓
Call dbManager.getSchema(connectionId)
    ↓
Get Normalized Schema
    ↓
Call interpretChatIntent() with schema
    ↓
Summarize schema for prompt
    ↓
Send to Gemini API with schema context
    ↓
AI returns query/response
    ↓
Return to user
```

### Schema Context in AI Prompt

The `summarizeSchemaForPrompt()` function creates a concise schema summary:

```
users: id (bigint), email (varchar), created_at (timestamp)
products: id (bigint), name (varchar), price (decimal)
orders: id (bigint), user_id (bigint), product_id (bigint), quantity (int)
...
```

This is sent to Gemini along with the user's query, allowing the AI to:
- Understand table relationships
- Generate accurate SQL queries
- Answer questions about schema
- Identify column types
- Provide intelligent suggestions

---

## API Usage Examples

### Get Column Type (What was broken before)

```bash
curl -X GET \
  'http://localhost:5000/api/database/connections/conn-123/explorer/tables/users/columns/id/type' \
  -H 'Authorization: Bearer <token>'

# Response:
{
  "success": true,
  "message": "Column type retrieved successfully",
  "data": {
    "tableName": "users",
    "columnName": "id",
    "type": "bigint",
    "nullable": false
  }
}
```

### Search Columns by Name

```bash
curl -X GET \
  'http://localhost:5000/api/database/connections/conn-123/explorer/search-columns?pattern=email' \
  -H 'Authorization: Bearer <token>'

# Response:
{
  "success": true,
  "message": "Column search completed",
  "data": {
    "pattern": "email",
    "count": 3,
    "results": [
      {
        "tableName": "users",
        "columnName": "email",
        "dataType": "varchar",
        "nullable": false
      },
      {
        "tableName": "employees",
        "columnName": "work_email",
        "dataType": "varchar",
        "nullable": true
      },
      ...
    ]
  }
}
```

### Get Schema Statistics

```bash
curl -X GET \
  'http://localhost:5000/api/database/connections/conn-123/explorer/stats' \
  -H 'Authorization: Bearer <token>'

# Response:
{
  "success": true,
  "message": "Schema statistics retrieved successfully",
  "data": {
    "stats": {
      "tableCount": 8,
      "totalColumns": 42,
      "uniqueTypes": 12,
      "typeDistribution": {
        "varchar": 15,
        "bigint": 8,
        "timestamp": 6,
        "boolean": 5,
        "decimal": 3,
        "int": 5
      }
    }
  }
}
```

---

## Frontend Integration

### Adding Schema Explorer to Dashboard

```jsx
import { useState } from 'react';
import SchemaExplorer from './components/SchemaExplorer';

function Dashboard() {
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState(null);

  return (
    <div>
      <button onClick={() => setShowExplorer(true)}>
        Open Schema Explorer
      </button>

      {showExplorer && (
        <SchemaExplorer 
          connectionId={activeConnectionId}
          onClose={() => setShowExplorer(false)}
        />
      )}
    </div>
  );
}
```

### Features in UI

**Tables Tab:**
- Browse all tables
- Click to expand and see columns
- Expandable table cards with column preview
- "View All Columns" button for detailed view

**Columns Tab:**
- Shows detailed info for selected table
- Data type, nullable status, default values
- Color-coded type badges

**Search Tab:**
- Find columns across entire database
- Pattern matching
- Shows table.column with type

**Stats Tab:**
- Total tables and columns
- Unique data types count
- Distribution chart of data types

---

## Caching & Performance

Schema results are cached using NodeCache with:
- **TTL**: 30 minutes (1800 seconds)
- **Key Format**: `schema_<connectionId>`
- **Strategy**: TTL-based automatic expiration

This ensures:
- Fast repeated schema access
- Reduced database load
- Fresh data every 30 minutes

---

## Error Handling

All schema methods include comprehensive error handling:

```javascript
{
  "success": false,
  "message": "Connection not found or expired"
}

{
  "success": false,
  "message": "Table 'users' not found"
}

{
  "success": false,
  "message": "Column 'id' not found in table 'users'"
}
```

---

## Troubleshooting

### "Schema is unavailable" Error

**Cause**: Connection expired or not found

**Fix**:
1. Verify connection is active: `GET /api/database/connections`
2. Reconnect if needed
3. Try schema fetch again

### Chatbot still can't read schema

**Check**:
1. Connection status: Is `connected: true`?
2. Schema endpoint returns data: `GET /api/database/connections/:id/schema`
3. Check server logs for errors

### Slow schema retrieval

**Optimize**:
1. Schema caching is automatic (30 min TTL)
2. For large databases, query execution time depends on DB performance
3. Consider limiting tables in very large schemas

---

## Testing

### Test Connection & Schema Reading

```bash
# 1. Test connection
curl -X POST http://localhost:5000/api/database/test-connection \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "type": "postgresql",
    "host": "localhost",
    "port": 5432,
    "username": "user",
    "password": "pass",
    "database": "testdb"
  }'

# 2. Create connection
curl -X POST http://localhost:5000/api/database/connect \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{ ... connection details ... }'

# Response includes: connectionId

# 3. Get schema
curl -X GET http://localhost:5000/api/database/connections/:connectionId/schema \
  -H 'Authorization: Bearer <token>'

# 4. Test AI chat with schema
curl -X POST http://localhost:5000/api/assistant/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "connectionId": ":connectionId",
    "message": "What is the type of the id column in users table?"
  }'
```

---

## Summary of Changes

### Backend Files Modified
1. **DatabaseConnectionManager.js**
   - Fixed `getSchema()` to normalize all database schemas
   - Added 6 new column analysis methods
   - Implemented schema caching

2. **databaseController.js**
   - Added 6 new REST endpoints for schema exploration
   - Proper error handling for all endpoints

3. **databaseRoutes.js**
   - Added 6 new routes under `/explorer` path
   - Maintains existing authentication middleware

### Frontend Files Created
1. **SchemaExplorer.jsx**
   - Complete UI component for schema browsing
   - 4 view modes: Tables, Columns, Search, Stats
   - Responsive design for all screen sizes

2. **SchemaExplorer.css**
   - Modern, clean styling
   - Dark mode compatible
   - Mobile responsive

### Result
✅ Chatbot can now read and understand database schemas
✅ Users can explore schemas through UI
✅ Column types and metadata fully accessible
✅ AI can answer schema-related questions
✅ Complete schema analysis system

