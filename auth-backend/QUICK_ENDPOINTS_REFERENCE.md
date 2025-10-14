# 🚀 Quick API Endpoints Reference

## Base URL: `http://localhost:5000`

---

## 📝 All Available Endpoints

| Method | Endpoint                 | Purpose              | Body Required |
| ------ | ------------------------ | -------------------- | ------------- |
| POST   | `/api/queries/generate`  | Generate new query   | ✅ Yes        |
| POST   | `/api/queries/explain`   | Explain a query      | ✅ Yes        |
| POST   | `/api/queries/optimize`  | Optimize a query     | ✅ Yes        |
| GET    | `/api/queries/`          | Get all user queries | ❌ No         |
| GET    | `/api/queries/favorites` | Get favorite queries | ❌ No         |
| GET    | `/api/queries/:id`       | Get specific query   | ❌ No         |
| PUT    | `/api/queries/:id`       | Update a query       | ✅ Yes        |
| DELETE | `/api/queries/:id`       | Delete a query       | ❌ No         |

---

## 🔐 Authentication (Required for ALL endpoints above)

**Header:**

```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 📋 Test Bodies by Endpoint

### 1. Generate Query (POST)

```
POST http://localhost:5000/api/queries/generate
```

**Body:**

```json
{
  "prompt": "Get all users from the database",
  "queryType": "mongodb"
}
```

---

### 2. Explain Query (POST)

```
POST http://localhost:5000/api/queries/explain
```

**Body:**

```json
{
  "query": "db.users.find({ status: 'active' })"
}
```

---

### 3. Optimize Query (POST)

```
POST http://localhost:5000/api/queries/optimize
```

**Body:**

```json
{
  "query": "db.users.find({ email: 'test@example.com' })"
}
```

---

### 4. Get All User Queries (GET)

```
GET http://localhost:5000/api/queries/
```

**No body needed** - Just add Authorization header

---

### 5. Get Favorite Queries (GET)

```
GET http://localhost:5000/api/queries/favorites
```

**No body needed** - Just add Authorization header

---

### 6. Get Query by ID (GET)

```
GET http://localhost:5000/api/queries/67abc123def456789
```

Replace `67abc123def456789` with actual query ID from your database
**No body needed** - Just add Authorization header

---

### 7. Update Query (PUT)

```
PUT http://localhost:5000/api/queries/67abc123def456789
```

**Body:**

```json
{
  "title": "Updated title",
  "isFavorite": true,
  "tags": ["important", "production"]
}
```

---

### 8. Delete Query (DELETE)

```
DELETE http://localhost:5000/api/queries/67abc123def456789
```

**No body needed** - Just add Authorization header

---

## ⚠️ Common Mistakes

### ❌ WRONG

```
POST http://localhost:5000/api/queries
```

**Error:** `Cannot POST /api/queries`
**Reason:** There's no POST route for `/api/queries` directly

### ✅ CORRECT

```
POST http://localhost:5000/api/queries/generate
GET http://localhost:5000/api/queries/
```

---

## 🎯 Testing Order

1. **Login first** to get JWT token:

   ```
   POST http://localhost:5000/api/auth/login
   Body: {"email": "test@example.com", "password": "password123"}
   ```

2. **Copy the token** from response

3. **Add to all requests:**

   ```
   Headers:
   Authorization: Bearer YOUR_TOKEN_HERE
   Content-Type: application/json
   ```

4. **Test in this order:**
   - ✅ Generate query
   - ✅ Get all queries
   - ✅ Get query by ID (use ID from step above)
   - ✅ Explain query
   - ✅ Optimize query
   - ✅ Update query (mark as favorite)
   - ✅ Get favorites
   - ✅ Delete query

---

## 📊 Expected Response Format

### Success Response (200/201):

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response (400/404/500):

```json
{
  "success": false,
  "message": "Error description"
}
```

---

**Remember:**

- Use `/api/queries/generate` for creating queries (POST)
- Use `/api/queries/` for listing queries (GET)
- Add trailing slash for GET all queries: `/api/queries/`
