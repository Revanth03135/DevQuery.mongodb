# 🧪 Quick Test Guide: Query History & Saved Queries Integration

## ⚡ Quick Start Testing

### **Prerequisites**
- ✅ Backend server running
- ✅ Frontend running in browser
- ✅ Database connected

---

## 🎯 Test Cases

### **Test 1: Basic Query History** (30 seconds)

1. **Execute a query via chatbot**:
   ```
   👤 You: "show me all users in the users table"
   ```
   ✅ Wait for results to appear

2. **Ask about the query**:
   ```
   👤 You: "what was my last query?"
   ```
   ✅ Expected: AI should quote the exact SQL

3. **Re-run the query**:
   ```
   👤 You: "run that query again"
   ```
   ✅ Expected: Query executes without asking details

---

### **Test 2: Saved Queries Awareness** (1 minute)

1. **Save a query**:
   - Execute any query via chatbot
   - Click "Save SQL" button in the SQL panel
   - Query gets saved to localStorage

2. **Ask chatbot about saved queries**:
   ```
   👤 You: "show me my saved queries"
   ```
   ✅ Expected: AI lists your saved queries with SQL

3. **Execute a saved query via chatbot**:
   ```
   👤 You: "run my saved query about users"
   ```
   ✅ Expected: AI finds and executes the matching saved query

---

### **Test 3: Failed Query Detection** (45 seconds)

1. **Execute an invalid query**:
   ```
   👤 You: "select * from nonexistent_table"
   ```
   ✅ Wait for error message

2. **Ask about failures**:
   ```
   👤 You: "what queries failed?"
   ```
   ✅ Expected: AI shows the failed query with error details

---

### **Test 4: Multiple Query History** (1 minute)

1. **Execute 3 different queries**:
   ```
   👤 You: "show all users"
   👤 You: "count total orders"
   👤 You: "list all products"
   ```

2. **Ask for history**:
   ```
   👤 You: "show me my recent queries"
   ```
   ✅ Expected: AI lists all 3 queries with timestamps

3. **Reference specific query**:
   ```
   👤 You: "re-run the second query I executed"
   ```
   ✅ Expected: AI identifies and runs the correct query

---

### **Test 5: Combined Context** (1 minute)

1. **Create some history**:
   - Execute 2-3 queries
   - Save 1 query as favorite
   - Let one query fail

2. **Ask complex question**:
   ```
   👤 You: "which of my saved queries did I execute most recently?"
   ```
   ✅ Expected: AI correlates saved queries with execution history

---

## 🔍 Debug Checklist

### **If AI doesn't show query history:**

1. **Check browser console**:
   ```javascript
   localStorage.getItem('queryHistory')
   ```
   ✅ Should show array of queries

2. **Check network tab**:
   - Look for POST to `/api/assistant/chat`
   - Check request payload has `queryHistory` field
   - Should contain array of recent queries

3. **Check backend logs**:
   ```powershell
   Get-Content .\logs\combined.log -Tail 20
   ```
   ✅ Look for: "Query history: X queries, Saved queries: Y queries"

### **If AI doesn't show saved queries:**

1. **Verify saved queries exist**:
   ```javascript
   localStorage.getItem('savedQueries')
   ```
   ✅ Should show array of saved queries

2. **Save a query manually**:
   - Execute any query
   - Click "Save SQL" button
   - Check localStorage again

---

## 🎬 Video Test Walkthrough

### **Complete Feature Test (2 minutes)**

```
Step 1: Execute initial query
👤 "show me all users"
🤖 [Returns results]

Step 2: Save the query
[Click "Save SQL" button]
✅ "Query saved locally"

Step 3: Execute another query
👤 "count total orders"
🤖 [Returns count]

Step 4: Execute invalid query
👤 "select from fake_table"
🤖 [Shows error]

Step 5: Test history awareness
👤 "what was my first query?"
🤖 "Your first query was: SELECT * FROM users"

Step 6: Test saved query awareness
👤 "show my saved queries"
🤖 Lists saved queries with SQL

Step 7: Test failure detection
👤 "which queries failed?"
🤖 Shows the fake_table query error

Step 8: Re-run from history
👤 "run the query about users again"
🤖 [Executes SELECT * FROM users]

✅ ALL FEATURES WORKING!
```

---

## 📊 Expected Backend Logs

When you send a chat message, you should see:

```
[INFO] Chat request received with 2 history messages
[INFO] Last history message: {"role":"assistant","content":"Here are the users..."}
[INFO] Query history: 3 queries, Saved queries: 1 queries
[INFO] Schema retrieved for connectionId abc123: ...
```

---

## ⚠️ Common Issues

### **Issue 1: AI says "No query history available"**
**Cause**: localStorage is empty or queries not executing  
**Fix**: Execute at least one query first

### **Issue 2: AI doesn't see saved queries**
**Cause**: Queries not saved to localStorage  
**Fix**: Click "Save SQL" button after executing queries

### **Issue 3: Backend shows 0 queries in logs**
**Cause**: Frontend not sending queryHistory/savedQueries  
**Fix**: Hard refresh browser (Ctrl+Shift+R)

### **Issue 4: AI gives generic responses**
**Cause**: Backend server not restarted after code changes  
**Fix**: 
```powershell
# Kill existing node processes
Get-Process node | Stop-Process -Force

# Restart backend
cd c:\Users\shiva\DevLab\DevQuery.mongodb\auth-backend
node server.js
```

---

## ✅ Success Criteria

You'll know it's working when:

✅ AI can list your recent queries  
✅ AI can identify failed queries  
✅ AI can show saved queries  
✅ AI can re-run queries from history  
✅ AI references specific timestamps  
✅ Backend logs show query/saved counts  

---

## 🎯 Quick Commands for Testing

### **Test Query History**
```
"what queries have I run?"
"show my recent queries"
"what was my last query?"
"re-run the last query"
```

### **Test Saved Queries**
```
"show my saved queries"
"list my bookmarked queries"
"run my saved query about X"
"do I have any saved queries?"
```

### **Test Failure Detection**
```
"what queries failed?"
"show me errors in my query history"
"which queries didn't work?"
```

### **Test Combined Intelligence**
```
"re-run my last successful query"
"show queries I ran in the last hour"
"which of my saved queries ran most recently?"
```

---

**Happy Testing! 🚀**

If everything works, the chatbot should feel much smarter and more aware of your workflow!
