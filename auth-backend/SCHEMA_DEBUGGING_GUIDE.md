# 🔍 Schema Debugging Guide

## Problem: Chatbot Says "Schema Unavailable"

Your chatbot cannot answer column type questions because the schema is not being retrieved properly.

---

## Diagnostic Steps

### Step 1: Check if Connection is Active

```bash
# Get all your connections
curl -X GET http://localhost:5000/api/database/connections \
  -H 'Authorization: Bearer <your-token>'

# Look for your connection in the response
# It should have: connectionId, type, database, host
```

### Step 2: Test Schema Retrieval Directly

**Use the Debug Endpoint** (NEW):
```bash
curl -X GET http://localhost:5000/api/assistant/debug/schema/<connectionId> \
  -H 'Authorization: Bearer <your-token>'

# Response should show:
{
  "success": true,
  "connectionStatus": { "connected": true, ... },
  "schemaRetrieved": true,
  "schemaLength": 5,
  "schema": [
    {
      "table_name": "admins",
      "columns": [
        { "name": "id", "type": "bigint", "nullable": false, ... },
        { "name": "username", "type": "varchar", "nullable": false, ... }
      ]
    },
    ...
  ]
}
```

**OR use the regular endpoint:**
```bash
curl -X GET http://localhost:5000/api/database/connections/<connectionId>/schema \
  -H 'Authorization: Bearer <your-token>'

# Should return normalized schema
```

### Step 3: Check Server Logs

Look for debug output:
```bash
# Enable debug mode
export DEBUG_SCHEMA=1
npm start

# Make a chat request and watch logs
# Should show:
# [DEBUG] Schema passed to interpretChatIntent: {
#   schemaExists: true,
#   schemaType: 'object',
#   isArray: true,
#   schemaLength: 5,
#   schemaSummaryLength: 234,
#   schemaSummaryPreview: "admins: id (bigint), username (varchar), ..."
# }
```

---

## Common Issues & Solutions

### Issue 1: Connection Not Found

**Error**: "Connection not found or expired"

**Causes**:
- Connection ID is wrong
- Connection expired (timeout after 1 hour)
- Wrong user's connection

**Solutions**:
```bash
# 1. Get all active connections
curl -X GET http://localhost:5000/api/database/connections \
  -H 'Authorization: Bearer <your-token>'

# 2. Recreate connection if expired
curl -X POST http://localhost:5000/api/database/connect \
  -H 'Authorization: Bearer <your-token>' \
  -d '{ connection details }'

# 3. Use new connectionId
```

### Issue 2: Schema Retrieves But Still "Unavailable"

**Symptoms**: 
- Debug endpoint shows schema retrieved ✓
- But chatbot says "schema unavailable" ✗

**Cause**: Schema is not being passed correctly to AI

**Solutions**:

1. **Check logs for warning**:
   ```bash
   # Look for: "Schema retrieval failed for assistant chat"
   # This means getSchema() threw an error
   ```

2. **Verify schema is not empty**:
   ```bash
   curl -X GET http://localhost:5000/api/assistant/debug/schema/<connectionId> \
     -H 'Authorization: Bearer <your-token>'
   
   # Check "schemaLength" - should be > 0
   ```

3. **Test with simpler question first**:
   ```bash
   # Try: "Show me all tables"
   # This doesn't require schema details
   ```

### Issue 3: Schema Returns But No Tables

**Error**: "schemaLength": 0

**Cause**: Database connection successful but no tables accessible

**Solutions**:
1. **Check database user permissions**:
   ```sql
   -- For MySQL
   SHOW DATABASES;
   USE your_database;
   SHOW TABLES;
   
   -- For PostgreSQL
   \l
   \c your_database
   \dt
   ```

2. **Ensure table exists**:
   ```bash
   # Check what tables are available
   curl -X GET http://localhost:5000/api/database/connections/<id>/explorer/tables \
     -H 'Authorization: Bearer <your-token>'
   ```

3. **Reconnect with correct credentials**:
   ```bash
   curl -X POST http://localhost:5000/api/database/connect \
     -H 'Authorization: Bearer <your-token>' \
     -d '{
       "type": "mysql",
       "host": "localhost",
       "port": 3306,
       "username": "correct_user",
       "password": "correct_password",
       "database": "correct_database"
     }'
   ```

### Issue 4: Column Type Not Found

**Question**: "What is the type of username column?"
**Response**: "I cannot tell you..."

**Cause**: Schema retrieved but AI doesn't know how to extract type info

**Solutions**:

1. **Specify table name**:
   ```
   "What is the type of username column in admins table?"
   ```

2. **Use direct API endpoint**:
   ```bash
   curl -X GET \
     'http://localhost:5000/api/database/connections/<id>/explorer/tables/admins/columns/username/type' \
     -H 'Authorization: Bearer <your-token>'
   ```

3. **Check if column exists**:
   ```bash
   curl -X GET \
     'http://localhost:5000/api/database/connections/<id>/explorer/tables/admins/columns' \
     -H 'Authorization: Bearer <your-token>'
   ```

---

## Step-by-Step Troubleshooting

### Scenario: User asks "What is the type of username column?"

**Step 1: Get connection status**
```bash
curl -X GET http://localhost:5000/api/database/connections \
  -H 'Authorization: Bearer <token>' | jq '.[] | select(.database == "your_db")'

# Note the connectionId
```

**Step 2: Debug schema**
```bash
curl -X GET http://localhost:5000/api/assistant/debug/schema/<connectionId> \
  -H 'Authorization: Bearer <token>'

# Check if:
# - "connected": true
# - "schemaRetrieved": true
# - "schemaLength" > 0
```

**Step 3: Check if table exists**
```bash
curl -X GET http://localhost:5000/api/database/connections/<id>/explorer/tables \
  -H 'Authorization: Bearer <token>' | jq '.data.tables[] | select(.name == "admins")'
```

**Step 4: Check if column exists**
```bash
curl -X GET http://localhost:5000/api/database/connections/<id>/explorer/tables/admins/columns \
  -H 'Authorization: Bearer <token>' | jq '.data.columns[] | select(.name == "username")'

# Should show:
# "name": "username",
# "type": "varchar",
# "nullable": false
```

**Step 5: Get column type directly**
```bash
curl -X GET \
  'http://localhost:5000/api/database/connections/<id>/explorer/tables/admins/columns/username/type' \
  -H 'Authorization: Bearer <token>'

# Should return:
# { "type": "varchar", "nullable": false }
```

**Step 6: Test chatbot**
```bash
curl -X POST http://localhost:5000/api/assistant/chat \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "connectionId": "<id>",
    "message": "What is the type of username column in admins table?"
  }'
```

---

## Enable Full Debug Mode

### Option 1: Environment Variable

```bash
# Before starting server
export DEBUG_SCHEMA=1
npm start

# Watch console for [DEBUG] messages
```

### Option 2: Modify Code

In `assistantController.js`, uncomment the debug log:

```javascript
// DEBUG: Log schema retrieval
logger.info(`Schema retrieved for connectionId ${connectionId}:`, {
  success: schemaResult.success,
  schemaExists: !!schema,
  schemaLength: Array.isArray(schema) ? schema.length : 'not-array',
  ...
});
```

### Option 3: Check Logs File

```bash
# View error logs
tail -f auth-backend/logs/error.log

# Search for schema errors
grep -i "schema" auth-backend/logs/combined.log
```

---

## Quick Test Script

Create `test-schema.sh`:

```bash
#!/bin/bash

TOKEN="your_token_here"
CONNECTION_ID="your_connection_id"
BASE_URL="http://localhost:5000/api"

echo "=== Testing Schema Retrieval ==="

echo -e "\n1. Connection Status:"
curl -X GET $BASE_URL/database/connections/$CONNECTION_ID/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n2. Debug Schema:"
curl -X GET $BASE_URL/assistant/debug/schema/$CONNECTION_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.debug'

echo -e "\n3. List Tables:"
curl -X GET $BASE_URL/database/connections/$CONNECTION_ID/explorer/tables \
  -H "Authorization: Bearer $TOKEN" | jq '.data.tables | length'

echo -e "\n4. Test Column Query:"
curl -X GET "$BASE_URL/database/connections/$CONNECTION_ID/explorer/tables/admins/columns/username/type" \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

echo -e "\n5. Test Chatbot:"
curl -X POST $BASE_URL/assistant/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"connectionId\": \"$CONNECTION_ID\",
    \"message\": \"What is the type of username column in admins table?\"
  }" | jq '.'

echo -e "\n=== Test Complete ==="
```

Usage:
```bash
chmod +x test-schema.sh
./test-schema.sh
```

---

## Expected Behavior

### ✅ Working Correctly

**Debug Endpoint Response**:
```json
{
  "success": true,
  "connectionStatus": { "connected": true, "type": "mysql" },
  "schemaRetrieved": true,
  "schemaLength": 5,
  "schema": [
    {
      "table_name": "admins",
      "columns": [
        { "name": "id", "type": "bigint" },
        { "name": "username", "type": "varchar" }
      ]
    }
  ]
}
```

**Chatbot Response**:
```
User: "What is the type of username column in admins table?"
Assistant: "The 'username' column in the admins table is of type varchar (NOT NULL)."
```

### ❌ Not Working

**Debug Endpoint Response**:
```json
{
  "success": false,
  "message": "Connection not active"
}
```

or

```json
{
  "success": true,
  "schemaRetrieved": false,
  "schemaLength": 0
}
```

**Chatbot Response**:
```
User: "What is the type of username column?"
Assistant: "I cannot tell you the type of the 'username' column because the database schema information is currently unavailable."
```

---

## Getting Help

If schema still shows as unavailable:

1. **Collect Debug Info**:
   ```bash
   # Run all diagnostic steps above
   # Capture all outputs
   ```

2. **Check Logs**:
   ```bash
   # Save last 100 lines of error log
   tail -100 auth-backend/logs/error.log > debug_logs.txt
   ```

3. **Verify Database**:
   ```bash
   # Connect to database directly and verify tables/columns exist
   mysql -h localhost -u user -p database
   SHOW TABLES;
   DESCRIBE admins;
   ```

4. **Test Connection**:
   ```bash
   curl -X POST http://localhost:5000/api/database/test-connection \
     -H 'Authorization: Bearer <token>' \
     -d '{ connection details }'
   ```

---

## Summary

Your chatbot schema debugging flow:

1. ✅ Test connection is active
2. ✅ Test debug endpoint shows schema
3. ✅ Verify tables and columns exist
4. ✅ Test direct column type endpoint
5. ✅ Test chatbot question
6. ✅ If still failing, enable DEBUG_SCHEMA=1 and check logs

**Most common cause**: Database user doesn't have table visibility. Check permissions!
