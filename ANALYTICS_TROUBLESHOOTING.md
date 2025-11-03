# Analytics Troubleshooting Guide

## Current Issue: Using Demo Data Instead of Real Database

### What You're Seeing
```
Query: "line chart for each product its price"
Result: [Demo Data - API Error] Generated SQL:
SELECT product_name, SUM(quantity_sold) as total_sold 
FROM product_sales 
GROUP BY product_name 
ORDER BY total_sold DESC LIMIT 10;
```

## Root Cause Analysis

### Possible Reasons for Demo Data Fallback

1. **No Database Connection**
   - Analytics page doesn't have an active database connection
   - Connection ID is `null` or `undefined`
   - Connection expired/closed

2. **Connection Not Found in Backend**
   - Connection ID exists but not in `dbManager.activeConnections`
   - Connection was created but not persisted in memory

3. **Gemini AI Error**
   - Missing or invalid `GEMINI_API_KEY`
   - AI request failed/timed out
   - API quota exceeded

4. **SQL Execution Error**
   - Generated SQL is incompatible with database type
   - Table/column names don't exist
   - Permission issues

## Diagnostic Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and run your query. Look for:

```javascript
🔍 Analytics Query Debug: {
  query: "line chart for each product its price",
  connectionId: "xxx-xxx-xxx",  // Should NOT be null/undefined
  hasConnection: true,           // Should be true
  connectionDetails: {...}
}
```

**If `connectionId` is `null`:**
- Problem: Analytics doesn't have database connection
- Solution: Connect database before using Analytics

**If `hasConnection` is `false`:**
- Problem: No active connection
- Solution: Reconnect to database

### Step 2: Check Backend Logs

Look for these log messages:

```bash
# GOOD - Everything working:
✅ Analytics query received with connectionId: abc123
✅ Connection found for abc123, type: postgresql
✅ Schema retrieved: 5 tables found
✅ Using Gemini AI for analytics query: "..."
✅ AI generated SQL: SELECT ...
✅ AI analytics executed successfully: 10 rows returned

# BAD - Connection issue:
❌ No connectionId provided in request
❌ Connection not found for connectionId: abc123
❌ Available connections: (empty or different ID)

# BAD - AI issue:
❌ Gemini AI analytics failed: Error: ...
❌ Error message: Missing API key / Rate limit exceeded / ...
```

### Step 3: Verify Database Connection

In Dashboard:
1. Check if database is connected (green indicator)
2. Try running a simple query: `SELECT * FROM your_table LIMIT 1`
3. If query fails, reconnect database

### Step 4: Check Gemini API Key

In backend `.env` file:
```bash
GEMINI_API_KEY=your-actual-api-key-here
```

Test Gemini:
```bash
# In backend directory
node test-gemini.js
```

## Common Issues & Solutions

### Issue 1: "No connectionId provided"

**Symptoms:**
- Backend logs: `No connectionId provided in request`
- Console shows: `connectionId: null`

**Cause:** Analytics page doesn't have active connection

**Solution:**
```javascript
// Analytics should fetch connections on mount
useEffect(() => {
  const fetchConnections = async () => {
    const response = await api.get('/api/database/connections');
    const conns = response.data.data;
    setDbConnection(conns[0]); // Set first connection
  };
  fetchConnections();
}, [user]);
```

**Quick Fix:** 
1. Go to Dashboard
2. Connect to database
3. Return to Analytics
4. Connection should auto-load

### Issue 2: "Connection not found"

**Symptoms:**
- Backend logs: `Connection not found for connectionId: xxx`
- `Available connections: (different ID)`

**Cause:** Connection ID mismatch or connection expired

**Solution:**
1. Refresh the page to reload connections
2. Reconnect database if needed
3. Check session persistence

**Technical Fix:**
```javascript
// Backend should persist connections
dbManager.activeConnections.set(connectionId, {
  connection,
  userId,
  timestamp: Date.now()
});
```

### Issue 3: "Gemini AI analytics failed"

**Symptoms:**
- Backend logs: `Gemini AI analytics failed: Error: Missing API key`
- Falls back to demo data

**Cause:** Gemini API key missing or invalid

**Solution:**
1. Set `GEMINI_API_KEY` in `.env`
2. Restart backend server
3. Verify key at: https://makersuite.google.com/app/apikey

### Issue 4: SQL Execution Fails

**Symptoms:**
- AI generates SQL but execution fails
- Backend logs: `Query failed: ...`

**Cause:** SQL incompatible with your database

**Solution:**
1. Check table/column names exist in your DB
2. Verify SQL syntax matches database type
3. Check user permissions

## Improvements Needed

### 1. Better Error Messages ✅ ADDED

**Before:**
```
[Demo Data - API Error]
```

**After (with enhanced logging):**
```javascript
// Frontend console
🔍 Analytics Query Debug: { connectionId, hasConnection, ... }
📊 Analytics Response: { useRealData, sql, error, ... }

// Backend logs
Analytics query received with connectionId: xxx
Connection found for xxx, type: postgresql
Schema retrieved: 5 tables found
Using Gemini AI for analytics query: "..."
AI generated SQL: SELECT ...
```

### 2. Connection Status Indicator (RECOMMENDED)

Add to Analytics UI:
```jsx
{/* Connection Status */}
<div className="connection-status">
  {dbConnection ? (
    <span className="status-connected">
      ✅ Connected to {dbConnection.database} ({dbConnection.type})
    </span>
  ) : (
    <span className="status-disconnected">
      ⚠️ No database connected - <Link to="/dashboard">Connect now</Link>
    </span>
  )}
</div>
```

### 3. Fallback with Warning (RECOMMENDED)

Instead of silently using demo data:
```javascript
if (!useRealData) {
  showNotification(
    'Using demo data - Connect database for real analytics',
    'warning'
  );
}
```

### 4. Retry Mechanism (RECOMMENDED)

```javascript
// If connection fails, try reconnecting
if (!connectionData) {
  await checkExistingConnections();
  connectionData = dbManager.activeConnections.get(connectionId);
}
```

### 5. Better Demo Data Message (RECOMMENDED)

```javascript
const errorReason = connectionId 
  ? 'Connection not found or AI error'
  : 'No database connected';

setChartInfo(
  `<span style="color:#FFA500;">[Demo Data - ${errorReason}]</span> 
   <b>Generated SQL:</b>...`
);
```

### 6. Schema-Aware Demo Data (RECOMMENDED)

If using demo data, generate SQL based on actual schema:
```javascript
if (!useRealData && tables.length > 0) {
  // Generate demo SQL using actual table names
  const productTable = tables.find(t => /product/i.test(t.name));
  if (productTable) {
    sql = `SELECT * FROM ${productTable.name} LIMIT 10`;
  }
}
```

## Testing Checklist

- [ ] Database connected in Dashboard
- [ ] Connection appears in browser console
- [ ] Backend receives connectionId
- [ ] Connection found in activeConnections
- [ ] Schema retrieved successfully
- [ ] Gemini API key configured
- [ ] AI generates SQL
- [ ] SQL executes on database
- [ ] Results returned to frontend
- [ ] Chart displays with [Real Data] indicator

## Next Steps

1. **Run Analytics query again** - Check browser console for debug info
2. **Check backend logs** - Look for error messages
3. **Verify database connection** - Ensure it's active
4. **Test with simple query** - "show all tables" or "table count"
5. **If still failing** - Share backend logs for deeper analysis

## Enhanced Logging Added

I've added comprehensive logging to both frontend and backend:

### Frontend (Analytics.jsx)
```javascript
console.log('🔍 Analytics Query Debug:', {
  query: input,
  connectionId: dbConnection?.connectionId,
  hasConnection: !!dbConnection,
  connectionDetails: dbConnection
});

console.log('📊 Analytics Response:', response.data);
```

### Backend (analyticsController.js)
```javascript
logger.info(`Analytics query received with connectionId: ${connectionId}`);
logger.info(`Connection found for ${connectionId}, type: ${connection.type}`);
logger.info(`Schema retrieved: ${tables.length} tables found`);
logger.error('Error stack:', aiError.stack);
logger.error('Error message:', aiError.message);
logger.warn(`Available connections: ${Array.from(dbManager.activeConnections.keys()).join(', ')}`);
```

## Run This Now

1. **Open Analytics page**
2. **Open browser DevTools (F12)** - Go to Console tab
3. **Type your query**: "line chart for each product its price"
4. **Click Generate**
5. **Check console output** - Share the debug messages
6. **Check backend terminal** - Share the log messages

This will tell us exactly why it's falling back to demo data!
