# 🧪 Testing Whitelist Authentication Endpoints

## ⚡ Quick Test (Before You Restart)

Test the endpoints directly with your authentication token:

### Step 1: Get Your Auth Token
1. Login to DevQuery in your browser
2. Open DevTools (F12)
3. Go to **Network** tab
4. Find any request to backend
5. Look in **Request Headers** for: `Authorization: Bearer YOUR_TOKEN_HERE`
6. Copy the token (without "Bearer " prefix)

### Step 2: Test Re-authenticate Endpoint

**Using PowerShell:**
```powershell
$headers = @{
  'Authorization' = 'Bearer YOUR_TOKEN_HERE'
  'Content-Type' = 'application/json'
}

$body = @{
  email = 'your-email@example.com'
  password = 'your-password'
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/re-authenticate' `
  -Method POST `
  -Headers $headers `
  -Body $body | Select-Object -ExpandProperty Content
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Re-authentication successful"
}
```

**Expected Response (Wrong Password):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Step 3: Test Whitelist Endpoint

**Using PowerShell:**
```powershell
$headers = @{
  'Authorization' = 'Bearer YOUR_TOKEN_HERE'
  'Content-Type' = 'application/json'
}

Invoke-WebRequest -Uri 'http://localhost:5000/api/whitelist/CONNECTION_ID' `
  -Method GET `
  -Headers $headers | Select-Object -ExpandProperty Content
```

Replace `CONNECTION_ID` with actual connection ID from DevQuery UI.

---

## 🔍 Troubleshooting

### Error: "Endpoint not found (404)"
- ✅ Backend server needs to be restarted
- ✅ Files were changed, Express needs to reload routes

**Solution:**
```bash
# Stop the backend server (Ctrl+C)
# Then restart:
npm start
```

### Error: "Unauthorized (401)"
- ✅ Token is missing or expired
- ✅ Token is invalid

**Solution:**
- Logout and login again to get fresh token
- Verify token is in Authorization header
- Check token format: `Bearer eyJhbG...`

### Error: "Invalid credentials"
- ✅ Email doesn't match logged-in user
- ✅ Password is incorrect

**Solution:**
- Use email you're logged in with
- Use correct password
- Check CAPS LOCK

---

## 📋 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Logs In                                             │
│    - Email: user@example.com                                │
│    - Password: password123                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend Creates Session                                  │
│    - Returns: Authorization Token                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. User Clicks 🔐 Whitelist Button                           │
│    - WhitelistManager modal opens                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User Enters Login Password                               │
│    - Clicks "Verify Password"                               │
│    - Sends: POST /api/auth/re-authenticate                  │
│             + Auth Token (header)                           │
│             + Email & Password (body)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend Re-authenticates                                 │
│    - Verifies token (user is logged in)                     │
│    - Verifies email matches current user                    │
│    - Attempts login with provided password                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
               ┌───────────┴───────────┐
               ✅                      ❌
         Password Valid           Password Invalid
               ↓                      ↓
         ┌──────────────┐    ┌─────────────────┐
         │ Returns      │    │ Returns Error   │
         │ success:true │    │ success:false   │
         └──────────────┘    └─────────────────┘
               ↓                      ↓
         ┌──────────────┐    ┌─────────────────┐
         │ Enable       │    │ Show Error      │
         │ Whitelist    │    │ Message         │
         │ Controls     │    └─────────────────┘
         └──────────────┘
               ↓
         ┌──────────────────────────────────────┐
         │ User Can Now Edit Permissions:       │
         │ - Add/Remove Tables                  │
         │ - Allow/Restrict Columns             │
         │ - Export/Import Configs              │
         └──────────────────────────────────────┘
```

---

## ✅ Verification Checklist

After restarting backend, verify:

- [ ] Backend started without errors
- [ ] No "Cannot find module" errors
- [ ] No "Route not found" in logs
- [ ] Can call `/api/auth/re-authenticate` successfully
- [ ] Can call whitelist endpoints with token
- [ ] WhitelistManager shows on frontend
- [ ] Password verification works
- [ ] Can enable whitelist
- [ ] Can add tables
- [ ] Can restrict columns

---

## 🚀 Commands to Restart Backend

**From DevQuery.mongodb directory:**

```bash
# Navigate to backend
cd auth-backend

# Stop if running (Ctrl+C in the terminal running it)
# or in new terminal:

# Restart
npm start

# You should see:
# ✓ Server running on port 5000
# ✓ MongoDB connected
# ✓ Routes registered
```

---

## 💡 Debug Mode (If Still Having Issues)

**Add temporary logging to authController.js:**

```javascript
const reAuthenticate = async (req, res) => {
  try {
    console.log('🔍 reAuthenticate called');
    console.log('📧 Email:', req.body.email);
    console.log('👤 Current user:', req.user?.id);
    
    // ... rest of code ...
    
  } catch (error) {
    console.error('❌ reAuthenticate error:', error);
    // ... error handling ...
  }
};
```

Then check backend terminal for debug messages when you test.

---

## 🎯 Next Steps

1. **Restart backend** - This is the most critical step
2. **Reload frontend** - Clear cache and refresh browser
3. **Test password verification** - Click whitelist, enter password
4. **If error persists** - Check browser console (F12) for exact error message
5. **Share the error** - If still failing, share the exact error from browser console

---

All endpoints are ready! Just restart and test! 🚀
