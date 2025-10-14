# 🤖 Gemini AI Query Generation - Complete Setup Guide

## 📚 What I've Done - Complete Explanation

### 🎯 **Overview**

I've integrated Google's Gemini AI into your DevQuery backend to generate database queries from natural language. Here's everything that was set up:

---

## 📦 **1. Environment Setup**

### File: `.env`

```env
GEMINI_API_KEY=AIzaSyD1vaI6KO7WsCKVYVVOkZnfMSMC5AIyQ-Q
```

**What it does**: Stores your Gemini API key securely. This key is used to authenticate with Google's AI service.

**Why it's needed**: The API key is private and shouldn't be hardcoded in your code. Environment variables keep it secure.

---

## 📦 **2. Installed Package**

### Command Run:

```bash
npm install @google/generative-ai
```

**What it is**: Official Google SDK for Gemini AI
**What it does**: Provides functions to communicate with Gemini AI models
**Size**: Lightweight (~1 package added)

---

## 🗃️ **3. Database Model - Query.js**

### Location: `models/Query.js`

**What it does**: Defines the structure of how queries are stored in MongoDB

**Schema Fields**:

- `userId` - Links query to the user who created it
- `title` - Custom name for the query (e.g., "Get Active Users")
- `naturalLanguage` - Original user prompt ("Find users older than 25")
- `generatedQuery` - AI-generated MongoDB/SQL code
- `queryType` - Type: 'mongodb', 'sql', or 'aggregation'
- `isFavorite` - Boolean to mark important queries
- `tags` - Array of tags for organization
- `executionCount` - Track how many times query was run
- `createdAt/updatedAt` - Automatic timestamps

**Why it's needed**: Stores query history so users can see and reuse previous queries

---

## 🤖 **4. Gemini Service - geminiService.js**

### Location: `services/geminiService.js`

**What it does**: Handles all AI communication

### Three Main Functions:

#### A) `generateQuery(userPrompt, queryType)`

**Input**:

- `userPrompt`: "Find users registered last week"
- `queryType`: "mongodb" or "sql" or "aggregation"

**Process**:

1. Sends prompt to Gemini AI with specific instructions
2. AI understands the request
3. AI generates proper database query syntax
4. Cleans up the response (removes markdown)
5. Returns clean query code

**Output**: `db.users.find({ createdAt: { $gte: ... } })`

**Example Flow**:

```
User says: "Show me products under $50"
       ↓
Gemini AI thinks: "They want to filter products by price"
       ↓
Generates: db.products.find({ price: { $lt: 50 } })
       ↓
Returns clean query
```

#### B) `explainQuery(query)`

**What it does**: Takes a complex query and explains it in simple English

**Example**:

```
Input: db.users.find({ age: { $gt: 18 } }).sort({ createdAt: -1 }).limit(10)
Output: "This finds the 10 most recently created users who are older than 18"
```

#### C) `optimizeQuery(query)`

**What it does**: Suggests performance improvements

**Example**:

```
Input: db.users.find({ email: /gmail/ })
Output: "1. Add an index on email field
         2. Use exact match instead of regex
         3. Add .limit() to prevent large result sets"
```

---

## 🎮 **5. Query Controller - queryController.js**

### Location: `controllers/queryController.js`

**What it does**: Handles all API request logic

### Eight Main Functions:

#### A) `generateNewQuery`

- Receives user's natural language prompt
- Calls Gemini AI to generate query
- Saves both prompt and generated query to database
- Returns the result

#### B) `getUserQueries`

- Fetches all saved queries for logged-in user
- Sorts by most recent first
- Returns list of queries

#### C) `getQueryById`

- Gets one specific query
- Checks if user owns the query (security)
- Returns query details

#### D) `updateQuery`

- Updates query title, favorite status, or tags
- Validates ownership
- Saves changes

#### E) `deleteQuery`

- Deletes a query
- Validates ownership
- Removes from database

#### F) `explainQueryEndpoint`

- Takes a query string
- Uses Gemini to explain it
- Returns explanation

#### G) `optimizeQueryEndpoint`

- Takes a query string
- Uses Gemini to suggest optimizations
- Returns suggestions

#### H) `getFavoriteQueries`

- Gets only queries marked as favorite
- Returns filtered list

---

## 🛣️ **6. Query Routes - queryRoutes.js**

### Location: `routes/queryRoutes.js`

**What it does**: Maps URLs to controller functions

**Routes Created**:

```
POST   /api/queries/generate     → Generate new query
POST   /api/queries/explain      → Explain a query
POST   /api/queries/optimize     → Get optimization tips
GET    /api/queries              → Get all user queries
GET    /api/queries/favorites    → Get favorite queries
GET    /api/queries/:id          → Get specific query
PUT    /api/queries/:id          → Update a query
DELETE /api/queries/:id          → Delete a query
```

**Security**: All routes use `protect` middleware - requires JWT token

---

## 🔌 **7. Server Integration - server.js**

### What Changed:

```javascript
// Added this line:
const queryRoutes = require("./routes/queryRoutes");

// Added this line:
app.use("/api/queries", queryRoutes);
```

**What it does**: Connects query routes to your Express server at `/api/queries` endpoint

---

## 🔄 **How It All Works Together**

### Example Flow: User Generates a Query

```
1. User logs in
   → Gets JWT token

2. User clicks "Generate Query" in frontend
   → Enters: "Find users older than 25"

3. Frontend sends request:
   POST /api/queries/generate
   Headers: { Authorization: Bearer <token> }
   Body: { prompt: "Find users older than 25", queryType: "mongodb" }

4. Server receives request
   → Checks JWT token (authMiddleware)
   → Routes to queryController.generateNewQuery()

5. Controller validates input
   → Calls geminiService.generateQuery()

6. Gemini Service
   → Sends prompt to Google Gemini AI
   → AI generates: db.users.find({ age: { $gt: 25 } })
   → Cleans up response

7. Controller saves to database
   → Creates new Query document
   → Stores user's prompt + generated query

8. Returns response to frontend
   → Frontend displays the generated query
   → User can copy, save, or execute it
```

---

## 🎯 **Key Concepts Explained**

### 1. **What is Gemini AI?**

- Google's advanced language model (like ChatGPT)
- Understands natural language
- Can generate code, explain concepts, and more
- Accessed via API with your key

### 2. **How Does It Generate Queries?**

```
Gemini has:
- Training on millions of database queries
- Understanding of MongoDB/SQL syntax
- Ability to interpret human language

When you say: "Find recent users"
Gemini knows:
- "Find" = database query
- "recent" = sort by date, newest first
- "users" = users collection/table
```

### 3. **Why Save Queries to Database?**

- **History**: See what you've searched before
- **Reusability**: Don't regenerate same queries
- **Organization**: Tag and favorite important ones
- **Analytics**: Track which queries are most used

### 4. **Security with JWT Tokens**

```
Every query request includes:
Authorization: Bearer eyJhbGciOiJ...
                      ↑ Your JWT token

Server decodes it to know:
- Who you are (user ID)
- If you're logged in
- If token is still valid

This ensures:
- Only logged-in users can generate queries
- Users only see their own queries
- No one can access your saved queries
```

---

## 🧪 **How to Test It**

### Option 1: Using Postman

1. **Login first**:

   ```
   POST http://localhost:5000/api/auth/login
   Body: { "email": "test@test.com", "password": "password" }
   ```

   Copy the `token` from response

2. **Generate a query**:

   ```
   POST http://localhost:5000/api/queries/generate
   Headers: Authorization: Bearer <paste-token-here>
   Body: {
     "prompt": "Find all active users",
     "queryType": "mongodb"
   }
   ```

3. **See the magic**: Gemini AI will generate the query!

### Option 2: Using Frontend (Next Step)

You'll create a UI with:

- Text input for prompts
- Button to generate
- Display area for results
- List of saved queries

---

## 📊 **What Data Gets Stored**

### Example Database Entry:

```javascript
{
  _id: "67abc123...",
  userId: "67user456...",
  title: "Find Active Users",
  naturalLanguage: "Find all active users",
  generatedQuery: "db.users.find({ status: 'active' })",
  queryType: "mongodb",
  isFavorite: false,
  tags: [],
  executionCount: 0,
  createdAt: "2025-10-14T10:30:00.000Z",
  updatedAt: "2025-10-14T10:30:00.000Z"
}
```

---

## 🚀 **Next Steps**

### For Backend (Already Done ✅):

1. ✅ Gemini AI integration
2. ✅ Query model
3. ✅ Controller functions
4. ✅ API routes
5. ✅ Server connection

### For Frontend (Your Next Task):

1. Create query generation UI
2. Add input field for prompts
3. Display generated queries
4. Show query history
5. Add favorite/tag functionality

---

## 💡 **Cool Features You Can Add Later**

1. **Query Execution**: Actually run the generated query on a database
2. **Query Validation**: Check if query is safe before running
3. **Auto-Complete**: Suggest common prompts
4. **Share Queries**: Let users share queries with team
5. **Export**: Download queries as JSON/CSV
6. **Analytics**: Show most popular query types

---

## 🔧 **Troubleshooting**

### "Failed to generate query using AI"

- Check internet connection
- Verify API key in .env is correct
- Make sure you haven't exceeded Gemini API quota

### "Not authorized"

- Make sure you're logged in
- Check JWT token is included in headers
- Token might have expired (login again)

### Server crashes

- Check all files are saved
- Restart server: `npm run dev`
- Check for typos in file names

---

## 📝 **Summary**

**What you have now**:

- ✅ Gemini AI integration
- ✅ Natural language → Database query conversion
- ✅ Query history storage
- ✅ Query explanation
- ✅ Query optimization
- ✅ Favorite queries
- ✅ Full CRUD operations
- ✅ Secure with JWT authentication

**How it works**:

1. User types plain English
2. Gemini AI converts to database query
3. Query is saved to database
4. User can view, favorite, and reuse queries

**Files created/modified**:

- `.env` (added API key)
- `models/Query.js` (database schema)
- `services/geminiService.js` (AI logic)
- `controllers/queryController.js` (API logic)
- `routes/queryRoutes.js` (URL routing)
- `server.js` (connected routes)
- `API_TESTING.md` (testing guide)

---

Ready to test! 🎉
