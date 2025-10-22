# Schema Explorer System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Dashboard  │  Chatbot Input  │  Schema Explorer Button             │
│     ↓       │       ↓         │           ↓                         │
│     ├───────┴───────┬─────────┴──────────────────┐                 │
│     │               │                            │                 │
│  Assistant Chat  Query Executor          SchemaExplorer.jsx        │
│                      │                            │                 │
│     ┌────────────────┴────────────────────────────┘                 │
│     │                                             ↓                 │
│     └──────────────→ API Gateway ←────────────────┘                │
│                      (Express Routes)                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
   Query Executor   Assistant Chat    Database Schema
   Controller       Controller        Controller
        │                  │                  │
        │                  ├────────┐        │
        │                  │        │        │
        │                  ↓        ↓        ↓
        └──→ DatabaseConnectionManager.js ←──┘
                │                    │
                ├─ getSchema()        ├─ getColumnType() ✅ YOUR FIX
                │  (NORMALIZED)       ├─ getColumnMetadata()
                ├─ executeQuery()     ├─ getTableColumns()
                └─ other methods      ├─ getTables()
                                      ├─ findColumnsByName()
                                      └─ getSchemaStats()
                │
                │ [CACHE: 30 min TTL]
                │
        ┌───────┴─────────────┬──────────┬───────────┬──────────┐
        │                     │          │           │          │
        ↓                     ↓          ↓           ↓          ↓
   PostgreSQL           MySQL         SQLite    SQL Server   Oracle     MongoDB
   (pg library)    (mysql2/promise) (sqlite3)  (tedious)  (oracledb) (mongodb)
        │                     │          │           │          │
        │                     └────┬─────┴─┬─────────┴──────────┴┘
        │                          │       │
        │                    [Normalized Schema Format]
        │                    
        │      table_name: 'users'
        │      columns:
        │        - name: 'id'
        │          type: 'bigint'
        │          nullable: false
        │        - name: 'email'
        │          type: 'varchar'
        │          nullable: false
        │
        └──────────────────────→ [SCHEMA CACHE]
```

---

## Data Flow: Answering "What is the type of the 'id' column?"

### Before (Broken)
```
User Input
    ↓
Chat Controller
    ↓
Fetch Schema (inconsistent format)
    ├─ PostgreSQL: raw rows
    ├─ MySQL: raw rows
    ├─ MongoDB: grouped tables
    └─ ...different formats for each DB
    ↓
AI Interpreter
    ↓
Try to parse inconsistent format
    ↓
❌ FAILS - Cannot understand format
    ↓
Response: "database schema information is currently unavailable"
```

### After (Fixed)
```
User Input: "What is the type of the 'id' column?"
    ↓
Chat Controller (assistantController)
    ↓
Fetch Schema via dbManager.getSchema()
    ↓
Schema Normalization (in DatabaseConnectionManager)
    ├─ PostgreSQL → Normalize
    ├─ MySQL → Normalize
    ├─ SQLite → Normalize
    ├─ SQL Server → Normalize
    ├─ Oracle → Normalize
    └─ MongoDB → Normalize
    ↓
Unified Format: [{ table_name, columns: [{ name, type, nullable }] }]
    ↓
Schema Cached (30 min TTL)
    ↓
Passed to AI Interpreter
    ↓
summarizeSchemaForPrompt() creates:
"users: id (bigint), email (varchar), ..."
    ↓
Sent to Gemini API with schema context
    ↓
AI understands schema structure
    ↓
Response: "The 'id' column in the users table is of type bigint (NOT NULL)"
    ↓
✅ SUCCESS - User gets answer
```

---

## REST API Architecture

```
┌────────────────────────────────────────────────────────────────┐
│              REST API Endpoints                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  GET /api/database/connections/:connectionId/schema           │
│  └─ Returns: Normalized schema for all tables                 │
│                                                                │
│  GET /api/database/connections/:connectionId/explorer/tables  │
│  └─ Returns: { tables: [{ name, columnCount, columns }] }    │
│                                                                │
│  GET /api/database/connections/:connectionId/explorer/stats   │
│  └─ Returns: { tableCount, columnCount, typeDistribution }   │
│                                                                │
│  GET /api/database/.../explorer/tables/:tableName/columns    │
│  └─ Returns: { tableName, columns: [...] }                  │
│                                                                │
│  GET /api/database/.../columns/:columnName                    │
│  └─ Returns: Full column metadata                             │
│                                                                │
│  GET /api/database/.../columns/:columnName/type ✅ YOUR FIX  │
│  └─ Returns: { type, nullable } → SOLVES YOUR PROBLEM       │
│                                                                │
│  GET /api/database/.../search-columns?pattern=X             │
│  └─ Returns: [{ tableName, columnName, dataType, ... }]    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
        ↓
    Authentication
    (Bearer Token Required)
        ↓
    Authorization
    (Connection Permissions)
        ↓
    Database Connection Manager
        ↓
    Specific Database Handler
```

---

## Component Architecture

```
Frontend Layer:
┌──────────────────────────────────────────┐
│         SchemaExplorer.jsx               │
├──────────────────────────────────────────┤
│ ┌─ Tables View ──────────────────────┐  │
│ │ └─ Browse all tables               │  │
│ │   ├─ Expandable cards              │  │
│ │   ├─ Column preview                │  │
│ │   └─ View All Columns button       │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌─ Columns View ─────────────────────┐  │
│ │ └─ Detailed column information     │  │
│ │   ├─ Column name (code font)       │  │
│ │   ├─ Data type (badge)             │  │
│ │   ├─ Nullable status               │  │
│ │   └─ Default value                 │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌─ Search View ──────────────────────┐  │
│ │ └─ Find columns by pattern         │  │
│ │   ├─ Search input                  │  │
│ │   ├─ Result count                  │  │
│ │   └─ Matching columns list         │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌─ Stats View ───────────────────────┐  │
│ │ └─ Database statistics             │  │
│ │   ├─ Table count card              │  │
│ │   ├─ Column count card             │  │
│ │   ├─ Type count card               │  │
│ │   └─ Type distribution chart       │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         ↓ (HTTP Requests)
Backend API Layer
```

---

## Database Handler Architecture

```
DatabaseConnectionManager.js
├─ Connection Pool Management
│  ├─ PostgreSQL (pg library)
│  ├─ MySQL (mysql2/promise)
│  ├─ SQLite (sqlite3)
│  ├─ SQL Server (tedious)
│  ├─ Oracle (oracledb)
│  └─ MongoDB (mongodb)
│
├─ Schema Methods (ALL NORMALIZED)
│  ├─ getSchema()          → [{ table_name, columns }]
│  ├─ getColumnMetadata()  → { type, nullable, ... }
│  ├─ getColumnType()      → { type, nullable } ✅ YOUR FIX
│  ├─ getTableColumns()    → [{ name, type, ... }]
│  ├─ getTables()          → [{ name, columnCount }]
│  ├─ findColumnsByName()  → [matching columns]
│  └─ getSchemaStats()     → { counts, distribution }
│
├─ Caching Layer
│  ├─ Node Cache
│  ├─ 30 minute TTL
│  ├─ Automatic expiration
│  └─ Connection-specific keys
│
└─ Database-Specific Adapters
   ├─ PostgreSQL Adapter
   │  └─ information_schema queries
   ├─ MySQL Adapter
   │  └─ information_schema queries
   ├─ SQLite Adapter
   │  └─ PRAGMA table_info
   ├─ SQL Server Adapter
   │  └─ information_schema queries
   ├─ Oracle Adapter
   │  └─ user_tab_columns queries
   └─ MongoDB Adapter
      └─ Document introspection
```

---

## Data Flow: Schema Normalization

```
Input: Raw Database Schema
┌──────────────────────────────────────────────────────┐
│                                                      │
│  PostgreSQL:                                         │
│  [                                                   │
│    { table_name: 'users', column_name: 'id', ... }, │
│    { table_name: 'users', column_name: 'email',...},│
│    { table_name: 'posts', column_name: 'id', ... }  │
│  ]                                                   │
│                                                      │
│  MongoDB:                                            │
│  [                                                   │
│    {                                                 │
│      table_name: 'users',                            │
│      columns: [{ name: 'id', type: 'ObjectId' }, ...]│
│    }                                                 │
│  ]                                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
              ↓ (Schema Normalization)
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Normalized Output (Same for All DBs):               │
│  [                                                   │
│    {                                                 │
│      table_name: 'users',                            │
│      columns: [                                      │
│        {                                             │
│          name: 'id',                                 │
│          type: 'bigint',                             │
│          nullable: false,                            │
│          column_default: null                        │
│        },                                            │
│        {                                             │
│          name: 'email',                              │
│          type: 'varchar',                            │
│          nullable: false,                            │
│          column_default: null                        │
│        }                                             │
│      ]                                               │
│    },                                                │
│    {                                                 │
│      table_name: 'posts',                            │
│      columns: [...]                                  │
│    }                                                 │
│  ]                                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
        ↓ (Ready for AI)
AI Interpreter can now parse consistently ✅
```

---

## Performance & Caching

```
┌─────────────────────────────────────────────────────────┐
│         Request Flow with Caching                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Request 1: GET /schema                                │
│  ├─ Check cache → Miss                                 │
│  ├─ Query database → 300-500ms                         │
│  ├─ Store in cache → TTL: 30 min                       │
│  └─ Return to user                                     │
│                                                         │
│  Request 2: GET /schema (within 30 min)               │
│  ├─ Check cache → HIT                                  │
│  ├─ Return from cache → < 1ms                          │
│  └─ No database query needed                           │
│                                                         │
│  Request 3: GET /schema (after 30 min)                │
│  ├─ Check cache → Expired                              │
│  ├─ Query database → 300-500ms                         │
│  ├─ Update cache → TTL: 30 min                         │
│  └─ Return to user                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────┐
│           Authentication & Authorization             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Request arrives with Authorization header       │
│     ├─ Bearer <JWT Token>                           │
│     └─ Token validated                              │
│                                                      │
│  2. Authenticate User                               │
│     ├─ Token signature verified                     │
│     ├─ Token not expired                            │
│     └─ User ID extracted                            │
│                                                      │
│  3. Check Subscription                              │
│     ├─ User has active subscription                 │
│     └─ Feature access allowed                       │
│                                                      │
│  4. Check Connection Permissions                    │
│     ├─ User owns this connection                    │
│     ├─ Connection is active                         │
│     └─ Access granted to connection                 │
│                                                      │
│  5. Access Database                                 │
│     ├─ Schema retrieved                             │
│     ├─ User permissions respected                   │
│     └─ Data returned                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌────────────────────────────────────────────────┐
│         Error Handling Architecture            │
├────────────────────────────────────────────────┤
│                                                │
│  Try to access schema                          │
│  │                                             │
│  ├─ Connection not found?                      │
│  │  └─ Return: 400 "Connection not found"     │
│  │                                             │
│  ├─ Table not found?                           │
│  │  └─ Return: 400 "Table not found"          │
│  │                                             │
│  ├─ Column not found?                          │
│  │  └─ Return: 400 "Column not found"         │
│  │                                             │
│  ├─ Auth failed?                               │
│  │  └─ Return: 401 Unauthorized               │
│  │                                             │
│  ├─ Permission denied?                         │
│  │  └─ Return: 403 Forbidden                  │
│  │                                             │
│  ├─ Database error?                            │
│  │  └─ Log error, Return: 500 Server Error    │
│  │                                             │
│  └─ Success!                                   │
│     └─ Return: 200 with data                  │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Summary

This architecture ensures:

✅ **Consistency**: All databases return same format
✅ **Performance**: Intelligent caching (30 min TTL)
✅ **Security**: Authentication & authorization checks
✅ **Reliability**: Comprehensive error handling
✅ **Scalability**: Connection pooling & caching
✅ **Usability**: Intuitive UI with 4 view modes
✅ **Integration**: AI can understand any schema

**Result**: Your chatbot can now perfectly read and understand any database! 🎉
