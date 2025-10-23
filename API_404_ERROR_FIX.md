# 🔧 FIX GUIDE - API 404 Errors

## Problem
Getting 404 errors when calling whitelist API endpoints:
```
:5000/api/whitelist/68ebe0aae42af621d1be695e_65e0865379e376e8f4fa4d8f4e400c43:1  
Failed to load resource: the server responded with a status of 404 (Not Found)
```

---

## Root Causes

### 1. ⚡ Backend Server Not Restarted
After adding new routes, the backend server needs to be restarted to load them.

### 2. 🔑 Missing Authentication Token
The frontend must send a valid JWT token in the Authorization header.

### 3. 🌐 API Base URL Mismatch
Frontend and backend must use the same port/URL.

---

## ✅ SOLUTION STEPS

### Step 1: Stop Backend Server
```bash
# If running in terminal, press Ctrl+C
```

### Step 2: Verify Routes are Registered
Check `auth-backend/server.js`:
```javascript
// Line 15: Import statement
const whitelistRoutes = require('./src/routes/whitelistRoutes');

// Line 64: Register routes
app.use('/api/whitelist', whitelistRoutes);
```

✅ Both should be present

### Step 3: Restart Backend Server
```bash
cd auth-backend
npm start
# OR
node server.js
```

You should see:
```
🚀 DevQuery MongoDB API running at http://localhost:5000
💊 Health Check: http://localhost:5000/health
📖 API Docs: http://localhost:5000/api
```

### Step 4: Verify Routes are Available
Open browser and visit:
```
http://localhost:5000/api
```

Look for "whitelist" section with all endpoints listed. ✅

### Step 5: Verify Authentication
Make sure frontend is logged in:
1. Go to login page
2. Enter credentials
3. After login, token should be in localStorage

Check in browser DevTools:
```javascript
// Open Console and type:
localStorage.getItem('token')
// Should return a long JWT token string
```

### Step 6: Clear Browser Cache
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
// Then log in again
```

### Step 7: Retry API Call
Try the whitelist operation again. Should now work! ✅

---

## 🧪 Testing the Fix

### Test 1: Check Backend is Running
```bash
curl http://localhost:5000/health
# Should return: {"success": true, "message": "DevQuery MongoDB API is running", ...}
```

### Test 2: Check API Docs Updated
```bash
curl http://localhost:5000/api | grep whitelist
# Should show whitelist endpoints
```

### Test 3: Test Whitelist Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/whitelist/CONNECTION_ID
# Should return whitelist config or error (not 404)
```

### Test 4: Frontend Test
1. Open DevTools → Network tab
2. Click whitelist button
3. Look for `/api/whitelist/*` request
4. Check:
   - Status should be 200 or 401 (not 404)
   - Request headers should have "Authorization: Bearer"
   - Response should be JSON

---

## 🚨 Common Issues & Fixes

### Issue 1: Still Getting 404 After Restart
**Solution:**
```javascript
// Check server.js has:
app.use('/api/whitelist', whitelistRoutes);  // Must be BEFORE catch-all 404
app.use('*', (req, res) => { ... });         // Catch-all must be LAST
```

The whitelist routes must be registered BEFORE the catch-all `app.use('*', ...)` middleware.

### Issue 2: Getting 401 (Unauthorized)
**Solution:**
This is actually GOOD! It means:
- ✅ Route is found
- ⚠️ Authentication token is missing/invalid

Fix:
1. Make sure you're logged in
2. Check `localStorage.getItem('token')` returns a token
3. Try logging out and logging back in

### Issue 3: Token Not Persisting
**Solution:**
Check that api.js has the interceptor:
```javascript
// In frontend/src/utils/api.js
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;  // ← Must be set
    }
    return config;
  },
  ...
);
```

### Issue 4: CORS Errors
**Solution:**
Check server.js CORS config includes your frontend URL:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5000',   // ← Frontend URL
    'http://localhost:5173',   // ← Vite dev server
    ...
  ],
  credentials: true
}));
```

---

## ✅ Verification Checklist

- [ ] Backend server running on port 5000
- [ ] Routes imported in server.js
- [ ] Routes registered with `app.use('/api/whitelist', ...)`
- [ ] Registration is BEFORE `app.use('*', ...)` catch-all
- [ ] Frontend logged in with valid token
- [ ] Token in localStorage (check DevTools)
- [ ] API interceptor adds Authorization header
- [ ] CORS allows frontend URL
- [ ] Browser cache cleared
- [ ] Whitelist routes show in /api endpoint docs

---

## 📊 Network Request Debugging

### Open DevTools Network Tab
1. Right-click → Inspect → Network tab
2. Clear history
3. Click whitelist button
4. Look for requests starting with `/api/whitelist/`

### Check Request Details
- **Status**: Should be 200 or 401 (not 404)
- **Headers**: Should have "Authorization: Bearer {token}"
- **Response**: Should be JSON, not HTML error page

### Check Response
Click on the request to see response:
```json
{
  "success": true,
  "data": {
    "connectionId": "...",
    "enabled": false,
    "tables": {},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## 🔄 Full Restart Procedure

If all else fails, do a full restart:

```bash
# 1. Stop everything
# Press Ctrl+C in all terminals

# 2. Clear caches
cd frontend
rm -rf node_modules/.cache
cd ../auth-backend
rm -rf node_modules/.cache

# 3. Clear browser cache
# DevTools → Clear localStorage
# DevTools → Clear sessionStorage

# 4. Restart backend
cd auth-backend
npm start
# Wait for: "🚀 DevQuery MongoDB API running..."

# 5. Restart frontend (in another terminal)
cd frontend
npm run dev
# Wait for: "VITE ... Local: http://localhost:5173"

# 6. Test
# Open http://localhost:5173
# Login
# Try whitelist feature
```

---

## 📞 Still Having Issues?

### Check These Files
1. **backend/server.js** - Line 15 & 64 (routes)
2. **frontend/utils/api.js** - Interceptor present?
3. **routes/whitelistRoutes.js** - Correct syntax?
4. **controllers/whitelistController.js** - Methods exist?

### Check Logs
Backend logs should show:
```
GET /api/whitelist/:connectionId - 127.0.0.1
POST /api/whitelist/:connectionId/enable - 127.0.0.1
```

If no logs, request isn't reaching backend = routing issue

---

## ✨ Expected Results After Fix

### Before
```
❌ :5000/api/whitelist/... 404 (Not Found)
❌ No Authorization header sent
❌ Cannot open whitelist modal
```

### After
```
✅ :5000/api/whitelist/... 200 OK (or 401 if token invalid)
✅ Authorization: Bearer {token} in headers
✅ Whitelist modal opens and loads data
✅ Can enable/disable, add tables, manage columns
```

---

## 🎯 Summary

The 404 errors are fixed by:

1. ✅ **Restarting backend** - Load new routes
2. ✅ **Logging in** - Get valid token
3. ✅ **Clearing cache** - Remove stale data
4. ✅ **Verifying routes** - Check server.js
5. ✅ **Testing endpoints** - Confirm they work

After these steps, all whitelist features should work perfectly!
