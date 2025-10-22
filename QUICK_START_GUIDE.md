# Quick Start Guide - AI Read & Write Operations

## 🚀 Quick Setup (5 minutes)

### Step 1: Set Admin Password
Edit `.env` file in `auth-backend` directory:

```bash
# .env
WHITELIST_ADMIN_PASSWORD=YourSecurePassword123!
```

**Default password** (if not set): `default-secure-password`

### Step 2: Restart Backend Server
```bash
cd DevQuery/auth-backend
npm start
```

### Step 3: Test in Frontend
Open Dashboard → Click "🔐 Manage AI Whitelist"

---

## 📋 Quick Usage Scenarios

### Scenario 1: AI with FULL ACCESS (No Restrictions)
**Setup:**
1. Open "🔐 Manage AI Whitelist"
2. Enter admin password
3. Leave "Whitelist" **DISABLED**

**Result:**
- ✅ AI can read any table
- ✅ AI can write to any table
- ✅ All writes require user confirmation

---

### Scenario 2: AI with RESTRICTED ACCESS
**Setup:**
1. Open "🔐 Manage AI Whitelist"
2. Enter admin password
3. **Enable Whitelist**
4. Add tables:
   - `users` → Columns: `id, name, email`
   - `products` → Columns: (leave empty for all)

**Result:**
- ✅ AI can only access `users` and `products` tables
- ✅ In `users`: only `id`, `name`, `email` columns
- ✅ In `products`: all columns
- ❌ AI cannot access `orders`, `inventory`, etc.

---

### Scenario 3: AI ANALYTICS ONLY (Read-Only)
**Setup:**
1. Use your DB client to revoke write permissions from AI user
2. Whitelist disabled (or enabled)

**Result:**
- ✅ AI can read from any table
- ❌ AI cannot insert/update/delete

---

## 🔐 User Workflows

### For Database Admin
```
1. Enable Whitelist
2. Add tables you trust AI to modify
3. For sensitive tables: add only specific columns
4. Share admin password securely with team leads
```

### For Regular User
```
1. Ask AI to analyze/modify data
2. AI generates SQL and requests confirmation
3. Review the SQL query
4. Click "Confirm & Execute"
5. Changes applied immediately
```

---

## 📊 API Examples

### Get Current Whitelist
```bash
curl http://localhost:3000/api/database/whitelist/CONN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check If Admin Password is Correct
```bash
curl -X POST http://localhost:3000/api/database/whitelist/CONN_ID/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password": "YourSecurePassword123!"}'
```

### Add Table to Whitelist
```bash
curl -X POST http://localhost:3000/api/database/whitelist/CONN_ID/table \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "YourSecurePassword123!",
    "tableName": "users",
    "allowedColumns": ["id", "name", "email"]
  }'
```

### Execute Write Operation
```bash
curl -X POST http://localhost:3000/api/assistant/confirm-write \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "connectionId": "CONN_ID",
    "sql": "INSERT INTO users (name, email) VALUES ('\''John'\'', '\''john@test.com'\'')",
    "confirmed": true
  }'
```

---

## 💡 Common Tasks

### Change Admin Password
1. Stop server
2. Edit `.env`: `WHITELIST_ADMIN_PASSWORD=NewPassword123!`
3. Restart server

### Allow AI to Write to New Table
1. Open "🔐 Manage AI Whitelist"
2. Enter password
3. Click "+ Add Table"
4. Enter table name and columns
5. Click "Add Table"

### Prevent AI from Writing to Sensitive Column
1. Open "🔐 Manage AI Whitelist"
2. Enter password
3. Click on the table
4. Find the column (e.g., "password", "salary")
5. Click ✕ next to the column name

### Disable All AI Writes (But Allow Reads)
1. Open "🔐 Manage AI Whitelist"
2. Enter password
3. Click "Disable Whitelist"
4. Configure read-only database user for AI

### Export Whitelist Configuration
```bash
curl http://localhost:3000/api/database/whitelist/CONN_ID/export \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Import Whitelist Configuration
```bash
curl -X POST http://localhost:3000/api/database/whitelist/CONN_ID/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "YourSecurePassword123!",
    "configuration": {
      "enabled": true,
      "tables": {
        "users": {"allowed": true, "columns": {"id": true, "name": true}},
        "products": {"allowed": true, "columns": {}}
      }
    }
  }'
```

---

## ⚠️ Important Notes

1. **Default Behavior**: Whitelist is DISABLED
   - AI has full read/write access
   - All writes require user confirmation
   - Safe default for getting started

2. **Empty Whitelist is Same as Disabled**
   - If enabled but no tables added = same as disabled

3. **User Confirmation is Always Required**
   - Even with full access, all writes need approval
   - User sees SQL before execution

4. **Password Reset**
   - Only via `.env` file modification
   - Restart required
   - No "forgot password" option

5. **Column Names are Case-Sensitive**
   - Add columns exactly as they appear in database
   - Test first if unsure

---

## 🐛 Troubleshooting

### Q: Write operation rejected even though table is whitelisted
**A:** Check if column is in whitelist
```bash
# Get whitelist to see columns
curl http://localhost:3000/api/database/whitelist/CONN_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q: "Invalid admin password" error
**A:** Verify password matches `.env`:
```bash
# Check your .env file
cat auth-backend/.env | grep WHITELIST_ADMIN_PASSWORD
```

### Q: AI not suggesting write operations
**A:** Make sure table is whitelisted
```bash
# Disable whitelist for testing
# Or add table to whitelist
```

### Q: How to see operation history?
**A:** Check server logs
```bash
# Backend logs show all whitelist changes
cat auth-backend/logs/combined.log | grep -i whitelist
cat auth-backend/logs/combined.log | grep -i "write operation"
```

---

## 📚 File Locations

- **Frontend Whitelist Manager**: `frontend/src/components/WhitelistManager.jsx`
- **Frontend Write Confirmation**: `frontend/src/components/WriteConfirmation.jsx`
- **Backend Whitelist Model**: `auth-backend/src/models/WhitelistManager.js`
- **Backend Whitelist API**: `auth-backend/src/controllers/whitelistController.js`
- **Documentation**: `READ_WRITE_SYSTEM_DOCUMENTATION.md`

---

## ✅ Checklist

- [ ] Set `WHITELIST_ADMIN_PASSWORD` in `.env`
- [ ] Restart backend server
- [ ] Open frontend dashboard
- [ ] Click "🔐 Manage AI Whitelist" button
- [ ] Enter admin password
- [ ] Test by requesting AI to write data
- [ ] Review and confirm write operation
- [ ] Check database for successful write

---

## 🎯 Next Steps

1. **Test Read Operations**: Ask AI to query data
2. **Test Write Operations**: Ask AI to insert/update data
3. **Configure Whitelist**: Add tables and columns as needed
4. **Share Password**: Give admin password to team
5. **Monitor Usage**: Check logs for all operations

---

## Need Help?

See `READ_WRITE_SYSTEM_DOCUMENTATION.md` for complete technical documentation.

All files are ready to use - no additional configuration needed! 🚀
