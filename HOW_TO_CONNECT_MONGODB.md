# 🔌 How to Connect MongoDB and See Collections

## Quick Setup Guide

### Step 1: Make Sure MongoDB is Running

**Option A - Local MongoDB:**
```powershell
# Check if MongoDB is running
Get-Service MongoDB
# OR
mongod --version

# If not running, start it
mongod
```

**Option B - MongoDB Atlas (Cloud):**
- Go to [MongoDB Atlas](https://cloud.mongodb.com)
- Get your connection string from the cluster dashboard
- Format: `mongodb+srv://username:password@cluster.mongodb.net/database`

### Step 2: Start DevQuery Backend

```powershell
# Navigate to backend
cd c:\Users\shiva\DevLab\DevQuery.mongodb\auth-backend

# Install dependencies (if not done)
npm install

# Start the server
npm start
```

**Backend should start on:** `http://localhost:5000`

### Step 3: Start DevQuery Frontend

```powershell
# Open new terminal
cd c:\Users\shiva\DevLab\DevQuery.mongodb\frontend

# Install dependencies (if not done)
npm install

# Start frontend
npm run dev
```

**Frontend should open at:** `http://localhost:5173` (or similar)

### Step 4: Connect to MongoDB via UI

1. **Open DevQuery** in your browser (http://localhost:5173)

2. **Login** (if not already logged in)

3. **Click "Add Connection"** button in the sidebar

4. **Fill in Connection Details:**

   **Option A - Using Connection String (Easiest):**
   ```
   Connection String: mongodb://localhost:27017/testdb
   Database Type: MongoDB (auto-detected)
   ```

   **Option B - Individual Fields:**
   ```
   Database Type: MongoDB
   Host: localhost
   Port: 27017
   Database Name: testdb (your database name)
   Username: (if auth enabled)
   Password: (if auth enabled)
   ```

5. **Click "Connect"**

6. **Wait for Success** ✅
   - You should see a green notification
   - Connection appears in the sidebar

### Step 5: View Collections in Schema Explorer

Once connected:

1. **Schema Explorer will auto-load** your MongoDB collections
2. You should see:
   - Title changes to **"Collections"** (not "Tables")
   - Search box says **"Search collections or fields"**
   - MongoDB leaf icon 🍃 instead of plug icon
   - Green **"MONGODB"** badge showing database type
   - List of all your collections with field counts

3. **Click on any collection** to see its fields:
   - Field names (sampled from 25 documents)
   - Data types (detected from samples)
   - Sample values
   - All MongoDB-specific styling

## Expected UI Changes for MongoDB

### When Connected to MongoDB, You'll See:

✅ **Schema Explorer Header:**
- "Browse **collections**, inspect **fields**..." (not tables/columns)
- Search: "Search collections or fields"
- Button: "**Collections**" with layer icon (not "Tables")
- MongoDB leaf icon 🍃

✅ **Connection Info:**
- Green **MONGODB** badge
- "Loading collections..." message

✅ **Collections List:**
- Layer group icons for each collection
- Green hover effect (MongoDB brand color)
- "{n} fields" label (not "columns")

✅ **Collection Details:**
- Header says "**Field**" not "Column"
- "**Sample Value**" header
- All your MongoDB document fields listed

## Troubleshooting

### "No collections found"

**Check:**
1. MongoDB is running: `mongo --eval "db.version()"`
2. Database has collections: `mongo testdb --eval "db.getCollectionNames()"`
3. Connection string is correct
4. Database name exists

**Fix:**
```powershell
# Connect to mongo shell
mongo

# Use your database
use testdb

# Create a test collection
db.testCollection.insertOne({name: "Test", value: 123})

# Verify it exists
db.getCollectionNames()
```

### "Connection failed"

**Check:**
1. Backend is running on port 5000
2. MongoDB is accessible: `mongo mongodb://localhost:27017/testdb`
3. No firewall blocking port 27017
4. Credentials are correct (if auth enabled)

**Test Backend:**
```powershell
# Test if backend can reach MongoDB
curl http://localhost:5000/api/database/test
```

### "Schema Explorer shows 'No schema information available'"

**Solutions:**
1. Click **"Refresh Schema"** button
2. Run a query first (to trigger schema fetch)
3. Check browser console for errors (F12)
4. Check backend logs in `auth-backend/logs/`

### "Still shows 'Tables' instead of 'Collections'"

**This means:**
- Frontend didn't detect MongoDB connection
- Database type not set correctly

**Fix:**
1. Disconnect and reconnect
2. Make sure "Database Type" is set to "MongoDB"
3. Refresh the page
4. Check `dbConnection.dbType` in browser console:
   ```javascript
   // Open browser console (F12)
   // Check if connection has correct type
   localStorage.getItem('devquery.connection')
   ```

## Testing Your Connection

### Quick Test Queries

Once connected, go to **Query tab** and try:

```javascript
// Find all documents in a collection
db.yourCollection.find({}).limit(10)

// Count documents
db.yourCollection.countDocuments({})

// Group by field
db.yourCollection.aggregate([
  {$group: {_id: "$fieldName", count: {$sum: 1}}}
])
```

### Expected Response:

- ✅ Results appear in table format
- ✅ Execution time shown
- ✅ Row count displayed
- ✅ MongoDB query syntax accepted

## Sample MongoDB Setup

If you don't have data yet:

```powershell
# Connect to mongo shell
mongo

# Create test database
use devquery_test

# Insert sample data
db.users.insertMany([
  {name: "John Doe", age: 30, city: "New York", active: true},
  {name: "Jane Smith", age: 25, city: "San Francisco", active: true},
  {name: "Bob Johnson", age: 35, city: "Chicago", active: false}
])

db.products.insertMany([
  {name: "Laptop", price: 999, category: "Electronics", stock: 50},
  {name: "Mouse", price: 25, category: "Electronics", stock: 200},
  {name: "Desk", price: 300, category: "Furniture", stock: 30}
])

# Verify
db.getCollectionNames()
# Should show: ["users", "products"]

db.users.count()
# Should show: 3

db.products.count()
# Should show: 3
```

Now connect to `devquery_test` database and you should see:
- ✅ 2 collections: `users`, `products`
- ✅ Each with their fields
- ✅ Sample values from documents

## Connection String Examples

### Local MongoDB:
```
mongodb://localhost:27017/mydb
```

### MongoDB with Auth:
```
mongodb://username:password@localhost:27017/mydb
```

### MongoDB Atlas:
```
mongodb+srv://username:password@cluster0.mongodb.net/mydb
```

### MongoDB Replica Set:
```
mongodb://localhost:27017,localhost:27018,localhost:27019/mydb?replicaSet=rs0
```

## Verify Everything is Working

### Checklist:

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] MongoDB running on port 27017
- [ ] Database exists with collections
- [ ] Connected via DevQuery UI
- [ ] See "Collections" button (not "Tables")
- [ ] See MongoDB green badge
- [ ] Collections list appears
- [ ] Can click collection to see fields
- [ ] Can execute MongoDB queries

## Summary

**To see your MongoDB collections:**

1. ✅ **Backend ready** - `npm start` in `auth-backend/`
2. ✅ **Frontend ready** - `npm run dev` in `frontend/`
3. ✅ **MongoDB running** - Local or Atlas
4. ✅ **Connect via UI** - Use connection modal
5. ✅ **Schema loads** - Collections appear automatically
6. ✅ **UI adapts** - Shows "Collections", MongoDB badge, green styling

**The Schema Explorer will automatically show "Collections" instead of "Tables" when connected to MongoDB!** 🎉

---

Need help? Check:
- Backend logs: `auth-backend/logs/combined.log`
- Browser console: Press F12
- MongoDB logs: Check mongod output
