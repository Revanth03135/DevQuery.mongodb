# DevQuery - AI Query Generation API Testing Guide

## 🚀 API Endpoints

### Base URL: `http://localhost:5000`

---

## 📌 Authentication Required

All query endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1️⃣ Generate Query (POST /api/queries/generate)

**Purpose**: Convert natural language to MongoDB/SQL query using Gemini AI

**Request**:

```json
{
  "prompt": "Find all users who registered in the last 30 days",
  "queryType": "mongodb",
  "title": "Recent Users Query"
}
```

**Query Types**:

- `mongodb` - MongoDB find/findOne queries
- `sql` - SQL SELECT queries
- `aggregation` - MongoDB aggregation pipelines

**Response**:

```json
{
  "success": true,
  "query": {
    "_id": "...",
    "userId": "...",
    "title": "Recent Users Query",
    "naturalLanguage": "Find all users who registered in the last 30 days",
    "generatedQuery": "db.users.find({ createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) } })",
    "queryType": "mongodb",
    "isFavorite": false,
    "tags": [],
    "executionCount": 0,
    "createdAt": "2025-10-14T...",
    "updatedAt": "2025-10-14T..."
  }
}
```

**Test Examples**:

```bash
# Example 1: MongoDB Query
curl -X POST http://localhost:5000/api/queries/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Get all active users sorted by registration date",
    "queryType": "mongodb"
  }'

# Example 2: SQL Query
curl -X POST http://localhost:5000/api/queries/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Select top 10 products by price",
    "queryType": "sql"
  }'

# Example 3: Aggregation Pipeline
curl -X POST http://localhost:5000/api/queries/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "prompt": "Count users by country and sort by count",
    "queryType": "aggregation"
  }'
```

---

## 2️⃣ Get All Queries (GET /api/queries)

**Purpose**: Fetch all saved queries for the logged-in user

**Response**:

```json
{
  "success": true,
  "count": 5,
  "queries": [...]
}
```

---

## 3️⃣ Get Query by ID (GET /api/queries/:id)

**Purpose**: Get details of a specific query

**Response**:

```json
{
  "success": true,
  "query": {...}
}
```

---

## 4️⃣ Update Query (PUT /api/queries/:id)

**Purpose**: Update query title, favorite status, or tags

**Request**:

```json
{
  "title": "Updated Query Name",
  "isFavorite": true,
  "tags": ["important", "production"]
}
```

---

## 5️⃣ Delete Query (DELETE /api/queries/:id)

**Purpose**: Delete a saved query

**Response**:

```json
{
  "success": true,
  "message": "Query deleted successfully"
}
```

---

## 6️⃣ Explain Query (POST /api/queries/explain)

**Purpose**: Get plain English explanation of what a query does

**Request**:

```json
{
  "query": "db.users.find({ age: { $gt: 18 } }).sort({ createdAt: -1 }).limit(10)"
}
```

**Response**:

```json
{
  "success": true,
  "explanation": "This query finds the 10 most recently created users who are older than 18 years old."
}
```

---

## 7️⃣ Optimize Query (POST /api/queries/optimize)

**Purpose**: Get AI suggestions to improve query performance

**Request**:

```json
{
  "query": "db.users.find({ email: /gmail.com/ })"
}
```

**Response**:

```json
{
  "success": true,
  "suggestions": "1. Create an index on the email field\n2. Use exact match instead of regex if possible\n3. Consider adding a limit() clause"
}
```

---

## 8️⃣ Get Favorite Queries (GET /api/queries/favorites)

**Purpose**: Get all queries marked as favorite

**Response**:

```json
{
  "success": true,
  "count": 3,
  "queries": [...]
}
```

---

## 🧪 Testing in Postman

### Step 1: Login First

1. POST `http://localhost:5000/api/auth/login`
2. Body:
   ```json
   {
     "email": "your@email.com",
     "password": "yourpassword"
   }
   ```
3. Copy the `token` from response

### Step 2: Set Authorization Header

1. In Postman, go to "Authorization" tab
2. Select "Bearer Token"
3. Paste your token

### Step 3: Test Query Generation

1. POST `http://localhost:5000/api/queries/generate`
2. Body (raw JSON):
   ```json
   {
     "prompt": "Find users older than 25 years",
     "queryType": "mongodb",
     "title": "Adult Users"
   }
   ```

---

## 💡 Example Natural Language Prompts

**MongoDB Examples**:

- "Find all users who registered today"
- "Get products with price greater than $100"
- "Search for users with gmail email addresses"
- "Find orders placed in the last week"
- "Get the most recent 20 blog posts"

**SQL Examples**:

- "Select all customers from New York"
- "Get total sales by category"
- "Find employees hired after 2020"
- "Show top 5 products by revenue"

**Aggregation Examples**:

- "Group orders by customer and calculate total spent"
- "Count users by age range"
- "Calculate average rating per product"
- "Sum revenue by month"

---

## 🔧 Troubleshooting

### Error: "Not authorized, no token"

- Make sure you're logged in and have a valid token
- Add the token to Authorization header

### Error: "Failed to generate query using AI"

- Check if Gemini API key is valid in .env file
- Verify internet connection
- Check if you have API quota remaining

### Error: "Query not found"

- Verify the query ID exists
- Make sure the query belongs to your user account

---

## 📊 Response Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (missing fields)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (not your resource)
- `404` - Not found
- `500` - Server error

---

## 🎯 Next Steps

1. **Test all endpoints** in Postman
2. **Create frontend UI** to display generated queries
3. **Add query execution** feature (optional)
4. **Implement query sharing** between users
5. **Add analytics** dashboard
