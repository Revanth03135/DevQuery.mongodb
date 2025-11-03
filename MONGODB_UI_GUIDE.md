# MongoDB Usage Guide for DevQuery UI

## Quick Start

### 1. Connect to MongoDB

**Via Dashboard:**
1. Click "Add Connection" button
2. Select "MongoDB" from database type dropdown
3. Enter connection details:

**Option A - Connection String:**
```
mongodb://localhost:27017/mydb
mongodb+srv://username:password@cluster.mongodb.net/mydb
```

**Option B - Individual Fields:**
- **Host:** `localhost` or your MongoDB server
- **Port:** `27017` (default)
- **Database:** Your database name
- **Username:** (optional) Your MongoDB username
- **Password:** (optional) Your MongoDB password

4. Click "Connect"
5. Wait for success notification

### 2. Explore Schema

Once connected, the **Schema Explorer** will show:
- 📁 Collections (equivalent to SQL tables)
- 📄 Fields from sampled documents
- 🏷️ Data types detected from samples

**Note:** MongoDB is schema-less, so the explorer samples 25 documents per collection to infer the structure.

## Query Formats Supported

### 1. MongoDB Shell Commands ⭐ RECOMMENDED

Use standard MongoDB shell syntax:

```javascript
// Find all documents
db.users.find({})

// Find with filter
db.users.find({age: {$gt: 18}})

// Find with limit
db.users.find({}).limit(10)

// Find with projection
db.users.find({}, {name: 1, email: 1})

// Aggregation pipeline
db.orders.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}},
  {$sort: {count: -1}}
])

// Count
db.products.count({category: "electronics"})
```

### 2. Natural Language 🤖 AI-POWERED

Just type what you want in plain English:

```
"show all users"
"list products with price greater than 100"
"count orders by status"
"find users in New York"
"group products by category"
```

The AI will convert your request to a MongoDB query automatically!

### 3. JSON Format (Advanced)

For programmatic queries:

```json
{
  "collection": "users",
  "operation": "find",
  "query": {"age": {"$gt": 18}},
  "options": {"limit": 10}
}
```

## Analytics & Visualization

### Create Charts from MongoDB Data

**In Analytics Tab:**

1. **Natural Language:**
   ```
   "chart of users by country"
   "pie chart of order status"
   "line chart of sales over time"
   ```

2. **Direct Aggregation:**
   ```javascript
   db.orders.aggregate([
     {$group: {_id: "$status", count: {$sum: 1}}},
     {$sort: {count: -1}}
   ])
   ```

3. **AI-Assisted:**
   The AI will analyze your MongoDB schema and generate appropriate aggregation pipelines for visualization!

### Supported Chart Types

- **Bar Chart:** Category comparisons
  ```javascript
  db.products.aggregate([
    {$group: {_id: "$category", count: {$sum: 1}}}
  ])
  ```

- **Pie Chart:** Distribution/composition
  ```javascript
  db.orders.aggregate([
    {$group: {_id: "$status", count: {$sum: 1}}}
  ])
  ```

- **Line Chart:** Trends over time
  ```javascript
  db.sales.aggregate([
    {$group: {_id: {$dateToString: {format: "%Y-%m-%d", date: "$date"}}, total: {$sum: "$amount"}}},
    {$sort: {_id: 1}}
  ])
  ```

## Common MongoDB Operations

### Filtering

```javascript
// Equality
db.users.find({name: "John"})

// Greater than
db.users.find({age: {$gt: 18}})

// Less than
db.products.find({price: {$lt: 100}})

// Range
db.users.find({age: {$gte: 18, $lte: 65}})

// Multiple conditions (AND)
db.users.find({age: {$gt: 18}, country: "USA"})

// OR condition
db.users.find({$or: [{age: {$lt: 18}}, {age: {$gt: 65}}]})

// In array
db.products.find({category: {$in: ["electronics", "computers"]}})

// Pattern matching
db.users.find({name: {$regex: "^J", $options: "i"}})
```

### Aggregation

```javascript
// Group and count
db.orders.aggregate([
  {$group: {_id: "$customerId", totalOrders: {$sum: 1}}}
])

// Group and sum
db.sales.aggregate([
  {$group: {_id: "$product", totalRevenue: {$sum: "$amount"}}}
])

// Group and average
db.products.aggregate([
  {$group: {_id: "$category", avgPrice: {$avg: "$price"}}}
])

// Multiple aggregations
db.orders.aggregate([
  {$group: {
    _id: "$status",
    count: {$sum: 1},
    totalAmount: {$sum: "$total"},
    avgAmount: {$avg: "$total"}
  }}
])

// Filter then aggregate
db.orders.aggregate([
  {$match: {status: "completed"}},
  {$group: {_id: "$product", count: {$sum: 1}}},
  {$sort: {count: -1}},
  {$limit: 10}
])
```

### Sorting & Limiting

```javascript
// Sort ascending
db.users.find({}).sort({age: 1})

// Sort descending
db.products.find({}).sort({price: -1})

// Limit results
db.users.find({}).limit(10)

// Skip and limit (pagination)
db.users.find({}).skip(20).limit(10)

// Combined
db.products.find({category: "electronics"})
  .sort({price: -1})
  .limit(5)
```

### Projection (Select Fields)

```javascript
// Include specific fields
db.users.find({}, {name: 1, email: 1})

// Exclude specific fields
db.users.find({}, {password: 0, _id: 0})

// Rename fields in aggregation
db.users.aggregate([
  {$project: {
    fullName: "$name",
    emailAddress: "$email"
  }}
])
```

## Tips & Best Practices

### 1. **Start Simple**
   - Begin with `db.collection.find({})` to see your data
   - Use `.limit(10)` to avoid overwhelming results
   - Gradually add filters and options

### 2. **Use the AI**
   - Natural language works great for common queries
   - The AI understands MongoDB schema and generates optimized queries
   - Try: "show me...", "find...", "count...", "group by..."

### 3. **Aggregation for Analytics**
   - Use aggregation pipelines for charts and analytics
   - Think in stages: match → group → sort → limit
   - Each stage transforms the data

### 4. **Check Your Data Types**
   - MongoDB stores different types (String, Number, Date, Object, Array)
   - The schema explorer shows detected types
   - Use appropriate operators for each type

### 5. **Performance**
   - Use indexes for frequently queried fields
   - Limit results when exploring large collections
   - Use `$match` early in aggregation pipelines

## Troubleshooting

### "Collection not found"
- Check spelling in your query
- Verify collection exists in Schema Explorer
- MongoDB is case-sensitive!

### "No results returned"
- Try simpler query: `db.collection.find({})`
- Check filter conditions
- Verify data exists in collection

### "Query syntax error"
- Ensure proper JSON format
- Check brackets and braces
- Use shell format: `db.collection.find(...)`

### AI generates wrong query
- Try being more specific
- Use direct MongoDB syntax instead
- Check schema to ensure field names are correct

## Examples from Common Scenarios

### E-commerce Analytics

```javascript
// Top selling products
db.orders.aggregate([
  {$unwind: "$items"},
  {$group: {_id: "$items.product", totalSold: {$sum: "$items.quantity"}}},
  {$sort: {totalSold: -1}},
  {$limit: 10}
])

// Revenue by category
db.orders.aggregate([
  {$unwind: "$items"},
  {$lookup: {
    from: "products",
    localField: "items.productId",
    foreignField: "_id",
    as: "product"
  }},
  {$group: {_id: "$product.category", revenue: {$sum: "$items.total"}}}
])

// Customer lifetime value
db.orders.aggregate([
  {$group: {_id: "$customerId", totalSpent: {$sum: "$total"}}},
  {$sort: {totalSpent: -1}}
])
```

### User Analytics

```javascript
// Users by country
db.users.aggregate([
  {$group: {_id: "$country", count: {$sum: 1}}},
  {$sort: {count: -1}}
])

// Active users by month
db.users.aggregate([
  {$match: {lastActive: {$exists: true}}},
  {$group: {
    _id: {$month: "$lastActive"},
    activeUsers: {$sum: 1}
  }},
  {$sort: {_id: 1}}
])

// Age distribution
db.users.aggregate([
  {$bucket: {
    groupBy: "$age",
    boundaries: [0, 18, 25, 35, 50, 65, 100],
    default: "Other",
    output: {count: {$sum: 1}}
  }}
])
```

## Need Help?

1. **Check Schema Explorer** - See what collections and fields exist
2. **Try Natural Language** - Let AI generate the query
3. **Start Simple** - Use basic find() first, then add complexity
4. **Read Error Messages** - They usually point to the exact problem
5. **Check MongoDB Docs** - [docs.mongodb.com](https://docs.mongodb.com)

---

**Remember:** MongoDB in DevQuery works just like SQL databases - connect, explore, query, and visualize! The AI handles the complexity of MongoDB syntax for you. 🚀
