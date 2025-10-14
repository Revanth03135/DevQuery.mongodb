# Postman Testing Collection - DevQuery API

## 🔐 Authentication Header (Required for all protected routes)

```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json
```

---

## 1️⃣ Generate Query (POST)

**Endpoint:** `http://localhost:5000/api/queries/generate`

**Request Body:**

```json
{
  "prompt": "Get all users from the database",
  "queryType": "mongodb"
}
```

**Alternative Test Cases:**

```json
{
  "prompt": "Find all users who registered in the last 30 days",
  "queryType": "mongodb"
}
```

```json
{
  "prompt": "Count total number of active users grouped by country",
  "queryType": "aggregation"
}
```

```json
{
  "prompt": "Select all products where price is greater than 100",
  "queryType": "sql"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "67abc123...",
    "userId": "67def456...",
    "title": "Get all users from the database",
    "naturalLanguage": "Get all users from the database",
    "generatedQuery": "db.users.find({})",
    "queryType": "mongodb",
    "isFavorite": false,
    "tags": [],
    "executionCount": 0,
    "createdAt": "2025-10-15T...",
    "updatedAt": "2025-10-15T..."
  }
}
```

---

## 2️⃣ Explain Query (POST)

**Endpoint:** `http://localhost:5000/api/queries/explain`

**Request Body:**

```json
{
  "query": "db.users.find({ createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } })"
}
```

**Alternative Test Cases:**

```json
{
  "query": "db.products.aggregate([{ $match: { price: { $gt: 100 } } }, { $group: { _id: '$category', total: { $sum: 1 } } }])"
}
```

```json
{
  "query": "SELECT * FROM users WHERE email LIKE '%@gmail.com' ORDER BY created_at DESC"
}
```

**Expected Response:**

```json
{
  "success": true,
  "explanation": "This query finds all users who were created within the last 30 days by comparing the createdAt field to a date 30 days ago from now."
}
```

---

## 3️⃣ Optimize Query (POST)

**Endpoint:** `http://localhost:5000/api/queries/optimize`

**Request Body:**

```json
{
  "query": "db.users.find({ email: 'test@example.com' })"
}
```

**Alternative Test Cases:**

```json
{
  "query": "db.orders.find({ userId: '12345', status: 'pending' }).sort({ createdAt: -1 })"
}
```

```json
{
  "query": "SELECT * FROM products WHERE category = 'electronics' AND price > 500"
}
```

**Expected Response:**

```json
{
  "success": true,
  "optimization": "1. Create an index on the email field for faster lookups\n2. Use findOne() instead of find() since email is unique\n3. Add projection to select only needed fields"
}
```

---

## 4️⃣ Get All User Queries (GET)

**Endpoint:** `http://localhost:5000/api/queries`

**No Request Body Required**

**Expected Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "67abc123...",
      "userId": "67def456...",
      "title": "Get all users",
      "naturalLanguage": "Get all users from the database",
      "generatedQuery": "db.users.find({})",
      "queryType": "mongodb",
      "isFavorite": false,
      "tags": [],
      "executionCount": 3,
      "createdAt": "2025-10-15T...",
      "updatedAt": "2025-10-15T..."
    }
  ]
}
```

---

## 5️⃣ Get Favorite Queries (GET)

**Endpoint:** `http://localhost:5000/api/queries/favorites`

**No Request Body Required**

**Expected Response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "67abc123...",
      "userId": "67def456...",
      "title": "Complex aggregation query",
      "naturalLanguage": "Count users by country",
      "generatedQuery": "db.users.aggregate([...])",
      "queryType": "aggregation",
      "isFavorite": true,
      "tags": ["analytics", "reporting"],
      "executionCount": 15,
      "createdAt": "2025-10-15T...",
      "updatedAt": "2025-10-15T..."
    }
    // ... more favorite queries
  ]
}
```

---

## 6️⃣ Get Query by ID (GET)

**Endpoint:** `http://localhost:5000/api/queries/:id`

**Example:** `http://localhost:5000/api/queries/67abc123def456ghi789`

**No Request Body Required**

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "67abc123...",
    "userId": "67def456...",
    "title": "Get all users",
    "naturalLanguage": "Get all users from the database",
    "generatedQuery": "db.users.find({})",
    "queryType": "mongodb",
    "isFavorite": false,
    "tags": [],
    "executionCount": 3,
    "createdAt": "2025-10-15T...",
    "updatedAt": "2025-10-15T..."
  }
}
```

---

## 7️⃣ Update Query (PUT)

**Endpoint:** `http://localhost:5000/api/queries/:id`

**Example:** `http://localhost:5000/api/queries/67abc123def456ghi789`

**Request Body:**

```json
{
  "title": "Updated: Get all active users",
  "isFavorite": true,
  "tags": ["users", "active", "important"]
}
```

**Alternative Test Cases:**

```json
{
  "isFavorite": true
}
```

```json
{
  "tags": ["analytics", "reporting", "dashboard"]
}
```

```json
{
  "title": "Monthly Active Users Query",
  "tags": ["MAU", "metrics"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "67abc123...",
    "userId": "67def456...",
    "title": "Updated: Get all active users",
    "naturalLanguage": "Get all users from the database",
    "generatedQuery": "db.users.find({})",
    "queryType": "mongodb",
    "isFavorite": true,
    "tags": ["users", "active", "important"],
    "executionCount": 3,
    "createdAt": "2025-10-15T...",
    "updatedAt": "2025-10-15T..."
  }
}
```

---

## 8️⃣ Delete Query (DELETE)

**Endpoint:** `http://localhost:5000/api/queries/:id`

**Example:** `http://localhost:5000/api/queries/67abc123def456ghi789`

**No Request Body Required**

**Expected Response:**

```json
{
  "success": true,
  "message": "Query deleted successfully"
}
```

---

## 🧪 Testing Workflow

### Step 1: Authenticate First

1. Login: `POST http://localhost:5000/api/auth/login`
   ```json
   {
     "email": "your@email.com",
     "password": "yourpassword"
   }
   ```
2. Copy the `token` from response
3. Add to all subsequent requests: `Authorization: Bearer YOUR_TOKEN`

### Step 2: Test Query Generation

1. Generate a MongoDB query
2. Generate an aggregation query
3. Generate a SQL query
4. Copy one of the query IDs for next steps

### Step 3: Test Query Operations

1. Get all queries
2. Get query by ID (use ID from step 2)
3. Update query (mark as favorite, add tags)
4. Get favorites

### Step 4: Test AI Features

1. Explain a complex query
2. Optimize a query
3. Test with different query types

### Step 5: Test Cleanup

1. Delete a test query
2. Verify it's removed from GET all queries

---

## ⚠️ Common Issues & Solutions

### Issue: "Token expired" or "No token provided"

**Solution:** Make sure to include the Authorization header with a valid JWT token

### Issue: "Query not found"

**Solution:** Use a valid query ID from your database (get it from GET /api/queries)

### Issue: "Cast to ObjectId failed"

**Solution:** Make sure the ID in the URL is a valid MongoDB ObjectId (24 hex characters)

### Issue: "Failed to generate query using AI"

**Solution:** Check that GEMINI_API_KEY is set correctly in .env file and the model name is correct (gemini-2.0-flash)

---

## 📊 Success Criteria

✅ All endpoints return proper status codes (200, 201, 400, 404, 500)
✅ Query generation works for mongodb, sql, and aggregation types
✅ Explain and optimize functions return useful AI responses
✅ CRUD operations work correctly (Create, Read, Update, Delete)
✅ Favorites functionality works
✅ Tags can be added and updated
✅ User can only access their own queries (userId validation)

---

## 🎯 Quick Copy-Paste Test Bodies

### Generate MongoDB Query

```json
{ "prompt": "Find all users created in last 7 days", "queryType": "mongodb" }
```

### Generate Aggregation

```json
{
  "prompt": "Count users by country and sort by count descending",
  "queryType": "aggregation"
}
```

### Generate SQL Query

```json
{ "prompt": "Get top 10 products by sales", "queryType": "sql" }
```

### Explain Query

```json
{
  "query": "db.users.find({ status: 'active' }).sort({ createdAt: -1 }).limit(10)"
}
```

### Optimize Query

```json
{ "query": "db.orders.find({ userId: '123', status: 'pending' })" }
```

### Update to Favorite

```json
{ "isFavorite": true, "tags": ["important", "production"] }
```

---

**Happy Testing! 🚀**
