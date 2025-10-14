# 🔧 API Troubleshooting Guide

## Common Errors & Solutions

---

### ❌ Error: "Cast to ObjectId failed for value \":id\""

**Problem:** You're using `:id` literally in the URL instead of a real MongoDB ObjectId

**Wrong:**

```
GET http://localhost:5000/api/queries/:id
PUT http://localhost:5000/api/queries/:id
DELETE http://localhost:5000/api/queries/:id
```

**Solution:** Replace `:id` with an actual 24-character MongoDB ObjectId

**Correct:**

```
GET http://localhost:5000/api/queries/67123abc456def789012345a
PUT http://localhost:5000/api/queries/67123abc456def789012345a
DELETE http://localhost:5000/api/queries/67123abc456def789012345a
```

**How to get a real ID:**

1. Make GET request to `http://localhost:5000/api/queries/`
2. Copy the `_id` value from any query in the response
3. Use that ID in your URL

---

### ❌ Error: "Cannot POST /api/queries"

**Problem:** Wrong endpoint for creating queries

**Wrong:**

```
POST http://localhost:5000/api/queries
```

**Correct:**

```
POST http://localhost:5000/api/queries/generate
```

---

### ❌ Error: "No token provided" or "Token expired"

**Problem:** Missing or invalid JWT token

**Solution:**

1. Login first to get a token:
   ```
   POST http://localhost:5000/api/auth/login
   Body: {"email": "your@email.com", "password": "yourpassword"}
   ```
2. Copy the token from response
3. Add to ALL requests:
   ```
   Headers:
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

---

### ❌ Error: "Query not found"

**Problem:** The query ID doesn't exist in your database

**Solution:**

1. Check if you have any queries: `GET /api/queries/`
2. If empty, generate a query first: `POST /api/queries/generate`
3. Use an ID from the response

---

### ❌ Error: "Failed to generate query using AI"

**Problem:** Gemini API issue

**Possible causes:**

1. GEMINI_API_KEY not set in .env file
2. Wrong model name
3. API key is invalid or quota exceeded

**Solution:**

1. Check `.env` file has: `GEMINI_API_KEY=AIzaSy...`
2. Verify model name is `gemini-2.0-flash` in `geminiService.js`
3. Test API key at https://aistudio.google.com/

---

### ❌ Error: "User not found" or "Invalid credentials"

**Problem:** Login failed

**Solution:**

1. Make sure you've registered first: `POST /api/auth/register`
2. Use correct email and password
3. Password must be at least 6 characters

---

### ❌ Error: "Validation error" or "Please provide..."

**Problem:** Missing required fields in request body

**Solution:** Check required fields for each endpoint:

- **Generate:** Requires `prompt` and `queryType`

  ```json
  { "prompt": "...", "queryType": "mongodb" }
  ```

- **Explain:** Requires `query`

  ```json
  { "query": "db.users.find({})" }
  ```

- **Optimize:** Requires `query`

  ```json
  { "query": "db.users.find({})" }
  ```

- **Register:** Requires `name`, `email`, `password`

  ```json
  { "name": "...", "email": "...", "password": "..." }
  ```

- **Login:** Requires `email`, `password`
  ```json
  { "email": "...", "password": "..." }
  ```

---

## 🎯 Testing Workflow (Step by Step)

### 1. Register a User

```
POST http://localhost:5000/api/auth/register
Body:
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}
```

### 2. Login

```
POST http://localhost:5000/api/auth/login
Body:
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Save the token from response!**

### 3. Generate a Query

```
POST http://localhost:5000/api/queries/generate
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "prompt": "Get all users from the database",
  "queryType": "mongodb"
}
```

**Save the \_id from response!**

### 4. Get All Queries

```
GET http://localhost:5000/api/queries/
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### 5. Get Specific Query (Use ID from step 3)

```
GET http://localhost:5000/api/queries/67123abc456def789012345a
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### 6. Update Query (Use ID from step 3)

```
PUT http://localhost:5000/api/queries/67123abc456def789012345a
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "isFavorite": true,
  "tags": ["important"]
}
```

### 7. Explain a Query

```
POST http://localhost:5000/api/queries/explain
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "query": "db.users.find({ status: 'active' })"
}
```

### 8. Optimize a Query

```
POST http://localhost:5000/api/queries/optimize
Headers:
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "query": "db.users.find({ email: 'test@example.com' })"
}
```

### 9. Get Favorites

```
GET http://localhost:5000/api/queries/favorites
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### 10. Delete Query (Use ID from step 3)

```
DELETE http://localhost:5000/api/queries/67123abc456def789012345a
Headers:
  Authorization: Bearer YOUR_TOKEN
```

---

## 🔍 How to Check if Server is Running

Look for these messages in your terminal:

```
🚀 Server running on port 5000
✅ MongoDB Connected: ...
```

If not running:

```bash
cd C:\Users\revan\OneDrive\Desktop\ADLab\DevQuery\auth-backend
npm run dev
```

---

## 📊 Valid MongoDB ObjectId Format

- **Length:** Exactly 24 characters
- **Characters:** Only 0-9 and a-f (hexadecimal)
- **Example:** `67123abc456def789012345a`

**Invalid IDs:**

- `:id` ❌ (placeholder)
- `123` ❌ (too short)
- `67123abc456def789012345g` ❌ (contains 'g')
- `id12345` ❌ (contains non-hex characters)

---

## 💡 Pro Tips

1. **Use Postman Collections:** Save your requests to avoid retyping
2. **Use Environment Variables:** Store token and base URL in Postman variables
3. **Check Terminal:** Backend logs show detailed error messages
4. **Use Valid IDs:** Always get real IDs from GET requests first
5. **Test in Order:** Register → Login → Generate → CRUD operations

---

## 🆘 Still Having Issues?

1. Check backend terminal for error logs
2. Verify `.env` file has all required variables
3. Make sure MongoDB Atlas is accessible
4. Restart the server: Ctrl+C then `npm run dev`
5. Check if port 5000 is available (not used by another app)

---

**Happy Testing! 🚀**
