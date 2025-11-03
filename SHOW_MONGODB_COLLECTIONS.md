# 🍃 How to See Your MongoDB Collections in Schema Explorer

## ✅ Current Status
- ✅ Backend running on http://localhost:5000
- ✅ Frontend running on http://localhost:5173
- ✅ CORS configured correctly
- ✅ MongoDB schema adapter ready

## 🚀 Steps to See Collections

### Step 1: Open DevQuery UI
Navigate to: **http://localhost:5173**

### Step 2: Connect to MongoDB

1. **Click "Add Connection"** button (top right or in dashboard)

2. **Select Database Type**: Choose **🍃 MongoDB** from the dropdown

3. **Enter Connection String**: 
   ```
   mongodb://localhost:27017/your_database_name
   ```
   
   **Common formats:**
   - Local MongoDB: `mongodb://localhost:27017/testdb`
   - With auth: `mongodb://username:password@localhost:27017/mydb`
   - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/mydb`
   - Specific host: `mongodb://192.168.1.100:27017/productiondb`

4. **Click "Connect"**

### Step 3: See Collections Automatically

After connecting, you should see:
- ✅ Green **"MONGODB"** badge in connection info
- ✅ **"Collections"** button (not "Tables")
- ✅ Green leaf icon 🍃
- ✅ List of all collections with field counts
- ✅ Click any collection to see its fields and types

## 🎨 Visual Indicators

### When MongoDB is Connected:
- **Badge Color**: Green gradient (#00ed64)
- **Icon**: 🍃 Leaf icon (instead of plug)
- **Button Text**: "Collections" (not "Tables")
- **Search Placeholder**: "Search collections or fields"
- **Hover Effect**: Green border on collections

### When SQL Database is Connected:
- **Badge Color**: Blue gradient (#6366f1)
- **Icon**: 🔌 Plug icon
- **Button Text**: "Tables"
- **Search Placeholder**: "Search tables or columns"

## 🔧 Troubleshooting

### Collections Not Showing?

**1. Check MongoDB is Running**
```powershell
# Start MongoDB
mongod

# Or check if it's running
Get-Process mongod -ErrorAction SilentlyContinue
```

**2. Verify Database Has Collections**
```bash
# Connect to MongoDB shell
mongo your_database_name

# List collections
show collections

# Or
db.getCollectionNames()
```

**3. Check Browser Console (F12)**
- Look for any red errors
- Check Network tab for failed requests
- Verify the schema endpoint is being called

**4. Verify Connection String**
- Correct format: `mongodb://host:port/database`
- Database name must exist
- Check credentials if using authentication

**5. Try Refreshing Schema**
- Click the "Refresh" button in Schema Explorer
- Or disconnect and reconnect

**6. Check Backend Logs**
```powershell
# Check logs directory
cat c:\Users\shiva\DevLab\DevQuery.mongodb\auth-backend\logs\combined.log
```

### CORS Errors?

If you see CORS errors:
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
1. Backend has been updated with proper CORS configuration
2. Restart backend: Stop and run `npm start` in auth-backend folder
3. Hard refresh browser: Ctrl + Shift + R

### No Data Showing?

If collections appear but are empty:
- Database might not have any documents
- Add sample data to test:

```javascript
// In MongoDB shell
use testdb
db.users.insertMany([
  { name: "Alice", age: 30, role: "admin" },
  { name: "Bob", age: 25, role: "user" },
  { name: "Charlie", age: 35, role: "moderator" }
])
```

Then refresh schema in DevQuery.

## 📊 Sample MongoDB Connection

### Local MongoDB Example:
```
Connection String: mongodb://localhost:27017/testdb
Database Type: MongoDB
```

After connecting, you'll see collections like:
- `users` (3 fields)
- `products` (5 fields)
- `orders` (8 fields)

Click any collection to see field details with types and sample values.

## 🎯 Expected Schema Explorer Behavior

### For MongoDB:
```
╔════════════════════════════════╗
║  🍃 MONGODB                    ║
║  Connected: testdb             ║
╠════════════════════════════════╣
║  Collections                   ║
║  🔍 Search collections...      ║
║                                ║
║  📚 users (3 fields)           ║
║  📚 products (5 fields)        ║
║  📚 orders (8 fields)          ║
╚════════════════════════════════╝
```

### Click Collection → See Fields:
```
Collection: users
┌─────────────┬──────────┬──────────┬──────────────┐
│ Field       │ Type     │ Nullable │ Sample Value │
├─────────────┼──────────┼──────────┼──────────────┤
│ _id         │ ObjectId │ false    │ 507f1f77...  │
│ name        │ String   │ true     │ "Alice"      │
│ age         │ Number   │ true     │ 30           │
│ role        │ String   │ true     │ "admin"      │
└─────────────┴──────────┴──────────┴──────────────┘
```

## 🔥 Quick Test

**Want to test immediately?**

1. **Start a local MongoDB:**
   ```powershell
   mongod
   ```

2. **Add sample data:**
   ```javascript
   // In new terminal
   mongo
   use testdb
   db.users.insert({ name: "Test User", email: "test@example.com" })
   ```

3. **Connect in DevQuery:**
   - Connection String: `mongodb://localhost:27017/testdb`
   - Type: MongoDB
   - Click Connect

4. **See "users" collection appear in Schema Explorer!** 🎉

## 💡 Pro Tips

1. **Multiple Connections**: You can connect to both MongoDB and SQL databases simultaneously

2. **Search Works**: Use the search bar to filter collections or fields

3. **Sample Values**: MongoDB adapter samples first 25 documents to infer field types

4. **Nested Fields**: Nested objects show as `user.address.city`

5. **Array Fields**: Arrays show as `items[0].name`

6. **Type Detection**: If a field has multiple types across documents, it shows as `String | Number`

## 📚 Documentation

- Main guide: `HOW_TO_CONNECT_MONGODB.md`
- Quick reference: `MONGODB_QUICK_REFERENCE.md`
- UI features: `MONGODB_UI_GUIDE.md`
- Technical details: `TEST_MONGODB_SUPPORT.md`

## ❓ Still Having Issues?

Check:
1. ✅ Backend running: http://localhost:5000/health
2. ✅ Frontend running: http://localhost:5173
3. ✅ MongoDB running: `Get-Process mongod`
4. ✅ Database exists and has data
5. ✅ Connection string is correct
6. ✅ No firewall blocking port 27017

**Last Resort:**
- Restart backend: Stop Node and run `npm start`
- Clear browser cache: Ctrl + Shift + Delete
- Check backend logs in `auth-backend/logs/`
- Look for green MONGODB badge after connecting

---

**Ready?** Open http://localhost:5173 and connect to MongoDB! 🚀
